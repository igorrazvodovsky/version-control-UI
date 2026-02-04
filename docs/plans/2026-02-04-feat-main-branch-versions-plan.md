---
title: feat: Add Main Branch Versions
type: feat
date: 2026-02-04
---

# feat: Add Main Branch Versions

## Overview ✨
Main-branch commits will define system versions. Each merge commit on `main` increments a version counter starting at `v1`. Non-main branches do not create versions; they display the version of the main commit they were created from. The UI will show `vN` in the branch selector and replace the left sidebar user info with version/branch info.

## Problem Statement / Motivation
We need a clear, stable version signal for the system that maps to semantic changes. Main-branch commits already represent completed system snapshots. Exposing a version number tied to those commits gives users a simple way to understand “what version am I on?” and “what version is this branch based on?” without implying that in-progress branches are new versions.

## Proposed Solution
Persist an explicit `version` on main-branch commits and a `baseVersion` on branches created from main. Update version-control API responses to include these fields. UI consumes the branch/current-branch payloads to render `vN` in the branch selector and the left sidebar branch/version info.

## Technical Considerations
- Update version-control concepts/syncs to store and return `version` for main commits and `baseVersion` for branches.
- Ensure `POST /version-control/commits` increments version only when committing to `main`.
- Ensure branch creation captures the main branch version at creation time.
- Update `scripts/seed_articles.ts` so seeded commits/branches include version metadata.
- Frontend should rely on API fields rather than computing order from history.

## Acceptance Criteria ✅
- [x] The first merge commit on `main` is reported as `v1`, and each subsequent main commit increments to `v2`, `v3`, etc.
- [x] Commits on non-main branches do not increment version numbers.
- [x] Non-main branches expose `baseVersion` reflecting the main version at branch creation time.
- [x] `GET /version-control/branches` and `GET /version-control/branches/current` return version data needed for the UI.
- [x] Branch selector shows `vN` next to the branch label, and left sidebar user info is replaced with branch/version info.
- [x] Seeds create the initial main commit/version data without manual backfill.
- [x] Version-control tests updated or added to cover versioning rules.

## Success Metrics
- Users can see `vN` for current context without confusion.
- No regressions in existing branch/commit flows or tests.

## Dependencies & Risks
- Requires schema changes in version-control concepts (Commit and Branch). Risk: syncs or tests assuming old shape.
- UI requires new API fields; ensure backward compatibility or update all callers.
- Version increments only for main merge commits; ensure commits to main are only merges as intended.

## References & Research
- Brainstorm: `docs/brainstorms/2026-02-04-version-control-versions-brainstorm.md`
- Version control core plan: `docs/plans/2026-02-01-version-control.md`
- Merge behavior: `docs/plans/2026-02-03-version-control-merge.md`
- Version control syncs: `syncs/version_control/articles.ts`
- Version control API client: `apps/web/src/lib/version-control.ts`
- Branch UI: `apps/web/src/components/articles/detail-provider.tsx`
- Shell UI: `apps/web/src/components/shell/AppShell.tsx`
- Seed script: `scripts/seed_articles.ts`

## SpecFlow Notes
- Edge cases to validate: no commits on main yet, branch creation before any main commit, branch creation after main advanced, commit failure paths preserving version values.
