import { useState } from "react";
import { Flag, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";

interface ReportProductButtonProps {
  barcode: string;
}

export function ReportProductButton({ barcode }: ReportProductButtonProps) {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAuthenticated) return null;

  const handleSubmit = async () => {
    const trimmed = reason.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/products/${encodeURIComponent(barcode)}/report`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: trimmed }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Kunde inte skicka rapporten.");
        return;
      }
      setDone(true);
      setOpen(false);
    } catch {
      setError("Nätverksfel — försök igen.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <p className="text-xs text-muted-foreground px-1 py-0.5">Tack! Vi kollar upp det.</p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-1 py-0.5"
      >
        <Flag className="h-3 w-3" strokeWidth={1.75} />
        Rapportera felaktighet
      </button>
    );
  }

  return (
    <div className="px-1 py-1 space-y-2">
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value.slice(0, 200))}
        rows={2}
        maxLength={200}
        placeholder="Vad är fel?"
        className="w-full rounded-lg border border-border/60 bg-white px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!reason.trim() || submitting}
          className="inline-flex items-center gap-1 rounded-lg bg-primary/90 px-2.5 py-1 text-xs font-medium text-white hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          Skicka
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setReason("");
            setError(null);
          }}
          disabled={submitting}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Avbryt
        </button>
      </div>
    </div>
  );
}
