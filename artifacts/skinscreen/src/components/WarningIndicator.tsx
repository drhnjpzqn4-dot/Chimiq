import { AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

interface ShelfStatusResponse {
  hasConflicts: boolean;
  hasRecall: boolean;
}

export function WarningIndicator() {
  const apiBase = import.meta.env.VITE_API_URL ?? "";

  const { data } = useQuery<ShelfStatusResponse>({
    queryKey: ["shelf-status"],
    queryFn: async () => {
      const res = await apiFetch(`${apiBase}/api/shelf/status`, {
        credentials: "include",
      });
      if (!res.ok) return { hasConflicts: false, hasRecall: false };
      return res.json();
    },
    // Poll var 5:e minut — inga realtidsuppdateringar behövs
    refetchInterval: 5 * 60 * 1000,
    // Tyst vid fel (auth saknas lokalt) — visa ingenting istället för error state
    retry: false,
    staleTime: 4 * 60 * 1000,
  });

  const isActive = data?.hasConflicts || data?.hasRecall;
  if (!isActive) return null;

  return (
    <Link href="/app/shelf">
      <a
        aria-label="Aktiv varning — tryck för att se din hylla"
        data-touch-target
        className="flex items-center justify-center rounded-full p-1.5 transition-colors hover:bg-amber-soft/40"
        style={{ color: "var(--amber-deep)" }}
      >
        <AlertTriangle
          className="h-5 w-5 animate-pulse-warning"
          strokeWidth={2}
          aria-hidden
        />
      </a>
    </Link>
  );
}
