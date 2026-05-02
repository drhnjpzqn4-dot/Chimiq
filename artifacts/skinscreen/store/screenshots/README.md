# Store screenshots — capture guide

The store listings need real device screenshots. Capture them on the **demo account** (see `reviewer-notes.md`) so the shelf and scan history look populated.

## iOS — App Store Connect requires

Two device classes are mandatory; the rest are optional but improve listing quality.

| Class | Resolution | How to capture |
| --- | --- | --- |
| **6.7" iPhone** (15 Pro Max, 14 Pro Max, 16 Pro Max) | 1290×2796 | Xcode Simulator → iPhone 15 Pro Max → ⌘S |
| **6.5" iPhone** (11 Pro Max) | 1242×2688 or 1284×2778 | Same, iPhone 11 Pro Max simulator |
| 12.9" iPad Pro (optional) | 2048×2732 | iPad Pro simulator |

Save into `screenshots/ios/<device-name>/01-scan.png` … `05-profile.png`.

## Android — Play Console requires

| Class | Resolution | How to capture |
| --- | --- | --- |
| **Phone** (≥1080×1920, 16:9 or 9:16) | 1080×1920 minimum, up to 8 shots | Pixel 8 Pro emulator → Volume Down + Power |
| **7" tablet** (optional) | 1200×1920 | Nexus 7 emulator |
| **10" tablet** (optional) | 1600×2560 | Pixel C emulator |

Save into `screenshots/android/<device-name>/01-scan.png` …

## Recommended screen order (both stores)

1. **Scan tab — empty state** with "Scan barcode" hero affordance.
2. **Scan result** — a real product (Cetaphil Daily Facial Moisturizer) showing two flagged ingredients with citation cards.
3. **Browse** — "Verified safe" filter chip selected, grid of product tiles.
4. **Routine cross-check** — 3 products in shelf with "1 conflict found" banner.
5. **Profile** — Premium badge, contributions progress ring, "30 contributions = 1 free month".

Add an overlay headline (we use Figma template `figma.com/file/chimiq-store-screens` — ask the design team for access) so each screen reads as a feature poster, not a bare screenshot.
