# Architecture For Bun TypeScript Systems

## Recommended Shape

Prefer package/domain boundaries over technical folders:

```text
apps/
  api/
  worker/
  web/
packages/
  auth/
    src/
      domain/
      application/
      infrastructure/
      api/
      index.ts
  billing/
  llm/
  db/
  shared-kernel/
  config/
```

Avoid starting serious systems with global technical folders:

```text
src/
  controllers/
  services/
  repositories/
  types/
  utils/
```

That shape looks clean early but tends to make every feature depend on every other feature.

## Package Public APIs

Expose a small public API through `index.ts` and `package.json` exports.

```ts
// Good
import { createUser } from "@acme/users";

// Bad
import { createUser } from "@acme/users/src/application/create-user";
```

If consumers need an internal capability, promote it intentionally to the package API or create a narrower facade.

## Layer Intent

Use folder layers inside each domain package only to clarify dependency direction:

- `domain`: entities, value objects, policies, pure domain behavior, domain events.
- `application`: use cases, orchestration, ports, transactions, authorization decisions.
- `infrastructure`: adapters for databases, queues, caches, providers, file systems, Bun runtime APIs, and SDKs.
- `api`: HTTP/RPC handlers and route binding.

Dependency direction:

```text
domain -> shared/domain primitives only
application -> domain + ports + shared contracts
infrastructure -> application/domain + external SDKs
api -> application
```

Keep `db` packages free of feature imports. Keep `shared-kernel` free of app-specific imports.

## Enforcement Stack

Use more than one mechanism:

- `package.json` exports to prevent casual deep imports.
- TypeScript project references to split programs and enforce build dependency order.
- `composite: true` for referenced projects.
- Lint or Nx module-boundary rules for import constraints.
- CI dependency graph checks to catch drift.

Useful tag model:

```text
scope:auth
scope:billing
scope:llm
scope:db

type:domain
type:application
type:infrastructure
type:api
type:shared
```

Typical constraints:

```text
domain         -> domain/shared only
application    -> domain/shared/ports
infrastructure -> application/domain/db/external SDKs
api            -> application only
shared-kernel  -> no app-specific imports
db             -> no feature imports
```

## Ports And Adapters

Define ports near the application use case that owns the dependency.

```ts
export type UserRepository = {
  create(input: CreateUserRecord): Promise<UserRecord>;
  findByEmail(email: EmailAddress): Promise<UserRecord | null>;
};
```

Implement ports in infrastructure:

```ts
export function createDrizzleUserRepository(db: AppDb): UserRepository {
  return {
    async create(input) {
      // Drizzle code belongs here, not in domain/application modules.
    },
    async findByEmail(email) {
      // Query implementation.
    },
  };
}
```

## Boundary Smells

Treat these as architecture warnings:

- `domain/` imports `drizzle-orm`, `redis`, `Bun`, provider SDKs, HTTP framework objects, queue clients, or environment loaders.
- A feature package imports another package's `src/` path.
- Shared packages import app-specific config or feature code.
- Repositories perform business decisions that belong in domain/application code.
- API handlers contain domain rules instead of delegating to use cases.
