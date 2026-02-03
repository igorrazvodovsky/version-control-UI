---
title: feat: Article view/edit with history
type: feat
date: 2026-02-02
---

# feat: Article view/edit with history

## Overview
Add a dedicated Article view/edit page that integrates Gitless versioning. The first actual edit across a session (not just toggling edit mode), when no edit branch is selected, creates a new branch named `T-XXXXXXXX` from `main`; each edit branch has a single merge commit back to `main` (no intermediate commits). The right sidebar details panel shows the article's commit history plus branch details. Users can edit multiple articles within the same edit branch and commit. Discarding edits switches back to `main` only when the edit branch has no net changes; if `main` advanced, refresh the view and show a feedback toast.

## Problem Statement / Motivation
The web app currently lists articles but has no per-article view or editing workflow. Gitless branching and commit history exist in the backend, but the UI does not expose them. This feature makes article editing visible and traceable, aligning the UI with Gitless behavior.

## Proposed Solution
- Add a dynamic Article detail route (view + edit) and link to it from the articles table.
- On the first edit action across any article (e.g., first field change), when no edit branch is selected, create a Gitless branch with a unique `T-XXXXXXXX` name from `main`, switch current branch to it, and load the branch-scoped article as the working copy. Entering edit mode alone should not create a branch. If a user selects an existing in-progress edit branch, switch to it instead of creating a new branch. Creating a new branch while on a non-`main` branch must first switch back to `main` (no branches-of-branches).
- If the user discards/cancels edits, switch back to `main` and reload the article view state only when the edit branch has no net changes from its base commit. If `main` has new commits since branch creation, refresh the view and show a feedback toast.
- On "Save", update the article and create a merge commit back to `main` with a meaningful message. The commit captures all outstanding changes on the current edit branch (which may include multiple articles). Default commit message: "Update articles (N)". Skip committing if no actual changes were made. After merge, switch current branch to `main`.
- Add a history API endpoint that returns commit entries for the current branch filtered to the active article.
- Replace the placeholder "Recent History" section in the right sidebar with the article commit timeline, and add a Branch tab that shows current branch selection and a list of changes.

## SpecFlow Notes
Flow analysis (manual SpecFlow pass):
- View flow: GET /articles/:slug returns the current-branch working copy. If not found, show a not-found state.
- Edit flow: the first edit action in a session must (1) switch to `main` if needed, (2) create a branch from `main`, (3) switch current branch to it, (4) ensure the article exists on that branch (clone already handled in Gitless syncs), and (5) re-fetch article data on the new branch. Cache the base commit (from `main`) so discard can validate "no net changes" and the Branch tab can show a stable diff against the base. If an edit branch is selected, skip creation and just switch to it.
- Save flow: PUT /articles/:slug updates the working copy; POST /gitless/commits creates a single merge commit that merges the edit branch into `main`. After success, switch current branch to `main` and refresh article data. If there are no changes, skip the commit. If commit fails due to conflict or missing current branch, surface the error and keep the working copy.
- Discard flow: only allow switching back to `main` when the edit branch has no net changes from its base commit. If `main` has new commits since branch creation, refresh the view after switching and show a feedback toast. If the edit branch has diverged, require users to revert changes first or keep working on the edit branch.
- History flow: GET history must return an empty list when no commits exist or when the article has no snapshots on the branch. Ordering should be newest-first. On an unmerged edit branch, history may be empty until the merge commit lands on `main`; show an "Unmerged changes" empty state to avoid confusion.
- Edge cases: branch-name collisions, missing current branch errors, merge conflicts, main-branch drift while editing, article deleted, and rapid edit toggles.

## Technical Considerations
- Frontend routing and state
  - New route: `apps/web/src/app/articles/[slug]/page.tsx` for view/edit.
  - Add navigation from list rows in `apps/web/src/components/articles/data-table.tsx` (or a new "Open" action column).
  - Keep the right sidebar as the details panel; swap the placeholder history with live commit data and add a Branch tab for current branch selection (when multiple are in progress) plus a list of changes.
  - Branch switching must handle in-progress form edits: either auto-persist form edits into the working copy before switching (preferred, Gitless-consistent) or block switching with a "save/discard" prompt.
  - Use autosave best practices for working-copy persistence: debounce saves (for example, 1–2s after the last change), also persist on field blur and before navigation/branch switching. Show a clear "Saving/Saved/Not saved" indicator and surface errors without losing local edits. Explicit "Save" still triggers the merge commit.
- Gitless integration
  - Create branches only from `main` via `POST /gitless/branches`, then switch via `PUT /gitless/branches/current` on the first edit action when no edit branch is selected. If the user chooses a different in-progress branch, switch to it instead of creating a new one. If creating a new branch while on a non-`main` branch, switch to `main` first (no branches-of-branches).
  - Branch names use the `T-XXXXXXXX` format. Generate an 8-digit numeric token (zero-padded). If branch creation fails due to a name collision, retry with a new token.
  - Store the base commit (from `main`) so discard can verify "no net changes" without stashing.
  - After save, call `POST /gitless/commits` to merge the edit branch into `main`; the edit branch has a single commit. Commit message should be user-visible. Default message: "Update articles (N)" with optional per-article customization. Skip commit on no-op saves. After success, switch current branch back to `main`.
  - Provide a "list of changes" for the Branch tab, derived as a diff between the edit branch working state and the branch's base commit on `main`. This keeps the change list stable even if `main` advances.
  - Change list shape: per-article entries with `slug`, `title`, `changeType` (added/modified/deleted), optional `fieldsChanged`, and `updatedAt`.
  - The default commit message uses the change list count: "Update articles (N)" where N is the number of changed articles on the edit branch.
  - Gitless alignment check (docs/resources/gitless.md): this design keeps the “current branch” explicit, avoids detached head, enforces branches-from-main only, and merges edits back into `main` in a single commit.
- History API design
  - Add a new route (suggested): `GET /articles/:slug/history` with optional `limit` query.
  - In syncs, resolve slug to article ID on the current branch, list commits for the branch, and filter to commits that include an ArticleSnapshot for the article.
  - If filtering is expensive, add `_listByArticle` to `concepts/ArticleSnapshot.ts` (and `specs/ArticleSnapshot.concept`) to support direct lookup.
- Error handling
  - Surface 404/409/422 errors from Gitless endpoints in UI.
  - If current branch is missing, prompt to re-init or show a banner.
- Performance
  - Cap history length in UI (for example, latest 20 commits) and request limit from API.
- UI constraints
  - Slug is read-only in the edit form; only title/description/body are editable.

## Acceptance Criteria
- [x] Clicking an article row opens the view/edit page at `/articles/<slug>`.
- [x] The view page shows title, description, body, and tags; loading and error states are present.
- [x] Making the first edit creates a new Gitless branch (named `T-XXXXXXXX`) from `main` and sets it as current; no branches-of-branches are created.
- [x] A user can edit multiple articles on the same edit branch (no new branch is created when switching articles), and a single save/commit can capture changes to multiple articles.
- [x] The Branch tab shows the current branch selection (with multiple in-progress branches if present) and a list of changes on the selected branch.
- [x] Switching branches with in-progress form edits either auto-persists the edits into the working copy or blocks switching with an explicit save/discard prompt.
- [x] Edits are auto-saved to the working copy using a short debounce and on blur; the UI surfaces saving status and errors without losing local edits.
- [x] Discarding edits switches back to `main` and restores the article view state only when the edit branch has no net changes from its base; if `main` advanced, the view refreshes and a feedback toast appears.
- [x] Saving edits updates the article and creates a single Gitless merge commit back to `main` with a non-empty message; if there are no changes, no commit is created.
- [x] The right sidebar history shows the commit list for the article in the current branch (message + timestamp at minimum).
- [x] History renders an empty state when no commits exist for the article.
- [x] Errors from branch creation, branch switching, or commit conflicts are surfaced and do not silently fail.
- [x] Tests: add a Gitless history sync test and update any relevant web data-fetch tests.
- [x] The slug field is read-only in the edit UI.

## Success Metrics
- A user can open an article, edit it, save it, and immediately see a new history entry in the right sidebar.
- A user can edit two different articles on the same edit branch and commit once; the commit appears in both articles' history.
- A user can switch between in-progress edit branches from the Branch tab and see the corresponding change list.
- Manual API verification shows the history endpoint returning commit entries for the article in the active branch.

## Dependencies & Risks
- Gitless branch state is global; switching branches in the UI affects all subsequent requests. Allowing multiple in-progress branches increases the need for clear branch selection and change list visibility.
- Branch name collisions if not uniquely generated.
- History endpoint may be slow if it scans commits without an ArticleSnapshot lookup helper.
- Main-branch drift while editing can surprise users; must surface refresh/toast behavior on discard.
- Current-branch-missing errors may appear if init is skipped or state resets.

## References & Research
Internal references:
- `apps/web/src/app/page.tsx` (current dual sidebar layout and placeholder history panel)
- `apps/web/src/components/articles/columns.tsx`
- `apps/web/src/components/articles/data-table.tsx`
- `apps/web/src/lib/articles.ts`
- `server.ts` (route list and input schemas)
- `syncs/realworld/articles.ts` (GET/PUT /articles/:slug)
- `syncs/gitless/articles.ts` (branch + commit flows)
- `concepts/Commit.ts`, `concepts/ArticleSnapshot.ts`
- `specs/ArticleSnapshot.concept`, `specs/Commit.concept`
- `docs/plans/2026-02-01-gitless.md` (Gitless architecture decisions)

No institutional learnings found in `docs/solutions/`.

## Implementation Notes (Pseudo-code)
```ts
// apps/web/src/lib/gitless.ts
export async function createEditBranch({ baseUrl, name }: { baseUrl: string; name: string }) {
  // POST /gitless/branches
}

export async function switchBranch({ baseUrl, name }: { baseUrl: string; name: string }) {
  // PUT /gitless/branches/current
}

export async function commitChanges({ baseUrl, message }: { baseUrl: string; message: string }) {
  // POST /gitless/commits (merge edit branch into main)
}
```

```ts
// syncs/gitless/articles.ts (new syncs for history)
// when API.request GET /articles/:slug/history
// - resolve current branch
// - resolve article id via Article._getBySlug({ branch, slug })
// - list commits via Commit._listByBranch({ branch })
// - filter commits with ArticleSnapshot for the article
// - respond with { history: [{ commit, message, createdAt }] }
```

## AI-Era Considerations
- Prompt that worked: "Scan for existing Article, Gitless, and history-related syncs and list the relevant files."
- Tooling used: Codex CLI repo search and file inspection.
- Human review focus: verify Gitless branch switching does not leak across sessions; check error handling paths.

## Screenshots / Mockups
- Add a screenshot of the new article view/edit page and updated right sidebar history panel (suggested file: `docs/plans/assets/2026-02-02-article-view-edit-history.png`).
