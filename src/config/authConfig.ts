/**
 * Central VIGOR Authentication Configuration
 * Strict corporate domain boundary & role rules
 * "One Group. One View. Better Decisions."
 */

export const AUTH_CONFIG = {
  // Allowed corporate email domain
  DEFAULT_ALLOWED_DOMAIN: 'turkysgroup.co.tz',

  // Hosted domain hint for Google OAuth
  HOSTED_DOMAIN_HINT: 'turkysgroup.co.tz',

  // Session cookie name
  SESSION_COOKIE_NAME: 'vigor_session_token',

  // Session max age (7 days in milliseconds)
  SESSION_MAX_AGE_MS: 7 * 24 * 60 * 60 * 1000,

  // Storage key for client auth token backup
  TOKEN_STORAGE_KEY: 'vigor_auth_token'
};

/**
 * Returns allowed corporate email domain (defaults to 'turkysgroup.co.tz')
 */
export function getAllowedEmailDomain(): string {
  if (typeof process !== 'undefined' && process.env?.ALLOWED_EMAIL_DOMAIN) {
    return process.env.ALLOWED_EMAIL_DOMAIN.trim().toLowerCase().replace(/^@/, '');
  }
  return AUTH_CONFIG.DEFAULT_ALLOWED_DOMAIN;
}

/**
 * Validates whether an email ends with the allowed corporate domain
 */
export function isAllowedCompanyEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== 'string') return false;
  const cleanEmail = email.trim().toLowerCase();
  const allowed = getAllowedEmailDomain();
  return cleanEmail.endsWith(`@${allowed}`);
}
