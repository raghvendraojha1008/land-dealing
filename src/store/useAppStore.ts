/**
 * useAppStore — single source of truth for all cross-cutting UI state.
 *
 * Previously App.tsx maintained its own parallel useState copies of view,
 * userMode, selectedListing, compareList, and notification. This store
 * supersedes all of them so any component can read/write without prop-drilling.
 */
import { create } from "zustand";
import { UserMode } from "@/components/Navbar";
import { DashboardTab } from "@/components/DashboardTabs";
import { ViewType, Listing, ToastNotification, NotificationType } from "@/types";

interface AppState {
  // ── Navigation ───────────────────────────────────────────────────────────
  view: ViewType;
  userMode: UserMode;
  dashboardTab: DashboardTab;

  // ── Selection ────────────────────────────────────────────────────────────
  selectedListing: Listing | null;
  detailListing: Listing | null;
  compareList: string[];

  // ── Map editing ──────────────────────────────────────────────────────────
  isPickingLocation: boolean;
  isDrawing: boolean;
  showControls: boolean;

  // ── Notifications (queue so they don't stomp each other) ─────────────────
  toasts: ToastNotification[];

  // ── Actions ──────────────────────────────────────────────────────────────
  setView: (view: ViewType) => void;
  setUserMode: (mode: UserMode) => void;
  setDashboardTab: (tab: DashboardTab) => void;

  setSelectedListing: (listing: Listing | null) => void;
  setDetailListing: (listing: Listing | null) => void;

  toggleCompare: (id: string) => void;
  clearCompare: () => void;

  setIsPickingLocation: (v: boolean) => void;
  setIsDrawing: (v: boolean) => void;
  toggleControls: () => void;

  showNotification: (message: string, type?: NotificationType) => void;
  dismissToast: (id: string) => void;

  /** Convenience: go to map, clear drawing modes */
  goToMap: () => void;
  /** Convenience: go to dashboard */
  goToDashboard: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  view: "map",
  userMode: "user",
  dashboardTab: "buyer",
  selectedListing: null,
  detailListing: null,
  compareList: [],
  isPickingLocation: false,
  isDrawing: false,
  showControls: true,
  toasts: [],

  setView: (view) => set({ view }),

  setUserMode: (userMode) =>
    set({ userMode, dashboardTab: "buyer" }), // reset tab on mode change

  setDashboardTab: (dashboardTab) => set({ dashboardTab }),

  setSelectedListing: (selectedListing) => set({ selectedListing }),

  setDetailListing: (detailListing) =>
    set({ detailListing, view: detailListing ? "listing-detail" : get().view }),

  toggleCompare: (id) =>
    set((state) => {
      if (state.compareList.includes(id)) {
        return { compareList: state.compareList.filter((i) => i !== id) };
      }
      if (state.compareList.length >= 3) {
        // Fire a notification rather than silently ignoring
        const toast: ToastNotification = {
          id: crypto.randomUUID(),
          message: "You can compare up to 3 properties at a time.",
          type: "warning",
        };
        setTimeout(() => get().dismissToast(toast.id), 3500);
        return { toasts: [...state.toasts, toast] };
      }
      return { compareList: [...state.compareList, id] };
    }),

  clearCompare: () => set({ compareList: [] }),

  setIsPickingLocation: (isPickingLocation) => set({ isPickingLocation }),
  setIsDrawing: (isDrawing) => set({ isDrawing }),
  toggleControls: () => set((s) => ({ showControls: !s.showControls })),

  showNotification: (message, type = "success") => {
    const id = crypto.randomUUID();
    const toast: ToastNotification = { id, message, type };
    set((s) => ({ toasts: [...s.toasts, toast] }));
    setTimeout(() => get().dismissToast(id), 3500);
  },

  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  goToMap: () =>
    set({ view: "map", isPickingLocation: false, isDrawing: false }),

  goToDashboard: () =>
    set({ view: "dashboard", isPickingLocation: false, isDrawing: false }),
}));
