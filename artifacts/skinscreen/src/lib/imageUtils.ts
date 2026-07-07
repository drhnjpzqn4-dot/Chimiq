const DEFAULT_MAX_EDGE = 1500;
const DEFAULT_QUALITY = 0.85;

function resizeLoadedImage(
  img: HTMLImageElement,
  maxEdge: number,
  quality: number,
): string {
  let { width, height } = img;
  if (width > maxEdge || height > maxEdge) {
    if (width >= height) {
      height = Math.round((height * maxEdge) / width);
      width = maxEdge;
    } else {
      width = Math.round((width * maxEdge) / height);
      height = maxEdge;
    }
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("canvas");
  }
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality).split(",")[1] ?? "";
}

function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error("decode"));
    img.onload = () => resolve(img);
    img.src = dataUrl;
  });
}

/** Läs fil → canvas-resize → base64 JPEG (utan data:-prefix). */
export async function resizeImageFileToBase64(
  file: File,
  maxEdge = DEFAULT_MAX_EDGE,
  quality = DEFAULT_QUALITY,
): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read"));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
  return resizeImageDataUrlToBase64(dataUrl, maxEdge, quality);
}

/** Data-URL → canvas-resize → base64 JPEG (utan data:-prefix). */
export async function resizeImageDataUrlToBase64(
  dataUrl: string,
  maxEdge = DEFAULT_MAX_EDGE,
  quality = DEFAULT_QUALITY,
): Promise<string> {
  const img = await loadImageFromDataUrl(dataUrl);
  return resizeLoadedImage(img, maxEdge, quality);
}

/**
 * SS-092: gör en produktbild till en 1:1-kvadrat på vit bakgrund — samma format
 * som butikerna (Lyko/Apotea/Kicks) visar sina packshots i. Vi PADDAR (contain)
 * istället för att beskära, så hela flaskan alltid syns; korta kanter fylls med
 * vitt så bilden ser proffsig ut även om användaren fotat lite rektangulärt.
 *
 * Returnerar en komplett data-URL (med `data:image/jpeg;base64,`-prefix) så den
 * kan visas direkt och sparas som `image_url`.
 */
export async function padToSquareDataUrl(
  dataUrl: string,
  size = 1024,
  quality = 0.9,
  background = "#ffffff",
): Promise<string> {
  const img = await loadImageFromDataUrl(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");

  ctx.fillStyle = background;
  ctx.fillRect(0, 0, size, size);

  // Skala in bilden så den ryms (contain) och centrera den.
  const scale = Math.min(size / img.width, size / img.height);
  const drawW = Math.round(img.width * scale);
  const drawH = Math.round(img.height * scale);
  const dx = Math.round((size - drawW) / 2);
  const dy = Math.round((size - drawH) / 2);
  ctx.drawImage(img, dx, dy, drawW, drawH);

  return canvas.toDataURL("image/jpeg", quality);
}
