import * as React from "react";
import { Search, Loader, MapPin, SlidersHorizontal, X } from "lucide-react";
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
    const [isFiltersOpen, setIsFiltersOpen] = React.useState(false);

    // Count active non-default filters
    const activeFiltersCount = React.useMemo(() => {
      let c = 0;
      if (filters.type !== "all") c++;
      if (filters.minPrice > 0 || filters.maxPrice < 1_000_000_000) c++;
      if (filters.minArea > 0 || filters.maxArea < 5_000_000) c++;
      return c;
    }, [filters]);

    return (
      <div
        ref={ref}
        className="absolute top-3 left-3 right-3 sm:right-auto sm:top-4 sm:left-4 z-[400] flex flex-col gap-2 w-auto sm:w-80 select-none"
      >
        {/* ── Separate Top Search Bar ── */}
        <div className="bg-card/95 backdrop-blur-md rounded-2xl p-2.5 shadow-xl border border-border flex items-center gap-2 relative">
          <div className="relative flex-1 flex items-center">
            <Search className="absolute left-3 text-muted-foreground" size={18} />
            <input
              type="text"
              placeholder="Search place, landmark, city…"
              className="w-full pl-10 pr-8 py-2 border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition outline-none text-sm bg-background/50 font-medium"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            {searchQuery && !placesLoading && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-2.5 text-muted-foreground hover:text-foreground p-0.5 rounded-full"
              >
                <X size={14} />
              </button>
            )}
            {placesLoading && (
              <Loader className="absolute right-2.5 text-primary animate-spin" size={16} />
            )}
          </div>

          {/* Filter Toggle Button */}
          <button
            type="button"
            onClick={() => setIsFiltersOpen((v) => !v)}
            className={`p-2.5 rounded-xl border transition flex items-center gap-1.5 min-w-[42px] min-h-[42px] justify-center relative ${
              isFiltersOpen || activeFiltersCount > 0
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-background text-foreground border-border hover:bg-muted"
            }`}
            title="Toggle Filters"
          >
            <SlidersHorizontal size={18} />
            {activeFiltersCount > 0 && (
              <span className="bg-destructive text-destructive-foreground text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center -top-1 -right-1 absolute">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {/* Autocomplete Dropdown */}
        {placesResults.length > 0 && (
          <div className="bg-card rounded-2xl shadow-2xl border border-border max-h-64 overflow-y-auto z-10 p-1">
            {placesResults.map((r) => (
              <button
                key={r.place_id}
                onClick={(e) => { e.stopPropagation(); onSelectResult(r); }}
                className="w-full text-left px-3.5 py-2.5 hover:bg-muted rounded-xl text-sm border-b border-border/40 last:border-b-0 flex items-start gap-2.5 transition min-h-[44px]"
              >
                <MapPin size={16} className="text-destructive mt-0.5 flex-shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="text-foreground font-semibold text-xs sm:text-sm truncate">{r.main_text}</span>
                  {r.secondary_text && (
                    <span className="text-muted-foreground text-[11px] truncate">{r.secondary_text}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ── Separate Floating Filter Box ── */}
        {isFiltersOpen && (
          <div className="bg-card/95 backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-border space-y-3 animate-fade-in">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="font-bold text-xs uppercase tracking-wider text-card-foreground">Property Filters</span>
              <button
                onClick={() => onFiltersChange({ type: "all", minPrice: 0, maxPrice: 1_000_000_000, minArea: 0, maxArea: 5_000_000 })}
                className="text-[11px] font-semibold text-primary hover:underline"
              >
                Reset
              </button>
            </div>

            {/* Type Pills */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Category</label>
              <div className="flex gap-1 flex-wrap">
                {(["all", "residential", "commercial", "agricultural"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => onFiltersChange({ ...filters, type })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                      filters.type === type
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {type === "all" ? "All" : type.slice(0, 5)}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Price Range (₹)</label>
              <div className="flex gap-2">
                <input
                  type="number" placeholder="Min Price"
                  className="w-1/2 p-2 border border-border rounded-lg text-xs bg-background outline-none focus:ring-1 focus:ring-primary"
                  value={filters.minPrice || ""}
                  onChange={(e) => onFiltersChange({ ...filters, minPrice: Number(e.target.value) || 0 })}
                />
                <input
                  type="number" placeholder="Max Price"
                  className="w-1/2 p-2 border border-border rounded-lg text-xs bg-background outline-none focus:ring-1 focus:ring-primary"
                  value={filters.maxPrice < 1_000_000_000 ? filters.maxPrice : ""}
                  onChange={(e) => onFiltersChange({ ...filters, maxPrice: Number(e.target.value) || 1_000_000_000 })}
                />
              </div>
            </div>

            {/* Area Range */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Area Range (sq ft)</label>
              <div className="flex gap-2">
                <input
                  type="number" placeholder="Min Area"
                  className="w-1/2 p-2 border border-border rounded-lg text-xs bg-background outline-none focus:ring-1 focus:ring-primary"
                  value={filters.minArea || ""}
                  onChange={(e) => onFiltersChange({ ...filters, minArea: Number(e.target.value) || 0 })}
                />
                <input
                  type="number" placeholder="Max Area"
                  className="w-1/2 p-2 border border-border rounded-lg text-xs bg-background outline-none focus:ring-1 focus:ring-primary"
                  value={filters.maxArea < 5_000_000 ? filters.maxArea : ""}
                  onChange={(e) => onFiltersChange({ ...filters, maxArea: Number(e.target.value) || 5_000_000 })}
                />
              </div>
            </div>

            {/* Sort */}
            <div>
              <SortControl value={sortKey} onChange={onSortChange} />
            </div>

            {/* Count */}
            <div className="text-[11px] text-center text-muted-foreground font-semibold pt-1 border-t border-border">
              Showing {listingCount} propert{listingCount === 1 ? "y" : "ies"}
            </div>
          </div>
        )}
      </div>
    );
  }
);

SearchPanel.displayName = "SearchPanel";
