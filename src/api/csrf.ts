/**
 * Reads the `csrf_token` cookie set by the backend on login/refresh/OAuth
 * callback (see backend: AuthService.computeCsrfToken(),
 * AuthController.setAuthCookies()). It's deliberately NOT httpOnly so the
 * frontend can read it here and echo it back as the X-CSRF-Token header —
 * see backend README "Cookies & CSRF" for why that's safe against CSRF.
 */
export function getCsrfToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}
