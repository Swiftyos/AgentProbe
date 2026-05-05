---
name: drizzle
description: Drizzle ORM and Drizzle Kit guidance for TypeScript database work. Use when Codex needs to create or modify Drizzle schemas, relations, queries, inserts, updates, deletes, transactions, migrations, drizzle.config files, database connection setup, relational query builder usage, SQL helpers, indexes, constraints, or validation schemas for PostgreSQL, MySQL, SQLite, SingleStore, SQL Server, Gel, CockroachDB, Neon, Turso, D1, Supabase, Vercel Postgres, PlanetScale, PGLite, or other Drizzle-supported drivers.
---

# Drizzle

## Workflow

1. Inspect the project before writing code: package versions, existing schema layout, `drizzle.config.*`, migration scripts, database driver, and local naming conventions.
2. Match the project's dialect and driver imports. Do not mix `pg-core`, `mysql-core`, and `sqlite-core` primitives.
3. Check installed package type definitions in `node_modules` when API details matter. Prefer local installed types over memory.
4. Use top-level imports only. Do not use dynamic imports or inline type imports.
5. Keep app/API layers thin; put reusable database contracts in the repo's established DB package or schema module.
6. Verify with the project's normal typecheck, tests, or migration generation command when available.

## Reference Docs

Use `references/drizzle-llms-full.txt` for detailed official Drizzle documentation. It was fetched from <https://orm.drizzle.team/llms-full.txt>.

Do not load the whole file into context. Search it with `rg` and read the focused section:

```bash
rg -n "Source: https://orm.drizzle.team/docs/(sql-schema-declaration|indexes-constraints|relations|rqb|select|insert|update|delete|transactions|migrations|drizzle-config-file)" references/drizzle-llms-full.txt
```

Useful section anchors:

- `Source: https://orm.drizzle.team/docs/get-started-*` for setup by database/provider.
- `Source: https://orm.drizzle.team/docs/connect-*` for driver-specific connection code.
- `Source: https://orm.drizzle.team/docs/sql-schema-declaration` for table declarations.
- `Source: https://orm.drizzle.team/docs/column-types/<dialect>` for dialect column APIs.
- `Source: https://orm.drizzle.team/docs/indexes-constraints` for indexes, unique constraints, foreign keys, checks, and primary keys.
- `Source: https://orm.drizzle.team/docs/relations` and `relations-v2` for relational metadata.
- `Source: https://orm.drizzle.team/docs/rqb` and `rqb-v2` for relational query builder patterns.
- `Source: https://orm.drizzle.team/docs/select`, `insert`, `update`, `delete`, `joins`, `sql`, and `transactions` for query builder work.
- `Source: https://orm.drizzle.team/docs/drizzle-config-file`, `drizzle-kit-generate`, `drizzle-kit-migrate`, `drizzle-kit-push`, `drizzle-kit-pull`, and `migrations` for migration/config workflows.
- `Source: https://orm.drizzle.team/docs/drizzle-zod`, `drizzle-typebox`, `drizzle-valibot`, and `arktype` for validation schemas.

If the user asks for latest behavior or the installed version differs meaningfully from this reference, refresh from the official docs before deciding.

## Implementation Guidance

- Prefer Drizzle's typed query builder and relational query builder over raw SQL. Use `sql` only for unsupported expressions, database functions, or carefully parameterized fragments.
- Keep schema definitions explicit: table name, columns, nullability, defaults, primary keys, foreign keys, indexes, and enum/custom types where relevant.
- Infer types from schema objects (`$inferSelect`, `$inferInsert`) instead of duplicating DTO types unless the project has a separate contract layer.
- Use relations for application-level graph querying; still define database foreign keys when the target database and project policy support them.
- Use migration generation for schema changes unless the repository intentionally uses push/pull or custom migrations.
- When editing migrations, preserve ordering and existing generated SQL style. Ask before removing intentional migration history.
- For serverless/edge targets, verify the specific driver and connection pattern from the docs and installed packages.
- For validation schemas, derive from Drizzle tables where practical and then refine fields for API-specific constraints.

## Review Checklist

- The dialect imports match the configured database.
- Schema changes have a migration or an explicit reason no migration is needed.
- Nullability and defaults match application expectations.
- Foreign keys, relations, and indexes cover the query patterns being introduced.
- Queries remain type-safe and parameterized.
- Generated or inferred types are exported from the same layer as existing DB contracts.
- Tests, typecheck, or migration generation were run, or the reason they could not run is reported.
