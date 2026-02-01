# Gitless Article Version Control

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

Maintain this plan in accordance with `.agent/PLANS.md` at the repository root.

## Purpose / Big Picture

After this change, the repository will use the existing `Article` concept as the working-copy layer for Gitless-style version control, with no way to use articles outside version control. Gitless behavior will be implemented as a set of independent concepts (CurrentBranch, Branch, Commit, and ArticleSnapshot) composed via synchronizations. A developer will be able to create and switch branches without stashing or staging, edit working copies of articles per branch, and commit snapshots that always attach to a branch head. The observable outcome is a test scenario where the same article is edited differently on two branches, switching branches does not overwrite uncommitted work, and commits are recorded per-branch with no detached head state.

This design must scale beyond Articles. The core Gitless concepts (CurrentBranch, Branch, Commit) are type-agnostic, and each new versioned object type (e.g., Comment, Tag) adds a snapshot concept and a capture sync triggered by commit creation. There is no local/remote distinction in this version; everything is a single, local repository model.

## Progress

- [x] (2026-02-01T16:43Z) Reviewed `docs/resources/gitless.md`, current Article concept, and RealWorld syncs to anchor Gitless semantics in this repo.
- [x] (2026-02-01T18:51Z) Updated `Article` spec/implementation/tests for branch-scoped working copies with Gitless classifications and added `clone` for branch creation.
- [x] (2026-02-01T18:51Z) Added core Gitless concepts (CurrentBranch, Branch, Commit, ArticleSnapshot) with specs, implementations, and tests.
- [x] (2026-02-01T18:51Z) Added Gitless syncs and tests for init, branch create/switch, commit, head advance, and article snapshot capture.
- [x] (2026-02-01T18:51Z) Updated RealWorld syncs/tests to resolve current branch and use branch-scoped Article queries.
- [x] (2026-02-01T18:51Z) Validated with Deno tests: `deno test concepts/test`, `deno test syncs/gitless`, and `deno test syncs/realworld/realworld.test.ts`.
- [x] (2026-02-01T18:51Z) Wired `/gitless/init` into app startup via `realworld_app.ts` and updated RealWorld tests to use it.

## Surprises & Discoveries

- Instrumented concept actions are async; direct calls in gitless tests required `await` to avoid false failures.

## Decision Log

- Decision: Use the existing `Article` concept as the working-copy layer and require version control semantics for all article operations.
  Rationale: The user does not plan to use articles outside version control, so the Article concept should be branch-aware and Gitless-classified.
  Date/Author: 2026-02-01 / assistant
- Decision: Remove the Repo concept and model “current branch” as a singleton concept (`CurrentBranch`) since there is always exactly one repo.
  Rationale: Avoids an unnecessary repository abstraction while still making “current branch” explicit, as in Gitless.
  Date/Author: 2026-02-01 / assistant
- Decision: Implement Gitless as a set of concepts (CurrentBranch, Branch, Commit, ArticleSnapshot) and compose them via synchronizations.
  Rationale: Aligns with the paper’s conceptual framing and preserves concept independence.
  Date/Author: 2026-02-01 / assistant
- Decision: Keep core Gitless concepts type-agnostic and add a snapshot concept per versioned type.
  Rationale: Allows scaling to other object types without changing the core commit/branch logic.
  Date/Author: 2026-02-01 / assistant
- Decision: No remote/local distinction in the initial design; all operations are local in a single-repo model.
  Rationale: User requirement; simplifies the concept set and avoids remote-tracking/merge concepts for now.
  Date/Author: 2026-02-01 / assistant
- Decision: Add `Article.clone` to preserve status/deleted metadata when creating a new branch.
  Rationale: Branch creation should carry working-copy state across branches without loss of Gitless classifications.
  Date/Author: 2026-02-01 / assistant
- Decision: Centralize startup wiring in `realworld_app.ts` and call `/gitless/init` once during setup.
  Rationale: Ensures the current branch is always set before API usage without duplicating init logic across tests or future app entrypoints.
  Date/Author: 2026-02-01 / assistant

## Outcomes & Retrospective

Core Gitless concepts and synchronizations are implemented for Articles with a single local repo model. Branches are independent working copies, commits advance per-branch heads, and tracked articles are snapshot on commit. RealWorld syncs now resolve the current branch, and all associated tests pass. Remaining work is optional: expose additional Gitless endpoints (status/log) or expand version control to other object types using snapshot concepts.

## Context and Orientation

This repository uses concept design. Concepts are specified in `specs/*.concept` and implemented as TypeScript classes in `concepts/*.ts`. Actions accept one input object and return one output object. Query methods are prefixed with `_` and return arrays. Concepts cannot import one another. Synchronizations live in `syncs/` and compose actions with `when/where/then` using the engine in `engine/mod.ts`.

The existing `Article` concept in `specs/Article.concept` and `concepts/Article.ts` models canonical article data. RealWorld API syncs in `syncs/realworld/articles.ts`, `syncs/realworld/comments.ts`, `syncs/realworld/favorites_tags.ts`, and `syncs/realworld/realworld.test.ts` call `Article.create/update/delete` and query by slug. Because Article will become branch-scoped, those syncs and tests must be updated to pass a branch and resolve the current branch from the Gitless concepts.

Key terms used in this plan are defined as follows. A “branch” is an independent line of development with its own working copies. A “working copy” is the editable version of an article on a branch. A “commit” is a snapshot of tracked working copies on a branch, and the “head” is the most recent commit for that branch. “Current branch” is the branch the system is actively editing; there is no detached head in Gitless.

## Plan of Work

Milestone 1 updates the existing `Article` concept to be branch-scoped and classified in Gitless terms. The state adds a `branch` relation to `Branches`, a `status` enumeration (TRACKED, UNTRACKED, IGNORED, CONFLICT), and a `deleted` flag so removals can be committed as snapshots. Actions are adjusted to operate on a branch-scoped article and to manage status. Queries are updated to require a branch when looking up by slug or author. Tests for the Article operational principle are updated accordingly.

Milestone 2 adds the Gitless core concepts: `CurrentBranch`, `Branch`, `Commit`, and `ArticleSnapshot`. `CurrentBranch` is a singleton concept that stores the active branch. `Branch` stores names and head commits. `Commit` stores commit metadata and parent links. `ArticleSnapshot` stores immutable snapshots of articles per commit. Each concept is defined in `specs/`, implemented in `concepts/`, and tested in `concepts/test/` using their operational principles.

Milestone 3 introduces Gitless synchronizations and API routes. Synchronizations compose commits by: (a) reading the current branch head, (b) creating a new commit, (c) updating the branch head, and (d) capturing snapshots of tracked working articles. API endpoints in `syncs/gitless/` expose branch/commit operations and allow switching the current branch. Error paths return API errors when conflicts exist or branches are missing.

Milestone 4 updates RealWorld syncs to use the current branch for all article operations. All existing Article queries and actions are adjusted to include the resolved branch. Slug uniqueness checks are scoped to the current branch. RealWorld tests are updated to initialize the default branch and use the current branch implicitly.

Scaling guidance: when adding a new versioned type (e.g., Comment), add a `CommentSnapshot` concept and a synchronization that triggers on `Commit.create` to capture snapshots of tracked working Comment copies for the commit’s branch. The core concepts (CurrentBranch, Branch, Commit) remain unchanged.

Each milestone is independently verifiable: Article tests pass with branch-scoped logic (Milestone 1), new Gitless concept tests pass (Milestone 2), Gitless API flows pass tests (Milestone 3), and RealWorld syncs/tests remain green after branch scoping (Milestone 4).

## Concrete Steps

From `/Users/igors.razvodovskis/Development/ticket-less-4-1`, update the Article spec and implementation:

    specs/Article.concept
    concepts/Article.ts
    concepts/test/article.test.ts

Add the Gitless concept specs and implementations:

    specs/CurrentBranch.concept
    specs/Branch.concept
    specs/Commit.concept
    specs/ArticleSnapshot.concept

    concepts/CurrentBranch.ts
    concepts/Branch.ts
    concepts/Commit.ts
    concepts/ArticleSnapshot.ts

Add concept tests:

    concepts/test/current_branch.test.ts
    concepts/test/branch.test.ts
    concepts/test/commit.test.ts
    concepts/test/article_snapshot.test.ts

Add Gitless syncs and tests:

    syncs/gitless/articles.ts
    syncs/gitless/index.ts
    syncs/gitless/gitless.test.ts

Update RealWorld syncs and tests for branch-scoped Article operations:

    syncs/realworld/articles.ts
    syncs/realworld/comments.ts
    syncs/realworld/favorites_tags.ts
    syncs/realworld/cascades.ts
    syncs/realworld/realworld.test.ts

Run tests:

    deno test concepts/test
    deno test syncs/gitless
    deno test syncs/realworld/realworld.test.ts

The expected output should report all tests passing.

## Validation and Acceptance

The change is accepted when:

1. `Article` is branch-scoped and has Gitless classifications (tracked/untracked/ignored/conflict) plus a deletion flag, and its operational principle test passes.
2. Gitless core concepts (CurrentBranch, Branch, Commit, ArticleSnapshot) exist, have implementations, and pass their operational principle tests.
3. A Gitless flow test shows that edits on two branches do not overwrite one another, switching branches never requires stashing, and commits advance per-branch heads only.
4. RealWorld syncs still pass tests while using the branch-scoped Article concept and current-branch resolution.

## Idempotence and Recovery

These steps are additive and safe to repeat. Recreating files overwrites them with the plan’s canonical content. If RealWorld tests fail during refactors, fix the branch resolution in syncs and re-run the specific test. If Gitless syncs are not ready, they can be added after the concept layer while still keeping concepts/test green.

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

### Gitless Synchronizations (new)

In `syncs/gitless/`, implement:

- A sync that ensures the default branch (`main`) exists and initializes `CurrentBranch` on first use.
- This is implemented as a `POST /gitless/init` endpoint so tests and callers can explicitly initialize before other requests.
- A sync that resolves the current branch via `CurrentBranch._get`.
- A commit flow: when `API.request` indicates a commit, query the current branch head, verify no tracked articles are in conflict, create a commit, update branch head, and capture snapshots for all tracked working articles on that branch.

### RealWorld Synchronizations (update)

Update `syncs/realworld/articles.ts`, `comments.ts`, `favorites_tags.ts`, `cascades.ts`, and `realworld.test.ts` to resolve the current branch via `CurrentBranch._get({ current: "current:default" })` and pass `branch` into all Article actions/queries. Slug lookups and uniqueness checks should be scoped to the current branch.

Plan Change Note: 2026-02-01 updated the ExecPlan to explicitly remove any remote/local distinction and keep all operations local in a single-repo model.
