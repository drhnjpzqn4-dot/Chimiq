import { Globe, Check } from "lucide-react";
import { LOCALES, useTranslation, type Locale } from "@/lib/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface LanguageSelectorProps {
  className?: string;
}

export function LanguageSelector({ className }: LanguageSelectorProps) {
  const { locale, setLocale, t } = useTranslation();
  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("nav.languageSelectorAria")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-white/60 px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-foreground/70 transition-colors hover:bg-border/30",
            className,
          )}
        >
          <Globe className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{current.code.toUpperCase()}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[10rem] bg-white border border-border/60 shadow-lg rounded-xl">
        {LOCALES.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onSelect={() => setLocale(l.code as Locale)}
            className="flex items-center justify-between gap-3"
          >
            <span>{l.label}</span>
            {l.code === locale && (
              <Check className="h-4 w-4 text-primary" aria-hidden="true" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
