/**
 * Strips internal suffixes from product display names.
 * Removes: -HTF, -HTP, -HTX and similar (case-insensitive) from end of string.
 */
export const cleanProductName = (name) =>
  name?.replace(/\s*-HT[A-Z]+$/i, '').trim() ?? ''
