// ICO file format converter.
// Converts raster images and SVGs to ICO format with multiple sizes.

import { isJpegXlFile, isJpegXlMime, isSvgFile, isSvgMime } from './imageFormats';

export interface IconSize {
  size: number;
  label: string;
}

export const AVAILABLE_SIZES: IconSize[] = [
  { size: 16, label: '16×16' },
  { size: 32, label: '32×32' },
  { size: 48, label: '48×48' },
  { size: 64, label: '64×64' },
  { size: 128, label: '128×128' },
  { size: 256, label: '256×256' },
];

export type SizeSelection = 'auto' | number[];

export interface ImageInfo {
  width: number;
  height: number;
  /** True for SVG sources, which can be rasterized at any size. */
  isVector: boolean;
}

const DEFAULT_SVG_SIZE = 256;

/**
 * Get sizes to include based on the selection and image dimensions.
 * Pass `Infinity` as `imageDimension` for vector sources so every size is
 * available regardless of the SVG intrinsic size.
 */
export function getEffectiveSizes(
  selection: SizeSelection,
  imageDimension: number
): number[] {
  if (selection === 'auto') {
    return AVAILABLE_SIZES
      .filter((s) => s.size <= imageDimension)
      .map((s) => s.size);
  }
  return selection.filter((size) => size <= imageDimension);
}

/**
 * Parse an SVG length such as "24", "24px", or "2cm".
 * Returns null for percentages, em/ex units, and invalid values.
 */
function parseSvgLength(value: string | null): number | null {
  if (!value) return null;

  const match = /^\s*([0-9]*\.?[0-9]+)\s*(px|pt|pc|mm|cm|in)?\s*$/i.exec(value);
  if (!match) return null;

  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function isSvgSource(source: File | Blob): boolean {
  if (isSvgMime(source.type)) return true;
  return 'name' in source && isSvgFile(source as File);
}

/**
 * Read the SVG root to determine its intrinsic size, then normalize the
 * width/height attributes so browsers rasterize it consistently when the SVG
 * is loaded through an HTMLImageElement.
 */
async function prepareSvgBlob(source: Blob): Promise<{ blob: Blob; width: number; height: number }> {
  const text = await source.text();
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  const root = doc.documentElement;

  if (
    !root ||
    root.localName.toLowerCase() !== 'svg' ||
    doc.getElementsByTagName('parsererror').length > 0
  ) {
    throw new Error('The SVG file is invalid or could not be parsed.');
  }

  const viewBox = (root.getAttribute('viewBox') ?? '')
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  const hasViewBox =
    viewBox.length === 4 &&
    viewBox.every(Number.isFinite) &&
    viewBox[2] > 0 &&
    viewBox[3] > 0;

  let width = parseSvgLength(root.getAttribute('width'));
  let height = parseSvgLength(root.getAttribute('height'));

  if (hasViewBox) {
    const ratio = viewBox[2] / viewBox[3];
    if (!width && !height) {
      width = viewBox[2];
      height = viewBox[3];
    } else if (width && !height) {
      height = width / ratio;
    } else if (height && !width) {
      width = height * ratio;
    }
  }

  if (!width || !height) {
    width = DEFAULT_SVG_SIZE;
    height = DEFAULT_SVG_SIZE;
  }

  root.setAttribute('width', String(width));
  root.setAttribute('height', String(height));
  if (!root.getAttribute('xmlns')) {
    root.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  }

  const blob = new Blob([new XMLSerializer().serializeToString(root)], {
    type: 'image/svg+xml',
  });

  return { blob, width, height };
}

function decodeErrorMessage(source: File | Blob): string {
  if (isJpegXlMime(source.type) || ('name' in source && isJpegXlFile(source as File))) {
    return 'This browser cannot decode JPEG XL. Use a recent version of Chrome, Firefox, or Safari.';
  }
  return 'The image could not be decoded. It may be corrupted or in a format this browser does not support.';
}

function loadHtmlImage(source: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(source);

    const cleanup = () => URL.revokeObjectURL(url);

    img.onload = () => {
      cleanup();
      resolve(img);
    };

    img.onerror = () => {
      cleanup();
      reject(new Error(decodeErrorMessage(source)));
    };

    img.src = url;
  });
}

/**
 * Load an image and resolve its intrinsic dimensions. SVG sources are parsed
 * first so that missing or percentage-based width/height do not break decoding.
 */
async function loadImageWithInfo(
  file: File | Blob
): Promise<{ image: HTMLImageElement; info: ImageInfo }> {
  if (isSvgSource(file)) {
    const prepared = await prepareSvgBlob(file);
    const image = await loadHtmlImage(prepared.blob);
    return {
      image,
      info: { width: prepared.width, height: prepared.height, isVector: true },
    };
  }

  const image = await loadHtmlImage(file);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;

  if (!width || !height) {
    throw new Error('The image has invalid dimensions.');
  }

  return { image, info: { width, height, isVector: false } };
}

/**
 * Draw an image into a square canvas, preserving its aspect ratio and centering
 * it on a transparent background. Vector images are rendered natively at the
 * target size, so each ICO entry stays sharp.
 */
function renderToImageData(
  img: HTMLImageElement,
  targetSize: number,
  sourceWidth: number,
  sourceHeight: number
): ImageData {
  if (!sourceWidth || !sourceHeight) {
    throw new Error('The image has invalid dimensions.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetSize;
  canvas.height = targetSize;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D is not available in this browser.');
  }

  ctx.clearRect(0, 0, targetSize, targetSize);

  const scale = Math.min(targetSize / sourceWidth, targetSize / sourceHeight);
  const scaledWidth = sourceWidth * scale;
  const scaledHeight = sourceHeight * scale;

  const x = (targetSize - scaledWidth) / 2;
  const y = (targetSize - scaledHeight) / 2;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

  return ctx.getImageData(0, 0, targetSize, targetSize);
}

/**
 * Create an ICO file from multiple image data entries.
 */
function createIcoBlob(images: { size: number; data: ImageData }[]): Blob {
  // ICO file structure:
  // - ICO header (6 bytes)
  // - Image directory entries (16 bytes each)
  // - Image data (PNG payload for each size)

  const pngDataArray: Uint8Array[] = [];

  for (const { size, data } of images) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D is not available in this browser.');
    }

    ctx.putImageData(data, 0, 0);

    const dataUrl = canvas.toDataURL('image/png');
    const base64 = dataUrl.split(',')[1];
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);

    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    pngDataArray.push(bytes);
  }

  const headerSize = 6;
  const directorySize = 16 * images.length;
  const totalPngSize = pngDataArray.reduce((sum, arr) => sum + arr.length, 0);
  const totalSize = headerSize + directorySize + totalPngSize;

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);

  // ICO header
  view.setUint16(0, 0, true); // Reserved, must be 0
  view.setUint16(2, 1, true); // Image type: 1 = ICO
  view.setUint16(4, images.length, true); // Number of images

  let dataOffset = headerSize + directorySize;

  for (let i = 0; i < images.length; i++) {
    const { size } = images[i];
    const pngData = pngDataArray[i];
    const directoryOffset = headerSize + i * 16;

    // Image directory entry (16 bytes)
    view.setUint8(directoryOffset + 0, size >= 256 ? 0 : size); // Width (0 = 256)
    view.setUint8(directoryOffset + 1, size >= 256 ? 0 : size); // Height (0 = 256)
    view.setUint8(directoryOffset + 2, 0); // Color palette (0 = no palette)
    view.setUint8(directoryOffset + 3, 0); // Reserved
    view.setUint16(directoryOffset + 4, 1, true); // Color planes
    view.setUint16(directoryOffset + 6, 32, true); // Bits per pixel
    view.setUint32(directoryOffset + 8, pngData.length, true); // Image size
    view.setUint32(directoryOffset + 12, dataOffset, true); // Offset to image data

    const dataView = new Uint8Array(buffer, dataOffset, pngData.length);
    dataView.set(pngData);

    dataOffset += pngData.length;
  }

  return new Blob([buffer], { type: 'image/x-icon' });
}

/**
 * Load an image from a File or Blob.
 */
export async function loadImage(file: File | Blob): Promise<HTMLImageElement> {
  const { image } = await loadImageWithInfo(file);
  return image;
}

/**
 * Read intrinsic dimensions and whether the source is a vector image.
 */
export async function getImageInfo(file: File): Promise<ImageInfo> {
  const { info } = await loadImageWithInfo(file);
  return info;
}

/**
 * Convert an image file to ICO format.
 */
export async function convertToIco(
  file: File,
  sizeSelection: SizeSelection
): Promise<{ blob: Blob; filename: string; sizes: number[] }> {
  const { image, info } = await loadImageWithInfo(file);
  const minDimension = Math.min(info.width, info.height);

  // Vector sources are rendered directly at each size, so they are not limited
  // by their intrinsic dimensions.
  const sizes = getEffectiveSizes(
    sizeSelection,
    info.isVector ? Infinity : minDimension
  );

  if (sizes.length === 0) {
    throw new Error('Image is too small to create an icon. Minimum size is 16×16.');
  }

  // Sort sizes in descending order (largest first in the ICO file).
  const sortedSizes = [...sizes].sort((a, b) => b - a);

  const images = sortedSizes.map((size) => ({
    size,
    data: renderToImageData(image, size, info.width, info.height),
  }));

  const blob = createIcoBlob(images);

  const baseName = file.name.replace(/\.[^.]+$/, '');
  const filename = `${baseName}.ico`;

  return { blob, filename, sizes: sortedSizes };
}

/**
 * Get image dimensions from a file.
 */
export async function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  const info = await getImageInfo(file);
  return { width: info.width, height: info.height };
}

/**
 * Create a preview of the image at a specific size.
 */
export async function createPreview(file: File, size: number): Promise<string> {
  const { image, info } = await loadImageWithInfo(file);
  const data = renderToImageData(image, size, info.width, info.height);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D is not available in this browser.');
  }

  ctx.putImageData(data, 0, 0);

  return canvas.toDataURL('image/png');
}
