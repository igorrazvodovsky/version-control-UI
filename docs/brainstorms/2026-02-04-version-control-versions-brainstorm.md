---
date: 2026-02-04
topic: version-control-versions
---

# Version Control Versions

## What We're Building
We want the main branch commit history to define system versions. Each main-branch commit is a version, starting at v1 for the first main commit and incrementing by one for each subsequent main commit. Other branches do not create new versions. Instead, non-main branches display the version of the main commit they were created from. The UI should surface versions in the branch selector and replace the user info area in the left sidebar with version/branch information, displaying versions as a simple `vN` label.

## Why This Approach
We chose to store an explicit version number on main commits (and a base version for branches) to make version semantics clear and stable. This avoids relying on ordering heuristics or graph traversal in the UI. It keeps the meaning of version close to the source of truth, while keeping non-main branches anchored to the main version they are based on. This aligns with the product intent: main commits are semantic system versions, and branch work is only meaningful relative to main.

## Key Decisions
- Main commits define versions: only commits on `main` increment version numbers, starting at v1.
- Merge commits are the only commits on `main`, and each merge commit increments the version.
- Non-main branches display the base main version they were created from.
- UI shows versions as `vN` only (no extra text in the label).
- UI placement: branch selector plus left sidebar area replacing user info.
- No historical backfill required; seeding can be updated to initialize version values.

## Open Questions
- Which API responses should expose `version` and `baseVersion` to the UI (branches list, current branch, commit history, or all of the above)?
- Do we want to show both branch name and version together in the sidebar, or keep the version as the primary label with branch as secondary text?

## Next Steps
→ `/workflows:plan` for implementation details.
