---
status: pending
priority: p2
issue_id: "003"
tags: [code-review, quality, performance]
dependencies: []
---

# Stabilize toast listener subscription

The toast store re-subscribes on every state update, creating unnecessary churn and a potential window where toast updates can be missed.

## Problem Statement

`useToast()` re-registers its listener every time `state` changes. This means the listener is removed and re-added on each toast update, which is unnecessary work and can cause missed updates if a dispatch occurs between cleanup and re-subscribe.

## Findings

- `apps/web/src/hooks/use-toast.ts:171-182` subscribes with `listeners.push(setState)` inside a `useEffect` that depends on `state`.
- The effect runs on every state update, causing a remove/add cycle per toast event.
- This pattern can miss updates if `dispatch()` fires between cleanup and the next subscription.
- It also adds avoidable overhead for every toast update.

## Proposed Solutions

### Option 1: Subscribe once

**Approach:** Change the effect dependency array to `[]` so the listener is registered once per component lifecycle.

**Pros:**
- Eliminates re-subscription churn
- Removes the potential dispatch gap
- Simple, low-risk change

**Cons:**
- Requires confidence that `setState` reference is stable (it is)

**Effort:** 15-30 minutes

**Risk:** Low

---

### Option 2: Use `useSyncExternalStore`

**Approach:** Replace the custom listener wiring with React's `useSyncExternalStore` for external state.

**Pros:**
- Standard pattern for external stores
- Avoids manual listener bookkeeping

**Cons:**
- More code churn for a small bug

**Effort:** 1-2 hours

**Risk:** Low

## Recommended Action


## Technical Details

**Affected files:**
- `apps/web/src/hooks/use-toast.ts:171-182`

**Related components:**
- `apps/web/src/components/ui/toaster.tsx` (consumer)

## Resources

- **PR:** N/A (local review)

## Acceptance Criteria

- [ ] `useToast` subscribes only once per component lifecycle
- [ ] Toast updates still propagate correctly
- [ ] No missed updates during rapid toast dispatches

## Work Log

### 2026-02-02 - Initial Discovery

**By:** Codex

**Actions:**
- Reviewed `useToast` subscription logic
- Identified dependency-driven re-subscription pattern
- Documented potential dispatch gap risk

**Learnings:**
- The current effect runs on every state update, which is unnecessary for this store

## Notes

- If moving to `useSyncExternalStore`, consider also consolidating duplicate `use-toast` files.
