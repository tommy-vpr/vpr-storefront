export const AGE_VERIFICATION_KEY = 'vpr:age-confirmed:v1';
export const AGE_VERIFICATION_DEFAULTS = {
  enabled: true,
  heading: 'Are you 21 or older?',
  description: 'You must be at least 21 years old to enter this website.',
  confirmLabel: 'Yes, I’m 21 or older',
  denyLabel: 'No, I’m under 21',
  deniedRedirectUrl: 'https://www.google.com',
  deniedMessage: 'Sorry, you must be 21 or older to enter this website.',
  rememberDays: 30,
  logoUrl: '/images/logo-main.png' as string | null,
};
export type AgeVerificationSettings = typeof AGE_VERIFICATION_DEFAULTS;
export function isAgeRedirectURL(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return (url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password;
  } catch { return false; }
}
export function normalizeAgeVerification(value?: { [K in keyof AgeVerificationSettings]?: AgeVerificationSettings[K] | null } | null): AgeVerificationSettings {
  const result = {...AGE_VERIFICATION_DEFAULTS, enabled: value?.enabled !== false};
  for (const key of ['heading', 'description', 'confirmLabel', 'denyLabel', 'deniedMessage'] as const) {
    const text = value?.[key];
    if (typeof text === 'string' && text.trim()) result[key] = text.trim();
  }
  const redirect = value?.deniedRedirectUrl?.trim();
  if (isAgeRedirectURL(redirect)) result.deniedRedirectUrl = redirect;
  if (typeof value?.logoUrl === 'string' && value.logoUrl) result.logoUrl = value.logoUrl;
  const days = value?.rememberDays;
  if (typeof days === 'number' && Number.isInteger(days) && days >= 0 && days <= 365) result.rememberDays = days;
  return result;
}
export function validAgeConfirmation(raw: string | null, rememberDays: number, now = Date.now()): boolean {
  if (!raw) return false;
  try {
    const record = JSON.parse(raw);
    const duration = rememberDays * 86400000;
    return record?.age === 21 && Number.isFinite(record.acceptedAt) && record.acceptedAt <= now &&
      (rememberDays === 0 || now - record.acceptedAt < duration);
  } catch { return false; }
}
