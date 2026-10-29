// The server issues a guest cart token on the first cart request; we persist it and
// re-send it as X-Cart-Token. After login it is merged into the user's cart and cleared.
const KEY = 'loom_guest_cart_token';

export const getGuestCartToken = (): string | null => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};

export const setGuestCartToken = (token: string): void => {
  try {
    localStorage.setItem(KEY, token);
  } catch {
    /* storage unavailable (private mode) — cart still works for this page load */
  }
};

export const clearGuestCartToken = (): void => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
};
