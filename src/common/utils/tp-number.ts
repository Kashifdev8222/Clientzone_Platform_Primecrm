/** Generate PrimeCRM-style numeric trading account (TP) numbers. */
export function generateTpNumber(): string {
  // 11–12 digits, typically starting with 2 (matches portal examples like 23556713051)
  const base = 2_000_000_0000; // 11 digits min
  const span = 7_999_999_9999;
  const n = base + Math.floor(Math.random() * span);
  return String(n);
}

export function isNumericTp(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^\d{8,16}$/.test(String(value).trim());
}
