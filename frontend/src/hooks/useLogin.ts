import { useState, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { applyUserCalendarPreference } from '@/contexts/CalendarContext';
import { getApiBaseUrl } from '@/lib/api-base-url';
import {
  buildSessionUser,
  parseLoginResponse,
  persistSessionUser,
} from '@/lib/auth-session';

interface LoginCredentials {
  email: string;
  password: string;
}

export function useLogin() {
  const { setUser } = useAuth();
  const [loading, setLoading] = useState(false);

  const login = useCallback(
    async ({ email, password }: LoginCredentials) => {
      setLoading(true);
      try {
        const response = await axios.post(
          `${getApiBaseUrl()}/login/`,
          { email, password },
          {
            headers: { 'Content-Type': 'application/json' },
            validateStatus: (status) => status < 500,
          },
        );

        const contentType = response.headers['content-type'] || '';
        if (contentType.includes('text/html')) {
          throw new Error(
            'Login API returned HTML instead of JSON. Ensure /api/login/ is proxied to Django on the server.',
          );
        }

        if (response.status >= 400) {
          const data = response.data as {
            detail?: string;
            message?: string;
            non_field_errors?: string[];
            errors?: Record<string, string[] | string>;
          };
          const detail =
            data?.detail ||
            data?.message ||
            data?.non_field_errors?.[0] ||
            (typeof data?.errors === 'object'
              ? Object.values(data.errors).flat().find(Boolean)
              : undefined) ||
            'Login failed. Please check your credentials.';
          throw new Error(String(detail));
        }

        const loginResponse = parseLoginResponse(response.data);
        const sessionUser = buildSessionUser(loginResponse);

        if (loginResponse.user.preferred_calendar) {
          applyUserCalendarPreference(loginResponse.user.preferred_calendar);
        }

        const saved = persistSessionUser(setUser, sessionUser);
        if (!saved) {
          throw new Error('Could not save login session in the browser.');
        }

        toast.success('Login successful!');
        window.location.replace('/');
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Login failed. Please try again.';
        toast.error('Login failed', { description: message });
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [setUser],
  );

  return { login, loading };
}
