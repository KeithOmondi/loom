// Turns any failed request into something a shopper can understand.
// Never shows "Request failed with status code 401" or other technical text.
import type { AxiosError } from 'axios';

interface ErrorBody {
  error?: unknown;
  message?: unknown;
  details?: { message?: string }[];
}

const BY_STATUS: Record<number, string> = {
  400: 'Please check the information you entered and try again.',
  401: 'Your session has expired. Please sign in again.',
  403: "You don't have permission to do that.",
  404: "We couldn't find what you were looking for.",
  408: 'The request took too long. Please try again.',
  409: 'That conflicts with something that already exists. Please refresh and try again.',
  413: 'That file is too large.',
  422: 'Please check the information you entered and try again.',
  429: 'Too many attempts. Please wait a moment and try again.',
};

const SERVER_TROUBLE = 'Something went wrong on our side. Please try again in a moment.';
const OFFLINE = "We can't reach Loom right now. Check your internet connection and try again.";

const GENERIC_SERVER_TEXT = /^(internal server error|bad gateway|service unavailable|gateway timeout|validation error|not found|unauthorized|forbidden|bad request)\.?$/i;

const text = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);

/** Best human-readable message for a failed axios request. */
export const friendlyError = (err: unknown, fallback?: string): string => {
  const e = err as AxiosError<ErrorBody> | undefined;

  if (typeof err === 'string') return err;
  if (!e?.isAxiosError && !e?.response) return text((err as Error)?.message) ?? fallback ?? SERVER_TROUBLE;

  if (!e.response) {
    return e.code === 'ECONNABORTED' ? BY_STATUS[408] : OFFLINE;
  }

  const { status, data } = e.response;
  const specific = text(data?.details?.[0]?.message) ?? text(data?.error) ?? text(data?.message);
  if (specific && !GENERIC_SERVER_TEXT.test(specific)) return specific;
  if (status >= 500) return SERVER_TROUBLE;
  return BY_STATUS[status] ?? fallback ?? SERVER_TROUBLE;
};

/**
 * Rewrites an axios error in place so every existing handler — the ones reading
 * `err.response.data.message` and the ones reading `err.message` — gets the friendly text.
 */
export const humanizeAxiosError = (error: AxiosError<any>): AxiosError<any> => {
  const message = friendlyError(error);
  error.message = message;

  if (!error.response) {
    // network failure / timeout: synthesise a response so `err.response?.data?.message` works too
    error.response = { status: 0, statusText: '', headers: {}, config: error.config!, data: { message } } as AxiosError<ErrorBody>['response'];
  } else {
    error.response.data = { ...(typeof error.response.data === 'object' ? error.response.data : {}), message };
  }
  return error;
};
