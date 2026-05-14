import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import {
  AlertTriangle,
  Ban,
  Check,
  Filter,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useTranslation } from "@/lib/i18n";
import { apiFetch } from "@/lib/api";

const CATEGORIES = [
  "all",
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

const SKIN_TYPES = ["all", "dry", "oily", "combination", "sensitive", "normal"] as const;

const RISK_LEVELS = ["all", "safe", "caution", "high_risk"] as const;

type RiskLevel = "safe" | "caution" | "high_risk";

interface RecipeCard {
  id: string;
  title: string;
  category: string;
  skinTypes: string[];
  ingredients: { name: string }[];
  riskLevel: RiskLevel | null;
  photoUrl: string | null;
  aiVerdict: { summary: string } | null;
}

export default function RecipesPage() {
  const { t } = useTranslation();
  const [recipes, setRecipes] = useState<RecipeCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("all");
  const [skinType, setSkinType] = useState<(typeof SKIN_TYPES)[number]>("all");
  const [risk, setRisk] = useState<(typeof RISK_LEVELS)[number]>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const RISK_BADGE: Record<
    RiskLevel,
    {
      pill: { backgroundColor: string; color: string };
      label: string;
      Icon: typeof Check | typeof AlertTriangle | typeof Ban;
    }
  > = useMemo(
    () => ({
      safe: {
        pill: { backgroundColor: "#E8F2E5", color: "var(--sage-deep)" },
        label: t("recipes.badgeSafe"),
        Icon: Check,
      },
      caution: {
        pill: { backgroundColor: "#FBF3DC", color: "#8A6217" },
        label: t("recipes.badgeCaution"),
        Icon: AlertTriangle,
      },
      high_risk: {
        pill: { backgroundColor: "#FCE4E0", color: "#8C2A1A" },
        label: t("recipes.badgeHighRisk"),
        Icon: Ban,
      },
    }),
    [t],
  );

  useEffect(() => {
    const params = new URLSearchParams();
    if (category !== "all") params.set("category", category);
    if (skinType !== "all") params.set("skinType", skinType);
    if (risk !== "all") params.set("riskLevel", risk);
    setRecipes(null);
    setError(null);
    apiFetch(`/api/recipes?${params.toString()}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setError(d.error);
        } else {
          setRecipes(d.recipes ?? []);
        }
      })
      .catch(() => setError(t("recipes.errorLoad")));
  }, [category, skinType, risk, t]);

  const activeFilterCount = useMemo(
    () => (category !== "all" ? 1 : 0) + (skinType !== "all" ? 1 : 0) + (risk !== "all" ? 1 : 0),
    [category, skinType, risk],
  );

  return (
    <AppShell
      title={t("recipes.title")}
      subtitle={t("recipes.subtitle")}
      rightSlot={
        <Link
          href="/app/recipes/new"
          data-touch-target
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-primary/90"
        >
          <Sparkles className="h-3.5 w-3.5" />
          {t("recipes.share")}
        </Link>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
          >
            <Filter className="h-3.5 w-3.5" />
            {t("recipes.filters")}
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setCategory("all");
                setSkinType("all");
                setRisk("all");
              }}
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
              {t("recipes.clearFilters")}
            </button>
          )}
        </div>

        {filtersOpen && (
          <div className="rounded-3xl border border-border/60 bg-white p-4 space-y-4">
            <FilterRow
              label={t("recipes.category")}
              options={CATEGORIES}
              value={category}
              onChange={(v) => setCategory(v)}
              displayLabel={(v) => t(`recipes.cat.${v}`)}
            />
            <FilterRow
              label={t("recipes.skinType")}
              options={SKIN_TYPES}
              value={skinType}
              onChange={(v) => setSkinType(v)}
              displayLabel={(v) => t(`recipes.skin.${v}`)}
            />
            <FilterRow
              label={t("recipes.riskLevel")}
              options={RISK_LEVELS}
              value={risk}
              onChange={(v) => setRisk(v)}
              displayLabel={(v) => t(`recipes.risk.${v}`)}
            />
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!recipes && !error && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        )}

        {recipes && recipes.length === 0 && (
          <div className="rounded-3xl border border-border/60 bg-muted/30 p-8 text-center text-sm text-muted-foreground">
            {t("recipes.empty")}
          </div>
        )}

        {recipes && recipes.length > 0 && (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {recipes.map((r) => {
              const badge = r.riskLevel ? RISK_BADGE[r.riskLevel] : null;
              return (
                <li key={r.id}>
                  <Link
                    href={`/recipes/${r.id}`}
                    className="block rounded-3xl border border-border/60 bg-white p-4 transition-colors hover:border-primary/40 hover:bg-primary/5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-serif text-lg font-medium leading-tight text-foreground">
                        {r.title}
                      </h3>
                      {badge && (
                        <span
                          className="inline-flex shrink-0 items-center gap-1 rounded-full font-semibold"
                          style={{
                            ...badge.pill,
                            fontSize: 10,
                            padding: "3px 8px",
                            fontWeight: 600,
                          }}
                        >
                          <badge.Icon className="h-[14px] w-[14px] shrink-0" aria-hidden />
                          {badge.label}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                      {t(`recipes.cat.${r.category}`, {})} · {r.skinTypes.map((s) => t(`recipes.skin.${s}`, {})).join(", ")}
                    </p>
                    {r.aiVerdict?.summary && (
                      <p className="mt-2 line-clamp-2 text-sm text-foreground/80">
                        {r.aiVerdict.summary}
                      </p>
                    )}
                    <p className="mt-3 text-xs text-muted-foreground">
                      {t(
                        r.ingredients.length === 1 ? "recipes.ingredient_one" : "recipes.ingredient_other",
                        { n: r.ingredients.length },
                      )}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppShell>
  );
}

function FilterRow<T extends string>({
  label,
  options,
  value,
  onChange,
  displayLabel,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  displayLabel?: (v: T) => string;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const active = o === value;
          return (
            <button
              key={o}
              type="button"
              onClick={() => onChange(o)}
              className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors ${
                active
                  ? "text-white"
                  : "border-[var(--line)] bg-white text-[var(--ink)] hover:bg-[var(--cream)]"
              }`}
              style={active ? { borderColor: "var(--sage)", backgroundColor: "var(--sage)" } : { borderColor: "var(--line)" }}
            >
              {displayLabel ? displayLabel(o) : o}
            </button>
          );
        })}
      </div>
    </div>
  );
}
