#!/usr/bin/env bash
set -euo pipefail

PLATFORM=""
FILE_PATH=""
API_TOKEN="${APPETIZE_API_TOKEN:-}"
PUBLIC_KEY="${APPETIZE_PUBLIC_KEY:-}"
NOTE=""
SUMMARY_FILE="${GITHUB_STEP_SUMMARY:-}"
RUN_PERMISSION="${APPETIZE_RUN_PERMISSION:-public}"
PYTHON_BIN="${PYTHON_BIN:-}"

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --platform)
      PLATFORM="$2"
      shift 2
      ;;
    --file)
      FILE_PATH="$2"
      shift 2
      ;;
    --token)
      API_TOKEN="$2"
      shift 2
      ;;
    --public-key)
      PUBLIC_KEY="$2"
      shift 2
      ;;
    --note)
      NOTE="$2"
      shift 2
      ;;
    --summary-file)
      SUMMARY_FILE="$2"
      shift 2
      ;;
    *)
      echo "error: unknown argument '$1'" >&2
      exit 1
      ;;
  esac
done

if [[ -z "${PLATFORM}" || -z "${FILE_PATH}" ]]; then
  echo "usage: upload-appetize.sh --platform <ios|android> --file <path> [--token <api token>] [--public-key <public key>] [--note <note>] [--summary-file <path>]" >&2
  exit 1
fi

if [[ -z "${API_TOKEN}" ]]; then
  echo "error: Appetize API token is required" >&2
  exit 1
fi

if [[ ! -f "${FILE_PATH}" ]]; then
  echo "error: build artifact not found at ${FILE_PATH}" >&2
  exit 1
fi

if [[ -z "${PYTHON_BIN}" ]]; then
  if command -v python3 >/dev/null 2>&1; then
    PYTHON_BIN="python3"
  elif command -v python >/dev/null 2>&1; then
    PYTHON_BIN="python"
  else
    echo "error: python3 or python is required to parse the Appetize API response" >&2
    exit 1
  fi
fi

ENDPOINT="https://api.appetize.io/v1/apps"
if [[ -n "${PUBLIC_KEY}" ]]; then
  ENDPOINT="${ENDPOINT}/${PUBLIC_KEY}"
fi

RESPONSE_FILE="$(mktemp)"
trap 'rm -f "${RESPONSE_FILE}"' EXIT

CURL_ARGS=(
  -sS
  -o "${RESPONSE_FILE}"
  -w "%{http_code}"
  -X POST "${ENDPOINT}"
  -H "X-API-KEY: ${API_TOKEN}"
  -F "file=@${FILE_PATH}"
  -F "platform=${PLATFORM}"
  -F "appPermissions.run=${RUN_PERMISSION}"
)

if [[ -n "${NOTE}" ]]; then
  CURL_ARGS+=(-F "note=${NOTE}")
fi

HTTP_STATUS="$(curl "${CURL_ARGS[@]}")"

if [[ "${HTTP_STATUS}" -lt 200 || "${HTTP_STATUS}" -ge 300 ]]; then
  echo "error: Appetize upload failed with HTTP ${HTTP_STATUS}" >&2
  cat "${RESPONSE_FILE}" >&2
  exit 1
fi

PUBLIC_KEY_RESULT="$("${PYTHON_BIN}" - "${RESPONSE_FILE}" <<'PY'
import json
import sys

with open(sys.argv[1], "r", encoding="utf-8") as handle:
    payload = json.load(handle)

print(payload.get("publicKey", ""))
PY
)"

VERSION_CODE_RESULT="$("${PYTHON_BIN}" - "${RESPONSE_FILE}" <<'PY'
import json
import sys

with open(sys.argv[1], "r", encoding="utf-8") as handle:
    payload = json.load(handle)

print(payload.get("versionCode", ""))
PY
)"

APP_URL="https://appetize.io/app/${PUBLIC_KEY_RESULT}"

case "${PLATFORM}" in
  ios)
    PLATFORM_LABEL="iOS"
    ;;
  android)
    PLATFORM_LABEL="Android"
    ;;
  *)
    PLATFORM_LABEL="${PLATFORM}"
    ;;
esac

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  {
    echo "public-key=${PUBLIC_KEY_RESULT}"
    echo "app-url=${APP_URL}"
    echo "version-code=${VERSION_CODE_RESULT}"
  } >> "${GITHUB_OUTPUT}"
fi

if [[ -n "${SUMMARY_FILE}" ]]; then
  {
    echo "### Appetize ${PLATFORM_LABEL} Preview"
    echo
    echo "- App URL: ${APP_URL}"
    echo "- Version code: ${VERSION_CODE_RESULT:-unknown}"
    if [[ -z "${PUBLIC_KEY}" ]]; then
      echo "- Newly created public key: \`${PUBLIC_KEY_RESULT}\`"
      echo "- Save this as a repository variable so future uploads update the same Appetize app."
    fi
    echo
  } >> "${SUMMARY_FILE}"
fi

echo "${APP_URL}"
