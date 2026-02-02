---
status: pending
priority: p3
issue_id: "007"
tags: [code-review, quality]
dependencies: []
---

# Remove or surface unused articlesCount state

The articles list tracks `articlesCount` but never reads it, which adds unnecessary state updates and signals an incomplete UI requirement.

## Problem Statement

`articlesCount` is set when articles load but never used in the UI. This is either dead state or an incomplete requirement to display total results. Leaving it unused adds noise and extra renders.

## Findings

- `apps/web/src/app/page.tsx:75-101` initializes `articlesCount` and sets it in `loadArticles`.
- There are no reads of `articlesCount` in the component render.

## Proposed Solutions

### Option 1: Remove the unused state

**Approach:** Delete `articlesCount` and `setArticlesCount` if the count is not needed.

**Pros:**
- Simplifies state management
- Avoids unused values

**Cons:**
- Loses total count if it was intended for UI

**Effort:** 15-30 minutes

**Risk:** Low

---

### Option 2: Display the count in the UI

**Approach:** Add a small summary (e.g., "42 articles") above the table or in the header.

**Pros:**
- Uses available data
- Improves user context for data volume

**Cons:**
- Requires UI decision on placement and styling

**Effort:** 30-60 minutes

**Risk:** Low

## Recommended Action


## Technical Details

**Affected files:**
- `apps/web/src/app/page.tsx:75-101`

## Resources

- **PR:** N/A (local review)

## Acceptance Criteria

- [ ] No unused `articlesCount` state remains
- [ ] If count is shown, it updates correctly with data

## Work Log

### 2026-02-02 - Initial Discovery

**By:** Codex

**Actions:**
- Identified unused `articlesCount` state in the page component

**Learnings:**
- State is set but never consumed in the render path

## Notes

- If pagination is planned, consider storing count alongside pagination controls.
