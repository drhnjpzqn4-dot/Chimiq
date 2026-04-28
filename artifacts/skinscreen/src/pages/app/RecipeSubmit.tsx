import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import {
  Plus,
  Trash2,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useTranslation } from "@/lib/i18n";

const CATEGORIES = [
  "cleanser",
  "toner",
  "serum",
  "moisturizer",
  "mask",
  "exfoliant",
  "oil",
  "balm",
  "mist",
  "scrub",
  "other",
] as const;

const SKIN_TYPES = ["dry", "oily", "combination", "sensitive", "normal", "all"] as const;

type Category = (typeof CATEGORIES)[number];
type SkinType = (typeof SKIN_TYPES)[number];

interface IngredientRow {
  name: string;
  amount: string;
  notes: string;
}

interface AiVerdict {
  riskLevel: "safe" | "caution" | "high_risk";
  summary: string;
  flagged: { ingredient: string; reason: string; severity: "info" | "warn" | "danger" }[];
  warnings: string[];
  saferSwaps: { from: string; to: string; why: string }[];
}

interface Eligibility {
  canSubmit: boolean;
  emailVerified: boolean;
  reason: "auth_required" | "email_unverified" | null;
}

export default function RecipeSubmitScreen() {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category>("serum");
  const [skinTypes, setSkinTypes] = useState<SkinType[]>(["all"]);
  const [ingredients, setIngredients] = useState<IngredientRow[]>([
    { name: "", amount: "", notes: "" },
    { name: "", amount: "", notes: "" },
  ]);
  const [method, setMethod] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<AiVerdict | null>(null);
  const [scannerUnavailable, setScannerUnavailable] = useState(false);
  const [success, setSuccess] = useState(false);

  const RISK_STYLES: Record<AiVerdict["riskLevel"], { bg: string; text: string; label: string; icon: typeof CheckCircle2 }> = useMemo(
    () => ({
      safe: { bg: "bg-green-50 border-green-200", text: "text-green-700", label: t("recipeDetail.riskSafe"), icon: CheckCircle2 },
      caution: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", label: t("recipeDetail.riskCaution"), icon: AlertTriangle },
      high_risk: { bg: "bg-red-50 border-red-200", text: "text-red-700", label: t("recipeDetail.riskHigh"), icon: ShieldAlert },
    }),
    [t],
  );

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      const base = (import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "") || "";
      window.location.href = `/api/login?returnTo=${encodeURIComponent(base + "/app/recipes/new")}`;
      return;
    }
    fetch("/api/recipes/eligibility", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setEligibility(d as Eligibility))
      .catch(() => setEligibility({ canSubmit: false, emailVerified: false, reason: "auth_required" }));
  }, [isAuthenticated, isLoading]);

  const updateIngredient = (idx: number, field: keyof IngredientRow, value: string) => {
    setIngredients((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  };

  const addIngredient = () => {
    if (ingredients.length >= 40) return;
    setIngredients((prev) => [...prev, { name: "", amount: "", notes: "" }]);
  };

  const removeIngredient = (idx: number) => {
    if (ingredients.length <= 2) return;
    setIngredients((prev) => prev.filter((_, i) => i !== idx));
  };

  const toggleSkinType = (s: SkinType) => {
    setSkinTypes((prev) => {
      if (s === "all") return ["all"];
      const next = prev.filter((x) => x !== "all");
      return next.includes(s) ? next.filter((x) => x !== s) : [...next, s];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setVerdict(null);

    const cleaned = ingredients
      .map((r) => ({
        name: r.name.trim(),
        amount: r.amount.trim() || undefined,
        notes: r.notes.trim() || undefined,
      }))
      .filter((r) => r.name.length > 0);

    if (title.trim().length < 3) {
      setError(t("recipeSubmit.errorTitleShort"));
      return;
    }
    if (cleaned.length < 2) {
      setError(t("recipeSubmit.errorMin2"));
      return;
    }
    if (method.trim().length < 10) {
      setError(t("recipeSubmit.errorMethodShort"));
      return;
    }
    if (skinTypes.length === 0) {
      setError(t("recipeSubmit.errorSkinType"));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          category,
          skinTypes,
          ingredients: cleaned,
          method: method.trim(),
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        aiVerdict?: AiVerdict | null;
        scannerUnavailable?: boolean;
      };
      if (!res.ok) {
        setError(data.error ?? t("recipeSubmit.errorSubmit"));
        setSubmitting(false);
        return;
      }
      setVerdict(data.aiVerdict ?? null);
      setScannerUnavailable(!!data.scannerUnavailable);
      setSuccess(true);
    } catch {
      setError(t("recipeSubmit.errorNetwork"));
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || !eligibility) {
    return (
      <AppShell title={t("recipeSubmit.headerLoading")}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  if (!eligibility.canSubmit) {
    return (
      <AppShell title={t("recipeSubmit.headerLoading")}>
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-center">
          <Mail className="mx-auto mb-3 h-8 w-8 text-amber-600" />
          <h2 className="font-serif text-lg font-semibold text-foreground">
            {t("recipeSubmit.verifyEmailTitle")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("recipeSubmit.verifyEmailBody")}
          </p>
          <button
            type="button"
            onClick={() => navigate("/app/profile")}
            className="mt-4 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary/90"
          >
            {t("recipeSubmit.backToProfile")}
          </button>
        </div>
      </AppShell>
    );
  }

  if (success) {
    const style = verdict ? RISK_STYLES[verdict.riskLevel] : null;
    const Icon = style?.icon;
    return (
      <AppShell title={t("recipeSubmit.headerSuccess")}>
        <div className="space-y-4">
          <div className="rounded-3xl border border-green-200 bg-green-50 p-5">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              <p className="font-semibold">{t("recipeSubmit.thanksHeadline")}</p>
            </div>
            <p className="mt-2 text-sm text-green-700/90">
              {verdict ? t("recipeSubmit.thanksBodyWithVerdict") : t("recipeSubmit.thanksBodyNoVerdict")}
            </p>
          </div>

          {verdict && style && Icon && (
            <div className={`rounded-3xl border ${style.bg} p-5`}>
              <div className={`flex items-center gap-2 ${style.text}`}>
                <Icon className="h-5 w-5" />
                <p className="font-semibold">{t("recipeDetail.aiSafetyScan", { label: style.label })}</p>
              </div>
              <p className="mt-2 text-sm text-foreground/80">{verdict.summary}</p>

              {verdict.flagged.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("recipeDetail.flagged")}
                  </p>
                  <ul className="mt-2 space-y-2">
                    {verdict.flagged.map((f, i) => (
                      <li key={i} className="rounded-xl bg-white/70 p-3 text-sm">
                        <p className="font-semibold">{f.ingredient}</p>
                        <p className="text-muted-foreground">{f.reason}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {verdict.saferSwaps.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("recipeDetail.saferSwaps")}
                  </p>
                  <ul className="mt-2 space-y-2">
                    {verdict.saferSwaps.map((s, i) => (
                      <li key={i} className="rounded-xl bg-white/70 p-3 text-sm">
                        <p>
                          {t("recipeDetail.replacePrefix")} <span className="font-semibold">{s.from}</span>{" "}
                          {t("recipeDetail.replaceWith")}{" "}
                          <span className="font-semibold">{s.to}</span>
                        </p>
                        <p className="text-muted-foreground">{s.why}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {!verdict && (
            <div className="rounded-3xl border border-border/60 bg-muted/30 p-5 text-sm text-muted-foreground">
              {scannerUnavailable
                ? t("recipeSubmit.scannerOffline")
                : t("recipeSubmit.scannerCouldnt")}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setSuccess(false);
                setVerdict(null);
                setScannerUnavailable(false);
                setTitle("");
                setIngredients([
                  { name: "", amount: "", notes: "" },
                  { name: "", amount: "", notes: "" },
                ]);
                setMethod("");
              }}
              className="flex-1 rounded-full border border-border bg-white px-5 py-2.5 text-sm font-semibold hover:bg-muted"
            >
              {t("recipeSubmit.submitAnother")}
            </button>
            <button
              type="button"
              onClick={() => navigate("/app/profile")}
              className="flex-1 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90"
            >
              {t("recipeSubmit.backToProfile")}
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={t("recipeSubmit.shareTitle")}
      subtitle={t("recipeSubmit.shareSubtitle")}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("recipeSubmit.recipeTitleLabel")}
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder={t("recipeSubmit.recipeTitlePlaceholder")}
            className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("recipeSubmit.categoryLabel")}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm capitalize focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c} className="capitalize">
                  {t(`recipes.cat.${c}`, {})}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("recipeSubmit.skinTypesLabel")}
            </label>
            <div className="flex flex-wrap gap-2 pt-1">
              {SKIN_TYPES.map((s) => {
                const active = skinTypes.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSkinType(s)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                      active
                        ? "border-primary bg-primary text-white"
                        : "border-border bg-white text-foreground hover:bg-muted"
                    }`}
                  >
                    {t(`recipes.skin.${s}`, {})}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("recipeSubmit.ingredientsLabel", { count: ingredients.length })}
            </label>
            <button
              type="button"
              onClick={addIngredient}
              disabled={ingredients.length >= 40}
              className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" />
              {t("recipeSubmit.add")}
            </button>
          </div>
          <div className="space-y-2">
            {ingredients.map((row, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-[2fr_1fr_2fr]">
                  <input
                    type="text"
                    value={row.name}
                    onChange={(e) => updateIngredient(idx, "name", e.target.value)}
                    placeholder={t("recipeSubmit.ingredientPlaceholder")}
                    maxLength={120}
                    className="rounded-xl border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <input
                    type="text"
                    value={row.amount}
                    onChange={(e) => updateIngredient(idx, "amount", e.target.value)}
                    placeholder={t("recipeSubmit.amountPlaceholder")}
                    maxLength={60}
                    className="rounded-xl border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <input
                    type="text"
                    value={row.notes}
                    onChange={(e) => updateIngredient(idx, "notes", e.target.value)}
                    placeholder={t("recipeSubmit.notesPlaceholder")}
                    maxLength={200}
                    className="rounded-xl border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeIngredient(idx)}
                  disabled={ingredients.length <= 2}
                  className="mt-1 rounded-lg p-2 text-muted-foreground hover:bg-muted disabled:opacity-30"
                  aria-label={t("recipeSubmit.removeIngredient")}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("recipeSubmit.methodLabel")}
          </label>
          <textarea
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            rows={5}
            maxLength={4000}
            placeholder={t("recipeSubmit.methodPlaceholder")}
            className="w-full resize-none rounded-2xl border border-border bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
          <p className="flex items-center gap-1.5 font-medium text-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            {t("recipeSubmit.whatNext")}
          </p>
          <p className="mt-1">
            {t("recipeSubmit.whatNextBody")}
          </p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("recipeSubmit.scanAndSave")}
            </>
          ) : (
            t("recipeSubmit.submitForReview")
          )}
        </button>
      </form>
    </AppShell>
  );
}

// Local mail icon to avoid extra import (reuse lucide).
function Mail(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}
