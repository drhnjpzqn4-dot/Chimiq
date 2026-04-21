import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";

type RiskLevel = "safe" | "caution" | "high_risk";

interface AiVerdict {
  riskLevel: RiskLevel;
  summary: string;
  flagged: { ingredient: string; reason: string; severity: "info" | "warn" | "danger" }[];
  warnings: string[];
  saferSwaps: { from: string; to: string; why: string }[];
  reviewedAt?: string;
  modelVersion?: string;
}

interface Recipe {
  id: string;
  title: string;
  category: string;
  skinTypes: string[];
  ingredients: { name: string; amount?: string; notes?: string }[];
  method: string;
  photoUrl: string | null;
  aiVerdict: AiVerdict | null;
  riskLevel: RiskLevel | null;
  adminNote: string | null;
  createdAt: string;
}

const RISK_STYLES: Record<RiskLevel, { bg: string; text: string; label: string; Icon: typeof CheckCircle2 }> = {
  safe: { bg: "bg-green-50 border-green-200", text: "text-green-700", label: "Looks safe", Icon: CheckCircle2 },
  caution: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", label: "Use with caution", Icon: AlertTriangle },
  high_risk: { bg: "bg-red-50 border-red-200", text: "text-red-700", label: "High risk", Icon: ShieldAlert },
};

export default function RecipeDetailPage() {
  const [, params] = useRoute("/recipes/:id");
  const id = params?.id;
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setRecipe(null);
    setError(null);
    fetch(`/api/recipes/${id}`, { credentials: "include" })
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) {
          setError(d.error ?? "Recipe not found.");
        } else {
          setRecipe(d.recipe);
        }
      })
      .catch(() => setError("Could not load recipe."));
  }, [id]);

  if (error) {
    return (
      <AppShell title="Recipe">
        <BackLink />
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {error}
        </div>
      </AppShell>
    );
  }

  if (!recipe) {
    return (
      <AppShell title="Recipe">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  const verdict = recipe.aiVerdict;
  const style = verdict ? RISK_STYLES[verdict.riskLevel] : null;

  return (
    <AppShell title={recipe.title}>
      <BackLink />

      <div className="mt-4 space-y-5">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-muted px-2.5 py-0.5 font-medium capitalize text-foreground">
            {recipe.category}
          </span>
          {recipe.skinTypes.map((t) => (
            <span
              key={t}
              className="rounded-full border border-border bg-white px-2.5 py-0.5 capitalize text-muted-foreground"
            >
              {t}
            </span>
          ))}
        </div>

        {verdict && style && (
          <div className={`rounded-3xl border ${style.bg} p-5`}>
            <div className={`flex items-center gap-2 ${style.text}`}>
              <style.Icon className="h-5 w-5" />
              <p className="font-semibold">AI safety scan: {style.label}</p>
            </div>
            <p className="mt-2 text-sm text-foreground/80">{verdict.summary}</p>

            {verdict.warnings.length > 0 && (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-foreground/80">
                {verdict.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            )}

            {verdict.flagged.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Flagged ingredients
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
                  Safer swaps
                </p>
                <ul className="mt-2 space-y-2">
                  {verdict.saferSwaps.map((s, i) => (
                    <li key={i} className="rounded-xl bg-white/70 p-3 text-sm">
                      <p>
                        Replace <span className="font-semibold">{s.from}</span> with{" "}
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

        <section className="rounded-3xl border border-border/60 bg-white p-5">
          <h2 className="font-serif text-lg font-semibold text-foreground">Ingredients</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {recipe.ingredients.map((ing, i) => (
              <li key={i} className="flex items-start justify-between gap-3 border-b border-border/40 pb-2 last:border-0 last:pb-0">
                <div>
                  <p className="font-medium text-foreground">{ing.name}</p>
                  {ing.notes && <p className="text-xs text-muted-foreground">{ing.notes}</p>}
                </div>
                {ing.amount && (
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {ing.amount}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-3xl border border-border/60 bg-white p-5">
          <h2 className="font-serif text-lg font-semibold text-foreground">Method</h2>
          <p className="mt-3 whitespace-pre-line text-sm text-foreground/85">
            {recipe.method}
          </p>
        </section>

        {recipe.adminNote && (
          <section className="rounded-3xl border border-primary/20 bg-primary/5 p-5">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Editor's note
            </p>
            <p className="mt-2 whitespace-pre-line text-sm text-foreground/85">
              {recipe.adminNote}
            </p>
          </section>
        )}

        <div className="rounded-2xl border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
          DIY recipes are user contributions. Patch-test on a small area before applying to your face,
          and stop use immediately if irritation occurs.
        </div>
      </div>
    </AppShell>
  );
}

function BackLink() {
  return (
    <Link
      href="/recipes"
      className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      All recipes
    </Link>
  );
}
