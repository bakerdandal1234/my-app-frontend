const apiUrl: unknown = import.meta.env.VITE_API_URL;

if (typeof apiUrl !== 'string' || apiUrl.trim().length === 0) {
  throw new Error(
    'VITE_API_URL is not set. Define it in your .env file and restart the dev server.',
  );
}

export const API_URL: string = apiUrl;
