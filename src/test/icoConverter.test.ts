import { describe, it, expect } from 'vitest';
import { AVAILABLE_SIZES, getEffectiveSizes } from '@/utils/icoConverter';

describe('getEffectiveSizes', () => {
  it('includes all sizes up to the smallest image dimension in auto mode', () => {
    expect(getEffectiveSizes('auto', 64)).toEqual([16, 32, 48, 64]);
  });

  it('includes every size for vector sources (Infinity)', () => {
    expect(getEffectiveSizes('auto', Infinity)).toEqual(
      AVAILABLE_SIZES.map(({ size }) => size)
    );
  });

  it('filters manual selections above the image dimension', () => {
    expect(getEffectiveSizes([16, 128, 256], 64)).toEqual([16]);
  });

  it('returns an empty list when the image is too small', () => {
    expect(getEffectiveSizes('auto', 8)).toEqual([]);
    expect(getEffectiveSizes([16, 32], 8)).toEqual([]);
  });
});
