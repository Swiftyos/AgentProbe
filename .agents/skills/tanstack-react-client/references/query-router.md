# TanStack Query And Router

## Docs Lookup

Use `curl` for direct page retrieval. Use `tanstack search-docs` only when search or JSON output is useful and the CLI is already available.

```bash
curl -sL https://tanstack.com/query/latest/docs/framework/react/guides/query-keys.md
curl -sL https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults.md
curl -sL https://tanstack.com/query/latest/docs/framework/react/guides/mutations.md
curl -sL https://tanstack.com/query/latest/docs/framework/react/guides/invalidations-from-mutations.md
curl -sL https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates.md
curl -sL https://tanstack.com/router/latest/docs/guide/search-params.md
curl -sL https://tanstack.com/router/latest/docs/guide/data-loading.md
```

## Query Client

Create one `QueryClient` for the app lifetime. For a browser-only app, a module singleton is usually fine. If the app root can remount in tests or previews, initialize lazily.

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useState } from 'react'

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
      },
    },
  })
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient)

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
```

## Important Query Defaults

- Cached query data is stale by default.
- Stale queries can refetch on mount, window focus, and reconnect.
- Inactive query data is garbage collected after 5 minutes by default.
- Failed queries retry 3 times by default.
- Results use structural sharing for JSON-compatible values.

Set `staleTime` intentionally instead of disabling refetch behavior everywhere. Use `Infinity` for data that should only refresh through invalidation. Use `'static'` only for data that cannot change while the app is running.

## Query Keys And Options

Query keys must be arrays, serializable, and unique to the data. Include every variable used by the query function that can change.

```tsx
import { queryOptions } from '@tanstack/react-query'

type ProductFilters = {
  category?: string
  page: number
  sort: 'name' | 'price'
}

export const productQueries = {
  all: () => ['products'] as const,
  list: (filters: ProductFilters) =>
    queryOptions({
      queryKey: [...productQueries.all(), { filters }] as const,
      queryFn: () => fetchProducts(filters),
      staleTime: 60_000,
    }),
  detail: (productId: string) =>
    queryOptions({
      queryKey: [...productQueries.all(), 'detail', productId] as const,
      queryFn: () => fetchProduct(productId),
    }),
}
```

Prefer `queryOptions` factories for shared queries. They centralize key shape, function, freshness, and types.

Avoid:

- Random or partially specified keys.
- Reusing the same key for finite and infinite queries.
- Putting mutable class instances, functions, or non-serializable values in keys.
- Copying Query data into global state.

## Components

Keep query usage close to the route or feature component that needs the data. Model loading, error, and empty states separately.

```tsx
import { useQuery } from '@tanstack/react-query'

function ProductsPage({ filters }: { filters: ProductFilters }) {
  const productsQuery = useQuery(productQueries.list(filters))

  if (productsQuery.isPending) return <Spinner />
  if (productsQuery.isError) return <ErrorState error={productsQuery.error} />
  if (productsQuery.data.items.length === 0) return <EmptyProducts />

  return <ProductGrid products={productsQuery.data.items} />
}
```

Use `select` for stable derived query slices when a component only needs part of a response.

## Mutations

Use mutations for create, update, delete, and remote side effects. After success, either invalidate affected queries or update the cache directly.

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query'

function useAddTodo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: addTodo,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['todos'] })
    },
  })
}
```

Return invalidation promises from callbacks when the UI should remain pending until the cache has refreshed.

Use optimistic updates only when rollback behavior is clear:

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query'

type Todo = {
  id: string
  text: string
}

function useRenameTodo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: renameTodo,
    onMutate: async ({ id, text }: { id: string; text: string }) => {
      const queryKey = ['todos'] as const

      await queryClient.cancelQueries({ queryKey })
      const previousTodos = queryClient.getQueryData<Todo[]>(queryKey)

      queryClient.setQueryData<Todo[]>(queryKey, (oldTodos = []) =>
        oldTodos.map((todo) => (todo.id === id ? { ...todo, text } : todo)),
      )

      return { previousTodos }
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(['todos'], context?.previousTodos)
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['todos'] })
    },
  })
}
```

Use `mutateAsync` when composing mutation side effects in `async` functions.

## Router Search Params

Use Router search params for state that should survive refresh, back/forward, bookmark, or sharing: filters, tabs, sort, pagination, and view modes.

Treat search params as untrusted input and validate them.

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

const productSearchSchema = z.object({
  page: z.number().catch(1),
  category: z.string().catch('all'),
  sort: z.enum(['name', 'price']).catch('name'),
})

export const Route = createFileRoute('/products')({
  validateSearch: productSearchSchema,
  component: ProductsRoute,
})

function ProductsRoute() {
  const search = Route.useSearch()

  return <ProductsPage filters={search} />
}
```

When updating one search param, preserve the rest:

```tsx
import { useNavigate } from '@tanstack/react-router'

function PageSizeSelect() {
  const navigate = useNavigate()

  return (
    <select
      onChange={(event) => {
        const pageSize = Number(event.currentTarget.value)

        void navigate({
          to: '.',
          search: (previous) => ({ ...previous, page: 1, pageSize }),
        })
      }}
    >
      <option value="25">25</option>
      <option value="50">50</option>
    </select>
  )
}
```

## Router Data Loading With Query

Use Router loaders for route-scoped preloading. Use Query when data is shared across routes, mutated elsewhere, needs cache updates, or benefits from Query defaults.

```tsx
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

const productQuery = (productId: string) =>
  queryOptions({
    queryKey: ['products', 'detail', productId],
    queryFn: () => fetchProduct(productId),
  })

export const Route = createFileRoute('/products/$productId')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(productQuery(params.productId)),
  component: ProductRoute,
})

function ProductRoute() {
  const { productId } = Route.useParams()
  const product = useSuspenseQuery(productQuery(productId)).data

  return <ProductDetails product={product} />
}
```

Ensure the router context type includes `queryClient` if loaders use it.

## Review Checklist

- Are query keys complete, stable, serializable, and scoped by feature?
- Are freshness defaults intentional?
- Are mutations invalidating or updating all affected caches?
- Is URL state validated and typed?
- Are route loader dependencies limited to values the loader actually uses?
- Are loading, empty, error, and retry states visible?
