/**
 * Resolve API base URL for dev and published builds.
 */
export function getApiBaseUrl(): string {
  const configured = (import.meta.env.VITE_API_URL as string | undefined)?.trim();

  if (configured) {
    return configured.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    return `${window.location.origin.replace(/\/$/, '')}/api`;
  }

  return '/api';
}
