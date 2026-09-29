/** Runtime boundaries accept unknown; TypeScript generics do not validate JSON. */
export type TypeGuard<T> = (value: unknown) => value is T;

export const isString = (value: unknown): value is string =>
  typeof value === "string";

export const isNonEmptyString = (value: unknown): value is string =>
  isString(value) && value.trim().length > 0;

export const isNullableText = (value: unknown): value is string | null =>
  value === null || isString(value);

export const isOptionalText = (value: unknown): value is string | null | undefined =>
  value === undefined || isNullableText(value);

export const isDateString = (value: unknown): value is string =>
  isString(value) && Number.isFinite(Date.parse(value));

export const isOptionalDateString = (
  value: unknown,
): value is string | null | undefined =>
  value === undefined || value === null || isDateString(value);

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isArrayOf<T>(
  value: unknown,
  guard: TypeGuard<T>,
): value is T[] {
  if (!Array.isArray(value)) return false;
  for (const item of value) {
    if (!guard(item)) return false;
  }
  return true;
}

/** Never include the response body: it might contain tokens or personal data. */
export class InvalidApiResponseError extends Error {
  constructor() {
    super("The server returned an unexpected response. Please try again.");
    this.name = "InvalidApiResponseError";
  }
}

export function parseResponse<T>(value: unknown, guard: TypeGuard<T>): T {
  if (!guard(value)) throw new InvalidApiResponseError();
  return value;
}
