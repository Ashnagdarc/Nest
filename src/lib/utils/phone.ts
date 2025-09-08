export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  const parts = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 10)];
  if (digits.length <= 3) return parts[0];
  if (digits.length <= 6) return `(${parts[0]}) ${parts[1]}`;
  return `(${parts[0]}) ${parts[1]}-${parts[2]}`;
}

export function toE164(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`; // default country US if not provided
  if (digits.startsWith('0') || digits.length < 10) return null;
  return `+${digits}`;
}
