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
