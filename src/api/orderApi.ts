// src/store/api/orderApi.ts

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { getAccessToken } from './api';

// ============================================
// ENUMS & CONSTANTS — mirror backend order.types.ts
// ============================================

export type OrderStatus =
  | 'pending'
  | 'payment_pending'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'refunded'
  | 'failed';

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'partially_refunded';

export type PaymentMethod =
  | 'card'
  | 'mpesa'
  | 'bank_transfer'
  | 'paypal'
  | 'cash_on_delivery'
  | 'store_credit';

export type FulfillmentStatus =
  | 'unfulfilled'
  | 'partially_fulfilled'
  | 'fulfilled'
  | 'shipped'
  | 'delivered';

export type ShippingMethod = 'standard' | 'express' | 'overnight' | 'pickup';

export type MpesaTransactionStatus =
  | 'initiated'
  | 'pending'
  | 'success'
  | 'failed'
  | 'cancelled'
  | 'timeout';

// ============================================
// COMPOSITE SHAPES
// ============================================

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id?: string;
  product_name: string;
  variant_name?: string;
  sku: string;
  quantity: number;
  price: number;
  total: number;
  discount_amount: number;
  tax_amount: number;
  tax_rate: number;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface OrderAddress {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  company?: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state?: string;
  postal_code: string;
  country: string;
  instructions?: string;
  source_address_id?: string;
}

export interface OrderShipping {
  method: ShippingMethod;
  carrier?: string;
  tracking_number?: string;
  tracking_url?: string;
  cost: number;
  estimated_days: number;
  shipped_at?: string;
  delivered_at?: string;
  address: OrderAddress;
}

export interface OrderPayment {
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  currency: string;
  transaction_id?: string;
  payment_gateway?: string;
  gateway_response?: Record<string, unknown>;
  paid_at?: string;
  refunded_at?: string;
  refund_amount?: number;
  mpesa_receipt?: string;
}

export interface Order {
  id: string;
  order_number: string;
  store_id: string;
  user_id: string;
  seller_id: string;

  customer: OrderAddress;
  items: OrderItem[];
  subtotal: number;
  discount_total: number;
  tax_total: number;
  shipping_total: number;
  total: number;
  currency: string;

  shipping: OrderShipping;
  payment: OrderPayment;

  status: OrderStatus;
  fulfillment_status: FulfillmentStatus;
  payment_status: PaymentStatus;

  customer_notes?: string;
  seller_notes?: string;
  admin_notes?: string;

  placed_at: string;
  payment_confirmed_at?: string;
  processed_at?: string;
  shipped_at?: string;
  delivered_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  refunded_at?: string;

  created_at: string;
  updated_at: string;
  deleted_at?: string;

  store?: { id: string; name: string; slug: string };
  seller?: {
    id: string;
    legal_business_name: string;
    trading_name?: string;
  };
  user?: {
    id: string;
    full_name: string;
    email: string;
    phone?: string;
  };
}

// ============================================
// ADDRESSES
// ============================================

export interface Address {
  id: string;
  user_id: string;
  label: string | null;
  full_name: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  country: string;
  postal_code: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAddressInput {
  label?: string | null;
  full_name: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  state?: string | null;
  country?: string;
  postal_code?: string | null;
  is_default?: boolean;
}

export type UpdateAddressInput = Partial<CreateAddressInput>;

// ============================================
// M-PESA
// ============================================

export interface MpesaTransaction {
  id: string;
  order_id: string;
  merchant_request_id: string | null;
  checkout_request_id: string | null;
  mpesa_receipt: string | null;
  phone: string;
  amount: number;
  status: MpesaTransactionStatus;
  result_code: string | null;
  result_desc: string | null;
  request_payload: Record<string, unknown> | null;
  callback_payload: Record<string, unknown> | null;
  initiated_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// INPUTS
// ============================================

export interface CreateOrderInput {
  store_id: string;
  items: {
    product_id: string;
    variant_id?: string;
    quantity: number;
  }[];
  shipping: {
    method: ShippingMethod;
    address: OrderAddress;
  };
  payment: {
    method: PaymentMethod;
  };
  customer_notes?: string;
  currency?: string;
}

export interface UpdateOrderInput {
  status?: OrderStatus;
  fulfillment_status?: FulfillmentStatus;
  payment_status?: PaymentStatus;
  shipping_tracking?: {
    carrier: string;
    tracking_number: string;
    tracking_url?: string;
  };
  customer_notes?: string;
  seller_notes?: string;
  admin_notes?: string;
}

export interface UpdateOrderStatusInput {
  status: OrderStatus;
  reason?: string;
  notes?: string;
}

export interface CheckoutInput {
  address_id?: string;
  shipping_address?: CreateAddressInput;
  customer_notes?: string;
}

export interface InitiateMpesaPaymentInput {
  order_id: string;
  /** E.164 without plus: 254712345678 */
  phone?: string;
}

// ============================================
// QUERY
// ============================================

export interface GetOrdersQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: OrderStatus[];
  payment_status?: PaymentStatus;
  fulfillment_status?: FulfillmentStatus;
  store_id?: string;
  seller_id?: string;
  user_id?: string;
  min_total?: number;
  max_total?: number;
  date_from?: string;
  date_to?: string;
  sortBy?: 'created_at' | 'total' | 'status';
  sortOrder?: 'asc' | 'desc';
}

// ============================================
// RESPONSES
// ============================================

export interface OrderResponse {
  success: boolean;
  message?: string;
  data: Order;
}

export interface CheckoutResponse {
  success: boolean;
  message: string;
  data: {
    orders: Order[];
    total: number;
    currency: string;
    payment_group_id: string;
  };
}

export interface OrdersListResponse {
  success: boolean;
  data: Order[];
  summary: {
    total: number;
    total_revenue: number;
    status_breakdown: Record<OrderStatus, number>;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface OrderMetrics {
  order_id: string;
  period: 'today' | 'week' | 'month' | 'year' | 'all';
  total_orders: number;
  total_revenue: number;
  average_order_value: number;
  conversion_rate: number;
  cancelled_rate: number;
  return_rate: number;
}

export interface AddressResponse {
  success: boolean;
  message?: string;
  data: { address: Address };
}

export interface AddressesListResponse {
  success: boolean;
  data: Address[];
}

export interface MpesaInitResponse {
  success: boolean;
  message: string;
  data: {
    order_id: string;
    transaction_id: string;
    checkout_request_id: string;
    merchant_request_id: string;
    customer_message: string;
  };
}

export interface MpesaStatusResponse {
  success: boolean;
  data: {
    status: MpesaTransactionStatus;
    order_status: OrderStatus;
    order_payment_status: PaymentStatus;
    mpesa_receipt: string | null;
    result_code: string | null;
    result_desc: string | null;
  };
}

// ============================================
// BASE QUERY
// ============================================

const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1';

const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers) => {
    const token = getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    // Do NOT set Content-Type here — RTK Query / fetch sets it correctly
    // for JSON vs FormData bodies.
    return headers;
  },
});

// ============================================
// QUERY STRING BUILDER
// ============================================

const buildOrdersQuery = (params: GetOrdersQuery): string => {
  const qs = new URLSearchParams();
  const append = (k: string, v: unknown) => {
    if (v === undefined || v === null || v === '') return;
    if (Array.isArray(v)) v.forEach((item) => qs.append(k, String(item)));
    else qs.set(k, String(v));
  };

  append('page', params.page);
  append('limit', params.limit);
  append('search', params.search);
  append('status', params.status);
  append('payment_status', params.payment_status);
  append('fulfillment_status', params.fulfillment_status);
  append('store_id', params.store_id);
  append('seller_id', params.seller_id);
  append('user_id', params.user_id);
  append('min_total', params.min_total);
  append('max_total', params.max_total);
  append('date_from', params.date_from);
  append('date_to', params.date_to);
  append('sortBy', params.sortBy);
  append('sortOrder', params.sortOrder);

  return qs.toString();
};

// ============================================
// API SLICE
// ============================================

export const orderApi = createApi({
  reducerPath: 'orderApi',
  tagTypes: [
    'Order',
    'OrderList',
    'MyOrders',
    'StoreOrders',
    'AdminOrderList',
    'ModeratorOrderList',
    'OrderMetrics',
    'Address',
    'AddressList',
    'MpesaTransaction',
  ],
  baseQuery,
  endpoints: (builder) => ({
    // ============================================================
    // CHECKOUT
    // ============================================================

    /** POST /orders/checkout — convert cart → orders */
    checkout: builder.mutation<CheckoutResponse, CheckoutInput>({
      query: (body) => ({
        url: '/orders/checkout',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['MyOrders', 'OrderList'],
    }),

    // ============================================================
    // ORDERS — READ
    // ============================================================

    /** GET /orders/my — buyer's own orders */
    getMyOrders: builder.query<OrdersListResponse, GetOrdersQuery | void>({
      query: (params) => {
        const qs = params ? buildOrdersQuery(params) : '';
        return `/orders/my${qs ? `?${qs}` : ''}`;
      },
      providesTags: ['MyOrders'],
    }),

    /** GET /orders/:orderId */
    getOrder: builder.query<OrderResponse, string>({
      query: (orderId) => `/orders/${orderId}`,
      providesTags: (_r, _e, orderId) => [{ type: 'Order', id: orderId }],
    }),

    /** GET /orders/number/:orderNumber */
    getOrderByNumber: builder.query<OrderResponse, string>({
      query: (orderNumber) => `/orders/number/${orderNumber}`,
      providesTags: (_r, _e, orderNumber) => [
        { type: 'Order', id: orderNumber },
      ],
    }),

    /** GET /orders/stores/:storeId — seller view for one store */
    getStoreOrders: builder.query<
      OrdersListResponse,
      { storeId: string; params?: GetOrdersQuery }
    >({
      query: ({ storeId, params }) => {
        const qs = params ? buildOrdersQuery(params) : '';
        return `/orders/stores/${storeId}${qs ? `?${qs}` : ''}`;
      },
      providesTags: (_r, _e, { storeId }) => [
        { type: 'StoreOrders', id: storeId },
        'OrderList',
      ],
    }),

    // ============================================================
    // ORDERS — WRITE
    // ============================================================

    /** POST /orders — admin manual order */
    createOrder: builder.mutation<OrderResponse, CreateOrderInput>({
      query: (body) => ({
        url: '/orders',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['OrderList', 'MyOrders'],
    }),

    /** PATCH /orders/:orderId — seller or buyer updates */
    updateOrder: builder.mutation<
      OrderResponse,
      { orderId: string; input: UpdateOrderInput }
    >({
      query: ({ orderId, input }) => ({
        url: `/orders/${orderId}`,
        method: 'PATCH',
        body: input,
      }),
      invalidatesTags: (_r, _e, { orderId }) => [
        { type: 'Order', id: orderId },
        'OrderList',
        'MyOrders',
        'StoreOrders',
      ],
    }),

    /** PUT /orders/admin/orders/:orderId/status — admin override */
    adminUpdateOrderStatus: builder.mutation<
      OrderResponse,
      { orderId: string; input: UpdateOrderStatusInput }
    >({
      query: ({ orderId, input }) => ({
        url: `/orders/admin/orders/${orderId}/status`,
        method: 'PUT',
        body: input,
      }),
      invalidatesTags: (_r, _e, { orderId }) => [
        { type: 'Order', id: orderId },
        'AdminOrderList',
        'OrderList',
      ],
    }),

    /** POST /orders/:orderId/cancel */
    cancelOrder: builder.mutation<
      OrderResponse,
      { orderId: string; reason?: string }
    >({
      query: ({ orderId, reason }) => ({
        url: `/orders/${orderId}/cancel`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: (_r, _e, { orderId }) => [
        { type: 'Order', id: orderId },
        'OrderList',
        'MyOrders',
        'StoreOrders',
      ],
    }),

    // ============================================================
    // METRICS
    // ============================================================

    /** GET /orders/:orderId/metrics */
    getOrderMetrics: builder.query<
      { success: boolean; data: OrderMetrics },
      { orderId: string; period?: 'today' | 'week' | 'month' | 'year' | 'all' }
    >({
      query: ({ orderId, period = 'month' }) =>
        `/orders/${orderId}/metrics?period=${period}`,
      providesTags: (_r, _e, { orderId }) => [
        { type: 'OrderMetrics', id: orderId },
      ],
    }),

    // ============================================================
    // ADDRESSES
    // ============================================================

    /** GET /addresses */
    listAddresses: builder.query<AddressesListResponse, void>({
      query: () => '/addresses',
      providesTags: ['AddressList'],
    }),

    /** GET /addresses/:addressId */
    getAddress: builder.query<AddressResponse, string>({
      query: (addressId) => `/addresses/${addressId}`,
      providesTags: (_r, _e, addressId) => [{ type: 'Address', id: addressId }],
    }),

    /** POST /addresses */
    createAddress: builder.mutation<AddressResponse, CreateAddressInput>({
      query: (body) => ({
        url: '/addresses',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['AddressList'],
    }),

    /** PATCH /addresses/:addressId */
    updateAddress: builder.mutation<
      AddressResponse,
      { addressId: string; input: UpdateAddressInput }
    >({
      query: ({ addressId, input }) => ({
        url: `/addresses/${addressId}`,
        method: 'PATCH',
        body: input,
      }),
      invalidatesTags: (_r, _e, { addressId }) => [
        { type: 'Address', id: addressId },
        'AddressList',
      ],
    }),

    /** DELETE /addresses/:addressId */
    deleteAddress: builder.mutation<{ success: boolean; message: string }, string>({
      query: (addressId) => ({
        url: `/addresses/${addressId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['AddressList'],
    }),

    /** PATCH /addresses/:addressId/default */
    setDefaultAddress: builder.mutation<AddressResponse, string>({
      query: (addressId) => ({
        url: `/addresses/${addressId}/default`,
        method: 'PATCH',
      }),
      invalidatesTags: ['AddressList'],
    }),

    // ============================================================
    // M-PESA
    // ============================================================

    /** POST /payments/mpesa/initiate — starts STK push */
    initiateMpesaPayment: builder.mutation<
      MpesaInitResponse,
      InitiateMpesaPaymentInput
    >({
      query: (body) => ({
        url: '/payments/mpesa/initiate',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['MpesaTransaction'],
    }),

    /** GET /payments/mpesa/status/:orderId — poll for status */
    getMpesaStatus: builder.query<MpesaStatusResponse, string>({
      query: (orderId) => `/payments/mpesa/status/${orderId}`,
      providesTags: (_r, _e, orderId) => [
        { type: 'MpesaTransaction', id: orderId },
      ],
    }),

    // ============================================================
    // ADMIN / MODERATOR
    // ============================================================

    /** GET /orders/admin/orders */
    adminListOrders: builder.query<OrdersListResponse, GetOrdersQuery | void>({
      query: (params) => {
        const qs = params ? buildOrdersQuery(params) : '';
        return `/orders/admin/orders${qs ? `?${qs}` : ''}`;
      },
      providesTags: ['AdminOrderList'],
    }),

    /** GET /orders/moderator/orders */
    moderatorListOrders: builder.query<
      OrdersListResponse,
      GetOrdersQuery | void
    >({
      query: (params) => {
        const qs = params ? buildOrdersQuery(params) : '';
        return `/orders/moderator/orders${qs ? `?${qs}` : ''}`;
      },
      providesTags: ['ModeratorOrderList'],
    }),
  }),
});

// ============================================
// HOOKS
// ============================================

export const {
  // checkout
  useCheckoutMutation,

  // orders — read
  useGetMyOrdersQuery,
  useGetOrderQuery,
  useGetOrderByNumberQuery,
  useGetStoreOrdersQuery,
  useGetOrderMetricsQuery,

  // orders — write
  useCreateOrderMutation,
  useUpdateOrderMutation,
  useAdminUpdateOrderStatusMutation,
  useCancelOrderMutation,

  // addresses
  useListAddressesQuery,
  useGetAddressQuery,
  useCreateAddressMutation,
  useUpdateAddressMutation,
  useDeleteAddressMutation,
  useSetDefaultAddressMutation,

  // mpesa
  useInitiateMpesaPaymentMutation,
  useGetMpesaStatusQuery,

  // admin / moderator
  useAdminListOrdersQuery,
  useModeratorListOrdersQuery,
} = orderApi;

export const {
  useLazyGetMyOrdersQuery,
  useLazyGetOrderQuery,
  useLazyGetOrderByNumberQuery,
  useLazyGetStoreOrdersQuery,
  useLazyGetOrderMetricsQuery,
  useLazyListAddressesQuery,
  useLazyGetAddressQuery,
  useLazyGetMpesaStatusQuery,
  useLazyAdminListOrdersQuery,
  useLazyModeratorListOrdersQuery,
} = orderApi;

export default orderApi;