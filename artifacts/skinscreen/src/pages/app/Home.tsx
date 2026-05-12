import { useAuth } from "@workspace/replit-auth-web";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n";

export default function HomeScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const firstName =
    user?.firstName ?? user?.email?.split("@")[0] ?? t("common.greetingFallback");

  return (
    <AppShell title={t("tabs.home")}>
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="font-serif text-xl">
            {t("home.greetingFmt", { name: firstName })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("home.placeholderNote")}</p>
        </CardContent>
      </Card>
    </AppShell>
  );
}
