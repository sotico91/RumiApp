#!/usr/bin/env bash
# Runs every Maestro flow in e2e/ (subflows/ are only called by them) against the
# app installed on a booted iOS simulator. Wipes the app's data on that simulator.
#   MAESTRO     maestro binary (default: on PATH, else ~/.maestro-cli/maestro/bin/maestro)
#   E2E_DEVICE  simulator id (default: the first booted one)
#   E2E_FLOW    run one flow only, e.g. E2E_FLOW=move-money
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MAESTRO="${MAESTRO:-$(command -v maestro || echo "$HOME/.maestro-cli/maestro/bin/maestro")}"
DEVICE="${E2E_DEVICE:-$(xcrun simctl list devices booted | grep -oE '[0-9A-F-]{36}' | head -1)}"

if [[ -z "$DEVICE" ]]; then
  echo "No booted simulator. Boot one and install a build first (see docs/E2E.md)." >&2
  exit 1
fi

TARGET="$ROOT/e2e"
[[ -n "${E2E_FLOW:-}" ]] && TARGET="$ROOT/e2e/$E2E_FLOW.yaml"
exec "$MAESTRO" --device "$DEVICE" test "$TARGET"
