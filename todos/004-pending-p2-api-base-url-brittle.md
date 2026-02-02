---
status: pending
priority: p2
issue_id: "004"
tags: [code-review, quality, architecture]
dependencies: []
---

# Harden API base URL handling for articles fetch

The client-side articles fetch uses a localhost default and a URL construction that drops any base path, which makes production configuration brittle and easy to misconfigure.

## Problem Statement

`fetchArticles` defaults to `http://localhost:8080`, and it builds the request with `new URL("/articles", baseUrl)`. If the runtime `NEXT_PUBLIC_API_BASE_URL` is missing or includes a path segment (e.g., `https://example.com/api`), the request will target the wrong origin/path or fall back to localhost in production.

## Findings

- `apps/web/src/lib/articles.ts:26-40` defines `DEFAULT_API_BASE_URL = "http://localhost:8080"` and uses `new URL("/articles", baseUrl)`.
- `apps/web/src/app/page.tsx:79-93` falls back to the default when `NEXT_PUBLIC_API_BASE_URL` is unset.
- Leading slash in `new URL("/articles", baseUrl)` resets the path, so `https://example.com/api` becomes `https://example.com/articles`.
- In production, an unset env var will cause the UI to call localhost from end users' browsers.

## Proposed Solutions

### Option 1: Prefer same-origin relative URLs

**Approach:** Use a relative path (`/articles`) in the client and only allow an override via `NEXT_PUBLIC_API_BASE_URL` if explicitly set and validated.

**Pros:**
- Works in most deployments without configuration
- Avoids accidental localhost calls

**Cons:**
- Requires API and web to share an origin or proxy

**Effort:** 30-60 minutes

**Risk:** Low

---

### Option 2: Fix URL joining and enforce configuration

**Approach:** Use `new URL("articles", baseUrl)` (no leading slash) and fail fast if env is missing in non-local environments.

**Pros:**
- Supports base paths cleanly
- Explicit configuration reduces surprises

**Cons:**
- Requires stricter env management

**Effort:** 30-60 minutes

**Risk:** Low

---

### Option 3: Derive base URL from `window.location.origin`

**Approach:** Use `window.location.origin` as the default base in the client, with optional override.

**Pros:**
- Safe default for production
- No extra configuration in most setups

**Cons:**
- Only works on the client

**Effort:** 30-60 minutes

**Risk:** Low

## Recommended Action


## Technical Details

**Affected files:**
- `apps/web/src/lib/articles.ts:26-40`
- `apps/web/src/app/page.tsx:79-93`

## Resources

- **PR:** N/A (local review)

## Acceptance Criteria

- [ ] Articles fetch does not default to localhost in production builds
- [ ] Base URLs with path segments resolve correctly
- [ ] Error messaging clearly indicates missing/invalid configuration

## Work Log

### 2026-02-02 - Initial Discovery

**By:** Codex

**Actions:**
- Reviewed articles fetch path construction
- Identified leading-slash path reset and localhost fallback
- Documented configuration risks

**Learnings:**
- `new URL("/path", base)` strips base path segments

## Notes

- Consider adding a small unit test covering base URLs with path prefixes.
