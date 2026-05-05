# TanStack React Ecosystem

## Package Selection

Start with the smallest package set that matches the feature:

- `@tanstack/react-query`: API state, freshness, caching, retries, invalidation, mutations.
- `@tanstack/react-router`: client routing, path params, validated search params, navigation, preloading.
- `@tanstack/react-form`: complex typed forms, validation, async validation, submission.
- `@tanstack/react-table`: headless table and data grid state.
- `@tanstack/react-virtual`: virtualized rendering for large lists, grids, and table bodies.
- `@tanstack/ai-react` and `@tanstack/ai-client`: React chat state, streamed AI UI, typed messages, client tools, and approval flows.
- `@tanstack/react-pacer`: debounced, throttled, rate-limited, queued, or batched work in React.
- `@tanstack/react-store`: small shared client store when the project already uses it or needs TanStack's reactive store.
- `@tanstack/react-hotkeys`: typed shortcuts, shortcut scopes, sequences, recording, and display formatting.
- `@tanstack/react-devtools` and library-specific plugins: local diagnostics and development-only debugging.

Do not add a TanStack library just because it exists. Use React primitives when they clearly solve the problem.

Use shadcn/ui for actual UI elements in projects that already standardize on it. Use the shadcn skill for component-specific choices, installation, registry usage, and styling conventions.

## Pacer

Docs lookup:

```bash
curl -sL https://tanstack.com/pacer/latest/docs/installation.md
curl -sL https://tanstack.com/pacer/latest/docs/framework/react/adapter.md
curl -sL https://tanstack.com/pacer/latest/docs/framework/react/reference/index.md
```

Use Pacer for execution timing rather than hand-rolled timers when timing behavior matters:

- Debounce search input, async validation, autocomplete, or expensive filtering.
- Throttle scroll, resize, drag, or pointer work.
- Rate limit actions that must not exceed a frequency.
- Queue or batch repeated work when ordering, concurrency, or grouped sends matter.

Keep timing utilities outside render or inside hooks designed for them. Clean up timers and abort async work through the library or hook lifecycle.

## Store

Docs lookup:

```bash
curl -sL https://tanstack.com/store/latest/docs/framework/react/quick-start.md
```

Use TanStack Store sparingly:

- Good: small shared client state with reactive subscriptions, especially when the app already has TanStack Store.
- Usually better: colocated React state, split contexts for stable dependencies, Query for API state, Router for shareable URL state, or Form/Table state for those domains.

Avoid storing API results, duplicated route state, or derived display state in Store.

## Hotkeys

Docs lookup:

```bash
curl -sL https://tanstack.com/hotkeys/latest/docs/framework/react/quick-start.md
```

Use Hotkeys when shortcuts are part of the product rather than a one-off key listener.

- Keep shortcuts configurable through the app's keybinding system when one exists.
- Prefer `Mod` style shortcuts for cross-platform behavior.
- Scope shortcuts so text inputs, dialogs, and nested tools do not conflict.
- Provide visible commands or menus for discoverability.
- Keep destructive shortcuts guarded by confirmation or undo.

## Devtools

Use React-compatible TanStack devtools for diagnosing Query cache, routes, custom devtools panels, or local development issues. Keep production bundles clean according to the repo's build convention.

## Review Checklist

- Is every TanStack package justified by state ownership or UX needs?
- Are unstable or early APIs checked against installed types and current docs?
- Are only React packages and examples used?
- Are browser-only assumptions explicit in the implementation?
- Are keybindings configurable if the app has a keybinding system?
- Are diagnostics development-only unless the user asked otherwise?
