import { AxiosError } from 'axios';

export function getApiErrorMessage(
  error: unknown,
  fallback: string,
  permissionDeniedMessage = 'You do not have permission to perform this action.',
): string {
  if (error instanceof AxiosError) {
    if (error.response?.status === 403) {
      const detail = error.response.data?.detail;
      return typeof detail === 'string' ? detail : permissionDeniedMessage;
    }
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (error.message) return error.message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}
