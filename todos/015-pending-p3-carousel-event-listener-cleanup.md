---
status: pending
priority: p3
issue_id: "015"
tags: [code-review, quality, performance]
dependencies: []
---

# Clean up carousel event listeners

The carousel registers multiple Embla listeners but only removes one, which can leave stale listeners attached when the API instance changes.

## Problem Statement

`Carousel` subscribes to both `reInit` and `select` events but only removes the `select` listener in cleanup. Over time (or during hot reloads), the `reInit` listener can accumulate, causing extra state updates and unnecessary work.

## Findings

- `apps/web/src/components/ui/carousel.tsx:96-104` registers `api.on('reInit', onSelect)` and `api.on('select', onSelect)`.
- Cleanup only calls `api.off('select', onSelect)` and leaves the `reInit` listener attached.

## Proposed Solutions

### Option 1: Symmetric cleanup

**Approach:** Add `api.off('reInit', onSelect)` in the cleanup block.

**Pros:**
- Minimal code change
- Prevents listener buildup

**Cons:**
- None

**Effort:** 15 minutes

**Risk:** Low

---

### Option 2: Centralize subscription helper

**Approach:** Extract a small helper to register/unregister Embla listeners, ensuring symmetry.

**Pros:**
- Reduces future mistakes

**Cons:**
- Slightly more code

**Effort:** 30-45 minutes

**Risk:** Low

## Recommended Action


## Technical Details

**Affected files:**
- `apps/web/src/components/ui/carousel.tsx:96-104`

## Resources

- **PR:** N/A (local review)

## Acceptance Criteria

- [ ] Both `select` and `reInit` listeners are removed in cleanup
- [ ] No duplicate `onSelect` calls after re-mounts or hot reloads

## Work Log

### 2026-02-06 - Initial Discovery

**By:** Codex

**Actions:**
- Reviewed carousel effect subscriptions and cleanup
- Noted missing listener removal

**Learnings:**
- `reInit` events can accumulate without symmetric cleanup

