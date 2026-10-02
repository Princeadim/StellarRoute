/**
 * Indicative FX rates from USDC to fiat currencies.
 *
 * These are fixture rates for display purposes only — they are NOT live
 * market rates. Every result from quote() carries indicative: true so
 * callers and UI surfaces must label them accordingly.
 *
 * Rates are expressed as fiat units per 1 USDC (e.g. 0.90 means 1 USDC → 0.90 EUR).
 * Last updated: 2026-10-02
 */

export type FiatCurrency =
  | 'EUR'
  | 'GBP'
  | 'USD'
  | 'NGN'
  | 'JPY'
  | 'KES'
  | 'GHS'
  | 'ZAR'
  | 'CAD'
  | 'AUD'
  | 'CHF'
  | 'BRL'
  | 'MXN'
  | 'INR'
  | 'SGD';

/** Decimal places used when rounding a fiat amount for each currency. */
export const FIAT_DECIMALS: Record<FiatCurrency, number> = {
  EUR: 2,
  GBP: 2,
  USD: 2,
  NGN: 2,
  JPY: 0,
  KES: 2,
  GHS: 2,
  ZAR: 2,
  CAD: 2,
  AUD: 2,
  CHF: 2,
  BRL: 2,
  MXN: 2,
  INR: 2,
  SGD: 2,
};

/**
 * Fixture FX rates: fiat units per 1 USDC.
 * All values are indicative only and must not be used for settlement.
 */
export const FIXTURE_RATES: Record<FiatCurrency, number> = {
  EUR: 0.90,
  GBP: 0.77,
  USD: 1.00,
  NGN: 1530.00,
  JPY: 143.00,
  KES: 129.50,
  GHS: 15.20,
  ZAR: 18.35,
  CAD: 1.36,
  AUD: 1.54,
  CHF: 0.88,
  BRL: 4.97,
  MXN: 17.15,
  INR: 83.90,
  SGD: 1.33,
};

/** ISO 8601 date-stamp for the fixture snapshot (YYYY-MM-DD). */
export const FIXTURE_RATE_DATE = '2026-10-02';

export interface FxQuoteInput {
  /** Amount of USDC to convert. Must be a non-negative finite number. */
  usdc: number;
  /** Target fiat currency. Must be a key of FIXTURE_RATES. */
  fiat: FiatCurrency;
}

export interface FxQuoteResult {
  /** Fiat amount, rounded to the currency's standard decimal places (half-away-from-zero). */
  fiatAmount: number;
  /** Fixture exchange rate used: fiat units per 1 USDC. */
  rate: number;
  /** Always true — caller must display an indicative disclaimer. */
  indicative: true;
  /** The fiat currency code. */
  fiat: FiatCurrency;
}

/**
 * Round a number to `decimals` places using half-away-from-zero (round half up
 * for positive values, round half down for negative values).
 *
 * The EPSILON nudge from fees.ts is intentionally NOT used here because we want
 * strict half-away-from-zero semantics for fiat rounding (e.g. 0.5 → 1, not 0).
 */
function roundFiat(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Return an indicative FX quote converting a USDC amount to fiat.
 *
 * @throws {Error} if `usdc` is not a non-negative finite number.
 * @throws {Error} if `fiat` is not a supported currency code.
 *
 * @example
 * quote({ usdc: 10, fiat: 'EUR' })
 * // → { fiatAmount: 9.00, rate: 0.90, indicative: true, fiat: 'EUR' }
 */
export function quote(input: FxQuoteInput): FxQuoteResult {
  const { usdc, fiat } = input;

  if (!Number.isFinite(usdc) || usdc < 0) {
    throw new Error('usdc must be a non-negative finite number.');
  }

  const rate = FIXTURE_RATES[fiat];
  if (rate === undefined) {
    throw new Error(`Unsupported fiat currency: ${fiat}`);
  }

  const decimals = FIAT_DECIMALS[fiat];
  const fiatAmount = roundFiat(usdc * rate, decimals);

  return {
    fiatAmount,
    rate,
    indicative: true,
    fiat,
  };
}
