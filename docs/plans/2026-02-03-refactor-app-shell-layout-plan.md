# Refactor web app shell into a shared layout with per-page right sidebar slots

This ExecPlan is a living document. The sections Progress, Surprises & Discoveries, Decision Log, and Outcomes & Retrospective must be kept up to date as work proceeds.

This plan must be maintained in accordance with `/.agent/PLANS.md`.

## Purpose / Big Picture

Users should experience a consistent left navigation, header, and overall layout on both the articles list and the article detail pages, while each page can still provide its own right-sidebar content. The main user-visible change is that the shell (left nav, top bar, right panel container) is defined once and reused across routes, removing duplication and ensuring visual consistency. You can verify it by running the web app and visiting `/` and `/articles/<slug>`; the shell should be identical while the right sidebar content differs per page.

## Progress

- [x] (2026-02-03 18:00Z) Reviewed current `apps/web` pages and identified duplicated shell markup and right-sidebar coupling.
- [x] (2026-02-03 18:00Z) Introduce a shared AppShell layout and navigation config used by all shell pages.
- [x] (2026-02-03 18:00Z) Split article detail state into a shared provider so main content and right sidebar can stay in sync across parallel route slots.
- [x] (2026-02-03 18:00Z) Move pages into the `(shell)` route group and wire per-page right-sidebar slots.
- [ ] (2026-02-03 18:00Z) Validate UI behavior on `/` and `/articles/<slug>` and ensure error/loading states remain inside the shell.

## Surprises & Discoveries

- Observation: There are no existing institutional learnings in `docs/solutions/` relevant to UI/layout refactors.
  Evidence: `docs/solutions/` only contains an empty `logic-errors/` directory.
- Observation: The critical patterns file expected by the learnings workflow is missing.
  Evidence: `docs/solutions/patterns/cora-critical-patterns.md` does not exist.
- Observation: The `@rightSidebar` slot is defined at the `(shell)` level, so article-specific sidebar content lives under `apps/web/src/app/(shell)/@rightSidebar` and must share context via the shell.
  Evidence: The article sidebar file lives at `apps/web/src/app/(shell)/@rightSidebar/articles/[slug]/page.tsx` to override the slot for that route.

## Decision Log

- Decision: Use a shared client AppShell and a `(shell)` route group so the left nav and header are defined once for all pages.
  Rationale: This removes the largest duplication source and guarantees consistency across routes.
  Date/Author: 2026-02-03 / Codex
- Decision: Implement right-sidebar content as per-page parallel route slots under `@rightSidebar`.
  Rationale: This preserves the shared shell while allowing each page to supply its own sidebar content.
  Date/Author: 2026-02-03 / Codex
- Decision (superseded): Add an `ArticleDetailProvider` at `apps/web/src/app/(shell)/articles/[slug]/layout.tsx` to share state between the article main view and the right-sidebar slot.
  Rationale: The article sidebar depends on live state (branches, history, save status) that cannot be duplicated without risk; a provider keeps both panels in sync.
  Date/Author: 2026-02-03 / Codex
  Note: Superseded by the AppShell-wrapped provider decision below.
- Decision: Host `ArticleDetailProvider` inside `AppShell` when a `slug` param is present so the right-sidebar slot shares the same context.
  Rationale: The `@rightSidebar` slot is defined at the `(shell)` level; wrapping the entire shell ensures both the main page and slot can access the same provider.
  Date/Author: 2026-02-03 / Codex

## Outcomes & Retrospective

Not started yet.

## Context and Orientation

The current shell UI is duplicated in two large client pages:

`apps/web/src/app/page.tsx` contains the left sidebar, header with command palette, and a right sidebar with metadata/actions alongside the articles table.

`apps/web/src/app/articles/[slug]/page.tsx` repeats the same left sidebar and header and includes a more complex right sidebar for branch history, changes, and actions tied to article edit state.

Shell UI building blocks already exist in `apps/web/src/components/ui/sidebar.tsx` (Shadcn sidebar primitives) and other UI components under `apps/web/src/components/ui/`. The root layout is `apps/web/src/app/layout.tsx`, which currently only wraps pages with global styles and the Toaster.

Because the article right sidebar depends on edit state, branch selection, and history, the state must be shared between the main content panel and the right sidebar when they are split into separate route slots. This plan introduces a provider to keep that state consistent.

## Plan of Work

Create a shared `AppShell` client component that owns shell state (left sidebar open/close, right sidebar open/close, command palette open state, active workspace) and renders the left nav, top header, and a right-sidebar container. Move the duplicated nav items and workspace lists into a config file so the shell can render them from data rather than inline markup.

Introduce a `(shell)` route group under `apps/web/src/app/(shell)` with a layout that renders the `AppShell`. Use a parallel route slot named `@rightSidebar` so pages can supply their own right-sidebar content. Provide a `default.tsx` in the slot that renders `null`, so routes without a sidebar do not reserve space or show a toggle.

For the articles detail route, move the article state, data fetching, and action handlers from the current `page.tsx` into an `ArticleDetailProvider` and expose them with a `useArticleDetail()` hook. Because the right-sidebar slot is defined at the `(shell)` level, wrap the shell output in `ArticleDetailProvider` from inside `AppShell` when a `slug` param is present, so both the main editor and right sidebar can consume the same context. Then split the article page into two components: one for the main editor content and one for the right sidebar, both consuming the shared provider.

Finally, relocate `apps/web/src/app/page.tsx` and `apps/web/src/app/articles/[slug]/page.tsx` into the `(shell)` group, trimming them down to just their page-specific content. The new right-sidebar slot pages should render the appropriate sidebar body for the route.

## Concrete Steps

From the repository root, create the shell component directory and route group structure:

  mkdir -p apps/web/src/components/shell
  mkdir -p apps/web/src/app/(shell)/@rightSidebar
  mkdir -p apps/web/src/app/(shell)/articles/[slug]/@rightSidebar

Add the shared shell pieces:

- Create `apps/web/src/components/shell/nav.ts` to store workspace options and navigation groups used by the left sidebar.
- Create `apps/web/src/components/shell/AppShell.tsx` as a client component that renders the left sidebar, header, and right sidebar container using the nav config.
- Keep shell state inside `AppShell` and only render the right sidebar container when the `rightSidebar` slot is non-null.

Wire the shared shell layout:

- Create `apps/web/src/app/(shell)/layout.tsx` to render `<AppShell rightSidebar={rightSidebar}>{children}</AppShell>`.
- Add `apps/web/src/app/(shell)/@rightSidebar/default.tsx` that returns `null` so pages without a sidebar remain full-width.

Refactor the home page:

- Move `apps/web/src/app/page.tsx` to `apps/web/src/app/(shell)/page.tsx` and keep only the articles table and loading/error UI inside the page content area.
- Move the existing home right-sidebar content into `apps/web/src/app/(shell)/@rightSidebar/page.tsx` so it renders inside the shared shell.

Refactor the article detail page with shared state:

- Create `apps/web/src/components/articles/detail-provider.tsx` to encapsulate article fetches, form state, branch state, history state, and handlers like `handleSaveCommit`, `handleBranchSelect`, and `handleDiscard`. Export a `useArticleDetail()` hook.
- Update `apps/web/src/components/shell/AppShell.tsx` to wrap the shell output in `ArticleDetailProvider` when a `slug` param is present.
- Move the main editor UI into `apps/web/src/components/articles/detail-main.tsx`, consuming `useArticleDetail()`.
- Move the right sidebar UI into `apps/web/src/components/articles/detail-sidebar.tsx`, consuming `useArticleDetail()`.
- Move the route file from `apps/web/src/app/articles/[slug]/page.tsx` to `apps/web/src/app/(shell)/articles/[slug]/page.tsx` and render only `<ArticleDetailMain />`.
- Create `apps/web/src/app/(shell)/@rightSidebar/articles/[slug]/page.tsx` that renders `<ArticleDetailSidebar />`.

Remove old duplicated shell markup from the moved pages and ensure imports now point to the new components and layout.

## Validation and Acceptance

Start the web app from `apps/web` and verify the layout is consistent across pages:

  cd apps/web
  npm run dev

Open the following paths in a browser and confirm the behavior:

- `/` shows the shared shell (left nav + top header) and the articles table in the main area. The right sidebar shows the home metadata/actions panel.
- `/articles/<slug>` shows the same shell. The main area contains the article editor form and tags; the right sidebar shows branch/history/actions and responds to branch switching and save status.
- Toggling the right sidebar hides/shows the panel without shifting the left navigation or top header.
- If the backend is not running, loading/error states should render inside the shell rather than replacing it.

## Idempotence and Recovery

These changes are safe to repeat because they are additive file moves and component extractions. If a step fails, you can re-run it after fixing the compile error, or revert the moved files to their original locations with `git checkout -- <path>` (if you are using git). Always keep `apps/web/src/app/layout.tsx` unchanged so global styles and the Toaster remain intact.

## Artifacts and Notes

Key files introduced or modified in this plan:

- `apps/web/src/components/shell/AppShell.tsx`
- `apps/web/src/components/shell/nav.ts`
- `apps/web/src/app/(shell)/layout.tsx`
- `apps/web/src/app/(shell)/@rightSidebar/default.tsx`
- `apps/web/src/app/(shell)/@rightSidebar/page.tsx`
- `apps/web/src/components/articles/detail-provider.tsx`
- `apps/web/src/components/articles/detail-main.tsx`
- `apps/web/src/components/articles/detail-sidebar.tsx`
- `apps/web/src/app/(shell)/page.tsx`
- `apps/web/src/app/(shell)/articles/[slug]/page.tsx`
- `apps/web/src/app/(shell)/@rightSidebar/articles/[slug]/page.tsx`

## Interfaces and Dependencies

`AppShell` should accept these props and responsibilities:

- `children: React.ReactNode` for the main content area.
- `rightSidebar?: React.ReactNode` for the sidebar body; when absent, the right sidebar container and toggle should not render.

`ArticleDetailProvider` should expose a `useArticleDetail()` hook returning the state and handlers currently in `apps/web/src/app/articles/[slug]/page.tsx`, at minimum:

- `article`, `formState`, `isDirty`, `saveStatus`, `saveError`, and the derived status label.
- Branch-related state: `branches`, `selectedBranch`, `branchChanges`, `branchChangesLoading`, `history`, `historyLoading`.
- Actions: `handleBranchSelect`, `handleSaveCommit`, `handleDiscard`, and a `flushAutosave` helper for blur events.

The provider should be created as a client component, accept a `slug` prop, and be mounted by `AppShell` when a `slug` param is present so both the main editor and right sidebar share the same state.
