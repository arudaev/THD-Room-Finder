#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IOS_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
PROJECT_PATH="${PROJECT_PATH:-${IOS_DIR}/THDRoomFinder.xcodeproj}"
SCHEME="${SCHEME:-THDRoomFinder}"
CONFIGURATION="${CONFIGURATION:-Debug}"
SIMULATOR_NAME="${SIMULATOR_NAME:-iPhone 16}"
DERIVED_DATA_PATH="${DERIVED_DATA_PATH:-${IOS_DIR}/build/DerivedData}"
APP_BUNDLE_ID="${APP_BUNDLE_ID:-de.thd.roomfinder.ios}"
SCREENSHOT_PATH="${SCREENSHOT_PATH:-${IOS_DIR}/build/last-launch.png}"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "error: required command not found: $1" >&2
    exit 1
  fi
}

require_command xcodebuild
require_command xcrun

if [[ ! -d "${PROJECT_PATH}" ]]; then
  echo "error: Xcode project not found at ${PROJECT_PATH}" >&2
  exit 1
fi

SIMULATOR_UDID="$(
  xcrun simctl list devices available |
    awk -v name="${SIMULATOR_NAME}" '
      index($0, name) {
        if (match($0, /\(([0-9A-F-]{36})\)/)) {
          print substr($0, RSTART + 1, RLENGTH - 2)
          exit
        }
      }
    '
)"

if [[ -z "${SIMULATOR_UDID}" ]]; then
  echo "error: simulator '${SIMULATOR_NAME}' was not found." >&2
  echo "available devices:" >&2
  xcrun simctl list devices available >&2
  exit 1
fi

mkdir -p "${IOS_DIR}/build"

xcrun simctl boot "${SIMULATOR_UDID}" >/dev/null 2>&1 || true
open -a Simulator --args -CurrentDeviceUDID "${SIMULATOR_UDID}" >/dev/null 2>&1 || true
xcrun simctl bootstatus "${SIMULATOR_UDID}" -b

xcodebuild \
  -project "${PROJECT_PATH}" \
  -scheme "${SCHEME}" \
  -configuration "${CONFIGURATION}" \
  -destination "id=${SIMULATOR_UDID}" \
  -derivedDataPath "${DERIVED_DATA_PATH}" \
  CODE_SIGNING_ALLOWED=NO \
  build

APP_PATH="${DERIVED_DATA_PATH}/Build/Products/${CONFIGURATION}-iphonesimulator/THDRoomFinder.app"

if [[ ! -d "${APP_PATH}" ]]; then
  echo "error: built app not found at ${APP_PATH}" >&2
  exit 1
fi

xcrun simctl install "${SIMULATOR_UDID}" "${APP_PATH}"
xcrun simctl launch "${SIMULATOR_UDID}" "${APP_BUNDLE_ID}"
xcrun simctl io "${SIMULATOR_UDID}" screenshot "${SCREENSHOT_PATH}" >/dev/null

echo "scheme=${SCHEME}"
echo "simulator=${SIMULATOR_NAME}"
echo "simulator_udid=${SIMULATOR_UDID}"
echo "project=${PROJECT_PATH}"
echo "app=${APP_PATH}"
echo "screenshot=${SCREENSHOT_PATH}"
