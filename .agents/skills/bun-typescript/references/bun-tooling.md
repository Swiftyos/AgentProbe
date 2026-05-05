# Bun Tooling And Runtime

## Official Docs Routing

Use `https://bun.sh/llms.txt` as the index. Open the linked Bun docs page relevant to the task before relying on detailed Bun behavior.

Frequently useful docs from that index:

- TypeScript: `https://bun.com/docs/typescript`
- Runtime TypeScript declarations: `https://bun.com/docs/guides/runtime/typescript.md`
- TypeScript 6/7 declarations: `https://bun.com/docs/typescript-6.md`
- Workspaces: `https://bun.com/docs/install/workspaces`
- Isolated installs: `https://bun.com/docs/pm/isolated-installs.md`
- bunfig: `https://bun.com/docs/runtime/bunfig.md`
- Bun.serve: `https://bun.com/docs/runtime/http/server.md`
- Workers: `https://bun.com/docs/runtime/workers.md`
- Bun test: `https://bun.com/docs/test`
- Bun SQL: `https://bun.com/docs/runtime/sql.md`
- Bun SQLite: `https://bun.com/docs/runtime/sqlite.md`
- Bundler: `https://bun.com/docs/bundler/index.md`
- Single-file executables: `https://bun.com/docs/bundler/executables.md`

## Command Defaults

Prefer Bun commands in Bun repositories:

```bash
bun install
bun add <pkg>
bun add -d <pkg>
bun remove <pkg>
bun run <script>
bun test
bun test --coverage
bun --filter '<workspace-pattern>' test
```

Do not mix npm/pnpm/yarn commands into a Bun repo unless the project already does so intentionally.

## Runtime API Use

Use Bun APIs when they improve simplicity or performance and do not make portability worse than the product needs:

- `Bun.serve` for Bun-native HTTP servers.
- `Bun.file` and `Bun.write` for file I/O.
- `Bun.spawn`/`Bun.spawnSync` for subprocesses.
- `Bun.env` for environment reads, with validation before use.
- `Bun.password`, `Bun.hash`, `Bun.CSRF`, `Bun.S3`, `Bun.sql`, or `bun:sqlite` only when the runtime dependency is acceptable.

If a library expects Node behavior, check Bun's Node compatibility docs or local tests before assuming support.

## TypeScript Configuration

For Bun-targeted packages, start strict:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "useUnknownInCatchVariables": true,
    "verbatimModuleSyntax": true,
    "moduleResolution": "Bundler",
    "declaration": true,
    "declarationMap": true,
    "composite": true,
    "skipLibCheck": true,
    "types": ["bun"]
  }
}
```

Install `@types/bun` and add `types: ["bun"]` where Bun globals or `bun:*` modules are expected. Shared packages that should remain runtime-neutral should avoid Bun-specific types.

## Native TypeScript Compatibility

Bun runs TypeScript directly. Some systems may also target native Node type stripping. If so, keep shared code erasable:

```ts
export const Status = {
  Active: "active",
  Disabled: "disabled",
} as const;

export type Status = (typeof Status)[keyof typeof Status];

class User {
  private id: string;

  constructor(id: string) {
    this.id = id;
  }
}
```

Avoid `enum`, `namespace`, and constructor parameter properties in code expected to run under native Node type stripping.

## Tests

Use Bun's test runner when the project has adopted it:

```ts
import { describe, expect, test, mock } from "bun:test";

describe("createUser", () => {
  test("creates a user", async () => {
    expect(await createUser(input)).toMatchObject({ email: input.email });
  });
});
```

Prefer focused tests around package public APIs and application use cases. Add adapter integration tests for infrastructure that touches Bun APIs, databases, queues, or provider SDKs.

## Packaging And Exports

Use package exports to make boundaries real:

```json
{
  "name": "@acme/users",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  }
}
```

Do not expose `./src/*` unless the package is intentionally an internal source-only workspace package and boundary checks still prevent uncontrolled imports.
