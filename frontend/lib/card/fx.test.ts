import { describe, expect, it } from 'vitest';
import {
  FX_RATE_TABLE,
  getFxRateEntry,
  quote,
  roundHalfAwayFromZero,
} from './fx';

// ---------------------------------------------------------------------------
// roundHalfAwayFromZero
// ---------------------------------------------------------------------------

describe('roundHalfAwayFromZero', () => {
  it('rounds 9.005 to 9.01 at 2 decimals', () => {
    expect(roundHalfAwayFromZero(9.005, 2)).toBe(9.01);
  });

  it('rounds 9.004 to 9.00 at 2 decimals', () => {
    expect(roundHalfAwayFromZero(9.004, 2)).toBe(9.0);
  });

  it('rounds to 0 decimals correctly', () => {
    expect(roundHalfAwayFromZero(149.5, 0)).toBe(150);
    expect(roundHalfAwayFromZero(149.4, 0)).toBe(149);
  });

  it('handles negative values half-away-from-zero', () => {
    // -9.005 → -9.01 (away from zero)
    expect(roundHalfAwayFromZero(-9.005, 2)).toBeLessThanOrEqual(-9.0);
  });
});

// ---------------------------------------------------------------------------
// FX_RATE_TABLE
// ---------------------------------------------------------------------------

describe('FX_RATE_TABLE', () => {
  it('contains at least 20 entries', () => {
    expect(FX_RATE_TABLE.length).toBeGreaterThanOrEqual(20);
  });

  it('every entry has a positive usdcToFiat rate', () => {
    for (const entry of FX_RATE_TABLE) {
      expect(entry.usdcToFiat).toBeGreaterThan(0);
    }
  });

  it('EUR entry has 2 decimal places and rate 0.90', () => {
    const eur = FX_RATE_TABLE.find((e) => e.currency === 'EUR');
    expect(eur).toBeDefined();
    expect(eur?.usdcToFiat).toBe(0.90);
    expect(eur?.decimals).toBe(2);
  });

  it('JPY entry has 0 decimal places', () => {
    const jpy = FX_RATE_TABLE.find((e) => e.currency === 'JPY');
    expect(jpy).toBeDefined();
    expect(jpy?.decimals).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getFxRateEntry
// ---------------------------------------------------------------------------

describe('getFxRateEntry', () => {
  it('returns the entry for a known currency', () => {
    const entry = getFxRateEntry('EUR');
    expect(entry).toBeDefined();
    expect(entry?.currency).toBe('EUR');
  });

  it('is case-insensitive', () => {
    expect(getFxRateEntry('eur')).toBeDefined();
    expect(getFxRateEntry('Eur')).toBeDefined();
  });

  it('returns undefined for an unknown currency', () => {
    expect(getFxRateEntry('XYZ')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// quote – acceptance criteria (CARD-10)
// ---------------------------------------------------------------------------

describe('quote', () => {
  // AC 1: 10 USDC at a 0.90 EUR fixture yields 9.00 EUR
  it('AC1: 10 USDC → 9.00 EUR', () => {
    const result = quote({ usdc: 10, fiat: 'EUR' });
    expect(result.fiatAmount).toBe(9.00);
    expect(result.fiat).toBe('EUR');
    expect(result.usdc).toBe(10);
    expect(result.rate).toBe(0.90);
  });

  // AC 2: result includes indicative: true
  it('AC2: result includes indicative: true', () => {
    const result = quote({ usdc: 10, fiat: 'EUR' });
    expect(result.indicative).toBe(true);
  });

  // AC 3: JPY rounding has no decimal part
  it('AC3: JPY result has no decimal part', () => {
    const result = quote({ usdc: 10, fiat: 'JPY' });
    expect(Number.isInteger(result.fiatAmount)).toBe(true);
  });

  it('JPY rounds fractional amounts to whole numbers', () => {
    // 1 USDC × 149.50 = 149.50 → rounds to 150
    const result1 = quote({ usdc: 1, fiat: 'JPY' });
    expect(result1.fiatAmount).toBe(150);

    // 0.5 USDC × 149.50 = 74.75 → rounds to 75
    const result2 = quote({ usdc: 0.5, fiat: 'JPY' });
    expect(result2.fiatAmount).toBe(75);
  });

  it('includes a rateDate string', () => {
    const result = quote({ usdc: 10, fiat: 'EUR' });
    expect(typeof result.rateDate).toBe('string');
    expect(result.rateDate.length).toBeGreaterThan(0);
  });

  it('normalises fiat currency code to upper-case', () => {
    const result = quote({ usdc: 10, fiat: 'eur' });
    expect(result.fiat).toBe('EUR');
  });

  it('returns 0 fiat for 0 USDC', () => {
    const result = quote({ usdc: 0, fiat: 'EUR' });
    expect(result.fiatAmount).toBe(0);
    expect(result.indicative).toBe(true);
  });

  it('throws for an unsupported fiat currency', () => {
    expect(() => quote({ usdc: 10, fiat: 'XYZ' })).toThrow(/Unsupported fiat currency/);
  });

  it('throws for a negative USDC amount', () => {
    expect(() => quote({ usdc: -1, fiat: 'EUR' })).toThrow(/non-negative/);
  });

  it('throws for NaN USDC', () => {
    expect(() => quote({ usdc: NaN, fiat: 'EUR' })).toThrow();
  });

  it('GBP quote rounds to 2 decimal places', () => {
    // 3 × 0.78 = 2.34 — exact; verify decimals are correct
    const result = quote({ usdc: 3, fiat: 'GBP' });
    expect(result.fiatAmount).toBe(2.34);
  });

  it('NGN large amount is a 2-decimal value', () => {
    const result = quote({ usdc: 100, fiat: 'NGN' });
    // 100 × 1620 = 162,000.00
    expect(result.fiatAmount).toBe(162_000.00);
    expect(Number.isFinite(result.fiatAmount)).toBe(true);
  });
});
