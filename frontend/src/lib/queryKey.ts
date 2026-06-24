/** Normalize hook query keys — strings must not be indexed like arrays (e.g. 'equipment'[0] === 'e'). */
export function resolveQueryKeyBase(queryKey: string | string[]): string {
  if (Array.isArray(queryKey)) {
    return queryKey[0] ?? '';
  }
  return queryKey;
}

export function toQueryKeyArray(queryKey: string | string[]): string[] {
  return Array.isArray(queryKey) ? queryKey : [queryKey];
}
