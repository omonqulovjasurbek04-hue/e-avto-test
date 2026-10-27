/** Thrown when the browser cannot read the picture at all (an unknown or broken format). */
export class UnreadableImageError extends Error {
  constructor() {
    super("The browser cannot read this image");
  }
}

type Drawable = { source: CanvasImageSource; width: number; height: number; release: () => void };

/**
 * Decodes any picture the browser can show: createImageBitmap covers PNG, JPEG, WebP, GIF, BMP, AVIF
 * and ICO; an <img> element additionally covers SVG (and HEIC on Safari).
 */
async function decode(file: Blob): Promise<Drawable> {
  try {
    const bitmap = await createImageBitmap(file);
    return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.decoding = "async";
      img.src = url;
      await img.decode();
      // An SVG without a size reports 0 x 0; draw it as a 512 square.
      const width = img.naturalWidth || 512;
      const height = img.naturalHeight || 512;
      return { source: img, width, height, release: () => URL.revokeObjectURL(url) };
    } catch {
      URL.revokeObjectURL(url);
      throw new UnreadableImageError();
    }
  }
}

/**
 * Crops a photo to its centre square and scales it down (default 512 x 512) before upload, so even a
 * 100 MB picture becomes a few-KB WebP (JPEG where the browser cannot encode WebP).
 */
export async function squareImage(file: Blob, size = 512): Promise<Blob> {
  const image = await decode(file);
  try {
    const side = Math.min(image.width, image.height);
    const target = Math.min(size, side);
    const canvas = document.createElement("canvas");
    canvas.width = target;
    canvas.height = target;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available");
    // Transparent pictures (PNG, GIF, SVG) get a white background instead of turning black in JPEG.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, target, target);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image.source, (image.width - side) / 2, (image.height - side) / 2, side, side, 0, 0, target, target);

    const encode = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85));
    const webp = await encode("image/webp");
    if (webp && webp.type === "image/webp") return webp;
    const jpeg = await encode("image/jpeg");
    if (!jpeg) throw new Error("Could not prepare the image");
    return jpeg;
  } finally {
    image.release();
  }
}
