export function availabilitySignalFromStatus(
  status: number | null,
): boolean | null {
  if (status == null) return null;

  if (status >= 200 && status < 400) {
    return true;
  }

  if (status === 404 || status === 410) {
    return false;
  }

  // Other statuses (405, 429, 5xx, etc.) are ambiguous.
  // Do not mutate canonical in-stock state from these responses.
  return null;
}
