import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { useTranslation } from "@/lib/i18n";
import {
  hasAcceptedCurrentTerms,
  saveConsent,
} from "@/lib/legal-consent";

interface ConsentGateContext {
  requestLogin: (returnTo?: string) => void;
  hasConsented: boolean;
  resetConsent: () => void;
}

const Ctx = createContext<ConsentGateContext | null>(null);

export function useLoginWithConsent(): ConsentGateContext {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("useLoginWithConsent must be used inside <ConsentGateProvider>");
  }
  return ctx;
}

const LEGAL_BASE = (() => {
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "");
  return `${base}/legal`;
})();

interface ProviderProps {
  children: ReactNode;
}

export function ConsentGateProvider({ children }: ProviderProps) {
  const { login, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const [hasConsented, setHasConsented] = useState<boolean>(() =>
    hasAcceptedCurrentTerms(),
  );
  const pendingReturnToRef = useRef<string | undefined>(undefined);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // Re-check storage when the auth state flips (covers the case where the
  // user already accepted earlier on this device and is signing back in).
  useEffect(() => {
    setHasConsented(hasAcceptedCurrentTerms());
  }, [isAuthenticated]);

  const proceed = useCallback(
    (returnTo?: string) => {
      login(returnTo);
    },
    [login],
  );

  const requestLogin = useCallback(
    (returnTo?: string) => {
      if (hasAcceptedCurrentTerms()) {
        proceed(returnTo);
        return;
      }
      pendingReturnToRef.current = returnTo;
      setChecked(false);
      setOpen(true);
    },
    [proceed],
  );

  const resetConsent = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem("skinscreen.legal.consent");
    } catch {
      // ignore
    }
    setHasConsented(false);
  }, []);

  const onAccept = useCallback(() => {
    if (!checked) return;
    saveConsent();
    setHasConsented(true);
    setOpen(false);
    const target = pendingReturnToRef.current;
    pendingReturnToRef.current = undefined;
    proceed(target);
  }, [checked, proceed]);

  const onCancel = useCallback(() => {
    setOpen(false);
    pendingReturnToRef.current = undefined;
  }, []);

  // Close on Escape; trap focus inside the dialog
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    // focus the checkbox first so a user can immediately tick & continue
    const root = dialogRef.current;
    const checkbox = root?.querySelector<HTMLInputElement>(
      'input[type="checkbox"]',
    );
    checkbox?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  const value = useMemo<ConsentGateContext>(
    () => ({ requestLogin, hasConsented, resetConsent }),
    [requestLogin, hasConsented, resetConsent],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="consent-gate-title"
          aria-describedby="consent-gate-desc"
          className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-sm px-4 py-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) onCancel();
          }}
        >
          <div
            ref={dialogRef}
            className="w-full max-w-md bg-card text-card-foreground border border-border rounded-2xl shadow-2xl p-6 sm:p-7"
          >
            <h2
              id="consent-gate-title"
              className="text-xl font-serif font-semibold mb-2"
            >
              {t("consent.title")}
            </h2>
            <p
              id="consent-gate-desc"
              className="text-sm text-muted-foreground leading-relaxed mb-5"
            >
              {t("consent.intro")}
            </p>

            <label className="flex items-start gap-3 text-sm leading-relaxed cursor-pointer select-none mb-6">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 rounded border-border text-primary focus:ring-2 focus:ring-primary"
                aria-describedby="consent-gate-desc"
                data-testid="consent-checkbox"
              />
              <span>
                {t("consent.checkboxPrefix")}{" "}
                <a
                  href={`${LEGAL_BASE}/terms`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline text-primary font-medium hover:text-primary/80"
                >
                  {t("consent.linkTerms")}
                </a>
                {", "}
                <a
                  href={`${LEGAL_BASE}/privacy`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline text-primary font-medium hover:text-primary/80"
                >
                  {t("consent.linkPrivacy")}
                </a>
                {t("consent.checkboxAnd")}
                <a
                  href={`${LEGAL_BASE}/medical-disclaimer`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline text-primary font-medium hover:text-primary/80"
                >
                  {t("consent.linkDisclaimer")}
                </a>
                {t("consent.checkboxSuffix")}
              </span>
            </label>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="px-5 py-2.5 rounded-full border border-border text-foreground hover:bg-border/30 text-sm font-medium transition-colors"
              >
                {t("consent.cancel")}
              </button>
              <button
                type="button"
                onClick={onAccept}
                disabled={!checked}
                data-testid="consent-continue"
                className="px-5 py-2.5 rounded-full bg-primary text-white text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90"
              >
                {t("consent.continue")}
              </button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
