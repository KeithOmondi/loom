// src/store/api/productApi.ts

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { getAccessToken } from './api';

// ============================================
// ENUMS — mirror backend product.types.ts
// ============================================

export type ProductStatus =
  | 'draft'
  | 'pending'
  | 'active'
  | 'suspended'
  | 'rejected'
  | 'discontinued';

export type StockStatus =
  | 'in_stock'
  | 'out_of_stock'
  | 'backorder'
  | 'preorder'
  | 'discontinued';

export type ProductType = 'physical' | 'digital' | 'service' | 'subscription';

export type ProductCondition =
  | 'new'
  | 'used_like_new'
  | 'used_good'
  | 'used_fair'
  | 'refurbished';

export type ProductVisibility = 'public' | 'private' | 'unlisted';

export type WeightUnit = 'kg' | 'g' | 'lb' | 'oz';

export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'flagged';

export type VariantStockStatus =
  | 'in_stock'
  | 'out_of_stock'
  | 'backorder'
  | 'preorder'
  | 'discontinued';

export type SellerCreatableStatus = 'draft' | 'pending';
export type SellerMutableStatus = 'draft' | 'pending' | 'discontinued';

// ============================================
// COMPOSITE SHAPES
// ============================================

export interface ProductSeo {
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  canonical_url: string | null;
  og_image_url: string | null;
}

export interface ProductDimensions {
  length: number;
  width: number;
  height: number;
  unit: 'cm' | 'in';
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  public_id: string;
  alt_text: string | null;
  is_primary: boolean;
  sort_order: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface ProductAttributeValue {
  id: string;
  product_id: string;
  attribute_id: string;
  value_text: string | null;
  value_number: number | null;
  value_boolean: boolean | null;
  value_date: string | null;
  value_option_id: string | null;
  value_option_ids: string[] | null;
  created_at: string;
  updated_at: string;
  attribute: {
    id: string;
    name: string;
    slug: string;
    type:
      | 'text'
      | 'textarea'
      | 'number'
      | 'boolean'
      | 'date'
      | 'select'
      | 'multiselect';
    description: string | null;
    scope: 'global' | 'category';
    group_id: string | null;
    is_required: boolean;
    is_filterable: boolean;
    is_variant: boolean;
    is_comparable: boolean;
    is_searchable: boolean;
    validation: {
      min_length?: number;
      max_length?: number;
      min?: number;
      max?: number;
      regex?: string;
      unit?: string;
    };
    sort_order: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  };
  option?: {
    id: string;
    value: string;
    slug: string;
    swatch: string | null;
  };
  options?: {
    id: string;
    value: string;
    slug: string;
    swatch: string | null;
  }[];
}

export interface ProductVariant {
  id: string;
  product_id: string;
  sku: string;
  price: number;
  compare_at_price: number | null;
  cost_per_item: number | null;
  stock_quantity: number;
  stock_status: VariantStockStatus;
  low_stock_threshold: number;
  allow_backorders: boolean;
  weight: number | null;
  weight_unit: WeightUnit | null;
  image_url: string | null;
  position: number;
  is_active: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  attributes: Array<{
    id: string;
    variant_id: string;
    attribute_id: string;
    value_option_id: string;
    attribute: {
      id: string;
      name: string;
      slug: string;
      type: string;
    };
    option: {
      id: string;
      value: string;
      slug: string;
      swatch: string | null;
    };
  }>;
}

export interface ProductReview {
  id: string;
  product_id: string;
  user_id: string;
  order_id: string | null;
  rating: number;
  title: string | null;
  comment: string | null;
  images: string[] | null;
  is_verified_purchase: boolean;
  is_approved: boolean;
  status: ReviewStatus;
  helpful_count: number;
  moderated_by: string | null;
  moderated_at: string | null;
  moderation_reason: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  user?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

// ============================================
// PRODUCT
// ============================================

export interface Product {
  id: string;
  store_id: string;
  seller_id: string;

  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  tags: string[];

  type: ProductType;
  condition: ProductCondition;
  visibility: ProductVisibility;
  category_id: string | null;

  price: number;
  compare_at_price: number | null;
  cost_per_item: number | null;
  tax_class: string | null;
  is_taxable: boolean;

  sku: string | null;
  barcode: string | null;
  stock_quantity: number;
  stock_status: StockStatus;
  low_stock_threshold: number;
  allow_backorders: boolean;
  allow_preorders: boolean;
  preorder_release_date: string | null;

  weight: number | null;
  weight_unit: WeightUnit;
  dimensions: ProductDimensions | null;
  requires_shipping: boolean;
  shipping_class: string | null;

  video_url: string | null;

  has_variants: boolean;
  variant_attribute_ids: string[];

  digital_file_url: string | null;
  digital_file_size: number | null;
  digital_file_name: string | null;
  license_key: string | null;

  seo: ProductSeo;

  status: ProductStatus;
  is_active: boolean;
  is_approved: boolean;
  is_featured: boolean;
  rejection_reason: string | null;
  moderated_at: string | null;
  moderated_by: string | null;
  moderation_notes: string | null;

  view_count: number;
  wishlist_count: number;
  order_count: number;
  average_rating: number;
  total_reviews: number;
  sales_count: number;

  created_at: string;
  updated_at: string;
  published_at: string | null;
  deleted_at: string | null;

  metadata: Record<string, unknown> | null;

  // Eager-loaded relations (present on detail responses)
  images?: ProductImage[];
  attributes?: ProductAttributeValue[];
  variants?: ProductVariant[];
  store?: { id: string; name: string; slug: string };
  seller?: {
    id: string;
    legal_business_name: string;
    trading_name: string | null;
    rating: number;
  };
  category?: {
    id: string;
    name: string;
    slug: string;
  };
  reviews?: ProductReview[];
}

export interface ModerationProductSnapshot {
  product: Product;
  store?: { id: string; name: string; slug: string };
  seller?: {
    id: string;
    legal_business_name: string;
    trading_name: string | null;
    rating: number;
    user?: { id: string; full_name: string; email: string };
  };
  stats?: {
    views: number;
    wishlist_count: number;
    order_count: number;
    average_rating: number;
    total_reviews: number;
  };
  moderation_history?: Array<{
    id: string;
    moderator_id: string;
    moderator_name?: string;
    action: 'approved' | 'rejected' | 'suspended';
    notes?: string;
    reason?: string;
    created_at: string;
  }>;
}

// ============================================
// INPUTS
// ============================================

export interface ProductAttributeInput {
  attribute_id: string;
  value_text?: string;
  value_number?: number;
  value_boolean?: boolean;
  value_date?: string;
  value_option_id?: string;
  value_option_ids?: string[];
}

export interface VariantInput {
  sku: string;
  price: number;
  compare_at_price?: number;
  cost_per_item?: number;
  stock_quantity: number;
  stock_status?: VariantStockStatus;
  low_stock_threshold?: number;
  allow_backorders?: boolean;
  weight?: number;
  weight_unit?: WeightUnit;
  image_url?: string;
  position?: number;
  is_active?: boolean;
  metadata?: Record<string, unknown>;
  attributes: { attribute_id: string; value_option_id: string }[];
}

export interface CreateProductInput {
  name: string;
  slug?: string;
  description?: string | null;
  short_description?: string | null;

  type: ProductType;
  condition?: ProductCondition;
  visibility?: ProductVisibility;

  category_id?: string | null;
  tags?: string[];

  price: number;
  compare_at_price?: number | null;
  cost_per_item?: number | null;
  tax_class?: string | null;
  is_taxable?: boolean;

  sku?: string | null;
  barcode?: string | null;
  stock_quantity?: number;
  stock_status?: StockStatus;
  low_stock_threshold?: number;
  allow_backorders?: boolean;
  allow_preorders?: boolean;
  preorder_release_date?: string | null;

  weight?: number | null;
  weight_unit?: WeightUnit;
  dimensions?: ProductDimensions | null;
  requires_shipping?: boolean;
  shipping_class?: string | null;

  video_url?: string | null;

  has_variants?: boolean;
  variant_attribute_ids?: string[];
  variants?: VariantInput[];

  digital_file_url?: string | null;
  digital_file_size?: number | null;
  digital_file_name?: string | null;

  seo?: Partial<ProductSeo>;

  attributes?: ProductAttributeInput[];

  status?: SellerCreatableStatus;
  is_featured?: boolean;

  metadata?: Record<string, unknown>;
}

export interface UpdateProductInput {
  name?: string;
  slug?: string;
  description?: string | null;
  short_description?: string | null;

  type?: ProductType;
  condition?: ProductCondition;
  visibility?: ProductVisibility;

  category_id?: string | null;
  tags?: string[];

  price?: number;
  compare_at_price?: number | null;
  cost_per_item?: number | null;
  tax_class?: string | null;
  is_taxable?: boolean;

  sku?: string | null;
  barcode?: string | null;
  stock_quantity?: number;
  stock_status?: StockStatus;
  low_stock_threshold?: number;
  allow_backorders?: boolean;
  allow_preorders?: boolean;
  preorder_release_date?: string | null;

  weight?: number | null;
  weight_unit?: WeightUnit;
  dimensions?: ProductDimensions | null;
  requires_shipping?: boolean;
  shipping_class?: string | null;

  video_url?: string | null;

  has_variants?: boolean;
  variant_attribute_ids?: string[];
  variants?: VariantInput[];

  digital_file_url?: string | null;
  digital_file_size?: number | null;
  digital_file_name?: string | null;

  seo?: Partial<ProductSeo>;
  attributes?: ProductAttributeInput[];

  status?: SellerMutableStatus;
  is_featured?: boolean;
  is_active?: boolean;

  metadata?: Record<string, unknown>;
}

export interface GetProductsQuery {
  page?: number;
  limit?: number;
  search?: string;

  status?: ProductStatus | ProductStatus[];
  type?: ProductType;
  condition?: ProductCondition;

  category_id?: string;
  category_include_descendants?: boolean;

  store_id?: string;
  seller_id?: string;

  min_price?: number;
  max_price?: number;

  has_variants?: boolean;
  is_active?: boolean;
  is_approved?: boolean;
  is_featured?: boolean;
  in_stock?: boolean;

  sort?:
    | 'name'
    | 'price_asc'
    | 'price_desc'
    | 'newest'
    | 'oldest'
    | 'popular'
    | 'rating'
    | 'sales'
    | 'relevance';
  order?: 'asc' | 'desc';

  date_from?: string;
  date_to?: string;
}

// ============================================
// RESPONSES
// ============================================

export interface ProductResponse {
  success: boolean;
  message?: string;
  data: Product;
}

export interface ProductsListResponse {
  success: boolean;
  data: Product[];
  pagination: { page: number; limit: number; total: number; pages: number };
  filters?: {
    categories: Array<{ id: string; name?: string; count: number }>;
    statuses: Array<{ status: ProductStatus; count: number }>;
    price_range: { min: number; max: number };
  };
}

export interface ProductReviewsResponse {
  success: boolean;
  data: ProductReview[];
  summary: {
    average_rating: number;
    total_reviews: number;
    rating_distribution: Record<number, number>;
  };
  pagination: { page: number; limit: number; total: number; pages: number };
}

export interface ProductMetrics {
  product_id: string;
  period: 'today' | 'week' | 'month' | 'year' | 'all';
  views: number;
  wishlist_count: number;
  order_count: number;
  revenue: number;
  average_rating: number;
  total_reviews: number;
  conversion_rate: number;
  return_rate: number;
}

export interface ProductStatusResponse {
  success: boolean;
  data: {
    id: string;
    status: ProductStatus;
    is_active: boolean;
    is_approved: boolean;
    can_edit: boolean;
    can_publish: boolean;
    can_delete: boolean;
    can_update_stock: boolean;
    block_reason?: string;
    actions_required?: string[];
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
    // NOTE: we do NOT set Content-Type here. Let RTK Query / fetch decide:
    //   - JSON requests get application/json automatically
    //   - FormData requests get multipart/form-data; boundary=... automatically
    // Setting it manually breaks FormData.
    return headers;
  },
});

// ============================================
// QUERY STRING BUILDER
// ============================================

const buildProductsQuery = (params: GetProductsQuery): string => {
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
  append('type', params.type);
  append('condition', params.condition);
  append('category_id', params.category_id);
  append('category_include_descendants', params.category_include_descendants);
  append('store_id', params.store_id);
  append('seller_id', params.seller_id);
  append('min_price', params.min_price);
  append('max_price', params.max_price);
  append('has_variants', params.has_variants);
  append('is_active', params.is_active);
  append('is_approved', params.is_approved);
  append('is_featured', params.is_featured);
  append('in_stock', params.in_stock);
  append('sort', params.sort);
  append('order', params.order);
  append('date_from', params.date_from);
  append('date_to', params.date_to);

  return qs.toString();
};

// ============================================
// ✅ MULTIPART BUILDER (new)
// ============================================

/**
 * Convert a product input object + attached files into a `FormData` payload.
 *
 * - Arrays and objects are JSON.stringify'd (server parses them back).
 * - Scalars are String()'d.
 * - `undefined` and `null` are skipped.
 * - Files are appended under the `images` field (repeatable).
 */
const buildProductFormData = (
  input: CreateProductInput | UpdateProductInput,
  files: File[],
): FormData => {
  const fd = new FormData();

  for (const [key, value] of Object.entries(input)) {
    if (key === 'images') continue;
    if (value === undefined || value === null) continue;

    if (Array.isArray(value) || typeof value === 'object') {
      fd.append(key, JSON.stringify(value));
    } else {
      fd.append(key, String(value));
    }
  }

  for (const file of files) {
    fd.append('images', file);
  }

  return fd;
};

// ============================================
// API SLICE
// ============================================

export const productApi = createApi({
  reducerPath: 'productApi',
  tagTypes: [
    'Product',
    'ProductList',
    'MyProducts',
    'StoreProducts',
    'ProductReviews',
    'ProductMetrics',
    'ProductStatus',
    'AdminProductList',
    'ModeratorProductList',
    'ProductStats',
  ],
  baseQuery,
  endpoints: (builder) => ({
    // ============================================================
    // PUBLIC
    // ============================================================

    listProducts: builder.query<ProductsListResponse, GetProductsQuery | void>({
      query: (params) => {
        const qs = params ? buildProductsQuery(params) : '';
        return `/products${qs ? `?${qs}` : ''}`;
      },
      providesTags: ['ProductList'],
    }),

    getProduct: builder.query<ProductResponse, string>({
      query: (id) => `/products/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Product', id }],
    }),

    getProductBySlug: builder.query<
      ProductResponse,
      { slug: string; store_id?: string }
    >({
      query: ({ slug, store_id }) =>
        `/products/slug/${slug}${store_id ? `?store_id=${store_id}` : ''}`,
      providesTags: (_r, _e, { slug }) => [{ type: 'Product', id: slug }],
    }),

    listStoreProducts: builder.query<
      ProductsListResponse,
      { storeId: string; params?: GetProductsQuery }
    >({
      query: ({ storeId, params }) => {
        const qs = params ? buildProductsQuery(params) : '';
        return `/products/stores/${storeId}/products${qs ? `?${qs}` : ''}`;
      },
      providesTags: (_r, _e, { storeId }) => [
        { type: 'StoreProducts', id: storeId },
        'ProductList',
      ],
    }),

    // ============================================================
    // SELLER
    // ============================================================

    getMyProducts: builder.query<ProductsListResponse, GetProductsQuery | void>({
      query: (params) => {
        const qs = params ? buildProductsQuery(params) : '';
        return `/products/my${qs ? `?${qs}` : ''}`;
      },
      providesTags: ['MyProducts'],
    }),

    // ✅ UPDATED: accepts optional images; sends FormData when files are present
    createProduct: builder.mutation<
      ProductResponse,
      { storeId: string; input: CreateProductInput; images?: File[] }
    >({
      query: ({ storeId, input, images }) => {
        const hasFiles = Array.isArray(images) && images.length > 0;

        if (hasFiles) {
          return {
            url: `/products/stores/${storeId}/products`,
            method: 'POST',
            body: buildProductFormData(input, images),
            // Undefined tells fetch to drop Content-Type and set it itself
            headers: { 'Content-Type': undefined as unknown as string },
          };
        }

        return {
          url: `/products/stores/${storeId}/products`,
          method: 'POST',
          body: input,
        };
      },
      invalidatesTags: ['MyProducts', 'ProductList'],
    }),

    // ✅ UPDATED: same treatment for update
    updateProduct: builder.mutation<
      ProductResponse,
      { productId: string; input: UpdateProductInput; images?: File[] }
    >({
      query: ({ productId, input, images }) => {
        const hasFiles = Array.isArray(images) && images.length > 0;

        if (hasFiles) {
          return {
            url: `/products/${productId}`,
            method: 'PUT',
            body: buildProductFormData(input, images),
            headers: { 'Content-Type': undefined as unknown as string },
          };
        }

        return {
          url: `/products/${productId}`,
          method: 'PUT',
          body: input,
        };
      },
      invalidatesTags: (_r, _e, { productId }) => [
        { type: 'Product', id: productId },
        { type: 'ProductStatus', id: productId },
        'MyProducts',
        'ProductList',
      ],
    }),

    deleteProduct: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: (productId) => ({
        url: `/products/${productId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_r, _e, productId) => [
        { type: 'Product', id: productId },
        'MyProducts',
        'ProductList',
      ],
    }),

    getProductStatus: builder.query<ProductStatusResponse, string>({
      query: (productId) => `/products/${productId}/status`,
      providesTags: (_r, _e, productId) => [
        { type: 'ProductStatus', id: productId },
      ],
    }),

    submitProductForApproval: builder.mutation<ProductResponse, string>({
      query: (productId) => ({
        url: `/products/${productId}/submit`,
        method: 'POST',
      }),
      invalidatesTags: (_r, _e, productId) => [
        { type: 'Product', id: productId },
        { type: 'ProductStatus', id: productId },
        'MyProducts',
        'ModeratorProductList',
      ],
    }),

    getProductMetrics: builder.query<
      { success: boolean; data: ProductMetrics },
      { productId: string; period?: 'today' | 'week' | 'month' | 'year' | 'all' }
    >({
      query: ({ productId, period = 'month' }) =>
        `/products/${productId}/metrics?period=${period}`,
      providesTags: (_r, _e, { productId }) => [
        { type: 'ProductMetrics', id: productId },
      ],
    }),

    // ============================================================
    // REVIEWS
    // ============================================================

    getProductReviews: builder.query<
      ProductReviewsResponse,
      { productId: string; page?: number; limit?: number; onlyApproved?: boolean }
    >({
      query: ({ productId, page = 1, limit = 10, onlyApproved = true }) => {
        const qs = new URLSearchParams({
          page: String(page),
          limit: String(limit),
          only_approved: String(onlyApproved),
        });
        return `/products/${productId}/reviews?${qs.toString()}`;
      },
      providesTags: (_r, _e, { productId }) => [
        { type: 'ProductReviews', id: productId },
      ],
    }),

    createProductReview: builder.mutation<
      { success: boolean; message: string; data: ProductReview },
      {
        product_id: string;
        order_id?: string;
        rating: number;
        title?: string;
        comment?: string;
        images?: string[];
      }
    >({
      query: (input) => ({
        url: `/products/reviews`,
        method: 'POST',
        body: input,
      }),
      invalidatesTags: (_r, _e, { product_id }) => [
        { type: 'ProductReviews', id: product_id },
        { type: 'Product', id: product_id },
      ],
    }),

    // ============================================================
    // ADMIN
    // ============================================================

    adminListProducts: builder.query<ProductsListResponse, GetProductsQuery | void>({
      query: (params) => {
        const qs = params ? buildProductsQuery(params) : '';
        return `/products/admin/products${qs ? `?${qs}` : ''}`;
      },
      providesTags: ['AdminProductList'],
    }),

    adminGetProduct: builder.query<ProductResponse, string>({
      query: (id) => `/products/admin/products/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Product', id }],
    }),

    adminApproveProduct: builder.mutation<
      ProductResponse,
      {
        productId: string;
        approved: boolean;
        rejection_reason?: string;
        notes?: string;
      }
    >({
      query: ({ productId, ...body }) => ({
        url: `/products/admin/products/${productId}/approve`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_r, _e, { productId }) => [
        { type: 'Product', id: productId },
        'AdminProductList',
        'ModeratorProductList',
        'MyProducts',
        'ProductList',
      ],
    }),

    adminBulkProductAction: builder.mutation<
      {
        success: boolean;
        message: string;
        data: {
          processed: number;
          failed: number;
          errors: { id: string; error: string }[];
        };
      },
      {
        product_ids: string[];
        action:
          | 'activate'
          | 'deactivate'
          | 'feature'
          | 'unfeature'
          | 'delete'
          | 'update_status';
        status?: ProductStatus;
      }
    >({
      query: (body) => ({
        url: `/products/admin/products/bulk`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['AdminProductList', 'ProductList', 'MyProducts'],
    }),

    getProductStats: builder.query<
      { success: boolean; data: Record<string, number | string> },
      void
    >({
      query: () => `/products/admin/products/stats`,
      providesTags: ['ProductStats'],
    }),

    // ============================================================
    // MODERATOR
    // ============================================================

    moderatorListPendingProducts: builder.query<
      ProductsListResponse,
      GetProductsQuery | void
    >({
      query: (params) => {
        const qs = params ? buildProductsQuery(params) : '';
        return `/products/moderator/products/pending${qs ? `?${qs}` : ''}`;
      },
      providesTags: ['ModeratorProductList'],
    }),

    moderatorGetProduct: builder.query<
      { success: boolean; data: ModerationProductSnapshot },
      string
    >({
      query: (id) => `/products/moderator/products/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Product', id }],
    }),

    moderatorReviewProduct: builder.mutation<
      ProductResponse,
      {
        productId: string;
        approved: boolean;
        rejection_reason?: string;
        notes?: string;
      }
    >({
      query: ({ productId, ...body }) => ({
        url: `/products/moderator/products/${productId}/review`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_r, _e, { productId }) => [
        { type: 'Product', id: productId },
        'ModeratorProductList',
        'MyProducts',
        'ProductList',
      ],
    }),

    moderatorModerateReview: builder.mutation<
      { success: boolean; message: string; data: ProductReview },
      { reviewId: string; approved: boolean; reason?: string }
    >({
      query: ({ reviewId, ...body }) => ({
        url: `/products/moderator/reviews/${reviewId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['ProductReviews', 'ModeratorProductList'],
    }),
  }),
});

// ============================================
// HOOKS
// ============================================

export const {
  useListProductsQuery,
  useGetProductQuery,
  useGetProductBySlugQuery,
  useListStoreProductsQuery,

  useGetMyProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useGetProductStatusQuery,
  useSubmitProductForApprovalMutation,
  useGetProductMetricsQuery,

  useGetProductReviewsQuery,
  useCreateProductReviewMutation,

  useAdminListProductsQuery,
  useAdminGetProductQuery,
  useAdminApproveProductMutation,
  useAdminBulkProductActionMutation,
  useGetProductStatsQuery,

  useModeratorListPendingProductsQuery,
  useModeratorGetProductQuery,
  useModeratorReviewProductMutation,
  useModeratorModerateReviewMutation,
} = productApi;

export const {
  useLazyListProductsQuery,
  useLazyGetProductQuery,
  useLazyGetProductBySlugQuery,
  useLazyListStoreProductsQuery,
  useLazyGetMyProductsQuery,
  useLazyGetProductStatusQuery,
  useLazyGetProductMetricsQuery,
  useLazyGetProductReviewsQuery,
  useLazyAdminListProductsQuery,
  useLazyModeratorListPendingProductsQuery,
} = productApi;

export default productApi;