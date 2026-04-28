import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ExternalLink, Loader2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export interface IngredientDetailFlag {
  severity: "HIGH_RISK" | "CAUTION" | "SAFE" | string;
  explanation?: string | null;
  citation?: string | null;
  citationUrl?: string | null;
  category?: string | null;
}

interface LookupResponse {
  name: string;
  functions: string | null;
  regulatoryStatus: string | null;
  restrictionDetail: string | null;
  annexReference: string | null;
  pubchemCid: string | null;
  iupacName: string | null;
  safetyFlags: string[];
  hasData: boolean;
}

export function IngredientDetailSheet({
  open,
  onOpenChange,
  ingredient,
  flag,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  ingredient: string | null;
  flag?: IngredientDetailFlag | null;
}) {
  const [data, setData] = useState<LookupResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch lookup data whenever the sheet opens with a fresh ingredient name.
  useEffect(() => {
    if (!open || !ingredient) {
      setData(null);
      setError(null);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    fetch(`/api/ingredients/lookup?name=${encodeURIComponent(ingredient)}`, {
      credentials: "include",
      signal: ctrl.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<LookupResponse>;
      })
      .then((d) => setData(d))
      .catch((e: unknown) => {
        if ((e as { name?: string })?.name === "AbortError") return;
        setError("Couldn't load ingredient details.");
      })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [open, ingredient]);

  const isHighRisk = flag?.severity === "HIGH_RISK";
  const isCaution = flag?.severity === "CAUTION";
  const flagged = Boolean(flag) && (isHighRisk || isCaution);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-t-0 max-h-[85vh] overflow-y-auto p-0"
      >
        <div className="mx-auto h-1 w-10 rounded-full bg-muted-foreground/20 mt-2" />

        <SheetHeader className="px-5 pt-4 pb-2 text-left space-y-2">
          <div className="flex items-start gap-2.5">
            <SheetTitle className="font-serif text-xl leading-tight text-foreground flex-1 min-w-0">
              {ingredient ?? ""}
            </SheetTitle>
            {flagged && (
              <Badge
                variant={isHighRisk ? "destructive" : "warning"}
                className="shrink-0 text-[10px] font-sans tracking-wide uppercase"
              >
                {isHighRisk ? "HIGH RISK" : "CAUTION"}
              </Badge>
            )}
            {!flagged && data?.hasData === false && (
              <Badge variant="secondary" className="shrink-0 text-[10px] font-sans uppercase">
                No flags
              </Badge>
            )}
          </div>
          {data?.iupacName && data.iupacName.toLowerCase() !== ingredient?.toLowerCase() && (
            <SheetDescription className="text-xs italic text-muted-foreground">
              IUPAC: {data.iupacName}
            </SheetDescription>
          )}
        </SheetHeader>

        <div className="px-5 pb-6 pt-2 space-y-4">
          {/* Flag-specific explanation (high risk / caution) */}
          {flagged && flag?.explanation && (
            <div
              className={cn(
                "rounded-2xl border p-4",
                isHighRisk
                  ? "bg-red-50/60 border-red-200"
                  : "bg-amber-50/40 border-amber-200/70",
              )}
            >
              <div className="flex items-start gap-2 mb-2">
                <AlertTriangle
                  className={cn(
                    "w-4 h-4 mt-0.5 shrink-0",
                    isHighRisk ? "text-red-600" : "text-amber-600",
                  )}
                />
                <p className="text-[13px] font-semibold text-foreground">
                  {isHighRisk ? "Why it's high risk" : "Why to use with caution"}
                </p>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {flag.explanation}
              </p>
              {flag.citation && (
                <a
                  href={flag.citationUrl ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-start gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <ExternalLink className="w-3 h-3 mt-0.5 shrink-0" />
                  <span className="italic leading-snug">
                    <span className="font-semibold not-italic">Source: </span>
                    {flag.citation}
                  </span>
                </a>
              )}
            </div>
          )}

          {/* What this ingredient does (from CosIng) */}
          {data?.functions && (
            <section className="rounded-2xl border border-border/50 bg-white p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-1.5">
                What it does
              </p>
              <p className="text-sm text-foreground leading-relaxed">
                {data.functions}
              </p>
            </section>
          )}

          {/* Regulatory status (CosIng / EU Cosmetics) */}
          {data?.regulatoryStatus && (
            <section className="rounded-2xl border border-border/50 bg-white p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-1.5">
                EU regulatory status
              </p>
              <p className="text-sm text-foreground leading-relaxed">
                {data.regulatoryStatus}
                {data.annexReference && (
                  <span className="text-muted-foreground"> ({data.annexReference})</span>
                )}
              </p>
              {data.restrictionDetail && (
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  {data.restrictionDetail}
                </p>
              )}
            </section>
          )}

          {/* Safety flags from PubChem (only for non-flagged ingredients;
              flagged ones already explained above) */}
          {!flagged && data?.safetyFlags && data.safetyFlags.length > 0 && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-amber-700">
                  PubChem safety flags
                </p>
              </div>
              <ul className="space-y-1">
                {data.safetyFlags.map((s) => (
                  <li key={s} className="text-sm text-amber-900 leading-relaxed">
                    • {s}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Loading / empty / error states */}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading details…
            </div>
          )}
          {!loading && !error && data && !data.hasData && !flagged && (
            <div className="flex items-start gap-2 rounded-2xl border border-green-200 bg-green-50/50 p-4">
              <ShieldCheck className="w-4 h-4 mt-0.5 text-green-600 shrink-0" />
              <p className="text-sm text-foreground leading-relaxed">
                No conflicts or safety concerns flagged in our database for this
                ingredient.
              </p>
            </div>
          )}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {data?.pubchemCid && (
            <a
              href={`https://pubchem.ncbi.nlm.nih.gov/compound/${data.pubchemCid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              View on PubChem
            </a>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
