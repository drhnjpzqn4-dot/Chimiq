import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useTranslation } from "@/lib/i18n";
import {
  getStoredCookieConsent,
  hasMadeCookieChoice,
  REOPEN_COOKIE_BANNER_EVENT,
  saveCookieConsent,
} from "@/lib/cookie-consent";

const LEGAL_BASE = (() => {
  const base =
    ((import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? "/").replace(/\/+$/, "");
  return `${base}/legal`;
})();

export function CookieBanner() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    if (!hasMadeCookieChoice()) {
      const id = window.setTimeout(() => setOpen(true), 600);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, []);

  useEffect(() => {
    const reopen = () => {
      const existing = getStoredCookieConsent();
      setAnalytics(existing?.categories.analytics ?? false);
      setMarketing(existing?.categories.marketing ?? false);
      setShowDetails(true);
      setOpen(true);
    };
    window.addEventListener(REOPEN_COOKIE_BANNER_EVENT, reopen);
    return () => window.removeEventListener(REOPEN_COOKIE_BANNER_EVENT, reopen);
  }, []);

  if (!open) return null;

  const acceptAll = () => {
    saveCookieConsent({ analytics: true, marketing: true });
    setOpen(false);
  };
  const rejectAll = () => {
    saveCookieConsent({ analytics: false, marketing: false });
    setOpen(false);
  };
  const saveCurrent = () => {
    saveCookieConsent({ analytics, marketing });
    setOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-banner-title"
      className="fixed inset-x-0 bottom-0 z-[100] px-3 pb-3 sm:px-6 sm:pb-6"
      style={{ pointerEvents: "none" }}
    >
      <div
        className="mx-auto max-w-3xl rounded-2xl border border-border/60 bg-white shadow-2xl"
        style={{ pointerEvents: "auto" }}
      >
        <div className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <h2
                id="cookie-banner-title"
                className="text-base font-serif font-semibold text-foreground"
              >
                {t("cookies.title")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("cookies.intro")}{" "}
                <Link
                  href={`${LEGAL_BASE}/privacy`}
                  className="underline text-primary-strong hover:opacity-80"
                >
                  {t("cookies.privacyLink")}
                </Link>
                .
              </p>
            </div>
          </div>

          {showDetails && (
            <div className="mt-4 space-y-3 rounded-xl border border-border/60 bg-[#FAFAF8] p-3">
              <CategoryRow
                title={t("cookies.necessaryTitle")}
                desc={t("cookies.necessaryDesc")}
                checked
                disabled
                onChange={() => {}}
              />
              <CategoryRow
                title={t("cookies.analyticsTitle")}
                desc={t("cookies.analyticsDesc")}
                checked={analytics}
                onChange={setAnalytics}
              />
              <CategoryRow
                title={t("cookies.marketingTitle")}
                desc={t("cookies.marketingDesc")}
                checked={marketing}
                onChange={setMarketing}
              />
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={acceptAll}
              className="inline-flex items-center justify-center rounded-full bg-primary-strong px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-strong focus-visible:ring-offset-2"
            >
              {t("cookies.acceptAll")}
            </button>
            <button
              type="button"
              onClick={rejectAll}
              className="inline-flex items-center justify-center rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-foreground/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-strong focus-visible:ring-offset-2"
            >
              {t("cookies.rejectAll")}
            </button>
            {showDetails ? (
              <button
                type="button"
                onClick={saveCurrent}
                className="inline-flex items-center justify-center rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-foreground/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-strong focus-visible:ring-offset-2"
              >
                {t("cookies.savePrefs")}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowDetails(true)}
                className="inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium text-primary-strong transition hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-strong focus-visible:ring-offset-2"
              >
                {t("cookies.customize")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface CategoryRowProps {
  title: string;
  desc: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}

function CategoryRow({ title, desc, checked, disabled, onChange }: CategoryRowProps) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 rounded border-border accent-[hsl(var(--primary-strong))] disabled:opacity-60"
      />
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium text-foreground">{title}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{desc}</span>
      </span>
    </label>
  );
}
