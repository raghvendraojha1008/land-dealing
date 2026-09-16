import * as React from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";

export interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: <Trash2 className="text-destructive" size={24} />,
      iconBg: "bg-destructive/10",
      confirmBtn: "bg-destructive hover:bg-destructive/90 text-destructive-foreground",
    },
    warning: {
      icon: <AlertTriangle className="text-yellow-500" size={24} />,
      iconBg: "bg-yellow-500/10",
      confirmBtn: "bg-yellow-500 hover:bg-yellow-600 text-white",
    },
    info: {
      icon: <AlertTriangle className="text-primary" size={24} />,
      iconBg: "bg-primary/10",
      confirmBtn: "bg-primary hover:bg-primary/90 text-primary-foreground",
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative bg-card rounded-2xl shadow-2xl border border-border w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition"
        >
          <X size={20} />
        </button>

        <div className="p-6">
          {/* Icon */}
          <div className={`w-12 h-12 rounded-full ${styles.iconBg} flex items-center justify-center mx-auto mb-4`}>
            {styles.icon}
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold text-center text-card-foreground mb-2">
            {title}
          </h3>

          {/* Message */}
          <p className="text-muted-foreground text-center text-sm mb-6">
            {message}
          </p>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 px-4 rounded-xl font-semibold bg-muted text-muted-foreground hover:bg-muted/80 transition"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 py-2.5 px-4 rounded-xl font-semibold transition shadow-lg ${styles.confirmBtn}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
