import * as React from "react";
import { ShoppingCart, Store, Shield, MessageSquare } from "lucide-react";

export type DashboardTab = "buyer" | "seller" | "admin" | "messages";

interface DashboardTabsProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  showAdminTab: boolean;
  unreadCount?: number;
}

export function DashboardTabs({
  activeTab,
  onTabChange,
  showAdminTab,
  unreadCount = 0,
}: DashboardTabsProps) {
  const tabs = [
    { id: "buyer" as const, label: "Buyer", icon: ShoppingCart },
    { id: "seller" as const, label: "Seller", icon: Store },
    { id: "messages" as const, label: "Messages", icon: MessageSquare, badge: unreadCount },
    ...(showAdminTab
      ? [{ id: "admin" as const, label: "Admin", icon: Shield }]
      : []),
  ];

  return (
    <div className="flex gap-2 p-1 bg-muted rounded-xl border border-border mb-6">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        const badge = "badge" in tab ? tab.badge : 0;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition relative ${
              isActive
                ? "bg-card text-primary shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <Icon size={18} />
            {tab.label}
            {badge > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {badge > 9 ? "9+" : badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
