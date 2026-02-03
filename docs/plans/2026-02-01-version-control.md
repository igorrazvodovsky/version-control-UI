# Article Version Control

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

Maintain this plan in accordance with `.agent/PLANS.md` at the repository root.

## Purpose / Big Picture

After this change, the repository will use the existing `Article` concept as the working-copy layer for version control workflows, with no way to use articles outside version control. Version control behavior will be implemented as a set of independent concepts (CurrentBranch, Branch, Commit, and ArticleSnapshot) composed via synchronizations. A developer will be able to create and switch branches without stashing or staging, edit working copies of articles per branch, and commit snapshots that always attach to a branch head. The observable outcome is a test scenario where the same article is edited differently on two branches, switching branches does not overwrite uncommitted work, and commits are recorded per-branch with no detached head state.

This design must scale beyond Articles. The core version control concepts (CurrentBranch, Branch, Commit) are type-agnostic, and each new versioned object type (e.g., Comment, Tag) adds a snapshot concept and a capture sync triggered by commit creation. There is no local/remote distinction in this version; everything is a single, local repository model.

## Progress

- [x] (2026-02-01T16:43Z) Reviewed `docs/resources/version-control.md`, current Article concept, and API syncs to anchor version control semantics in this repo.
- [x] (2026-02-01T18:51Z) Updated `Article` spec/implementation/tests for branch-scoped working copies with version control classifications and added `clone` for branch creation.
- [x] (2026-02-01T18:51Z) Added core version control concepts (CurrentBranch, Branch, Commit, ArticleSnapshot) with specs, implementations, and tests.
- [x] (2026-02-01T18:51Z) Added version control syncs and tests for init, branch create/switch, commit, head advance, and article snapshot capture.
- [x] (2026-02-01T18:51Z) Updated API syncs/tests to resolve current branch and use branch-scoped Article queries.
- [x] (2026-02-01T18:51Z) Validated with Deno tests: `deno test concepts/test`, `deno test syncs/version_control`, and `deno test syncs/app/app.test.ts`.
- [x] (2026-02-01T18:51Z) Wired `/version-control/init` into app startup via `app.ts` and updated API tests to use it.
- [x] (2026-02-02T19:20Z) Enabled slug reuse after delete in `Article` and added an operational-principle test.
- [x] (2026-02-02T19:20Z) Added TagSnapshot + tag cloning on branch creation and commit capture for tags.
- [x] (2026-02-02T19:20Z) Added current-branch-missing errors for branch-scoped API endpoints and a regression test.

## Surprises & Discoveries

- Instrumented concept actions are async; direct calls in version control tests required `await` to avoid false failures.

## Decision Log

- Decision: Use the existing `Article` concept as the working-copy layer and require version control semantics for all article operations.
  Rationale: The user does not plan to use articles outside version control, so the Article concept should be branch-aware and version control-classified.
  Date/Author: 2026-02-01 / assistant
- Decision: Remove the Repo concept and model “current branch” as a singleton concept (`CurrentBranch`) since there is always exactly one repo.
  Rationale: Avoids an unnecessary repository abstraction while still making “current branch” explicit, as in version control.
  Date/Author: 2026-02-01 / assistant
- Decision: Implement version control as a set of concepts (CurrentBranch, Branch, Commit, ArticleSnapshot) and compose them via synchronizations.
  Rationale: Aligns with the paper’s conceptual framing and preserves concept independence.
  Date/Author: 2026-02-01 / assistant
- Decision: Keep core version control concepts type-agnostic and add a snapshot concept per versioned type.
  Rationale: Allows scaling to other object types without changing the core commit/branch logic.
  Date/Author: 2026-02-01 / assistant
- Decision: No remote/local distinction in the initial design; all operations are local in a single-repo model.
  Rationale: User requirement; simplifies the concept set and avoids remote-tracking/merge concepts for now.
  Date/Author: 2026-02-01 / assistant
- Decision: Add `Article.clone` to preserve status/deleted metadata when creating a new branch.
  Rationale: Branch creation should carry working-copy state across branches without loss of version control classifications.
  Date/Author: 2026-02-01 / assistant
- Decision: Centralize startup wiring in `app.ts` and call `/version-control/init` once during setup.
  Rationale: Ensures the current branch is always set before API usage without duplicating init logic across tests or future app entrypoints.
  Date/Author: 2026-02-01 / assistant
- Decision: Release slugs on article delete so a slug can be reused within a branch.
  Rationale: Matches expected delete/recreate semantics and avoids permanent slug tombstones.
  Date/Author: 2026-02-02 / assistant
- Decision: Treat tags as part of the initial Article versioning scope via tag cloning and commit-time tag snapshots.
  Rationale: Tags are part of article working-copy state and must survive branch creation and commit capture.
  Date/Author: 2026-02-02 / assistant
- Decision: Return a 409 error when branch-scoped API endpoints are called before `CurrentBranch` is set.
  Rationale: Prevents silent drops when the current branch is missing while keeping user/profile endpoints unaffected.
  Date/Author: 2026-02-02 / assistant

## Outcomes & Retrospective

Core version control concepts and synchronizations are implemented for Articles with a single local repo model. Branches are independent working copies, commits advance per-branch heads, and tracked articles are snapshot on commit alongside tag snapshots. Article slugs are reusable after delete, and API endpoints now return explicit errors when the current branch is missing. All associated tests pass. Remaining work is optional: expose additional version control endpoints (status/log) or expand version control to other object types using snapshot concepts.

## Context and Orientation

This repository uses concept design. Concepts are specified in `specs/*.concept` and implemented as TypeScript classes in `concepts/*.ts`. Actions accept one input object and return one output object. Query methods are prefixed with `_` and return arrays. Concepts cannot import one another. Synchronizations live in `syncs/` and compose actions with `when/where/then` using the engine in `engine/mod.ts`.

The existing `Article` concept in `specs/Article.concept` and `concepts/Article.ts` models canonical article data. API syncs in `syncs/app/articles.ts`, `syncs/app/comments.ts`, `syncs/app/favorites_tags.ts`, and `syncs/app/app.test.ts` call `Article.create/update/delete` and query by slug. Because Article will become branch-scoped, those syncs and tests must be updated to pass a branch and resolve the current branch from the version control concepts.

Key terms used in this plan are defined as follows. A “branch” is an independent line of development with its own working copies. A “working copy” is the editable version of an article on a branch. A “commit” is a snapshot of tracked working copies on a branch, and the “head” is the most recent commit for that branch. “Current branch” is the branch the system is actively editing; there is no detached head in version control.

## Plan of Work

Milestone 1 updates the existing `Article` concept to be branch-scoped and classified in version control terms. The state adds a `branch` relation to `Branches`, a `status` enumeration (TRACKED, UNTRACKED, IGNORED, CONFLICT), and a `deleted` flag so removals can be committed as snapshots. Actions are adjusted to operate on a branch-scoped article and to manage status. Queries are updated to require a branch when looking up by slug or author. Tests for the Article operational principle are updated accordingly.

Milestone 2 adds the version control core concepts: `CurrentBranch`, `Branch`, `Commit`, and `ArticleSnapshot`. `CurrentBranch` is a singleton concept that stores the active branch. `Branch` stores names and head commits. `Commit` stores commit metadata and parent links. `ArticleSnapshot` stores immutable snapshots of articles per commit. Each concept is defined in `specs/`, implemented in `concepts/`, and tested in `concepts/test/` using their operational principles.

Milestone 3 introduces version control synchronizations and API routes. Synchronizations compose commits by: (a) reading the current branch head, (b) creating a new commit, (c) updating the branch head, and (d) capturing snapshots of tracked working articles. API endpoints in `syncs/version_control/` expose branch/commit operations and allow switching the current branch. Error paths return API errors when conflicts exist or branches are missing.

Milestone 4 updates API syncs to use the current branch for all article operations. All existing Article queries and actions are adjusted to include the resolved branch. Slug uniqueness checks are scoped to the current branch. API tests are updated to initialize the default branch and use the current branch implicitly.

Scaling guidance: when adding a new versioned type (e.g., Comment), add a `CommentSnapshot` concept and a synchronization that triggers on `Commit.create` to capture snapshots of tracked working Comment copies for the commit’s branch. The core concepts (CurrentBranch, Branch, Commit) remain unchanged.

Each milestone is independently verifiable: Article tests pass with branch-scoped logic (Milestone 1), new version control concept tests pass (Milestone 2), version control API flows pass tests (Milestone 3), and API syncs/tests remain green after branch scoping (Milestone 4).

## Concrete Steps

From `/Users/igors.razvodovskis/Development/ticket-less-4-1`, update the Article spec and implementation:

    specs/Article.concept
    concepts/Article.ts
    concepts/test/article.test.ts

Add the version control concept specs and implementations:

    specs/CurrentBranch.concept
    specs/Branch.concept
    specs/Commit.concept
    specs/ArticleSnapshot.concept
    specs/TagSnapshot.concept

    concepts/CurrentBranch.ts
    concepts/Branch.ts
    concepts/Commit.ts
    concepts/ArticleSnapshot.ts
    concepts/TagSnapshot.ts

Add concept tests:

    concepts/test/current_branch.test.ts
    concepts/test/branch.test.ts
    concepts/test/commit.test.ts
    concepts/test/article_snapshot.test.ts
    concepts/test/tag_snapshot.test.ts

Add version control syncs and tests:

    syncs/version_control/articles.ts
    syncs/version_control/index.ts
    syncs/version_control/version_control.test.ts

Update API syncs and tests for branch-scoped Article operations:

    syncs/app/articles.ts
    syncs/app/comments.ts
    syncs/app/favorites_tags.ts
    syncs/app/cascades.ts
    syncs/app/app.test.ts

Run tests:

    deno test concepts/test
    deno test syncs/version_control
    deno test syncs/app/app.test.ts

The expected output should report all tests passing.

## Validation and Acceptance

The change is accepted when:

1. `Article` is branch-scoped and has version control classifications (tracked/untracked/ignored/conflict) plus a deletion flag, and its operational principle test passes.
2. version control core concepts (CurrentBranch, Branch, Commit, ArticleSnapshot) exist, have implementations, and pass their operational principle tests.
3. A version control flow test shows that edits on two branches do not overwrite one another, switching branches never requires stashing, commits advance per-branch heads only, and tag snapshots are recorded for tracked articles.
4. API syncs still pass tests while using the branch-scoped Article concept and current-branch resolution.

## Idempotence and Recovery

These steps are additive and safe to repeat. Recreating files overwrites them with the plan’s canonical content. If API tests fail during refactors, fix the branch resolution in syncs and re-run the specific test. If version control syncs are not ready, they can be added after the concept layer while still keeping concepts/test green.

## Artifacts and Notes

When testing timestamps, assert that values exist and update rather than matching exact strings. Use local assertion helpers from `engine/test/helpers.ts`.

## Interfaces and Dependencies

### Article (updated)

Update `specs/Article.concept` to make articles branch-scoped working copies. The state should include `branch: Branches`, `status: TRACKED|UNTRACKED|IGNORED|CONFLICT`, and `deleted: Flag`. The purpose should explicitly mention working copies on branches. Actions should include:

    create (article: Articles, branch: Branches, slug: String, title: String, description: String, body: String, author: Users) : (article: Articles)
    update (article: Articles, title: String, description: String, body: String) : (article: Articles)
    remove (article: Articles) : (article: Articles)
    track (article: Articles) : (article: Articles)
    untrack (article: Articles) : (article: Articles)
    ignore (article: Articles) : (article: Articles)
    markConflict (article: Articles) : (article: Articles)
    resolveConflict (article: Articles) : (article: Articles)

Queries should include branch in slug/author lookups and list by branch:

    _get (article: Articles) : (article: Articles, branch: Branches, slug: String, title: String, description: String, body: String, author: Users, status: String, deleted: Flag, createdAt: DateTime, updatedAt: DateTime)
    _getBySlug (branch: Branches, slug: String) : (article: Articles)
    _getByAuthor (branch: Branches, author: Users) : (article: Articles)
    _listByBranch (branch: Branches) : (article: Articles)

In `concepts/Article.ts`, enforce slug uniqueness per branch, set default status to UNTRACKED on create, and implement status transitions without a staging area. `remove` should mark `deleted = true` so commits can capture deletions.

### CurrentBranch (singleton)

Create `specs/CurrentBranch.concept` with an element that stores the active branch:

    an element CurrentBranch with
        a branch Branches

Actions should include:

    set (current: CurrentBranch, branch: Branches) : (current: CurrentBranch)

Queries:

    _get (current: CurrentBranch) : (current: CurrentBranch, branch: Branches)

Use a fixed ID (e.g., `current:default`) in syncs and tests to refer to the singleton.

### Branch

Create `specs/Branch.concept` with a set of Branches storing `name`, `head`, `createdAt`. Actions:

    create (branch: Branches, name: String) : (branch: Branches)
    create (branch: Branches, name: String) : (error: String)
    setHead (branch: Branches, commit: Commits) : (branch: Branches)

Queries:

    _get (branch: Branches) : (branch: Branches, name: String, head: Commits)
    _getByName (name: String) : (branch: Branches)
    _list () : (branch: Branches)
    _getHead (branch: Branches) : (commit: Commits)

### Commit

Create `specs/Commit.concept` with commits storing `branch`, optional `parent`, `message`, `createdAt`. Actions:

    create (commit: Commits, branch: Branches, parent: Commits, message: String) : (commit: Commits)
    create (commit: Commits, branch: Branches, message: String) : (commit: Commits)

Queries:

    _get (commit: Commits) : (commit: Commits, branch: Branches, parent: Commits, message: String, createdAt: DateTime)
    _listByBranch (branch: Branches) : (commit: Commits)

### ArticleSnapshot

Create `specs/ArticleSnapshot.concept` to store immutable snapshots by commit. Actions:

    capture (snapshot: ArticleSnapshots, commit: Commits, article: Articles, slug: String, title: String, description: String, body: String, author: Users, deleted: Flag) : (snapshot: ArticleSnapshots)

Queries:

    _listByCommit (commit: Commits) : (snapshot: ArticleSnapshots)
    _get (snapshot: ArticleSnapshots) : (snapshot: ArticleSnapshots, commit: Commits, article: Articles, slug: String, title: String, description: String, body: String, author: Users, deleted: Flag)

### TagSnapshot

Create `specs/TagSnapshot.concept` to store tag associations per commit. Actions:

    capture (snapshot: TagSnapshots, commit: Commits, article: Articles, tag: String) : (snapshot: TagSnapshots)

Queries:

    _listByCommit (commit: Commits) : (snapshot: TagSnapshots)
    _get (snapshot: TagSnapshots) : (snapshot: TagSnapshots, commit: Commits, article: Articles, tag: String)

### version control Synchronizations (new)

In `syncs/version_control/`, implement:

- A sync that ensures the default branch (`main`) exists and initializes `CurrentBranch` on first use.
- This is implemented as a `POST /version-control/init` endpoint so tests and callers can explicitly initialize before other requests.
- A sync that resolves the current branch via `CurrentBranch._get`.
- A branch creation flow that clones article working copies and their tags into the new branch.
- A commit flow: when `API.request` indicates a commit, query the current branch head, verify no tracked articles are in conflict, create a commit, update branch head, and capture snapshots for all tracked working articles and their tags on that branch.

### API Synchronizations (update)

Update `syncs/app/articles.ts`, `comments.ts`, `favorites_tags.ts`, `cascades.ts`, and `app.test.ts` to resolve the current branch via `CurrentBranch._get({ current: "current:default" })` and pass `branch` into all Article actions/queries. Slug lookups and uniqueness checks should be scoped to the current branch, and tags should list only tags on the current branch. Add explicit 409 errors when branch-scoped endpoints are called before the current branch is set.

Plan Change Note: 2026-02-01 updated the ExecPlan to explicitly remove any remote/local distinction and keep all operations local in a single-repo model.
Plan Change Note: 2026-02-02 updated the ExecPlan to include tag snapshots/cloning, branch-scoped tag listing, slug reuse after delete, and explicit missing-branch errors to match updated requirements.
