// Supported input formats and helpers.
//
// Decoding is delegated to the browser: every format listed here is decoded
// through an HTMLImageElement. If the browser cannot decode a format (for
// example JPEG XL on older browsers or Edge), loading fails with a clear error.

export interface InputFormat {
  mime: string;
  extensions: string[];
  label: string;
  /** Vector formats are rasterized directly at every icon size. */
  vector?: boolean;
}

export const INPUT_FORMATS: InputFormat[] = [
  { mime: 'image/png', extensions: ['png'], label: 'PNG' },
  { mime: 'image/jpeg', extensions: ['jpg', 'jpeg', 'jpe', 'jfif'], label: 'JPEG' },
  { mime: 'image/webp', extensions: ['webp'], label: 'WebP' },
  { mime: 'image/avif', extensions: ['avif'], label: 'AVIF' },
  { mime: 'image/jxl', extensions: ['jxl'], label: 'JPEG XL' },
  { mime: 'image/gif', extensions: ['gif'], label: 'GIF' },
  { mime: 'image/bmp', extensions: ['bmp', 'dib'], label: 'BMP' },
  { mime: 'image/svg+xml', extensions: ['svg'], label: 'SVG', vector: true },
];

const MIME_ALIASES: Record<string, string> = {
  'image/jpg': 'image/jpeg',
  'image/pjpeg': 'image/jpeg',
  'image/x-png': 'image/png',
};

const FORMAT_BY_MIME = new Map<string, InputFormat>();
const FORMAT_BY_EXTENSION = new Map<string, InputFormat>();

for (const format of INPUT_FORMATS) {
  FORMAT_BY_MIME.set(format.mime, format);
  for (const extension of format.extensions) {
    FORMAT_BY_EXTENSION.set(extension, format);
  }
}

/** Value for the file input `accept` attribute, including MIME types and extensions. */
export const ACCEPT_ATTRIBUTE = Array.from(
  new Set([
    ...INPUT_FORMATS.map((format) => format.mime),
    ...INPUT_FORMATS.flatMap((format) => format.extensions.map((extension) => `.${extension}`)),
  ])
).join(',');

export interface FileDescriptor {
  name?: string;
  type: string;
}

function normalizeMime(type: string): string {
  return MIME_ALIASES[type] ?? type;
}

export function getFileExtension(filename: string): string {
  const match = /\.([^./\\]+)$/.exec(filename.trim().toLowerCase());
  return match ? match[1] : '';
}

/**
 * Resolve the input format from the MIME type, falling back to the file
 * extension when the browser reports an empty or generic type.
 */
export function getInputFormat(file: FileDescriptor): InputFormat | undefined {
  const fromMime = FORMAT_BY_MIME.get(normalizeMime(file.type));
  if (fromMime) return fromMime;

  const extension = getFileExtension(file.name ?? '');
  return extension ? FORMAT_BY_EXTENSION.get(extension) : undefined;
}

export function isSupportedImageFile(file: FileDescriptor): boolean {
  return getInputFormat(file) !== undefined;
}

export function isSvgFile(file: FileDescriptor): boolean {
  return getInputFormat(file)?.mime === 'image/svg+xml';
}

export function isJpegXlFile(file: FileDescriptor): boolean {
  return getInputFormat(file)?.mime === 'image/jxl';
}

export function isSvgMime(type: string): boolean {
  return normalizeMime(type) === 'image/svg+xml';
}

export function isJpegXlMime(type: string): boolean {
  return normalizeMime(type) === 'image/jxl';
}

export function getSupportedFormatSummary(): string {
  return INPUT_FORMATS.map((format) => format.label).join(', ');
}
