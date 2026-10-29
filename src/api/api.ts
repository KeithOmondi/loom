// src/services/api.ts
import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

// Injected by store.ts AFTER the store is created — avoids a require cycle
// the same way the mobile app's axiosClient does (api.ts -> store -> authSlice -> api.ts).
type AuthHooks = {
    dispatch: (action: any) => void;
    hydrateAccessToken: (token: string | null) => { type: string; payload: string | null };
    logoutThunk: () => any;
    clearAuthState?: () => { type: string };
};

let authHooks: AuthHooks | null = null;
export function attachAuthHooks(hooks: AuthHooks) {
    authHooks = hooks;
}

// In-memory access token — never persisted to localStorage/sessionStorage.
// Read by the request interceptor below; written by authSlice on
// login/refresh, cleared on logout.
let inMemoryAccessToken: string | null = null;
export function setAccessToken(token: string | null) {
    inMemoryAccessToken = token;
}
export function getAccessToken() {
    return inMemoryAccessToken;
}

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1';

const api = axios.create({
    baseURL: BASE_URL,
    withCredentials: true, // sends the httpOnly refreshToken cookie
    headers: { 'Content-Type': 'application/json' },
});

// ============================================
// Request interceptor — attach access token
// ============================================

api.interceptors.request.use((config) => {
    if (inMemoryAccessToken && config.headers) {
        config.headers.Authorization = `Bearer ${inMemoryAccessToken}`;
    }
    return config;
});

// ============================================
// Response interceptor — 401 -> refresh -> retry
// ============================================

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
    _retry?: boolean;
}

let isRefreshing = false;
let refreshSubscribers: Array<(token: string | null) => void> = [];

function subscribeTokenRefresh(cb: (token: string | null) => void) {
    refreshSubscribers.push(cb);
}
function onRefreshed(token: string | null) {
    refreshSubscribers.forEach((cb) => cb(token));
    refreshSubscribers = [];
}

api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as RetriableRequestConfig;

        if (!error.response || error.response.status !== 401 || !originalRequest) {
            return Promise.reject(error);
        }

        // Skip refresh for auth endpoints
        const skipRefreshUrls = [
            '/auth/login',
            '/auth/refresh',
            '/auth/register',
            '/auth/register/seller',
            '/auth/verify-otp',
            '/auth/resend-otp',
        ];
        if (skipRefreshUrls.some((url) => originalRequest.url?.includes(url))) {
            return Promise.reject(error);
        }

        // Skip refresh for public endpoints
        const publicUrls = [
            '/products',
            '/products/slug',
            '/stores',
            '/stores/slug',
        ];
        if (publicUrls.some((url) => originalRequest.url?.includes(url)) && !originalRequest.headers?.Authorization) {
            return Promise.reject(error);
        }

        if (originalRequest._retry) {
            // Token refresh failed - logout user
            authHooks?.dispatch(authHooks.logoutThunk());
            if (authHooks?.clearAuthState) {
                authHooks.dispatch(authHooks.clearAuthState());
            }
            return Promise.reject(error);
        }

        originalRequest._retry = true;

        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                subscribeTokenRefresh((token) => {
                    if (!token) {
                        reject(error);
                        return;
                    }
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    resolve(api(originalRequest));
                });
            });
        }

        isRefreshing = true;

        try {
            // Try to refresh the token
            const { data } = await api.post('/auth/refresh');
            
            // Handle different response shapes
            // Option 1: { accessToken: string, user: {...} }
            // Option 2: { data: { accessToken: string, user: {...} } }
            // Option 3: { success: true, accessToken: string, user: {...} }
            let newToken: string | null = null;
            
            if (data.accessToken) {
                newToken = data.accessToken;
            } else if (data.data?.accessToken) {
                newToken = data.data.accessToken;
            } else if (data.success && data.accessToken) {
                newToken = data.accessToken;
            }

            if (newToken) {
                setAccessToken(newToken);
                authHooks?.dispatch(authHooks.hydrateAccessToken(newToken));

                isRefreshing = false;
                onRefreshed(newToken);

                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return api(originalRequest);
            } else {
                throw new Error('No access token in refresh response');
            }
        } catch (refreshError) {
            isRefreshing = false;
            onRefreshed(null);
            setAccessToken(null);
            
            // Logout the user
            authHooks?.dispatch(authHooks.logoutThunk());
            if (authHooks?.clearAuthState) {
                authHooks.dispatch(authHooks.clearAuthState());
            }
            
            return Promise.reject(refreshError);
        }
    }
);

export default api;