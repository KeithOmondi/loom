// src/store/slices/authSlice.ts

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import api, { setAccessToken } from '../../api/api';

// ✅ Added 'moderator' role
export type UserRole = 'customer' | 'seller' | 'moderator' | 'admin' | 'super_admin' | 'support' | 'finance';
export type StoreStatus = 'pending_approval' | 'inactive' | 'active';
export type VerificationStatus = 'pending' | 'verified' | 'rejected';
export type BusinessType = 'sole_proprietorship' | 'llc' | 'corporation' | 'partnership';

// ============================================
// Types
// ============================================

export interface AuthUser {
    id: string;
    email: string;
    full_name: string;
    role: UserRole;
    phone?: string | null;
    is_active: boolean;
    avatar_url?: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface Session {
    id: string;
    user_agent?: string | null;
    ip_address?: string | null;
    created_at: string;
    last_used_at?: string;
    is_current: boolean;
}

// Flat shape — matches sendTokenResponse exactly
interface LoginResponseData {
    success: boolean;
    accessToken: string;
    user: AuthUser;
}

interface RegisterInput {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
}

interface RegisterSellerInput {
    email: string;
    password: string;
    full_name: string;
    phone: string;
}

interface RegisterResponseData {
    id?: string;
    email: string;
    role: UserRole;
    is_active?: boolean;
    requiresVerification?: boolean;
    requiresPasswordReset?: boolean;
    nextStep?: string;
}

// ✅ NEW: Admin Registration Response
interface AdminRegisterResponseData {
    id: string;
    email: string;
    full_name: string;
    role: 'moderator' | 'admin' | 'super_admin';
    is_active: boolean;
    requiresPasswordReset: boolean;
    nextStep: 'login';
}

// ============================================
// State
// ============================================

interface AuthState {
    user: AuthUser | null;
    accessToken: string | null;
    isAuthenticated: boolean;
    isLoading: boolean; // ✅ Added for loading state
    pendingVerificationEmail: string | null;

    // Registration flow state
    registrationStep: 'idle' | 'register' | 'verify' | 'seller_setup' | 'store_setup' | 'complete' | 'login';

    sessions: Session[];
    sessionsStatus: 'idle' | 'loading' | 'succeeded' | 'failed';

    resetTokenValid: boolean | null;
    resetTokenEmail: string | null;

    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    isMutating: boolean;
    error: string | null;
    message: string | null;
}

const initialState: AuthState = {
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isLoading: false,
    pendingVerificationEmail: null,
    registrationStep: 'idle',
    sessions: [],
    sessionsStatus: 'idle',
    resetTokenValid: null,
    resetTokenEmail: null,
    status: 'idle',
    isMutating: false,
    error: null,
    message: null,
};

// ============================================
// ✅ NEW: Check Auth Status (Cookie-based)
// ============================================

export const checkAuthStatusThunk = createAsyncThunk(
    'auth/checkStatus',
    async (_, { rejectWithValue }) => {
        try {
            // The cookie is automatically sent with the request
            const { data } = await api.get('/users/me');
            
            // If we get user data, we're authenticated
            if (data.user) {
                return { user: data.user, accessToken: null }; // Token is in cookie
            }
            
            return rejectWithValue('Not authenticated');
        } catch (err: any) {
            // If 401, the cookie is invalid or expired
            if (err.response?.status === 401) {
                return rejectWithValue('Session expired');
            }
            return rejectWithValue(err.response?.data?.message ?? 'Authentication failed');
        }
    }
);

// ============================================
// Async Thunks — Login / Session
// ============================================

export const loginThunk = createAsyncThunk(
    'auth/login',
    async (input: { email: string; password: string }, { rejectWithValue }) => {
        try {
            const { data } = await api.post<LoginResponseData>('/auth/login', input);

            setAccessToken(data.accessToken);
            return data;
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.message ?? err.message ?? 'Login failed.');
        }
    }
);

export const refreshThunk = createAsyncThunk(
    'auth/refresh',
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await api.post<LoginResponseData>('/auth/refresh');
            setAccessToken(data.accessToken);
            return data;
        } catch (err: any) {
            setAccessToken(null);
            return rejectWithValue(err.response?.data?.message ?? 'Session expired.');
        }
    }
);

export const logoutThunk = createAsyncThunk('auth/logout', async () => {
    await api.post('/auth/logout').catch(() => { });
    setAccessToken(null);
});

// ============================================
// Async Thunks — Registration
// ============================================

export const registerThunk = createAsyncThunk(
    'auth/register',
    async (input: RegisterInput, { rejectWithValue }) => {
        try {
            const { data } = await api.post<{ success: boolean; message: string; data: RegisterResponseData }>(
                '/auth/register',
                input
            );
            return data.data;
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.message ?? 'Registration failed.');
        }
    }
);

export const registerSellerThunk = createAsyncThunk(
    'auth/registerSeller',
    async (input: RegisterSellerInput, { rejectWithValue }) => {
        try {
            const requestBody = {
                email: input.email,
                password: input.password,
                full_name: input.full_name,
                phone: input.phone,
                role: 'seller' as const,
            };

            const { data } = await api.post<{ success: boolean; message: string; data: RegisterResponseData }>(
                '/auth/register/seller',
                requestBody
            );
            return data.data;
        } catch (err: any) {
            console.error('❌ [registerSellerThunk] Error:', err.response?.data);
            return rejectWithValue(err.response?.data?.message ?? 'Seller registration failed.');
        }
    }
);

// ✅ NEW: Admin Registration Thunk
export const registerAdminThunk = createAsyncThunk(
    'auth/registerAdmin',
    async (input: {
        email: string;
        password: string;
        full_name: string;
        phone?: string;
        role: 'moderator' | 'admin' | 'super_admin';
    }, { rejectWithValue }) => {
        try {
            const { data } = await api.post<{ success: boolean; message: string; data: AdminRegisterResponseData }>(
                '/auth/register/admin',
                input
            );
            return data.data;
        } catch (err: any) {
            console.error('❌ [registerAdminThunk] Error:', err.response?.data);
            return rejectWithValue(err.response?.data?.message ?? 'Admin registration failed.');
        }
    }
);

// ============================================
// Async Thunks — OTP
// ============================================

export const verifyOTPThunk = createAsyncThunk(
    'auth/verifyOTP',
    async (input: { email: string; otp: string }, { rejectWithValue }) => {
        try {
            const { data } = await api.post<{ success: boolean; message: string }>('/auth/verify-otp', input);
            return data.message;
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.message ?? 'OTP verification failed.');
        }
    }
);

export const resendOTPThunk = createAsyncThunk(
    'auth/resendOTP',
    async (input: { email: string }, { rejectWithValue }) => {
        try {
            const { data } = await api.post<{ success: boolean; message: string }>('/auth/resend-otp', input);
            return data.message;
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.message ?? 'Could not resend OTP.');
        }
    }
);

// ============================================
// Async Thunks — Password Reset
// ============================================

export const forgotPasswordThunk = createAsyncThunk(
    'auth/forgotPassword',
    async (input: { email: string }, { rejectWithValue }) => {
        try {
            const { data } = await api.post<{ success: boolean; message: string; resetToken?: string }>(
                '/auth/forgot-password',
                input
            );
            return data;
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.message ?? 'Could not send reset link.');
        }
    }
);

export const resetPasswordThunk = createAsyncThunk(
    'auth/resetPassword',
    async (input: { token: string; newPassword: string; confirmPassword: string }, { rejectWithValue }) => {
        try {
            const { data } = await api.post<{ success: boolean; message: string }>('/auth/reset-password', input);
            return data.message;
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.message ?? 'Password reset failed.');
        }
    }
);

export const resetPasswordWithQueryThunk = createAsyncThunk(
    'auth/resetPasswordWithQuery',
    async (
        { token, newPassword, confirmPassword }: { token: string; newPassword: string; confirmPassword: string },
        { rejectWithValue }
    ) => {
        try {
            const { data } = await api.post<{ success: boolean; message: string }>(
                `/auth/reset-password-with-token?token=${encodeURIComponent(token)}`,
                { newPassword, confirmPassword }
            );
            return data.message;
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.message ?? 'Password reset failed.');
        }
    }
);

export const validateResetTokenThunk = createAsyncThunk(
    'auth/validateResetToken',
    async (token: string, { rejectWithValue }) => {
        try {
            const { data } = await api.get<{ success: boolean; message: string; email?: string }>(
                '/auth/validate-reset-token',
                { params: { token } }
            );
            return { valid: true, email: data.email ?? null };
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.message ?? 'Invalid or expired reset token.');
        }
    }
);

// ============================================
// Async Thunks — Sessions
// ============================================

export const fetchSessionsThunk = createAsyncThunk(
    'auth/fetchSessions',
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await api.get<{ success: boolean; sessions: Session[] }>('/auth/me/sessions');
            return data.sessions;
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.message ?? 'Could not load sessions.');
        }
    }
);

export const revokeSessionThunk = createAsyncThunk(
    'auth/revokeSession',
    async (sessionId: string, { rejectWithValue }) => {
        try {
            await api.delete(`/auth/me/sessions/${sessionId}`);
            return sessionId;
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.message ?? 'Could not revoke session.');
        }
    }
);

// ============================================
// Slice
// ============================================

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        clearAuthError(state) {
            state.error = null;
        },
        clearAuthMessage(state) {
            state.message = null;
        },
        hydrateAccessToken(state, action: PayloadAction<string | null>) {
            state.accessToken = action.payload;
            state.isAuthenticated = !!action.payload;
        },
        clearResetTokenState(state) {
            state.resetTokenValid = null;
            state.resetTokenEmail = null;
        },
        setRegistrationStep(state, action: PayloadAction<AuthState['registrationStep']>) {
            state.registrationStep = action.payload;
        },
        clearAuthState(state) {
            state.user = null;
            state.accessToken = null;
            state.isAuthenticated = false;
            state.isLoading = false;
            state.pendingVerificationEmail = null;
            state.registrationStep = 'idle';
            state.sessions = [];
            state.sessionsStatus = 'idle';
            state.error = null;
            state.message = null;
        },
        // ✅ NEW: Set loading state
        setLoading(state, action: PayloadAction<boolean>) {
            state.isLoading = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            // ✅ Check Auth Status
            .addCase(checkAuthStatusThunk.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(checkAuthStatusThunk.fulfilled, (state, action) => {
                state.isLoading = false;
                state.user = action.payload.user;
                state.isAuthenticated = true;
                state.registrationStep = 'complete';
            })
            .addCase(checkAuthStatusThunk.rejected, (state, action) => {
                state.isLoading = false;
                state.user = null;
                state.isAuthenticated = false;
                state.accessToken = null;
                state.error = action.payload as string;
            })

            // Login
            .addCase(loginThunk.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(loginThunk.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.user = action.payload.user;
                state.accessToken = action.payload.accessToken;
                state.isAuthenticated = true;
                state.registrationStep = 'complete';
            })
            .addCase(loginThunk.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload as string;
                state.isAuthenticated = false;
            })
            // Refresh
            .addCase(refreshThunk.fulfilled, (state, action) => {
                state.user = action.payload.user;
                state.accessToken = action.payload.accessToken;
                state.isAuthenticated = true;
            })
            .addCase(refreshThunk.rejected, (state) => {
                state.user = null;
                state.accessToken = null;
                state.isAuthenticated = false;
            })
            // Logout
            .addCase(logoutThunk.fulfilled, () => initialState)

            // Register (customer)
            .addCase(registerThunk.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(registerThunk.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.pendingVerificationEmail = action.payload.email;
                state.registrationStep = 'verify';
            })
            .addCase(registerThunk.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload as string;
            })

            // Register (seller)
            .addCase(registerSellerThunk.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(registerSellerThunk.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.pendingVerificationEmail = action.payload.email;
                state.registrationStep = 'verify';
            })
            .addCase(registerSellerThunk.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload as string;
            })

            // ✅ Register Admin
            .addCase(registerAdminThunk.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(registerAdminThunk.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.message = `${action.payload.role} account created successfully.`;
                state.registrationStep = 'login';
            })
            .addCase(registerAdminThunk.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload as string;
            })

            // OTP verify
            .addCase(verifyOTPThunk.pending, (state) => {
                state.isMutating = true;
                state.error = null;
            })
            .addCase(verifyOTPThunk.fulfilled, (state, action) => {
                state.isMutating = false;
                state.pendingVerificationEmail = null;
                state.message = action.payload;
                state.registrationStep = 'complete';
            })
            .addCase(verifyOTPThunk.rejected, (state, action) => {
                state.isMutating = false;
                state.error = action.payload as string;
            })

            // OTP resend
            .addCase(resendOTPThunk.pending, (state) => {
                state.isMutating = true;
                state.error = null;
            })
            .addCase(resendOTPThunk.fulfilled, (state, action) => {
                state.isMutating = false;
                state.message = action.payload;
            })
            .addCase(resendOTPThunk.rejected, (state, action) => {
                state.isMutating = false;
                state.error = action.payload as string;
            })

            // Forgot password
            .addCase(forgotPasswordThunk.pending, (state) => {
                state.isMutating = true;
                state.error = null;
            })
            .addCase(forgotPasswordThunk.fulfilled, (state, action) => {
                state.isMutating = false;
                state.message = action.payload.message;
            })
            .addCase(forgotPasswordThunk.rejected, (state, action) => {
                state.isMutating = false;
                state.error = action.payload as string;
            })

            // Reset password
            .addCase(resetPasswordThunk.pending, (state) => {
                state.isMutating = true;
                state.error = null;
            })
            .addCase(resetPasswordThunk.fulfilled, (state, action) => {
                state.isMutating = false;
                state.message = action.payload;
            })
            .addCase(resetPasswordThunk.rejected, (state, action) => {
                state.isMutating = false;
                state.error = action.payload as string;
            })

            // Reset password with query
            .addCase(resetPasswordWithQueryThunk.pending, (state) => {
                state.isMutating = true;
                state.error = null;
            })
            .addCase(resetPasswordWithQueryThunk.fulfilled, (state, action) => {
                state.isMutating = false;
                state.message = action.payload;
            })
            .addCase(resetPasswordWithQueryThunk.rejected, (state, action) => {
                state.isMutating = false;
                state.error = action.payload as string;
            })

            // Validate reset token
            .addCase(validateResetTokenThunk.pending, (state) => {
                state.resetTokenValid = null;
                state.error = null;
            })
            .addCase(validateResetTokenThunk.fulfilled, (state, action) => {
                state.resetTokenValid = true;
                state.resetTokenEmail = action.payload.email;
            })
            .addCase(validateResetTokenThunk.rejected, (state, action) => {
                state.resetTokenValid = false;
                state.error = action.payload as string;
            })

            // Sessions
            .addCase(fetchSessionsThunk.pending, (state) => {
                state.sessionsStatus = 'loading';
                state.error = null;
            })
            .addCase(fetchSessionsThunk.fulfilled, (state, action) => {
                state.sessionsStatus = 'succeeded';
                state.sessions = action.payload;
            })
            .addCase(fetchSessionsThunk.rejected, (state, action) => {
                state.sessionsStatus = 'failed';
                state.error = action.payload as string;
            })
            .addCase(revokeSessionThunk.fulfilled, (state, action: PayloadAction<string>) => {
                state.sessions = state.sessions.filter((s) => s.id !== action.payload);
            })
            .addCase(revokeSessionThunk.rejected, (state, action) => {
                state.error = action.payload as string;
            });
    },
});

export const {
    clearAuthError,
    clearAuthMessage,
    hydrateAccessToken,
    clearResetTokenState,
    setRegistrationStep,
    clearAuthState,
    setLoading,
} = authSlice.actions;


// src/store/slices/authSlice.ts

// ============================================
// SELECTORS
// ============================================

type RootWithAuth = { auth: AuthState };

export const selectAuthUser = (s: RootWithAuth) => s.auth.user;
export const selectAccessToken = (s: RootWithAuth) => s.auth.accessToken;
export const selectIsAuthenticated = (s: RootWithAuth) => s.auth.isAuthenticated;
export const selectAuthLoading = (s: RootWithAuth) => s.auth.isLoading;
export const selectAuthStatus = (s: RootWithAuth) => s.auth.status;
export const selectAuthError = (s: RootWithAuth) => s.auth.error;
export const selectAuthMessage = (s: RootWithAuth) => s.auth.message;

export const selectSessions = (s: RootWithAuth) => s.auth.sessions;
export const selectSessionsStatus = (s: RootWithAuth) => s.auth.sessionsStatus;

export const selectPendingVerificationEmail = (s: RootWithAuth) =>
  s.auth.pendingVerificationEmail;

export const selectRegistrationStep = (s: RootWithAuth) =>
  s.auth.registrationStep;

export const selectResetTokenValid = (s: RootWithAuth) => s.auth.resetTokenValid;
export const selectResetTokenEmail = (s: RootWithAuth) => s.auth.resetTokenEmail;
export default authSlice.reducer;