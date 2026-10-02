/**
 * Public store / legal links.
 * Privacy page lives in docs/ — enable GitHub Pages (docs/) so the HTTPS URL works for App Store & Play.
 */
export const SUPPORT_EMAIL = 'edavidvelascop@gmail.com';

/** Hosted privacy policy (GitHub Pages from /docs). */
export const PRIVACY_POLICY_URL =
  'https://sotico91.github.io/RumiApp/privacy-policy.html';

/** Fallback if Pages is not enabled yet (raw HTML still opens in browser). */
export const PRIVACY_POLICY_FALLBACK_URL =
  'https://raw.githubusercontent.com/sotico91/RumiApp/main/docs/privacy-policy.html';

export const STORE_SUPPORT_URL = `mailto:${SUPPORT_EMAIL}`;
