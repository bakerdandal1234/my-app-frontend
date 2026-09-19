/**
 * Reads the `customer_csrf_token` cookie (Path=/, not httpOnly on purpose)
 * so it can be echoed back as X-CSRF-Token on POST /customer/auth/refresh.
 *
 * Distinct name from the staff `csrf_token` cookie: both live at Path=/ and
 * would otherwise overwrite each other whenever someone is signed in as
 * both a staff user and a customer in the same browser.
 */
export function getCustomerCsrfToken(): string | null {
  const match = document.cookie.match(
    /(?:^|;\s*)customer_csrf_token=([^;]+)/,
  );

  return match ? decodeURIComponent(match[1]) : null;
}
