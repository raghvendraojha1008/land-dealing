import { ReactNode } from "react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  color: string;
}

export function StatsCard({ title, value, icon, color }: StatsCardProps) {
  return (
    <div className="bg-card rounded-xl shadow-soft p-5 border border-border flex items-center gap-4 transition-transform hover:-translate-y-1">
      <div className={`p-3 rounded-lg ${color} text-white`}>{icon}</div>
      <div>
        <div className="text-muted-foreground text-sm font-medium">{title}</div>
        <div className="text-2xl font-bold text-card-foreground">{value}</div>
      </div>
    </div>
  );
}
