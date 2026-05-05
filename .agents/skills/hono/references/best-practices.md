# Hono Best Practices

Use this reference after the skill triggers for implementation, refactor, or review work.

## Table of Contents

- Route shape and file structure
- RPC-friendly exports
- Typed Env, Bindings, and Variables
- Middleware
- Validation and request data
- Responses, errors, and not found
- Testing
- Runtime and deployment notes
- Review red flags

## Route Shape And File Structure

Prefer direct handlers attached to route definitions:

```ts
app.get('/books/:id', (c) => {
  const id = c.req.param('id')
  return c.json({ id })
})
```

Avoid Rails-style controllers as a default because moving the handler away from the path often loses useful inference for path params and validated data. If extracted handlers are necessary, use `createFactory().createHandlers()` or carefully type the handler with the same `Env` and path context.

For larger apps, create small route modules and compose them with `app.route()`:

```ts
// routes/books.ts
import { Hono } from 'hono'

const books = new Hono()
  .get('/', (c) => c.json({ books: [] }))
  .post('/', (c) => c.json({ ok: true }, 201))
  .get('/:id', (c) => c.json({ id: c.req.param('id') }))

export default books
export type BooksApp = typeof books
```

```ts
// app.ts
import { Hono } from 'hono'
import books from './routes/books'

const app = new Hono()
app.route('/books', books)

export default app
```

Register routes before mounting modules. `app.route()` copies the current routes from the child app at that point; mounting an empty child before adding child routes can produce surprising 404s.

Use `basePath()` when a sub-app should carry its own prefix without changing the parent mount strategy. Use `route()` for most app-internal grouping. Use `mount()` when integrating another Fetch-compatible app.

## RPC-Friendly Exports

When using `hono/client`, preserve route types by chaining route definitions into a declared value and exporting its exact type:

```ts
const route = new Hono()
  .get('/health', (c) => c.json({ ok: true }))
  .post('/books', createBookValidator, (c) => {
    const input = c.req.valid('json')
    return c.json({ book: input }, 201)
  })

export type AppType = typeof route
export default route
```

Client usage should import the type and pass it to `hc`:

```ts
import { hc } from 'hono/client'
import type { AppType } from './server'

const client = hc<AppType>('/api')
```

For typed request and response helpers, prefer `InferRequestType` and `InferResponseType` from `hono/client` instead of hand-writing duplicate client types.

Global `app.onError()` or global middleware response shapes are not automatically included in RPC response inference. Use `ApplyGlobalResponse` when client types must include global error responses.

## Typed Env, Bindings, And Variables

Define Hono `Env` close to the app/factory that owns it:

```ts
type Env = {
  Bindings: {
    DATABASE_URL: string
  }
  Variables: {
    requestId: string
  }
}

const app = new Hono<Env>()
```

Use `Bindings` for runtime-provided environment values such as Cloudflare Worker bindings, secrets, KV, D1, R2, or service bindings. Access them through `c.env`.

Use `Variables` for per-request values set by middleware with `c.set()` and read with `c.var` or `c.get()`. Do not use context variables as persistence; they live only for one request.

For shared typed setup, prefer a factory:

```ts
import { createFactory } from 'hono/factory'

const factory = createFactory<Env>()

export const createApp = () => factory.createApp()

export const withRequestId = factory.createMiddleware(async (c, next) => {
  c.set('requestId', crypto.randomUUID())
  await next()
})
```

Module augmentation of Hono context maps is useful for app-wide middleware variables, but prefer local `Env` generics when only a sub-app needs the variable.

## Middleware

Middleware is onion-shaped: code before `await next()` runs on the way in, and code after it runs on the way out. Registration order is behavior.

Use built-in middleware before custom code when it fits: `cors`, `secureHeaders`, `csrf`, `jwt`, `bearerAuth`, `basicAuth`, `bodyLimit`, `etag`, `logger`, `requestId`, `timeout`, and related helpers.

Use `createMiddleware()` for reusable middleware:

```ts
import { createMiddleware } from 'hono/factory'

export const requestId = createMiddleware<{
  Variables: { requestId: string }
}>(async (c, next) => {
  c.set('requestId', crypto.randomUUID())
  await next()
})
```

Return a `Response` from middleware only when intentionally short-circuiting. Otherwise `await next()` and mutate headers/status/body only when that is the intended response flow.

Hono catches thrown errors and routes them to `app.onError()` or a generated 500 response. Do not wrap `await next()` in `try/catch/finally` just to catch downstream Hono errors unless there is a specific side effect or cleanup requirement.

For runtime-dependent middleware options, build the middleware inside an outer middleware so `c.env` is available:

```ts
app.use('*', async (c, next) => {
  const middleware = cors({ origin: c.env.CORS_ORIGIN })
  return middleware(c, next)
})
```

In Deno or JSR imports, keep middleware and Hono package versions aligned. Mixed Hono core and middleware versions can break adapter-specific APIs.

## Validation And Request Data

Prefer validator middleware over unchecked parsing in handlers. Hono supports manual `validator()` and common adapters such as `@hono/zod-validator` and `@hono/standard-validator`.

Use `@hono/standard-validator` when a project wants validator-library flexibility across Zod, Valibot, ArkType, or other Standard Schema-compatible libraries. Use `@hono/zod-validator` when the project already standardizes on Zod.

Example with Standard Schema and Zod:

```ts
import { sValidator } from '@hono/standard-validator'
import * as z from 'zod'

const createBookSchema = z.object({
  title: z.string().min(1),
})

const route = app.post('/books', sValidator('json', createBookSchema), (c) => {
  const input = c.req.valid('json')
  return c.json({ book: input }, 201)
})
```

Validate the target that matches the input source: `json`, `form`, `query`, `param`, `header`, or `cookie`. Read validated data with `c.req.valid(target)`.

Use raw `c.req.json()`, `c.req.parseBody()`, `c.req.query()`, or `c.req.param()` directly only for simple trusted cases or inside validation logic. When using `parseBody()`, remember repeated files/fields need explicit handling such as `all: true` or `[]` names depending on the desired shape.

Request header records returned from `c.req.header()` without a key have lowercase keys. Prefer `c.req.header('X-Foo')` when checking a specific header.

## Responses, Errors, And Not Found

Return Hono response helpers for clarity:

```ts
return c.json({ ok: true }, 200)
return c.text('created', 201)
return c.html('<p>Hello</p>')
```

Use `c.status()` when setting status separately improves readability, but prefer passing the status to the response helper for compact route handlers.

Use `app.onError()` for uncaught exceptions at the app or route level. Route-level error handlers take priority over parent handlers. Use `HTTPException` when code needs to intentionally throw an HTTP response-like error.

Define `app.notFound()` at the top-level app when custom 404 behavior matters. Hono's `notFound` is called from the top-level app, so sub-app-local assumptions can be wrong.

For RPC clients, model global error responses explicitly with `ApplyGlobalResponse` when client code needs typed access to global error bodies.

## Testing

Use `app.request()` for fast end-to-end style route tests:

```ts
const res = await app.request('/books', {
  method: 'POST',
  body: JSON.stringify({ title: 'Hono' }),
  headers: { 'Content-Type': 'application/json' },
})

expect(res.status).toBe(201)
expect(await res.json()).toEqual({ book: { title: 'Hono' } })
```

When code depends on `c.env`, pass mock bindings as the third argument:

```ts
const env = { DATABASE_URL: 'file:test.db' }
const res = await app.request('/health', {}, env)
```

Use the testing helper or typed `hc` client tests when validating RPC typing is part of the behavior. For Cloudflare Workers, prefer the project's Worker test pool setup when available.

Test middleware order and error behavior explicitly when middleware mutates responses, sets context variables, performs auth, or short-circuits.

## Runtime And Deployment Notes

Hono targets Web Standards first. Prefer Fetch API `Request`, `Response`, `Headers`, `URL`, `FormData`, and `ReadableStream` patterns.

Choose runtime adapters deliberately:
- Cloudflare Workers and Pages usually export the Hono app or use the Cloudflare Pages handler.
- Node.js requires the Node adapter package and server startup code.
- Bun and Deno can usually use direct Web Standard-compatible exports or runtime-specific helpers.

Avoid Node-only globals, filesystem access, mutable process-wide state, or long-lived connection assumptions in edge/runtime-portable modules.

Use `hono/tiny` only when minimizing bundle size matters and the app can live within the smaller preset constraints.

## Review Red Flags

- A route handler is typed as generic `Context` and path params no longer infer.
- A route module exports `typeof app` after imperative route mutations but expects RPC-perfect inference.
- Client types are duplicated manually instead of inferred from Hono route types.
- Middleware sets `c.set('x', value)` but `Variables` does not define `x`.
- Middleware forgets `await next()` or accidentally returns before downstream handlers run.
- Code validates JSON but then reads unvalidated `await c.req.json()` in the handler.
- Error handlers return broad untyped bodies while RPC clients assume precise error unions.
- Tests construct unrelated mocks instead of sending a real request through `app.request()`.
- Code uses runtime-specific APIs in a shared Hono module without adapter boundaries.
