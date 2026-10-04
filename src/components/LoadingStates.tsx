/**
 * LoadingStates — skeleton loaders for the main views.
 *
 * Solves the "map/grid just shows blank while loading" problem.
 */
import * as React from "react";
import { ListingCardSkeleton } from "@/components/ListingCard";

/** 3-column skeleton grid for buyer favorites / listing grids */
export function ListingGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <ListingCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Full-page overlay for initial auth/data load */
export function PageLoader({ message = "Loading…" }: { message?: string }) {
  return (
    <div className="h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground font-medium">{message}</p>
      </div>
    </div>
  );
}

/** Map overlay shown while listings are fetching */
export function MapLoadingOverlay() {
  return (
    <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] z-[300] flex items-center justify-center pointer-events-none">
      <div className="bg-card px-6 py-3 rounded-full shadow-xl border border-border flex items-center gap-3">
        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium text-card-foreground">
          Loading properties…
        </span>
      </div>
    </div>
  );
}

/** Stats card skeleton */
export function StatsCardSkeleton() {
  return (
    <div className="bg-card rounded-2xl border border-border p-5 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-4 bg-muted rounded w-1/3" />
        <div className="w-10 h-10 bg-muted rounded-xl" />
      </div>
      <div className="h-8 bg-muted rounded w-1/4" />
    </div>
  );
}
