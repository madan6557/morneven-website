export type ThumbnailCropSettings = {
  focusX: number;
  focusY: number;
  zoom: number;
};

const THUMBNAIL_WIDTH = 1280;
const THUMBNAIL_ASPECT_RATIO = 16 / 9;
const THUMBNAIL_TARGET_BYTES = 280 * 1024;
const THUMBNAIL_QUALITIES = [0.78, 0.68, 0.58, 0.5];

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

export async function compressThumbnailImage(file: File, crop: ThumbnailCropSettings) {
  const image = await loadImage(file);
  const width = THUMBNAIL_WIDTH;
  const height = Math.round(width / THUMBNAIL_ASPECT_RATIO);
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
