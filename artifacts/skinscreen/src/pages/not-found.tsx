import { useLocation } from "wouter";
import { AlertCircle } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export default function NotFound() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: "var(--cream)" }}
    >
      <div
        className="w-full max-w-sm rounded-3xl border border-border/40 bg-white p-6 shadow-sm text-center"
      >
        <AlertCircle className="mx-auto mb-3 h-10 w-10" style={{ color: "var(--rose-gold)" }} />
        <h1 className="font-serif text-xl font-semibold" style={{ color: "var(--ink)" }}>
          {t("notFound.title")}
        </h1>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--ink-soft)" }}>
          {t("notFound.body")}
        </p>
        <button
          type="button"
          onClick={() => navigate("/app")}
          className="mt-5 w-full rounded-2xl py-3 text-sm font-semibold text-white"
          style={{ backgroundColor: "var(--sage)" }}
        >
          {t("notFound.goHome")}
        </button>
      </div>
    </div>
  );
}
