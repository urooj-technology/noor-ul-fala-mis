import type { User } from '@/contexts/AuthContext';

export interface LoginApiResponse {
  token: string;
  user: {
    id?: number | string;
    username?: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    address?: string;
    profile_picture?: string | null;
    role?: string;
    is_buyer?: boolean;
    is_seller?: boolean;
    is_finance?: boolean;
    is_admin?: boolean;
    is_active?: boolean;
    is_staff?: boolean;
    permissions?: string[];
    preferred_calendar?: string;
    created_at?: string;
    updated_at?: string;
  };
}

export function isHtmlPayload(data: unknown): boolean {
  if (typeof data !== 'string') return false;
  const trimmed = data.trim().toLowerCase();
  return trimmed.startsWith('<!doctype html') || trimmed.startsWith('<html');
}

export function parseLoginResponse(data: unknown): LoginApiResponse {
  if (isHtmlPayload(data)) {
    throw new Error(
      'Login API returned the web page instead of JSON. Check VITE_API_URL points to the Django API.',
    );
  }

  if (!data || typeof data !== 'object') {
    throw new Error('Invalid login response from server.');
  }

  const payload = data as Partial<LoginApiResponse>;
  const token = typeof payload.token === 'string' ? payload.token.trim() : '';
  const user = payload.user;

  if (!token || !user || typeof user !== 'object') {
    throw new Error('Login response is missing token or user data.');
  }

  const email = typeof user.email === 'string' ? user.email.trim() : '';
  const username =
    (typeof user.username === 'string' && user.username.trim()) || email;

  if (!email || !username) {
    throw new Error('Login response is missing email or username.');
  }

  return { token, user: { ...user, email, username } };
}

export function buildSessionUser(response: LoginApiResponse): User {
  const { token, user } = response;
  const role = user.role?.trim().toLowerCase() || (user.is_admin ? 'admin' : 'viewer');

  return {
    id: user.id != null ? String(user.id) : '',
    username: user.username || user.email || '',
    email: user.email || '',
    name:
      `${user.first_name || ''} ${user.last_name || ''}`.trim() ||
      user.username ||
      user.email ||
      'User',
    first_name: user.first_name || undefined,
    last_name: user.last_name || undefined,
    phone: user.phone || undefined,
    address: user.address || undefined,
    profile_picture: user.profile_picture || undefined,
    role: role as User['role'],
    is_buyer: Boolean(user.is_buyer),
    is_seller: Boolean(user.is_seller),
    is_finance: Boolean(user.is_finance),
    is_admin: Boolean(user.is_admin) || role === 'admin' || role === 'super_admin',
    is_active: user.is_active !== false,
    is_staff: Boolean(user.is_staff),
    is_super_admin: role === 'super_admin',
    permissions: Array.isArray(user.permissions) ? user.permissions : [],
    created_at: user.created_at ? String(user.created_at) : '',
    updated_at: user.updated_at ? String(user.updated_at) : '',
    token,
  };
}

export function persistSessionUser(
  setUser: (user: User | null) => void,
  sessionUser: User,
): boolean {
  setUser(sessionUser);
  try {
    const stored = localStorage.getItem('user');
    if (!stored) return false;
    const parsed = JSON.parse(stored);
    return Boolean(parsed?.token);
  } catch {
    return false;
  }
}
