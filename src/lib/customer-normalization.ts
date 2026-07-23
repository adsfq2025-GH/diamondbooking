export function normalizeCustomerName(input: string) {
  return input.trim().replace(/\s+/g, " ");
}

export function normalizeCustomerEmail(input: string) {
  return input.trim().toLowerCase();
}

export function normalizeCustomerPhone(input: string | null | undefined) {
  const trimmed = input?.trim();
  return trimmed ? trimmed : null;
}
