/**
 * Uzbek mobile numbers in one canonical form: "+998XXXXXXXXX" (9 digits after the country code).
 * Accepts what people actually type: "90 123 45 67", "+998 (90) 123-45-67", "998901234567", "8 90 ...".
 * Returns null when the input is not such a number.
 */
export const normalizeUzPhone = (input: string): string | null => {
  let digits = input.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("998")) digits = digits.slice(3);
  else if (digits.length === 10 && digits.startsWith("8")) digits = digits.slice(1);
  return /^\d{9}$/.test(digits) ? `+998${digits}` : null;
};
