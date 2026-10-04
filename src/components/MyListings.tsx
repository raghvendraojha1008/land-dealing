/**
 * MyListings.tsx — seller's own listing management panel
 *
 * FIX 6: Sellers had no way to see or manage their own listings from the
 * dashboard. They had to find listings on the map, which is impractical
 * when they have multiple listings or the map is panned away.
 *
 * Drop inside the seller tab, above the listing form:
 *   <MyListings
 *     listings={listings.filter(l => authUser && l.sellerId === authUser.id)}
 *     onEdit={handleEditListing}
 *     onDelete={handleDeleteListing}
 *     onViewDetail={openListingDetail}
 *   />
 */
import * as React from "react";
import { useState } from "react";
import {
  Edit, Trash2, Eye, CheckCircle, XCircle, Clock,
  ChevronDown, ChevronUp, LayoutDashboard,
} from "lucide-react";
import { Listing, formatIndianPrice, pricePerSqFt, listingAge } from "@/types";

interface MyListingsProps {
  listings: Listing[];
  onEdit: (listing: Listing) => void;
  onDelete: (id: string) => void;
  onViewDetail: (listing: Listing) => void;
}

const STATUS_CONFIG = {
  verified: {
    icon: <CheckCircle size={13} />,
    label: "Verified",
    cls: "bg-green-100 text-green-700 border-green-200",
  },
  unverified: {
    icon: <Clock size={13} />,
    label: "Pending",
    cls: "bg-amber-100 text-amber-700 border-amber-200",
  },
  rejected: {
    icon: <XCircle size={13} />,
    label: "Rejected",
    cls: "bg-red-100 text-red-700 border-red-200",
  },
} as const;

const TYPE_DOT: Record<string, string> = {
  residential: "bg-blue-500",
  agricultural: "bg-green-500",
  commercial: "bg-purple-500",
};

export function MyListings({ listings, onEdit, onDelete, onViewDetail }: MyListingsProps) {
  const [isOpen, setIsOpen] = useState(true);

  if (listings.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/40 transition"
      >
        <div className="flex items-center gap-2.5">
          <LayoutDashboard size={18} className="text-primary" />
          <span className="font-bold text-card-foreground">My Listings</span>
          <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            {listings.length}
          </span>
        </div>
        {isOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
      </button>

      {isOpen && (
        <div className="border-t border-border divide-y divide-border">
          {listings.map((listing) => {
            const status = STATUS_CONFIG[listing.status] ?? STATUS_CONFIG.unverified;
            const ppsf = pricePerSqFt(listing);
            const age = listingAge(listing.createdAt);

            return (
              <div
                key={listing.id}
                className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 transition group"
              >
                {/* Thumbnail */}
                <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-muted">
                  {listing.images[0] ? (
                    <img
                      src={listing.images[0]}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center`}>
                      <span className={`w-3 h-3 rounded-full ${TYPE_DOT[listing.type]}`} />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-semibold text-card-foreground truncate text-sm">
                      {listing.title}
                    </h3>
                    <span className={`flex-shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-full border ${status.cls}`}>
                      {status.icon} {status.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span className="font-semibold text-primary">{formatIndianPrice(listing.price)}</span>
                    <span>{listing.area.toLocaleString("en-IN")} sq ft</span>
                    {ppsf > 0 && <span>₹{ppsf.toLocaleString("en-IN")}/sqft</span>}
                    {age && <span>{age}</span>}
                  </div>
                  {listing.status === "rejected" && (listing as any).rejectionReason && (
                    <p className="text-xs text-red-600 mt-1 truncate">
                      Reason: {(listing as any).rejectionReason}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={() => onViewDetail(listing)}
                    className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition"
                    title="View details"
                  >
                    <Eye size={15} />
                  </button>
                  <button
                    onClick={() => onEdit(listing)}
                    className="p-2 rounded-lg hover:bg-secondary/10 text-muted-foreground hover:text-secondary transition"
                    title="Edit listing"
                  >
                    <Edit size={15} />
                  </button>
                  <button
                    onClick={() => onDelete(listing.id)}
                    className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition"
                    title="Delete listing"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
