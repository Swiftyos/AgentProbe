---
name: tanstack-react-client
description: Client-side React and TanStack best-practice guidance. Use when Codex is building, reviewing, refactoring, or debugging browser-rendered React apps that use TanStack Query, Router, Form, Table, Virtual, AI, Store, Pacer, Hotkeys, or Devtools for API state, client routing, URL search state, forms, data grids, virtualization, AI chat/tool UI, execution timing, keyboard shortcuts, or TypeScript integration.
---

# TanStack React Client

## Operating Model

Act as a client-side React specialist for TanStack libraries.

- Keep examples and recommendations browser-rendered and React-only.
- Prefer the repo's installed TanStack versions, local wrappers, route conventions, query key factories, and form/table primitives.
- Inspect `package.json`, existing providers, router setup, generated route trees, and `node_modules` types before changing APIs you are not sure about.
- Use `curl` for direct docs retrieval when current API details matter:
  - `curl -sL https://tanstack.com/llms.txt`
  - `curl -sL https://tanstack.com/query/latest/docs/framework/react/overview.md`
  - `curl -sL https://tanstack.com/router/latest/docs/quick-start.md`
  - `curl -sL https://tanstack.com/form/latest/docs/framework/react/quick-start.md`
  - `curl -sL https://tanstack.com/table/latest/docs/framework/react/react-table.md`
  - `curl -sL https://tanstack.com/virtual/latest/docs/framework/react/react-virtual.md`
  - `curl -sL https://tanstack.com/ai/latest/docs/api/ai-react.md`
- Use the TanStack CLI only when docs search or structured JSON output is useful and the tool is already available, or when the user asks to install it. Search with `tanstack search-docs "<query>" --library <id> --framework react --json`; retrieve with `tanstack doc <library> <path> --json`.
- If scaffolding a client-only React Router app with the CLI, use `npx @tanstack/cli create my-app --router-only`.
- Use shadcn/ui for UI elements when the project uses it. For component installation, variants, registry details, or styling specifics, use the shadcn skill; this skill owns TanStack/React state and integration patterns.
- Use top-level imports only. Do not use dynamic imports or type-position package imports.
- Keep React components and hooks pure; do not create clients, routers, columns, data arrays, schemas, or key factories inside render unless they are intentionally memoized or initialized lazily.

## State Ownership

Classify state before choosing a library:

- Local UI state: `useState` or `useReducer`, colocated near the UI.
- API state: TanStack Query for fetching, caching, freshness, retries, invalidation, optimistic updates, and background refresh.
- Shareable navigation state: TanStack Router path params and validated search params.
- Form state: TanStack Form for typed field state, validation, submission, async validation, and reusable form primitives.
- Table state: TanStack Table for headless row, column, sorting, filtering, selection, pagination, and visibility logic.
- Large rendered collections: TanStack Virtual for windowing lists, grids, and table bodies.
- AI interaction state: TanStack AI React hooks for chat messages, streaming UI, client-side tool approvals, and client tools; keep provider execution behind the backend.
- High-frequency user or network work: TanStack Pacer for debouncing, throttling, rate limiting, queuing, or batching.
- Shared client state: React context for stable dependencies; TanStack Store only when the app already uses it or needs a small reactive store.
- Keyboard shortcuts: TanStack Hotkeys when shortcuts, sequences, custom shortcut recording, or cross-platform display are part of the feature.

Do not duplicate API state into global client state. Derive display values during render or with selectors instead of storing derived state in effects.

## Workflow

1. Identify the feature's ownership boundaries: route, URL state, API data, form state, table state, virtualization, and local UI state.
2. Read the relevant reference file below before implementing a non-trivial TanStack pattern.
3. Add the smallest TanStack package set that solves the problem; avoid bringing in a library for a one-off local state need.
4. Keep types explicit at API boundaries. Validate raw URL params, form input, and API responses with schemas when the data crosses trust boundaries.
5. Model loading, empty, pending, error, retry, disabled, and optimistic states in the UI.
6. Verify with lint/typecheck/tests available in the repo. For UI changes, run the app and inspect the browser when feasible.

## Library Defaults

- Query: create one `QueryClient` for the app lifetime; use stable serializable query keys; include every variable used by `queryFn` in the key; tune `staleTime` intentionally; invalidate or update caches after mutations.
- Router: use validated search params for filters, tabs, sort, and pagination that should survive refresh or sharing; prefer route APIs over prop drilling route data.
- Form: use field-level errors, schema validation for real forms, debounced async validation for remote checks, and mutations for submit side effects.
- Table: treat it as headless logic; provide stable `data` and `columns`; control state explicitly when it must sync to URL or Query.
- Virtual: virtualize only when rendering cost is real; give the virtualizer stable counts, estimates, scroll elements, and dimensions.
- AI: use TanStack AI React/client packages for browser chat state and streams; route provider calls through the backend pi-mono provider layer.
- Devtools: include React-compatible TanStack devtools only for development workflows or explicitly requested diagnostics.

## References

- `references/react-client-principles.md`: React component, hook, effect, state, TypeScript, accessibility, testing, and security guidance adapted for client-only TanStack apps.
- `references/query-router.md`: TanStack Query and Router patterns, including query keys, defaults, mutations, invalidation, URL search params, and client route loading.
- `references/forms.md`: TanStack Form patterns for validation, composition, submission, and Query mutations.
- `references/tables-virtual.md`: TanStack Table and Virtual patterns for stable data, columns, pagination, remote data, and virtualized rendering.
- `references/ai.md`: TanStack AI React patterns, pi-mono backend boundary, chat/tool UI, approvals, streaming, and shadcn coordination.
- `references/ecosystem.md`: Pacer, Store, Hotkeys, Devtools, package selection, docs lookup, and review checklist.
