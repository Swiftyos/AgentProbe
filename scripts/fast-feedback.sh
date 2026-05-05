#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$REPO_ROOT"

echo "=== Fast Feedback ==="

# 1. Refresh generated docs and quality score before validation.
echo "--- Refresh docs indexes ---"
bun run docs:index

echo "--- Refresh workspace docs ---"
bun run docs:workspace

echo "--- Refresh quality score ---"
bun run docs:quality

# 2. Repo validation
echo "--- Repo validation ---"
bash "$SCRIPT_DIR/validate-repo.sh"

# 3. Lint
echo "--- Lint ---"
bun run lint

# 4. Type check
echo "--- Type check ---"
bun run typecheck

# 5. Tests
echo "--- Tests ---"
bun run test

echo ""
echo "Fast feedback passed."
