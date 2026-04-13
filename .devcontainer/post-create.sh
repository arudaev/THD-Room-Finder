#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

chmod +x "${ROOT_DIR}/gradlew" || true

if [[ -d "${ROOT_DIR}/scripts" ]]; then
  find "${ROOT_DIR}/scripts" -type f -name '*.sh' -exec chmod +x {} +
fi

echo "Codespaces Android toolchain ready."
echo "ANDROID_SDK_ROOT=${ANDROID_SDK_ROOT:-unset}"
echo "JAVA_HOME=${JAVA_HOME:-unset}"

"${ROOT_DIR}/gradlew" --version
