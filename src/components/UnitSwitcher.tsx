import * as React from "react";
import { Ruler } from "lucide-react";
import { LengthUnit, LENGTH_UNITS } from "@/lib/geo";

interface UnitSwitcherProps {
  currentUnit: LengthUnit;
  onUnitChange: (unit: LengthUnit) => void;
  className?: string;
  variant?: "pill" | "compact" | "full";
}

export function UnitSwitcher({
  currentUnit,
  onUnitChange,
  className = "",
  variant = "pill",
}: UnitSwitcherProps) {
  if (variant === "compact") {
    return (
      <div className={`flex items-center gap-1 bg-card/90 backdrop-blur-sm border border-border p-1 rounded-full shadow-md ${className}`}>
        <span className="text-[11px] font-bold text-muted-foreground px-2 flex items-center gap-1 select-none">
          <Ruler size={12} className="text-primary" /> Unit:
        </span>
        {LENGTH_UNITS.map((u) => (
          <button
            key={u.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onUnitChange(u.id);
            }}
            className={`px-2 py-0.5 rounded-full text-xs font-bold transition select-none ${
              currentUnit === u.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
            title={u.label}
          >
            {u.symbol}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 bg-card border border-border p-1.5 rounded-xl shadow-lg ${className}`}>
      <span className="text-xs font-bold text-card-foreground px-2 flex items-center gap-1.5 select-none">
        <Ruler size={14} className="text-primary" /> Unit
      </span>
      <div className="flex bg-muted p-0.5 rounded-lg border border-border">
        {LENGTH_UNITS.map((u) => (
          <button
            key={u.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onUnitChange(u.id);
            }}
            className={`px-2.5 py-1 rounded-md text-xs font-bold transition select-none ${
              currentUnit === u.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            }`}
            title={u.label}
          >
            {u.symbol}
          </button>
        ))}
      </div>
    </div>
  );
}
