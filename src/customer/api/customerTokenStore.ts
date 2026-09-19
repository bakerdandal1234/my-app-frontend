/**
 * In-memory access-token store for the CUSTOMER session.
 *
 * Deliberately a separate module from src/api/tokenStore.ts rather than a
 * shared, parameterised store: the whole point of the customer flow is that
 * a staff token and a customer token can never be mistaken for one another,
 * and the cheapest way to guarantee that is for them to have no shared
 * mutable state at all. A staff login cannot overwrite this value, and
 * customerApi never reads the staff one.
 *
 * Not localStorage/sessionStorage: any injected script could read those. A
 * module-scoped variable dies on every full reload, at which point
 * CustomerAuthProvider silently re-establishes it from the httpOnly
 * customer_refresh_token cookie.
 */

type Listener = (token: string | null) => void;

let customerAccessToken: string | null = null;
const listeners = new Set<Listener>();

export function getCustomerAccessToken(): string | null {
  return customerAccessToken;
}

export function setCustomerAccessToken(token: string | null): void {
  customerAccessToken = token;
  listeners.forEach((listener) => listener(token));
}

export function subscribeToCustomerAccessToken(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
