import { type ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

interface LegalLayoutProps {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}

export function LegalLayout({ title, lastUpdated, children }: LegalLayoutProps) {
  const { t } = useTranslation();
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "") || "/";

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <a
          href={base}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("legal.backToApp")}
        </a>

        <h1 className="text-3xl md:text-4xl font-serif font-medium mb-2">
          {title}
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          {t("legal.lastUpdated", { date: lastUpdated })}
        </p>

        <article className="prose prose-sm md:prose-base max-w-none text-foreground leading-relaxed [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:font-medium [&_h2]:mt-8 [&_h2]:mb-3 [&_h3]:font-medium [&_h3]:text-lg [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_li]:mb-1 [&_a]:text-primary [&_a]:underline [&_strong]:font-semibold">
          {children}
        </article>

        <div className="mt-10 pt-6 border-t border-border/50 text-xs text-muted-foreground">
          <p>{t("legal.contactPlaceholder")}</p>
        </div>
      </div>
    </main>
  );
}
