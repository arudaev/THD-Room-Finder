#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VERSION="${1:?usage: package-ios-source-bundle.sh <version> [output_zip]}"
OUTPUT_ZIP="${2:-${ROOT_DIR}/thd-room-finder-ios-source-${VERSION}.zip}"
WORK_DIR="$(mktemp -d)"
STAGING_DIR="${WORK_DIR}/ios-source"

trap 'rm -rf "${WORK_DIR}"' EXIT

mkdir -p "${STAGING_DIR}"
cp -R "${ROOT_DIR}/ios" "${STAGING_DIR}/ios"
if [[ -f "${ROOT_DIR}/docs/iOS-Build-and-Sideload.md" ]]; then
  cp "${ROOT_DIR}/docs/iOS-Build-and-Sideload.md" "${STAGING_DIR}/iOS-Build-and-Sideload.md"
else
  echo "warning: docs/iOS-Build-and-Sideload.md not found; continuing without it" >&2
fi
if [[ -f "${ROOT_DIR}/docs/cloud-testing.md" ]]; then
  cp "${ROOT_DIR}/docs/cloud-testing.md" "${STAGING_DIR}/cloud-testing.md"
fi

(
  cd "${STAGING_DIR}"
  zip -rq "${OUTPUT_ZIP}" .
)

echo "${OUTPUT_ZIP}"
