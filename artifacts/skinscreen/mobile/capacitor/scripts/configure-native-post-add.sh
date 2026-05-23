#!/usr/bin/env bash
# Idempotent native config after cap add / cap sync (Chimiq).
# - iOS: camera + photo library usage strings, skinscreen:// deep link
# Run from artifacts/skinscreen/mobile/capacitor on macOS.

set -euo pipefail

CAP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
INFO_PLIST="$CAP_DIR/ios/App/App/Info.plist"
SCHEME="skinscreen"

if [ ! -f "$INFO_PLIST" ]; then
  echo "Missing $INFO_PLIST — run: npx cap add ios"
  exit 1
fi

add_plist_key() {
  local key="$1"
  local type="$2"
  local value="$3"
  if /usr/libexec/PlistBuddy -c "Print :$key" "$INFO_PLIST" >/dev/null 2>&1; then
    echo "iOS: $key already set"
  else
    /usr/libexec/PlistBuddy -c "Add :$key $type '$value'" "$INFO_PLIST"
    echo "iOS: added $key"
  fi
}

add_plist_key NSCameraUsageDescription string \
  "Chimiq behöver kameran för att skanna streckkoder och läsa ingredienslistor från förpackningar."
add_plist_key NSPhotoLibraryUsageDescription string \
  "Chimiq behöver tillgång till foton för att du ska kunna välja en bild av produkten."
add_plist_key NSPhotoLibraryAddUsageDescription string \
  "Chimiq kan spara produktbilder till ditt fotobibliotek."

if /usr/libexec/PlistBuddy -c "Print :ITSAppUsesNonExemptEncryption" "$INFO_PLIST" >/dev/null 2>&1; then
  echo "iOS: ITSAppUsesNonExemptEncryption already set"
else
  /usr/libexec/PlistBuddy -c "Add :ITSAppUsesNonExemptEncryption bool false" "$INFO_PLIST"
  echo "iOS: added ITSAppUsesNonExemptEncryption (export compliance)"
fi

if grep -q "<string>$SCHEME</string>" "$INFO_PLIST"; then
  echo "iOS: $SCHEME URL scheme already registered"
else
  /usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes array" "$INFO_PLIST" 2>/dev/null || true
  /usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0 dict" "$INFO_PLIST"
  /usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0:CFBundleURLName string se.seafari.chimiq.auth" "$INFO_PLIST"
  /usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0:CFBundleURLSchemes array" "$INFO_PLIST"
  /usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0:CFBundleURLSchemes:0 string $SCHEME" "$INFO_PLIST"
  echo "iOS: registered $SCHEME:// deep link"
fi

# capacitor-barcode-scanner ships QR + Code128 only; Chimiq needs retail EAN/UPC.
BARCODE_SWIFT="$CAP_DIR/node_modules/capacitor-barcode-scanner/ios/Plugin/BarcodeScannerViewController.swift"
if [ -f "$BARCODE_SWIFT" ]; then
  if grep -q '\.ean13' "$BARCODE_SWIFT"; then
    echo "iOS: barcode scanner EAN/UPC types already patched"
  else
    sed -i '' \
      's/metadataOutput.metadataObjectTypes = \[.qr,.code128\]/metadataOutput.metadataObjectTypes = [.qr, .code128, .ean13, .ean8, .upce]/' \
      "$BARCODE_SWIFT"
    echo "iOS: patched barcode scanner for EAN-13, EAN-8, UPC-E"
  fi
else
  echo "iOS: barcode scanner Swift not found — run npm install in mobile/capacitor"
fi

echo "Native post-add configuration complete."
