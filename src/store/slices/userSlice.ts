// src/store/slices/userSlice.ts
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import api from '../../api/api';

// ============================================
// Types
// ============================================

export interface User {
    id: string;
    email: string;
    full_name: string;
    role: 'customer' | 'seller' | 'moderator' | 'admin' | 'super_admin' | 'support' | 'finance';
    phone?: string | null;
    is_active: boolean;
    avatar_url?: string | null;
    avatar_public_id?: string | null;
    created_at: string;
    updated_at: string;
}

export interface CreateAdminUserInput {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
    role: 'moderator' | 'admin' | 'super_admin';
}

export interface CreateUserInput {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
    role: 'customer' | 'seller';
}

export interface UpdateProfileInput {
    full_name?: string;
    email?: string;
}

export interface UpdatePasswordInput {
    current_password: string;
    new_password: string;
    confirm_password: string;
}

export interface AdminUpdateUserInput {
    full_name?: string;
    email?: string;
    role?: 'moderator' | 'admin' | 'super_admin';
    is_active?: boolean;
}

export interface UserStats {
    total_users: number;
    customers: number;
    sellers: number;
    moderators: number;
    admins: number;
    super_admins: number;
    active_users: number;
    inactive_users: number;
}

export interface UsersListResponse {
    success: boolean;
    data: User[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

export interface UserResponse {
    success: boolean;
    user: User;
}

export interface CreateAdminUserResponse {
    success: boolean;
    message: string;
    data: User;
}

// ✅ NEW: First Login Types
export interface FirstLoginCheckResponse {
    success: boolean;
    data: {
        isFirstLogin: boolean;
        needsPasswordReset: boolean;
    };
}

export interface FirstLoginPasswordResetInput {
    email: string;
    temporary_password: string;
    new_password: string;
    confirm_password: string;
}

export interface FirstLoginPasswordResetResponse {
    success: boolean;
    message: string;
}

// ============================================
// State
// ============================================

interface UserState {
    profile: User | null;
    users: User[];
    selectedUser: User | null;
    stats: UserStats | null;
    isLoading: boolean;
    isMutating: boolean;
    error: string | null;
    message: string | null;
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    } | null;
    // ✅ NEW: First login state
    firstLoginCheck: {
        isFirstLogin: boolean;
        needsPasswordReset: boolean;
    } | null;
}

const initialState: UserState = {
    profile: null,
    users: [],
    selectedUser: null,
    stats: null,
    isLoading: false,
    isMutating: false,
    error: null,
    message: null,
    pagination: null,
    firstLoginCheck: null,
};

// ============================================
// Async Thunks
// ============================================

// ============ Profile ============

/**
 * Get current user profile
 */
export const getProfileThunk = createAsyncThunk(
    'user/getProfile',
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await api.get<{ success: boolean; user: User }>('/users/me');
            return data.user;
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.message ?? 'Failed to get profile.');
        }
    }
);

/**
 * Update current user profile
 */
export const updateProfileThunk = createAsyncThunk(
    'user/updateProfile',
    async (input: UpdateProfileInput, { rejectWithValue }) => {
        try {
            const { data } = await api.patch<{ success: boolean; user: User }>('/users/me', input);
            return data.user;
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.message ?? 'Failed to update profile.');
        }
    }
);

/**
 * Change password
 */
export const changePasswordThunk = createAsyncThunk(
    'user/changePassword',
    async (input: UpdatePasswordInput, { rejectWithValue }) => {
        try {
            const { data } = await api.patch<{ success: boolean; message: string }>(
                '/users/me/password',
                input
            );
            return data.message;
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.message ?? 'Failed to change password.');
        }
    }
);

/**
 * Upload avatar
 */
export const uploadAvatarThunk = createAsyncThunk(
    'user/uploadAvatar',
    async (file: File, { rejectWithValue }) => {
        try {
            const formData = new FormData();
            formData.append('avatar', file);

            const { data } = await api.post<{
                success: boolean;
                data: { url: string; publicId: string };
            }>('/users/me/avatar', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            return data.data;
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.message ?? 'Failed to upload avatar.');
        }
    }
);

/**
 * Remove avatar
 */
export const removeAvatarThunk = createAsyncThunk(
    'user/removeAvatar',
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await api.delete<{ success: boolean; message: string }>(
                '/users/me/avatar'
            );
            return data.message;
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.message ?? 'Failed to remove avatar.');
        }
    }
);

/**
 * Update profile with avatar
 */
export const updateProfileWithAvatarThunk = createAsyncThunk(
    'user/updateProfileWithAvatar',
    async (
        { data, file }: { data: UpdateProfileInput; file?: File },
        { rejectWithValue }
    ) => {
        try {
            const formData = new FormData();
            if (data.full_name) formData.append('full_name', data.full_name);
            if (data.email) formData.append('email', data.email);
            if (file) formData.append('avatar', file);
            if (data.full_name === null) formData.append('remove_avatar', 'true');

            const { data: response } = await api.patch<{ success: boolean; user: User }>(
                '/users/me/with-avatar',
                formData,
                {
                    headers: { 'Content-Type': 'multipart/form-data' },
                }
            );

            return response.user;
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.message ?? 'Failed to update profile.');
        }
    }
);

// ============ Admin ============

/**
 * Create admin user (moderator, admin, super_admin)
 * Only accessible to super_admin
 */
export const createAdminUserThunk = createAsyncThunk(
    'user/createAdminUser',
    async (input: CreateAdminUserInput, { rejectWithValue }) => {
        try {
            const { data } = await api.post<CreateAdminUserResponse>(
                '/users/admin/register',
                input
            );
            return data.data;
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.message ?? 'Failed to create admin user.');
        }
    }
);

/**
 * List all users (admin only)
 */
export const listUsersThunk = createAsyncThunk(
    'user/listUsers',
    async (
        params: {
            page?: number;
            limit?: number;
            role?: string;
            search?: string;
            is_active?: boolean;
            sortBy?: string;
            sortOrder?: string;
        } = {},
        { rejectWithValue }
    ) => {
        try {
            const queryParams = new URLSearchParams();
            if (params.page) queryParams.append('page', String(params.page));
            if (params.limit) queryParams.append('limit', String(params.limit));
            if (params.role) queryParams.append('role', params.role);
            if (params.search) queryParams.append('search', params.search);
            if (params.is_active !== undefined) {
                queryParams.append('is_active', String(params.is_active));
            }
            if (params.sortBy) queryParams.append('sortBy', params.sortBy);
            if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

            const { data } = await api.get<UsersListResponse>(
                `/users/admin/users?${queryParams.toString()}`
            );
            return data;
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.message ?? 'Failed to list users.');
        }
    }
);

/**
 * Get user by ID (admin only)
 */
export const getUserByIdThunk = createAsyncThunk(
    'user/getUserById',
    async (id: string, { rejectWithValue }) => {
        try {
            const { data } = await api.get<UserResponse>(`/users/admin/users/${id}`);
            return data.user;
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.message ?? 'Failed to get user.');
        }
    }
);

/**
 * Update user by ID (admin only)
 */
export const updateUserByIdThunk = createAsyncThunk(
    'user/updateUserById',
    async (
        { id, data }: { id: string; data: AdminUpdateUserInput },
        { rejectWithValue }
    ) => {
        try {
            const { data: response } = await api.put<UserResponse>(
                `/users/admin/users/${id}`,
                data
            );
            return response.user;
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.message ?? 'Failed to update user.');
        }
    }
);

/**
 * Delete user by ID (admin only)
 */
export const deleteUserByIdThunk = createAsyncThunk(
    'user/deleteUserById',
    async (id: string, { rejectWithValue }) => {
        try {
            await api.delete(`/users/admin/users/${id}`);
            return id;
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.message ?? 'Failed to delete user.');
        }
    }
);

/**
 * Get user statistics (admin only)
 */
export const getUserStatsThunk = createAsyncThunk(
    'user/getUserStats',
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await api.get<{ success: boolean; data: UserStats }>(
                '/users/admin/stats'
            );
            return data.data;
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.message ?? 'Failed to get user stats.');
        }
    }
);

// ============================================
// ✅ NEW: First Login Thunks
// ============================================

/**
 * Check if user needs password reset on first login
 */
export const checkFirstLoginThunk = createAsyncThunk(
    'user/checkFirstLogin',
    async (userId: string, { rejectWithValue }) => {
        try {
            const { data } = await api.get<FirstLoginCheckResponse>(
                `/users/first-login/check/${userId}`
            );
            return data.data;
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.message ?? 'Failed to check first login status.');
        }
    }
);

/**
 * Reset password on first login
 */
export const firstLoginPasswordResetThunk = createAsyncThunk(
    'user/firstLoginPasswordReset',
    async (input: FirstLoginPasswordResetInput, { rejectWithValue }) => {
        try {
            const { data } = await api.post<FirstLoginPasswordResetResponse>(
                '/auth/first-login/reset-password',
                input
            );
            return data.message;
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.message ?? 'Failed to reset password.');
        }
    }
);

// ============================================
// Slice
// ============================================

const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
        clearUserError(state) {
            state.error = null;
        },
        clearUserMessage(state) {
            state.message = null;
        },
        clearUserState(state) {
            state.profile = null;
            state.users = [];
            state.selectedUser = null;
            state.stats = null;
            state.isLoading = false;
            state.isMutating = false;
            state.error = null;
            state.message = null;
            state.pagination = null;
            state.firstLoginCheck = null;
        },
        setUserProfile(state, action: PayloadAction<User>) {
            state.profile = action.payload;
        },
        clearFirstLoginCheck(state) {
            state.firstLoginCheck = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // ============ Profile ============
            .addCase(getProfileThunk.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(getProfileThunk.fulfilled, (state, action) => {
                state.isLoading = false;
                state.profile = action.payload;
            })
            .addCase(getProfileThunk.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })

            .addCase(updateProfileThunk.pending, (state) => {
                state.isMutating = true;
                state.error = null;
            })
            .addCase(updateProfileThunk.fulfilled, (state, action) => {
                state.isMutating = false;
                state.profile = action.payload;
                state.message = 'Profile updated successfully.';
            })
            .addCase(updateProfileThunk.rejected, (state, action) => {
                state.isMutating = false;
                state.error = action.payload as string;
            })

            .addCase(changePasswordThunk.pending, (state) => {
                state.isMutating = true;
                state.error = null;
            })
            .addCase(changePasswordThunk.fulfilled, (state, action) => {
                state.isMutating = false;
                state.message = action.payload;
            })
            .addCase(changePasswordThunk.rejected, (state, action) => {
                state.isMutating = false;
                state.error = action.payload as string;
            })

            .addCase(uploadAvatarThunk.pending, (state) => {
                state.isMutating = true;
                state.error = null;
            })
            .addCase(uploadAvatarThunk.fulfilled, (state, action) => {
                state.isMutating = false;
                if (state.profile) {
                    state.profile.avatar_url = action.payload.url;
                    state.profile.avatar_public_id = action.payload.publicId;
                }
                state.message = 'Avatar uploaded successfully.';
            })
            .addCase(uploadAvatarThunk.rejected, (state, action) => {
                state.isMutating = false;
                state.error = action.payload as string;
            })

            .addCase(removeAvatarThunk.pending, (state) => {
                state.isMutating = true;
                state.error = null;
            })
            .addCase(removeAvatarThunk.fulfilled, (state, action) => {
                state.isMutating = false;
                if (state.profile) {
                    state.profile.avatar_url = null;
                    state.profile.avatar_public_id = null;
                }
                state.message = action.payload;
            })
            .addCase(removeAvatarThunk.rejected, (state, action) => {
                state.isMutating = false;
                state.error = action.payload as string;
            })

            .addCase(updateProfileWithAvatarThunk.pending, (state) => {
                state.isMutating = true;
                state.error = null;
            })
            .addCase(updateProfileWithAvatarThunk.fulfilled, (state, action) => {
                state.isMutating = false;
                state.profile = action.payload;
                state.message = 'Profile updated successfully.';
            })
            .addCase(updateProfileWithAvatarThunk.rejected, (state, action) => {
                state.isMutating = false;
                state.error = action.payload as string;
            })

            // ============ Admin ============
            .addCase(createAdminUserThunk.pending, (state) => {
                state.isMutating = true;
                state.error = null;
            })
            .addCase(createAdminUserThunk.fulfilled, (state, action) => {
                state.isMutating = false;
                state.users.unshift(action.payload);
                state.message = `${action.payload.role} account created successfully.`;
            })
            .addCase(createAdminUserThunk.rejected, (state, action) => {
                state.isMutating = false;
                state.error = action.payload as string;
            })

            .addCase(listUsersThunk.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(listUsersThunk.fulfilled, (state, action) => {
                state.isLoading = false;
                state.users = action.payload.data;
                state.pagination = action.payload.pagination;
            })
            .addCase(listUsersThunk.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })

            .addCase(getUserByIdThunk.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(getUserByIdThunk.fulfilled, (state, action) => {
                state.isLoading = false;
                state.selectedUser = action.payload;
            })
            .addCase(getUserByIdThunk.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })

            .addCase(updateUserByIdThunk.pending, (state) => {
                state.isMutating = true;
                state.error = null;
            })
            .addCase(updateUserByIdThunk.fulfilled, (state, action) => {
                state.isMutating = false;
                state.selectedUser = action.payload;
                const index = state.users.findIndex((u) => u.id === action.payload.id);
                if (index !== -1) {
                    state.users[index] = action.payload;
                }
                state.message = 'User updated successfully.';
            })
            .addCase(updateUserByIdThunk.rejected, (state, action) => {
                state.isMutating = false;
                state.error = action.payload as string;
            })

            .addCase(deleteUserByIdThunk.pending, (state) => {
                state.isMutating = true;
                state.error = null;
            })
            .addCase(deleteUserByIdThunk.fulfilled, (state, action) => {
                state.isMutating = false;
                state.users = state.users.filter((u) => u.id !== action.payload);
                if (state.selectedUser?.id === action.payload) {
                    state.selectedUser = null;
                }
                state.message = 'User deleted successfully.';
            })
            .addCase(deleteUserByIdThunk.rejected, (state, action) => {
                state.isMutating = false;
                state.error = action.payload as string;
            })

            .addCase(getUserStatsThunk.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(getUserStatsThunk.fulfilled, (state, action) => {
                state.isLoading = false;
                state.stats = action.payload;
            })
            .addCase(getUserStatsThunk.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })

            // ============ ✅ First Login ============
            .addCase(checkFirstLoginThunk.pending, (state) => {
                state.isLoading = true;
                state.error = null;
                state.firstLoginCheck = null;
            })
            .addCase(checkFirstLoginThunk.fulfilled, (state, action) => {
                state.isLoading = false;
                state.firstLoginCheck = action.payload;
            })
            .addCase(checkFirstLoginThunk.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })

            .addCase(firstLoginPasswordResetThunk.pending, (state) => {
                state.isMutating = true;
                state.error = null;
            })
            .addCase(firstLoginPasswordResetThunk.fulfilled, (state, action) => {
                state.isMutating = false;
                state.message = action.payload;
                state.firstLoginCheck = {
                    isFirstLogin: false,
                    needsPasswordReset: false,
                };
            })
            .addCase(firstLoginPasswordResetThunk.rejected, (state, action) => {
                state.isMutating = false;
                state.error = action.payload as string;
            });
    },
});

export const {
    clearUserError,
    clearUserMessage,
    clearUserState,
    setUserProfile,
    clearFirstLoginCheck,
} = userSlice.actions;


// src/store/slices/userSlice.ts

// ============================================
// SELECTORS
// ============================================

type RootWithUser = { user: UserState };

export const selectUserProfile = (s: RootWithUser) => s.user.profile;
export const selectUserList = (s: RootWithUser) => s.user.users;
export const selectSelectedUser = (s: RootWithUser) => s.user.selectedUser;
export const selectUserStats = (s: RootWithUser) => s.user.stats;
export const selectUserLoading = (s: RootWithUser) => s.user.isLoading;
export const selectUserMutating = (s: RootWithUser) => s.user.isMutating;
export const selectUserError = (s: RootWithUser) => s.user.error;
export const selectUserMessage = (s: RootWithUser) => s.user.message;
export const selectUserPagination = (s: RootWithUser) => s.user.pagination;
export const selectFirstLoginCheck = (s: RootWithUser) => s.user.firstLoginCheck;

export default userSlice.reducer;