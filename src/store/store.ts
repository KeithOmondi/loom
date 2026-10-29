// src/store/store.ts

import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import authReducer, { hydrateAccessToken, logoutThunk } from './slices/authSlice';
import storeReducer from './slices/storeSlice';
import sellerReducer from './slices/sellerSlice';
import userReducer from './slices/userSlice';
import moderatorReducer from './slices/moderationSlice';
import productReducer from './slices/productSlice';
import categoryReducer from "./slices/categorySlice"
import orderUiReducer from "./slices/orderSlice"

import { sellerApi } from '../api/sellerApi';
import { storeApi } from '../api/storeApi';
import { moderatorApi } from '../api/moderatorApi';
import { productApi } from '../api/productApi';   // ← was missing

import { attachAuthHooks } from '../api/api';
import categoryApi from '../api/categoryApi';
import orderApi from '../api/orderApi';
import { cartApi } from '../api/cartApi';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        store: storeReducer,
        seller: sellerReducer,
        user: userReducer,
        moderator: moderatorReducer,
        productUi: productReducer,   // ← renamed: was `product`
        category: categoryReducer,
        orderUi: orderUiReducer,
        [sellerApi.reducerPath]: sellerApi.reducer,
        [storeApi.reducerPath]: storeApi.reducer,
        [moderatorApi.reducerPath]: moderatorApi.reducer,
        [productApi.reducerPath]: productApi.reducer,   // ← was missing
        [categoryApi.reducerPath]: categoryApi.reducer,
        [orderApi.reducerPath]: orderApi.reducer,
        [cartApi.reducerPath]: cartApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: ['persist/PERSIST'],
            },
        }).concat(
            sellerApi.middleware,
            storeApi.middleware,
            moderatorApi.middleware,
            productApi.middleware,
            categoryApi.middleware,
            orderApi.middleware,
            cartApi.middleware
        ),
});

// Wire api.ts's interceptor back into the store, after the store exists —
// avoids the require cycle: api.ts -> store.ts -> authSlice -> api.ts.
attachAuthHooks({
    dispatch: store.dispatch,
    hydrateAccessToken,
    logoutThunk,
});

// Enables refetchOnFocus / refetchOnReconnect across all api slices.
setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;