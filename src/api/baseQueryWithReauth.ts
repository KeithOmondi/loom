// src/store/api/baseQueryWithReauth.ts
import { fetchBaseQuery, type BaseQueryFn } from "@reduxjs/toolkit/query/react";
import { getAccessToken, setAccessToken } from "./api";
import { getGuestCartToken } from "../lib/guestCart";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1",
  credentials: "include",
  prepareHeaders: (headers) => {
    const token = getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const cartToken = getGuestCartToken();
    if (cartToken) headers.set("X-Cart-Token", cartToken);
    headers.set("Content-Type", "application/json");
    return headers;
  },
});

let isRefreshing = false;
let waiters: Array<() => void> = [];

export const baseQueryWithReauth: BaseQueryFn = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401) {
    if (isRefreshing) {
      // Wait for the in-flight refresh, then retry
      await new Promise<void>((resolve) => waiters.push(resolve));
      result = await rawBaseQuery(args, api, extraOptions);
    } else {
      isRefreshing = true;
      try {
        const refreshResult = await rawBaseQuery(
          { url: "/auth/refresh", method: "POST" },
          api,
          extraOptions
        );
        if (refreshResult.data) {
          const newToken = (refreshResult.data as any).accessToken;
          setAccessToken(newToken);
          result = await rawBaseQuery(args, api, extraOptions);
        } else {
          setAccessToken(null);
          // optionally dispatch logout here
        }
      } finally {
        isRefreshing = false;
        waiters.forEach((w) => w());
        waiters = [];
      }
    }
  }

  return result;
};