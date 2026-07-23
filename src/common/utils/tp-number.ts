/** Generate PrimeCRM-style numeric trading account (TP) numbers. */
export function generateTpNumber(): string {
  // Prefer time-based uniqueness (fast, no DB round-trips)
  const core = `${Date.now()}${Math.floor(Math.random() * 900 + 100)}`;
  const digits = core.replace(/\D/g, '').slice(-10);
  return `2${digits.padStart(10, '0')}`.slice(0, 11);
}

export function isNumericTp(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^\d{8,16}$/.test(String(value).trim());
}
