import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './baseQueryWithReauth';
import { setGuestCartToken } from '../lib/guestCart';

export interface CartLine {
  id: string;
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    compare_at_price: number | null;
    stock_quantity: number;
    stock_status: string;
    image: { url: string } | null;
  };
  quantity: number;
  unit_price: number;
  line_total: number;
  in_stock: boolean;
  is_available: boolean;
}

export interface Cart {
  id: string;
  guest_token?: string;
  items: CartLine[];
  subtotal: number;
  item_count: number;
}

interface CartEnvelope {
  success: boolean;
  message?: string;
  data: { cart: Cart };
}

const keepToken = (res: CartEnvelope): Cart => {
  if (res.data.cart.guest_token) setGuestCartToken(res.data.cart.guest_token);
  return res.data.cart;
};

export const cartApi = createApi({
  reducerPath: 'cartApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Cart'],
  endpoints: (builder) => ({
    getCart: builder.query<Cart, void>({
      query: () => '/cart',
      transformResponse: keepToken,
      providesTags: ['Cart'],
    }),
    addToCart: builder.mutation<Cart, { product_id: string; variant_id?: string | null; quantity?: number }>({
      query: (body) => ({ url: '/cart/items', method: 'POST', body }),
      transformResponse: keepToken,
      invalidatesTags: ['Cart'],
    }),
    updateCartItem: builder.mutation<Cart, { itemId: string; quantity: number }>({
      query: ({ itemId, quantity }) => ({ url: `/cart/items/${itemId}`, method: 'PATCH', body: { quantity } }),
      transformResponse: keepToken,
      invalidatesTags: ['Cart'],
    }),
    removeCartItem: builder.mutation<Cart, string>({
      query: (itemId) => ({ url: `/cart/items/${itemId}`, method: 'DELETE' }),
      transformResponse: keepToken,
      invalidatesTags: ['Cart'],
    }),
    mergeCart: builder.mutation<unknown, { guest_token: string }>({
      query: (body) => ({ url: '/cart/merge', method: 'POST', body }),
      invalidatesTags: ['Cart'],
    }),
  }),
});

export const {
  useGetCartQuery,
  useAddToCartMutation,
  useUpdateCartItemMutation,
  useRemoveCartItemMutation,
  useMergeCartMutation,
} = cartApi;
