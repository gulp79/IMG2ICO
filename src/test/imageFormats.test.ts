import { describe, it, expect } from 'vitest';
import {
  ACCEPT_ATTRIBUTE,
  getInputFormat,
  getSupportedFormatSummary,
  isJpegXlFile,
  isSvgFile,
  isSupportedImageFile,
} from '@/utils/imageFormats';

const makeFile = (name: string, type = '') => new File([''], name, { type });

describe('image formats', () => {
  it('accepts supported formats by MIME type', () => {
    expect(getInputFormat(makeFile('photo.png', 'image/png'))?.label).toBe('PNG');
    expect(getInputFormat(makeFile('photo.jpg', 'image/jpeg'))?.label).toBe('JPEG');
    expect(getInputFormat(makeFile('photo.webp', 'image/webp'))?.label).toBe('WebP');
    expect(getInputFormat(makeFile('photo.avif', 'image/avif'))?.label).toBe('AVIF');
    expect(getInputFormat(makeFile('photo.jxl', 'image/jxl'))?.label).toBe('JPEG XL');
    expect(getInputFormat(makeFile('photo.gif', 'image/gif'))?.label).toBe('GIF');
    expect(getInputFormat(makeFile('photo.bmp', 'image/bmp'))?.label).toBe('BMP');
    expect(getInputFormat(makeFile('icon.svg', 'image/svg+xml'))?.label).toBe('SVG');
  });

  it('normalizes MIME aliases', () => {
    expect(getInputFormat(makeFile('photo.jpg', 'image/jpg'))?.label).toBe('JPEG');
    expect(getInputFormat(makeFile('photo.jpg', 'image/pjpeg'))?.label).toBe('JPEG');
  });

  it('falls back to the file extension when the MIME type is missing', () => {
    expect(isSupportedImageFile(makeFile('photo.jxl'))).toBe(true);
    expect(isJpegXlFile(makeFile('photo.jxl'))).toBe(true);
    expect(isSvgFile(makeFile('icon.svg'))).toBe(true);
  });

  it('rejects formats browsers cannot decode', () => {
    expect(isSupportedImageFile(makeFile('scan.tiff', 'image/tiff'))).toBe(false);
    expect(isSupportedImageFile(makeFile('photo.heic', 'image/heic'))).toBe(false);
    expect(isSupportedImageFile(makeFile('document.pdf', 'application/pdf'))).toBe(false);
  });

  it('builds an accept attribute with MIME types and extensions', () => {
    expect(ACCEPT_ATTRIBUTE).toContain('image/jxl');
    expect(ACCEPT_ATTRIBUTE).toContain('.webp');
    expect(ACCEPT_ATTRIBUTE).toContain('.svg');
  });

  it('lists every supported label', () => {
    expect(getSupportedFormatSummary()).toBe(
      'PNG, JPEG, WebP, AVIF, JPEG XL, GIF, BMP, SVG'
    );
  });
});
