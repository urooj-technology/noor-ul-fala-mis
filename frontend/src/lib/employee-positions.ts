export const EMPLOYEE_POSITIONS = [
  'teacher',
  'finance',
  'office_employee',
  'cleaner',
  'security',
  'other',
] as const;

export type EmployeePosition = (typeof EMPLOYEE_POSITIONS)[number];

export const isEmployeePosition = (value?: string | null): value is EmployeePosition =>
  Boolean(value && (EMPLOYEE_POSITIONS as readonly string[]).includes(value));

/** Resolve a stored position code (or legacy free-text) to a display label. */
export const getEmployeePositionLabel = (
  t: (key: string, fallback?: string) => string,
  position?: string | null,
): string => {
  if (!position) return '';
  if (isEmployeePosition(position)) {
    return t(`employees.positionOptions.${position}`, position);
  }
  return position;
};

export const getEmployeePositionOptions = (
  t: (key: string, fallback?: string) => string,
) =>
  EMPLOYEE_POSITIONS.map((value) => ({
    value,
    label: t(`employees.positionOptions.${value}`, value),
  }));
