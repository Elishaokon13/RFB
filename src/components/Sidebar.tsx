import { useState } from "react";
import {
  Search,
  Star,
  AlertCircle,
  BarChart3,
  TrendingUp,
  Wallet,
  Settings,
  Zap,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation, useNavigate } from "react-router-dom";

const chains = [
  // { name: "Solana", icon: "◎", color: "text-purple-400" },
  // { name: "Ethereum", icon: "⟡", color: "text-blue-400" },
  // { name: "Base", icon: "🔵", color: "text-blue-500" },
  // { name: "BSC", icon: "🟡", color: "text-yellow-500" },
  // { name: "PulseChain", icon: "💗", color: "text-pink-400" },
  // { name: "Abstract", icon: "⬟", color: "text-orange-400" },
  // { name: "Avalanche", icon: "🔺", color: "text-red-400" },
  // { name: "Polygon", icon: "🟣", color: "text-purple-500" },
  // { name: "Arbitrum", icon: "🔷", color: "text-blue-600" },
  // { name: "HyperEVM", icon: "⚡", color: "text-cyan-400" },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    // { icon: Star, label: "Collections", active: false },
    // { icon: AlertCircle, label: "New Mints", active: false },
    { icon: TrendingUp, label: "Live Activity", path: "/" },
    { icon: Zap, label: "Trending", path: "/trending" },
    { icon: Users, label: "Creators", path: "/creators" },
    { icon: BarChart3, label: "Whale Tracker", path: "/whale-tracker" },
    // { icon: BarChart3, label: "Top Creators", active: false },
    // { icon: Wallet, label: "Portfolio", active: false },
    // { icon: Settings, label: "Advertise", active: false },
  ];

  return (
    <div className="w-64 h-screen bg-background border-r border-border flex flex-col sticky top-0">
      {/* Logo */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-purple-600 rounded-lg flex items-center justify-center">
            <Search className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-bold text-foreground">
            BASE SCREENER
          </span>
        </div>
      </div>

      {/* Menu Items */}
      <div className="p-4 space-y-2">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
