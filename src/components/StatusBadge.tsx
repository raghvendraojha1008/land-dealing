/**
 * StatusBadge — consistent visual badge for all 4 listing statuses.
 * Used in admin table, ListingCard, ListingDetail, MyListings.
 */
import * as React from "react";
import { CheckCircle, Clock, XCircle, Search } from "lucide-react";
import { ListingStatus, STATUS_CONFIG } from "@/types";

interface StatusBadgeProps {
  status: ListingStatus;
  size?: "sm" | "md";
  /** Show warning to buyers about suspected listings */
  showWarning?: boolean;
}

const ICONS: Record<ListingStatus, React.ReactNode> = {
  verified:  <CheckCircle size={12} />,
  unverified:<Clock size={12} />,
  rejected:  <XCircle size={12} />,
  suspected: <Search size={12} />,
};

export function StatusBadge({ status, size = "sm", showWarning }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status];
  const px = size === "md" ? "px-3 py-1" : "px-2 py-0.5";

  return (
    <div className="flex flex-col gap-1">
      <span className={`inline-flex items-center gap-1 rounded-full border text-xs font-semibold capitalize ${px} ${cfg.classes}`}>
        {ICONS[status]}
        {cfg.label}
      </span>
      {showWarning && status === "suspected" && (
        <p className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-2 py-1">
          ⚠ This listing is under investigation by our team. Proceed with caution.
        </p>
      )}
    </div>
  );
}
