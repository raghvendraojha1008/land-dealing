/**
 * ReraBadge — shows RERA compliance status on listing cards and detail pages.
 *
 * Usage:
 *   <ReraBadge reraNumber={listing.reraNumber} size="sm" />
 *   <ReraBadge reraNumber={listing.reraNumber} size="lg" />
 *
 * Integration steps:
 * 1. Add `reraNumber?: string` to the Listing interface in types/index.ts
 * 2. Add `rera_number?: string` to DbListing in useListings.ts
 * 3. Map it in mapDbToListing: `reraNumber: db.rera_number || undefined`
 * 4. Add a RERA number input to ListingForm (see snippet at bottom of this file)
 * 5. Add to the Supabase listings table: `alter table listings add column rera_number text;`
 *
 * The badge links to the official MahaRERA / RERA search portal so buyers
 * can verify the number themselves — this is what builds real trust.
 */
import * as React from "react";
import { ShieldCheck, ShieldOff } from "lucide-react";

interface ReraBadgeProps {
  reraNumber?: string;
  /** sm = inline pill for cards, lg = prominent block for detail sidebar */
  size?: "sm" | "lg";
}

export function ReraBadge({ reraNumber, size = "sm" }: ReraBadgeProps) {
  if (size === "sm") {
    if (!reraNumber) {
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">
          <ShieldOff size={11} />
          No RERA
        </span>
      );
    }
    return (
      <a
        href={`https://rera.punjab.gov.in/`}
        target="_blank"
        rel="noopener noreferrer"
        title={`RERA: ${reraNumber} — click to verify`}
        className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 font-medium hover:bg-green-100 transition"
        onClick={(e) => e.stopPropagation()}
      >
        <ShieldCheck size={11} />
        RERA
      </a>
    );
  }

  // Large variant for detail page sidebar
  if (!reraNumber) {
    return (
      <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
        <ShieldOff size={18} className="text-amber-600 flex-shrink-0" />
        <div>
          <p className="text-xs font-bold text-amber-800">RERA not registered</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Seller hasn't provided a RERA number.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
      <ShieldCheck size={18} className="text-green-600 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-green-800">RERA Registered</p>
        <p className="text-xs text-green-700 font-mono mt-0.5 truncate">
          {reraNumber}
        </p>
      </div>
      <a
        href={`https://rera.punjab.gov.in/`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs font-semibold text-green-700 hover:text-green-900 underline flex-shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        Verify ↗
      </a>
    </div>
  );
}

/*
 * ─── ListingForm RERA input snippet ──────────────────────────────────────────
 * Add this block inside ListingForm.tsx after the "Type" field:
 *
 * <div>
 *   <label className="block text-sm font-semibold text-card-foreground mb-1.5">
 *     RERA Number
 *     <span className="font-normal text-muted-foreground text-xs ml-2">(optional but recommended)</span>
 *   </label>
 *   <input
 *     className="w-full p-3 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none bg-muted"
 *     placeholder="e.g. PBRERA-SAS79-PRJ-2024-1234"
 *     value={listing.reraNumber || ""}
 *     onChange={(e) => set({ reraNumber: e.target.value })}
 *   />
 *   <p className="text-xs text-muted-foreground mt-1">
 *     Your RERA registration number. Buyers can verify this on the RERA portal.
 *   </p>
 * </div>
 *
 * ─── types/index.ts addition ─────────────────────────────────────────────────
 * Add to the Listing interface:
 *   reraNumber?: string;
 *
 * ─── useListings.ts addition ─────────────────────────────────────────────────
 * Add to DbListing interface:
 *   rera_number?: string | null;
 *
 * Add to mapDbToListing:
 *   reraNumber: db.rera_number || undefined,
 *
 * Add to addListing insert:
 *   rera_number: listing.reraNumber || null,
 *
 * Add to updateListing update:
 *   rera_number: updates.reraNumber,
 *
 * ─── Supabase migration ──────────────────────────────────────────────────────
 * Run in Supabase SQL editor:
 *   alter table listings add column if not exists rera_number text;
 */
