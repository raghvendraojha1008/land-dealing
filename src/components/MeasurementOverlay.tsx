import * as React from "react";
import { Ruler, Undo2, Redo2, RotateCcw, Check, X } from "lucide-react";
import { LengthUnit, calculatePolylineLengthMeters, formatEdgeLength } from "@/lib/geo";
import { UnitSwitcher } from "@/components/UnitSwitcher";

interface MeasurementOverlayProps {
  pointCount: number;
  measurePoints: { lat: number; lng: number }[];
  lengthUnit: LengthUnit;
  onUnitChange?: (unit: LengthUnit) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
  onDone: () => void;
}

export function MeasurementOverlay({
  pointCount,
  measurePoints,
  lengthUnit,
  onUnitChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onReset,
  onDone,
}: MeasurementOverlayProps) {
  const totalMeters = calculatePolylineLengthMeters(measurePoints);
  const totalFormatted = formatEdgeLength(totalMeters, lengthUnit);

  return (
    <>
      {/* ── Top Header Instruction Banner (anchored at top center) ── */}
      <div className="absolute top-3 sm:top-4 left-1/2 -translate-x-1/2 z-[600] w-full max-w-md sm:max-w-lg px-3 select-none pointer-events-none animate-fade-in">
        <div className="bg-card/95 backdrop-blur-md text-card-foreground border border-amber-500/40 p-3 rounded-2xl shadow-2xl flex items-center justify-between gap-3 pointer-events-auto">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center flex-shrink-0">
              <Ruler size={18} />
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-xs sm:text-sm text-card-foreground flex items-center gap-1.5">
                Length & Distance Measuring
                <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700">
                  ACTIVE
                </span>
              </h4>
              <p className="text-[11px] sm:text-xs text-muted-foreground truncate mt-0.5">
                {pointCount === 0 && "Click map to set starting point"}
                {pointCount === 1 && "Click a second point on the map to measure line"}
                {pointCount >= 2 && (
                  <span className="text-amber-600 font-bold">
                    Total: {totalFormatted} ({pointCount} points connected · Drag to adjust)
                  </span>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={onDone}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
            title="Exit measurement mode"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* ── Bottom Floating Controls Toolbar ── */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[500] flex items-center gap-2 bg-card/95 backdrop-blur-md text-card-foreground border border-border p-2 rounded-2xl shadow-2xl select-none max-w-[calc(100%-2rem)] flex-wrap justify-center">
        {/* Undo */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-border transition min-h-[40px] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-muted"
          title="Undo last point"
        >
          <Undo2 size={15} />
          <span>Undo</span>
        </button>

        {/* Redo */}
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-border transition min-h-[40px] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-muted"
          title="Redo point"
        >
          <Redo2 size={15} />
          <span>Redo</span>
        </button>

        {/* Reset */}
        <button
          onClick={onReset}
          disabled={pointCount === 0}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-destructive/20 text-destructive bg-destructive/5 transition min-h-[40px] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-destructive/10"
          title="Clear all points"
        >
          <RotateCcw size={15} />
          <span>Reset</span>
        </button>

        {/* Unit switcher */}
        {onUnitChange && (
          <div className="border-l border-border pl-2">
            <UnitSwitcher currentUnit={lengthUnit} onUnitChange={onUnitChange} variant="compact" />
          </div>
        )}

        {/* Done / Exit */}
        <button
          onClick={onDone}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl text-xs transition shadow-sm min-h-[40px] hover:bg-primary/90 ml-1"
        >
          <Check size={16} />
          <span>Done</span>
        </button>
      </div>
    </>
  );
}
