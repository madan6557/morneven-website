export type ThumbnailCropSettings = {
  focusX: number;
  focusY: number;
  zoom: number;
  aspectRatio?: number;
};

const THUMBNAIL_WIDTH = 1280;
const THUMBNAIL_ASPECT_RATIO = 16 / 9;
const THUMBNAIL_TARGET_BYTES = 280 * 1024;
const THUMBNAIL_QUALITIES = [0.78, 0.68, 0.58, 0.5];
const MEDIA_COMPRESS_THRESHOLD_BYTES = 5 * 1024 * 1024;
const MEDIA_TARGET_BYTES = 5 * 1024 * 1024;
const MEDIA_SCALE_STEPS = [Number.POSITIVE_INFINITY, 3000, 2560, 2200];
const MEDIA_QUALITIES = [0.95, 0.92, 0.9, 0.88, 0.85, 0.82];

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Unable to read thumbnail image."));
    };
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number, mime = "image/jpeg") {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Unable to compress thumbnail."));
          return;
        }
        resolve(blob);
      },
      mime,
      quality,
    );
  });
}

function thumbnailName(file: File, extension: "webp" | "jpg") {
  const baseName = file.name.replace(/\.[^.]+$/, "") || "thumbnail";
  return `${baseName}-thumbnail.${extension}`;
}

function mediaName(file: File) {
  const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
  return `${baseName}-optimized.jpg`;
}

async function encodeThumbnail(canvas: HTMLCanvasElement) {
  let mime = "image/webp";
  let extension: "webp" | "jpg" = "webp";
  let bestBlob: Blob;

  try {
    bestBlob = await canvasToBlob(canvas, THUMBNAIL_QUALITIES[0], mime);
    if (bestBlob.type && bestBlob.type !== mime) throw new Error("WebP canvas encoding is unavailable.");
  } catch {
    mime = "image/jpeg";
    extension = "jpg";
    bestBlob = await canvasToBlob(canvas, THUMBNAIL_QUALITIES[0], mime);
  }

  for (const quality of THUMBNAIL_QUALITIES.slice(1)) {
    if (bestBlob.size <= THUMBNAIL_TARGET_BYTES) break;
    bestBlob = await canvasToBlob(canvas, quality, mime);
  }

  return { blob: bestBlob, extension, mime };
}

function drawImageToCanvas(image: HTMLImageElement, maxEdge: number) {
  const largestEdge = Math.max(image.naturalWidth, image.naturalHeight);
  const scale = Number.isFinite(maxEdge) ? Math.min(1, maxEdge / largestEdge) : 1;
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Browser canvas is unavailable.");

  context.fillStyle = "#111111";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  return canvas;
}

export async function compressThumbnailImage(file: File, crop: ThumbnailCropSettings) {
  const image = await loadImage(file);
  const aspectRatio = crop.aspectRatio && crop.aspectRatio > 0 ? crop.aspectRatio : THUMBNAIL_ASPECT_RATIO;
  const width = aspectRatio >= 1 ? THUMBNAIL_WIDTH : Math.round(THUMBNAIL_WIDTH * aspectRatio);
  const height = aspectRatio >= 1 ? Math.round(width / aspectRatio) : THUMBNAIL_WIDTH;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Browser canvas is unavailable.");

  context.fillStyle = "#111";
  context.fillRect(0, 0, width, height);

  const safeZoom = Math.min(3, Math.max(1, crop.zoom || 1));
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight) * safeZoom;
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  const offsetX = -(drawWidth - width) * (Math.min(100, Math.max(0, crop.focusX)) / 100);
  const offsetY = -(drawHeight - height) * (Math.min(100, Math.max(0, crop.focusY)) / 100);

  context.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);

  const encoded = await encodeThumbnail(canvas);
  return new File([encoded.blob], thumbnailName(file, encoded.extension), {
    type: encoded.mime,
    lastModified: Date.now(),
  });
}

export function shouldCompressImageForUpload(file: File) {
  return file.type.startsWith("image/") && file.type !== "image/gif" && file.size > MEDIA_COMPRESS_THRESHOLD_BYTES;
}

export async function compressImageForUpload(file: File) {
  if (!shouldCompressImageForUpload(file)) return file;

  const image = await loadImage(file);
  let bestBlob: Blob | null = null;

  for (const maxEdge of MEDIA_SCALE_STEPS) {
    const canvas = drawImageToCanvas(image, maxEdge);
    for (const quality of MEDIA_QUALITIES) {
      const blob = await canvasToBlob(canvas, quality, "image/jpeg");
      if (!bestBlob || blob.size < bestBlob.size) bestBlob = blob;
      if (blob.size <= MEDIA_TARGET_BYTES) {
        return new File([blob], mediaName(file), {
          type: "image/jpeg",
          lastModified: Date.now(),
        });
      }
    }
  }

  if (!bestBlob || bestBlob.size >= file.size) return file;
  return new File([bestBlob], mediaName(file), {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}
