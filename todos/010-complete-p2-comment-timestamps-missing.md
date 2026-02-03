---
status: complete
priority: p2
issue_id: "010"
tags: [code-review, api, app, concept]
dependencies: []
---

# Comment timestamps missing in API responses

## Problem Statement

Comment API responses always return empty `createdAt`/`updatedAt` fields, even though the Comment concept stores timestamps. This breaks the API contract for comment payloads and makes the API responses misleading for clients that expect ISO timestamps.

## Findings

- `buildCommentView` hard-codes empty strings for timestamps in `syncs/app/format.ts:216-220`.
- `CommentConcept` stores `createdAt`/`updatedAt` but `_get` does not expose them (`concepts/Comment.ts:2-45`), so the formatter cannot access real values.
- `specs/Comment.concept` omits timestamps from `_get`, which blocks using them in sync formatting.
- Existing API sync tests (`syncs/app/app.test.ts`) assert comment id/body only, so the gap is currently untested.

## Proposed Solutions

### Option 1: Extend `CommentConcept._get` to include timestamps

**Approach:** Update `_get` to return `createdAt`/`updatedAt`, update `specs/Comment.concept`, and use those fields in `buildCommentView`.

**Pros:**
- Minimal data plumbing changes
- Reuses existing state
- Simplest path for API response correctness

**Cons:**
- Changes concept query shape (may require updates in callers/tests)

**Effort:** 2-4 hours

**Risk:** Low

---

### Option 2: Add a new query (e.g., `_getWithTimestamps`)

**Approach:** Keep `_get` as-is, add a new query that includes timestamps, and update `buildCommentView` to use it.

**Pros:**
- Backward-compatible for existing `_get` callers

**Cons:**
- Adds another query to concept surface area
- Requires spec + tests updates anyway

**Effort:** 3-5 hours

**Risk:** Low

---

### Option 3: Track timestamps outside `Comment` (new concept or sync state)

**Approach:** Introduce a separate concept/state for comment metadata or enrich responses in syncs using a parallel store.

**Pros:**
- Avoids changing `Comment` query shape

**Cons:**
- Adds complexity and state duplication
- More moving parts and testing surface

**Effort:** 6-10 hours

**Risk:** Medium

## Recommended Action

Implemented Option 1: extended `CommentConcept._get` to expose timestamps, updated the spec, and wired `buildCommentView` + tests to assert non-empty values.

## Technical Details

**Affected files:**
- `syncs/app/format.ts:216-220` - empty timestamps in `buildCommentView`
- `concepts/Comment.ts:2-45` - timestamps stored but not returned
- `specs/Comment.concept` - query shape omits timestamps
- `syncs/app/app.test.ts` - lacks timestamp assertions

**Database changes (if any):**
- None

## Resources

- API spec expects `createdAt`/`updatedAt` on comments

## Acceptance Criteria

- [x] Comment API responses include real ISO timestamps for `createdAt`/`updatedAt`
- [x] `Comment` query or new query exposes timestamps
- [x] `specs/Comment.concept` updated to match behavior
- [x] Tests assert timestamps are present and non-empty

## Work Log

### 2026-02-02 - Initial Discovery

**By:** Codex

**Actions:**
- Reviewed comment formatting flow and concept queries
- Noted empty timestamp fields in `buildCommentView`
- Traced missing data to `CommentConcept._get` and spec

**Learnings:**
- Comment timestamps are stored but not exposed
- API responses are currently missing required fields

---

### 2026-02-02 - Resolution

**By:** Codex

**Actions:**
- Updated `concepts/Comment.ts` to return `createdAt`/`updatedAt` in `_get`
- Updated `specs/Comment.concept` query signature
- Updated `syncs/app/format.ts` to emit real timestamps
- Added assertions in `concepts/test/comment.test.ts` and `syncs/app/app.test.ts`

**Learnings:**
- Comment timestamps were already stored; the fix was primarily query + formatting plumbing

## Notes

- Consider updating any downstream consumers to handle added fields if `_get` changes.
