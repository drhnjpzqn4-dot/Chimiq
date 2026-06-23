import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { BookOpen, CalendarDays, Camera, CheckCircle2, Flag, FlaskConical, Moon, Plus, Save, Sun } from "lucide-react";
import {
  getGetShelfQueryKey,
  useAddToShelf,
  usePatchShelfProduct,
} from "@workspace/api-client-react";
import type { RoutineConflict, RoutineSlot, ShelfResponse } from "@workspace/api-client-react";
import { ShelfConflictBanner, type IngredientStatusLevel } from "@/components/IngredientStatusDot";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useTranslation } from "@/lib/i18n";
import { apiFetch } from "@/lib/api";
import { IngredientTokenList } from "@/components/IngredientTokenList";
import { IngredientDetailSheet, type IngredientDetailFlag } from "@/components/IngredientDetailSheet";
import { ProductTypeBadge } from "@/components/ProductTypeBadge";
import type { ProductType } from "@/components/ProductTypeBadge";
import { ProductNameCapture } from "@/components/ProductNameCapture";
import { IngredientsCapture } from "@/components/IngredientsCapture";
import { IngredientCautionNote } from "@/components/IngredientCautionNote";

// Called "Produktdatablad" in product language

type ProductVerdict = "safe" | "caution" | "danger";

type ProductAnalysis = {
  verdict?: ProductVerdict;
  overallSafe?: boolean;
  summary?: string;
  verdictSummary?: string;
  flaggedIngredients?: Array<{
    name?: string;
    ingredient?: string;
    reason?: string;
    explanation?: string;
    severity?: "low" | "medium" | "high" | string;
  }>;
  flags?: Array<{
    name?: string;
    ingredient?: string;
    reason?: string;
    explanation?: string;
    severity?: string;
  }>;
  safeIngredients?: string[];
};

export interface ProductDetailProduct {
  shelfId?: number;
  barcode?: string | null;
  product_name?: string;
  productName?: string;
  brand?: string | null;
  image_url?: string | null;
  imageUrl?: string | null;
  ingredients?: string | null;
  ingredient_list?: string | null;
  analysis_result_json?: ProductAnalysis | null;
  analysisResultJson?: ProductAnalysis | null;
  routineSlot?: RoutineSlot | string | null;
  productType?: ProductType | string | null;
  /** SS-075: false när produkten skannats/sökts men ännu inte finns i
   * cached_products. Då ska "Bidra till databasen"-CTA:n visas även om en
   * streckkod finns. undefined/true = anta att den finns (bakåtkompatibelt). */
  inCache?: boolean;
}

interface ProductDetailSheetProps {
  product: ProductDetailProduct;
  status?: IngredientStatusLevel;
  conflicts?: RoutineConflict[];
  onClose: () => void;
  /**
   * Optional callback invoked when the user wants to contribute / save this
   * product to the public DB. Triggered when the product has no real barcode
   * (i.e. it came from a fresh OCR/paste scan and is not in cached_products
   * yet). Receives the prefill that should be passed to ContributeModal.
   */
  onContribute?: (prefill: {
    productName?: string;
    brand?: string;
    ingredients?: string;
  }) => void;
  /**
   * Called with the permanent GCS URL after an image has been successfully
   * uploaded and saved to the DB. The parent (Scan.tsx) uses this to update
   * the matching recent-scans localStorage entry so the image persists the
   * next time the product is opened from the recents list.
   */
  onImageSaved?: (newImageUrl: string) => void;
  initialEditMode?: boolean;
  /** Sant när kortet öppnas direkt från scan-flödet (captured state → öppna produktkort) */
  fromScan?: boolean;
}

// SS-081c: ingredienslistor längre än så här fälls ihop (160px) med en
// "Visa alla"-knapp. Tröskeln matchar nu klipp-höjden så inget göms utan knapp.
const INGREDIENTS_COLLAPSE_AT = 200;

/**
 * SS-081c: kollapsa ett dubblerat märkes-prefix i visningsnamnet, t.ex.
 * "ACO ACO Hydrating…" → "ACO Hydrating…" och
 * "L'Oréal Paris L'Oréal Paris Vitamin C…" → "L'Oréal Paris Vitamin C…".
 * Produkter som sparades INNAN sök-fixen (joinBrandName) ligger dubblerade i
 * hyllan/recents; detta städar visningen oavsett källa. Hittar längsta upprepade
 * ord-prefix och tar bort en kopia.
 */
/**
 * SS-081d: KANONISK statusnivå för en produkts EGEN analys. Pias beslut:
 *   - "safe"    = 0 concerns → grön prick ("Granskad", INGEN säkerhetsutfästelse)
 *   - "caution" = 1+ concerns → orange prick ("Värt att veta")
 * En ENSKILD produkt blir ALDRIG röd — RÖTT är reserverat för faktiska KOMBINATIONS-
 * konflikter (rutinkontrollen) så vi aldrig "dömer ut" en enskild produkt/märke.
 * Används överallt en produkt-prick visas (IDAG, Rutin-hyllan) så de matchar.
 */
export function analysisConcernLevel(analysisJson: unknown): "safe" | "caution" {
  if (!analysisJson || typeof analysisJson !== "object") return "safe";
  const a = analysisJson as {
    verdict?: string;
    flaggedIngredients?: Array<{ severity?: string }>;
    flags?: Array<{ severity?: string }>;
  };
  const flags = a.flaggedIngredients ?? a.flags ?? [];
  const concerns = flags.length;
  if (a.verdict === "danger" || a.verdict === "caution" || concerns >= 1) return "caution";
  return "safe";
}

export function collapseRepeatedBrandPrefix(name: string): string {
  const n = (name ?? "").trim();
  if (!n) return n;
  const words = n.split(/\s+/);
  for (let k = Math.floor(words.length / 2); k >= 1; k--) {
    const first = words.slice(0, k).join(" ").toLowerCase();
    const second = words.slice(k, 2 * k).join(" ").toLowerCase();
    if (first === second) return words.slice(k).join(" ");
  }
  return n;
}

function verdictFromProduct(product: ProductDetailProduct, status?: IngredientStatusLevel): ProductVerdict | null {
  // SS-074: Undvik falsk "safe" när ingredienslista saknas eller är för kort.
  const rawIngredients = product.ingredients ?? product.ingredient_list ?? "";
  if (!rawIngredients.trim() || rawIngredients.trim().length < 30) return null;

  const analysis = product.analysis_result_json ?? product.analysisResultJson ?? null;
  if (!analysis) return null;
  if (analysis?.verdict) return analysis.verdict;
  if (analysis?.overallSafe === true) return "safe";
  const flags = analysis?.flaggedIngredients ?? analysis?.flags ?? [];
  if (flags.some((flag) => String(flag.severity ?? "").toLowerCase().includes("high"))) return "danger";
  if (flags.length > 0) return "caution";
  if (status === "high") return "danger";
  if (status === "caution") return "caution";
  if (status === "safe") return "safe";
  return null;
}

function normalizeFlags(product: ProductDetailProduct) {
  const analysis = product.analysis_result_json ?? product.analysisResultJson ?? null;
  return (analysis?.flaggedIngredients ?? analysis?.flags ?? [])
    .map((flag) => ({
      name: flag.name ?? flag.ingredient ?? "",
      reason: flag.reason ?? flag.explanation ?? "",
      severity: String(flag.severity ?? "").toLowerCase(),
    }))
    .filter((flag) => flag.name);
}

// EAN-13/EAN-8 kontrollsiffre-validering (SCAN-FLOW-SPEC punkt 4). Returnerar
// true om streckkoden är en giltig EAN-8 eller EAN-13 (rätt kontrollsiffra).
// Andra längder (t.ex. UPC-12) godtas utan check så vi inte blockerar.
function isValidEanCheckDigit(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 8 && digits.length !== 13) return true;
  const nums = digits.split("").map(Number);
  const check = nums.pop() as number;
  // EAN-13: vikt 1,3,1,3...; EAN-8: vikt 3,1,3,1...
  const reversed = nums.reverse();
  const sum = reversed.reduce(
    (acc, n, i) => acc + n * (i % 2 === 0 ? 3 : 1),
    0,
  );
  const computed = (10 - (sum % 10)) % 10;
  return computed === check;
}

export function ProductDetailSheet({
  product,
  status,
  conflicts = [],
  onClose,
  onImageSaved,
  initialEditMode,
  fromScan = false,
}: ProductDetailSheetProps) {
  const { t, locale } = useTranslation();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [completionValue, setCompletionValue] = useState("");
  const [completionSaving, setCompletionSaving] = useState(false);
  const [completionDone, setCompletionDone] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [localAnalysis, setLocalAnalysis] = useState<ProductAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const initialImageUrl = product.image_url ?? product.imageUrl ?? null;
  const initialBarcode = product.barcode ?? null;
  const rawNameSource = (product.product_name ?? product.productName ?? "").trim();
  const placeholderProductNames = new Set([
    t("scanner.scannedProductFallback"),
    t("shelf.unknownProduct"),
  ]);
  const hasRealProductName =
    rawNameSource.length > 0 && !placeholderProductNames.has(rawNameSource);
  const initialProductName = hasRealProductName ? rawNameSource : "";
  const needsNameInput = !hasRealProductName;
  // SS-081 (#3): vissa platshållarprodukter (t.ex. The Ordinary-oljor) fick
  // marknadsföringstext i ingrediensfältet av skrapan. Sådan prosa ska INTE
  // förifyllas — fältet ska vara tomt med kamera/runda-flaskan-affordans. INCI är
  // kommaseparerad; prosa har många ord men få kommatecken, eller butiks-fraser.
  const looksLikeInciJunk = (raw: string): boolean => {
    const s = raw.trim();
    if (!s) return false;
    if (/(www\.|https?:|\bköp\b|rabatt|kampanj|relaterade|recension|frakt|pris:|key ingredient|how to use|discover|build my regimen|product details)/i.test(s)) {
      return true;
    }
    const words = s.split(/\s+/).length;
    const commas = (s.match(/,/g) ?? []).length;
    return words > 14 && commas < 2;
  };
  const rawInitialIngredients = product.ingredients?.trim() ?? "";
  const initialIngredients = looksLikeInciJunk(rawInitialIngredients) ? "" : rawInitialIngredients;
  const [localProductName, setLocalProductName] = useState(initialProductName);
  const [localBrand, setLocalBrand] = useState(product.brand ?? "");
  const [localBarcode, setLocalBarcode] = useState(initialBarcode ?? "");
  const [localIngredients, setLocalIngredients] = useState(initialIngredients);
  const [localImageUrl, setLocalImageUrl] = useState<string | null>(initialImageUrl);
  // SCAN-FLOW-SPEC punkt 4 (Flöde B): okänd produkt från skanning ska öppna
  // produktkortet med ALLA fält direkt redigerbara — inte tvinga klick på
  // "Redigera". Auto-aktivera editMode när produkten saknar både riktigt namn
  // och riktig streckkod (dvs. inte finns i DB), inte redan analyserad och inte
  // ligger på hyllan.
  const initialHasAnalysis = Boolean(
    product.analysis_result_json ?? product.analysisResultJson,
  );
  const initialHasRealBarcode = Boolean(
    initialBarcode && !initialBarcode.startsWith("CHIMIQ_"),
  );
  const initialIsUnknownScan =
    fromScan &&
    !initialHasAnalysis &&
    !product.shelfId &&
    (needsNameInput || !initialHasRealBarcode);
  const [editMode, setEditMode] = useState(initialEditMode ?? initialIsUnknownScan);
  const [editName, setEditName] = useState(initialProductName);
  const [editBrand, setEditBrand] = useState(product.brand ?? "");
  // SS-081 (#1): förifyll INTE EAN-fältet med CHIMIQ_-platshållaren — fältet ska
  // vara tomt så användaren skriver in den RIKTIGA EAN:en (annars skickas en
  // ogiltig "CHIMIQ_..."-sträng som inte matchar siffer-regexen → ingen komplettering).
  const [editBarcode, setEditBarcode] = useState(initialHasRealBarcode ? (initialBarcode ?? "") : "");
  const [editIngredients, setEditIngredients] = useState(initialIngredients);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [, setEditDone] = useState(false);
  const [slotPickerOpen, setSlotPickerOpen] = useState(false);
  const [changeSlotPickerOpen, setChangeSlotPickerOpen] = useState(false);
  const [addedConfirm, setAddedConfirm] = useState(false);
  const [addToRoutineError, setAddToRoutineError] = useState<string | null>(null);
  const [openIngredient, setOpenIngredient] = useState<string | null>(null);
  const [openIngredientFlag, setOpenIngredientFlag] = useState<IngredientDetailFlag | null>(null);
  const [editImageError, setEditImageError] = useState<string | null>(null);
  // SS-083 (#3): "Spara" sparar nu till KATALOGEN (databasen/contribute), INTE till
  // användarens hylla. Att lägga i egen rutin/hylla är ett separat, uttryckligt steg
  // (canAddToRoutine-sektionen längre ned). Ordning: Spara i katalog → Analysera → Lägg i rutin.
  const [isSavingToCatalog, setIsSavingToCatalog] = useState(false);
  const [saveCatalogError, setSaveCatalogError] = useState<string | null>(null);
  const [addedToCatalog, setAddedToCatalog] = useState(false);
  // SS-079 (#flag): "Rapportera felaktig info" — POSTs to the existing
  // /api/products/:barcode/report endpoint (product_reports table).
  const [flagOpen, setFlagOpen] = useState(false);
  const [flagReason, setFlagReason] = useState("");
  const [flagSaving, setFlagSaving] = useState(false);
  const [flagDone, setFlagDone] = useState(false);
  const [flagError, setFlagError] = useState<string | null>(null);
  const [localShelfId, setLocalShelfId] = useState<number | undefined>(product.shelfId);
  const [localRoutineSlot, setLocalRoutineSlot] = useState<string | null | undefined>(
    product.routineSlot ?? null,
  );

  const addToShelfMutation = useAddToShelf();
  const patchShelfMutation = usePatchShelfProduct();
  const imageUrl = localImageUrl;
  const barcode = localBarcode || null;
  const productName = localProductName;
  const analysis = localAnalysis ?? product.analysis_result_json ?? product.analysisResultJson ?? null;
  const productForAnalysis = { ...product, analysis_result_json: analysis };
  const verdict = verdictFromProduct(productForAnalysis, status);
  const flaggedIngredients = normalizeFlags(productForAnalysis);
  const summary = analysis?.summary ?? analysis?.verdictSummary ?? null;
  const substantiveConflicts = conflicts.filter((conflict) => conflict.severity !== "SAFE");
  const rawIngredients = localIngredients.trim();
  const editedIngredients = editIngredients.trim();
  const showAnalyzeButton =
    (!verdict && rawIngredients.length > 10 && substantiveConflicts.length === 0) ||
    (editMode && editedIngredients.length > 10 && editedIngredients !== rawIngredients);

  const displayName =
    [localBrand.trim(), productName.trim()].filter(Boolean).join(" ") ||
    productName.trim() ||
    t("contribute.scannedProductFallback");
  const effectiveShelfId = localShelfId ?? product.shelfId;
  const effectiveRoutineSlot = localRoutineSlot ?? product.routineSlot ?? null;
  const canAddToRoutine =
    rawIngredients.length > 10 &&
    !addedConfirm &&
    (!effectiveShelfId || effectiveRoutineSlot === "wishlist");

  // Kan byta rutin-slot om produkten redan ligger i en "riktig" slot (morning/evening/occasional)
  const canChangeRoutine =
    !!effectiveShelfId &&
    !!effectiveRoutineSlot &&
    effectiveRoutineSlot !== "wishlist" &&
    rawIngredients.length > 10 &&
    !addedConfirm;

  const handleAddToRoutine = async (slot: "morning" | "evening" | "occasional") => {
    setAddToRoutineError(null);
    try {
      if (effectiveShelfId) {
        await patchShelfMutation.mutateAsync({
          id: effectiveShelfId,
          data: { routineSlot: slot },
        });
        setLocalRoutineSlot(slot);
      } else {
        const imageUrlForShelf =
          imageUrl && (imageUrl.startsWith("http://") || imageUrl.startsWith("https://"))
            ? imageUrl
            : undefined;
        const created = await addToShelfMutation.mutateAsync({
          data: {
            productName: displayName,
            ingredients: rawIngredients,
            routineSlot: slot,
            image_url: imageUrlForShelf ?? null,
            barcode: barcode ?? null,
          },
        });
        setLocalShelfId(created.id);
        setLocalRoutineSlot(slot);
        contributeToCatalog();
      }
      await queryClient.invalidateQueries({ queryKey: getGetShelfQueryKey() });
      setSlotPickerOpen(false);
      setChangeSlotPickerOpen(false);
      setAddedConfirm(true);
      window.setTimeout(() => setAddedConfirm(false), 2000);
    } catch {
      setAddToRoutineError(t("complete.saveError"));
    }
  };

  const addToRoutinePending = addToShelfMutation.isPending || patchShelfMutation.isPending;
  // Visa ALDRIG "Säker"-skylten — Chimiq går inte i god för att en produkt är
  // säker (ansvarsskäl). Varningar (caution/danger) visas, men inte safe-stämpeln.
  // Informationen och varningsingredienserna räcker — användaren bedömer själv.
  // SS-081d: en ENSKILD produkt visas aldrig som röd "danger" — vi dömer inte ut
  // en produkt/märke på egen hand. Cap till "caution" (orange). RÖTT är reserverat
  // för faktiska KOMBINATIONS-konflikter (visas separat via ShelfConflictBanner).
  const ownVerdict = verdict === "danger" ? "caution" : verdict;
  const showVerdictBadge = ownVerdict === "caution";
  const showNoAnalysisHint = !verdict && rawIngredients.length <= 10;
  const ingredientPreview = expanded || rawIngredients.length <= 520
    ? rawIngredients
    : `${rawIngredients.slice(0, 520).trim()}...`;
  const verdictCopy = ownVerdict === "caution" ? t("product.caution") : t("product.safe");
  const verdictStyle =
    ownVerdict === "caution"
      ? { backgroundColor: "var(--amber-soft)", color: "var(--amber-deep)" }
      : { backgroundColor: "var(--sage)", color: "#FFFFFF" };
  // Products without a real barcode cannot be patched in cached_products.
  // Offer a contribution flow instead so OCR/paste scans can be saved.
  const hasRealBarcode = Boolean(barcode && !barcode.startsWith("CHIMIQ_"));
  // SS-075: en produkt som skannats/sökts men ännu inte finns i cached_products
  // (inCache === false) ska behandlas som "inte i databasen" även när den HAR
  // en streckkod — annars saknas "Bidra till databasen"-CTA:n. DB-träffar och
  // hyll-produkter har inCache true/undefined och påverkas inte.
  const notInCache = product.inCache === false;
  // SS-083 (#3): produkten räknas som "i katalogen" om den redan fanns där (sök/streckkods-
  // träff, inCache !== false) ELLER om användaren just sparat den. Analysera-knappen i
  // scan-flödet låses upp först när detta är sant (Pias ordning: spara → analysera).
  const inCatalog = !notInCache || addedToCatalog;
  const isNotInDb = (!hasRealBarcode || notInCache) && !product.shelfId;
  const missingField = isNotInDb
    ? null
    : !imageUrl
      ? "image"
      : !hasRealBarcode
        ? "barcode"
        : !localBrand.trim()
          ? "brand"
          : null;

  // SS-081: öppnar vi en redan-analyserad produkt ska den DELADE analysen visas
  // DIREKT — utan "Analysera"-tryck och utan ny AI-kostnad. Detta fångar bl.a.
  // återöppning från "Senaste skanningar" (där den lokala posten är inaktuell)
  // och produkter som en ANNAN användare redan analyserat. Hämtar lagrad analys
  // (cached_products.analysis_result_json) vid öppning.
  useEffect(() => {
    if (initialHasAnalysis || localAnalysis) return;
    // Alla produkter med ett id i cached_products — riktig EAN ELLER CHIMIQ_-
    // platshållare — kan ha en delad, lagrad analys. Hämta och visa den direkt.
    if (!barcode || !rawIngredients) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await apiFetch(`/api/products/${encodeURIComponent(barcode)}`, {
          credentials: "include",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { analysisResultJson?: ProductAnalysis | null };
        if (!cancelled && data.analysisResultJson) setLocalAnalysis(data.analysisResultJson);
      } catch {
        /* non-fatal — användaren kan fortfarande trycka Analysera */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barcode]);

  // SS-081c: när kortet HAR en analys (kört eller auto-laddad delad analys), skriv
  // tillbaka den + verdict till "Senaste skanningar"-posten i localStorage. Annars
  // visar IDAG "Ej analyserad" för en produkt som faktiskt ÄR analyserad (posten
  // skapas vid öppning innan analys och uppdaterades aldrig). Matcha på barcode → namn.
  useEffect(() => {
    if (!analysis) return;
    const KEY = "skinscreen.recentScans";
    // SS-081d: enskild produkt blir aldrig "high" (rött = bara kombinationer).
    const level = analysisConcernLevel(analysis);
    const v: "safe" | "warning" | "high" = level === "caution" ? "warning" : "safe";
    const nameLc = (productName || product.product_name || product.productName || "")
      .trim()
      .toLowerCase();
    type RecentEntry = {
      name?: string;
      verdict?: string;
      product?: { barcode?: string | null; analysis_result_json?: unknown } & Record<string, unknown>;
    } & Record<string, unknown>;
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const list = JSON.parse(raw) as RecentEntry[];
      if (!Array.isArray(list)) return;
      let changed = false;
      const updated = list.map((e) => {
        if (!e || typeof e !== "object") return e;
        const eBarcode = e.product?.barcode ?? null;
        const matchBc = barcode && eBarcode === barcode;
        const matchNm = nameLc && typeof e.name === "string" && e.name.trim().toLowerCase() === nameLc;
        if (!matchBc && !matchNm) return e;
        if (e.product?.analysis_result_json && e.verdict === v) return e; // redan korrekt
        changed = true;
        return { ...e, verdict: v, product: { ...(e.product ?? {}), analysis_result_json: analysis } };
      });
      if (changed) localStorage.setItem(KEY, JSON.stringify(updated));
    } catch {
      /* ignore quota / private-mode errors */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis, verdict, barcode]);

  const saveCompletion = async (field: "brand" | "barcode", value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setCompletionSaving(true);
    setCompletionError(null);
    try {
      if (field === "barcode" && !hasRealBarcode) {
        const digits = trimmed.replace(/\D/g, "").slice(0, 14);
        if (digits.length < 8) throw new Error("invalid");
        const res = await apiFetch("/api/contribute/manual", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            barcode: digits,
            productName: productName || undefined,
            brand: localBrand.trim() || undefined,
            ingredients: rawIngredients || undefined,
          }),
        });
        if (!res.ok) throw new Error(String(res.status));
        setLocalBarcode(digits);
        setCompletionDone(true);
        return;
      }

      if (!barcode) return;
      const body =
        field === "barcode"
          ? { barcode: trimmed.replace(/\D/g, "").slice(0, 14) }
          : { [field]: trimmed };
      const res = await apiFetch(`/api/products/${encodeURIComponent(barcode)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(String(res.status));
      if (field === "barcode") setLocalBarcode(trimmed.replace(/\D/g, "").slice(0, 14));
      setCompletionDone(true);
    } catch {
      setCompletionError(t("complete.saveError"));
    } finally {
      setCompletionSaving(false);
    }
  };

  const saveImageCompletion = async (file: File, fromEditMode = false) => {
    if (fromEditMode) {
      setEditImageError(null);
    } else {
      setCompletionSaving(true);
      setCompletionError(null);
    }
    try {
      // Resize to max 1200px / 82% JPEG before upload — keeps file small without Supabase Pro
      const resized = await resizeImageFile(file);
      const imageBase64 = await fileToBase64(resized);
      // Show local preview immediately while upload is in flight
      setLocalImageUrl(`data:image/jpeg;base64,${imageBase64}`);
      if (!barcode) return;
      const res = await apiFetch(`/api/products/${encodeURIComponent(barcode)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64 }),
      });
      if (!res.ok) throw new Error(String(res.status));
      // Replace base64 preview with the permanent GCS URL returned by the server
      const json = await res.json() as { ok?: boolean; image_url?: string };
      if (json.image_url) {
        setLocalImageUrl(json.image_url);
        // Notify parent so it can update the recent-scans cache entry —
        // otherwise the image won't show next time the product is opened
        // from the recents list (localStorage has the old null value).
        onImageSaved?.(json.image_url);
      }
      if (!fromEditMode) setCompletionDone(true);
    } catch {
      const msg = t("complete.saveError");
      if (fromEditMode) {
        setEditImageError(msg);
      } else {
        setCompletionError(msg);
      }
    } finally {
      if (!fromEditMode) setCompletionSaving(false);
    }
  };

  // SS-079 (#3): make a saved scan findable in SEARCH, not just "recent".
  // A product is only searchable once it's in the shared cached_products table.
  // When the user saves a product that has a real barcode + ingredients but
  // isn't in the catalog yet (notInCache), push it via /contribute/manual,
  // which upserts cached_products (source='user') — i.e. auto-approve-if-
  // consistent. Logged-in only (the endpoint requires auth). Fire-and-forget.
  const contributeToCatalog = () => {
    if (!notInCache || !hasRealBarcode || !barcode) return;
    if (rawIngredients.length < 20) return;
    const permanentImage =
      imageUrl && (imageUrl.startsWith("http://") || imageUrl.startsWith("https://"))
        ? imageUrl
        : undefined;
    void apiFetch("/api/contribute/manual", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        barcode,
        productName: productName || undefined,
        brand: localBrand.trim() || undefined,
        ingredients: rawIngredients,
        imageUrl: permanentImage,
      }),
    }).catch(() => { /* non-blocking: catalog contribution is best-effort */ });
  };

  // SS-083 (#3): "Spara" sparar produkten till den DELADE katalogen (cached_products
  // via /contribute/manual) — INTE till användarens egen hylla. Det var förvirrande att
  // "Spara" lade produkten direkt i ens rutin. Att lägga i rutinen är nu ett separat steg.
  // Kräver INCI (≥ 20 tecken) så katalogposten är meningsfull. Streckkod är valfri:
  // servern skapar en CHIMIQ_-platshållare när EAN saknas (samma väg som handleSaveEdits).
  const handleSaveToCatalog = async () => {
    if (isSavingToCatalog || addedToCatalog) return;
    if (rawIngredients.length < 20) {
      setSaveCatalogError(t("complete.needEanOrIngredients"));
      return;
    }
    setIsSavingToCatalog(true);
    setSaveCatalogError(null);
    try {
      const digits = (barcode ?? "").replace(/\D/g, "");
      const hasRealEan = /^[0-9]{8,14}$/.test(digits);
      const permanentImage =
        imageUrl && (imageUrl.startsWith("http://") || imageUrl.startsWith("https://"))
          ? imageUrl
          : undefined;
      const body: Record<string, string> = {
        source_type: "package",
        ingredients: rawIngredients,
      };
      if (hasRealEan) body.barcode = digits;
      if (productName) body.productName = productName;
      if (localBrand.trim()) body.brand = localBrand.trim();
      if (permanentImage) body.imageUrl = permanentImage;
      // Kompletterar vi en CHIMIQ_-platshållare? Uppdatera befintlig rad, skapa ingen dublett.
      if (barcode && barcode.startsWith("CHIMIQ_")) body.placeholderBarcode = barcode;
      const res = await apiFetch("/api/contribute/manual", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(String(res.status));
      setAddedToCatalog(true);
    } catch {
      setSaveCatalogError(t("complete.saveError"));
    } finally {
      setIsSavingToCatalog(false);
    }
  };

  const handleSaveEdits = async () => {
    if (editSaving) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const nextName = editName.trim() || productName;
      const nextBrand = editBrand.trim();
      const nextBarcode = editBarcode.trim();
      const nextIngredients = editIngredients.trim();

      if (isNotInDb) {
        const body: Record<string, string> = {};
        if (nextName && nextName !== t("shelf.unknownProduct")) body["productName"] = nextName;
        if (nextBrand) body.brand = nextBrand;
        const hasRealEan = /^[0-9]{8,14}$/.test(nextBarcode);
        if (hasRealEan) body.barcode = nextBarcode;
        if (nextIngredients) body.ingredients = nextIngredients;
        // SS-081 (#1): kompletterar vi en CHIMIQ_-platshållare (t.ex. The Ordinary
        // search-only)? Skicka med platshållar-koden så servern uppdaterar den
        // BEFINTLIGA raden på plats istället för att skapa en dublett.
        const currentBarcode = barcode; // localBarcode || null
        if (currentBarcode && currentBarcode.startsWith("CHIMIQ_")) {
          body.placeholderBarcode = currentBarcode;
        }
        // Inget att skicka in? Visa snäll inline-text istället för att trigga 400.
        if (!hasRealEan && !nextIngredients) {
          setEditError(t("complete.needEanOrIngredients"));
          return;
        }

        const res = await apiFetch("/api/contribute/manual", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, source_type: "package" }),
        });
        if (!res.ok) throw new Error(String(res.status));
        setEditError(null);
        setCompletionDone(true);
      } else if (barcode) {
        const body: Record<string, string> = {};
        if (nextBarcode && nextBarcode !== barcode) body.barcode = nextBarcode;
        if (nextBrand !== localBrand) body.brand = nextBrand;
        if (nextIngredients !== rawIngredients) body.ingredients = nextIngredients;
        if (Object.keys(body).length > 0) {
          await apiFetch(`/api/products/${encodeURIComponent(barcode)}`, {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
        }
      }

      setLocalProductName(nextName);
      setLocalBrand(nextBrand);
      setLocalBarcode(nextBarcode);
      setLocalIngredients(nextIngredients);
      setEditMode(false);
      setEditDone(true);
    } catch {
      setEditError(t("contribute.errSubmissionFailed"));
    } finally {
      setEditSaving(false);
    }
  };

  const handleAnalyze = async () => {
    const ingredientsToAnalyze = (editMode ? editedIngredients : rawIngredients) || rawIngredients;
    if (!ingredientsToAnalyze || isAnalyzing) return;
    setIsAnalyzing(true);
    setAnalyzeError(null);
    try {
      const res = await apiFetch("/api/analyze-single", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredients: ingredientsToAnalyze,
          productType: product.productType ?? undefined,
          locale: locale ?? undefined,
          // SS-081/081c: skicka produktens id (riktig EAN ELLER CHIMIQ_-platshållare)
          // så servern sparar analysen DELAT på produktraden — när INCI är
          // produktens egen (oförändrad). Platshållaren räcker som unikt id.
          barcode:
            barcode && ingredientsToAnalyze === rawIngredients ? barcode : undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json() as ProductAnalysis;
        setLocalAnalysis(data);
        // SS-079 (#4): persist the analysis back to the shelf row so the verdict
        // survives closing/reopening the card. Use effectiveShelfId (localShelfId
        // ?? product.shelfId) — when the user saves a freshly-scanned product the
        // new id lands in localShelfId while product.shelfId stays undefined, so
        // the old `product.shelfId` guard silently dropped every just-saved scan.
        const shelfIdToPersist = effectiveShelfId;
        if (shelfIdToPersist && ingredientsToAnalyze === rawIngredients) {
          queryClient.setQueryData<ShelfResponse>(getGetShelfQueryKey(), (current) => {
            if (!current) return current;
            return {
              ...current,
              products: current.products.map((shelfProduct) =>
                shelfProduct.id === shelfIdToPersist
                  ? { ...shelfProduct, analysisResultJson: data }
                  : shelfProduct,
              ),
            };
          });
          void apiFetch(`/api/shelf/${shelfIdToPersist}`, {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ analysisResultJson: data }),
          });
        }
      } else {
        let detailMsg = "";
        try { const j = await res.json(); detailMsg = j?.error ?? j?.message ?? ""; } catch { /* ignore */ }
        setAnalyzeError(`Analysen misslyckades (${res.status}). ${detailMsg}`.trim());
      }
    } catch (e) {
      setAnalyzeError(
        `Kunde inte nå analys-tjänsten. ${e instanceof Error ? e.message : ""}`.trim(),
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFlag = async () => {
    const reason = flagReason.trim();
    if (!reason || flagSaving || !hasRealBarcode || !barcode) return;
    setFlagSaving(true);
    setFlagError(null);
    try {
      const res = await apiFetch(`/api/products/${encodeURIComponent(barcode)}/report`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setFlagDone(true);
      setFlagOpen(false);
    } catch {
      setFlagError("Kunde inte skicka rapporten. Försök igen.");
    } finally {
      setFlagSaving(false);
    }
  };

  return (
    <>
    <Sheet open onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto rounded-t-3xl p-0">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted-foreground/20" />
        <div className="px-5 pt-5">
          {imageUrl ? (
            <div className="relative">
              <img
                src={imageUrl}
                alt=""
                className="h-[200px] max-h-[200px] w-full rounded-2xl object-cover"
                onError={() => setLocalImageUrl(null)}
              />
              {editMode && (
                <>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void saveImageCompletion(file, true);
                      event.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="absolute bottom-3 right-3 rounded-xl px-3 py-1.5 text-xs font-semibold text-white"
                    style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
                  >
                    <span className="inline-flex items-center gap-1">
                      <Camera className="h-3.5 w-3.5" aria-hidden />
                      {t("product.changeImage")}
                    </span>
                  </button>
                </>
              )}
            </div>
          ) : (
            <div
              className="relative flex h-[200px] max-h-[200px] w-full items-center justify-center rounded-2xl"
              style={{ backgroundColor: "var(--cream-warm)" }}
            >
              <FlaskConical className="h-12 w-12" style={{ color: "var(--rose-gold)" }} aria-hidden />
              {editMode && (
                <>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void saveImageCompletion(file, true);
                      event.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl"
                    style={{ color: "var(--ink-soft)" }}
                  >
                    <Camera className="h-8 w-8" style={{ color: "var(--sage)" }} aria-hidden />
                    <span className="text-xs font-semibold">{t("product.addImage")}</span>
                  </button>
                </>
              )}
              {editImageError && (
                <p className="mt-1 text-xs text-red-500">{editImageError}</p>
              )}
            </div>
          )}
        </div>

        <SheetHeader className="px-5 pb-2 pt-4 text-left">
          {editMode ? (
            // SCAN-FLOW-SPEC punkt 7: delad OCR-komponent — kamera på namn-fältet
            // läser produktnamn + märke ur flaskbilden (EN modul, samma som
            // ProductCapture). EAN hanteras separat nedanför.
            <ProductNameCapture
              productName={editName}
              brand={editBrand}
              onProductNameChange={(value) => {
                setEditName(value);
                if (needsNameInput) setLocalProductName(value);
              }}
              onBrandChange={setEditBrand}
            />
          ) : needsNameInput ? (
            <input
              type="text"
              value={editName}
              onChange={(event) => {
                setEditName(event.target.value);
                if (needsNameInput) setLocalProductName(event.target.value);
              }}
              placeholder={t("product.tapToAddName")}
              className="input-base font-serif text-xl"
              style={{ color: "var(--ink)" }}
            />
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <SheetTitle className="font-serif text-2xl font-medium leading-tight" style={{ color: "var(--ink)" }}>
                {collapseRepeatedBrandPrefix(productName)}
              </SheetTitle>
              <ProductTypeBadge productType={product.productType} />
            </div>
          )}
          <div className="mt-1 flex items-center justify-between gap-2">
            {editMode ? (
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                {/* Märke hanteras av ProductNameCapture ovan (punkt 7) — här
                    bara EAN-fältet kvar. */}
                <input
                  type="text"
                  inputMode="numeric"
                  value={editBarcode}
                  onChange={(event) => setEditBarcode(event.target.value)}
                  className="input-base text-sm"
                  placeholder={t("contribute.barcode")}
                />
                {editBarcode.trim().replace(/\D/g, "").length >= 8 &&
                  !isValidEanCheckDigit(editBarcode) && (
                    <p className="text-xs" style={{ color: "var(--amber-deep)" }}>
                      {t("product.eanCheckWarning")}
                    </p>
                  )}
              </div>
            ) : (
              <div className="min-w-0 flex-1">
                {localBrand && (
                  <p className="text-sm font-medium" style={{ color: "var(--ink-soft)" }}>
                    {localBrand}
                  </p>
                )}
                {barcode && !barcode.startsWith("CHIMIQ_") && (
                  <p className="text-xs" style={{ color: "var(--ink-soft)" }}>
                    EAN: {barcode}
                  </p>
                )}
              </div>
            )}
            {!editMode && (
              <button
                type="button"
                onClick={() => setEditMode(true)}
                className="shrink-0 rounded-lg px-3 py-1 text-xs font-semibold"
                style={{ backgroundColor: "var(--cream-warm)", color: "var(--ink-soft)" }}
              >
                {t("product.edit")}
              </button>
            )}
          </div>
        </SheetHeader>

        {/* SCAN-FLOW-SPEC punkt 4 (Flöde B): tydlig "finns inte ännu"-text för
            okända produkter. Inline svenska tills i18n-nycklar läggs till. */}
        {fromScan && isNotInDb && !verdict && !completionDone && (
          <div className="px-5 pt-3">
            <div
              className="rounded-2xl px-4 py-3"
              style={{ backgroundColor: "var(--mauve-soft)" }}
            >
              <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>
                {t("product.notInDbTitle")}
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--ink-soft)" }}>
                {t("product.notInDbHint")}
              </p>
            </div>
          </div>
        )}

        {/* SS-083 (#3) fromScan CTA-ordning: 1) Spara i katalogen (databasen, INTE hyllan)
            → 2) Analysera (upplåst när produkten är i katalogen) → 3) Lägg i rutin (separat
            steg i canAddToRoutine-sektionen längre ned). */}
        {fromScan && !verdict && (
          <div className="space-y-2 px-5 pt-3">
            {/* 1. Spara i katalogen — bara för produkter som inte redan finns där och
                som har INCI. Saknas INCI visas "lägg till ingredienser"-blocket nedan. */}
            {notInCache && !addedToCatalog ? (
              rawIngredients.length >= 20 && (
                <button
                  type="button"
                  onClick={() => void handleSaveToCatalog()}
                  disabled={isSavingToCatalog}
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-base font-semibold text-white disabled:opacity-60"
                  style={{ backgroundColor: "var(--sage)" }}
                >
                  <Save className="h-4 w-4" aria-hidden />
                  {isSavingToCatalog ? t("common.loading") : t("product.saveToCatalog")}
                </button>
              )
            ) : addedToCatalog ? (
              <p className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--sage-deep)" }}>
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
                {t("product.addedToCatalog")}
              </p>
            ) : null}
            {saveCatalogError && (
              <p className="text-sm" style={{ color: "#C94F4F" }}>
                {saveCatalogError}
              </p>
            )}

            {/* 2. Analysera — tillgänglig först när produkten är i katalogen. */}
            {inCatalog && showAnalyzeButton && !isAnalyzing && (
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="w-full rounded-xl py-3 text-base font-semibold disabled:opacity-60"
                style={{ backgroundColor: "var(--amber-soft)", color: "var(--amber-deep)" }}
              >
                {t("product.analyzeNow")}
              </button>
            )}
            {isAnalyzing && (
              <p className="animate-pulse text-center text-sm font-medium py-2" style={{ color: "var(--sage)" }}>
                {t("scanner.analysing")}
              </p>
            )}
            {analyzeError && (
              <p className="text-center text-sm font-medium py-2" style={{ color: "#C94F4F" }}>
                {analyzeError}
              </p>
            )}

            {/* 3. "Lägg till i rutin" = separat, uttryckligt steg i canAddToRoutine-
                sektionen längre ned (slot-väljare morgon/kväll/ibland). */}
          </div>
        )}

        {fromScan && !rawIngredients && !verdict && (
          <div className="space-y-2 px-5 pt-3">
            <div
              className="rounded-2xl px-4 py-4 space-y-2"
              style={{ backgroundColor: "var(--cream-warm)" }}
            >
              <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                {t("product.missingIngredients")}
              </p>
              <p className="text-xs" style={{ color: "var(--ink-soft)" }}>
                {t("product.missingIngredientsHint")}
              </p>
              <button
                type="button"
                onClick={() => setEditMode(true)}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
                style={{ backgroundColor: "var(--premium-gold)", color: "#fff" }}
              >
                <Plus className="h-3 w-3" aria-hidden />
                {t("product.addIngredients")}
              </button>
            </div>
          </div>
        )}

        {substantiveConflicts.length > 0 && product.shelfId && (
          <p className="px-5 pb-1 pt-3 text-xs" style={{ color: "var(--ink-soft)" }}>
            {t("product.comboConflictContext")}
          </p>
        )}

        <div className="space-y-5 px-5 pb-8 pt-3">
          <div className="space-y-3">
            {showVerdictBadge && (
              <span
                className="inline-flex rounded-full px-4 py-2 text-sm font-semibold"
                style={verdictStyle}
              >
                {verdictCopy}
              </span>
            )}
            {showNoAnalysisHint && !(fromScan && !rawIngredients) && (
              <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
                {t("product.noAnalysis")}
              </p>
            )}
            {(!fromScan || verdict) && showAnalyzeButton && (
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="btn-primary w-full sm:w-auto"
                style={{ fontSize: 13, padding: "10px 16px" }}
              >
                {isAnalyzing ? t("scanner.analysing") : t("product.analyzeNow")}
              </button>
            )}
          </div>

          {canAddToRoutine && (
            <section className="space-y-2">
              {addedConfirm ? (
                <p
                  className="flex items-center gap-2 text-sm font-medium"
                  style={{ color: "var(--sage-deep)" }}
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
                  {t("product.addedToRoutine")}
                </p>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={addToRoutinePending}
                    onClick={() => setSlotPickerOpen((open) => !open)}
                    className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
                    style={{ backgroundColor: "var(--sage)" }}
                  >
                    {addToRoutinePending ? t("myShelf.adding") : t("product.addToRoutine")}
                  </button>
                  {slotPickerOpen && (
                    <div
                      className="flex gap-2 rounded-xl border border-[var(--line)] p-2"
                      style={{ backgroundColor: "var(--cream-warm)" }}
                      role="group"
                      aria-label={t("product.addToRoutine")}
                    >
                      {(
                        [
                          {
                            slot: "morning" as const,
                            icon: Sun,
                            label: t("product.routineSlotMorning"),
                          },
                          {
                            slot: "evening" as const,
                            icon: Moon,
                            label: t("product.routineSlotEvening"),
                          },
                          {
                            slot: "occasional" as const,
                            icon: CalendarDays,
                            label: t("product.routineSlotOccasional"),
                          },
                        ] as const
                      ).map(({ slot, icon: Icon, label }) => (
                        <button
                          key={slot}
                          type="button"
                          disabled={addToRoutinePending}
                          onClick={() => void handleAddToRoutine(slot)}
                          className="flex flex-1 flex-col items-center gap-1 rounded-lg px-2 py-2.5 text-xs font-semibold text-white transition-opacity disabled:opacity-60"
                          style={{ backgroundColor: "var(--sage)" }}
                        >
                          <Icon className="h-4 w-4" aria-hidden />
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
              {addToRoutineError && (
                <p className="text-xs" style={{ color: "var(--rose-gold-deep)" }}>
                  {addToRoutineError}
                </p>
              )}
            </section>
          )}

          {/* Flytta till annan rutin — visas när produkten redan har en slot (morning/evening/occasional) */}
          {canChangeRoutine && (
            <section className="space-y-2">
              {addedConfirm ? (
                <p
                  className="flex items-center gap-2 text-sm font-medium"
                  style={{ color: "var(--sage-deep)" }}
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
                  {t("product.movedToRoutine")}
                </p>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={patchShelfMutation.isPending}
                    onClick={() => setChangeSlotPickerOpen((o) => !o)}
                    className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
                    style={{
                      backgroundColor: "var(--cream-warm)",
                      color: "var(--sage-deep)",
                      border: "1px solid var(--line)",
                    }}
                  >
                    {patchShelfMutation.isPending
                      ? t("myShelf.adding")
                      : t("product.changeRoutine")}
                  </button>
                  {changeSlotPickerOpen && (
                    <div
                      className="flex gap-2 rounded-xl border border-[var(--line)] p-2"
                      style={{ backgroundColor: "var(--cream-warm)" }}
                      role="group"
                      aria-label={t("product.changeRoutine")}
                    >
                      {(
                        [
                          { slot: "morning" as const, icon: Sun, label: t("product.routineSlotMorning") },
                          { slot: "evening" as const, icon: Moon, label: t("product.routineSlotEvening") },
                          { slot: "occasional" as const, icon: CalendarDays, label: t("product.routineSlotOccasional") },
                        ] as const
                      ).map(({ slot, icon: Icon, label }) => (
                        <button
                          key={slot}
                          type="button"
                          disabled={patchShelfMutation.isPending || slot === effectiveRoutineSlot}
                          onClick={() => void handleAddToRoutine(slot)}
                          className="flex flex-1 flex-col items-center gap-1 rounded-lg px-2 py-2.5 text-xs font-semibold text-white transition-opacity disabled:opacity-40"
                          style={{
                            backgroundColor:
                              slot === effectiveRoutineSlot
                                ? "var(--sage-deep)"
                                : "var(--sage)",
                          }}
                        >
                          <Icon className="h-4 w-4" aria-hidden />
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
              {addToRoutineError && (
                <p className="text-xs" style={{ color: "var(--rose-gold-deep)" }}>
                  {addToRoutineError}
                </p>
              )}
            </section>
          )}

          {summary && (
            <div>
              {/* SS-081c: tydliggör att texten ÄR analysresultatet ("Analysen visar"). */}
              <h3 className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--rose-gold)" }}>
                {t("product.analysisHeading")}
              </h3>
              <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--ink-soft)" }}>
                {summary}
              </p>
            </div>
          )}

          {substantiveConflicts.length > 0 && (
            <div className="space-y-2">
              {substantiveConflicts.map((conflict) => (
                <ShelfConflictBanner key={`${conflict.product1Name}-${conflict.product2Name}-${conflict.pair}`}>
                  <span className="block font-medium">{conflict.pair}</span>
                  <span className="mt-1 block font-normal leading-snug">{conflict.explanation}</span>
                </ShelfConflictBanner>
              ))}
            </div>
          )}

          {flaggedIngredients.length > 0 && (
            <section>
              <h3 className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--rose-gold)" }}>
                {t("product.flaggedIngredients")}
              </h3>
              <div className="mt-3 space-y-3">
                {flaggedIngredients.map((flag) => (
                  <div key={`${flag.name}-${flag.severity}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenIngredient(flag.name);
                        setOpenIngredientFlag({
                          severity: flag.severity?.includes("high") ? "HIGH_RISK" : "CAUTION",
                          explanation: flag.reason ?? null,
                        });
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-opacity hover:opacity-80 active:opacity-60"
                      style={{ backgroundColor: "var(--rose-soft)", color: "var(--rose-gold-deep)" }}
                    >
                      {flag.name}
                      <BookOpen className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
                    </button>
                    {flag.reason && (
                      <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--ink-soft)" }}>
                        {flag.reason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* SS-081c: lugn rosa påminnelse — visas när en analys faktiskt visas.
              Formuleringar ändras/varierar mellan länder + foto missar kanter. */}
          {analysis && <IngredientCautionNote />}

          <section>
            <h3 className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--rose-gold)" }}>
              {t("product.ingredients")}
            </h3>
            {rawIngredients ? (
              <>
                {editMode ? (
                  // SS-081 (#2): kamera-OCR i produktkortet. Samma delade modul
                  // (IngredientsCapture) som i ScanEntry/ContributeModal — foto →
                  // OCR → fyller fältet, plus runda-flaskan-notisen.
                  <IngredientsCapture
                    value={editIngredients}
                    onChange={setEditIngredients}
                    placeholder={t("contribute.ingredients")}
                    rows={6}
                    className="mt-2"
                  />
                ) : (
                  <div
                    className="mt-2 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--cream-warm)] p-3 leading-relaxed"
                    style={{
                      // SS-081c: klipp BARA långa listor (och bara när hopfällda).
                      // Tidigare klipptes alltid vid 160px medan "Visa alla"-knappen
                      // bara dök upp vid >520 tecken → medellånga listor (t.ex. ACO,
                      // 270 tecken) klipptes UTAN sätt att expandera. Nu följs de åt.
                      maxHeight:
                        expanded || rawIngredients.length <= INGREDIENTS_COLLAPSE_AT ? "none" : 160,
                    }}
                  >
                    <IngredientTokenList ingredientsText={ingredientPreview} />
                  </div>
                )}
                {!editMode && rawIngredients.length > INGREDIENTS_COLLAPSE_AT && (
                  <button
                    type="button"
                    onClick={() => setExpanded((value) => !value)}
                    className="mt-2 text-sm font-semibold"
                    style={{ color: "var(--rose-gold-deep)" }}
                  >
                    {expanded ? t("product.showLess") : t("product.showAll")}
                  </button>
                )}
              </>
            ) : editMode ? (
              // SS-081 (#2/#3): tomt INCI-fält (saknas eller var prosa-junk) →
              // visa kamera-OCR + textfält så användaren kan foto-skanna listan.
              <IngredientsCapture
                value={editIngredients}
                onChange={setEditIngredients}
                placeholder={t("contribute.ingredients")}
                rows={6}
                className="mt-2"
              />
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                {t("product.ingredientsMissing")}
              </p>
            )}
          </section>

          {editMode && (
            <div className="flex flex-wrap gap-2 border-t border-[var(--line)] pt-4">
              <button
                type="button"
                onClick={() => void handleSaveEdits()}
                disabled={editSaving}
                className="btn-primary flex-1"
                style={{ height: 40, fontSize: 13 }}
              >
                {editSaving
                  ? t("common.loading")
                  : isNotInDb
                    ? t("complete.contributeProductCta")
                    : t("product.saveEdits")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditMode(false);
                  setEditName(productName);
                  setEditBrand(localBrand);
                  // SS-081: behåll tomt EAN-fält för platshållarprodukter på avbryt.
                  setEditBarcode(hasRealBarcode ? (barcode ?? "") : "");
                  setEditIngredients(rawIngredients);
                  setEditError(null);
                }}
                className="btn-secondary"
                style={{ height: 40, fontSize: 13, flex: "0 0 80px" }}
              >
                {t("common.cancel")}
              </button>
              {editError && <p className="basis-full text-xs text-red-500">{editError}</p>}
            </div>
          )}

          {missingField && !completionDone && (
            <section className="border-t border-[var(--line)] pt-5">
              <h3 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                {missingField === "image"
                  ? t("complete.imagePrompt")
                  : missingField === "barcode"
                    ? t("complete.barcodePrompt")
                    : t("complete.brandPrompt")}
              </h3>
              {missingField === "barcode" && (
                <p className="mt-1 text-xs" style={{ color: "var(--ink-soft)" }}>
                  {t("complete.barcodeHint")}
                </p>
              )}
              {missingField === "image" ? (
                <>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void saveImageCompletion(file);
                      event.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    disabled={completionSaving}
                    onClick={() => imageInputRef.current?.click()}
                    className="mt-3 w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                    style={{ backgroundColor: "var(--premium-gold)" }}
                  >
                    {completionSaving ? t("common.loading") : t("complete.photoCta")}
                  </button>
                </>
              ) : (
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    inputMode={missingField === "barcode" ? "numeric" : "text"}
                    maxLength={missingField === "barcode" ? 14 : undefined}
                    value={completionValue}
                    onChange={(event) =>
                      setCompletionValue(
                        missingField === "barcode"
                          ? event.target.value.replace(/\D/g, "").slice(0, 14)
                          : event.target.value,
                      )
                    }
                    className="min-w-0 flex-1 rounded-xl border border-[var(--line)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    disabled={completionSaving || !completionValue.trim()}
                    onClick={() => void saveCompletion(missingField, completionValue)}
                    className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    style={{ backgroundColor: "var(--premium-gold)" }}
                  >
                    {t("complete.save")}
                  </button>
                </div>
              )}
              {/* Poäng-text borttagen per SS-059 (bidrag är inte en spel-mekanik) */}
              {completionError && <p className="mt-2 text-xs text-red-500">{completionError}</p>}
            </section>
          )}

          {/* Bidrags-CTA: produkten saknar real barcode = inte i cached_products.
              Öppnar editMode direkt så bidraget sker i samma produktkort. */}
          {isNotInDb && !editMode && !completionDone && (
            <section className="border-t border-[var(--line)] pt-5">
              <h3 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                {t("complete.contributeProductPrompt")}
              </h3>
              <p className="mt-1 text-xs" style={{ color: "var(--ink-soft)" }}>
                {t("complete.contributeProductHint")}
              </p>
              <button
                type="button"
                onClick={() => setEditMode(true)}
                className="btn-contribute mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
                style={{ backgroundColor: "var(--premium-gold)" }}
              >
                <Plus className="h-4 w-4" aria-hidden />
                {t("complete.contributeProductCta")}
              </button>
              {/* Poäng-text borttagen per SS-059 */}
            </section>
          )}

          {completionDone && !editError && (
            <p className="border-t border-[var(--line)] pt-5 text-sm font-medium" style={{ color: "var(--sage-deep)" }}>
              {t("complete.thanks")}
            </p>
          )}

          {/* SS-079 (#flag): community correction. Only for products with a real
              barcode (those live in cached_products and can be reported). */}
          {hasRealBarcode && !editMode && (
            <section className="border-t border-[var(--line)] pt-5">
              {flagDone ? (
                <p className="text-sm font-medium" style={{ color: "var(--sage-deep)" }}>
                  Tack! Vi har tagit emot din rapport och granskar uppgifterna.
                </p>
              ) : flagOpen ? (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                    Vad stämmer inte?
                  </h3>
                  <textarea
                    value={flagReason}
                    onChange={(event) => setFlagReason(event.target.value)}
                    rows={3}
                    maxLength={500}
                    placeholder="T.ex. fel ingredienslista, fel bild eller fel namn"
                    className="textarea-base text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={flagSaving || !flagReason.trim()}
                      onClick={() => void handleFlag()}
                      className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                      style={{ backgroundColor: "var(--rose-gold-deep)" }}
                    >
                      {flagSaving ? "Skickar…" : "Skicka rapport"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setFlagOpen(false); setFlagError(null); }}
                      className="btn-secondary"
                      style={{ height: 38, fontSize: 13 }}
                    >
                      Avbryt
                    </button>
                  </div>
                  {flagError && <p className="text-xs text-red-500">{flagError}</p>}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setFlagOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold"
                  style={{ color: "var(--ink-soft)" }}
                >
                  <Flag className="h-3.5 w-3.5" aria-hidden />
                  Rapportera felaktig info
                </button>
              )}
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>

    <IngredientDetailSheet
      open={Boolean(openIngredient)}
      onOpenChange={(next) => {
        if (!next) {
          setOpenIngredient(null);
          setOpenIngredientFlag(null);
        }
      }}
      ingredient={openIngredient}
      flag={openIngredientFlag}
    />
    </>
  );
}

/**
 * Resize an image File to at most `maxPx` on its longest side and re-encode
 * as JPEG at `quality` (0–1). Returns a new File so MIME type is always
 * image/jpeg. Falls back to the original file if Canvas is unavailable.
 */
function resizeImageFile(
  file: File,
  maxPx = 1200,
  quality = 0.82,
): Promise<File> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { naturalWidth: w, naturalHeight: h } = img;
      // Skip resize if already small enough
      if (w <= maxPx && h <= maxPx) {
        resolve(file);
        return;
      }
      const scale = maxPx / Math.max(w, h);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file); // fallback: no canvas support
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }));
        },
        "image/jpeg",
        quality,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.includes(",") ? result.split(",")[1] ?? "" : result);
    };
    reader.readAsDataURL(file);
  });
}
