import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Locale = "en" | "sv" | "fr";

export const LOCALES: { code: Locale; label: string }[] = [
  { code: "en", label: "English" },
  { code: "sv", label: "Svenska" },
  { code: "fr", label: "Français" },
];

const STORAGE_KEY = "skinscreen.locale";

type Dict = Record<string, string>;

const en: Dict = {
  "tabs.scan": "Scan",
  "tabs.browse": "Browse",
  "tabs.discover": "Discover",
  "tabs.profile": "Profile",

  "scan.title": "Scan a product",
  "scan.subtitle": "Snap a label, paste ingredients, or compare two products.",

  "shelf.titleGreeting": "Hi, {name}",
  "shelf.subtitle": "Your shelf — track your routine and check it for conflicts.",

  "discover.title": "Discover",
  "discover.subtitle": "Tips, expert care, and ways to learn safer skincare.",
  "discover.shareTip": "Share a tip",
  "discover.tipPlaceholder": "What's one routine tip you'd recommend?",
  "discover.tipAriaLabel": "Your tip",
  "discover.post": "Post",
  "discover.rewards": "Rewards",
  "discover.topTips": "Top tips",
  "discover.last30Days": "Last 30 days",
  "discover.emptyTips":
    "No tips yet. Be the first to share one — the most upvoted tip each week wins a free month of Premium.",
  "discover.aiAskAnything": "Ask anything",
  "discover.aiTitle": "Chat with the SkinScreen AI",
  "discover.aiSubtitle":
    "Get evidence-based answers about your shelf, ingredient interactions, and routine timing.",
  "discover.aiHint": "Tap the chat bubble to start",
  "discover.leaderboardTitle": "Leaderboard",
  "discover.leaderboardSubtitle":
    "See top contributors and Best Tip of the Week.",
  "discover.tipBy": "by",
  "discover.upvoteTip": "Upvote tip",
  "discover.removeVote": "Remove vote",
  "discover.tipMinError": "Tips need at least {min} characters.",
  "discover.tipPostError": "Could not post tip.",
  "discover.tipNetworkError": "Network error. Try again.",
  "discover.footnote":
    "DIY recipes, top mistakes, and more inside the app.",

  "profile.title": "Profile",
  "profile.subtitle": "Your account, plan, and contributions.",
  "profile.language": "Language",
};

const sv: Dict = {
  "tabs.scan": "Skanna",
  "tabs.browse": "Bläddra",
  "tabs.discover": "Upptäck",
  "tabs.profile": "Profil",

  "scan.title": "Skanna en produkt",
  "scan.subtitle":
    "Fota en etikett, klistra in ingredienser eller jämför två produkter.",

  "shelf.titleGreeting": "Hej, {name}",
  "shelf.subtitle":
    "Din hylla — håll koll på din rutin och kolla efter konflikter.",

  "discover.title": "Upptäck",
  "discover.subtitle":
    "Tips, expertråd och sätt att lära dig säkrare hudvård.",
  "discover.shareTip": "Dela ett tips",
  "discover.tipPlaceholder": "Vilket rutintips skulle du rekommendera?",
  "discover.tipAriaLabel": "Ditt tips",
  "discover.post": "Publicera",
  "discover.rewards": "Belöningar",
  "discover.topTips": "Toppentips",
  "discover.last30Days": "Senaste 30 dagarna",
  "discover.emptyTips":
    "Inga tips ännu. Bli först med att dela ett — veckans mest uppröstade tips vinner en gratis månad med Premium.",
  "discover.aiAskAnything": "Fråga vad som helst",
  "discover.aiTitle": "Chatta med SkinScreens AI",
  "discover.aiSubtitle":
    "Få evidensbaserade svar om din hylla, ingrediensinteraktioner och rutintider.",
  "discover.aiHint": "Tryck på chattbubblan för att börja",
  "discover.leaderboardTitle": "Topplista",
  "discover.leaderboardSubtitle":
    "Se de bästa bidragsgivarna och Veckans bästa tips.",
  "discover.tipBy": "av",
  "discover.upvoteTip": "Rösta upp tipset",
  "discover.removeVote": "Ta bort röst",
  "discover.tipMinError": "Tips måste vara minst {min} tecken.",
  "discover.tipPostError": "Kunde inte publicera tipset.",
  "discover.tipNetworkError": "Nätverksfel. Försök igen.",
  "discover.footnote":
    "DIY-recept, vanliga misstag och mer i appen.",

  "profile.title": "Profil",
  "profile.subtitle": "Ditt konto, ditt abonnemang och dina bidrag.",
  "profile.language": "Språk",
};

const fr: Dict = {
  "tabs.scan": "Scanner",
  "tabs.browse": "Parcourir",
  "tabs.discover": "Découvrir",
  "tabs.profile": "Profil",

  "scan.title": "Scanner un produit",
  "scan.subtitle":
    "Photographiez une étiquette, collez des ingrédients ou comparez deux produits.",

  "shelf.titleGreeting": "Bonjour, {name}",
  "shelf.subtitle":
    "Votre étagère — suivez votre routine et vérifiez les conflits.",

  "discover.title": "Découvrir",
  "discover.subtitle":
    "Conseils, soins d'experts et apprentissage d'une routine plus sûre.",
  "discover.shareTip": "Partager un conseil",
  "discover.tipPlaceholder": "Quel conseil de routine recommanderiez-vous ?",
  "discover.tipAriaLabel": "Votre conseil",
  "discover.post": "Publier",
  "discover.rewards": "Récompenses",
  "discover.topTips": "Meilleurs conseils",
  "discover.last30Days": "30 derniers jours",
  "discover.emptyTips":
    "Aucun conseil pour l'instant. Soyez le premier à en partager un — le conseil le plus voté chaque semaine gagne un mois gratuit de Premium.",
  "discover.aiAskAnything": "Posez une question",
  "discover.aiTitle": "Discutez avec l'IA SkinScreen",
  "discover.aiSubtitle":
    "Obtenez des réponses fondées sur des preuves concernant votre étagère, les interactions entre ingrédients et le moment de votre routine.",
  "discover.aiHint": "Touchez la bulle de chat pour commencer",
  "discover.leaderboardTitle": "Classement",
  "discover.leaderboardSubtitle":
    "Voyez les meilleurs contributeurs et le meilleur conseil de la semaine.",
  "discover.tipBy": "par",
  "discover.upvoteTip": "Soutenir ce conseil",
  "discover.removeVote": "Retirer le vote",
  "discover.tipMinError": "Les conseils doivent contenir au moins {min} caractères.",
  "discover.tipPostError": "Impossible de publier le conseil.",
  "discover.tipNetworkError": "Erreur réseau. Réessayez.",
  "discover.footnote":
    "Recettes DIY, erreurs courantes et plus encore dans l'application.",

  "profile.title": "Profil",
  "profile.subtitle": "Votre compte, votre forfait et vos contributions.",
  "profile.language": "Langue",
};

const DICTS: Record<Locale, Dict> = { en, sv, fr };

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: keyof typeof en, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function isLocale(v: string | null | undefined): v is Locale {
  return v === "en" || v === "sv" || v === "fr";
}

function detectInitialLocale(): Locale {
  if (typeof window === "undefined") return "en";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    // ignore
  }
  const nav = window.navigator?.language?.toLowerCase() ?? "";
  if (nav.startsWith("sv")) return "sv";
  if (nav.startsWith("fr")) return "fr";
  return "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => detectInitialLocale());

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // ignore
    }
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setLocale = useCallback((l: Locale) => setLocaleState(l), []);

  const t = useCallback<I18nContextValue["t"]>(
    (key, vars) => {
      const dict = DICTS[locale] ?? en;
      let str = dict[key as string] ?? en[key as string] ?? (key as string);
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        }
      }
      return str;
    },
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Fallback so components don't crash if used outside provider (e.g. tests).
    return {
      locale: "en",
      setLocale: () => {},
      t: (key, vars) => {
        let str = en[key as string] ?? (key as string);
        if (vars) {
          for (const [k, v] of Object.entries(vars)) {
            str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
          }
        }
        return str;
      },
    };
  }
  return ctx;
}
