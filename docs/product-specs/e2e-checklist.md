# E2E Test Checklist

Derived from `platform.md`. Every scenario should have a coverage owner.

| Scenario | Test file | Status |
| --- | --- | --- |
| YAML validation succeeds for well-formed data | `tests/e2e/cli.e2e.test.ts` | ✅ covered |
| Evaluation run records ordered results and artifacts | `tests/e2e/cli.e2e.test.ts` | ✅ covered |
| Scenario filters narrow execution to matching scenarios | `tests/e2e/cli.e2e.test.ts` | ✅ covered |
| List command shows available scenarios | `tests/e2e/cli.e2e.test.ts` | ⏳ planned |
| Dry-run mode records intent without contacting external systems | `tests/e2e/cli.e2e.test.ts` | ✅ covered |
| Judge requests preserve cache-friendly prompt prefixes | `tests/unit/judge.test.ts` | ✅ covered |
| Parallel mode overlaps scenario execution while preserving ordering | `tests/e2e/cli.e2e.test.ts` | ✅ covered |
| Multi-session memory scenarios preserve pinned identity and session controls | `tests/unit/runner.test.ts` + `tests/unit/scenario-parsing.test.ts` | ⏳ planned |
| AutoGPT preset forges auth tokens internally | `tests/unit/autogpt-auth.test.ts` + `tests/unit/adapters.test.ts` | ⏳ expanding |
| Repeat mode reruns scenarios with isolated users per iteration | `tests/unit/runner.test.ts` + `tests/e2e/cli.e2e.test.ts` | ⏳ planned |
| OpenClaw CLI commands manage sessions, chat, and history | `tests/e2e/cli.e2e.test.ts` | ✅ covered |
| Fast feedback enforces the repo quality gates | `scripts/fast-feedback.sh` | ✅ covered |
| HTML report renders from recorded run history | `tests/e2e/cli.e2e.test.ts` + `tests/unit/report.test.ts` | ⏳ expanding |
| Dashboard mode serves live run state from a Bun HTTP server | `tests/unit/dashboard.test.ts` + `tests/e2e/cli.e2e.test.ts` | ⏳ planned |
| Reliability signals exist for critical command paths | `docs/RELIABILITY.md` + future performance checks | ⏳ planned |
| Default start-server boot binds loopback with read-only history browsing | `tests/e2e/server-e2e.test.ts` + `tests/unit/server/config.test.ts` | ⏳ planned |
| Non-loopback exposure requires unsafe flag and token | `tests/unit/server/config.test.ts` + `tests/e2e/server-e2e.test.ts` | ⏳ planned |
| Read-only HTTP and UI surfaces browse persisted run history | `tests/integration/server/read-only.test.ts` + dashboard read-only component tests | ⏳ planned |
| Live run events stream through Server-Sent Events with replay support | `tests/integration/server/sse.test.ts` + `tests/unit/server/events.test.ts` | ⏳ planned |
| Run control starts validated ad-hoc or preset-backed runs | `tests/integration/server/runs.test.ts` + `tests/unit/server/routes.test.ts` | ⏳ planned |
| Cancellation cooperatively stops a server-managed run | `tests/integration/server/cancel.test.ts` + `tests/unit/server/run-controller.test.ts` | ⏳ planned |
| Presets save cross-file scenario selections for one-click rerun | `tests/integration/server/presets.test.ts` + dashboard start-form component tests | ⏳ planned |
| Comparison workspace diffs 2 to 10 historical runs | `tests/integration/server/comparisons.test.ts` + dashboard compare-view component tests | ⏳ planned |
| Docker image boots safely with SQLite-on-volume persistence | `tests/e2e/server-e2e.test.ts` (Docker smoke) + `docs/playbooks/agent-probe-server.md` | ⏳ planned |
