# TanStack Table And Virtual

## Docs Lookup

```bash
curl -sL https://tanstack.com/table/latest/docs/introduction.md
curl -sL https://tanstack.com/table/latest/docs/framework/react/react-table.md
curl -sL https://tanstack.com/table/latest/docs/guide/data.md
curl -sL https://tanstack.com/table/latest/docs/guide/column-defs.md
curl -sL https://tanstack.com/table/latest/docs/guide/pagination.md
curl -sL https://tanstack.com/virtual/latest/docs/introduction.md
curl -sL https://tanstack.com/virtual/latest/docs/framework/react/react-virtual.md
```

## Table Mental Model

TanStack Table is headless table logic. It does not provide markup or styles. Build accessible table markup, grid layout, toolbar controls, empty states, and pagination UI yourself or through the app design system.

Use it for sorting, filtering, grouping, selection, visibility, pagination, column definitions, row models, and controlled table state.

## Stable Data And Columns

In React, `data` and `columns` must have stable references. Inline arrays next to `useReactTable` can cause repeated re-renders.

```tsx
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useMemo } from 'react'

type User = {
  id: string
  firstName: string
  lastName: string
  email: string
}

const columnHelper = createColumnHelper<User>()
const fallbackUsers: User[] = []

function UsersTable({ users }: { users?: User[] }) {
  const columns = useMemo(
    () => [
      columnHelper.accessor('firstName', {
        header: 'First name',
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor('lastName', {
        header: 'Last name',
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor('email', {
        header: 'Email',
        cell: (info) => <a href={`mailto:${info.getValue()}`}>{info.getValue()}</a>,
      }),
    ],
    [],
  )

  const table = useReactTable({
    data: users ?? fallbackUsers,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <table>
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <th key={header.id}>
                {header.isPlaceholder
                  ? null
                  : flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

Column accessor values should be primitive when they participate in sorting, filtering, or grouping. Give accessor functions a stable `id` or string header.

## Pagination And Remote Data

Use client pagination when the full dataset is reasonably small and already loaded. Use manual pagination when the API returns a page.

For remote pagination:

- Store `pageIndex`, `pageSize`, sort, and filter in Router search params if the state should be shareable.
- Include pagination and filters in the Query key.
- Set `manualPagination: true`.
- Pass `rowCount` or `pageCount` when the API provides totals.
- Reset or validate page index when filters change.

```tsx
import {
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useQuery } from '@tanstack/react-query'

function UsersGrid({ pagination }: { pagination: PaginationState }) {
  const usersQuery = useQuery(userQueries.page(pagination))

  const table = useReactTable({
    data: usersQuery.data?.items ?? fallbackUsers,
    columns: userColumns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    rowCount: usersQuery.data?.rowCount ?? 0,
    state: { pagination },
  })

  return <UsersTableView table={table} isPending={usersQuery.isPending} />
}
```

## Virtualization

Use TanStack Virtual when rendering many rows, cards, options, messages, or cells hurts performance. Virtualization is about DOM count; it does not reduce fetch size by itself.

```tsx
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'

function VirtualRows({ rows }: { rows: RowViewModel[] }) {
  const parentRef = useRef<HTMLDivElement | null>(null)

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    useFlushSync: false,
  })

  return (
    <div ref={parentRef} style={{ height: 480, overflow: 'auto' }}>
      <div
        style={{
          height: rowVirtualizer.getTotalSize(),
          position: 'relative',
          width: '100%',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            style={{
              height: virtualRow.size,
              position: 'absolute',
              transform: `translateY(${virtualRow.start}px)`,
              width: '100%',
            }}
          >
            <RowView row={rows[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  )
}
```

For React 19 projects, consider `useFlushSync: false` if scrolling logs flush warnings or batching is preferred.

## Review Checklist

- Are table data and columns stable?
- Are controlled table states synced only where needed?
- Are sort/filter/pagination URL params validated?
- Does remote pagination include the same inputs in Query keys?
- Does row rendering use stable row IDs?
- Is virtualization solving a measured rendering problem?
- Are scroll containers, heights, estimates, and empty states stable?
