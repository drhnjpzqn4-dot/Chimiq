#!/usr/bin/env bash
# Verify the iOS + Android native projects have the four required entries
# that Capacitor does NOT write automatically. Run after every `cap sync`
# (and especially after the first `cap add`).
#
# Exits non-zero if any required entry is missing, with a pointer to the
# README section that explains how to fix it.

set -u

# By default, MISSING ios/ or android/ projects are a hard error — the only
# legitimate use of this script is AFTER `cap add` has scaffolded them. Pass
# `--allow-missing` (or set ALLOW_MISSING=1) when intentionally running before
# cap add (e.g. from the Linux dev environment that cannot scaffold either).
ALLOW_MISSING="${ALLOW_MISSING:-0}"
for arg in "$@"; do
  case "$arg" in
    --allow-missing) ALLOW_MISSING=1 ;;
  esac
done

CAP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
INFO_PLIST="$CAP_DIR/ios/App/App/Info.plist"
ANDROID_MANIFEST="$CAP_DIR/android/app/src/main/AndroidManifest.xml"

red() { printf '\033[31m%s\033[0m\n' "$1"; }
green() { printf '\033[32m%s\033[0m\n' "$1"; }
yellow() { printf '\033[33m%s\033[0m\n' "$1"; }

errors=0

check_ios() {
  if [ ! -f "$INFO_PLIST" ]; then
    if [ "$ALLOW_MISSING" = "1" ]; then
      yellow "[ios] $INFO_PLIST not found — run \`npx cap add ios\` from a Mac. Skipping iOS checks (--allow-missing)."
      return
    fi
    red "[ios] MISSING: $INFO_PLIST — run \`npx cap add ios\` from a Mac before invoking this script. Pass --allow-missing to skip."
    errors=$((errors + 1))
    return
  fi

  if grep -q "NSCameraUsageDescription" "$INFO_PLIST"; then
    green "[ios] NSCameraUsageDescription present"
  else
    red "[ios] MISSING: NSCameraUsageDescription in $INFO_PLIST"
    red "       → Add the <key>NSCameraUsageDescription</key> block from README → 'Mandatory post-install steps → iOS'."
    errors=$((errors + 1))
  fi

  if grep -q "CFBundleURLSchemes" "$INFO_PLIST" && grep -q "<string>skinscreen</string>" "$INFO_PLIST"; then
    green "[ios] skinscreen URL scheme registered"
  else
    red "[ios] MISSING: CFBundleURLTypes with skinscreen scheme in $INFO_PLIST"
    red "       → Add the <key>CFBundleURLTypes</key> block from README → 'Mandatory post-install steps → iOS'."
    errors=$((errors + 1))
  fi
}

check_android() {
  if [ ! -f "$ANDROID_MANIFEST" ]; then
    if [ "$ALLOW_MISSING" = "1" ]; then
      yellow "[android] $ANDROID_MANIFEST not found — run \`npx cap add android\`. Skipping Android checks (--allow-missing)."
      return
    fi
    red "[android] MISSING: $ANDROID_MANIFEST — run \`npx cap add android\` before invoking this script. Pass --allow-missing to skip."
    errors=$((errors + 1))
    return
  fi

  if grep -q "android.permission.CAMERA" "$ANDROID_MANIFEST"; then
    green "[android] CAMERA permission present"
  else
    red "[android] MISSING: android.permission.CAMERA in $ANDROID_MANIFEST"
    red "          → Should be auto-added by @capacitor/camera. Re-run \`npx cap sync android\`."
    errors=$((errors + 1))
  fi

  if grep -q 'android:scheme="skinscreen"' "$ANDROID_MANIFEST"; then
    green "[android] skinscreen deep-link intent-filter registered"
  else
    red "[android] MISSING: <intent-filter> with android:scheme=\"skinscreen\" in $ANDROID_MANIFEST"
    red "          → Add the <intent-filter> block from README → 'Mandatory post-install steps → Android'."
    errors=$((errors + 1))
  fi
}

echo "Verifying native configuration in $CAP_DIR ..."
check_ios
check_android
echo

if [ "$errors" -gt 0 ]; then
  red "FAILED — $errors required entr(ies) missing. The app will crash on camera access or fail to handle sign-in deep links until you fix them."
  exit 1
fi

green "OK — all required native entries present."
