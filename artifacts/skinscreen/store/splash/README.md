# Splash master assets

| File | Use |
| --- | --- |
| `splash-2732.png` | Light splash — 2732×2732 master, brand cream background `#FAF7F2`, centered icon. |
| `splash-2732-dark.png` | Dark splash — 2732×2732 master, slate background `#1F2937`. |

## Regenerating per-device splashes

```bash
cd mobile/capacitor
npx @capacitor/assets generate \
  --splashBackgroundColor '#FAF7F2' \
  --splashBackgroundColorDark '#1F2937' \
  --assetPath ../../artifacts/skinscreen/store
```

Output:

* iOS: `ios/App/App/Assets.xcassets/Splash.imageset/*`
* Android: `android/app/src/main/res/drawable*/splash.png`

The launch animation is handled by `@capacitor/splash-screen` with `launchShowDuration: 1200` (see `capacitor.config.ts`). Auto-hide is on so a flash-of-blank doesn't appear on slow 3G when `server.url` is loading.
