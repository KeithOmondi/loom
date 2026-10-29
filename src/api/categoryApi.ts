// src/store/api/categoryApi.ts

import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { getAccessToken } from "./api";

// ============================================
// ENUMS
// ============================================

export type CategoryStatus = "active" | "inactive" | "archived";
export type CategoryType = "department" | "category" | "subcategory" | "leaf";

export type AttributeType =
  | "text"
  | "textarea"
  | "number"
  | "boolean"
  | "date"
  | "select"
  | "multiselect";

// ============================================
// TYPES — mirror backend
// ============================================

export interface CategorySeo {
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  canonical_url: string | null;
  og_image_url: string | null;
}

export interface Category {
  id: string;
  parent_id: string | null;

  name: string;
  slug: string;
  description: string | null;

  path: string;
  depth: number;
  is_leaf: boolean;
  type: CategoryType;

  image_url: string | null;
  icon: string | null;

  sort_order: number;
  status: CategoryStatus;
  is_featured: boolean;

  seo: CategorySeo;

  product_count: number;
  child_count: number;

  created_by: string | null;

  created_at: string;
  updated_at: string;
}

/** Tree node returned by `/categories/tree`. */
export interface CategoryNode extends Category {
  children: CategoryNode[];
  full_path: string;
}

/**
 * A single attribute definition linked to a category.
 *
 * Matches the flat shape returned by the backend
 * `GET /api/v1/categories/:id/attributes` endpoint.
 *
 * Note: no `.attribute` wrapper, no `.source` — the attribute fields
 * sit at the top level of each array item.
 */
export interface CategoryAttributeDTO {
  id: string;
  name: string;
  slug: string;
  type: AttributeType;
  description: string | null;
  is_required: boolean;
  is_filterable: boolean;
  is_variant: boolean;
  sort_order: number;
  validation: {
    min: number | null;
    max: number | null;
    regex: string | null;
    unit: string | null;
  };
  options: Array<{
    id: string;
    value: string;
    slug: string;
  }>;
}

// ============================================
// INPUTS
// ============================================

export interface CreateCategoryInput {
  parent_id?: string | null;

  name: string;
  slug?: string;
  description?: string | null;

  type?: CategoryType;

  image_url?: string | null;
  icon?: string | null;

  sort_order?: number;

  status?: CategoryStatus;
  is_featured?: boolean;

  seo?: Partial<CategorySeo>;
}

export interface UpdateCategoryInput {
  parent_id?: string | null;

  name?: string;
  slug?: string;
  description?: string | null;

  type?: CategoryType;

  image_url?: string | null;
  icon?: string | null;

  sort_order?: number;

  status?: CategoryStatus;
  is_featured?: boolean;

  seo?: Partial<CategorySeo>;
}

export interface GetCategoriesQuery {
  page?: number;
  limit?: number;
  search?: string;

  parent_id?: string;
  parent_id_is_null?: boolean;

  type?: CategoryType;
  status?: CategoryStatus;

  is_featured?: boolean;
  is_leaf?: boolean;

  include_descendants?: boolean;
  depth_max?: number;

  sort?: "name" | "sort_order" | "created_at" | "product_count";
  order?: "asc" | "desc";
}

export interface GetCategoryTreeQuery {
  root_id?: string;
  depth_max?: number;
  status?: CategoryStatus;
  include_product_count?: boolean;
}

export interface MoveCategoryInput {
  parent_id: string | null;
  sort_order?: number;
}

export interface ReorderCategoriesInput {
  parent_id: string | null;
  ordered_ids: string[];
}

export interface BulkCategoryStatusInput {
  ids: string[];
  status: CategoryStatus;
}

export interface BulkCategoryDeleteInput {
  ids: string[];
  force?: boolean;
}

// ============================================
// RESPONSES
// ============================================

export interface CategoryResponse {
  success: boolean;
  message?: string;
  data: Category;
}

export interface CategoriesListResponse {
  success: boolean;
  data: Category[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface CategoryTreeResponse {
  success: boolean;
  data: CategoryNode[];
}

/**
 * Response shape of `GET /categories/:id/attributes`.
 *
 * The `category` object is a trimmed subset (id, name, slug, is_leaf,
 * parent_id, path) and `attributes` is a flat array of
 * CategoryAttributeDTO.
 */
export interface CategoryAttributesResponse {
  success: boolean;
  data: {
    category: {
      id: string;
      name: string;
      slug: string;
      is_leaf: boolean;
      parent_id: string | null;
      path: string;
    };
    attributes: CategoryAttributeDTO[];
  };
}

export interface SimpleMutationResponse {
  success: boolean;
  message: string;
}

// ============================================
// BASE QUERY
// ============================================

const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1";

const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers) => {
    const token = getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    headers.set("Content-Type", "application/json");
    return headers;
  },
});

// ============================================
// QUERY STRING BUILDERS
// ============================================

const buildCategoriesQuery = (params: GetCategoriesQuery): string => {
  const qs = new URLSearchParams();
  if (params.page !== undefined) qs.set("page", String(params.page));
  if (params.limit !== undefined) qs.set("limit", String(params.limit));
  if (params.search) qs.set("search", params.search);

  if (params.parent_id) qs.set("parent_id", params.parent_id);
  if (params.parent_id_is_null !== undefined)
    qs.set("parent_id_is_null", String(params.parent_id_is_null));

  if (params.type) qs.set("type", params.type);
  if (params.status) qs.set("status", params.status);

  if (params.is_featured !== undefined)
    qs.set("is_featured", String(params.is_featured));
  if (params.is_leaf !== undefined) qs.set("is_leaf", String(params.is_leaf));

  if (params.include_descendants !== undefined)
    qs.set("include_descendants", String(params.include_descendants));
  if (params.depth_max !== undefined)
    qs.set("depth_max", String(params.depth_max));

  if (params.sort) qs.set("sort", params.sort);
  if (params.order) qs.set("order", params.order);
  return qs.toString();
};

const buildTreeQuery = (params: GetCategoryTreeQuery): string => {
  const qs = new URLSearchParams();
  if (params.root_id) qs.set("root_id", params.root_id);
  if (params.depth_max !== undefined)
    qs.set("depth_max", String(params.depth_max));
  if (params.status) qs.set("status", params.status);
  if (params.include_product_count !== undefined)
    qs.set("include_product_count", String(params.include_product_count));
  return qs.toString();
};

// ============================================
// API SLICE
// ============================================

export const categoryApi = createApi({
  reducerPath: "categoryApi",
  tagTypes: [
    "Category",
    "CategoryList",
    "CategoryTree",
    "CategoryAttributes",
  ],
  baseQuery,
  endpoints: (builder) => ({
    // ============================================================
    // PUBLIC READS
    // ============================================================

    listCategories: builder.query<
      CategoriesListResponse,
      GetCategoriesQuery | void
    >({
      query: (params) => {
        const qs = params ? buildCategoriesQuery(params) : "";
        return `/categories${qs ? `?${qs}` : ""}`;
      },
      providesTags: ["CategoryList"],
    }),

    getCategoryTree: builder.query<
      CategoryTreeResponse,
      GetCategoryTreeQuery | void
    >({
      query: (params) => {
        const qs = params ? buildTreeQuery(params) : "";
        return `/categories/tree${qs ? `?${qs}` : ""}`;
      },
      providesTags: ["CategoryTree"],
    }),

    getCategory: builder.query<CategoryResponse, string>({
      query: (id) => `/categories/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Category", id }],
    }),

    getCategoryBySlug: builder.query<CategoryResponse, string>({
      query: (slug) => `/categories/slug/${slug}`,
      providesTags: (_r, _e, slug) => [{ type: "Category", id: slug }],
    }),

    /**
     * Fetch the attributes linked to a category.
     * Used by the seller Add Product form to render dynamic fields.
     */
    getCategoryAttributes: builder.query<CategoryAttributesResponse, string>({
      query: (id) => `/categories/${id}/attributes`,
      providesTags: (_r, _e, id) => [{ type: "CategoryAttributes", id }],
    }),

    // ============================================================
    // ADMIN WRITES — CRUD
    // ============================================================

    createCategory: builder.mutation<CategoryResponse, CreateCategoryInput>({
      query: (body) => ({
        url: `/categories`,
        method: "POST",
        body,
      }),
      invalidatesTags: [
        "CategoryList",
        "CategoryTree",
        "CategoryAttributes",
      ],
    }),

    updateCategory: builder.mutation<
      CategoryResponse,
      { id: string; input: UpdateCategoryInput }
    >({
      query: ({ id, input }) => ({
        url: `/categories/${id}`,
        method: "PATCH",
        body: input,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Category", id },
        "CategoryList",
        "CategoryTree",
        { type: "CategoryAttributes", id },
      ],
    }),

    deleteCategory: builder.mutation<
      SimpleMutationResponse,
      { id: string; force?: boolean }
    >({
      query: ({ id, force }) => ({
        url: `/categories/${id}${force ? "?force=true" : ""}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Category", id },
        "CategoryList",
        "CategoryTree",
        { type: "CategoryAttributes", id },
      ],
    }),

    // ============================================================
    // ADMIN WRITES — TREE OPS
    // ============================================================

    moveCategory: builder.mutation<
      CategoryResponse,
      { id: string; input: MoveCategoryInput }
    >({
      query: ({ id, input }) => ({
        url: `/categories/${id}/move`,
        method: "POST",
        body: input,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Category", id },
        "CategoryList",
        "CategoryTree",
      ],
    }),

    reorderCategories: builder.mutation<
      SimpleMutationResponse,
      ReorderCategoriesInput
    >({
      query: (body) => ({
        url: `/categories/reorder`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["CategoryList", "CategoryTree"],
    }),

    // ============================================================
    // ADMIN WRITES — BULK
    // ============================================================

    bulkUpdateCategoryStatus: builder.mutation<
      SimpleMutationResponse,
      BulkCategoryStatusInput
    >({
      query: (body) => ({
        url: `/categories/bulk/status`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["CategoryList", "CategoryTree"],
    }),

    bulkDeleteCategories: builder.mutation<
      SimpleMutationResponse,
      BulkCategoryDeleteInput
    >({
      query: (body) => ({
        url: `/categories/bulk/delete`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["CategoryList", "CategoryTree"],
    }),
  }),
});

// ============================================
// HOOKS
// ============================================

export const {
  // queries
  useListCategoriesQuery,
  useGetCategoryTreeQuery,
  useGetCategoryQuery,
  useGetCategoryBySlugQuery,
  useGetCategoryAttributesQuery,

  // mutations
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  useMoveCategoryMutation,
  useReorderCategoriesMutation,
  useBulkUpdateCategoryStatusMutation,
  useBulkDeleteCategoriesMutation,
} = categoryApi;

// Lazy variants for on-demand fetching
export const {
  useLazyListCategoriesQuery,
  useLazyGetCategoryTreeQuery,
  useLazyGetCategoryQuery,
  useLazyGetCategoryBySlugQuery,
  useLazyGetCategoryAttributesQuery,
} = categoryApi;

export default categoryApi;