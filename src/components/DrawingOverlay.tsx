import * as React from "react";
import { Pentagon, Undo, Redo, Check, HelpCircle, Ruler } from "lucide-react";
import { LengthUnit, LENGTH_UNITS, calculatePerimeterMeters, formatEdgeLength } from "@/lib/geo";

interface DrawingOverlayProps {
  pointCount: number;
  boundaryPoints?: { lat: number; lng: number }[];
  lengthUnit: LengthUnit;
  onUnitChange: (unit: LengthUnit) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onDone: () => void;
}

export function DrawingOverlay({
  pointCount,
  boundaryPoints = [],
  lengthUnit,
  onUnitChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onDone,
}: DrawingOverlayProps) {
  const [showHelp, setShowHelp] = React.useState(pointCount === 0);

  // Auto-hide help after 3 clicks
  React.useEffect(() => {
    if (pointCount >= 3) setShowHelp(false);
  }, [pointCount]);

  const perimeterMeters = React.useMemo(
    () => calculatePerimeterMeters(boundaryPoints),
    [boundaryPoints]
  );
  const formattedPerimeter = formatEdgeLength(perimeterMeters, lengthUnit);

  return (
    <>
      {/* Instruction banner */}
      {showHelp && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[500] bg-card border border-border rounded-2xl shadow-xl p-4 max-w-sm w-[calc(100%-2rem)] animate-fade-in">
          <div className="flex items-start gap-3">
            <Pentagon size={20} className="text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-card-foreground mb-1">
                Drawing boundary with edge lengths
              </p>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Click on the map to add boundary points</li>
                <li>Edge lengths of each boundary edge will display live on the map</li>
                <li>Switch length units (m, ft, yd, km, mi) using the toolbar controls</li>
                <li>Press <strong>Done</strong> when finished</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Floating controls bar */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[400] flex flex-wrap gap-2 items-center bg-card p-2 rounded-2xl shadow-xl border border-border max-w-[95vw]">
        {/* Point count badge */}
        <div className="bg-primary text-primary-foreground px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5">
          <Pentagon size={14} />
          {pointCount === 0
            ? "Click map to start"
            : `${pointCount} point${pointCount === 1 ? "" : "s"}`}
        </div>

        {/* Total Perimeter Badge */}
        {pointCount >= 2 && (
          <div className="bg-muted text-foreground px-3 py-1.5 rounded-xl font-semibold text-xs flex items-center gap-1.5 border border-border">
            <Ruler size={13} className="text-primary" />
            <span>Perimeter: <strong>{formattedPerimeter}</strong></span>
          </div>
        )}

        {/* Unit Selector */}
        <div className="flex items-center bg-muted p-0.5 rounded-lg border border-border">
          {LENGTH_UNITS.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => onUnitChange(u.id)}
              className={`px-2 py-1 rounded text-xs font-bold transition select-none ${
                lengthUnit === u.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title={u.label}
            >
              {u.symbol}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-border mx-0.5 hidden sm:block" />

        {/* Undo */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo last point"
          className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 text-muted-foreground transition shadow-sm"
        >
          <Undo size={16} />
        </button>

        {/* Redo */}
        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo"
          className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 text-muted-foreground transition shadow-sm"
        >
          <Redo size={16} />
        </button>

        {/* Help toggle */}
        <button
          onClick={() => setShowHelp((v) => !v)}
          title="Show instructions"
          className={`p-1.5 rounded-lg transition ${
            showHelp
              ? "bg-primary/10 text-primary"
              : "hover:bg-muted text-muted-foreground"
          }`}
        >
          <HelpCircle size={16} />
        </button>

        {/* Done */}
        <button
          onClick={onDone}
          className="bg-foreground text-background px-3.5 py-1.5 rounded-xl font-bold hover:bg-foreground/90 text-xs transition shadow-md flex items-center gap-1.5 ml-auto"
        >
          <Check size={14} /> Done
        </button>
      </div>
    </>
  );
}
