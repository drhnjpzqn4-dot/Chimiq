import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "se.seafari.chimiq",
  appName: "Chimiq",
  // Point at the Vite production build directly so the documented flow
  //   pnpm --filter @workspace/skinscreen build && npx cap sync
  // works without an intermediate copy step. Path is relative to this
  // capacitor.config.ts file: artifacts/skinscreen/mobile/capacitor → ../../dist/public.
  webDir: "../../dist/public",
  bundledWebRuntime: false,
  server: {
    url: "https://chimiq.com",
    androidScheme: "https",
    iosScheme: "https",
  },
  ios: {
    contentInset: "always",
    backgroundColor: "#F5F1EB",
    limitsNavigationsToAppBoundDomains: false,
  },
  android: {
    backgroundColor: "#F5F1EB",
    allowMixedContent: false,
    captureInput: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#F5F1EB",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#F5F1EB",
      overlaysWebView: false,
    },
    // NOTE: @capacitor/camera does NOT auto-write NSCameraUsageDescription
    // into iOS Info.plist. You MUST add it manually after `npx cap add ios`.
    // See mobile/capacitor/README.md → "Mandatory post-install steps".
    // The Android CAMERA permission *is* auto-added by the plugin into
    // AndroidManifest.xml during `cap sync`.
  },
};

export default config;
