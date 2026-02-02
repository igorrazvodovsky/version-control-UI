# Add RealWorld Concepts

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

Maintain this plan in accordance with `.agent/PLANS.md` at the repository root.

## Purpose / Big Picture

After this change, the repository will contain concept specifications and in-memory TypeScript implementations for the RealWorld (Conduit) domain described in `docs/resources/wysiwid.md`. A developer will be able to instantiate the concepts, call their actions, and run tests that demonstrate each concept's operational principle. This establishes the foundation needed to later wire RealWorld synchronizations without modifying concept code.

## Progress

- [x] (2026-02-01 00:00Z) Drafted ExecPlan for adding RealWorld concepts.
- [x] (2026-02-01 00:30Z) Add SSF concept specs for the RealWorld domain (User, Profile, Article, Comment, Tag, Favorite) and update API for RealWorld bootstrap needs.
- [x] (2026-02-01 00:35Z) Implement TypeScript concept classes in `concepts/` with in-memory state and query methods.
- [x] (2026-02-01 00:55Z) Add Deno tests for each concept's operational principle in `concepts/test/`.
- [x] Validate by running concept tests and existing engine tests.
- [x] (2026-02-01 00:57Z) Update `README.md` with concept list and test commands.

## Surprises & Discoveries

...

## Decision Log

- Decision: Use SSF object types (Users, Articles, etc.) rather than the paper's type parameters.
  Rationale: The repository's SSF grammar expects object types in set declarations, and the existing examples use concrete object types. This keeps specs valid and consistent.
  Date/Author: 2026-02-01 / assistant
- Decision: Standardize on `API` as the bootstrap concept (no `Web` concept).
  Rationale: User request; keep naming consistent with the existing repository and extend `API` to cover RealWorld bootstrap needs.
  Date/Author: 2026-02-01 / assistant
- Decision: Implement all concepts with in-memory Maps/Sets and simple validation.
  Rationale: This matches the repository's educational focus, keeps concepts independent, and is sufficient for validating operational principles.
  Date/Author: 2026-02-01 / assistant
- Decision: Implement `API.format` as a passthrough that returns `{ output: payload }`.
  Rationale: Formatting rules belong in synchronizations; keeping `format` simple avoids cross-concept coupling.
  Date/Author: 2026-02-01 / assistant

## Outcomes & Retrospective

Specs, implementations, tests, and README updates landed for the reduced RealWorld scope (API, User, Profile, Article, Comment, Tag, Favorite). Validation is pending until Deno is available.

## Context and Orientation

This repository currently contains a single concept spec in `specs/API.concept` and no `concepts/` directory. The concept design rules in `AGENTS.md` require one TypeScript class per concept in `concepts/`, no cross-imports between concepts, and query methods prefixed with `_` that return arrays. Concept specifications live in `specs/` and must use the SSF syntax described in `specs/AGENTS.md`. The engine and example syncs live in `engine/` and `example.ts`, but this plan only adds concepts and tests.

In this plan, all object identifiers (Users, Articles, etc.) are represented as strings in TypeScript. Timestamps are stored as ISO 8601 strings via `new Date().toISOString()`. The `Json` type used in the API concept is treated as `unknown` in TypeScript.

## Plan of Work

Milestone 1 creates SSF concept specifications for the RealWorld domain based on the case study described in `docs/resources/wysiwid.md`. The User and Profile specs are adapted directly from Appendix B and Section 4 of the paper into SSF format, while Article, Comment, Tag, Favorite, and API are defined or updated to cover the RealWorld features described (articles, comments, tags, favorites, and HTTP bootstrap). Each spec includes action overloads for success and error paths, plus at least one query method.

Milestone 2 implements each concept as a standalone TypeScript class in `concepts/`. Each class uses in-memory Maps/Sets, validates uniqueness and existence, and returns `{ error: string }` for invalid actions. Query methods return arrays and never mutate state. No concept imports another concept.

Milestone 3 adds Deno tests in `concepts/test/` that assert each operational principle. Each test constructs the concept, performs the sequence described in the operational principle, and queries state to confirm the expected outcome. The milestone also updates `README.md` to list the new concepts and the commands to run concept tests.

Each milestone is independently verifiable: specs exist and are readable (Milestone 1), concept actions are callable and return expected outputs (Milestone 2), and tests pass (Milestone 3).

## Concrete Steps

From `/Users/igors.razvodovskis/Development/ticket-less-4-1`, create the concept and test directories if they do not exist:

    mkdir -p concepts concepts/test

Create the following spec files with the exact contents listed in the Interfaces and Dependencies section: `specs/User.concept`, `specs/Profile.concept`, `specs/Article.concept`, `specs/Comment.concept`, `specs/Tag.concept`, and `specs/Favorite.concept`. Update `specs/API.concept` per the API section below.

Create concept implementation files in `concepts/` with the class names and method signatures listed below. Each file should export a single class named `${Name}Concept` and no other concepts. Use Maps/Sets for storage and keep methods synchronous.

Create Deno test files in `concepts/test/` named `user.test.ts`, `profile.test.ts`, `article.test.ts`, `comment.test.ts`, `tag.test.ts`, `favorite.test.ts`, and `api.test.ts`. Each test should import the concept class, call the actions from the operational principle, and assert the expected query results.

Run concept tests:

    deno test concepts/test

Expected output should show all concept tests passing, for example:

    running 7 tests
    test user operational principle ... ok
    test profile operational principle ... ok
    ...
    test api operational principle ... ok
    ok | 7 passed | 0 failed

Re-run engine tests to ensure no regressions:

    deno run -A engine/test/run.ts

Expected output should still show all engine tests passing.

Update `README.md` with a short list of the new concepts and the two test commands.

## Validation and Acceptance

The change is accepted when all new concept specs exist under `specs/` and each has a matching class in `concepts/`. Running `deno test concepts/test` should pass all tests that correspond to the operational principles below. Running `deno run -A engine/test/run.ts` should still pass all engine tests.

A human should be able to open any new concept file and see its state, actions, and queries align with its spec, and run the tests to observe the expected behavior.

## Idempotence and Recovery

These steps are additive and safe to repeat. `mkdir -p` is idempotent. Recreating spec or concept files simply overwrites them with the plan's canonical content. If a test fails, fix the concept implementation and re-run `deno test concepts/test`. If you need to back out, remove the added files from `specs/`, `concepts/`, and `concepts/test/` and revert `README.md`.

## Artifacts and Notes

Keep timestamps and token strings opaque in tests; assert relationships and presence rather than exact values. For example, verify that `createdAt` is set and that `updatedAt` changes on update.

Use the local assertion helpers from `engine/test/helpers.ts` (for example, `assertEqual` and `assertDeepEqual`) to avoid external dependencies.

## Interfaces and Dependencies

Each concept below includes the required spec content and TypeScript interface. Treat all identifier types (Users, Articles, etc.) as `string` in TypeScript.

### User

Create `specs/User.concept` with:

    <concept_spec>

    concept User

    purpose
        to associate identifying information with users

    state
        a set of Users with
            a name String
            an email String

    actions
        register (user: Users, name: String, email: String) : (user: Users)
            associate user with users
            associate name and email unique + valid
            return the user reference
        register (user: Users, name: String, email: String) : (error: String)
            if either name/email is invalid or not unique
            return the error description
        update (user: Users, name: String) : (user: Users)
            if name is unique, update user's name
            return the user reference
        update (user: Users, name: String) : (error: String)
            if name is not-unique, describe error
            return the error description
        update (user: Users, email: String) : (user: Users)
            if email is unique and valid, update user's email
            return the user reference
        update (user: Users, email: String) : (error: String)
            if email is not-unique or invalid
            return the error description

    queries
        _get (user: Users) : (user: Users, name: String, email: String)
            fetch a user's identifying info
        _getByName (name: String) : (user: Users)
            fetch user by name
        _getByEmail (email: String) : (user: Users)
            fetch user by email

    operational principle
        after register (user: u1, name: "xavier", email: "x@a.com") : (user: u1)
        and update (user: u1, name: "xavier2") : (user: u1)
        then _getByName (name: "xavier2") shows user u1

    </concept_spec>

Implement `concepts/User.ts` exporting `UserConcept` with:

    register(input: { user: string; name: string; email: string }): { user: string } | { error: string }
    update(input: { user: string; name: string } | { user: string; email: string }): { user: string } | { error: string }
    _get(input: { user: string }): { user: string; name: string; email: string }[]
    _getByName(input: { name: string }): { user: string }[]
    _getByEmail(input: { email: string }): { user: string }[]

### Profile

Create `specs/Profile.concept` with:

    <concept_spec>

    concept Profile

    purpose
        to associate descriptive information with users

    state
        a set of Profiles with
            a user Users
            a bio String
            an image String

    actions
        register (profile: Profiles, user: Users) : (profile: Profiles)
            add profile to profiles
            associate user with profile
            add a default blank bio and image to profile
            return profile
        update (profile: Profiles, bio: String) : (profile: Profiles)
            update profile with bio
            return profile
        update (profile: Profiles, image: String) : (profile: Profiles)
            if image is valid (URL, base64, etc.)
            update profile with image
            return profile
        update (profile: Profiles, image: String) : (error: String)
            if image is invalid, describe error
            return error

    queries
        _get (profile: Profiles) : (profile: Profiles, user: Users, bio: String, image: String)
            fetch a profile
        _getByUser (user: Users) : (profile: Profiles)
            fetch profile by user

    operational principle
        after register (profile: p1, user: u1) : (profile: p1)
        and update (profile: p1, bio: "Hello world") : (profile: p1)
        and update (profile: p1, image: "pic.jpg") : (profile: p1)
        then _get (profile: p1) shows bio "Hello world" and image "pic.jpg"

    </concept_spec>

Implement `concepts/Profile.ts` exporting `ProfileConcept` with:

    register(input: { profile: string; user: string }): { profile: string } | { error: string }
    update(input: { profile: string; bio: string } | { profile: string; image: string }): { profile: string } | { error: string }
    _get(input: { profile: string }): { profile: string; user: string; bio: string; image: string }[]
    _getByUser(input: { user: string }): { profile: string }[]

### Article

Create `specs/Article.concept` with:

    <concept_spec>

    concept Article

    purpose
        to create and manage articles authored by users

    state
        a set of Articles with
            a slug String
            a title String
            a description String
            a body String
            an author Users
            a createdAt DateTime
            an updatedAt DateTime

    actions
        create (article: Articles, slug: String, title: String, description: String, body: String, author: Users) : (article: Articles)
            add article to articles
            store fields and timestamps
            return article
        create (article: Articles, slug: String, title: String, description: String, body: String, author: Users) : (error: String)
            if slug is not unique or fields invalid, return error
        update (article: Articles, title: String, description: String, body: String) : (article: Articles)
            update title/description/body and updatedAt
            return article
        update (article: Articles, title: String, description: String, body: String) : (error: String)
            if article does not exist, return error
        delete (article: Articles) : (article: Articles)
            remove article
            return article
        delete (article: Articles) : (error: String)
            if article does not exist, return error

    queries
        _get (article: Articles) : (article: Articles, slug: String, title: String, description: String, body: String, author: Users, createdAt: DateTime, updatedAt: DateTime)
            fetch article
        _getBySlug (slug: String) : (article: Articles)
            lookup by slug
        _getByAuthor (author: Users) : (article: Articles)
            list articles by author
        _list () : (article: Articles)
            list all articles

    operational principle
        after create (article: a1, slug: "hello", title: "Hello", description: "Desc", body: "Body", author: u1) : (article: a1)
        and update (article: a1, title: "Hello 2", description: "Desc 2", body: "Body 2") : (article: a1)
        then _get (article: a1) shows title "Hello 2"

    </concept_spec>

Implement `concepts/Article.ts` exporting `ArticleConcept` with:

    create(input: { article: string; slug: string; title: string; description: string; body: string; author: string }): { article: string } | { error: string }
    update(input: { article: string; title: string; description: string; body: string }): { article: string } | { error: string }
    delete(input: { article: string }): { article: string } | { error: string }
    _get(input: { article: string }): { article: string; slug: string; title: string; description: string; body: string; author: string; createdAt: string; updatedAt: string }[]
    _getBySlug(input: { slug: string }): { article: string }[]
    _getByAuthor(input: { author: string }): { article: string }[]
    _list(_: Record<PropertyKey, never>): { article: string }[]

### Comment

Create `specs/Comment.concept` with:

    <concept_spec>

    concept Comment

    purpose
        to associate authored comments with a target item

    state
        a set of Comments with
            a target String
            an author Users
            a body String
            a createdAt DateTime
            an updatedAt DateTime

    actions
        create (comment: Comments, target: String, author: Users, body: String) : (comment: Comments)
            add comment to comments
            store fields and timestamps
            return comment
        create (comment: Comments, target: String, author: Users, body: String) : (error: String)
            if comment already exists or fields invalid, return error
        update (comment: Comments, body: String) : (comment: Comments)
            update body and updatedAt
            return comment
        update (comment: Comments, body: String) : (error: String)
            if comment does not exist, return error
        delete (comment: Comments) : (comment: Comments)
            remove comment
            return comment
        delete (comment: Comments) : (error: String)
            if comment does not exist, return error

    queries
        _get (comment: Comments) : (comment: Comments, target: String, author: Users, body: String)
            fetch comment
        _getByTarget (target: String) : (comment: Comments)
            list comments for target
        _getByAuthor (author: Users) : (comment: Comments)
            list comments by author

    operational principle
        after create (comment: c1, target: "a1", author: u1, body: "hi") : (comment: c1)
        and update (comment: c1, body: "hello") : (comment: c1)
        then _get (comment: c1) shows body "hello"

    </concept_spec>

Implement `concepts/Comment.ts` exporting `CommentConcept` with:

    create(input: { comment: string; target: string; author: string; body: string }): { comment: string } | { error: string }
    update(input: { comment: string; body: string }): { comment: string } | { error: string }
    delete(input: { comment: string }): { comment: string } | { error: string }
    _get(input: { comment: string }): { comment: string; target: string; author: string; body: string }[]
    _getByTarget(input: { target: string }): { comment: string }[]
    _getByAuthor(input: { author: string }): { comment: string }[]

### Tag

Create `specs/Tag.concept` with:

    <concept_spec>

    concept Tag

    purpose
        to associate tags with target items

    state
        a set of Taggings with
            a target String
            a tag String

    actions
        add (target: String, tag: String) : (target: String)
            associate tag with target
            return target
        add (target: String, tag: String) : (error: String)
            if tag already associated, return error
        remove (target: String, tag: String) : (target: String)
            remove association
            return target
        remove (target: String, tag: String) : (error: String)
            if association missing, return error

    queries
        _getByTarget (target: String) : (tag: String)
            list tags for target
        _getAll () : (tag: String)
            list all tags in use

    operational principle
        after add (target: "a1", tag: "news") : (target: "a1")
        then _getByTarget (target: "a1") includes tag "news"

    </concept_spec>

Implement `concepts/Tag.ts` exporting `TagConcept` with:

    add(input: { target: string; tag: string }): { target: string } | { error: string }
    remove(input: { target: string; tag: string }): { target: string } | { error: string }
    _getByTarget(input: { target: string }): { tag: string }[]
    _getAll(_: Record<PropertyKey, never>): { tag: string }[]

### Favorite

Create `specs/Favorite.concept` with:

    <concept_spec>

    concept Favorite

    purpose
        to allow users to favorite target items

    state
        a set of Favorites with
            a user Users
            a target String

    actions
        favorite (user: Users, target: String) : (user: Users, target: String)
            add favorite
            return user and target
        favorite (user: Users, target: String) : (error: String)
            if already favorited, return error
        unfavorite (user: Users, target: String) : (user: Users, target: String)
            remove favorite
            return user and target
        unfavorite (user: Users, target: String) : (error: String)
            if not favorited, return error

    queries
        _getByUser (user: Users) : (target: String)
            list targets favorited by user
        _getByTarget (target: String) : (user: Users)
            list users who favorited target
        _countByTarget (target: String) : (count: Number)
            count favorites for target
        _isFavorited (user: Users, target: String) : (favorited: Flag)
            return true if user favorited target

    operational principle
        after favorite (user: u1, target: "a1") : (user: u1, target: "a1")
        then _countByTarget (target: "a1") shows count 1

    </concept_spec>

Implement `concepts/Favorite.ts` exporting `FavoriteConcept` with:

    favorite(input: { user: string; target: string }): { user: string; target: string } | { error: string }
    unfavorite(input: { user: string; target: string }): { user: string; target: string } | { error: string }
    _getByUser(input: { user: string }): { target: string }[]
    _getByTarget(input: { target: string }): { user: string }[]
    _countByTarget(input: { target: string }): { count: number }[]
    _isFavorited(input: { user: string; target: string }): { favorited: boolean }[]

### API

Update `specs/API.concept` with:

    <concept_spec>

    concept API

    purpose
        to bootstrap HTTP-like requests and capture responses

    state
        a set of Requests with
            a request String
            a method String
            a path String
            a input Json
            a output Json
            a code Number

    actions
        request (request: String, method: String, path: String, input: Json) : (request: String)
            register an incoming request to start a new flow
            return request
        response (request: String, output: Json, code: Number) : (request: String)
            record the output that should be returned to the caller
            return request
        format (type: String, payload: Json) : (output: Json)
            format a response payload for a given type
            return the formatted output

    queries
        _get (request: String) : (request: String, method: String, path: String, input: Json, output: Json, code: Number)
            fetch a stored request with output

    operational principle
        after request (request: r1, method: "GET", path: "/health", input: {}) : (request: r1)
        and response (request: r1, output: { ok: true }, code: 200) : (request: r1)
        then _get (request: r1) shows output { ok: true }

    </concept_spec>

Implement `concepts/API.ts` exporting `APIConcept` with:

    request(input: { request: string; method: string; path: string; input: unknown }): { request: string }
    response(input: { request: string; output: unknown; code: number }): { request: string } | { error: string }
    format(input: { type: string; payload: unknown }): { output: unknown }
    _get(input: { request: string }): { request: string; method: string; path: string; input: unknown; output: unknown; code: number }[]

## Change Log

2026-02-01: Initial plan written and saved to `docs/plans/realworld-concepts.md` at user request.
2026-02-01: Updated plan to standardize on API as the bootstrap concept and removed Web references per user request.
2026-02-01: Removed JWT, Password, and Follow from scope per user request.
