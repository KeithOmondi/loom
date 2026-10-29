// src/components/seller/AttributeFields.tsx

import { useMemo } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import {
  useGetCategoryAttributesQuery,
  type CategoryAttributeDTO,
} from "../../api/categoryApi";
import type { ProductAttributeInput } from "../../api/productApi";

// ============================================
// TYPES
// ============================================

export interface AttributeFormValue {
  attribute_id: string;
  value_text?: string;
  value_number?: number;
  value_boolean?: boolean;
  value_date?: string;
  value_option_id?: string;
}

export type AttributeFormState = Record<string, AttributeFormValue>;

interface Props {
  categoryId: string;
  values: AttributeFormState;
  onChange: (next: AttributeFormState) => void;
  disabled?: boolean;
}

// ============================================
// COMPONENT
// ============================================

const AttributeFields = ({ categoryId, values, onChange, disabled }: Props) => {
  const { data, isLoading, isError, error } =
    useGetCategoryAttributesQuery(categoryId, { skip: !categoryId });

  const attributes = data?.data?.attributes ?? [];

  const sorted = useMemo(
    () => [...attributes].sort((a, b) => a.sort_order - b.sort_order),
    [attributes],
  );

  if (!categoryId) return null;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-stone-500">
        <Loader2 size={16} className="animate-spin" />
        Loading attributes…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50/80 border border-red-200/60 rounded-xl p-3">
        <AlertCircle size={16} className="mt-0.5 shrink-0" />
        <span>
          Failed to load attributes for this category.{" "}
          {(error as any)?.data?.message ?? ""}
        </span>
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <p className="text-xs text-stone-400 italic">
        No attributes defined for this category.
      </p>
    );
  }

  const setValue = (attributeId: string, patch: Partial<AttributeFormValue>) => {
    const existing = values[attributeId] ?? { attribute_id: attributeId };
    onChange({
      ...values,
      [attributeId]: { ...existing, ...patch },
    });
  };

  return (
    <div className="space-y-4">
      {sorted.map((attr) => (
        <AttributeField
          key={attr.id}
          attr={attr}
          value={values[attr.id]}
          onChange={(patch) => setValue(attr.id, patch)}
          disabled={disabled}
        />
      ))}
    </div>
  );
};

// ============================================
// SINGLE FIELD
// ============================================

const AttributeField = ({
  attr,
  value,
  onChange,
  disabled,
}: {
  attr: CategoryAttributeDTO;
  value?: AttributeFormValue;
  onChange: (patch: Partial<AttributeFormValue>) => void;
  disabled?: boolean;
}) => {
  // ✅ FIX: explicit type annotation so `v` isn't inferred as a narrow union
  const v: AttributeFormValue = value ?? { attribute_id: attr.id };

  const label = (
    <label className="block text-xs font-semibold text-stone-600 mb-1.5">
      {attr.name}
      {attr.validation.unit && (
        <span className="text-stone-400 font-normal">
          {" "}
          ({attr.validation.unit})
        </span>
      )}
      {attr.is_required && <span className="text-red-500"> *</span>}
      {attr.description && (
        <span className="block text-[11px] text-stone-400 font-normal mt-0.5">
          {attr.description}
        </span>
      )}
    </label>
  );

  const inputClass =
    "w-full bg-white/60 border border-white/80 rounded-xl px-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 outline-none focus:border-amber-700/50 focus:ring-2 focus:ring-amber-700/10 disabled:opacity-60 transition-all shadow-sm";

  switch (attr.type) {
    case "select":
      return (
        <div>
          {label}
          <select
            value={v.value_option_id ?? ""}
            onChange={(e) =>
              onChange({
                value_option_id: e.target.value || undefined,
                value_text: undefined,
                value_number: undefined,
                value_boolean: undefined,
                value_date: undefined,
              })
            }
            disabled={disabled}
            className={inputClass}
          >
            <option value="">— Select —</option>
            {attr.options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.value}
              </option>
            ))}
          </select>
        </div>
      );

    case "text":
    case "textarea":
      return (
        <div>
          {label}
          {attr.type === "textarea" ? (
            <textarea
              value={v.value_text ?? ""}
              onChange={(e) => onChange({ value_text: e.target.value })}
              disabled={disabled}
              className={`${inputClass} min-h-[80px] resize-y`}
            />
          ) : (
            <input
              type="text"
              value={v.value_text ?? ""}
              onChange={(e) => onChange({ value_text: e.target.value })}
              disabled={disabled}
              className={inputClass}
            />
          )}
        </div>
      );

    case "number":
      return (
        <div>
          {label}
          <input
            type="number"
            value={v.value_number ?? ""}
            onChange={(e) =>
              onChange({
                value_number:
                  e.target.value === "" ? undefined : Number(e.target.value),
              })
            }
            disabled={disabled}
            className={inputClass}
            min={attr.validation.min ?? undefined}
            max={attr.validation.max ?? undefined}
            step="any"
          />
        </div>
      );

    case "boolean":
      return (
        <label className="flex items-center gap-3 text-sm text-stone-700 cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={Boolean(v.value_boolean)}
            onChange={(e) => onChange({ value_boolean: e.target.checked })}
            disabled={disabled}
            className="w-4 h-4 rounded border-stone-300 text-amber-800 focus:ring-amber-800"
          />
          <span>
            {attr.name}
            {attr.is_required && <span className="text-red-500"> *</span>}
          </span>
        </label>
      );

    case "date":
      return (
        <div>
          {label}
          <input
            type="date"
            value={v.value_date ?? ""}
            onChange={(e) =>
              onChange({ value_date: e.target.value || undefined })
            }
            disabled={disabled}
            className={inputClass}
          />
        </div>
      );

    case "multiselect":
      return (
        <div>
          {label}
          <p className="text-xs text-stone-400 italic">
            (Multiselect not yet supported in the form.)
          </p>
        </div>
      );

    default:
      return null;
  }
};

export default AttributeFields;

// ============================================
// HELPERS
// ============================================

export const formStateToPayload = (
  state: AttributeFormState,
): ProductAttributeInput[] => {
  const out: ProductAttributeInput[] = [];
  for (const v of Object.values(state)) {
    const hasValue =
      v.value_text !== undefined ||
      v.value_number !== undefined ||
      v.value_boolean !== undefined ||
      v.value_date !== undefined ||
      v.value_option_id !== undefined;
    if (!hasValue) continue;

    const entry: ProductAttributeInput = { attribute_id: v.attribute_id };
    if (v.value_text !== undefined) entry.value_text = v.value_text;
    if (v.value_number !== undefined) entry.value_number = v.value_number;
    if (v.value_boolean !== undefined) entry.value_boolean = v.value_boolean;
    if (v.value_date !== undefined) entry.value_date = v.value_date;
    if (v.value_option_id !== undefined)
      entry.value_option_id = v.value_option_id;
    out.push(entry);
  }
  return out;
};

export const payloadToFormState = (
  payload: ProductAttributeInput[] | undefined,
): AttributeFormState => {
  if (!payload?.length) return {};
  const state: AttributeFormState = {};
  for (const a of payload) {
    state[a.attribute_id] = {
      attribute_id: a.attribute_id,
      value_text: a.value_text,
      value_number: a.value_number,
      value_boolean: a.value_boolean,
      value_date: a.value_date,
      value_option_id: a.value_option_id,
    };
  }
  return state;
};

export const findMissingRequired = (
  attributes: CategoryAttributeDTO[],
  state: AttributeFormState,
): string | null => {
  for (const attr of attributes) {
    if (!attr.is_required) continue;
    const v = state[attr.id];
    const has =
      v &&
      (v.value_text !== undefined ||
        v.value_number !== undefined ||
        v.value_boolean !== undefined ||
        v.value_date !== undefined ||
        v.value_option_id !== undefined);
    if (!has) return attr.name;
  }
  return null;
};