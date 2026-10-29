// src/store/slices/categorySlice.ts

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { GetCategoriesQuery } from "../../api/categoryApi";

// ============================================
// STATE — UI only
// ============================================

export type CategoryPickerMode = "browse" | "pick";

interface CategoryUiState {
  /** Active filters for the category list view. */
  filters: GetCategoriesQuery;

  /** Currently-highlighted category in the sidebar / tree. */
  selectedId: string | null;

  /** Expanded node ids in the tree widget. */
  expandedIds: string[];

  /** UI mode — affects click behavior in the tree. */
  mode: CategoryPickerMode;

  /** Transient toast message (cleared by consumer after display). */
  flash: string | null;
}

const initialFilters: GetCategoriesQuery = {
  page: 1,
  limit: 20,
  sort: "sort_order",
  order: "asc",
};

const initialState: CategoryUiState = {
  filters: initialFilters,
  selectedId: null,
  expandedIds: [],
  mode: "browse",
  flash: null,
};

// ============================================
// SLICE
// ============================================

const categorySlice = createSlice({
  name: "categoryUi",
  initialState,
  reducers: {
    // ---- Filters ----
    setCategoryFilters(
      state,
      action: PayloadAction<Partial<GetCategoriesQuery>>,
    ) {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetCategoryFilters(state) {
      state.filters = initialFilters;
    },

    // ---- Selection ----
    setSelectedCategoryId(state, action: PayloadAction<string | null>) {
      state.selectedId = action.payload;
    },
    clearSelectedCategory(state) {
      state.selectedId = null;
    },

    // ---- Tree expansion ----
    toggleCategoryExpanded(state, action: PayloadAction<string>) {
      const id = action.payload;
      state.expandedIds = state.expandedIds.includes(id)
        ? state.expandedIds.filter((x) => x !== id)
        : [...state.expandedIds, id];
    },
    expandCategory(state, action: PayloadAction<string>) {
      if (!state.expandedIds.includes(action.payload)) {
        state.expandedIds.push(action.payload);
      }
    },
    collapseCategory(state, action: PayloadAction<string>) {
      state.expandedIds = state.expandedIds.filter(
        (x) => x !== action.payload,
      );
    },
    setExpandedCategories(state, action: PayloadAction<string[]>) {
      state.expandedIds = action.payload;
    },
    clearExpandedCategories(state) {
      state.expandedIds = [];
    },

    // ---- Mode ----
    setCategoryPickerMode(state, action: PayloadAction<CategoryPickerMode>) {
      state.mode = action.payload;
    },

    // ---- Flash messages ----
    setCategoryFlash(state, action: PayloadAction<string | null>) {
      state.flash = action.payload;
    },
    clearCategoryFlash(state) {
      state.flash = null;
    },

    // ---- Reset ----
    clearCategoryUiState(state) {
      Object.assign(state, initialState);
    },
  },
});

export const {
  setCategoryFilters,
  resetCategoryFilters,
  setSelectedCategoryId,
  clearSelectedCategory,
  toggleCategoryExpanded,
  expandCategory,
  collapseCategory,
  setExpandedCategories,
  clearExpandedCategories,
  setCategoryPickerMode,
  setCategoryFlash,
  clearCategoryFlash,
  clearCategoryUiState,
} = categorySlice.actions;

export default categorySlice.reducer;

// ============================================
// SELECTORS — UI state only
// ============================================

type RootWithCategoryUi = { categoryUi: CategoryUiState };

export const selectCategoryFilters = (s: RootWithCategoryUi) =>
  s.categoryUi.filters;

export const selectSelectedCategoryId = (s: RootWithCategoryUi) =>
  s.categoryUi.selectedId;

export const selectExpandedCategoryIds = (s: RootWithCategoryUi) =>
  s.categoryUi.expandedIds;

export const selectCategoryPickerMode = (s: RootWithCategoryUi) =>
  s.categoryUi.mode;

export const selectCategoryFlash = (s: RootWithCategoryUi) =>
  s.categoryUi.flash;

// ============================================
// SELECTORS — derived from RTK Query cache
// ============================================

/**
 * Flattened tree from the cached tree query.
 * Components call:
 *   const { data } = useGetCategoryTreeQuery();
 *   const flat = useMemo(() => flattenTree(data?.data ?? []), [data]);
 *
 * Kept here as a pure helper, not a selector, because it needs to
 * run over RTK Query cache data which lives outside the UI slice.
 */
export const flattenCategoryTree = <T extends { children: T[] }>(
  nodes: T[],
): T[] => {
  const out: T[] = [];
  const walk = (list: T[]) => {
    for (const n of list) {
      out.push(n);
      walk(n.children);
    }
  };
  walk(nodes);
  return out;
};