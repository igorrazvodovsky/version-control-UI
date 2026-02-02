---
status: complete
priority: p3
issue_id: "012"
tags: [code-review, concept, api]
dependencies: []
---

# APIConcept.request reuses entries without clearing responses

## Problem Statement

`APIConcept.request` updates an existing request record without clearing its previous `output` or `code`. If a request ID is reused, the server can return a stale response from the prior request, which violates the expectation that each request starts a fresh flow.

## Findings

- `concepts/API.ts:24-29` updates `method`, `path`, and `input` for existing requests but leaves `output`/`code` untouched.
- `server.ts` returns stored responses when `output`/`code` are non-empty, so stale data can leak if request IDs are reused.
- Tests currently generate unique request IDs, so this issue is not covered.

## Proposed Solutions

### Option 1: Reset `output`/`code` when reusing request IDs

**Approach:** In the existing-request branch, set `output = null` and `code = 0` before returning.

**Pros:**
- Minimal change
- Preserves ability to reuse request IDs safely

**Cons:**
- Overwrites previous response history

**Effort:** 1-2 hours

**Risk:** Low

---

### Option 2: Reject duplicate request IDs

**Approach:** Return `{ error: "request already exists" }` and update spec + syncs to handle it.

**Pros:**
- Enforces unique request IDs
- Avoids silent overwrites

**Cons:**
- Requires error handling changes in syncs/tests

**Effort:** 2-4 hours

**Risk:** Medium

---

### Option 3: Version or archive prior requests

**Approach:** Maintain a history per request ID (e.g., append a sequence or store a list), and return the latest response.

**Pros:**
- Preserves history while avoiding stale returns

**Cons:**
- Adds complexity and state growth

**Effort:** 4-6 hours

**Risk:** Medium

## Recommended Action

Implemented Option 1: reused request IDs now clear `output`/`code` so stale responses cannot leak; spec and tests updated.

## Technical Details

**Affected files:**
- `concepts/API.ts:24-36` - existing-request handling
- `server.ts:313-336` - response retrieval depends on stale output

**Database changes (if any):**
- None

## Resources

- None

## Acceptance Criteria

- [x] Reusing a request ID does not return a stale response
- [x] Behavior is documented in `specs/API.concept`
- [x] Tests cover request ID reuse behavior

## Work Log

### 2026-02-02 - Initial Discovery

**By:** Codex

**Actions:**
- Reviewed API concept request/response flow
- Identified stale output risk on request ID reuse
- Noted missing tests for reuse scenario

**Learnings:**
- Server reads `API._get` without guarding against stale outputs

---

### 2026-02-02 - Resolution

**By:** Codex

**Actions:**
- Reset `output` and `code` on request reuse in `concepts/API.ts`
- Documented reuse behavior in `specs/API.concept`
- Added reuse coverage in `concepts/test/api.test.ts`

**Learnings:**
- Clearing outputs is the lowest-risk fix while preserving request ID reuse

## Notes

- If choosing Option 2, ensure callers always generate unique request IDs.
