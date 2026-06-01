import type { CapacitorConfig } from "@capacitor/cli";

/**
 * SkinScreen Capacitor configuration.
 *
 * Reader-pattern wrapper:
 *  - The native shell loads the live web app (server.url) so all features —
 *    crowdsourced DB, AI scans, gamification — stay in sync without app updates.
 *  - Payments live ONLY on the web (Stripe). The mobile app must NOT contain
 *    any IAP / subscribe button per Apple §3.1.3(a) reader-app rules.
 *  - Sign-in opens the system browser via @capacitor/browser, then deep-links
 *    back to skinscreen://auth/callback (handled in src/hooks/useNativeAuthDeepLink.ts).
 *
 * Override server.url with CAP_SERVER_URL=https://staging.example.com pnpm sync
 * for staging builds. Leave undefined to bundle the local /dist (offline shell).
 */
const SERVER_URL =
  process.env.CAP_SERVER_URL ?? "https://app.skinscreen.chimiq.com";

const config: CapacitorConfig = {
  appId: "com.seafari.skinscreen",
  appName: "SkinScreen",
  webDir: "../../artifacts/skinscreen/dist",
  bundledWebRuntime: false,
  server: {
    url: SERVER_URL,
    cleartext: false,
    androidScheme: "https",
    allowNavigation: [
      "*.skinscreen.chimiq.com",
      "*.chimiq.com",
      "checkout.stripe.com",
      "billing.stripe.com",
      "*.replit.app",
      "*.replit.dev",
    ],
  },
  ios: {
    contentInset: "always",
    limitsNavigationsToAppBoundDomains: false,
    backgroundColor: "#FAF7F2",
  },
  android: {
    backgroundColor: "#FAF7F2",
    allowMixedContent: false,
    captureInput: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#FAF7F2",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#FAF7F2",
    },
  },
};

export default config;
