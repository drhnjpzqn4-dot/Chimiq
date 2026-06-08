import type { CapacitorConfig } from "@capacitor/cli";

// ARKITEKTUR (BESLUT 2026-05-31): Chimiq är en INBYGGD app (väg B).
// Appen laddar alltid sina egna filer från webDir i en uppladdad build.
//
// Live-reload under utveckling: sätt CAP_SERVER_URL i terminalen INNAN cap sync,
// t.ex.   CAP_SERVER_URL=http://192.168.x.x:5173 npx cap run ios
// Då laddar simulatorn/telefonen från din dev-server så du ser ändringar direkt.
// Lämna variabeln OSATT för alla builds du laddar upp till TestFlight/App Store.
// server.url får ALDRIG hårdkodas här (det orsakade build 9-kraschen).
const DEV_SERVER_URL = process.env.CAP_SERVER_URL;

const config: CapacitorConfig = {
  appId: "se.seafari.chimiq",
  appName: "Chimiq",
  // Sökväg relativt denna fil: artifacts/skinscreen/mobile/capacitor → ../../dist/public.
  // Byggflöde:  pnpm --filter @workspace/skinscreen build && npx cap sync
  webDir: "../../dist/public",
  server: {
    androidScheme: "https",
    iosScheme: "https",
    // Endast satt om CAP_SERVER_URL finns (dev). Annars helt utelämnad → bundlat.
    ...(DEV_SERVER_URL ? { url: DEV_SERVER_URL, cleartext: true } : {}),
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
