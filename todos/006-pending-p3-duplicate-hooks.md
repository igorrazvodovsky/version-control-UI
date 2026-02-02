---
status: pending
priority: p3
issue_id: "006"
tags: [code-review, quality]
dependencies: []
---

# Remove duplicate hook implementations

The same hooks are implemented in two locations, which increases maintenance burden and risks divergence.

## Problem Statement

`useIsMobile` and `useToast` are duplicated under both `src/hooks` and `src/components/ui`. Only the `src/hooks` versions are currently referenced. Keeping duplicate copies makes it easy for them to drift or for future imports to accidentally use the wrong version.

## Findings

- `apps/web/src/hooks/use-mobile.ts` and `apps/web/src/components/ui/use-mobile.tsx` contain identical logic.
- `apps/web/src/hooks/use-toast.ts` and `apps/web/src/components/ui/use-toast.ts` contain identical logic.
- `apps/web/src/components/ui/sidebar.tsx` and `apps/web/src/components/ui/toaster.tsx` import from `@/hooks`, not `@/components/ui`.

## Proposed Solutions

### Option 1: Delete the unused duplicates

**Approach:** Remove the `components/ui` duplicates and keep the canonical hook implementations in `src/hooks`.

**Pros:**
- Simplifies codebase
- Avoids drift between copies

**Cons:**
- Requires verifying no external imports rely on the duplicates

**Effort:** 15-30 minutes

**Risk:** Low

---

### Option 2: Re-export hooks from one location

**Approach:** Keep a single implementation and add a re-export file to support legacy imports.

**Pros:**
- Backwards compatibility for any hidden imports

**Cons:**
- Slightly more indirection

**Effort:** 30-60 minutes

**Risk:** Low

## Recommended Action


## Technical Details

**Affected files:**
- `apps/web/src/hooks/use-mobile.ts`
- `apps/web/src/components/ui/use-mobile.tsx`
- `apps/web/src/hooks/use-toast.ts`
- `apps/web/src/components/ui/use-toast.ts`

## Resources

- **PR:** N/A (local review)

## Acceptance Criteria

- [ ] Only one canonical implementation per hook
- [ ] Imports consistently reference the canonical location
- [ ] No runtime regressions after removal

## Work Log

### 2026-02-02 - Initial Discovery

**By:** Codex

**Actions:**
- Searched for hook usage and identified duplicate files
- Verified current imports use `src/hooks`

**Learnings:**
- Duplicates appear to be leftover from component generator scaffolding

## Notes

- If keeping `components/ui` as public API, prefer re-export files rather than duplicate implementations.
