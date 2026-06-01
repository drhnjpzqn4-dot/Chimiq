#!/usr/bin/env bash
# Create the SkinScreen Android upload keystore.
#
# Run ONCE on the dev machine that will own the upload key. The resulting
# .jks is what Google Play Console will pin as the upload key for the app.
# Lose it → you must contact Google to reset, which takes days.
#
# Usage (interactive, prompts for passwords):
#     bash scripts/create-android-keystore.sh
#
# Or non-interactive:
#     KEYSTORE_PASSWORD=... KEY_PASSWORD=... bash scripts/create-android-keystore.sh
#
# Output: android/keystores/skinscreen-upload.jks  (gitignored)
set -euo pipefail

cd "$(dirname "$0")/.."

KEYSTORE_DIR="android/keystores"
KEYSTORE_PATH="$KEYSTORE_DIR/skinscreen-upload.jks"
KEY_ALIAS="skinscreen-upload"
VALIDITY_DAYS=10000   # ~27 years; Play requires >= 25 years from build date
DNAME="CN=SkinScreen, O=Seafari, L=Stockholm, C=SE"

if ! command -v keytool >/dev/null 2>&1; then
  echo "ERROR: keytool not found. Install JDK 17 (e.g. \`brew install --cask temurin@17\`)." >&2
  exit 1
fi

if [ -f "$KEYSTORE_PATH" ]; then
  echo "ERROR: $KEYSTORE_PATH already exists. Refusing to overwrite." >&2
  echo "       If you really want a new key, move the old one aside first." >&2
  exit 1
fi

mkdir -p "$KEYSTORE_DIR"

ARGS=(
  -genkeypair
  -v
  -keystore "$KEYSTORE_PATH"
  -alias "$KEY_ALIAS"
  -keyalg RSA
  -keysize 2048
  -validity "$VALIDITY_DAYS"
  -dname "$DNAME"
)

if [ -n "${KEYSTORE_PASSWORD:-}" ] && [ -n "${KEY_PASSWORD:-}" ]; then
  ARGS+=(-storepass "$KEYSTORE_PASSWORD" -keypass "$KEY_PASSWORD")
fi

keytool "${ARGS[@]}"

echo
echo "Created $KEYSTORE_PATH"
echo
echo "Next steps:"
echo "  1. Copy mobile/capacitor/android/gradle.properties.example to"
echo "     mobile/capacitor/android/gradle.properties and fill in the passwords."
echo "  2. Run: bash scripts/configure-android-signing.sh"
echo "  3. Back up the .jks AND the passwords somewhere safe (1Password etc.)."
echo "     Without them you cannot ship updates to the same Play listing."
