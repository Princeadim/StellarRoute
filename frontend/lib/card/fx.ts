/**
 * CARD-10 – Indicative FX quote from USDC to fiat.
 *
 * Rates are fixture values snapshotted on 2026-10-02 and are intentionally
 * labelled indicative (indicative: true) so callers can never mistake them
 * for live market rates.  The actual settlement rate is determined at the
 * point of card authorisation by the card programme operator.
 *
 * Additive-only: this file has no side-effects, touches no existing module,
 * and is not imported by any production route by default.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** ISO 4217 currency code (three uppercase letters). */
export type FiatCurrency = string;

/** A dated snapshot entry in the fixture rate table. */
export interface FxRateEntry {
  /** ISO 4217 currency code. */
  currency: FiatCurrency;
  /** How many fiat units one USDC buys (mid-market, indicative). */
  usdcToFiat: number;
  /** Number of minor-unit decimal places for this currency (e.g. 2 for EUR, 0 for JPY). */
  decimals: number;
  /** ISO 8601 date the rate was snapshotted – for display / audit only. */
  snapshotDate: string;
}

/** Input to the quote function. */
export interface FxQuoteInput {
  /** USDC amount to convert (must be ≥ 0). */
  usdc: number;
  /** ISO 4217 target fiat currency code (case-insensitive). */
  fiat: FiatCurrency;
}

/** Result returned by the quote function. */
export interface FxQuoteResult {
  /** Input USDC amount. */
  usdc: number;
  /** Target fiat currency (normalised to upper-case). */
  fiat: FiatCurrency;
  /** Converted fiat amount, rounded to the currency's decimal places. */
  fiatAmount: number;
  /** The usdcToFiat rate that was applied. */
  rate: number;
  /** Always true – callers must display a disclosure that this is indicative. */
  indicative: true;
  /** ISO 8601 snapshot date of the rate used. */
  rateDate: string;
}

// ---------------------------------------------------------------------------
// Fixture rate table
// ---------------------------------------------------------------------------

/**
 * Fixture rates – mid-market snapshots dated 2026-10-02.
 * Covers a representative basket of currencies used in card programmes.
 */
export const FX_RATE_TABLE: readonly FxRateEntry[] = [
  { currency: 'EUR', usdcToFiat: 0.90,     decimals: 2, snapshotDate: '2026-10-02' },
  { currency: 'GBP', usdcToFiat: 0.78,     decimals: 2, snapshotDate: '2026-10-02' },
  { currency: 'JPY', usdcToFiat: 149.50,   decimals: 0, snapshotDate: '2026-10-02' },
  { currency: 'NGN', usdcToFiat: 1620.00,  decimals: 2, snapshotDate: '2026-10-02' },
  { currency: 'CAD', usdcToFiat: 1.36,     decimals: 2, snapshotDate: '2026-10-02' },
  { currency: 'AUD', usdcToFiat: 1.53,     decimals: 2, snapshotDate: '2026-10-02' },
  { currency: 'CHF', usdcToFiat: 0.88,     decimals: 2, snapshotDate: '2026-10-02' },
  { currency: 'BRL', usdcToFiat: 4.97,     decimals: 2, snapshotDate: '2026-10-02' },
  { currency: 'MXN', usdcToFiat: 17.15,    decimals: 2, snapshotDate: '2026-10-02' },
  { currency: 'KES', usdcToFiat: 129.00,   decimals: 2, snapshotDate: '2026-10-02' },
  { currency: 'GHS', usdcToFiat: 15.60,    decimals: 2, snapshotDate: '2026-10-02' },
  { currency: 'ZAR', usdcToFiat: 18.20,    decimals: 2, snapshotDate: '2026-10-02' },
  { currency: 'INR', usdcToFiat: 84.10,    decimals: 2, snapshotDate: '2026-10-02' },
  { currency: 'IDR', usdcToFiat: 15750.00, decimals: 0, snapshotDate: '2026-10-02' },
  { currency: 'PHP', usdcToFiat: 56.50,    decimals: 2, snapshotDate: '2026-10-02' },
  { currency: 'THB', usdcToFiat: 34.20,    decimals: 2, snapshotDate: '2026-10-02' },
  { currency: 'AED', usdcToFiat: 3.67,     decimals: 2, snapshotDate: '2026-10-02' },
  { currency: 'SGD', usdcToFiat: 1.34,     decimals: 2, snapshotDate: '2026-10-02' },
  { currency: 'HKD', usdcToFiat: 7.78,     decimals: 2, snapshotDate: '2026-10-02' },
  { currency: 'KRW', usdcToFiat: 1350.00,  decimals: 0, snapshotDate: '2026-10-02' },
];

// Internal lookup map, built once at module initialisation.
const _rateMap = new Map<string, FxRateEntry>(
  FX_RATE_TABLE.map((e) => [e.currency.toUpperCase(), e]),
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Half-away-from-zero rounding to `decimals` places.
 * e.g. roundHalfAwayFromZero(9.005, 2) === 9.01
 */
export function roundHalfAwayFromZero(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Look up a currency entry from the fixture rate table.
 * Returns `undefined` for unsupported currencies.
 */
export function getFxRateEntry(currency: FiatCurrency): FxRateEntry | undefined {
  return _rateMap.get(currency.toUpperCase());
}

/**
 * Return an indicative FX quote converting `usdc` USDC into `fiat`.
 *
 * Throws if:
 * - `usdc` is not a finite non-negative number
 * - `fiat` is not present in the fixture rate table
 *
 * @example
 * quote({ usdc: 10, fiat: 'EUR' })
 * // → { usdc: 10, fiat: 'EUR', fiatAmount: 9.00, rate: 0.90, indicative: true, rateDate: '2026-10-02' }
 */
export function quote(input: FxQuoteInput): FxQuoteResult {
  const { usdc, fiat } = input;

  if (!Number.isFinite(usdc) || usdc < 0) {
    throw new Error('USDC amount must be a finite non-negative number.');
  }

  const normalised = fiat.toUpperCase();
  const entry = _rateMap.get(normalised);

  if (!entry) {
    throw new Error(
      `Unsupported fiat currency: "${fiat}". ` +
        `Supported currencies: ${[..._rateMap.keys()].sort().join(', ')}.`,
    );
  }

  const rawFiatAmount = usdc * entry.usdcToFiat;
  const fiatAmount = roundHalfAwayFromZero(rawFiatAmount, entry.decimals);

  return {
    usdc,
    fiat: normalised,
    fiatAmount,
    rate: entry.usdcToFiat,
    indicative: true,
    rateDate: entry.snapshotDate,
  };
}
