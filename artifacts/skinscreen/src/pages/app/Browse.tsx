import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  Search,
  PackageSearch,
  Loader2,
  ScanLine,
  PackagePlus,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ContributeModal } from "@/components/ContributeModal";

interface BrowseProduct {
  barcode: string;
  productName: string;
  brand: string;
  imageUrl: string | null;
  cachedAt: string;
  ingredientsPreview: string;
}

interface BrowseResponse {
  products: BrowseProduct[];
  total: number;
}

const PAGE_SIZE = 30;

function timeAgo(iso: string): string {
  const d = Date.now() - new Date(iso).getTime();
  const day = 1000 * 60 * 60 * 24;
  if (d < 1000 * 60 * 60) return "just now";
  if (d < day) return `${Math.floor(d / (1000 * 60 * 60))}h ago`;
  if (d < day * 30) return `${Math.floor(d / day)}d ago`;
  if (d < day * 365) return `${Math.floor(d / (day * 30))}mo ago`;
  return `${Math.floor(d / (day * 365))}y ago`;
}

export default function BrowseScreen() {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [products, setProducts] = useState<BrowseProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showContribute, setShowContribute] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(t);
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
          setError("Could not load products. Check your connection and try again.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debounced]);

  const scanProduct = (p: BrowseProduct) => {
    try {
      sessionStorage.setItem(
        "skinscreen.pendingScan",
        JSON.stringify({
          barcode: p.barcode,
          productName: [p.brand, p.productName].filter(Boolean).join(" "),
        }),
      );
    } catch {
      // ignore quota errors
    }
    navigate("/app/scan");
  };

  const heading = useMemo(() => {
    if (loading && products.length === 0) return "Loading the database…";
    if (debounced) return `${total} match${total === 1 ? "" : "es"} for "${debounced}"`;
    return `${total.toLocaleString()} products in the database`;
  }, [loading, products.length, debounced, total]);

  return (
    <AppShell
      title="Browse products"
      subtitle="Crowd-sourced ingredient database — search, scan, contribute."
    >
      <section className="mb-4">
        <label className="relative block">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            inputMode="search"
            placeholder="Search by product or brand…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-12 w-full rounded-2xl border border-border/50 bg-white pl-10 pr-4 text-base shadow-sm focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </label>
      </section>

      <section className="mb-3 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {heading}
        </p>
        <button
          type="button"
          onClick={() => setShowContribute(true)}
          data-touch-target
          className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
        >
          <PackagePlus className="h-3.5 w-3.5" />
          Add product
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
            {debounced ? "No products found" : "Database is empty"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Be the first to add this one — earn credit toward 1 month of free Premium.
          </p>
          <button
            type="button"
            onClick={() => setShowContribute(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/20"
          >
            <PackagePlus className="h-4 w-4" />
            Add a product
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
                onClick={() => scanProduct(p)}
                data-touch-target
                className="flex w-full items-stretch gap-3 p-3 text-left"
                aria-label={`Scan ${p.brand} ${p.productName}`}
              >
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-white to-amber-50">
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
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
                  <p className="mt-1 text-[11px] text-muted-foreground/70">
                    Added {timeAgo(p.cachedAt)}
                  </p>
                </div>
                <span className="flex shrink-0 items-center self-center rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                  <ScanLine className="mr-1 h-3.5 w-3.5" />
                  Scan
                </span>
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
