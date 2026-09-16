import { MapPin, LayoutDashboard, Save, Eye, EyeOff, User, Shield, Settings } from "lucide-react";
import { ViewType } from "@/types";
import { AppRole } from "@/hooks/useAuth";

export type UserMode = "user" | "admin";

interface NavbarProps {
  userMode: UserMode;
  userName: string;
  view: ViewType;
  isSaving: boolean;
  showControls: boolean;
  isAdmin: boolean;
  isLoggedIn: boolean;
  onLogoClick: () => void;
  onModeChange: (mode: UserMode) => void;
  onDashboardClick: () => void;
  onToggleControls: () => void;
  onProfileClick: () => void;
}

export function Navbar({
  userMode,
  userName,
  view,
  isSaving,
  showControls,
  isAdmin,
  isLoggedIn,
  onLogoClick,
  onModeChange,
  onDashboardClick,
  onToggleControls,
  onProfileClick,
}: NavbarProps) {
  return (
    <nav className="sticky top-0 z-50 bg-card/90 backdrop-blur-md border-b border-border h-16 px-6 flex items-center justify-between shadow-sm">
      <div
        className="flex items-center gap-2 text-primary font-bold text-xl cursor-pointer hover:text-primary/80 transition"
        onClick={onLogoClick}
      >
        <MapPin className="fill-current" /> TerraMap
      </div>
      <div className="flex items-center gap-3">
        {isSaving && (
          <span className="text-xs font-bold text-muted-foreground animate-pulse flex items-center gap-1">
            <Save size={12} /> Saving...
          </span>
        )}
        <button
          onClick={onToggleControls}
          className="p-2 rounded-lg hover:bg-muted transition text-muted-foreground hover:text-foreground"
          title={showControls ? "Hide controls" : "Show controls"}
        >
          {showControls ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
        
        {/* Mode Selector - Only show Admin option if user is admin */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          <button
            onClick={() => onModeChange("user")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition ${
              userMode === "user"
                ? "bg-card text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <User size={16} /> User
          </button>
          {isAdmin && (
            <button
              onClick={() => onModeChange("admin")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition ${
                userMode === "admin"
                  ? "bg-card text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Shield size={16} /> Admin
            </button>
          )}
        </div>

        <button
          onClick={onDashboardClick}
          className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg transition font-medium ${
            view === "dashboard"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <LayoutDashboard size={18} />
          <span className="text-xs sm:text-sm">Dashboard</span>
        </button>

        {/* Profile Button */}
        {isLoggedIn && (
          <button
            onClick={onProfileClick}
            className="p-2 rounded-lg hover:bg-muted transition text-muted-foreground hover:text-foreground"
            title="Profile Settings"
          >
            <Settings size={18} />
          </button>
        )}
      </div>
    </nav>
  );
}
