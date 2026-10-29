// src/components/seller/CategoryPicker.tsx

import { useEffect, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import {
  useGetCategoryTreeQuery,
  type CategoryNode,
} from "../../api/categoryApi";

interface Props {
  value: string;
  onChange: (categoryId: string) => void;
  disabled?: boolean;
}

const CategoryPicker = ({ value, onChange, disabled }: Props) => {
  const { data, isLoading } = useGetCategoryTreeQuery();
  const tree = data?.data ?? [];

  const initialChain = useMemo(() => {
    if (!value || tree.length === 0) return [] as string[];
    const chain: string[] = [];
    const walk = (nodes: CategoryNode[], ancestors: string[]): boolean => {
      for (const node of nodes) {
        const path = [...ancestors, node.id];
        if (node.id === value) {
          chain.push(...path);
          return true;
        }
        if (node.children?.length && walk(node.children, path)) return true;
      }
      return false;
    };
    walk(tree, []);
    return chain;
  }, [value, tree]);

  const [chain, setChain] = useState<string[]>(initialChain);

  useEffect(() => {
    setChain(initialChain);
  }, [initialChain]);

  const levels = useMemo(() => {
    const out: { nodes: CategoryNode[]; selected: string }[] = [];
    let siblings = tree;
    for (let i = 0; i < 5; i++) {
      if (!siblings.length) break;
      const selected = chain[i] ?? "";
      out.push({ nodes: siblings, selected });
      if (!selected) break;
      const next = siblings.find((n) => n.id === selected);
      if (!next || !next.children?.length) break;
      siblings = next.children;
    }
    return out;
  }, [tree, chain]);

  const handleLevelChange = (levelIndex: number, nodeId: string) => {
    const next = chain.slice(0, levelIndex);
    if (nodeId) next.push(nodeId);
    setChain(next);

    const deepestId = next[next.length - 1];
    if (!deepestId) {
      onChange("");
      return;
    }
    const node = findNode(tree, deepestId);
    if (node?.is_leaf) {
      onChange(deepestId);
    } else {
      onChange("");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        <div className="h-10 bg-stone-200/50 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {levels.map((level, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 w-20 shrink-0">
            {levelLabel(idx)}
          </span>
          <select
            value={level.selected}
            onChange={(e) => handleLevelChange(idx, e.target.value)}
            disabled={disabled}
            className="flex-1 bg-white/60 border border-white/80 rounded-xl px-4 py-2.5 text-sm text-stone-900 outline-none focus:border-amber-700/50 focus:ring-2 focus:ring-amber-700/10 disabled:opacity-60 transition-all shadow-sm"
          >
            <option value="">
              {idx === 0 ? "— Select department —" : "— Select —"}
            </option>
            {level.nodes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name}
                {n.is_leaf ? "" : " ▸"}
              </option>
            ))}
          </select>
          {level.selected && idx < levels.length - 1 && (
            <ChevronRight size={16} className="text-stone-400 shrink-0" />
          )}
        </div>
      ))}

      {chain.length > 0 &&
        !findNode(tree, chain[chain.length - 1])?.is_leaf && (
          <p className="text-xs text-amber-800/80 ml-24">
            Keep drilling down — pick a leaf category (no ▸ arrow) to enable
            attributes.
          </p>
        )}
    </div>
  );
};

const levelLabel = (i: number): string => {
  switch (i) {
    case 0: return "Department";
    case 1: return "Category";
    case 2: return "Subcategory";
    default: return "Detail";
  }
};

const findNode = (nodes: CategoryNode[], id: string): CategoryNode | null => {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children?.length) {
      const hit = findNode(n.children, id);
      if (hit) return hit;
    }
  }
  return null;
};

export default CategoryPicker;