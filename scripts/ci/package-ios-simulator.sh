#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROJECT_PATH="${PROJECT_PATH:-${ROOT_DIR}/ios/THDRoomFinder.xcodeproj}"
SCHEME="${SCHEME:-THDRoomFinder}"
CONFIGURATION="${CONFIGURATION:-Debug}"
APP_NAME="${APP_NAME:-THDRoomFinder}"
DERIVED_DATA_PATH="${DERIVED_DATA_PATH:-${ROOT_DIR}/ios/build/DerivedData}"
OUTPUT_ZIP="${OUTPUT_ZIP:-${ROOT_DIR}/ios/build/${APP_NAME}-ios-simulator-$(echo "${CONFIGURATION}" | tr '[:upper:]' '[:lower:]').zip}"

mkdir -p "${DERIVED_DATA_PATH}" "$(dirname "${OUTPUT_ZIP}")"
rm -f "${OUTPUT_ZIP}"

xcodebuild \
  -project "${PROJECT_PATH}" \
  -scheme "${SCHEME}" \
  -configuration "${CONFIGURATION}" \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath "${DERIVED_DATA_PATH}" \
  CODE_SIGNING_ALLOWED=NO \
  build

APP_PATH="${DERIVED_DATA_PATH}/Build/Products/${CONFIGURATION}-iphonesimulator/${APP_NAME}.app"

if [[ ! -d "${APP_PATH}" ]]; then
  echo "error: simulator app not found at ${APP_PATH}" >&2
  exit 1
fi

ditto -c -k --sequesterRsrc --keepParent "${APP_PATH}" "${OUTPUT_ZIP}"

echo "${OUTPUT_ZIP}"
