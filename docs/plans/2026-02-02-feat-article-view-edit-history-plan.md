---
title: feat: Article view/edit with history
type: feat
date: 2026-02-02
---

# feat: Article view/edit with history

## Overview
Add a dedicated Article view/edit page that integrates Gitless versioning. The first actual edit (not just toggling edit mode) creates a new branch named `T-XXXXXXXX`, saving commits changes to history, and the right sidebar details panel shows the article's commit history. Discarding edits switches back to the prior branch.

## Problem Statement / Motivation
The web app currently lists articles but has no per-article view or editing workflow. Gitless branching and commit history exist in the backend, but the UI does not expose them. This feature makes article editing visible and traceable, aligning the UI with Gitless behavior.

## Proposed Solution
- Add a dynamic Article detail route (view + edit) and link to it from the articles table.
- On the first edit action (e.g., first field change), create a Gitless branch with a unique `T-XXXXXXXX` name, switch current branch to it, and load the branch-scoped article as the working copy. Entering edit mode alone should not create a branch.
- If the user discards/cancels edits, switch back to the prior branch and reload the article view state.
- On "Save", update the article and create a Gitless commit with a meaningful message (for example, "Update article: <slug>"). Skip committing if no actual changes were made.
- Add a history API endpoint that returns commit entries for the current branch filtered to the active article.
- Replace the placeholder "Recent History" section in the right sidebar with the article commit timeline.

## SpecFlow Notes
Flow analysis (manual SpecFlow pass):
- View flow: GET /articles/:slug returns the current-branch working copy. If not found, show a not-found state.
- Edit flow: the first edit action must (1) create branch, (2) switch current branch, (3) ensure the article exists on that branch (clone already handled in Gitless syncs), and (4) re-fetch article data on the new branch. Cache the previous branch so discard can switch back.
- Save flow: PUT /articles/:slug updates the working copy; POST /gitless/commits commits it. If there are no changes, skip the commit. If commit fails due to conflict or missing current branch, surface the error and keep the working copy.
- History flow: GET history must return an empty list when no commits exist or when the article has no snapshots on the branch. Ordering should be newest-first.
- Edge cases: branch-name collisions, missing current branch errors, commit conflict errors, article deleted, and rapid edit toggles.

## Technical Considerations
- Frontend routing and state
  - New route: `apps/web/src/app/articles/[slug]/page.tsx` for view/edit.
  - Add navigation from list rows in `apps/web/src/components/articles/data-table.tsx` (or a new "Open" action column).
  - Keep the right sidebar as the details panel; swap the placeholder history with live commit data.
- Gitless integration
  - Create branch via `POST /gitless/branches` and then switch via `PUT /gitless/branches/current` on the first edit action only.
  - Branch names use the `T-XXXXXXXX` format. Generate an 8-digit numeric token (zero-padded). If branch creation fails due to a name collision, retry with a new token.
  - Store the previous current-branch name/id so discard can switch back without stashing.
  - After save, call `POST /gitless/commits` to capture snapshots; commit message should be user-visible. Skip commit on no-op saves.
  - Gitless alignment check (docs/resources/gitless.md): this design keeps the “current branch” explicit, avoids detached head, and treats each edit branch as an independent working copy. Creating a branch only when a real edit starts avoids clutter while preserving Gitless’s branch-centric workflow and easy switching without stashing.
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
- [ ] Clicking an article row opens the view/edit page at `/articles/<slug>`.
- [ ] The view page shows title, description, body, and tags; loading and error states are present.
- [ ] Making the first edit creates a new Gitless branch (named `T-XXXXXXXX`) and sets it as current; the UI shows the branch name.
- [ ] Discarding edits switches back to the prior branch and restores the article view state.
- [ ] Saving edits updates the article and creates a Gitless commit with a non-empty message; if there are no changes, no commit is created.
- [ ] The right sidebar history shows the commit list for the article in the current branch (message + timestamp at minimum).
- [ ] History renders an empty state when no commits exist for the article.
- [ ] Errors from branch creation, branch switching, or commit conflicts are surfaced and do not silently fail.
- [ ] Tests: add a Gitless history sync test and update any relevant web data-fetch tests.
- [ ] The slug field is read-only in the edit UI.

## Success Metrics
- A user can open an article, edit it, save it, and immediately see a new history entry in the right sidebar.
- Manual API verification shows the history endpoint returning commit entries for the article in the active branch.

## Dependencies & Risks
- Gitless branch state is global; switching branches in the UI affects all subsequent requests.
- Branch name collisions if not uniquely generated.
- History endpoint may be slow if it scans commits without an ArticleSnapshot lookup helper.
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
  // POST /gitless/commits
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
