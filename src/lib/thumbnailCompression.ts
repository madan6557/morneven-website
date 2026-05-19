export type ThumbnailCropSettings = {
  focusX: number;
  focusY: number;
  zoom: number;
};

const THUMBNAIL_WIDTH = 1280;
const THUMBNAIL_ASPECT_RATIO = 16 / 9;
const THUMBNAIL_QUALITIES = [0.82, 0.74, 0.66];

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

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Unable to compress thumbnail."));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      quality,
    );
  });
}

function thumbnailName(file: File) {
  const baseName = file.name.replace(/\.[^.]+$/, "") || "thumbnail";
  return `${baseName}-thumbnail.jpg`;
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

  let bestBlob = await canvasToBlob(canvas, THUMBNAIL_QUALITIES[0]);
  for (const quality of THUMBNAIL_QUALITIES.slice(1)) {
    if (bestBlob.size <= 450 * 1024) break;
    bestBlob = await canvasToBlob(canvas, quality);
  }

  return new File([bestBlob], thumbnailName(file), {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}
