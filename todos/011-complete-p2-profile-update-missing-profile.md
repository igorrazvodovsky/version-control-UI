---
status: complete
priority: p2
issue_id: "011"
tags: [code-review, concept, profile]
dependencies: []
---

# Profile update succeeds on missing profile (inconsistent behavior)

## Problem Statement

`ProfileConcept.update` returns success when updating a missing profile’s bio, but returns an error when updating a missing profile’s image. This inconsistency can hide missing state and violates the expectation that updates actually mutate profile data.

## Findings

- `concepts/Profile.ts:15-22` returns `{ profile }` for missing profile on bio updates, but `{ error: "profile not found" }` for image updates.
- The concept spec (`specs/Profile.concept`) does not define behavior for missing profiles, leaving update semantics ambiguous.
- API syncs currently resolve the profile before calling update, so this bug is latent today, but direct usage of the concept can return success for a no-op.

## Proposed Solutions

### Option 1: Return error for missing profiles in all update variants

**Approach:** Change the bio branch to return `error` when profile does not exist, and update `specs/Profile.concept` + tests to cover missing-profile errors.

**Pros:**
- Consistent behavior across update variants
- Safer for direct concept usage

**Cons:**
- Requires spec and test updates

**Effort:** 2-4 hours

**Risk:** Low

---

### Option 2: Auto-register profile on missing update

**Approach:** If profile missing, call `register` or create a default profile, then apply update.

**Pros:**
- Avoids failing updates
- Keeps API callers simpler

**Cons:**
- Implicit side effects (surprising in a concept)
- Needs spec update to document auto-creation

**Effort:** 3-5 hours

**Risk:** Medium

---

### Option 3: Keep no-op behavior but align image branch

**Approach:** Treat missing profile as a no-op for both bio and image updates, and document in spec/tests.

**Pros:**
- Minimal change surface

**Cons:**
- Silent failures remain possible
- Makes missing profile harder to detect

**Effort:** 1-2 hours

**Risk:** Medium

## Recommended Action

Implemented Option 1: missing-profile updates now return `{ error: "profile not found" }` for both bio and image updates, and spec/tests cover the behavior.

## Technical Details

**Affected files:**
- `concepts/Profile.ts:15-22` - inconsistent missing-profile behavior
- `specs/Profile.concept` - no missing-profile error defined
- `concepts/test/profile.test.ts` - missing negative-case coverage

**Database changes (if any):**
- None

## Resources

- None

## Acceptance Criteria

- [x] Missing-profile updates behave consistently (error or auto-create)
- [x] Spec updated to document missing-profile behavior
- [x] Tests cover missing-profile update paths

## Work Log

### 2026-02-02 - Initial Discovery

**By:** Codex

**Actions:**
- Reviewed `ProfileConcept.update` branching behavior
- Compared implementation to spec and sync usage
- Noted inconsistent missing-profile handling

**Learnings:**
- The inconsistency is latent due to syncs pre-resolving profiles
- Direct concept usage would return success for a no-op

---

### 2026-02-02 - Resolution

**By:** Codex

**Actions:**
- Updated `concepts/Profile.ts` to return error for missing profiles on all update variants
- Extended `specs/Profile.concept` with missing-profile error outcomes
- Added negative coverage in `concepts/test/profile.test.ts`

**Learnings:**
- Syncs already pre-validate profiles, but concept-level consistency matters for direct usage

## Notes

- If choosing Option 1, ensure syncs handle new error outputs where relevant.
