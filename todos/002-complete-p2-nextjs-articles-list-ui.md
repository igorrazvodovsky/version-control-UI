---
status: complete
priority: p2
issue_id: "002"
tags: [frontend, nextjs, deno, app]
dependencies: []
---

# Add Next.js articles list UI (Deno)

Build a minimal Next.js frontend under `apps/web/` that lists articles from the existing HTTP API.

## Problem Statement

There is no frontend UI to quickly verify or demo the API articles list endpoint. A lightweight Next.js app will make development and demos faster.

## Findings

- Backend already exposes `GET /articles` via `server.ts` and API syncs.
- CORS headers are enabled for browser fetches in `server.ts`.
- The plan specifies App Router defaults and the app location `apps/web/`.

## Proposed Solutions

### Option 1: Deno + create-next-app (App Router default)

**Approach:** Use the Deno Next.js tutorial flow to scaffold in `apps/web/`, keep default styling, implement `/` page to fetch and render articles, add a small unit test for the fetch helper.

**Pros:**
- Matches plan and default Next.js conventions
- Minimal setup, quick to ship

**Cons:**
- Deno flags and install steps must be documented correctly

**Effort:** 2-4 hours

**Risk:** Low

---

### Option 2: Manual Next.js setup

**Approach:** Hand-roll Next.js config and scripts under `apps/web/` without create-next-app.

**Pros:**
- Maximum control over configuration

**Cons:**
- More time, higher risk of missing Deno-specific setup

**Effort:** 4-6 hours

**Risk:** Medium

## Recommended Action

Proceed with Option 1 (Deno + create-next-app). Implement `/` articles list UI with empty/error states, expose `NEXT_PUBLIC_API_BASE_URL`, add a small unit test for the fetch helper, and update README with run instructions.

## Technical Details

**Affected files (new + updated):**
- `apps/web/` (Next.js app scaffold)
- `apps/web/src/app/page.tsx` (articles list UI)
- `apps/web/src/lib/articles.ts` (fetch helper for list endpoint)
- `apps/web/src/lib/articles.test.ts` (unit test for fetch helper)
- `README.md` (backend + frontend run instructions)

**Related components:**
- `server.ts` (HTTP adapter, CORS headers)
- `syncs/app/articles.ts` (list articles sync)

**Database changes:**
- None

## Resources

- Deno Next.js tutorial (scaffolding + config)
- `docs/plans/2026-02-02-feat-add-nextjs-articles-list-ui-plan.md`

## Acceptance Criteria

- [x] Next.js app exists under `apps/web/` and runs with `deno task dev`
- [x] `/` page loads and renders articles from `GET /articles`
- [x] Empty state message shown when no articles
- [x] Error state message shown on fetch failure
- [x] `NEXT_PUBLIC_API_BASE_URL` supported with default `http://localhost:8080`
- [x] README updated with local run instructions
- [x] Unit test for articles fetch helper added and passing

## Work Log

### 2026-02-02 - Setup

**By:** Codex

**Actions:**
- Captured plan requirements and clarified defaults
- Created todo entry with recommended action

**Learnings:**
- No existing frontend directory; new app will be added under `apps/web/`

---

### 2026-02-02 - Implementation

**By:** Codex

**Actions:**
- Scaffolded Next.js app under `apps/web/` (App Router, no Tailwind)
- Added `apps/web/deno.json` tasks for Deno + Next.js
- Implemented articles fetch helper and UI at `/`
- Added unit tests for fetch helper (`apps/web/src/lib/articles.test.ts`)
- Updated `README.md` with backend/frontend run steps + manual validation
- Ran `deno test apps/web/src/lib/articles.test.ts`

**Learnings:**
- `create-next-app` uses npm by default; Deno tasks handle runtime execution

## Notes

- Keep default Next.js styling; no Tailwind.
