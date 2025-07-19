import { useState } from "react";
import { Search, Star, AlertCircle, BarChart3, TrendingUp, Wallet, Settings, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const chains = [
  { name: "Solana", icon: "◎", color: "text-purple-400" },
  { name: "Ethereum", icon: "⟡", color: "text-blue-400" },
  { name: "Base", icon: "🔵", color: "text-blue-500" },
  { name: "BSC", icon: "🟡", color: "text-yellow-500" },
  { name: "PulseChain", icon: "💗", color: "text-pink-400" },
  { name: "Abstract", icon: "⬟", color: "text-orange-400" },
  { name: "Avalanche", icon: "🔺", color: "text-red-400" },
  { name: "Polygon", icon: "🟣", color: "text-purple-500" },
  { name: "Arbitrum", icon: "🔷", color: "text-blue-600" },
  { name: "HyperEVM", icon: "⚡", color: "text-cyan-400" },
];

const menuItems = [
  { icon: Star, label: "Watchlist", active: false },
  { icon: AlertCircle, label: "Alerts", active: false },
  { icon: BarChart3, label: "Multicharts", active: false },
  { icon: TrendingUp, label: "New Pairs", active: false },
  { icon: Zap, label: "Gainers & Losers", active: false },
  { icon: Wallet, label: "Portfolio", active: false },
  { icon: Settings, label: "Advertise", active: false },
];

export function Sidebar() {
  const [selectedChain, setSelectedChain] = useState("Solana");

  return (
    <div className="w-64 h-screen bg-background border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-purple-600 rounded-lg flex items-center justify-center">
            <Search className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-bold text-foreground">DEXSCREENER</span>
        </div>
      </div>

      {/* Menu Items */}
      <div className="p-4 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.label}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm transition-colors",
              "hover:bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </button>
        ))}
      </div>

      {/* Chains */}
      <div className="flex-1 p-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Chains</h3>
        <div className="space-y-1">
          {chains.map((chain) => (
            <button
              key={chain.name}
              onClick={() => setSelectedChain(chain.name)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm transition-colors",
                selectedChain === chain.name
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <span className={cn("text-base", chain.color)}>{chain.icon}</span>
              {chain.name}
            </button>
          ))}
        </div>
      </div>

      {/* Get the App */}
      <div className="p-4 border-t border-border">
        <button className="w-full flex items-center gap-2 px-3 py-2 bg-muted rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors">
          <span>📱</span>
          Get the App!
          <span className="ml-auto">🍎 🤖</span>
        </button>
      </div>
    </div>
  );
}