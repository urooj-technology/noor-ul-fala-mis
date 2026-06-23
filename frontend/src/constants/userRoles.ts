/** Role values accepted by the backend User model (employee/customer/vendor excluded from UI). */
export const USER_ROLE_OPTIONS = [
  { value: 'admin', labelKey: 'user.roles.admin' },
  { value: 'super_admin', labelKey: 'user.roles.super_admin' },
  { value: 'accountant', labelKey: 'user.roles.accountant' },
  { value: 'hr_manager', labelKey: 'user.roles.hr_manager' },
  { value: 'registration_officer', labelKey: 'user.roles.registration_officer' },
  { value: 'cashier', labelKey: 'user.roles.cashier' },
  { value: 'teacher', labelKey: 'user.roles.teacher' },
  { value: 'viewer', labelKey: 'user.roles.viewer' },
] as const;

export const DEFAULT_USER_ROLE = 'viewer';

const VALID_ROLE_VALUES = new Set(USER_ROLE_OPTIONS.map((r) => r.value));

/** Map legacy/invalid stored roles to a valid choice for forms. */
export function normalizeUserRole(role?: string | null): string {
  if (!role) return DEFAULT_USER_ROLE;
  if (VALID_ROLE_VALUES.has(role as (typeof USER_ROLE_OPTIONS)[number]['value'])) {
    return role;
  }
  if (role === 'staff') return DEFAULT_USER_ROLE;
  return DEFAULT_USER_ROLE;
}
