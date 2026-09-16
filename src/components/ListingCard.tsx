/**
 * ListingCard — reusable card used in map popup, buyer favorites, and listings grid.
 *
 * Improvements:
 * - Price per sq ft displayed prominently
 * - Indian price formatting (lakhs / crores)
 * - Listing age badge
 * - Skeleton loading variant
 */
import * as React from "react";
import {
  ShieldCheck,
  Heart,
  Scale,
  Eye,
  Edit,
  Trash2,
  MessageSquare,
  XCircle,
} from "lucide-react";
import { Listing, formatIndianPrice, pricePerSqFt, listingAge } from "@/types";

interface ListingCardProps {
  listing: Listing;
  isFavorite?: boolean;
  inCompare?: boolean;
  canManage?: boolean;
  onFavoriteToggle?: () => void;
  onCompareToggle?: () => void;
  onViewDetail?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onContact?: () => void;
  onClose?: () => void;
  /** When true, shows as a compact map popup card */
  compact?: boolean;
}

const TYPE_BADGE: Record<string, string> = {
  residential: "bg-blue-100 text-blue-800",
  agricultural: "bg-green-100 text-green-800",
  commercial: "bg-amber-100 text-amber-800",
};

export function ListingCard({
  listing,
  isFavorite = false,
  inCompare = false,
  canManage = false,
  onFavoriteToggle,
  onCompareToggle,
  onViewDetail,
  onEdit,
  onDelete,
  onContact,
  onClose,
  compact = false,
}: ListingCardProps) {
  const ppsf = pricePerSqFt(listing);
  const age = listingAge(listing.createdAt);

  return (
    <div className="bg-card rounded-2xl shadow-soft border border-border overflow-hidden">
      {/* Image + badges */}
      <div className="relative">
        <img
          src={listing.images[0]}
          alt={listing.title}
          className={`w-full object-cover ${compact ? "h-40" : "h-52"}`}
        />

        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-2.5 right-2.5 bg-card/90 p-1.5 rounded-full hover:bg-card text-foreground shadow-sm transition"
          >
            <XCircle size={18} />
          </button>
        )}

        {listing.status === "verified" && (
          <div className="absolute bottom-2.5 left-2.5 bg-green-600/90 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
            <ShieldCheck size={12} /> Verified
          </div>
        )}

        {age && (
          <div className="absolute top-2.5 left-2.5 bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-0.5 rounded-full">
            {age}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title + type */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h2
            className={`font-bold text-card-foreground leading-tight ${
              compact ? "text-base" : "text-lg"
            }`}
          >
            {listing.title}
          </h2>
          <span
            className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${
              TYPE_BADGE[listing.type]
            }`}
          >
            {listing.type}
          </span>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-2xl font-bold text-primary">
            {formatIndianPrice(listing.price)}
          </span>
        </div>

        {/* Area + price per sqft */}
        <div className="flex gap-3 text-sm text-muted-foreground mb-4">
          <span className="bg-muted px-2.5 py-1 rounded-lg font-medium">
            {listing.area.toLocaleString("en-IN")} sq ft
          </span>
          {ppsf > 0 && (
            <span className="bg-primary/10 text-primary px-2.5 py-1 rounded-lg font-semibold">
              ₹{ppsf.toLocaleString("en-IN")}/sq ft
            </span>
          )}
        </div>

        {/* Action row */}
        <div className="flex gap-2">
          {/* Favorite */}
          {onFavoriteToggle && (
            <button
              onClick={onFavoriteToggle}
              className={`p-2 rounded-lg border transition ${
                isFavorite
                  ? "bg-destructive/10 border-destructive/30 text-destructive"
                  : "bg-card border-border text-muted-foreground hover:text-destructive"
              }`}
            >
              <Heart size={16} className={isFavorite ? "fill-current" : ""} />
            </button>
          )}

          {/* Compare */}
          {onCompareToggle && (
            <button
              onClick={onCompareToggle}
              className={`flex-1 py-2 rounded-lg text-sm font-bold border transition flex items-center justify-center gap-1.5 ${
                inCompare
                  ? "bg-muted border-border text-muted-foreground"
                  : "bg-card border-primary text-primary hover:bg-primary/10"
              }`}
            >
              <Scale size={14} /> {inCompare ? "Remove" : "Compare"}
            </button>
          )}

          {/* View detail */}
          {onViewDetail && (
            <button
              onClick={onViewDetail}
              className="flex-1 py-2 rounded-lg text-sm font-semibold border border-border text-muted-foreground hover:bg-muted transition flex items-center justify-center gap-1.5"
            >
              <Eye size={14} /> Details
            </button>
          )}
        </div>

        {/* Owner/admin actions */}
        {canManage && (
          <div className="flex gap-2 mt-2">
            {onEdit && (
              <button
                onClick={onEdit}
                className="flex-1 bg-secondary text-secondary-foreground font-bold py-2.5 rounded-xl hover:bg-secondary/90 transition text-sm flex items-center justify-center gap-1.5"
              >
                <Edit size={14} /> Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="flex-1 bg-destructive/10 text-destructive border border-destructive/20 font-bold py-2.5 rounded-xl hover:bg-destructive/20 transition text-sm flex items-center justify-center gap-1.5"
              >
                <Trash2 size={14} /> Delete
              </button>
            )}
          </div>
        )}

        {/* Buyer: contact seller */}
        {!canManage && onContact && (
          <button
            onClick={onContact}
            className="w-full mt-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-xl transition shadow-lg flex items-center justify-center gap-2 text-sm"
          >
            <MessageSquare size={16} /> Message Seller
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Skeleton variant ─────────────────────────────────────────────────────────

export function ListingCardSkeleton() {
  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden animate-pulse">
      <div className="h-52 bg-muted" />
      <div className="p-4 space-y-3">
        <div className="h-5 bg-muted rounded w-3/4" />
        <div className="h-7 bg-muted rounded w-1/2" />
        <div className="flex gap-2">
          <div className="h-8 bg-muted rounded-lg flex-1" />
          <div className="h-8 bg-muted rounded-lg flex-1" />
        </div>
        <div className="h-10 bg-muted rounded-xl" />
      </div>
    </div>
  );
}
