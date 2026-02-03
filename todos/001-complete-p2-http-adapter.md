---
status: complete
priority: p2
issue_id: "001"
tags: [http, deno, adapter, syncs]
dependencies: []
---

# Add HTTP adapter for API + version control

Provide a Deno HTTP server that maps real HTTP requests to `API.request` calls and returns `API.response` JSON for both API and version control sync families.

## Problem Statement

The repository currently exposes functionality only through direct `API.request` calls in tests. There is no HTTP server entrypoint, which blocks integrating a browser UI or external client without custom glue.

## Findings

- No `serve`-based entrypoint exists; usage is via `app.ts` + tests.
- Syncs match literal `method` and `path` templates (e.g., `/articles/:slug`).
- version control syncs live under `/version-control/*` and API syncs under `/users`, `/articles`, `/profiles`, etc.

## Proposed Solutions

### Option 1: Minimal Deno serve adapter (recommended)

**Approach:** Add `server.ts` using Deno standard library `serve`, route to sync templates, translate URL params into `input`, call `API.request`, return `API.response`.

**Pros:** No new deps, aligns with Deno, smallest change surface.

**Cons:** Manual route table maintenance.

**Effort:** 2-4 hours

**Risk:** Low

---

### Option 2: Oak (framework)

**Approach:** Introduce Oak router and middleware for parsing.

**Pros:** Familiar routing helpers.

**Cons:** New dependency and heavier stack for a simple adapter.

**Effort:** 4-6 hours

**Risk:** Medium

## Recommended Action

Implement Option 1. Export a `handleRequest` function for tests, add a route table for all API + version control paths, handle CORS and OPTIONS, add tests, and update README.

## Technical Details

**Affected files:**
- `server.ts` (new)
- `server.test.ts` (new)
- `README.md` (add HTTP adapter section)

**Related components:**
- `app.ts` (engine wiring)
- `concepts/API.ts` (request/response storage)
- `syncs/app/*` and `syncs/version_control/articles.ts` (route templates)

## Resources

- `docs/plans/2026-02-02-feat-http-adapter-server-plan.md`
- `app.ts`
- `concepts/API.ts`
- `syncs/app/`
- `syncs/version_control/`

## Acceptance Criteria

- [x] `deno run -A server.ts` starts a server on port 8080 (configurable via `PORT`).
- [x] `POST /users` returns API user JSON with status 201.
- [x] `POST /version-control/init` returns `{ ok: true, branch: "main" }` with status 200.
- [x] Unknown routes return 404 with `{ error: "..." }`.
- [x] `deno test` passes with new adapter tests.
- [x] README documents the HTTP adapter and a curl example.

## Work Log

### 2026-02-02 - Execution kickoff

**By:** Codex

**Actions:**
- Created ready todo to track HTTP adapter work.
- Planned tasks based on ExecPlan and repo scan.

**Learnings:**
- Sync templates require explicit URL-to-template mapping for route matching.

### 2026-02-02 - Implementation

**By:** Codex

**Actions:**
- Added `server.ts` with Deno `serve`, route table, CORS handling, and request translation.
- Added `server.test.ts` covering API registration, version control init, and 404 handling.
- Updated `README.md` with HTTP adapter usage and curl example.
- Ran `deno test` (all tests passing).
- Manually validated with curl (`POST /users` → 201, `POST /version-control/init` → 200).

**Learnings:**
- version control branch creation syncs can return a 409 after creation due to sync ordering; used `/version-control/init` for the adapter smoke test.
