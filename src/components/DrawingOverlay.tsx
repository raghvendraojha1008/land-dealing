/**
 * DrawingOverlay — contextual help shown when isDrawing=true.
 *
 * Solves the "user has no idea what to do" UX problem identified in the review.
 */
import * as React from "react";
import { Pentagon, Undo, Redo, Check, HelpCircle } from "lucide-react";

interface DrawingOverlayProps {
  pointCount: number;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onDone: () => void;
}

export function DrawingOverlay({
  pointCount,
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

  return (
    <>
      {/* Instruction banner */}
      {showHelp && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[500] bg-card border border-border rounded-2xl shadow-xl p-4 max-w-sm w-[calc(100%-2rem)] animate-fade-in">
          <div className="flex items-start gap-3">
            <Pentagon size={20} className="text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-card-foreground mb-1">
                Drawing boundary
              </p>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Click on the map to add boundary points</li>
                <li>Add at least 3 points to form a shape</li>
                <li>The shape closes automatically</li>
                <li>Press <strong>Done</strong> when finished</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Floating controls bar */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[400] flex gap-1.5 items-center bg-card p-1.5 rounded-full shadow-xl border border-border">
        {/* Point count */}
        <div className="bg-primary text-primary-foreground px-3.5 py-2 rounded-full font-bold text-sm flex items-center gap-2">
          <Pentagon size={14} />
          {pointCount === 0
            ? "Click map to start"
            : `${pointCount} point${pointCount === 1 ? "" : "s"}`}
        </div>

        {/* Undo */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo last point"
          className="p-2 rounded-full hover:bg-muted disabled:opacity-30 text-muted-foreground transition"
        >
          <Undo size={18} />
        </button>

        {/* Redo */}
        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo"
          className="p-2 rounded-full hover:bg-muted disabled:opacity-30 text-muted-foreground transition"
        >
          <Redo size={18} />
        </button>

        {/* Help toggle */}
        <button
          onClick={() => setShowHelp((v) => !v)}
          title="Show instructions"
          className={`p-2 rounded-full transition ${
            showHelp
              ? "bg-primary/10 text-primary"
              : "hover:bg-muted text-muted-foreground"
          }`}
        >
          <HelpCircle size={18} />
        </button>

        {/* Done */}
        <button
          onClick={onDone}
          className="bg-foreground text-background px-4 py-2 rounded-full font-bold hover:bg-foreground/90 text-sm transition shadow-md flex items-center gap-1.5"
        >
          <Check size={14} /> Done
        </button>
      </div>
    </>
  );
}
