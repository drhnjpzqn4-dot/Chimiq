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
            <CookieIllustration />
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

function CookieIllustration() {
  return (
    <div
      aria-hidden="true"
      className="shrink-0 mt-0.5 cookie-banner-wiggle"
      style={{ width: 44, height: 44 }}
    >
      <style>{`
        @keyframes cookie-banner-wiggle {
          0%   { transform: rotate(0deg) scale(1); }
          15%  { transform: rotate(-8deg) scale(1.05); }
          30%  { transform: rotate(7deg) scale(1.05); }
          45%  { transform: rotate(-5deg) scale(1.03); }
          60%  { transform: rotate(3deg) scale(1.02); }
          100% { transform: rotate(0deg) scale(1); }
        }
        .cookie-banner-wiggle {
          animation: cookie-banner-wiggle 1.1s ease-in-out 0.2s 1;
          transform-origin: 50% 55%;
        }
        @media (prefers-reduced-motion: reduce) {
          .cookie-banner-wiggle { animation: none; }
        }
      `}</style>
      <svg
        viewBox="0 0 64 64"
        width="44"
        height="44"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="cookieDough" cx="40%" cy="35%" r="75%">
            <stop offset="0%" stopColor="#E8C68A" />
            <stop offset="55%" stopColor="#C9904A" />
            <stop offset="100%" stopColor="#8B5A2B" />
          </radialGradient>
        </defs>
        {/* Cookie body with a bite taken out (top-right) */}
        <path
          d="M32 4
             a28 28 0 1 0 0.01 0
             Z
             M54 14
             c-3 4 -8 4 -10 0
             c-2 -4 2 -8 6 -7
             c4 1 6 3 4 7 Z"
          fill="url(#cookieDough)"
          stroke="#6B3F1A"
          strokeWidth="1.2"
          fillRule="evenodd"
        />
        {/* Bite scallops */}
        <circle cx="49" cy="9" r="2.2" fill="#6B3F1A" opacity="0.35" />
        <circle cx="56" cy="14" r="2" fill="#6B3F1A" opacity="0.35" />
        <circle cx="52" cy="18" r="1.8" fill="#6B3F1A" opacity="0.35" />
        {/* Chocolate chips */}
        <ellipse cx="22" cy="22" rx="4.2" ry="3.4" fill="#3B1E0F" />
        <ellipse cx="38" cy="34" rx="4.8" ry="3.8" fill="#3B1E0F" />
        <ellipse cx="20" cy="42" rx="3.6" ry="3" fill="#3B1E0F" />
        <ellipse cx="42" cy="50" rx="3.4" ry="2.8" fill="#3B1E0F" />
        <ellipse cx="14" cy="32" rx="2.6" ry="2.2" fill="#3B1E0F" />
        <ellipse cx="30" cy="14" rx="2.4" ry="2" fill="#3B1E0F" />
        {/* Chip highlights for a little shine */}
        <ellipse cx="21" cy="20.5" rx="1.1" ry="0.7" fill="#7a4423" opacity="0.7" />
        <ellipse cx="37" cy="32.5" rx="1.3" ry="0.8" fill="#7a4423" opacity="0.7" />
        {/* Crumbs */}
        <circle cx="9" cy="48" r="1.1" fill="#C9904A" />
        <circle cx="55" cy="38" r="1" fill="#C9904A" />
        <circle cx="48" cy="56" r="1.2" fill="#C9904A" />
      </svg>
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
