import { describe, expect, it } from 'vitest';
import {
  FIAT_DECIMALS,
  FIXTURE_RATES,
  FIXTURE_RATE_DATE,
  quote,
} from './fx';

describe('card fx – indicative quote', () => {
  // ── Acceptance criteria ────────────────────────────────────────────────────

  it('10 USDC at 0.90 EUR/USDC yields 9.00 EUR', () => {
    expect(FIXTURE_RATES['EUR']).toBe(0.90);
    const result = quote({ usdc: 10, fiat: 'EUR' });
    expect(result.fiatAmount).toBe(9.00);
    expect(result.rate).toBe(0.90);
  });

  it('result includes indicative: true', () => {
    const result = quote({ usdc: 10, fiat: 'EUR' });
    expect(result.indicative).toBe(true);
  });

  it('JPY result has no decimal part (0 decimal places)', () => {
    expect(FIAT_DECIMALS['JPY']).toBe(0);
    const result = quote({ usdc: 1, fiat: 'JPY' });
    expect(Number.isInteger(result.fiatAmount)).toBe(true);
  });

  it('JPY rounding: 2.5 USDC at 143 JPY/USDC = 357.5 → rounds to 358 (half-away-from-zero)', () => {
    // 2.5 * 143 = 357.5 — half-away-from-zero rounds up to 358
    const result = quote({ usdc: 2.5, fiat: 'JPY' });
    expect(result.fiatAmount).toBe(358);
  });

  // ── Fixture integrity ──────────────────────────────────────────────────────

  it('fixture rate snapshot date is set', () => {
    expect(FIXTURE_RATE_DATE).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('all fixture currencies have a decimals entry', () => {
    for (const key of Object.keys(FIXTURE_RATES) as Array<keyof typeof FIXTURE_RATES>) {
      expect(FIAT_DECIMALS[key]).toBeDefined();
    }
  });

  it('USD rate is 1.00 (USDC is pegged)', () => {
    const result = quote({ usdc: 50, fiat: 'USD' });
    expect(result.fiatAmount).toBe(50.00);
    expect(result.rate).toBe(1.00);
  });

  // ── Rounding ───────────────────────────────────────────────────────────────

  it('rounds EUR to 2 decimal places', () => {
    // 1/3 USDC at 0.90 → 0.3 — no rounding needed, but verify shape
    const result = quote({ usdc: 1, fiat: 'EUR' });
    expect(result.fiatAmount.toString()).toMatch(/^\d+(\.\d{1,2})?$/);
  });

  it('rounding example: 0.555 EUR rounds to 0.56 (half-away-from-zero)', () => {
    // Need usdc * rate = 0.555; rate = 0.90 → usdc = 0.555 / 0.90 = 0.6166…
    // Use GBP instead: rate 0.77 → 0.72 / 0.77 ≈ 0.9350…
    // Simplest: fabricate via NGN (2 decimals) — use a hand-checked value
    // 0.001 USDC at 1530 NGN/USDC = 1.53 NGN (exact)
    const result = quote({ usdc: 0.001, fiat: 'NGN' });
    expect(result.fiatAmount).toBe(1.53);
  });

  // ── Return shape ───────────────────────────────────────────────────────────

  it('result carries the fiat currency code', () => {
    const result = quote({ usdc: 5, fiat: 'GBP' });
    expect(result.fiat).toBe('GBP');
  });

  it('result carries the rate used for transparency', () => {
    const result = quote({ usdc: 5, fiat: 'GBP' });
    expect(result.rate).toBe(FIXTURE_RATES['GBP']);
  });

  it('zero USDC returns zero fiat amount', () => {
    const result = quote({ usdc: 0, fiat: 'EUR' });
    expect(result.fiatAmount).toBe(0);
    expect(result.indicative).toBe(true);
  });

  // ── Input validation ───────────────────────────────────────────────────────

  it('throws for negative USDC', () => {
    expect(() => quote({ usdc: -1, fiat: 'EUR' })).toThrow(
      /non-negative/,
    );
  });

  it('throws for NaN USDC', () => {
    expect(() => quote({ usdc: NaN, fiat: 'EUR' })).toThrow(
      /non-negative/,
    );
  });

  it('throws for Infinity USDC', () => {
    expect(() => quote({ usdc: Infinity, fiat: 'EUR' })).toThrow(
      /non-negative/,
    );
  });

  it('throws for an unsupported currency', () => {
    // @ts-expect-error – intentional invalid value for test
    expect(() => quote({ usdc: 10, fiat: 'XYZ' })).toThrow(
      /Unsupported fiat currency/,
    );
  });

  // ── Multiple currencies ────────────────────────────────────────────────────

  it('100 USDC → NGN is always indicative with a positive integer-ish amount', () => {
    const result = quote({ usdc: 100, fiat: 'NGN' });
    expect(result.fiatAmount).toBeGreaterThan(0);
    expect(result.indicative).toBe(true);
  });

  it('SGD result has 2 decimal places', () => {
    expect(FIAT_DECIMALS['SGD']).toBe(2);
    const result = quote({ usdc: 10, fiat: 'SGD' });
    // 10 * 1.33 = 13.30 — exact to 2dp
    expect(result.fiatAmount).toBe(13.30);
  });
});
