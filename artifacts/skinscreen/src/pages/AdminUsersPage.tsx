import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import {
  Loader2,
  LogOut,
  ShieldCheck,
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Users,
  Crown,
  Sparkles,
  CircleDashed,
} from "lucide-react";
import { AdminRouteGuard } from "@/components/AdminRouteGuard";

type Bucket = "trial" | "premium" | "free" | "past_due" | "canceled";

interface UserRow {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  plan: string;
  bucket: Bucket;
  subscriptionStatus: string | null;
  trialEndsAt: string | null;
  trialDaysLeft: number | null;
  premiumUntil: string | null;
  stripeSubscriptionId: string | null;
  hasSubscription: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ListResponse {
  users: UserRow[];
  total: number;
  page: number;
  pageSize: number;
  totals: {
    total: number;
    free: number;
    premium: number;
    trial: number;
    past_due: number;
    canceled: number;
  };
}

type SortKey = "createdAt" | "email" | "plan";

const PAGE_SIZE = 50;

const BUCKET_BADGE: Record<Bucket, { label: string; className: string }> = {
  trial: { label: "Trialing", className: "bg-amber-100 text-amber-700" },
  premium: { label: "Premium", className: "bg-emerald-100 text-emerald-700" },
  free: { label: "Free", className: "bg-muted text-muted-foreground" },
  past_due: { label: "Past due", className: "bg-orange-100 text-orange-700" },
  canceled: { label: "Cancelled", className: "bg-red-100 text-red-700" },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "primary" | "amber" | "emerald" | "muted";
}) {
  const toneClass = {
    primary: "bg-primary/5 text-primary",
    amber: "bg-amber-50 text-amber-700",
    emerald: "bg-emerald-50 text-emerald-700",
    muted: "bg-muted/40 text-muted-foreground",
  }[tone];
  return (
    <div className="bg-white rounded-2xl border border-border/60 p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${toneClass}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
          {label}
        </p>
        <p className="text-xl font-serif font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

function AdminUsersPageInner() {
  const { user, logout } = useAuth();
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "") || "";

  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("createdAt");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  // Debounce typing → query.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        sort,
        dir,
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });
      if (debouncedSearch) params.set("q", debouncedSearch);
      const res = await fetch(`/api/admin/users?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        setError(json.error ?? "Failed to load users.");
        setLoading(false);
        return;
      }
      const json = (await res.json()) as ListResponse;
      setData(json);
    } catch {
      setError("Network error loading users.");
    }
    setLoading(false);
  }, [debouncedSearch, sort, dir, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const toggleSort = (key: SortKey) => {
    if (sort === key) {
      setDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSort(key);
      setDir(key === "email" ? "asc" : "desc");
    }
    setPage(1);
  };

  const totalPages = useMemo(() => {
    if (!data || data.total === 0) return 1;
    return Math.max(1, Math.ceil(data.total / data.pageSize));
  }, [data]);

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-border/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <a href={base + "/"}>
            <img
              src={`${import.meta.env.BASE_URL}images/logo-chimiq-long.png`}
              alt="Chimiq"
              className="h-8 w-auto"
            />
          </a>
          <div className="flex items-center gap-3">
            <a
              href={base + "/admin/submissions"}
              className="text-xs text-muted-foreground hover:text-foreground hidden sm:inline"
            >
              Products →
            </a>
            <a
              href={base + "/admin/recipes"}
              className="text-xs text-muted-foreground hover:text-foreground hidden sm:inline"
            >
              Recipes →
            </a>
            <a
              href={base + "/admin/funnel"}
              className="text-xs text-muted-foreground hover:text-foreground hidden sm:inline"
            >
              Funnel →
            </a>
            <span className="flex items-center gap-1.5 text-xs font-medium text-primary px-3 py-1.5 rounded-full bg-primary/10">
              <ShieldCheck className="w-3.5 h-3.5" />
              Admin
            </span>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-border/20"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-6">
          <h1 className="text-3xl font-serif font-medium text-foreground mb-1">
            Users
          </h1>
          <p className="text-muted-foreground text-base">
            Everyone who's signed up to Chimiq, with their plan, trial status,
            and signup date. Signed in as {user?.email}.
          </p>
        </div>

        {/* Headline counts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard
            icon={<Users className="w-5 h-5" />}
            label="Total users"
            value={data?.totals.total ?? 0}
            tone="primary"
          />
          <StatCard
            icon={<Sparkles className="w-5 h-5" />}
            label="In trial"
            value={data?.totals.trial ?? 0}
            tone="amber"
          />
          <StatCard
            icon={<Crown className="w-5 h-5" />}
            label="Paid premium"
            value={data?.totals.premium ?? 0}
            tone="emerald"
          />
          <StatCard
            icon={<CircleDashed className="w-5 h-5" />}
            label="Free"
            value={data?.totals.free ?? 0}
            tone="muted"
          />
        </div>

        {/* Search */}
        <div className="mb-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by email…"
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-6 text-center mb-6">
            <p className="text-red-600 font-medium">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-border/60 overflow-hidden">
          {loading && !data ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : data && data.users.length === 0 ? (
            <div className="text-center py-20 px-6">
              <p className="text-lg font-serif font-medium text-foreground mb-1">
                No users match this search
              </p>
              <p className="text-muted-foreground text-sm">
                Try a different email, or clear the search box.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 border-b border-border/40">
                  <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 font-semibold">
                      <button
                        type="button"
                        onClick={() => toggleSort("email")}
                        className="inline-flex items-center gap-1 hover:text-foreground"
                      >
                        Email
                        <ArrowUpDown
                          className={`w-3 h-3 ${sort === "email" ? "text-primary" : ""}`}
                        />
                      </button>
                    </th>
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">
                      <button
                        type="button"
                        onClick={() => toggleSort("plan")}
                        className="inline-flex items-center gap-1 hover:text-foreground"
                      >
                        Plan
                        <ArrowUpDown
                          className={`w-3 h-3 ${sort === "plan" ? "text-primary" : ""}`}
                        />
                      </button>
                    </th>
                    <th className="px-4 py-3 font-semibold">Trial</th>
                    <th className="px-4 py-3 font-semibold">
                      <button
                        type="button"
                        onClick={() => toggleSort("createdAt")}
                        className="inline-flex items-center gap-1 hover:text-foreground"
                      >
                        Signed up
                        <ArrowUpDown
                          className={`w-3 h-3 ${sort === "createdAt" ? "text-primary" : ""}`}
                        />
                      </button>
                    </th>
                    <th className="px-4 py-3 font-semibold">Last seen</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.users.map((u) => {
                    const badge = BUCKET_BADGE[u.bucket];
                    const name = [u.firstName, u.lastName].filter(Boolean).join(" ");
                    return (
                      <tr
                        key={u.id}
                        className="border-b border-border/30 last:border-b-0 hover:bg-muted/20"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="truncate font-medium text-foreground">
                              {u.email ?? "—"}
                            </span>
                            {!u.emailVerified && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 shrink-0">
                                unverified
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {name || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {u.bucket === "trial" && u.trialDaysLeft !== null
                            ? `${u.trialDaysLeft} day${u.trialDaysLeft === 1 ? "" : "s"} left`
                            : u.trialEndsAt
                              ? `Used trial · ended ${formatDate(u.trialEndsAt)}`
                              : u.hasSubscription
                                ? "No trial"
                                : "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDate(u.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDate(u.updatedAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {data && data.total > 0 && (
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-border/40 text-xs text-muted-foreground">
              <span>
                {data.total} user{data.total === 1 ? "" : "s"} · page {data.page} of{" "}
                {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || loading}
                  className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || loading}
                  className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <AdminRouteGuard>
      <AdminUsersPageInner />
    </AdminRouteGuard>
  );
}
