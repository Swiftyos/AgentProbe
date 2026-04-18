# Tech Debt Tracker

Known cleanup work that should remain visible until it is planned or fixed.

## Active themes

- Add explicit coverage and type-safety ratchets once the Bun + TypeScript
  runtime stabilizes enough for thresholds to be meaningful.
- Add executable observability and latency-budget assertions for critical paths.

## Promotion rule

Move an item into `active/` when it requires sequencing, explicit ownership, or
multi-step validation. Remove it from this file once it is represented by an
active plan or has been shipped.
