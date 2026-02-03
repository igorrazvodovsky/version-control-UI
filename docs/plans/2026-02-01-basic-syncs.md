# Add API Synchronizations

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

Maintain this plan in accordance with `.agent/PLANS.md` at the repository root.

## Purpose / Big Picture

After this change, the repository will contain API synchronizations that translate `API.request` actions into concept actions and then into `API.response` records. A developer will be able to simulate API endpoints by calling `API.request(...)`, run the syncs through the engine, and observe structured responses stored by `API._get(...)` for users, profiles, articles, comments, tags, and favorites. This is the missing composition layer between the existing concepts and a working API-like workflow, and it is observable by running the sync tests or by issuing a single request and inspecting the stored response.

## Progress

- [x] (2026-02-01 01:15Z) Drafted ExecPlan for API synchronizations.
- [x] (2026-02-01 01:25Z) Revised plan for PLANS formatting compliance and clarified request path templates and slug rules.
- [x] (2026-02-01 01:28Z) Revised plan to split API syncs into multiple modules with an index entry point.
- [x] (2026-02-01 02:05Z) Implement API syncs for user registration, profile retrieval/update, and user self endpoints.
- [x] (2026-02-01 02:10Z) Implement API syncs for article CRUD, tag filtering, favorites, comment flows, and cascades.
- [x] (2026-02-01 02:12Z) Add shared response formatting helpers and normalize error response shapes.
- [x] (2026-02-01 02:15Z) Extend Tag concept with reverse tag lookup to enable tag filtering.
- [x] (2026-02-01 02:18Z) Add sync tests that exercise the main API flows end to end.
- [x] (2026-02-01 02:20Z) Validate with `deno test` and confirm responses stored in `API` state.
- [x] (2026-02-01 02:21Z) Update README with the new sync module and test command.

## Surprises & Discoveries

- Observation: Sync evaluation order can affect error handling when a sync mutates state that later syncs read in the same flow (for example, updating a username before the error guard runs).
  Evidence: The initial `PUT /user` flow returned a false “user not found” because the update sync ran before the error sync, so the error sync looked up the old username after it had been changed.

## Decision Log

- Decision: Keep the synchronization scope aligned with the reduced concept set (API, User, Profile, Article, Comment, Tag, Favorite) and do not add JWT/Password/Follow.
  Rationale: The prior ExecPlan explicitly removed JWT, Password, and Follow from scope; this follow-up should not expand concepts without a new request.
  Date/Author: 2026-02-01 / assistant
- Decision: Model API requests with HTTP-like `method` and `path` strings while keeping all parameters in the flat `input` object.
  Rationale: The sync engine only matches flat input patterns; keeping params in `input` avoids parsing the path while still preserving endpoint intent.
  Date/Author: 2026-02-01 / assistant
- Decision: Use literal path templates (for example, `/articles/:slug`) in `API.request.path` and treat the template as a match key only, with the actual parameter values provided in `input`.
  Rationale: This keeps `when` matching deterministic without introducing a path parser, and it aligns with the engine's flat pattern matching.
  Date/Author: 2026-02-01 / assistant
- Decision: Treat user identifiers in `API.request.input` as usernames, and resolve them to internal user IDs with `User._getByName` before invoking other concepts.
  Rationale: The `User` concept exposes usernames via query and uses opaque IDs for identity; synchronizations must translate between API-facing usernames and internal IDs.
  Date/Author: 2026-02-01 / assistant
- Decision: Use article IDs (not slugs) as the `target` for Tag, Favorite, and Comment associations.
  Rationale: Article IDs are stable identifiers already used by Article actions and queries; using them keeps cross-concept joins consistent and avoids duplicating slug logic in tag/favorite/comment concepts.
  Date/Author: 2026-02-01 / assistant
- Decision: Generate user, profile, article, and comment IDs inside synchronizations using `crypto.randomUUID()`, and generate article slugs from titles with a deterministic slugify rule.
  Rationale: API treats identifiers as server-generated; keeping generation in syncs preserves concept independence. A deterministic slugify rule avoids ambiguity and keeps slug creation predictable.
  Date/Author: 2026-02-01 / assistant
- Decision: The slugify rule will be: trim the title, lowercase it, replace any run of non-alphanumeric characters with a single hyphen, trim leading/trailing hyphens, and if the result is empty use `article-` plus a 6 character random suffix. If the slug already exists, append `-` plus a 6 character random suffix.
  Rationale: This mirrors common API implementations while ensuring uniqueness without adding new concept state.
  Date/Author: 2026-02-01 / assistant
- Decision: Omit tag filtering from the `GET /articles` sync because `Tag` has no reverse lookup by tag. (Superseded)
  Rationale: The `Tag` concept only supports target-to-tag queries, so tag-to-target filtering would require new concept state not in scope.
  Date/Author: 2026-02-01 / assistant
- Decision: Add a reverse tag lookup query (`Tag._getByTag`) and enable `GET /articles` filtering by tag.
  Rationale: Tag filtering is required by API; adding a read-only query preserves concept independence while enabling the filter.
  Date/Author: 2026-02-01 / assistant
- Decision: Normalize all error responses to `{ errors: { body: [message] } }` and keep status codes at 422/403/404.
  Rationale: API error payloads use a consistent structure; a single helper keeps syncs concise and responses uniform.
  Date/Author: 2026-02-01 / assistant
- Decision: Add `GET /user` and `PUT /user` endpoints driven by usernames in the request input.
  Rationale: These are common API endpoints; using usernames avoids introducing authentication concepts while still exercising `User.update`.
  Date/Author: 2026-02-01 / assistant
- Decision: Centralize response formatting in `syncs/app/format.ts`.
  Rationale: Formatting logic was duplicated across syncs; shared helpers keep payloads consistent and reduce maintenance effort.
  Date/Author: 2026-02-01 / assistant
- Decision: Return `token: null` and `following: false` in response payloads.
  Rationale: Authentication and follow relationships are out of scope; fixed values keep response shapes predictable without introducing new concepts.
  Date/Author: 2026-02-01 / assistant
- Decision: Split API syncs into multiple modules under `syncs/app/` with a single `index.ts` that aggregates them.
  Rationale: The sync surface is large; splitting by domain keeps files readable while preserving a single registration entry point.
  Date/Author: 2026-02-01 / assistant

## Outcomes & Retrospective

API synchronizations are implemented across domain modules with a shared formatting helper, and tests demonstrate end-to-end request/response flows including tag filtering, favorites, comments, cascades, and user updates. Error responses are normalized to a API-style payload. The Tag concept now supports reverse tag lookup to enable filtering. All tests pass under `deno test`.

## Context and Orientation

The API concept implementations already exist under `concepts/` and are specified in `specs/`. These include `API`, `User`, `Profile`, `Article`, `Comment`, `Tag`, and `Favorite`. There are currently no API synchronizations under `syncs/`. The synchronization engine and helpers (`actions`, `Frames`, `Vars`) live in `engine/mod.ts`. The paper in `docs/resources/wysiwid.md` describes API-oriented synchronizations using a `Web` concept; in this repository, the same role is played by `API`.

A synchronization is a declarative rule with `when` (matching completed actions in the same flow), optional `where` (pure queries and calculations over state), and `then` (actions to invoke). A flow is the causal chain started by an external action like `API.request`. A frame is a mapping from variable symbols to bound values; `Frames` is a collection of frames used to fan out or aggregate work. The `where` clause should use `frames.query(...)` with concept query methods (those prefixed with `_`) and keep patterns flat by binding input fields from the `API.request.input` payload into explicit variables.

An instrumented concept is the wrapper returned by `SyncConcept.instrument`, and it is the version of a concept whose actions emit completions that synchronizations can match. A slug is the URL-friendly identifier derived from an article title according to the slugify rule described in the Decision Log. A path template is a literal string with placeholders (for example `/articles/:slug`) that is used only as a match key in the `when` clause; the actual parameter values are always passed in `API.request.input`.

## Plan of Work

Create a new sync module directory under `syncs/app/` and split the synchronizations into multiple files by domain: `user_profile.ts`, `articles.ts`, `comments.ts`, `favorites_tags.ts`, and `cascades.ts`. Export each group as a plain object of sync functions from its file, then assemble them in `syncs/app/index.ts` into a single `makeAppSyncs` entry point. Each synchronization will follow the repository's TypeScript-native pattern (`const SyncName = ({ ... }: Vars) => ({ when, where, then })`) and use `actions(...)` from `engine/mod.ts`.

Define the API request contracts by matching on `API.request` with a concrete `method` and a literal path template, while keeping all parameters inside the flat `input` object. Extract `input` fields in the `where` clause with `frames.map(...)` or a small helper that reads `input` and validates the presence of required keys. Do not pattern-match nested input values in the `when` clause.

Translate usernames to internal user IDs by querying `User._getByName` before invoking other concepts. For article-specific endpoints, resolve `slug` to article IDs via `Article._getBySlug` and use that article ID as the target for Tag, Favorite, and Comment operations. For favorites and article formatting, compute `favorited` with `Favorite._isFavorited` when a viewer is provided, and compute `favoritesCount` with `Favorite._countByTarget`.

Implement response shaping using dedicated format synchronizations that listen to `API.format` actions. These formatting syncs will read concept state via queries, build the JSON payloads in the API response shape (with `token: null` and `following: false`), and call `API.response` with the desired HTTP-like status codes. Trigger the format syncs from the request-handling syncs by calling `API.format` with a payload containing the `request` id, the relevant concept IDs, and the intended response code.

Handle errors in separate synchronizations that match on concept action errors (for example, `User.register` returning `error`) or on missing query results (for example, no article for a requested slug). When data is missing, use a `where` clause that checks query results and produces a frame that emits an `API.response` with `404` rather than allowing the sync to do nothing. Use `403` for author mismatches and `422` for concept validation errors.

Add cascade synchronizations that trigger on `Article.delete` completions and remove related comments, tags, and favorites by using `frames.query(...)` fan-out. This keeps deletion behavior centralized and independent of the API route that initiated it.

Create a test file under `syncs/app/app.test.ts` that builds a `SyncConcept`, instruments the API concepts, registers the syncs from `syncs/app/index.ts`, and issues `API.request(...)` calls for core flows: register user, create article with tags, favorite/unfavorite, add/list comments, list tags, and delete article with cascade. Tests should assert response shapes via `API._get` and verify cascades by querying Tag, Favorite, and Comment concepts directly after deletion. Use `engine/test/helpers.ts` for assertions to match repository norms.

Update `README.md` to reference the new API sync module, the request/response simulation workflow, and the sync test command.

## Concrete Steps

From `/Users/igors.razvodovskis/Development/ticket-less-4-1`, create the syncs directory if needed by running:

    mkdir -p syncs

Create `syncs/app/` and add `user_profile.ts`, `articles.ts`, `comments.ts`, `favorites_tags.ts`, `cascades.ts`, `format.ts`, and `index.ts`. Place input and slug helpers in `syncs/app/helpers.ts` and shared response formatting in `syncs/app/format.ts`. Create `syncs/app/app.test.ts` with Deno tests that instrument concepts, register the syncs, and exercise the endpoints listed in the Interfaces and Dependencies section. Update `README.md` with a short API syncs section and the command to run the sync tests.

Run tests from the repository root:

    deno test

The output should include the new API sync tests passing alongside existing concept and engine tests.

## Validation and Acceptance

The change is accepted when `syncs/app/index.ts` exists, exports a `makeAppSyncs` function, and registers syncs without TypeScript errors; `deno test` passes and includes the API sync tests; issuing an `API.request` for each supported endpoint results in a stored `API.response` with the correct status code and payload shape; and deleting an article cascades to remove associated comments, tags, and favorites as verified via concept queries in tests.

Example manual validation in a test or REPL:

    await API.request({ request: "r1", method: "POST", path: "/users", input: { username: "alice", email: "a@b.com" } });
    const [{ output, code }] = API._get({ request: "r1" });
    // Expect code === 201 and output.user.username === "alice".

## Idempotence and Recovery

All steps are additive. Re-running the steps overwrites only the API sync modules and tests you create. If a sync behaves incorrectly, adjust the sync definitions and re-run `deno test`. To roll back, delete `syncs/app/` and `syncs/app/app.test.ts`, and revert `README.md`.

## Artifacts and Notes

Example request/response payload shapes (abbreviated) are shown here to guide formatting expectations:

    POST /users
      input: { username: "alice", email: "a@b.com" }
      output: { user: { username: "alice", email: "a@b.com", bio: "", image: "", token: null } }

    GET /profiles
      input: { username: "alice" }
      output: { profile: { username: "alice", bio: "", image: "", following: false } }

    POST /articles
      input: { author: "alice", title: "Hello", description: "Desc", body: "Body", tagList: ["news"] }
      output: { article: { slug: "hello", title: "Hello", tagList: ["news"], favoritesCount: 0, favorited: false, author: { username: "alice", following: false } } }

    Error example (missing username)
      output: { errors: { body: ["username required"] } }

## Interfaces and Dependencies

In `syncs/app/index.ts`, define and export the entry point used by tests and by any manual wiring:

    export function makeAppSyncs(
      API: APIConcept,
      User: UserConcept,
      Profile: ProfileConcept,
      Article: ArticleConcept,
      Comment: CommentConcept,
      Tag: TagConcept,
      Favorite: FavoriteConcept,
    ): Record<string, (vars: Vars) => { when: unknown; where?: unknown; then: unknown }>

Synchronizations to include, grouped by domain and with names treated as stable identifiers for debugging and tests, are:

    User/Profile: RegisterUser, RegisterUserError, RegisterUserFormat, FormatUserResponse, GetUser, GetUserNotFound, UpdateUserName, UpdateUserEmail, UpdateUserError, UpdateUserActionError, UpdateUserFormat, GetProfile, GetProfileNotFound, UpdateProfileBio, UpdateProfileImage, UpdateProfileError, UpdateProfileFormat, FormatProfileResponse.
    Articles: CreateArticle, CreateArticleError, AddTagsToArticle, CreateArticleFormat, GetArticle, GetArticleNotFound, UpdateArticle, UpdateArticleUnauthorized, UpdateArticleError, UpdateArticleFormat, DeleteArticleNotFound, DeleteArticleUnauthorized, PerformDeleteArticle, DeleteArticle, ListArticles, FormatArticleResponse, FormatArticlesResponse.
    Comments: CreateComment, CreateCommentError, CreateCommentFormat, ListComments, ListCommentsNotFound, DeleteCommentNotFound, DeleteCommentUnauthorized, PerformDeleteComment, DeleteComment, FormatCommentResponse, FormatCommentsResponse.
    Favorites/Tags: FavoriteArticle, FavoriteArticleError, FavoriteArticleFormat, UnfavoriteArticle, UnfavoriteArticleError, UnfavoriteArticleFormat, ListTags, FormatTagsResponse.
    Cascades: CascadeDeleteComments, CascadeDeleteTags, CascadeDeleteFavorites.

Supported API request contracts (all parameters live in the flat `input` object, and `path` uses literal templates) are:

    POST /users -> input: { username: string, email: string }
    GET /profiles -> input: { username: string }
    GET /user -> input: { username: string }
    PUT /user -> input: { username: string, newUsername?: string, email?: string }
    PUT /profiles -> input: { username: string, bio?: string, image?: string }
    POST /articles -> input: { author: string, title: string, description: string, body: string, tagList?: string[] }
    GET /articles -> input: { author?: string, favoritedBy?: string, tag?: string, viewer?: string }
    GET /articles/:slug -> input: { slug: string, viewer?: string }
    PUT /articles/:slug -> input: { slug: string, author: string, title: string, description: string, body: string }
    DELETE /articles/:slug -> input: { slug: string, author: string }
    POST /articles/:slug/comments -> input: { slug: string, author: string, body: string }
    GET /articles/:slug/comments -> input: { slug: string }
    DELETE /articles/:slug/comments/:id -> input: { slug: string, commentId: string, author: string }
    POST /articles/:slug/favorite -> input: { slug: string, user: string }
    DELETE /articles/:slug/favorite -> input: { slug: string, user: string }
    GET /tags -> input: { }

Response shapes must align with API JSON (minus auth and follow concepts). The expected shapes are:

    User response: { user: { username, email, bio, image, token: null } }
    Profile response: { profile: { username, bio, image, following: false } }
    Article response: { article: { slug, title, description, body, tagList, createdAt, updatedAt, favorited, favoritesCount, author: { username, bio, image, following: false } } }
    Articles list: { articles: Article[], articlesCount: number }
    Comment response: { comment: { id, createdAt, updatedAt, body, author: { username, bio, image, following: false } } }
    Comments list: { comments: Comment[] }
    Tags list: { tags: string[] }
    Error response: { errors: { body: [message] } }

## Change Log

2026-02-01: Initial API synchronizations ExecPlan created in `docs/plans/2026-02-01-basic-syncs.md`.
2026-02-01: Revised plan to clarify path templates, slug rules, and formatting requirements, and to align narrative sections with PLANS.md.
2026-02-01: Revised plan to split syncs into multiple modules under `syncs/app/` and add an index entry point.
2026-02-01: Updated plan to reflect tag filtering, /user endpoints, error normalization, and shared formatting helpers.

Plan Update Note (2026-02-01): Rewrote narrative sections into prose, clarified the literal path template rule, and specified a deterministic slugify algorithm to remove ambiguity and comply with PLANS.md formatting guidance.
Plan Update Note (2026-02-01): Split the sync implementation into domain modules with a single index entry point to keep files readable while preserving a unified registration surface.
Plan Update Note (2026-02-01): Recorded the tag filter addition, error normalization, and user endpoint expansion to keep the plan in sync with the implemented behavior.
