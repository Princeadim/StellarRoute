/**
 * CARD-10: Indicative FX quote from USDC to fiat.
 *
 * Provides a dated fixture rate table and a `quote` function that converts
 * a USDC amount into an indicative fiat amount. Rates are fixtures, not live
 * market data — every result includes `indicative: true` so callers can
 * display appropriate disclaimers.
 *
 * Additive-only: this module does not modify any existing swap, quote, or
 * OpenAPI behaviour.
 */

export interface FxFixtureRate {
  /** ISO 4217 currency code, e.g. "EUR", "JPY" */
  currency: string;
  /** Number of decimal places for the currency (JPY = 0, most = 2) */
  decimals: number;
  /** Fixture rate: how many fiat units per 1 USDC */
  rate: number;
}

export interface FxQuoteInput {
  /** USDC amount to convert */
  usdc: number;
  /** Target fiat currency code (ISO 4217) */
  fiat: string;
}

export interface FxQuoteResult {
  /** Fiat amount after applying the fixture rate and rounding */
  fiatAmount: number;
  /** The fixture rate used (fiat units per 1 USDC) */
  rate: number;
  /** Always true — this quote is indicative, not a live rate */
  indicative: boolean;
  /** The fiat currency code */
  currency: string;
}

/** Date the fixture rates were set (ISO 8601). */
export const FX_FIXTURE_DATE = '2026-10-29';

/**
 * Dated fixture rate table: fiat units per 1 USDC.
 * These are indicative placeholder rates, not live market rates.
 */
export const FX_FIXTURE_RATES: readonly FxFixtureRate[] = [
  { currency: 'USD', decimals: 2, rate: 1.0 },
  { currency: 'EUR', decimals: 2, rate: 0.9 },
  { currency: 'GBP', decimals: 2, rate: 0.78 },
  { currency: 'JPY', decimals: 0, rate: 149.5 },
  { currency: 'NGN', decimals: 2, rate: 1580.0 },
];

const rateMap = new Map<string, FxFixtureRate>(
  FX_FIXTURE_RATES.map((r) => [r.currency.toUpperCase(), r]),
);

/**
 * Round a value to the given number of decimal places, half away from zero.
 *
 * Follows the same EPSILON mitigation pattern used in `fees.ts` to avoid
 * floating-point representation errors.
 */
function roundHalfAwayFromZero(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Get the number of decimal places for a currency.
 * Defaults to 2 for currencies not in the fixture table.
 */
export function getCurrencyDecimals(currency: string): number {
  const entry = rateMap.get(currency.toUpperCase());
  return entry ? entry.decimals : 2;
}

/**
 * Get the fixture rate (fiat per 1 USDC) for a currency.
 * Throws if the currency is not in the fixture table.
 */
export function getFixtureRate(currency: string): number {
  const entry = rateMap.get(currency.toUpperCase());
  if (!entry) {
    throw new Error(`No fixture FX rate for currency "${currency}".`);
  }
  return entry.rate;
}

/**
 * Produce an indicative FX quote from USDC to a fiat currency.
 *
 * The result always includes `indicative: true` because rates come from a
 * dated fixture table, not a live market feed. The fiat amount is rounded
 * to the currency's standard decimal places, half away from zero.
 *
 * @throws if `usdc` is not a finite non-negative number
 * @throws if `fiat` currency is not in the fixture table
 */
export function quote({ usdc, fiat }: FxQuoteInput): FxQuoteResult {
  if (!Number.isFinite(usdc) || usdc < 0) {
    throw new Error('USDC amount must be a non-negative number.');
  }

  const entry = rateMap.get(fiat.toUpperCase());
  if (!entry) {
    throw new Error(`No fixture FX rate for currency "${fiat}".`);
  }

  const fiatAmount = roundHalfAwayFromZero(usdc * entry.rate, entry.decimals);

  return {
    fiatAmount,
    rate: entry.rate,
    indicative: true,
    currency: entry.currency,
  };
}
