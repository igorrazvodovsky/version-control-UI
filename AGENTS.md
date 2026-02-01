# Plans

When writing complex features or significant refactors, use an ExecPlan (as described in .agent/PLANS.md) from design to implementation.

# Codex instructions

Sections marked "Always apply" should be followed for all work in this repository. The
"Reference" section is background material to consult when working on concept
state specifications.

## Always apply: General guidelines

General:

- You are encouraged to work with the application in phases, as each piece is
  modular: concept specs contain sufficient context to (re)generate independent
  implementations, and synchronizations can be generated without knowledge of
  concept implementation details, and refer solely to action signatures in their
  specification.
- You should not need to inspect inside the `engine/` folder unless specifically
  to debug a tricky issue or if you generate behavior that does not align with
  expectations according to your understanding of the concept + synchronization
  structure, and can prove so with tests.

Concept implementations should:

- Never import one another, and should run fully independently.
- Be able to be tested individually, and carry a canonical test modeled after
  their "operational principle".
- Maintain a 1-1 correspondence with their specifications located in `specs/`.
  If there are concept specs found without a corresponding implementation, you
  should first generate and test an implementation.

Synchronizations should:

- Be written concisely, with direct reference to the concept action, such as
  `User.register` as the first argument in the `actions` pattern lists.
- Typing should work after concepts are instrumented, and the baseline concept
  `User` is an instance that has been `instrument`ed.
- Use `.query` on `frames: Frames` in the `where` clause function as much as
  possible to maintain readibility and clarity. When new bindings are provided
  by `query`, the typing should update to the next chained method's version of
  `Frames`.
- Only query functions can be used with `.query`, meaning that they start with
  an underscore `_`.
- For usage of `.query`, remember that the third parameter, the output pattern,
  will almost always expect to have a variable (deconstructed from `Vars`)
  symbol object as the value. This allows the query to hydrate the frame with
  that key, and types will work if you respect this pattern.
- All indexing on frame objects in the `where` should only index by a var
  declared in the synchronization function inputs, and thus look something like
  `$[user]`, and not `$.user` since that is a string key.
- Use standard `Array` functions over manual `for` iteration, and maintain a
  functional-style approach for readibility.
- `when` patterns are currently flat, meaning that you should not pattern match
  with nested objects, and instead flatten out parameters and bind them with the
  vars available.
- This is also true for `then` patterns, meaning that you should transform,
  format, and bind any desired output in the `where` clause to the appropriate
  variable on the frame, and have simple usage of these declared variables in
  the output parameters.

## Always apply: Building applications with concept design

This repository is an application meant to be built according to the principles
of concept design, a new approach to modularity first introduced in Daniel
Jackson's "The Essence of Software". This approach describes a way to build
software in terms of _concepts_, which describe behavior that captures a
familiar unit of functionality with a single purpose. These are then composed
together using _synchronizations_, which are declarative statements that
describe how actions of different concepts are composed.

### Concepts

A concept is a highly-reusable and standalone service designed to fulfill a
single purpose. Unlike microservices or traditional OOP classes, concepts
**must** remain independent from one another and cannot import or reference
other concepts. They can be specified using a simple specification language and
stored as `.concept` files, such as:

```
<concept_spec>

concept User

purpose
    to associate identifying information with individuals

state
    a set of Users with
        a name String
        an email String

actions
    register (user: Users, name: String, email: String) : (user: Users)
        associate user with users
        associate name and email if both unique and valid
        return the user reference
    register (user: Users, name: String, email: String) : (error: String)
        if either name or email is invalid or not unique, describe error
        return the error description

    update (user: Users, name: String) : (user: Users)
        if name is unique, update user's name
        return the user reference
    update (user: Users, name: String) : (error: String)
        if name is not-unique, describe error
        return the error description

    update (user: Users, email: String) : (user: Users)
        if email is unique and valid, update id's email
        return the user reference
    update (user: Users, email: String) : (error: String)
        if email is not-unique or invalid, describe error
        return the error description

operational principle
    after register () : (user: x) and update (name: "xavier") : (user: x)
    for any user u such that u's name is "xavier", u must be x

</concept_spec>
```

- `concept`: A unique name for the concept.
- `purpose`: A carefully crafted description of the concept's purpose and what
  problem it solves.
- `state`: A specification of the shape of the state the concept holds. Refer to
  the Simple State Form (SSF) reference below for the details of this
  specification language.
- `actions`: Descriptions of actions, which are how the concept evolves its
  state, and the only way to perform side-effects and behavior. The lines at the
  first level of indentation are action signatures, and describe the inputs
  (before the `:`) and the outputs (after the `:`) as a map from names to types.
  Therefore, every concept implementation standardizes on exactly one input
  argument as a map/record/object (depending on the language) with named keys to
  values of the specified type. Generic "object" types like `Users` are _not_
  complex references to objects, but all simply IDs, usually UUIDs as strings.
  The text below each signature at the next level of indentation are vernacular
  descriptions of the effect that the action has, and usually describe what to
  expect from the return values.
- `operational principle`: A description of a scenario that demonstrates how the
  concept can fulfill its purpose through its actions and state. It need not
  completely cover all actions/state, but instead is designed to capture the
  essence of why this particular design for the concept helps fulfill the
  purpose. In this case, the scenario describes how the related state of the
  concept, such as the `name` field, helps uniquely identify the same
  individual.

#### Designing concepts

The `User` concept example above highlights a number of key considerations when
designing concepts:

- **Single, focused purpose:** A typical User service or class might contain a
  lot more kinds of information pertaining to users, such as passwords
  (`Authentication`), bio or avatar images (`Profile`), or any other number of
  user related concerns. As pointed out in the parentheses in the previous
  sentence, these concerns are actually better modeled as separate concepts.
  This is motivated by the fact that every application can have different
  requirements: some apps might not have authentication at all, while some may
  lack certain kinds of `Profile` related information like bios. If your `User`
  class/service/concept models such information, it is thus inherently less
  modular and cannot be directly shared. Instead, this design for `User` focuses
  solely on the idea that every application including it needs a simple mapping
  from user identifiers to uniquely identifying fields like usernames or email
  addresses. An additional subtlety is that the `register` action actually takes
  in the unique ID (the `user` argument), instead of arbitrarily generating its
  own scheme. This further modularizes this concept, and allows it to support
  any set of applications with different unique identification schemes.
- **Actions that thoroughly describe all possible outcomes:** A unique feature
  of the action descriptions above is that they overload (on the same action
  name) for all the possible kinds of transitions and arguments. Since all
  actions are simply functions that take an input map and output a map, the
  shape found in each signature is exactly the shape of the map that you can
  expect. This explicitly spells out the different kinds of arguments that an
  `update` method can handle, as well as specifying what can happen as a result.
- **Errors are not special:** Following from the explicit transitions of the
  previous point, all errors are simply just another pattern specified by the
  concept specification. Here, we use the convention that if an output map
  contains the `error:` key, then an error is considered to have happened. This
  is not special, and allows us to model any number of conditions, and match on
  the for the purposes of processing errors or unusual outcomes, as we will see
  in the synchronizations.

### Synchronizations

The idea of purely independent modules serving single purposes is both appealing
and very old - why aren't more applications built in a similar fashion? As with
any application of non-trivial size, structures for software today inevitably
result in complicated dependency structures, build systems, and other layers of
abstraction that entangle otherwise independent pieces. _Synchronizations_ are a
new mechanism for composition that enable a very granular and incremental way to
specify composite behavior between completely independent components like
concepts. The tradeoff is the need to explicitly specify all conditions and
paths of execution, but you gain the ability to modify exactly the behavior you
are targeting without affecting the integrity of the rest of the system.

Consider three very simple concepts:

- `Counter`: has the actions `increment {}` and `decrement {}`, and stores a
  single state `count`.
- `Button`: has the action `clicked {kind: string}` that is simply a proxy for a
  button clicked of the kind `kind`.
- `Notification`: has the action `notify {message: string}`, which sends a
  notification with the specified message.

What if we wanted to specify the following two behaviors:

- **when** a `Button` of the `kind: "increment_counter"` is `clicked`, **then**
  the `Counter` should `increment`
- **when** that same `Button` is clicked, _and_ `Counter.increment` happens,
  **where** `count` is above 10, **then** `Notify.notification` with the message
  that we reached 10.

The synchronization language allows us to model these two behaviors exactly as
we have written them as the following two granular synchronizations:

```
<sync>

sync ButtonIncrement
when
    Button.clicked (kind: "increment_counter") : ()
then
    Counter.increment ()

sync NotifyWhenReachTen
when
    Button.clicked (kind: "increment_counter") : ()
    Counter.increment () : ()
where
    Counter._getCount () : (count: count)
    count > 10
then
    Notification.notify (message: "Reached 10")

</sync>
```

Each keyword refers to:

- `sync`: A unique identifier for the sync.
- `when`: A number of actions and their input/arguments to match. You can match
  both literals as above, as well as variables, which are just symbols like
  `count`. The left hand side is the same as the keys described in the actions,
  while the right hand side allows you to specify a different name (or the same)
  for the variable.
- `where`: An optional clause that allows further processing and filtering of
  results. You may only refer to query functions of concepts, indicated by the
  mandatory starting underscore `_`, and use the input/output arguments to map
  to variables to bind and perform logic on.
- `then`: A number of actions that, if there are variables, are bound based on
  the declarative logic throughout, and which form new action invocations
  exactly of the shape specified.

#### Designing synchronizations

Synchronizations have a number of interesting properties that enable their
granularity and incrementality:

- **Conditioning on multiple actions:** Unlike many systems with graphical
  pipeline builders and other approaches that allow you to chain actions
  together, synchronizations allow you to condition on **multiple** actions
  which share an inherent notion of **flow**. In this case, you might wonder why
  the notification needs to condition on both the button click and the counter
  incrementing, where just one or the other might suffice. Specifying both
  allows you to robustly condition on the idea that we'd like to notify only
  when a counter has been successfully incremented _because_ of the
  "increment_counter" button. This is robust even if our application evolves
  such that `ButtonIncrement` is updated, and we may limit the number of times
  you can press a button: conditioning on only the click would still result in a
  notification. On the other hand, conditioning only on the increment would
  generate extra notifications if there were other ways to increment the
  counter.
- **The idea of flow:** But how are action occurrences grouped together? In a
  large application, we can imagine there being a ton of buttons clicked and
  counters incremented - which ones are grouped? **Flow** is the idea that
  actions that directly caused other actions through synchronizations all share
  the same unique **flow token**, a UUID that groups all such actions to
  consider for the `when` clause. A new **flow** is initiated whenever an
  external force (like a user) causes an action, and all subsequent automatic
  synchronizations will propagate that flow token. You can think of it like a
  logical grouping or scope of execution, and an explicit way to model a large
  lexical scope in a block of code in a more traditional programming language.
- **Separation of read and write:** Synchronizations strongly separate
  side-effecting actions from pure computations (like querying and filtering) by
  construction: any query functions in the `where` clause must be pure, and all
  side-effects are isolated into the invocations constructed by the `then`
  clause with exactly the specified shape. Note that the `when` clause will
  always have action patterns that have both input and output (denoted by the
  two records around the `:`), since it talks about conditioning on action
  **completions**, while the `then` clause will always only have **invocations**
  with only the shape of an input (and thus no `:` and only one record).

### Entry point: bootstrap concepts

If an application is made entirely of concepts and synchronizations, and
therefore composed in a horizontal and flat way, then what is the entry point? A
concept can be considered a **bootstrap concept** if it is intended to be called
by an external actor, such as a user, or from an otherwise independent frontend
application treating the entire backend as a single opaque API, and without
knowledge that it is otherwise powered by concepts and synchronizations. For the
latter, an example concept might be:

```
<concept_spec>

concept API
purpose
    to bootstrap generic API requests and allow asynchronous responses
state
    a set of Requests with
        a callback Function
        an Input set of Parameters
        an Output set of Parameters
    a set of Parameters with
        ...any arguments...
actions
    request (callback: Function, ...any input arguments...) : (request: Requests)
        generate a fresh request associated with the input arguments
        register the callback with the request ID
        return the request ID
    response (request: Requests, ...any output arguments...) : (request: Requests)
        save the output arguments, and await the callback to give them to the requester
        return the request ID

</concept_spec>
```

This concept allows synchronizations against the initial `request`, with any
shape of arguments, and usually with explicit modeling in the parameters like
`method: "user_registration"` or `path: "/api/users", method: "GET"` to pattern
match on the intended route. This can cascade a series of actions, and keeping
this `request` pattern as one of the `when` conditions allows for a route
specific set of synchronizations to model behavior. Finally, an `API.response`
in a `then` allows for giving control back to the calling party.

There can be many other ways in which such a bootstrap concept enables external
interaction, but this pattern is the simplest for establishing a classic
backend/frontend kind of separation at the API level.

## Always apply: Implementing concepts

- Use TypeScript
- Each concept is a single class with the name `${name}Concept`, and should be
  contained in a single .ts file under the directory `./concepts`
- All actions must take exactly one argument, and return one argument
- The shape of the input and output arguments are described in the corresponding
  concept specification in the form of `key: type`
- The names of actions must match up exactly with those in the specification
- For the purposes of the `where` clause in the synchronizations, and for
  generally querying state, each concept may also have query functions
- Query functions MUST start with the underscore character `_` to distinguish
  them from actions
- Query functions MUST NOT update state or perform side-effects
- Query functions will also take as input a single argument with named keys, but
  instead **return an array** of such arguments corresponding to the names of
  the desired state. This is because query functions enable synchronizations in
  the `where` clause to e.g. declaratively find all comments related to a post,
  where each comment becomes a new frame for the purposes of the `then` clause,
  such as deleting all comments of a post when the post is deleted.
- In general, if a concept is well behaving, you should not need to update it
  except to add query functions for the purposes of accessing state

## Always apply: Implementing synchronizations

Instead of relying on a custom synchronization language and parser, the current
engine provides a TypeScript-native approach to specifying synchronizations. A
complete and functional example of this can be found in:

`example.ts`

After creating concept classes, you can initialize the Sync engine and
instrument concepts as follows:

```ts
// Create new Sync engine
const Sync = new SyncConcept();

// Register concepts
const concepts = {
    Button: new ButtonConcept(),
    Counter: new CounterConcept(),
    Notification: new NotificationConcept(),
};

// All concepts must be instrumented to be reactive and used in a sync
const { Button, Counter, Notification } = Sync.instrument(concepts);
```

The original, unmodified concepts are available as (e.g.) `concepts.Button`,
while the destructuring allows for the instrumented version `Button` to both
participate in syncs, as well as feature as a fully reactive concept. Calling
`Button.clicked({ kind: "increment_counter" })`, for example, will trigger all
registered synchronizations.

The synchronizations shown previously in the specification language can be
written in TypeScript as follows:

```ts
// Each sync is a function that returns a declarative synchronization
const ButtonIncrement = ({}: Vars) => ({
    when: actions(
        [Button.clicked, { kind: "increment_counter" }, {}],
    ),
    then: actions(
        [Counter.increment, {}],
    ),
});
```

Each synchronization is a simple function that returns an object with the
appropriate keys, minimally containing `when` and `then`. The `actions` helper
function enables a shorthand specification of action patterns as an array, where
the first argument is the instrumented action, the second the input pattern, and
in the case of the `when` clause, the third is the output pattern.
Synchronizations may additionally have a `where` clause and specify variables:

```ts
// Each sync can declare the used variables by destructuring the input vars object
const NotifyWhenReachTen = ({ count }: Vars) => ({
    when: actions(
        [Button.clicked, { kind: "increment_counter" }, {}],
        [Counter.increment, {}, {}],
    ),
    where: (frames: Frames): Frames => {
        return frames
            .query(Counter._getCount, {}, { count })
            .filter(($) => {
                return $[count] > 10;
            });
    },
    then: actions(
        [Notification.notify, { message: "Reached 10" }],
    ),
});
```

Each synchronization function actually receives a special object that you can
destructure arbitrarily to receive variables to use in your patterns. In this
case, we destructure `count` to use it as a variable, which can be employed on
the right-hand side of input/output patterns to indicate an open binding. The
`where` clause, unlike the other two, is itself also a function that simply
takes in a set of `Frames` and returns a set of `Frames`. This refers to the
idea that each `Frame` is a `Record<symbol, unknown>` describing the current
bindings of the current frame, where each `Frame` that makes it through to the
`then` clause corresponds 1-to-1 with calling all actions in the `then` with
those bindings.

`Frames` is simply a small extension of the `Array` class, and all of the
standard methods and iterator functions can be applied to it. It additionally
carries the `.query` method which enables query functions on concepts to receive
certain inputs and produce outputs that enrich the frame. In this basic `where`
clause it enhances every frame with a `count` binding. In a slightly more
advanced example, something like:

```
.query(Comment._getByTarget, {target: post}, {comment})
```

says to lookup the `post` binding for the frame, and query the `Comment` concept
for all comments associated with a `target` of that `post`. Note that post as a
variable refers to that unique symbol for binding, and that the role of the
input pattern is simply to match our current binding name to the generic
accepted parameter name of `Comment._getByTarget`: since concepts are highly
modular, we encourage general names like `target` to enable commenting on many
kinds of things, and this pattern provides the way to map the two names. In this
case we are okay with binding the `comment` output with a symbol of the same
name, and use JavaScript's destructuring shorthand to indicate this. For such a
pattern, we would expect there to be at least `({post, comment, ...}: Vars)` as
the input signature for the containing synchronization function.

All such query functions always return an array of such frames, specifically to
allow for this kind of behavior: imagine the containing synchronization was to
delete all comments associated with a specific post when that post is deleted.
Despite one frame and a single `post` binding coming in from the `when`, this
query would enable exactly as many frames, one each with a different `comment`
id bound, to execute in the `then` and cascade all the deletes, without manually
writing a `for` loop or other looping construct.

Finally, we can register syncs simply with:

```ts
const syncs = { ButtonIncrement, NotifyWhenReachTen };
Sync.register(syncs);
```

where the keys (having the same name in this case as their declaration) are the
unique keys used to register them in the engine. To utilize the engine and
import the minimal amount of types needed to specify each piece, you can use the
following import:

```ts
import {
    actions,
    Frames,
    SyncConcept,
    Vars,
} from "./engine/mod.ts";
```

## Always apply: Platform choices

The following rules establish choices for the runtime, framework, or any
additional build steps.

- Utilize the Deno runtime for simplified tooling and imports. Prefer to use
  generic imports without version numbers to reliably import libraries.
- To the greatest extent possible, only implement application logic as
  synchronizations, and organize them under the `syncs/` folder. You may use
  whatever sub-file/folder structure that helps keep things clear, but remember
  to register all synchronizations with the same engine.

## Always apply: Debugging

The engine contains logging logic to help trace issues, and which action is
occuring with what inputs and outputs. After initializing an engine, simply set:

```ts
const Sync = new SyncConcept();
Sync.logging = Logging.TRACE; // options are OFF, TRACE, and VERBOSE
```

`TRACE` gives a simple summary of every action that happened along with their
inputs and outputs, while `VERBOSE` dives deep and gives a complete account of
provenance and the processing of each record, and which synchronizations
matched.

In general, the concept design architecture affords reasoning piecemeal about
the entire system, meaning that you should be able to test concepts
individually, test synchronizations independently, and the frontend on its own.
Use output logs from `TRACE` level logging to find out if actions are occurring
as expected or to debug synchronizations (you could build a small script or edit
the logging behavior to pipe this information in a better way), and level
`VERBOSE` when absolutely necessary and you might be convinced that there is
something wrong with the engine, or a very subtle bug in synchronization
formulation.

## Reference

- Simple State Form (SSF) details for `specs/*.concept` live in `specs/AGENTS.md`.
