#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TASK="${1:-assembleDebug}"

"${ROOT_DIR}/gradlew" --console=plain --no-daemon "${TASK}"
