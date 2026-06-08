import { useCallback, useEffect, useState } from "react";
import { Loader2, Flag, RotateCcw } from "lucide-react";
import { apiFetch } from "@/lib/api";

// SS-081d: admin-vy för felrapporter (chimiq.com/admin). Läser /api/admin/reports.
interface Report {
  id: string | number;
  barcode: string;
  reason: string;
  reportedBy: string | null;
  createdAt: string;
  productName: string | null;
  brand: string | null;
}

export function ReportsAdmin() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/admin/reports", { credentials: "include" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Failed to load reports.");
        setLoading(false);
        return;
      }
      const data = (await res.json()) as { reports: Report[] };
      setReports(data.reports);
    } catch {
      setError("Network error loading reports.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchReports();
  }, [fetchReports]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-serif font-medium text-foreground mb-1 flex items-center gap-2">
            <Flag className="w-5 h-5 text-rose-500" />
            Product reports
          </h2>
          <p className="text-muted-foreground text-sm">
            User-submitted “incorrect info” reports. Also emailed to hello@chimiq.com when Resend is configured.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void fetchReports()}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-border/20"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-6 text-center">
          <p className="text-red-600 font-medium">{error}</p>
        </div>
      )}

      {!loading && !error && reports.length === 0 && (
        <div className="rounded-2xl bg-white border border-border/60 p-10 text-center">
          <p className="text-muted-foreground text-sm">No reports yet.</p>
        </div>
      )}

      {!loading && !error && reports.length > 0 && (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl border border-border/60 shadow-sm p-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {r.productName?.trim() || "(unknown product)"}
                    {r.brand && (
                      <span className="font-normal text-muted-foreground"> · {r.brand}</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{r.barcode}</p>
                </div>
                <p className="text-xs text-muted-foreground shrink-0">
                  {new Date(r.createdAt).toLocaleString()}
                  {r.reportedBy ? ` · ${r.reportedBy.slice(0, 8)}…` : ""}
                </p>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-foreground/90">{r.reason}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
