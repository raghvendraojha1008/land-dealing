/**
 * ComparePage — improved compare view.
 *
 * Changes over original:
 * - Price per sq ft row with best-value highlighting (green)
 * - Listing age row (how long on market)
 * - Description preview row
 * - Visual price bars to give intuitive size comparison
 * - "Open on map" + "View details" per column
 * - Works with string IDs (consistent with improved types)
 */
import * as React from "react";
import {
  ChevronLeft,
  Scale,
  ShieldCheck,
  XCircle,
  MapPin,
  LayoutDashboard,
  TrendingDown,
} from "lucide-react";
import { Listing, formatIndianPrice, pricePerSqFt, listingAge } from "@/types";

interface ComparePageProps {
  listings: Listing[];
  compareList: string[];
  onRemoveFromCompare: (id: string) => void;
  onOpenMap: (listing: Listing) => void;
  onViewDetail: (listing: Listing) => void;
  onBack: () => void;
}

const TYPE_COLORS: Record<string, string> = {
  residential: "bg-blue-100 text-blue-800",
  agricultural: "bg-green-100 text-green-800",
  commercial: "bg-amber-100 text-amber-800",
};

export function ComparePage({
  listings,
  compareList,
  onRemoveFromCompare,
  onOpenMap,
  onViewDetail,
  onBack,
}: ComparePageProps) {
  const items = listings.filter((l) => compareList.includes(l.id));

  // Pre-compute best values for highlighting
  const bestPrice = items.length > 0 ? Math.min(...items.map((l) => l.price)) : 0;
  const bestArea = items.length > 0 ? Math.max(...items.map((l) => l.area)) : 0;
  const bestPpsf =
    items.length > 0
      ? Math.min(...items.map((l) => pricePerSqFt(l)))
      : 0;
  const maxPrice =
    items.length > 0 ? Math.max(...items.map((l) => l.price)) : 1;

  const isBest = (val: number, best: number) => val === best && items.length > 1;

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-8 animate-fade-in overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-card-foreground flex items-center gap-3">
          <Scale size={32} className="text-primary" /> Compare Properties
        </h1>
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground font-bold bg-card px-4 py-2 rounded-lg shadow-sm border border-border transition"
        >
          <ChevronLeft size={20} /> Back to Map
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-3xl border border-dashed border-border">
          <LayoutDashboard size={48} className="mx-auto opacity-30 mb-4" />
          <h3 className="text-xl font-bold text-card-foreground">
            No properties selected
          </h3>
          <p className="text-muted-foreground mt-2">
            Go back to the map and add up to 3 properties to compare.
          </p>
          <button
            onClick={onBack}
            className="mt-6 bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-bold hover:bg-primary/90 transition shadow-lg"
          >
            Browse Properties
          </button>
        </div>
      ) : (
        <div className="bg-card rounded-2xl shadow-soft border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <colgroup>
                <col style={{ width: "180px" }} />
                {items.map((_, i) => (
                  <col key={i} />
                ))}
              </colgroup>

              {/* Property header row */}
              <thead>
                <tr>
                  <th className="p-5 bg-muted border-b border-r border-border text-muted-foreground font-bold uppercase tracking-wider text-xs">
                    Feature
                  </th>
                  {items.map((item) => (
                    <th
                      key={item.id}
                      className="p-5 bg-card border-b border-r border-border last:border-r-0 relative group"
                    >
                      <button
                        onClick={() => onRemoveFromCompare(item.id)}
                        className="absolute top-2 right-2 text-muted-foreground hover:text-destructive p-1 opacity-0 group-hover:opacity-100 transition"
                        title="Remove from compare"
                      >
                        <XCircle size={18} />
                      </button>
                      <img
                        src={item.images[0]}
                        alt={item.title}
                        className="h-36 w-full object-cover rounded-xl mb-3 shadow-sm"
                      />
                      <h3 className="font-bold text-card-foreground text-base leading-snug mb-1">
                        {item.title}
                      </h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${
                          TYPE_COLORS[item.type]
                        }`}
                      >
                        {item.type}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {/* Price */}
                <tr className="border-b border-border">
                  <td className="p-4 bg-muted border-r border-border font-semibold text-muted-foreground text-sm">
                    Price
                  </td>
                  {items.map((item) => (
                    <td
                      key={item.id}
                      className="p-4 border-r border-border last:border-r-0"
                    >
                      <div className="flex flex-col gap-1">
                        <span
                          className={`text-xl font-bold ${
                            isBest(item.price, bestPrice)
                              ? "text-green-600"
                              : "text-primary"
                          }`}
                        >
                          {formatIndianPrice(item.price)}
                        </span>
                        {isBest(item.price, bestPrice) && (
                          <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
                            <TrendingDown size={12} /> Lowest price
                          </span>
                        )}
                        {/* Visual price bar */}
                        <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary/40 rounded-full transition-all"
                            style={{
                              width: `${(item.price / maxPrice) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Area */}
                <tr className="border-b border-border">
                  <td className="p-4 bg-muted border-r border-border font-semibold text-muted-foreground text-sm">
                    Area
                  </td>
                  {items.map((item) => (
                    <td
                      key={item.id}
                      className="p-4 border-r border-border last:border-r-0"
                    >
                      <span
                        className={`font-bold ${
                          isBest(item.area, bestArea)
                            ? "text-green-600"
                            : "text-card-foreground"
                        }`}
                      >
                        {item.area.toLocaleString("en-IN")} sq ft
                      </span>
                      {isBest(item.area, bestArea) && (
                        <p className="text-xs text-green-600 font-semibold mt-0.5">
                          Largest plot
                        </p>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Price per sq ft — most important metric */}
                <tr className="border-b border-border bg-primary/5">
                  <td className="p-4 bg-primary/10 border-r border-border font-semibold text-primary text-sm">
                    ₹ / sq ft
                  </td>
                  {items.map((item) => {
                    const ppsf = pricePerSqFt(item);
                    return (
                      <td
                        key={item.id}
                        className="p-4 border-r border-border last:border-r-0"
                      >
                        <span
                          className={`font-bold text-lg ${
                            isBest(ppsf, bestPpsf)
                              ? "text-green-600"
                              : "text-secondary"
                          }`}
                        >
                          ₹{ppsf.toLocaleString("en-IN")}
                        </span>
                        {isBest(ppsf, bestPpsf) && (
                          <p className="text-xs text-green-600 font-semibold mt-0.5">
                            Best value
                          </p>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* Status */}
                <tr className="border-b border-border">
                  <td className="p-4 bg-muted border-r border-border font-semibold text-muted-foreground text-sm">
                    Status
                  </td>
                  {items.map((item) => (
                    <td
                      key={item.id}
                      className="p-4 border-r border-border last:border-r-0"
                    >
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                          item.status === "verified"
                            ? "bg-green-100 text-green-700"
                            : item.status === "rejected"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {item.status === "verified" && (
                          <ShieldCheck size={12} />
                        )}
                        {item.status}
                      </span>
                    </td>
                  ))}
                </tr>

                {/* Listed age */}
                <tr className="border-b border-border">
                  <td className="p-4 bg-muted border-r border-border font-semibold text-muted-foreground text-sm">
                    Listed
                  </td>
                  {items.map((item) => (
                    <td
                      key={item.id}
                      className="p-4 border-r border-border last:border-r-0 text-sm text-muted-foreground"
                    >
                      {listingAge(item.createdAt) || "—"}
                    </td>
                  ))}
                </tr>

                {/* Description preview */}
                <tr className="border-b border-border">
                  <td className="p-4 bg-muted border-r border-border font-semibold text-muted-foreground text-sm align-top">
                    Description
                  </td>
                  {items.map((item) => (
                    <td
                      key={item.id}
                      className="p-4 border-r border-border last:border-r-0 text-sm text-muted-foreground"
                    >
                      <p className="line-clamp-3 leading-relaxed">
                        {item.description || "No description provided."}
                      </p>
                    </td>
                  ))}
                </tr>

                {/* Actions */}
                <tr>
                  <td className="p-4 bg-muted border-r border-border font-semibold text-muted-foreground text-sm">
                    Actions
                  </td>
                  {items.map((item) => (
                    <td
                      key={item.id}
                      className="p-4 border-r border-border last:border-r-0"
                    >
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => onViewDetail(item)}
                          className="w-full bg-primary text-primary-foreground font-bold py-2.5 rounded-xl hover:bg-primary/90 transition shadow-sm text-sm"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => onOpenMap(item)}
                          className="w-full bg-card border border-border text-foreground font-semibold py-2.5 rounded-xl hover:bg-muted transition text-sm flex items-center justify-center gap-1.5"
                        >
                          <MapPin size={14} /> Show on Map
                        </button>
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
