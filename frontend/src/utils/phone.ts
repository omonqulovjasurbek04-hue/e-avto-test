/** Same rule as the server: an Uzbek mobile number in any common spelling → "+998XXXXXXXXX" (null if not one). */
export const normalizeUzPhone = (input: string): string | null => {
  let digits = input.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("998")) digits = digits.slice(3);
  else if (digits.length === 10 && digits.startsWith("8")) digits = digits.slice(1);
  return /^\d{9}$/.test(digits) ? `+998${digits}` : null;
};
