---
title: feat: Add Next.js articles list UI
type: feat
date: 2026-02-02
---

# feat: Add Next.js articles list UI

## Overview

Build a new Next.js frontend (running on Deno) alongside the existing backend so a developer can view a public list of articles from the RealWorld API (`GET /articles`). The UI should be minimal and focused on the articles list MVP.

## Problem Statement / Motivation

The repository already exposes RealWorld HTTP endpoints via `server.ts`, but there is no frontend for quickly verifying or demoing the articles list. A lightweight UI will make development faster and provide a clear demo path.

## Proposed Solution

- Scaffold a Next.js app under `apps/web/` using the Deno Next.js workflow.
- Implement a single page at `/` that fetches and renders the articles list.
- Use App Router defaults (no Pages Router override).
- Configure the API base URL via an environment variable with a sensible local default.
- Document how to run backend and frontend together.

## Technical Considerations

- Deno + Next.js requires a `deno.json` with specific `unstable` flags and running `deno install --allow-scripts` before `deno task dev`.
- RealWorld list response is `{ articles: Article[], articlesCount: number }` and is already formatted by syncs.
- There is no pagination in the backend; the UI should render the full list for now.
- CORS is already enabled in `server.ts`, so client-side fetches are allowed.
- Favor the create-next-app defaults (App Router + TypeScript).

## SpecFlow Analysis

- The UI must target the literal backend route `GET /articles` and handle the exact response shape (`articles`, `articlesCount`).
- Empty and error states are required: the backend can return empty lists or 4xx/5xx JSON errors.
- Optional query params (`author`, `tag`, `favoritedBy`, `viewer`) exist but are out of scope; ensure the UI won’t break if they are absent.
- The backend is branch-scoped; it relies on `realworld_app.ts` initializing Gitless on startup.

## Acceptance Criteria

- [ ] A new Next.js project exists under `apps/web/` and starts with `deno task dev`.
- [ ] The `/` page loads data from `GET /articles` and renders a list of article cards.
- [ ] Empty state: show a friendly message when `articlesCount` is 0.
- [ ] Error state: show a clear error message on non-200 responses or network failure.
- [ ] API base URL is configurable via `NEXT_PUBLIC_API_BASE_URL` (default to `http://localhost:8080`).
- [ ] README includes local run instructions for backend and frontend.
- [ ] Manual validation steps documented (backend running + UI fetch success).

## Success Metrics

- A developer can run backend + frontend locally and see the article list within 2 minutes.
- No console errors on initial page load.

## Dependencies & Risks

- Deno Next.js compatibility depends on the correct `unstable` flags and install steps.
- Backend must be running locally (`deno run -A server.ts`) for the UI to render data.
- Future auth or pagination would require additional UI logic; keep current scope minimal.

## MVP Example (Pseudo-code)

```ts
// apps/web/src/app/page.tsx
async function getArticles() {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
  const res = await fetch(`${baseUrl}/articles`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load articles");
  return res.json();
}
```

## References & Research

- 📍 Local references:
  - `server.ts:36` (route table includes `GET /articles`).
  - `server.ts:63` (CORS headers for browser fetches).
  - `syncs/realworld/articles.ts:597` (list articles sync).
  - `syncs/realworld/articles.ts:723` (article list response formatting).
  - `realworld_app.ts:1` (engine wiring + Gitless init).
  - `docs/plans/2026-02-02-feat-http-adapter-server-plan.md` (HTTP adapter context).
- 📚 Institutional learnings: none (no files in `docs/solutions/`; no critical patterns file).
- 🌐 External docs: Deno Next.js tutorial (Deno docs) for scaffolding and config.

## AI-Era Considerations

- If AI generates boilerplate, review for Deno compatibility (tasks, unstable flags, env handling).
- Run a manual end-to-end check after AI changes: backend up → frontend fetch success.
- Keep any AI-generated code paths for API fetching under human review.

## Open Questions

- None. Location, route, and router choice are decided.
