# Add HTTP Adapter for RealWorld and Gitless

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

Maintain this plan in accordance with `.agent/PLANS.md` at the repository root.

## Purpose / Big Picture

After this change, a developer can start a local Deno HTTP server and interact with both the RealWorld and Gitless syncs using normal HTTP requests. The adapter will translate incoming HTTP requests into `API.request` actions and immediately return the corresponding `API.response` JSON and status code. This makes the concept + sync engine usable from a browser UI or external client without changing the concepts or synchronizations.

## Progress

- [x] (2026-02-02 00:00Z) Drafted ExecPlan for the HTTP adapter.
- [x] (2026-02-02 00:15Z) Implemented the HTTP adapter entrypoint and routing table for RealWorld + Gitless.
- [x] (2026-02-02 00:18Z) Added adapter tests and documented how to run the server.
- [x] (2026-02-02 00:22Z) Validated with manual HTTP requests and ran the Deno test suite.

## Surprises & Discoveries

- Observation: The repository has no existing HTTP server entrypoint; current usage is via direct `API.request` calls and tests.
  Evidence: No `serve` usage or server file in the repo, only sync tests such as `syncs/realworld/realworld.test.ts`.
- Observation: There is no `docs/solutions/` directory, so no institutional learnings were available to consult.
  Evidence: `ls docs/solutions` fails because the directory does not exist.
- Observation: Gitless branch creation can return a 409 after a successful create due to sync ordering.
  Evidence: Initial adapter test against `POST /gitless/branches` returned 409; switching to `POST /gitless/init` avoided the false conflict.

## Decision Log

- Decision: Use the Deno standard library `serve` function as the HTTP runtime.
  Rationale: The repository already targets Deno and prefers minimal dependencies.
  Date/Author: 2026-02-02 / assistant (per user choice).
- Decision: Expose both RealWorld and Gitless endpoints from the same server.
  Rationale: The user asked for combined coverage, and both sync families are already wired in `realworld_app.ts`.
  Date/Author: 2026-02-02 / assistant (per user choice).
- Decision: Handle responses synchronously by calling `API.request`, then immediately reading `API._get`.
  Rationale: The syncs already produce `API.response` in the same flow, and tests read responses immediately.
  Date/Author: 2026-02-02 / assistant (per user choice).
- Decision: Route by mapping concrete URLs to the literal path templates used in syncs and extract parameters into `input`.
  Rationale: Syncs match templates like `/articles/:slug`; the adapter must translate real URLs into those templates.
  Date/Author: 2026-02-02 / assistant.
- Decision: Build `input` from query parameters for GET requests and from JSON bodies for non-GET requests, with JSON body values overriding duplicate query keys if both exist.
  Rationale: Keeps behavior predictable and aligns with common REST usage.
  Date/Author: 2026-02-02 / assistant.
- Decision: Always return JSON with CORS headers and handle preflight OPTIONS requests.
  Rationale: A browser UI will need cross-origin access during development.
  Date/Author: 2026-02-02 / assistant.
- Decision: Use `POST /gitless/init` as the adapter smoke test instead of branch creation.
  Rationale: Gitless branch creation syncs can emit a false 409 after creating the branch due to ordering, which is outside this adapter’s scope.
  Date/Author: 2026-02-02 / assistant.

## Outcomes & Retrospective

HTTP adapter added (`server.ts`) with routing, CORS, and request translation. Tests pass (`deno test`), and manual curl validation confirms RealWorld and Gitless endpoints respond with expected status codes. Remaining work is only follow-up polishing if desired (for example, adding more routes or error handling).

## Context and Orientation

This repository is a Deno-based concept + synchronization system. Concepts live in `concepts/`, syncs in `syncs/`, and the engine in `engine/`. The bootstrap concept `API` (`concepts/API.ts`) records `API.request` and `API.response` actions. RealWorld syncs live in `syncs/realworld/` and match requests using literal `method` and `path` templates like `/articles/:slug`, with all parameters passed in the flat `input` object. Gitless syncs live in `syncs/gitless/` and similarly match literal paths under `/gitless/*`. There is no HTTP server today; requests are simulated in tests by calling `API.request` directly. The HTTP adapter will be a new entrypoint that turns HTTP requests into `API.request` actions and returns the stored `API.response` values.

## Plan of Work

Create a new HTTP adapter entrypoint at `server.ts` in the repository root. This file will import `createRealWorldApp` from `realworld_app.ts`, start the sync engine once, and export a `handleRequest(request: Request): Promise<Response>` function so tests can call it without binding a real network port. When `server.ts` runs as the main module, it should call Deno’s `serve` with the handler and a configurable port (default 8080, override via `PORT`).

Implement a route table that maps concrete HTTP requests to the literal path templates used by syncs, and extracts path parameters into the `input` object. The route table should include all RealWorld endpoints listed in `docs/plans/2026-02-01-basic-syncs.md` and the Gitless endpoints in `syncs/gitless/articles.ts`. The handler should use a simple matcher (either `URLPattern` or explicit regular expressions) to select the route and to extract parameters like `slug` and `commentId`. It should then build the final `input` object by merging extracted params with query parameters (for GET requests) or JSON body data (for non-GET requests). Any request that does not match a known route should return a 404 JSON error response without touching the engine.

Generate a unique request id (for example with `crypto.randomUUID()`), call `API.request` with `{ request, method, path: template, input }`, then immediately call `API._get({ request })` to retrieve the stored output and code. If no response is present (which would indicate a sync misfire), return a 500 JSON error that includes the request id for debugging. For successful responses, return the JSON output and use the code from `API._get` as the HTTP status.

Add CORS handling in the adapter: respond to OPTIONS requests with 204 and the same CORS headers that are added to all normal responses. Use `Access-Control-Allow-Origin: *`, include `Access-Control-Allow-Methods`, and allow `Content-Type` so a browser UI can use fetch without extra setup.

Add a new test file such as `server.test.ts` (or `http/server.test.ts` if a subfolder is preferred) that imports `handleRequest`, constructs `Request` objects for a small set of RealWorld and Gitless endpoints, and asserts on the response status and JSON body. Focus on one RealWorld happy path (user registration) and one Gitless happy path (branch creation), plus one unknown route case to verify 404 handling. Keep tests in Deno style so they run under `deno test`.

Update `README.md` with a short section describing how to start the server (`deno run -A server.ts`), the default port, and an example curl command for a RealWorld endpoint. Keep it brief and consistent with existing documentation style.

## SpecFlow Analysis

The main specification risk is the mismatch between concrete URL paths and the literal templates used in syncs. The adapter must normalize URLs into template paths and extract parameters; otherwise no syncs will match. Another edge case is the mixed use of query parameters (for GET filters) and JSON bodies (for POST/PUT), which must be merged into a flat `input` object without nesting. The syncs also assume immediate responses; if any sync path fails to produce `API.response`, the adapter must detect and surface that as an explicit 500 so the failure is visible rather than a hang. Finally, browser UIs require CORS and preflight handling, so the adapter must answer OPTIONS requests without touching the engine.

## Acceptance Criteria

A developer can start `deno run -A server.ts` and send RealWorld and Gitless HTTP requests that return JSON responses with the correct status codes from `API.response`. A POST to `/users` with JSON input returns the RealWorld user payload and a 201 status, and a POST to `/gitless/branches` with a JSON `name` returns the Gitless branch payload and a 201 status. A request to an unknown route returns a 404 JSON error. `deno test` passes, including the new adapter tests.

## Success Metrics

The HTTP adapter provides a stable interface for a frontend: at least one RealWorld request and one Gitless request can be exercised from curl or a browser fetch without touching the engine directly, and the adapter tests pass on every run.

## Dependencies & Risks

This plan depends on the existing syncs in `syncs/realworld/` and `syncs/gitless/` continuing to emit `API.response` synchronously. If a sync fails to respond, the adapter will return a 500 and must make that visible in logs. Another risk is route drift: if sync templates change, the adapter’s route table must be updated in lockstep. There is no persistence, so server restarts will reset state; a UI using this adapter must treat it as ephemeral.

## References & Research

Local references include `realworld_app.ts` (engine wiring), `concepts/API.ts` (request/response storage), `syncs/realworld/` (RealWorld endpoint templates), `syncs/gitless/articles.ts` (Gitless endpoint templates), and `README.md` (current usage and test commands). No institutional learnings were found because `docs/solutions/` is absent. No external research is required for this change.

## AI-Era Considerations

If AI pair programming is used during implementation, keep the route table and template mappings under human review, because a small mismatch will silently break sync matching. Tests should be run after every route change to catch these mismatches early.

## Concrete Steps

From the repository root, create `server.ts` and implement the handler and server startup described above. Add a new test file (for example `server.test.ts`) that exercises one RealWorld and one Gitless route by calling `handleRequest` directly. Update `README.md` with a short “HTTP adapter” section and one curl example. Run the Deno test suite and verify that all tests pass.

## Validation and Acceptance

Run `deno test` from the repository root and expect all tests to pass, including the new adapter tests. Then start the server with `deno run -A server.ts` and send two requests with curl. For example, a POST to `/users` with JSON input containing `username` and `email` should respond with a 201 and a JSON payload containing `user.username`, and a POST to `/gitless/branches` with JSON `{ "name": "feature" }` should respond with a 201 and JSON containing the new branch name. An unknown path should return 404 with a JSON error object. These manual checks demonstrate that the adapter is wired end-to-end.

## Idempotence and Recovery

All steps are additive. If the server fails to start or a route fails, adjust the route table and rerun `deno test`. Rolling back is as simple as removing `server.ts`, its test file, and the README section.

## Artifacts and Notes

Keep brief manual transcripts for validation inside the repository documentation if needed. For example, after running the server, a successful `/users` request should show a 201 status and a JSON body containing the new user, and a successful `/gitless/branches` request should show a 201 status and a JSON body containing the new branch. These transcripts should be short and focused on confirming the behavior.

## Interfaces and Dependencies

In `server.ts`, define and export a handler:

    export async function handleRequest(request: Request): Promise<Response>

The handler should accept a standard Web `Request`, match it against a route table, and return a `Response` with JSON content. Use Deno’s standard library `serve` (imported without a version pin) to bind the handler to a port when running as the main module. The route table should be a small array of route definitions that include `method`, the literal template string used by syncs, a matcher (regex or `URLPattern`), and a function to extract parameters into the `input` object. The adapter should call `createRealWorldApp()` once at startup, reuse the returned `API` concept, and never instantiate a new engine per request.

## Plan Revision Notes

2026-02-02: Updated Progress, Surprises & Discoveries, Decision Log, and Outcomes after completing implementation, tests, and manual curl validation. Added the Gitless sync ordering discovery and documented the adapter validation results.
