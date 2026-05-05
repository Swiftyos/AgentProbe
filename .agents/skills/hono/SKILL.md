---
name: hono
description: Hono best-practice guidance for building, refactoring, reviewing, and testing TypeScript Hono apps, APIs, routers, middleware, validation, runtime adapters, error handling, and RPC-friendly clients. Use when working with Hono route handlers, app.route modules, hono/factory, hono/client hc, HonoRequest or Context APIs, Hono middleware, Cloudflare Workers or other Hono runtimes, or Hono test helpers.
---

# Hono

## Operating Mode

Use this skill to keep Hono code small, type-safe, runtime-portable, and aligned with official Hono patterns.

Before changing code:
- Inspect the installed Hono version, package manager, runtime adapter, existing route layout, validation library, and test setup.
- Read Hono types from `node_modules` when unsure about an API. Do not guess external API types.
- Prefer existing project conventions over introducing a new Hono architecture.
- If the user asks for the latest behavior or an unfamiliar Hono API, check the official docs first.

## Best-Practice Defaults

Read `references/best-practices.md` when implementing or reviewing non-trivial Hono code.

Default to these choices:
- Define route handlers inline after concrete path definitions so path params, validation targets, and response types infer correctly.
- Split larger apps with small `new Hono()` route modules and mount them with `app.route()`.
- For RPC/client typing, chain route definitions into a declared `const route` or `const app` and export `type AppType = typeof route`.
- Use `createMiddleware()` or `createFactory()` from `hono/factory` for reusable typed middleware and shared `Env` setup.
- Model `Bindings` and `Variables` explicitly on `new Hono<Env>()`, factories, and middleware.
- Use validator middleware plus `c.req.valid()` for typed inputs instead of reparsing unchecked request data in handlers.
- Use Web Standard `Request` and `Response` behavior directly; avoid Node-specific assumptions unless the selected runtime is Node and the adapter supports them.
- Test with `app.request()` and pass mock `env` as the third argument when handlers depend on runtime bindings.

## Review Checklist

When reviewing Hono code, look first for:
- Controllers or extracted handlers that lost path-param or validation inference.
- Route modules mounted before their routes are registered.
- RPC types exported from an unchained app, a widened type, or the wrong route variable.
- Middleware ordering bugs, missing `await next()`, or middleware that unexpectedly early-returns.
- Context variables set without matching `Variables` typing.
- Unvalidated `await c.req.json()`, unchecked query parsing, or duplicated validation logic.
- Error handlers that assume global `onError()` responses are inferred by `hono/client` without `ApplyGlobalResponse`.
- Tests that bypass `app.request()` or fail to mock `c.env`/bindings.

## Source Map

Use official docs as the source of truth:
- Full docs for search: `https://hono.dev/llms-full.txt`
- Best practices: `https://hono.dev/docs/guides/best-practices`
- Middleware: `https://hono.dev/docs/guides/middleware`
- Validation: `https://hono.dev/docs/guides/validation`
- RPC: `https://hono.dev/docs/guides/rpc`
- Testing: `https://hono.dev/docs/guides/testing`
- Factory helper: `https://hono.dev/docs/helpers/factory`
- App API: `https://hono.dev/docs/api/hono/`
- Context API: `https://hono.dev/docs/api/context`
- Routing API: `https://hono.dev/api/routing`
