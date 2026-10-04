import { MapPin, LayoutDashboard, Map, Save, Shield } from "lucide-react";
import { ViewType } from "@/types";

interface NavbarProps {
  userName: string;
  view: ViewType;
  isSaving: boolean;
  isAdmin: boolean;
  isLoggedIn: boolean;
  onLogoClick: () => void;
  onDashboardClick: () => void;
}

export function Navbar({
  userName,
  view,
  isSaving,
  isAdmin,
  isLoggedIn,
  onLogoClick,
  onDashboardClick,
}: NavbarProps) {
  return (
    <nav className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border h-14 sm:h-16 px-3 sm:px-6 flex items-center justify-between shadow-sm select-none">
      <div
        className="flex items-center gap-2 text-primary font-bold text-lg sm:text-xl cursor-pointer hover:text-primary/80 transition"
        onClick={onLogoClick}
      >
        <MapPin className="fill-current w-5 h-5 sm:w-6 sm:h-6" /> TerraMap
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {isSaving && (
          <span className="text-xs font-bold text-muted-foreground animate-pulse items-center gap-1 hidden sm:flex">
            <Save size={12} /> Saving...
          </span>
        )}

        {isAdmin && (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            <Shield size={12} /> Admin
          </span>
        )}

        {view === "dashboard" ? (
          <button
            onClick={onLogoClick}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm min-h-[38px]"
          >
            <Map size={16} />
            <span>View Map</span>
          </button>
        ) : (
          <button
            onClick={onDashboardClick}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold bg-muted border border-border text-foreground hover:bg-muted/80 transition shadow-sm min-h-[38px]"
          >
            <LayoutDashboard size={16} />
            <span>Dashboard</span>
          </button>
        )}
      </div>
    </nav>
  );
}
