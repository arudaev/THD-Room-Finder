#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROJECT_PATH="${PROJECT_PATH:-${ROOT_DIR}/ios/THDRoomFinder.xcodeproj}"
SCHEME="${SCHEME:-THDRoomFinder}"
CONFIGURATION="${CONFIGURATION:-Release}"
ARCHIVE_PATH="${ARCHIVE_PATH:-${ROOT_DIR}/ios/build/THDRoomFinder.xcarchive}"
EXPORT_PATH="${EXPORT_PATH:-${ROOT_DIR}/ios/build/testflight-export}"
EXPORT_OPTIONS_PLIST="${EXPORT_OPTIONS_PLIST:-${ROOT_DIR}/ios/build/ExportOptions-TestFlight.plist}"
APP_NAME="${APP_NAME:-THDRoomFinder}"
APPLE_TEAM_ID="${APPLE_TEAM_ID:?APPLE_TEAM_ID must be set}"
MARKETING_VERSION="${MARKETING_VERSION:-}"
BUILD_NUMBER="${BUILD_NUMBER:-}"

mkdir -p "$(dirname "${ARCHIVE_PATH}")" "${EXPORT_PATH}"
rm -rf "${ARCHIVE_PATH}" "${EXPORT_PATH}"

ARCHIVE_ARGS=(
  -project "${PROJECT_PATH}"
  -scheme "${SCHEME}"
  -configuration "${CONFIGURATION}"
  -archivePath "${ARCHIVE_PATH}"
  -destination 'generic/platform=iOS'
  DEVELOPMENT_TEAM="${APPLE_TEAM_ID}"
  CODE_SIGN_STYLE=Automatic
  archive
)

if [[ -n "${MARKETING_VERSION}" ]]; then
  ARCHIVE_ARGS=(MARKETING_VERSION="${MARKETING_VERSION}" "${ARCHIVE_ARGS[@]}")
fi

if [[ -n "${BUILD_NUMBER}" ]]; then
  ARCHIVE_ARGS=(CURRENT_PROJECT_VERSION="${BUILD_NUMBER}" "${ARCHIVE_ARGS[@]}")
fi

xcodebuild "${ARCHIVE_ARGS[@]}"

cat > "${EXPORT_OPTIONS_PLIST}" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store-connect</string>
    <key>signingStyle</key>
    <string>automatic</string>
    <key>stripSwiftSymbols</key>
    <true/>
    <key>teamID</key>
    <string>${APPLE_TEAM_ID}</string>
    <key>uploadSymbols</key>
    <true/>
</dict>
</plist>
EOF

xcodebuild \
  -exportArchive \
  -archivePath "${ARCHIVE_PATH}" \
  -exportOptionsPlist "${EXPORT_OPTIONS_PLIST}" \
  -exportPath "${EXPORT_PATH}"

IPA_PATH="$(find "${EXPORT_PATH}" -maxdepth 1 -name '*.ipa' -print -quit)"

if [[ -z "${IPA_PATH}" ]]; then
  echo "error: no IPA produced in ${EXPORT_PATH}" >&2
  exit 1
fi

echo "${IPA_PATH}"
