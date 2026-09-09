/**
 * Shape of the JSON body the backend sends on a failed request.
 * `errors` comes from the Zod validation middleware; `requiresOtp`/`email`
 * come from the two-step login response.
 */
export interface ApiErrorBody {
  message?: string;
  errors?: { field: string; message: string }[];
  requiresOtp?: boolean;
  email?: string;
}

/**
 * Reads the backend error body out of a thrown value.
 * Returns `undefined` for failures that never reached the server
 * (network errors, timeouts) or for any non-Axios throw.
 */
export const getApiErrorBody = (error: unknown): ApiErrorBody | undefined => {
  if (!error || typeof error !== 'object') return undefined;

  const { response } = error as { response?: { data?: unknown } };
  const data = response?.data;

  return data && typeof data === 'object' ? (data as ApiErrorBody) : undefined;
};

/** Backend error message, falling back to `fallback` when there is none. */
export const getApiErrorMessage = (error: unknown, fallback: string): string =>
  getApiErrorBody(error)?.message ?? fallback;
