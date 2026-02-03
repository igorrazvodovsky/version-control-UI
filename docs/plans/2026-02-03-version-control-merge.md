# Version Control Merge Support

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

Maintain this plan in accordance with `.agent/PLANS.md` at the repository root. This plan extends `docs/plans/2026-02-01-version-control.md` and assumes the concepts and syncs described there already exist.

## Purpose / Big Picture

After this change, a developer can merge another branch into the current branch using version control semantics with the simplifying assumption that all merges are clean. Each branch keeps its own working copies, a successful merge produces a merge commit with two parents, and conflict handling is deferred to a future iteration. The behavior is visible by running version control merge tests that create two branches, diverge their tracked articles in non-conflicting ways, and merge to yield a merge commit. Merge-in-progress state is documented and modeled for future implementation but is not activated by this first pass.

## Progress

- [x] (2026-02-03T19:40Z) Reviewed `docs/resources/version-control.md`, current version control syncs, and `docs/plans/2026-02-01-version-control.md` to align merge semantics.
- [x] (2026-02-03T21:10Z) Implemented clean-merge syncs, commit parent changes, branch head cloning on create, and merge tests.
- [x] (2026-02-03T21:15Z) Validated with `deno test concepts/test` and `deno test syncs/version_control`.

## Surprises & Discoveries

- Observation: The current `Commit` concept stores only a single optional parent, so a merge commit cannot be represented without changing the model.
  Evidence: `specs/Commit.concept:11`, `concepts/Commit.ts:6`.
- Observation: version control syncs have no merge endpoints or merge state tracking; conflicts are only represented via `Article.status`.
  Evidence: `syncs/version_control/articles.ts` and absence of a `Merge` concept.
- Observation: Newly created branches had no head commit, which caused merge-base discovery to fail and clean merges to be flagged as conflicts.
  Evidence: Clean-merge test failed until branch-head cloning on create was added in `syncs/version_control/articles.ts`.

## Decision Log

- Decision: Model merge commits with a `parents` set on `Commit`, replacing the single `parent`.
  Rationale: version control merges create merge commits with multiple parents; representing this directly avoids parallel concepts and keeps history explicit.
  Date/Author: 2026-02-03 / assistant
- Decision: Defer merge-in-progress state and conflict resolution, documenting the intended Merge concept shape for a future iteration.
  Rationale: The current scope assumes clean merges only; persistent merge state is needed later for conflict workflows and branch switching mid-merge.
  Date/Author: 2026-02-03 / assistant
- Decision: Use a three-way merge by slug to apply clean merges and detect conflicts; if a conflict is detected, return HTTP 409 with a “merge conflicts not supported” error.
  Rationale: This preserves the correct merge semantics while keeping the implementation simple for the clean-merge-only phase.
  Date/Author: 2026-02-03 / assistant
- Decision: Require both source and target branches to have head commits before merging.
  Rationale: Keeps the merge logic simple and avoids optional-parent inputs in the first iteration.
  Date/Author: 2026-02-03 / assistant
- Decision: When creating a new branch, set its head to the current branch head (if any).
  Rationale: Preserves ancestry so merge-base discovery works and clean merges do not spuriously conflict.
  Date/Author: 2026-02-03 / assistant

## Outcomes & Retrospective

Clean merge support is implemented for version control. Commits now store parent sets, branch creation clones the current head, and merge endpoints apply three-way merges without conflict resolution. version control tests cover clean merges and conflict detection, and concept/sync tests pass. Remaining work is to implement merge-in-progress and conflict resolution per the deferred Merge concept.

## Context and Orientation

This repository uses concept design. Concepts are specified in `specs/*.concept` and implemented as TypeScript classes in `concepts/*.ts`. Actions accept one input object and return one output object. Query methods are prefixed with `_` and return arrays. Concepts cannot import one another. Synchronizations live in `syncs/` and compose actions with `when/where/then` using the engine in `engine/mod.ts`.

version control behavior is currently defined by `docs/plans/2026-02-01-version-control.md` and implemented in `syncs/version_control/articles.ts`, with core concepts `Branch`, `CurrentBranch`, `Commit`, `ArticleSnapshot`, and `TagSnapshot`. There is no merge support yet.

Key terms used in this plan are defined as follows. A “merge” combines changes from a source branch into the current branch. A “merge commit” is a commit with two parents: the current branch head and the source branch head. A “merge base” is the closest common ancestor commit of the two heads and is used for three-way merge comparison. A “working copy” is the current Article state for a branch. A “conflict” is an Article with status CONFLICT, which will be used in a future iteration when merge-in-progress is implemented. “Merge state” is a persistent record (stored by the future Merge concept) that a merge is in progress for a branch and what the second parent should be.

version control alignment from `docs/resources/version-control.md` that this plan enforces: there is no staging area; branch working copies and classifications are per-branch; there is always a current branch (no detached head). Conflict persistence and merge-in-progress state are explicitly deferred to future work.

## Plan of Work

Milestone 1 updates the Commit model to support merge commits. The Commit concept will store `parents` as a set of commit IDs and return them in `_get`. Tests will be updated to reflect the new Commit shape. The intended Merge concept shape for merge-in-progress is documented but not implemented in this milestone.

Milestone 2 implements clean-merge logic and version control API endpoints. A new `/version-control/merges` endpoint will initiate a merge of a named branch into the current branch, compute the merge base from the commit graph, perform a three-way merge by slug against the current working copy, and create a merge commit when no conflicts are detected. If conflicts are detected, the endpoint returns HTTP 409 with a “merge conflicts not supported” error and makes no changes. There is no merge-in-progress state or resolve endpoint in this iteration.

Milestone 3 adds merge tests and updates wiring only as needed. version control sync tests will cover clean merges and the conflict-detection error path. If no new concept is introduced, `app.ts` and `syncs/version_control/index.ts` may not require changes beyond updated Commit usage.

Each milestone is independently verifiable: Commit concept tests pass (Milestone 1), merge endpoints behave as expected for clean merges and conflict detection (Milestone 2), and version control tests pass with the new merge cases (Milestone 3).

## Concrete Steps

From `/Users/igors.razvodovskis/Development/ticket-less-4-1`, update the Commit spec and implementation:

    specs/Commit.concept
    concepts/Commit.ts
    concepts/test/commit.test.ts

Update version control syncs to include clean-merge flows and merge-aware commits:

    syncs/version_control/articles.ts
    syncs/version_control/index.ts
    syncs/version_control/version_control.test.ts

Update app wiring only if required by the Commit changes:

    app.ts

Run tests:

    deno test concepts/test
    deno test syncs/version_control

The expected output should report all tests passing.

## Validation and Acceptance

The change is accepted when:

1. `Commit` stores `parents` as a set, and its operational principle test passes with a root commit that has an empty parents list.
2. A version control merge test shows that merging a feature branch with non-conflicting changes creates a merge commit whose parents include both branch heads, and the current branch head advances.
3. If a conflict is detected by the three-way merge logic, the merge endpoint returns HTTP 409 with an explicit “merge conflicts not supported” error and does not modify the working copies.

## Idempotence and Recovery

These steps are additive and safe to repeat. If merge syncs are not ready, the concept-layer tests can still run. If a merge test fails due to state leakage, reset by recreating the test setup (fresh SyncConcept and concept instances). Because merge-in-progress is deferred, there is no merge state to clear in this iteration.

## Artifacts and Notes

Expected example for a no-conflict merge response:

    output: { ok: true, merge: { source: "feat", commit: "<merge-commit-id>" } }
    code: 200

Expected example for a conflict response (clean-merge-only phase):

    output: { error: "merge conflicts not supported" }
    code: 409

## Interfaces and Dependencies

### Commit (updated)

Update `specs/Commit.concept` to use a parents set.

State change:

    a set of Commits with
        a branch Branches
        a parents set of Commits
        a message String
        a createdAt DateTime

Action:

    create (commit: Commits, branch: Branches, parents: set of Commits, message: String) : (commit: Commits)

Query:

    _get (commit: Commits) : (commit: Commits, branch: Branches, parents: set of Commits, message: String, createdAt: DateTime)

Implementation notes for `concepts/Commit.ts`:

- Store parents as a string array.
- Treat missing `parents` as an empty array only if called directly without it in tests; syncs should always pass it explicitly.

### Merge (deferred concept)

Merge-in-progress state is deferred in this plan. For a future iteration, model it as a `Merge` concept with fields for `branch`, `source`, `targetHead`, `sourceHead`, and `createdAt`, plus actions to start and complete a merge. This plan does not implement the concept or its tests.

### version control Merge Synchronizations

Add endpoints and merge logic in `syncs/version_control/articles.ts`.

Endpoint: `POST /version-control/merges` with input `{ name: String, message?: String }`.

Validation rules:

- If `name` missing: 422.
- If current branch missing: 404.
- If source branch not found: 404.
- If current branch has conflicts: 409.
- If either branch has no head commit: 409 with `{ error: "branch has no commits" }`.

Merge algorithm (three-way by slug):

- Compute `targetHead` and `sourceHead` via `Branch._getHead`.
- Compute merge base by walking the commit graph:
  - Collect all ancestors of targetHead (including itself) by following `parents`.
  - Walk sourceHead ancestors breadth-first until you find the first commit also in the target ancestor set.
  - If none found, treat base as empty.
- Build maps by slug:
  - Base: `ArticleSnapshot` rows for the base commit.
  - Source: `ArticleSnapshot` rows for the source head.
  - Target: current working copies for the current branch via `Article._listByBranch` + `_get`.
- For each slug in the union of keys:

- Determine base version (or missing), source version (or missing), target version (or missing).
- Define equality on `{ title, description, body, author, deleted }`.
- If source unchanged from base, keep target.
- If target unchanged from base, apply source (create, update, or remove).
- If both changed and source equals target, keep target.
- Otherwise return HTTP 409 with `merge conflicts not supported` and make no changes.

For tags, perform an analogous three-way merge of tag sets using `TagSnapshot` for base/source and `Tag._getByTarget` for target. If tag sets conflict, return HTTP 409 and make no changes.

On no conflicts:

- Create a merge commit immediately with `Commit.create({ commit, branch: current, parents: [targetHead, sourceHead], message })`, where message defaults to `merge <source name>` if not provided.
- No merge-in-progress state is recorded in this phase.

Commit flow changes:

- In `/version-control/commits`, always set `parents` explicitly. For merge commits created by `/version-control/merges`, use `[targetHead, sourceHead]`. For normal commits, use `[targetHead]` or `[]` if no head exists.

### Wiring

No new concepts are introduced in this phase, so wiring changes should be limited to updated Commit usage in `syncs/version_control/index.ts` and any helpers that construct commit inputs.

### Tests

Extend `syncs/version_control/version_control.test.ts` with two scenarios.

- Non-conflicting merge: create feature branch, commit change on feature, merge into main, assert merge commit has two parents and main working copy reflects source change.
- Conflict detection: diverge the same article on two branches, merge, assert HTTP 409 with `merge conflicts not supported` and ensure no working copy changes were applied.

Use the existing helpers in `engine/test/helpers.ts` for assertions.

Change Note (2026-02-03): Updated the plan to assume clean merges only and defer merge-in-progress and conflict resolution per user request.
Change Note (2026-02-03): Implemented the plan, added branch-head cloning on create, and recorded test outcomes and discoveries.
