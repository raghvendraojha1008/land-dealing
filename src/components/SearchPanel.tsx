import * as React from "react";
import { Search, Loader, MapPin } from "lucide-react";
import { Filters } from "@/types";
import { PlaceResult } from "@/hooks/useGooglePlaces";
import { SortControl } from "@/components/SortControl";
import { SortKey } from "@/hooks/useSort";

interface SearchPanelProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  placesLoading: boolean;
  placesResults: PlaceResult[];
  onSelectResult: (result: PlaceResult) => void;
  filters: Filters;
  onFiltersChange: (f: Filters) => void;
  listingCount: number;
  // Sort — wired in from App.tsx
  sortKey: SortKey;
  onSortChange: (key: SortKey) => void;
}

export const SearchPanel = React.forwardRef<HTMLDivElement, SearchPanelProps>(
  (
    {
      searchQuery, onSearchChange,
      placesLoading, placesResults, onSelectResult,
      filters, onFiltersChange,
      listingCount,
      sortKey, onSortChange,
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className="absolute top-4 left-4 z-[400] glass-panel rounded-2xl p-4 w-full max-w-xs shadow-xl"
      >
        {/* Place search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input
            type="text"
            placeholder="Search any place, address…"
            className="w-full pl-10 pr-10 py-2.5 border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition outline-none text-sm bg-card"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {placesLoading && (
            <Loader className="absolute right-3 top-1/2 -translate-y-1/2 text-primary animate-spin" size={16} />
          )}
        </div>

        {/* Autocomplete dropdown */}
        {placesResults.length > 0 && (
          <div className="absolute top-[4.5rem] left-4 right-4 bg-card rounded-xl shadow-lg border border-border max-h-60 overflow-y-auto z-10">
            {placesResults.map((r) => (
              <button
                key={r.place_id}
                onClick={(e) => { e.stopPropagation(); onSelectResult(r); }}
                className="w-full text-left px-4 py-3 hover:bg-muted text-sm border-b border-border last:border-b-0 flex items-start gap-2 transition"
              >
                <MapPin size={14} className="text-primary mt-0.5 flex-shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="text-foreground font-medium truncate">{r.main_text}</span>
                  {r.secondary_text && (
                    <span className="text-muted-foreground text-xs truncate">{r.secondary_text}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Type pills */}
        <div className="flex gap-1 mb-3 flex-wrap">
          {(["all", "residential", "commercial", "agricultural"] as const).map((type) => (
            <button
              key={type}
              onClick={() => onFiltersChange({ ...filters, type })}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold capitalize transition ${
                filters.type === type
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {type === "all" ? "All" : type.slice(0, 5)}
            </button>
          ))}
        </div>

        {/* Price range */}
        <div className="mb-3">
          <label className="text-xs font-bold text-muted-foreground mb-1 block">Price (₹)</label>
          <div className="flex gap-2">
            <input
              type="number" placeholder="Min"
              className="w-1/2 p-2 border border-border rounded-lg text-sm bg-card outline-none focus:ring-1 focus:ring-primary"
              value={filters.minPrice || ""}
              onChange={(e) => onFiltersChange({ ...filters, minPrice: Number(e.target.value) || 0 })}
            />
            <input
              type="number" placeholder="Max"
              className="w-1/2 p-2 border border-border rounded-lg text-sm bg-card outline-none focus:ring-1 focus:ring-primary"
              value={filters.maxPrice < 1_000_000_000 ? filters.maxPrice : ""}
              onChange={(e) => onFiltersChange({ ...filters, maxPrice: Number(e.target.value) || 1_000_000_000 })}
            />
          </div>
        </div>

        {/* Area range */}
        <div className="mb-3">
          <label className="text-xs font-bold text-muted-foreground mb-1 block">Area (sq ft)</label>
          <div className="flex gap-2">
            <input
              type="number" placeholder="Min"
              className="w-1/2 p-2 border border-border rounded-lg text-sm bg-card outline-none focus:ring-1 focus:ring-primary"
              value={filters.minArea || ""}
              onChange={(e) => onFiltersChange({ ...filters, minArea: Number(e.target.value) || 0 })}
            />
            <input
              type="number" placeholder="Max"
              className="w-1/2 p-2 border border-border rounded-lg text-sm bg-card outline-none focus:ring-1 focus:ring-primary"
              value={filters.maxArea < 5_000_000 ? filters.maxArea : ""}
              onChange={(e) => onFiltersChange({ ...filters, maxArea: Number(e.target.value) || 5_000_000 })}
            />
          </div>
        </div>

        {/* Sort — wired in here */}
        <div className="mb-3">
          <SortControl value={sortKey} onChange={onSortChange} />
        </div>

        {/* Count */}
        <div className="text-xs text-center text-muted-foreground font-medium">
          {listingCount} propert{listingCount === 1 ? "y" : "ies"}
        </div>
      </div>
    );
  }
);

SearchPanel.displayName = "SearchPanel";
