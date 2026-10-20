/**
 * Shared parsing helpers for CRM adapters (CSV, HubSpot, ...).
 * Pure functions, no I/O. Keeping them in one place prevents the adapters from
 * drifting on dates, amounts and header/consent normalization.
 */

/** Removes accents, lowercases and normalizes separators for header/consent keys. */
export function normalizeTextKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, '_');
}

export function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (year < 1900 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** Parses ISO or Brazilian dates into YYYY-MM-DD, validating real calendar days. */
export function parseFlexibleDate(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/);
  if (iso) {
    const [, year, month, day] = iso;
    return isValidCalendarDate(Number(year), Number(month), Number(day))
      ? `${year}-${month}-${day}`
      : null;
  }
  const br = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (br) {
    const [, day, month, year] = br;
    return isValidCalendarDate(Number(year), Number(month), Number(day))
      ? `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      : null;
  }
  return null;
}

/**
 * Accepts ISO/Brazilian date strings and Unix epochs (seconds or milliseconds),
 * as returned by CRM APIs. Always yields a UTC YYYY-MM-DD or null.
 */
export function parseDateLike(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    const ms = value > 10_000_000_000 ? value : value * 1000;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
  }
  const raw = String(value).trim();
  if (!raw) return null;
  if (/^\d{10,13}$/.test(raw)) return parseDateLike(Number(raw));
  return parseFlexibleDate(raw);
}

/** Parses dot-decimal or Brazilian comma-decimal amounts. Blank means 0. */
export function parseAmount(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const cleaned = value.trim().replace(/R\$/gi, '').replace(/\s/g, '');
  if (!cleaned) return 0;
  let normalized = cleaned;
  if (cleaned.includes(',') && cleaned.includes('.')) {
    normalized = cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')
      ? cleaned.replace(/\./g, '').replace(',', '.')
      : cleaned.replace(/,/g, '');
  } else if (cleaned.includes(',')) {
    normalized = cleaned.replace(',', '.');
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}
