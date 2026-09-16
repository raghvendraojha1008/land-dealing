/**
 * SortControl.tsx — sort dropdown for the map search panel
 *
 * FIX 12: Add this inside SearchPanel, after the area filter:
 *
 *   import { SortControl } from "@/components/SortControl";
 *   import { useSort, SortKey } from "@/hooks/useSort";
 *
 *   // In App.tsx, replace filteredListings with sorted:
 *   const { sorted: sortedListings, sortKey, setSortKey } = useSort(filteredListings);
 *   // Then pass sortedListings to LeafletMap and listing grids instead of filteredListings
 *
 *   <SortControl value={sortKey} onChange={setSortKey} />
 */
import * as React from "react";
import { ArrowUpDown } from "lucide-react";
import { SORT_OPTIONS, SortKey } from "@/hooks/useSort";

interface SortControlProps {
  value: SortKey;
  onChange: (key: SortKey) => void;
}

export function SortControl({ value, onChange }: SortControlProps) {
  return (
    <div className="flex items-center gap-2">
      <ArrowUpDown size={14} className="text-muted-foreground flex-shrink-0" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortKey)}
        className="flex-1 text-xs py-1.5 px-2 border border-border rounded-lg bg-card text-card-foreground outline-none focus:ring-1 focus:ring-primary cursor-pointer"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
