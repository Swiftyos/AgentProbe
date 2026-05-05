# React Client Principles

## Component Model

- Prefer small components with clear ownership of data and behavior.
- Split large pages into feature sections and small controls instead of centralizing fetching, auth, forms, modals, and formatting in one component.
- Use composition, slots, and subcomponents before adding many boolean props.
- Keep components and hooks pure: same props, state, and context should produce the same output.
- Let the React Compiler reward purity; do not add `useMemo`, `useCallback`, or `React.memo` reflexively.

Use manual memoization when profiling shows a problem, when passing callbacks to memoized children, when stabilizing effect dependencies, or when an expensive calculation actually repeats.

## Hooks And Effects

- Call hooks only at the top level of React function components or custom hooks.
- Make custom hooks for reusable behavior, not to hide two ordinary lines.
- Use effects for external synchronization: subscriptions, browser APIs, timers, imperative widgets, analytics, sockets, and cleanup.
- Do not use effects for derived values.
- Do not fetch API state with bare effects in serious app code; use TanStack Query unless the app has an established alternative.

```tsx
const fullName = `${firstName} ${lastName}`
```

## State Classification

Ask these questions for every new piece of state:

- Who owns it?
- Can it be derived?
- Is it local UI state, API state, URL state, form state, table state, or shared client state?
- Should it survive refresh?
- Should it be shareable?
- What invalidates it?
- Does it need optimistic updates or rollback?

Use local React state first. Use Query for API state, Router search params for shareable filters/pagination/tabs, Form for real form workflows, and Table state for grid behavior.

## TypeScript

- Use strict types and explicit public prop types.
- Avoid `any`; inspect installed package types before guessing.
- Prefer discriminated unions for async and complex UI states.
- Type API boundaries with schemas such as Zod or Valibot when data is untrusted.
- Avoid over-generic components unless the generic behavior is genuinely reused.

```tsx
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error }
```

## Structure

Prefer feature-based organization once an app grows:

```txt
src/
  app/
  features/
    auth/
      components/
      hooks/
      api/
      types.ts
    dashboard/
      components/
      hooks/
      api/
      types.ts
  shared/
    ui/
    lib/
    config/
```

Colocate query option factories, route components, form schemas, and table column definitions with the feature that owns them unless the repo already has a shared convention.

## Accessibility, Testing, And Security

- Use semantic HTML before ARIA.
- Use real buttons and links for actions and navigation.
- Give inputs labels and field-level errors.
- Preserve keyboard navigation and visible focus states.
- Respect reduced-motion preferences.
- Test behavior with React Testing Library and realistic API mocks.
- Use Playwright or Cypress for critical browser flows.
- Avoid unsafe HTML; sanitize if unavoidable.
- Never put secrets or authorization trust in frontend code.
