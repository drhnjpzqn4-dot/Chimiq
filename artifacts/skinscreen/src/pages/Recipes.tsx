import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import {
  AlertTriangle,
  CheckCircle2,
  Filter,
  Loader2,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";

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

const RISK_BADGE: Record<RiskLevel, { bg: string; text: string; label: string; Icon: typeof CheckCircle2 }> = {
  safe: { bg: "bg-green-100", text: "text-green-700", label: "Safe", Icon: CheckCircle2 },
  caution: { bg: "bg-amber-100", text: "text-amber-700", label: "Caution", Icon: AlertTriangle },
  high_risk: { bg: "bg-red-100", text: "text-red-700", label: "High risk", Icon: ShieldAlert },
};

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<RecipeCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("all");
  const [skinType, setSkinType] = useState<(typeof SKIN_TYPES)[number]>("all");
  const [risk, setRisk] = useState<(typeof RISK_LEVELS)[number]>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams();
    if (category !== "all") params.set("category", category);
    if (skinType !== "all") params.set("skinType", skinType);
    if (risk !== "all") params.set("riskLevel", risk);
    setRecipes(null);
    setError(null);
    fetch(`/api/recipes?${params.toString()}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setError(d.error);
        } else {
          setRecipes(d.recipes ?? []);
        }
      })
      .catch(() => setError("Could not load recipes."));
  }, [category, skinType, risk]);

  const activeFilterCount = useMemo(
    () => (category !== "all" ? 1 : 0) + (skinType !== "all" ? 1 : 0) + (risk !== "all" ? 1 : 0),
    [category, skinType, risk],
  );

  return (
    <AppShell
      title="DIY recipes"
      subtitle="Community-shared at-home formulas, scanned by our AI and reviewed by SkinScreen admins."
      rightSlot={
        <Link
          href="/app/recipes/new"
          data-touch-target
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-primary/90"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Share
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
            Filters
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
              Clear filters
            </button>
          )}
        </div>

        {filtersOpen && (
          <div className="rounded-3xl border border-border/60 bg-white p-4 space-y-4">
            <FilterRow label="Category" options={CATEGORIES} value={category} onChange={setCategory} />
            <FilterRow label="Skin type" options={SKIN_TYPES} value={skinType} onChange={setSkinType} />
            <FilterRow
              label="Risk level"
              options={RISK_LEVELS}
              value={risk}
              onChange={setRisk}
              displayLabel={(v) => (v === "high_risk" ? "high risk" : v)}
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
            No recipes match these filters yet. Try clearing them or be the first to share one.
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
                      <h3 className="font-serif text-lg font-semibold leading-tight text-foreground">
                        {r.title}
                      </h3>
                      {badge && (
                        <span
                          className={`inline-flex shrink-0 items-center gap-1 rounded-full ${badge.bg} px-2 py-0.5 text-[10px] font-semibold ${badge.text}`}
                        >
                          <badge.Icon className="h-3 w-3" />
                          {badge.label}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                      {r.category} · {r.skinTypes.join(", ")}
                    </p>
                    {r.aiVerdict?.summary && (
                      <p className="mt-2 line-clamp-2 text-sm text-foreground/80">
                        {r.aiVerdict.summary}
                      </p>
                    )}
                    <p className="mt-3 text-xs text-muted-foreground">
                      {r.ingredients.length} ingredient{r.ingredients.length === 1 ? "" : "s"}
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
                  ? "border-primary bg-primary text-white"
                  : "border-border bg-white text-foreground hover:bg-muted"
              }`}
            >
              {displayLabel ? displayLabel(o) : o}
            </button>
          );
        })}
      </div>
    </div>
  );
}
