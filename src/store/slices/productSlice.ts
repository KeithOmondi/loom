// src/store/slices/productSlice.ts

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { GetProductsQuery } from '../../api/productApi';

// ============================================
// STATE — UI only
// ============================================

interface ProductUiState {
  /** Active filters for the list view. */
  filters: GetProductsQuery;

  /** Currently-selected product id (detail drawer, sidebar highlight). */
  selectedId: string | null;

  /** Seller's draft-mode product being edited (wizard state). */
  draftProductId: string | null;

  /** Transient flash message after mutations. */
  flash: string | null;
}

const initialFilters: GetProductsQuery = {
  page: 1,
  limit: 20,
  sort: 'newest',
};

const initialState: ProductUiState = {
  filters: initialFilters,
  selectedId: null,
  draftProductId: null,
  flash: null,
};

// ============================================
// SLICE
// ============================================

const productSlice = createSlice({
  name: 'productUi',
  initialState,
  reducers: {
    setProductFilters(
      state,
      action: PayloadAction<Partial<GetProductsQuery>>,
    ) {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetProductFilters(state) {
      state.filters = initialFilters;
    },

    setSelectedProductId(state, action: PayloadAction<string | null>) {
      state.selectedId = action.payload;
    },
    clearSelectedProduct(state) {
      state.selectedId = null;
    },

    setDraftProductId(state, action: PayloadAction<string | null>) {
      state.draftProductId = action.payload;
    },
    clearDraftProduct(state) {
      state.draftProductId = null;
    },

    setProductFlash(state, action: PayloadAction<string | null>) {
      state.flash = action.payload;
    },
    clearProductFlash(state) {
      state.flash = null;
    },

    clearProductUiState(state) {
      Object.assign(state, initialState);
    },
  },
});

export const {
  setProductFilters,
  resetProductFilters,
  setSelectedProductId,
  clearSelectedProduct,
  setDraftProductId,
  clearDraftProduct,
  setProductFlash,
  clearProductFlash,
  clearProductUiState,
} = productSlice.actions;

export default productSlice.reducer;

// ============================================
// SELECTORS — UI state only
// ============================================

type RootWithProductUi = { productUi: ProductUiState };

export const selectProductFilters = (s: RootWithProductUi) => s.productUi.filters;
export const selectSelectedProductId = (s: RootWithProductUi) =>
  s.productUi.selectedId;
export const selectDraftProductId = (s: RootWithProductUi) =>
  s.productUi.draftProductId;
export const selectProductFlash = (s: RootWithProductUi) => s.productUi.flash;

// ============================================
// DERIVED HELPERS
// ============================================

export const filterSubmittableProducts = <T extends { status: string }>(
  products: T[],
): T[] => products.filter((p) => p.status === 'draft' || p.status === 'rejected');

export const filterActiveProducts = <T extends { status: string }>(
  products: T[],
): T[] => products.filter((p) => p.status === 'active');

export const filterPendingProducts = <T extends { status: string }>(
  products: T[],
): T[] => products.filter((p) => p.status === 'pending');