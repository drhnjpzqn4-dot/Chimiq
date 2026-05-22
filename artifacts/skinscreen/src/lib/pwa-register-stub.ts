/** No-op when VITE_CAPACITOR=true (VitePWA plugin disabled). */
export function registerSW() {
  return async () => {};
}
