/**
 * useSort.ts — sort hook for listings
 *
 * FIX 12: No sort existed. Buyers had no way to sort by price, area,
 * or newest. This hook wraps any listing array with a sort function
 * and a sort state that can be wired to a dropdown.
 *
 * Usage:
 *   const { sorted, sortKey, setSortKey } = useSort(filteredListings);
 *   // replace filteredListings with sorted everywhere it's rendered
 */
import { useState, useMemo } from "react";
import { Listing } from "@/types";

export type SortKey =
  | "newest"
  | "oldest"
  | "price_asc"
  | "price_desc"
  | "area_asc"
  | "area_desc"
  | "ppsf_asc"
  | "ppsf_desc";

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest",     label: "Newest first" },
  { value: "price_asc",  label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "area_asc",   label: "Area: small to large" },
  { value: "area_desc",  label: "Area: large to small" },
  { value: "ppsf_asc",   label: "₹/sq ft: low to high" },
  { value: "ppsf_desc",  label: "₹/sq ft: high to low" },
  { value: "oldest",     label: "Oldest first" },
];

export function useSort(listings: Listing[]) {
  const [sortKey, setSortKey] = useState<SortKey>("newest");

  const sorted = useMemo(() => {
    const arr = [...listings];
    switch (sortKey) {
      case "newest":
        return arr.sort((a, b) =>
          (b.createdAt ?? "").localeCompare(a.createdAt ?? "")
        );
      case "oldest":
        return arr.sort((a, b) =>
          (a.createdAt ?? "").localeCompare(b.createdAt ?? "")
        );
      case "price_asc":
        return arr.sort((a, b) => a.price - b.price);
      case "price_desc":
        return arr.sort((a, b) => b.price - a.price);
      case "area_asc":
        return arr.sort((a, b) => a.area - b.area);
      case "area_desc":
        return arr.sort((a, b) => b.area - a.area);
      case "ppsf_asc":
        return arr.sort(
          (a, b) => a.price / a.area - b.price / b.area
        );
      case "ppsf_desc":
        return arr.sort(
          (a, b) => b.price / b.area - a.price / a.area
        );
      default:
        return arr;
    }
  }, [listings, sortKey]);

  return { sorted, sortKey, setSortKey };
}
