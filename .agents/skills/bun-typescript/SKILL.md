---
name: bun-typescript
description: Best-practice guidance for designing, implementing, reviewing, and refactoring serious TypeScript systems that use Bun as the runtime, package manager, test runner, bundler, or monorepo tool. Use when working on Bun TypeScript projects, strict tsconfig settings, package/domain boundaries, Bun APIs, bun test, async concurrency, background jobs, durable workflows, runtime compatibility, or code quality reviews for TypeScript on Bun.
---

# Bun TypeScript

## Operating Mode

Treat Bun as a complete TypeScript toolchain, but design the system around explicit domain boundaries rather than around Bun features.

Before changing code, inspect the current repository shape: `package.json`, `bun.lock`, `bunfig.toml`, `tsconfig*.json`, workspace/package exports, lint rules, and test scripts. Preserve local conventions unless they conflict with the quality rules below.

If a Bun API or command matters to the implementation and local context is not enough, check `references/bun-llms.txt` or the live official Bun docs index at `https://bun.sh/llms.txt`, then open the specific linked page.

## Reference Routing

Load only the reference needed for the task:

- `references/architecture.md`: package boundaries, TypeScript project references, exports, domain/application/infrastructure layering, and CI boundary checks.
- `references/bun-tooling.md`: Bun commands, runtime APIs, package management, tests, bundling, tsconfig defaults, and compatibility checks.
- `references/async-workflows.md`: async patterns, bounded concurrency, workers, queues, durable workflows, cancellation, and LLM run records.
- `references/bun-llms.txt`: collected copy of Bun's `llms.txt` docs index with provenance header; use it to discover official Bun docs pages without fetching the live index.

## Core Workflow

1. Identify the system boundary being changed: app, package, domain module, infrastructure adapter, job, or test.
2. Keep public APIs narrow. Import other systems through package exports such as `@acme/users`, not internal paths like `@acme/users/src/...`.
3. Keep domain and application code free of runtime/framework details. Do not import Drizzle, Redis, HTTP clients, Bun server objects, AI provider SDKs, or queue clients from domain/application modules.
4. Prefer explicit ports/interfaces at system edges. Implement adapters in infrastructure packages or folders.
5. Use strict TypeScript as a design tool: model data shapes, errors, events, jobs, and provider responses explicitly.
6. Use Bun-native tooling where it fits: `bun install`, `bun run`, `bun test`, `Bun.serve`, `Bun.file`, `Bun.write`, `Bun.spawn`, `Bun.env`, and Bun bundling.
7. Verify with both type checks and runtime tests. Run the repo's existing scripts first; otherwise use `bun test` and the appropriate `tsc --build` or package typecheck command.

## Quality Rules

- Structure serious systems by domains/packages, not by global `controllers/`, `services/`, `repositories/`, `types/`, and `utils/` folders.
- Enforce boundaries with package exports, TypeScript project references, lint/module-boundary rules, and dependency graph checks in CI.
- Keep every external system behind a port/interface and keep infrastructure details out of domain/application code.
- Avoid `any`; use `unknown`, generics, branded identifiers, discriminated unions, and schema validation at runtime boundaries.
- Prefer top-level imports. Do not use inline dynamic imports for normal code organization or type positions.
- Avoid deep imports across packages. If another package needs a capability, expose it deliberately through that package's public API.
- Make every background job idempotent and cancellation-aware.
- Persist LLM run records when LLM behavior matters: request id, model, prompt version, input hash, stream state, tool calls, usage, final output, and error state.
- Normalize streaming output into app-level events rather than leaking provider-specific stream shapes.
- Keep database queries behind repositories or query objects; keep transaction boundaries explicit.

## TypeScript Defaults

Use strict settings for packages and libraries unless the repository has a stronger existing baseline:

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
    "skipLibCheck": true
  }
}
```

When code may need native Node type stripping compatibility, avoid TypeScript constructs that require emitted JavaScript beyond erasable type syntax: enums, namespaces, and parameter properties. Prefer object constants, type aliases, and explicit class fields.

## Review Checklist

When reviewing or finishing Bun TypeScript work, check:

- Public package exports are intentional and deep imports are absent.
- Domain/application modules do not import infrastructure or runtime objects.
- `tsconfig` project references and package exports match the intended dependency graph.
- Runtime inputs are validated before becoming trusted domain types.
- Async fan-out is bounded for large or untrusted inputs.
- Jobs, streams, and long-running workflows support retries, idempotency, and cancellation.
- Tests use Bun's test runner or the repo's selected runner consistently, and type checks still run in CI.
