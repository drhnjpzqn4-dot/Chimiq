#!/usr/bin/env bash
# Idempotently wire the upload keystore into android/app/build.gradle so that
# `./gradlew bundleRelease` produces a signed .aab.
#
# Reads passwords from android/gradle.properties (which is gitignored). Use
# android/gradle.properties.example as a template.
#
# Run from mobile/capacitor/ after `npx cap add android` and after
# create-android-keystore.sh has produced android/keystores/skinscreen-upload.jks.
set -euo pipefail

cd "$(dirname "$0")/.."

GRADLE="android/app/build.gradle"
PROPS="android/gradle.properties"
KEYSTORE="android/keystores/skinscreen-upload.jks"
MARKER="// skinscreen-signing-config"

if [ ! -f "$GRADLE" ]; then
  echo "ERROR: $GRADLE not found. Run \`npx cap add android\` first." >&2
  exit 1
fi
if [ ! -f "$KEYSTORE" ]; then
  echo "ERROR: $KEYSTORE not found. Run \`bash scripts/create-android-keystore.sh\` first." >&2
  exit 1
fi
if [ ! -f "$PROPS" ]; then
  echo "ERROR: $PROPS not found. Copy gradle.properties.example to gradle.properties and fill it in." >&2
  exit 1
fi

if grep -q "$MARKER" "$GRADLE"; then
  echo "Signing config already present in $GRADLE — nothing to do."
  exit 0
fi

python3 - "$GRADLE" "$MARKER" <<'PY'
import re, sys, pathlib
path, marker = sys.argv[1], sys.argv[2]
src = path.read_text()

signing_block = f"""
    {marker}
    signingConfigs {{
        release {{
            if (project.hasProperty('SKINSCREEN_KEYSTORE_PATH')) {{
                storeFile file(SKINSCREEN_KEYSTORE_PATH)
                storePassword SKINSCREEN_KEYSTORE_PASSWORD
                keyAlias SKINSCREEN_KEY_ALIAS
                keyPassword SKINSCREEN_KEY_PASSWORD
            }}
        }}
    }}
"""

# Insert signingConfigs immediately inside `android {`.
new = re.sub(
    r"(android\s*\{)",
    r"\1" + signing_block,
    src,
    count=1,
)

# Attach signingConfig to buildTypes.release { ... }. If the release block
# doesn't exist (older templates), add it.
if re.search(r"buildTypes\s*\{[^}]*release\s*\{", new, re.S):
    new = re.sub(
        r"(buildTypes\s*\{[^}]*release\s*\{)",
        r"\1\n            signingConfig signingConfigs.release",
        new,
        count=1,
    )
else:
    new = re.sub(
        r"(buildTypes\s*\{)",
        r"""\1
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
        }""",
        new,
        count=1,
    )

path.write_text(new)
PY

echo "Patched $GRADLE with signing config."
echo "You can now run: npm run build:android"
