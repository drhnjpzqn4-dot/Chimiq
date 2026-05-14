import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerServiceWorker } from "./lib/register-sw";
import { installNativeFetchInterceptor } from "./lib/native";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { supabase } from "./lib/supabase";

// On Capacitor iOS/Android, the WebView origin is capacitor://localhost (iOS)
// or https://localhost (Android), so relative /api/* fetches would hit the
// local origin instead of the deployed backend. Rewrite them transparently.
installNativeFetchInterceptor();

setAuthTokenGetter(async () => {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
});

createRoot(document.getElementById("root")!).render(<App />);

registerServiceWorker();
