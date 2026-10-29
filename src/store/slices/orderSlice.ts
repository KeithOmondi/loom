// src/store/slices/orderSlice.ts

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import api from '../../api/api';
import type {
  Order,
  OrderStatus,
  CheckoutInput,
  CheckoutResponse,
  InitiateMpesaPaymentInput,
  MpesaInitResponse,
} from '../../api/orderApi';

// ============================================
// HELPERS
// ============================================

const serializeError = (err: unknown): string => {
  const e = err as {
    response?: { data?: { message?: string; errors?: string[] } };
    message?: string;
  };
  if (e?.response?.data?.errors?.length) {
    return e.response.data.errors.join(', ');
  }
  if (e?.response?.data?.message) return e.response.data.message;
  if (e?.message) return e.message;
  return 'Something went wrong.';
};

// ============================================
// STATE
// ============================================

interface OrderUiState {
  /** Filters used by the seller/buyer order list views. */
  filters: {
    search: string;
    status: OrderStatus[];
    payment_status?: string;
    fulfillment_status?: string;
    date_from?: string;
    date_to?: string;
    sortBy: 'created_at' | 'total' | 'status';
    sortOrder: 'asc' | 'desc';
    page: number;
    limit: number;
  };

  /** The order currently highlighted in a side panel or drawer. */
  selectedOrderId: string | null;

  /** Order the seller is currently updating (progress bar, optimistic UI). */
  updatingOrderId: string | null;

  /**
   * Set right after checkout. Holds the payment_group_id and first order id
   * so the checkout flow can navigate to the payment step without another
   * API call.
   */
  checkoutResult: {
    payment_group_id: string;
    orders: Order[];
    total: number;
    currency: string;
  } | null;

  /** M-Pesa flow state — tracks the STK push we initiated for an order. */
  mpesa: {
    orderId: string | null;
    checkoutRequestId: string | null;
    customerMessage: string | null;
    /** When true, the UI should poll getMpesaStatus for `orderId`. */
    polling: boolean;
  };

  // Standard lifecycle
  isCheckingOut: boolean;
  isMutating: boolean;
  error: string | null;
  message: string | null;
}

const initialFilters: OrderUiState['filters'] = {
  search: '',
  status: [],
  sortBy: 'created_at',
  sortOrder: 'desc',
  page: 1,
  limit: 20,
};

const initialState: OrderUiState = {
  filters: initialFilters,
  selectedOrderId: null,
  updatingOrderId: null,
  checkoutResult: null,
  mpesa: {
    orderId: null,
    checkoutRequestId: null,
    customerMessage: null,
    polling: false,
  },
  isCheckingOut: false,
  isMutating: false,
  error: null,
  message: null,
};

// ============================================
// ASYNC THUNKS
// ============================================

// ---- Checkout ---------------------------------------------------------------

/**
 * POST /orders/checkout
 * Posts the buyer's cart → returns created orders + payment_group_id.
 * Used by the checkout page; RTK Query mutation also exists, but this thunk
 * lets the slice persist the result for the payment step.
 */
export const checkoutThunk = createAsyncThunk<
  CheckoutResponse['data'],
  CheckoutInput,
  { rejectValue: string }
>('order/checkout', async (input, { rejectWithValue }) => {
  try {
    const { data } = await api.post<CheckoutResponse>(
      '/orders/checkout',
      input,
    );
    return data.data;
  } catch (err) {
    return rejectWithValue(serializeError(err));
  }
});

// ---- M-Pesa initiate --------------------------------------------------------

/**
 * POST /payments/mpesa/initiate
 * Kicks off an STK push for the given order. The server responds with
 * a checkout_request_id; the slice stores it and flips `polling: true`.
 */
export const initiateMpesaThunk = createAsyncThunk<
  MpesaInitResponse['data'],
  InitiateMpesaPaymentInput,
  { rejectValue: string }
>('order/initiateMpesa', async (input, { rejectWithValue }) => {
  try {
    const { data } = await api.post<MpesaInitResponse>(
      '/payments/mpesa/initiate',
      input,
    );
    return data.data;
  } catch (err) {
    return rejectWithValue(serializeError(err));
  }
});

// ============================================
// SLICE
// ============================================

const orderSlice = createSlice({
  name: 'orderUi',
  initialState,
  reducers: {
    setOrderFilters(
      state,
      action: PayloadAction<Partial<OrderUiState['filters']>>,
    ) {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetOrderFilters(state) {
      state.filters = initialFilters;
    },

    setSelectedOrderId(state, action: PayloadAction<string | null>) {
      state.selectedOrderId = action.payload;
    },
    clearSelectedOrder(state) {
      state.selectedOrderId = null;
    },

    setUpdatingOrderId(state, action: PayloadAction<string | null>) {
      state.updatingOrderId = action.payload;
    },

    clearCheckoutResult(state) {
      state.checkoutResult = null;
    },

    /** Stop polling M-Pesa status (called after success / failure). */
    stopMpesaPolling(state) {
      state.mpesa.polling = false;
    },

    clearOrderError(state) {
      state.error = null;
    },
    clearOrderMessage(state) {
      state.message = null;
    },

    clearOrderUiState(state) {
      Object.assign(state, initialState);
    },
  },
  extraReducers: (builder) => {
    builder

      // ---- Checkout ----
      .addCase(checkoutThunk.pending, (state) => {
        state.isCheckingOut = true;
        state.error = null;
        state.checkoutResult = null;
      })
      .addCase(checkoutThunk.fulfilled, (state, action) => {
        state.isCheckingOut = false;
        state.checkoutResult = {
          payment_group_id: action.payload.payment_group_id,
          orders: action.payload.orders,
          total: action.payload.total,
          currency: action.payload.currency,
        };
        state.message =
          action.payload.orders.length === 1
            ? 'Order created. Proceed to payment.'
            : `${action.payload.orders.length} orders created. Proceed to payment.`;
      })
      .addCase(checkoutThunk.rejected, (state, action) => {
        state.isCheckingOut = false;
        state.error = (action.payload as string) ?? 'Checkout failed.';
      })

      // ---- M-Pesa initiate ----
      .addCase(initiateMpesaThunk.pending, (state) => {
        state.isMutating = true;
        state.error = null;
      })
      .addCase(initiateMpesaThunk.fulfilled, (state, action) => {
        state.isMutating = false;
        state.mpesa = {
          orderId: action.payload.order_id,
          checkoutRequestId: action.payload.checkout_request_id,
          customerMessage: action.payload.customer_message,
          polling: true,
        };
        state.message =
          action.payload.customer_message ??
          'Check your phone and enter your M-Pesa PIN.';
      })
      .addCase(initiateMpesaThunk.rejected, (state, action) => {
        state.isMutating = false;
        state.error = (action.payload as string) ?? 'Could not start payment.';
        state.mpesa.polling = false;
      });
  },
});

// ============================================
// ACTIONS
// ============================================

export const {
  setOrderFilters,
  resetOrderFilters,
  setSelectedOrderId,
  clearSelectedOrder,
  setUpdatingOrderId,
  clearCheckoutResult,
  stopMpesaPolling,
  clearOrderError,
  clearOrderMessage,
  clearOrderUiState,
} = orderSlice.actions;

export default orderSlice.reducer;

// ============================================
// SELECTORS
// ============================================

type RootWithOrderUi = { orderUi: OrderUiState };

export const selectOrderFilters = (s: RootWithOrderUi) => s.orderUi.filters;
export const selectSelectedOrderId = (s: RootWithOrderUi) =>
  s.orderUi.selectedOrderId;
export const selectUpdatingOrderId = (s: RootWithOrderUi) =>
  s.orderUi.updatingOrderId;
export const selectCheckoutResult = (s: RootWithOrderUi) =>
  s.orderUi.checkoutResult;
export const selectMpesaState = (s: RootWithOrderUi) => s.orderUi.mpesa;
export const selectOrderCheckingOut = (s: RootWithOrderUi) =>
  s.orderUi.isCheckingOut;
export const selectOrderMutating = (s: RootWithOrderUi) => s.orderUi.isMutating;
export const selectOrderError = (s: RootWithOrderUi) => s.orderUi.error;
export const selectOrderMessage = (s: RootWithOrderUi) => s.orderUi.message;

// Derived
export const selectMpesaPolling = (s: RootWithOrderUi) =>
  s.orderUi.mpesa.polling;
export const selectMpesaOrderId = (s: RootWithOrderUi) => s.orderUi.mpesa.orderId;