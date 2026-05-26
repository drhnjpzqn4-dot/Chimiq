import { Fragment, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import {
  EncyclopediaIngredientSheet,
  type EncyclopediaIngredientDetail,
} from "@/components/EncyclopediaIngredientSheet";

interface IngredientTokenProps {
  name: string;
  isRisky: boolean;
  severity?: "HIGH_RISK" | "CAUTION";
  onClick?: () => void;
}

function IngredientToken({ name, isRisky, severity, onClick }: IngredientTokenProps) {
  if (!isRisky || !onClick) {
    return <span className="text-sm text-[var(--ink-soft)]">{name}</span>;
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-sm font-medium underline decoration-dotted underline-offset-2 transition-colors ${
        severity === "HIGH_RISK"
          ? "text-red-600 hover:text-red-800"
          : "text-amber-600 hover:text-amber-800"
      }`}
    >
      {name}
    </button>
  );
}

function normalizeForLookup(name: string): string {
  let s = name.replace(/\d+(?:[.,]\d+)?\s*%/g, " ");
  s = s.replace(/\([^)]*\)/g, " ");
  s = s.toLowerCase().replace(/[^a-z0-9 -]/g, " ");
  s = s.replace(/-/g, " ");
  return s.split(/\s+/).filter(Boolean).join(" ").trim();
}

interface EncyclopediaListItem {
  slug: string;
  display: string;
  severity: "HIGH_RISK" | "CAUTION";
  aliases?: string[];
}

interface IngredientTokenListProps {
  ingredientsText: string;
  className?: string;
}

export function IngredientTokenList({ ingredientsText, className }: IngredientTokenListProps) {
  const [encyclopediaSlug, setEncyclopediaSlug] = useState<string | null>(null);
  const [encyclopediaOpen, setEncyclopediaOpen] = useState(false);

  const { data: riskMap } = useQuery({
    queryKey: ["encyclopedia-risk-map"],
    queryFn: async () => {
      const res = await apiFetch("/api/encyclopedia/ingredients?limit=200");
      if (!res.ok) throw new Error("Failed to load ingredient encyclopedia");
      const data = (await res.json()) as { items: EncyclopediaListItem[] };
      const map: Record<string, { slug: string; severity: "HIGH_RISK" | "CAUTION" }> = {};
      for (const item of data.items ?? []) {
        map[normalizeForLookup(item.display)] = { slug: item.slug, severity: item.severity };
        for (const alias of item.aliases ?? []) {
          const key = normalizeForLookup(alias);
          if (key) map[key] = { slug: item.slug, severity: item.severity };
        }
      }
      return map;
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: ingredientDetail } = useQuery({
    queryKey: ["encyclopedia-ingredient", encyclopediaSlug],
    queryFn: async (): Promise<EncyclopediaIngredientDetail | null> => {
      if (!encyclopediaSlug) return null;
      const res = await apiFetch(`/api/encyclopedia/ingredients/${encodeURIComponent(encyclopediaSlug)}`);
      if (!res.ok) throw new Error("Failed to load ingredient");
      return (await res.json()) as EncyclopediaIngredientDetail;
    },
    enabled: Boolean(encyclopediaSlug),
  });

  const tokens = ingredientsText.split(/,\s*/);

  return (
    <>
      <div className={className ?? "flex flex-wrap gap-x-1 gap-y-1"}>
        {tokens.map((token, index) => {
          const trimmed = token.trim();
          if (!trimmed) return null;
          const normalized = normalizeForLookup(trimmed);
          const risk = normalized ? riskMap?.[normalized] : undefined;
          return (
            <Fragment key={`${trimmed}-${index}`}>
              <IngredientToken
                name={trimmed}
                isRisky={Boolean(risk)}
                severity={risk?.severity}
                onClick={
                  risk
                    ? () => {
                        setEncyclopediaSlug(risk.slug);
                        setEncyclopediaOpen(true);
                      }
                    : undefined
                }
              />
              {index < tokens.length - 1 ? (
                <span className="text-sm text-[var(--ink-soft)]">, </span>
              ) : null}
            </Fragment>
          );
        })}
      </div>

      <EncyclopediaIngredientSheet
        ingredient={ingredientDetail ?? null}
        open={encyclopediaOpen}
        onClose={() => {
          setEncyclopediaOpen(false);
          setEncyclopediaSlug(null);
        }}
      />
    </>
  );
}
