---
status: pending
priority: p3
issue_id: "008"
tags: [code-review, quality]
dependencies: []
---

# Remove or implement sidebar cookie persistence

Sidebar cookie constants are defined but never used, suggesting incomplete persistence logic or dead code.

## Problem Statement

`SIDEBAR_COOKIE_NAME` and `SIDEBAR_COOKIE_MAX_AGE` exist in the sidebar component but are unused. This can confuse maintainers and implies missing persistence for the sidebar open state.

## Findings

- `apps/web/src/components/ui/sidebar.tsx:14-15` defines cookie constants that are never referenced.
- No cookie read/write logic exists in the sidebar component.

## Proposed Solutions

### Option 1: Remove unused constants

**Approach:** Delete the unused constants and related dead code.

**Pros:**
- Reduces clutter
- Avoids implying functionality that does not exist

**Cons:**
- No persistence for sidebar state

**Effort:** 15-30 minutes

**Risk:** Low

---

### Option 2: Implement persistence

**Approach:** Use the constants to write/read a cookie so sidebar state survives reloads.

**Pros:**
- Improved UX (state is remembered)

**Cons:**
- More code and edge cases (SSR, cookie parsing)

**Effort:** 1-2 hours

**Risk:** Low

## Recommended Action


## Technical Details

**Affected files:**
- `apps/web/src/components/ui/sidebar.tsx:14-15`

## Resources

- **PR:** N/A (local review)

## Acceptance Criteria

- [ ] No unused sidebar cookie constants remain, or
- [ ] Sidebar open state persists across reloads

## Work Log

### 2026-02-02 - Initial Discovery

**By:** Codex

**Actions:**
- Identified unused cookie constants in sidebar component

**Learnings:**
- Persistence appears intended but not implemented

## Notes

- If implementing persistence, confirm behavior on mobile and desktop variants.
