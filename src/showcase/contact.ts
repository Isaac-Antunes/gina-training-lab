/**
 * Single source of truth for the public contact address used by the showcase.
 *
 * Privacy note: this is currently a personal Gmail address and it is already
 * public in the repository history and on the live showcase. When a dedicated
 * public alias is available, change ONLY this constant (and keep the alias
 * forwarding to the inbox). `scripts/showcase.test.mjs` imports it, so the
 * bundle-hygiene test follows the same value.
 */
export const CONTACT_EMAIL = 'iantunessp@gmail.com';
