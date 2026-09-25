const apiUrl = import.meta.env.VITE_API_URL;

// Fail at startup with a clear message. Without this check a missing
// variable silently gives axios `baseURL: undefined` and OAuth links that
// point at "undefined/auth/google".
if (!apiUrl) {
  throw new Error(
    'VITE_API_URL is not set. Define it in your .env file and restart the dev server.',
  );
}

export const API_URL: string = apiUrl;
