#!/usr/bin/env bash
# Idempotently registers the `skinscreen://` URL scheme into the iOS and
# Android native projects after `npx cap add ios` / `npx cap add android`.
#
# Run from mobile/capacitor/ on a dev machine that already has the native
# projects generated. Safe to re-run — it will skip files that already
# contain the scheme.
set -euo pipefail

cd "$(dirname "$0")/.."

SCHEME="skinscreen"

# ----------------------------- iOS -----------------------------
PLIST="ios/App/App/Info.plist"
if [ -f "$PLIST" ]; then
  if grep -q "<string>$SCHEME</string>" "$PLIST"; then
    echo "iOS: $SCHEME scheme already registered in $PLIST"
  else
    echo "iOS: registering $SCHEME scheme in $PLIST"
    /usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes array" "$PLIST" 2>/dev/null || true
    /usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0 dict" "$PLIST"
    /usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0:CFBundleURLName string com.seafari.skinscreen" "$PLIST"
    /usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0:CFBundleURLSchemes array" "$PLIST"
    /usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0:CFBundleURLSchemes:0 string $SCHEME" "$PLIST"
  fi
else
  echo "iOS: skipped — run \`npx cap add ios\` first ($PLIST not found)"
fi

# --------------------------- Android ---------------------------
MANIFEST="android/app/src/main/AndroidManifest.xml"
if [ -f "$MANIFEST" ]; then
  if grep -q "android:scheme=\"$SCHEME\"" "$MANIFEST"; then
    echo "Android: $SCHEME scheme already registered in $MANIFEST"
  else
    echo "Android: registering $SCHEME intent-filter in $MANIFEST"
    # Insert the intent-filter right before the closing </activity> tag of the
    # MainActivity. Uses a marker comment so re-runs are safe.
    python3 - "$MANIFEST" "$SCHEME" <<'PY'
import re, sys, pathlib
path = pathlib.Path(sys.argv[1])
scheme = sys.argv[2]
src = path.read_text()
snippet = f'''
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="{scheme}" />
            </intent-filter>
        </activity>'''
new = re.sub(r"\s*</activity>", snippet, src, count=1)
path.write_text(new)
PY
  fi
else
  echo "Android: skipped — run \`npx cap add android\` first ($MANIFEST not found)"
fi

echo "Deep-link configuration complete."
