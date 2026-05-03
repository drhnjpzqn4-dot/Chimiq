import { useState } from "react";
import { MapPin, Loader2, Search, ExternalLink } from "lucide-react";
import { FadeIn } from "@/components/FadeIn";
import { useTranslation } from "@/lib/i18n";

type State = "idle" | "locating" | "found" | "error";

interface Location {
  lat: number;
  lng: number;
  city: string;
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=12`,
      {
        headers: { "Accept-Language": "en", "User-Agent": "Chimiq/1.0" },
        signal: AbortSignal.timeout(4000),
      },
    );
    if (!res.ok) return "";
    const data = (await res.json()) as { address?: { city?: string; town?: string; county?: string; country?: string } };
    const a = data.address ?? {};
    const city = a.city ?? a.town ?? a.county ?? "";
    const country = a.country ?? "";
    return city ? `${city}, ${country}`.replace(/, $/, "") : country;
  } catch {
    return "";
  }
}

export function FindDermatologist() {
  const { t } = useTranslation();
  const [state, setState] = useState<State>("idle");
  const [location, setLocation] = useState<Location | null>(null);
  const [manualCity, setManualCity] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setErrorMsg(t("derm.errNotSupported"));
      setState("error");
      return;
    }

    setState("locating");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const city = await reverseGeocode(lat, lng);
        setLocation({ lat, lng, city });
        setState("found");
      },
      () => {
        setErrorMsg(t("derm.errDenied"));
        setState("error");
      },
      { timeout: 8000 },
    );
  };

  const handleManualSearch = () => {
    if (!manualCity.trim()) return;
    setLocation({ lat: 0, lng: 0, city: manualCity.trim() });
    setState("found");
  };

  const mapSrc = location
    ? location.lat !== 0
      ? `https://maps.google.com/maps?q=dermatologist&ll=${location.lat},${location.lng}&z=14&output=embed&hl=en`
      : `https://maps.google.com/maps?q=dermatologist+in+${encodeURIComponent(location.city)}&output=embed&hl=en`
    : null;

  const googleMapsUrl = location
    ? location.lat !== 0
      ? `https://www.google.com/maps/search/dermatologist/@${location.lat},${location.lng},14z`
      : `https://www.google.com/maps/search/dermatologist+in+${encodeURIComponent(location.city)}`
    : "https://www.google.com/maps/search/dermatologist+near+me";

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#F5F5F7]">
      <div className="max-w-5xl mx-auto">
        <FadeIn>
          <div className="text-center mb-12">
            <span className="inline-block py-1 px-3 rounded-full bg-primary/10 text-primary text-sm font-medium tracking-wide mb-4">
              {t("derm.expertCare")}
            </span>
            <h2 className="text-3xl md:text-5xl font-serif mb-4">
              {t("derm.findDermatologist")}
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              {t("derm.subtitle")}
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          {state === "idle" && (
            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
              <button
                onClick={handleLocate}
                className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-full font-medium text-sm hover:bg-primary/90 transition-colors shadow-md hover:shadow-lg"
              >
                <MapPin className="w-4 h-4" />
                {t("derm.useMyLocation")}
              </button>
              <span className="text-muted-foreground text-sm">{t("derm.or")}</span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={t("derm.cityPlaceholder")}
                  value={manualCity}
                  onChange={(e) => setManualCity(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
                  className="px-4 py-3 rounded-full border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 w-52"
                />
                <button
                  onClick={handleManualSearch}
                  disabled={!manualCity.trim()}
                  className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-40"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {state === "locating" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">{t("derm.findingLocation")}</p>
            </div>
          )}

          {state === "error" && (
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm text-muted-foreground text-center max-w-sm">{errorMsg}</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={t("derm.cityPlaceholder")}
                  value={manualCity}
                  onChange={(e) => setManualCity(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
                  className="px-4 py-3 rounded-full border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 w-52"
                />
                <button
                  onClick={handleManualSearch}
                  disabled={!manualCity.trim()}
                  className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-40"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {state === "found" && location && mapSrc && (
            <div>
              <div className="flex items-center justify-between mb-4 px-1">
                <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  {t("derm.dermsNear")}{" "}
                  <span className="text-primary font-semibold">{location.city || t("derm.yourLocation")}</span>
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { setState("idle"); setLocation(null); setManualCity(""); }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t("derm.changeLocation")}
                  </button>
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                  >
                    {t("derm.openInMaps")}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div className="rounded-2xl overflow-hidden shadow-lg border border-border/30" style={{ height: "420px" }}>
                <iframe
                  src={mapSrc}
                  width="100%"
                  height="100%"
                  frameBorder={0}
                  scrolling="no"
                  title={t("derm.mapTitle")}
                  className="w-full h-full"
                  loading="lazy"
                />
              </div>

              <p className="text-xs text-muted-foreground/60 text-center mt-3">
                {t("derm.disclaimer")}
              </p>
            </div>
          )}
        </FadeIn>
      </div>
    </section>
  );
}
