export function createId(_prefix = 'id'): string {
  return crypto.randomUUID();
}

export function normalizeLocation(value: string): string {
  return value.trim().toLocaleLowerCase();
}

export function locationsMatch(a: string, b: string): boolean {
  return normalizeLocation(a) === normalizeLocation(b);
}

export function parseNameList(raw: string | undefined | null): string[] {
  if (!raw?.trim()) {
    return [];
  }
  return raw
    .split(/[,;|/]+/)
    .map((n) => n.trim())
    .filter(Boolean);
}
