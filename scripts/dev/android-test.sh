#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

if [[ "$#" -gt 0 ]]; then
  TASKS=("$@")
else
  TASKS=(test lint)
fi

"${ROOT_DIR}/gradlew" --console=plain --no-daemon "${TASKS[@]}"
