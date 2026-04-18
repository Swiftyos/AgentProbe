---
name: update-harness
description: >
  Audit, repair, and modernize an existing agent harness in a repository that
  already has some agent-facing scaffolding. Use when the user asks to update,
  refresh, harden, expand, or bring best practices into an existing harness,
  including AGENTS.md, harness docs, validation scripts, generated docs, smoke
  tests, CI, repo-local review skills, scheduled gardening, or automerge policy.
  For a blank or nearly blank repo, prefer setup-harness.
---

# Update Harness

Update an existing agent harness without erasing local conventions. The work is
an audit-and-ratchet loop: find where future agents are still forced to rely on
chat context, then move that knowledge into scripts, docs, checks, generated
reports, CI, or repo-local skills.

This skill is language and framework agnostic. Use the repo's own build system,
test runner, package manager, CI provider, and scripting runtime.

## Ground Rules

- Start from the current harness; do not re-scaffold from scratch.
- Preserve user changes and existing names unless there is a clear migration
  benefit.
- Prefer small, reviewable upgrades over a large harness rewrite.
- Fix broken existing gates before adding new gates.
- Convert repeated review feedback into mechanical checks, templates, generated
  docs, or source-of-truth docs.
- Keep `AGENTS.md` short and route detail to deeper docs.
- Make expensive or environment-specific validation opt-in unless the repo's
  normal workflow already requires it.
- When uncertainty exists, choose the least surprising convention already used
  in the repo.

## Phase 1: Audit The Current Harness

Inventory the repo before editing:

- root and scoped `AGENTS.md` files or equivalent agent instructions
- docs map, architecture docs, harness docs, behavior specs, execution plans,
  quality/security/reliability docs, generated docs, and design docs
- script entrypoints, script catalog, generators, local-dev helpers, smoke/e2e
  runners, and validation gates
- CI workflows, PR template, scheduled jobs, automerge workflows, and release
  gates
- repo-local skills such as review, security review, commit, push, pull, or
  domain-specific skills
- existing generated artifacts and how they are checked for drift
- current fast local command and CI-equivalent command
- repeated PR review failures, issue comments, CI failures, or agent mistakes
- critical paths that should require human review

Run existing validation only when the commands are discoverable and safe. Record
failures as input to the upgrade plan.

## Phase 2: Classify Gaps

Evaluate the harness along these dimensions:

- **Router quality**: Can a fresh agent start at the root and find the right
  docs, scripts, and ownership boundaries quickly?
- **Progressive disclosure**: Are detailed rules in focused docs instead of a
  giant instruction file?
- **Scriptable validation**: Are fast local and full CI gates available as
  stable scripts?
- **Generated truth**: Are repo inventory, public API, CLI help, schemas,
  quality snapshots, or baselines generated and checked for drift where useful?
- **Behavior coverage**: Do canonical scenarios map to current validation and
  smoke/e2e checklists?
- **Plan lifecycle**: Do active and completed plans carry scope, tasks,
  decisions, and verification evidence?
- **Review gates**: Are correctness and security review expectations encoded in
  repo-local skills or scripts?
- **Environment isolation**: Do local services use random ports, per-worktree
  data dirs, manifests, logs, and artifacts instead of global assumptions?
- **CI and gardening**: Does CI call repo scripts, and do scheduled jobs refresh
  docs, sweep stale plans, or audit boundaries?
- **Autonomy policy**: Does automerge or auto-land behavior refuse critical
  paths, wait for review signals, and fail closed on uncertainty?
- **Debt handling**: Are existing violations baselined so new regressions fail
  without requiring a giant cleanup first?

## Phase 3: Choose The Upgrade Slice

Pick the highest-leverage small slice:

- If agents cannot orient, update `AGENTS.md`, scoped routers, and the docs map.
- If validation is ad hoc, add or repair `fast-feedback` and the full
  CI-equivalent gate.
- If docs drift, add generated docs and drift checks.
- If behavior changes are hard to validate, add behavior specs, current-state
  mapping, and smoke/e2e checklists.
- If complex work keeps losing context, add execution-plan lifecycle docs and a
  plan-heading check.
- If reviews repeat the same findings, add a lint, script, template, generated
  report, or source-of-truth doc.
- If environment-gated tests are flaky, add helpers that isolate ports/data and
  write manifests, logs, and artifacts.
- If automerge exists, make the policy explicit and fail closed on missing
  checks, comments, critical-path changes, or moving head SHAs.

For broad upgrades, create an execution plan before editing. Keep completed work
and validation evidence in that plan as the harness evolves.

## Phase 4: Apply Best-Practice Patterns

### Router And Docs

- Keep root `AGENTS.md` compact: what the repo builds, key docs, repo map,
  standard commands, and hard rules.
- Add scoped `AGENTS.md` files only for meaningful ownership or architecture
  boundaries.
- Keep detailed knowledge in `docs/`, not in chat or root instructions.
- Maintain a docs map and link source-of-truth docs from the router.
- Add doc freshness frontmatter and a freshness check when stale docs are a real
  risk.

### Scripts

- Add `scripts/README.md` if the script surface is not self-explanatory.
- Split gates into a fast local loop and a full CI-equivalent loop.
- Put cheap structural checks before builds and tests.
- Make generators idempotent and add a strict drift mode for CI.
- Make environment-gated checks skip with explicit reasons when prerequisites
  are absent.
- Capture artifacts and logs for any smoke, e2e, browser, live-provider, or
  observability run.
- Use the repo's current scripting runtime unless adding another runtime is
  clearly worth it.

### Generated Docs And Checks

Prefer generated references for facts agents otherwise rediscover repeatedly:

- tracked workspace inventory
- public API, exported symbols, schema, CLI help, or command reference
- quality health snapshot
- stale active plans
- recurring PR review pattern summary
- load, performance, or smoke baseline

Generated docs should have both a refresh command and a check command.

### Review And Security Gates

If repo-local skills are available, keep them narrow:

- the general review skill reports only confirmed important issues
- the security review skill reports only confirmed high-impact issues
- approval with no comments is valid when the diff clears the bar

Wire mechanical checks around these skills so the harness catches missing
review artifacts, stale wiring, and branch-diff hazards.

### CI, Scheduling, And Automerge

- Have CI call repo scripts rather than duplicating command chains in YAML.
- Add scheduled gardening only when there is generated or time-sensitive repo
  state to maintain.
- Document the automerge policy before widening automation.
- Keep a critical-path list in both policy docs and eligibility code.
- Fail closed on uncertainty: missing checks, API failures, unresolved review
  signal, fresh human comments, merge conflicts, or changed head SHA.

## Phase 5: Handle Existing Debt

Do not block a harness upgrade on unrelated historical violations. Instead:

- record the current failure set in a baseline or generated report
- make the new check fail only on regressions
- add the cleanup target to `docs/QUALITY_SCORE.md`, a tech-debt tracker, or an
  execution plan
- explain the burn-down path in the final response

## Phase 6: Validate

Run the old and new validation surfaces that are safe for the local environment:

1. formatting or syntax checks for changed scripts and docs
2. generated-doc refresh plus strict drift check
3. fast local gate
4. full CI-equivalent gate when practical
5. smoke/e2e or environment-gated checks when prerequisites exist

If a check cannot run, say why and name the command the user or CI should run.

## Final Response

Summarize:

- harness gaps found
- files changed
- new or repaired commands
- validation run and results
- debt baselined or follow-up targets

End with the practical next gate to run, not with a broad invitation.
