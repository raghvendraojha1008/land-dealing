/**
 * ToastStack — renders all queued notifications from useAppStore.
 *
 * Replaces the single `notification` state in App.tsx.
 * Each toast is typed (success / error / warning / info) and auto-dismisses.
 */
import * as React from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { NotificationType } from "@/types";

const CONFIG: Record<
  NotificationType,
  { icon: React.ReactNode; classes: string }
> = {
  success: {
    icon: <CheckCircle size={18} className="text-green-400 flex-shrink-0" />,
    classes:
      "bg-foreground/95 text-background border-green-500/30",
  },
  error: {
    icon: <XCircle size={18} className="text-red-400 flex-shrink-0" />,
    classes:
      "bg-foreground/95 text-background border-red-500/30",
  },
  warning: {
    icon: <AlertTriangle size={18} className="text-amber-400 flex-shrink-0" />,
    classes:
      "bg-foreground/95 text-background border-amber-500/30",
  },
  info: {
    icon: <Info size={18} className="text-blue-400 flex-shrink-0" />,
    classes:
      "bg-foreground/95 text-background border-blue-500/30",
  },
};

export function ToastStack() {
  const { toasts, dismissToast } = useAppStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-24 right-4 z-[700] flex flex-col gap-2 max-w-xs w-full pointer-events-none">
      {toasts.map((toast) => {
        const { icon, classes } = CONFIG[toast.type];
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl shadow-2xl border backdrop-blur-sm animate-fade-in font-medium text-sm ${classes}`}
          >
            {icon}
            <span className="flex-1 leading-snug">{toast.message}</span>
            <button
              onClick={() => dismissToast(toast.id)}
              className="opacity-60 hover:opacity-100 transition mt-0.5"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
