import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  Search,
  PackageSearch,
  Loader2,
  PackagePlus,
  Sparkles,
  Check,
  ChevronRight,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ContributeModal } from "@/components/ContributeModal";
import { useTranslation } from "@/lib/i18n";

interface BrowseProduct {
  barcode: string;
  productName: string;
  brand: string;
  imageUrl: string | null;
  cachedAt: string;
  category: string;
  verifiedSafe: boolean;
  ingredientsPreview: string;
}

interface BrowseResponse {
  products: BrowseProduct[];
  total: number;
}

const PAGE_SIZE = 30;

const CATEGORY_KEYS: Array<{ key: string; labelKey: string }> = [
  { key: "", labelKey: "browse.cat.all" },
  { key: "cleanser", labelKey: "browse.cat.cleanser" },
  { key: "toner", labelKey: "browse.cat.toner" },
  { key: "serum", labelKey: "browse.cat.serum" },
  { key: "moisturizer", labelKey: "browse.cat.moisturizer" },
  { key: "sunscreen", labelKey: "browse.cat.sunscreen" },
  { key: "exfoliant", labelKey: "browse.cat.exfoliant" },
  { key: "mask", labelKey: "browse.cat.mask" },
];

export default function BrowseScreen() {
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [category, setCategory] = useState<string>("");
  const [products, setProducts] = useState<BrowseProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showContribute, setShowContribute] = useState(false);

  const timeAgo = useMemo(
    () => (iso: string): string => {
      const d = Date.now() - new Date(iso).getTime();
      const day = 1000 * 60 * 60 * 24;
      if (d < 1000 * 60 * 60) return t("browse.timeJustNow");
      if (d < day) return t("browse.timeHoursAgo", { n: Math.floor(d / (1000 * 60 * 60)) });
      if (d < day * 30) return t("browse.timeDaysAgo", { n: Math.floor(d / day) });
      if (d < day * 365) return t("browse.timeMonthsAgo", { n: Math.floor(d / (day * 30)) });
      return t("browse.timeYearsAgo", { n: Math.floor(d / (day * 365)) });
    },
    [t],
  );

  useEffect(() => {
    const tt = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(tt);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: "0",
    });
    if (debounced) params.set("q", debounced);
    if (category) params.set("category", category);

    fetch(`/api/products?${params.toString()}`, { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as BrowseResponse;
      })
      .then((data) => {
        if (cancelled) return;
        setProducts(data.products ?? []);
        setTotal(data.total ?? 0);
      })
      .catch(() => {
        if (!cancelled) {
          setProducts([]);
          setError(t("browse.errorLoad"));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debounced, category, t]);

  const heading = useMemo(() => {
    if (loading && products.length === 0) return t("browse.loadingDb");
    if (debounced) {
      const key = total === 1 ? "browse.matches_one" : "browse.matches_other";
      return t(key, { count: total, q: debounced });
    }
    if (category) {
      return t("browse.categoryProducts", {
        count: total.toLocaleString(),
        category: t(`browse.cat.${category}`),
      });
    }
    return t("browse.totalProducts", { count: total.toLocaleString() });
  }, [loading, products.length, debounced, total, category, t]);

  return (
    <AppShell title={t("browse.title")} subtitle={t("browse.subtitle")}>
      <section className="mb-3">
        <label className="relative block">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            inputMode="search"
            placeholder={t("browse.searchPlaceholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-12 w-full rounded-2xl border border-border/50 bg-white pl-10 pr-4 text-base shadow-sm focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </label>
      </section>

      <section className="mb-4 -mx-1 overflow-x-auto px-1 pb-1">
        <div className="flex min-w-max gap-2">
          {CATEGORY_KEYS.map((c) => {
            const active = c.key === category;
            return (
              <button
                key={c.key || "all"}
                type="button"
                onClick={() => setCategory(c.key)}
                data-touch-target
                aria-pressed={active}
                className={`min-h-[44px] whitespace-nowrap rounded-full border px-4 py-2 text-xs font-semibold transition-all ${
                  active
                    ? "border-primary bg-primary text-white shadow-sm"
                    : "border-border/60 bg-white text-foreground hover:border-primary/40"
                }`}
              >
                {t(c.labelKey)}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mb-3 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {heading}
        </p>
        <button
          type="button"
          onClick={() => setShowContribute(true)}
          data-touch-target
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
        >
          <PackagePlus className="h-3.5 w-3.5" />
          {t("browse.addProduct")}
        </button>
      </section>

      {error && (
        <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading && products.length === 0 ? (
        <ul className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <li
              key={i}
              className="h-24 animate-pulse rounded-3xl border border-border/30 bg-white"
            />
          ))}
        </ul>
      ) : products.length === 0 ? (
        <div className="rounded-3xl border border-border/40 bg-white p-8 text-center shadow-sm">
          <PackageSearch className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 font-serif text-lg font-semibold text-foreground">
            {debounced || category ? t("browse.noProductsFound") : t("browse.dbEmpty")}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("browse.beFirst")}
          </p>
          <button
            type="button"
            onClick={() => setShowContribute(true)}
            className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/20"
          >
            <PackagePlus className="h-4 w-4" />
            {t("browse.addAProduct")}
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {products.map((p) => (
            <li
              key={p.barcode}
              className="overflow-hidden rounded-3xl border border-border/40 bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              <button
                type="button"
                onClick={() => navigate(`/app/browse/${encodeURIComponent(p.barcode)}`)}
                data-touch-target
                className="flex min-h-[44px] w-full items-stretch gap-3 p-3 text-left"
                aria-label={t("browse.openProduct", { brand: p.brand, name: p.productName })}
              >
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-white to-amber-50">
                  {p.imageUrl ? (
                    <img
                      src={p.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <Sparkles className="h-6 w-6 text-primary/60" aria-hidden />
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center">
                  {p.brand && (
                    <p className="truncate text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                      {p.brand}
                    </p>
                  )}
                  <p className="truncate font-serif text-base font-semibold text-foreground">
                    {p.productName}
                  </p>
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                    {p.ingredientsPreview}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    {p.verifiedSafe && (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                        <Check className="mr-1 h-[14px] w-[14px] shrink-0" aria-hidden />
                        {t("browse.verifiedSafe")}
                      </span>
                    )}
                    <span className="text-[11px] text-muted-foreground/70">
                      {t("browse.added", { time: timeAgo(p.cachedAt) })}
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 self-center text-muted-foreground/60" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {loading && products.length > 0 && (
        <div className="mt-4 flex items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      )}

      {showContribute && (
        <ContributeModal onClose={() => setShowContribute(false)} />
      )}
    </AppShell>
  );
}
