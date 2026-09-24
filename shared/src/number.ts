/**
 * Parses user input that may use a decimal comma ("42,37") or point ("42.37").
 * Returns null for empty or invalid input. Thousands separators are not supported,
 * since they are ambiguous between the two notations.
 */
export function parseDecimal(input: string): number | null {
  const normalized = input.trim().replace(",", ".");
  if (!/^\d+(\.\d*)?$|^\.\d+$/.test(normalized)) {
    return null;
  }
  return Number(normalized);
}
