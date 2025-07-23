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
  X,
  Heart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation, useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { pay } from "@base-org/account";
import { RainbowButton } from "./magicui/rainbow-button";

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

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [donateLoading, setDonateLoading] = useState(false);
  const [donateMessage, setDonateMessage] = useState<string | null>(null);

  const menuItems = [
    // { icon: Star, label: "Collections", active: false },
    // { icon: AlertCircle, label: "New Mints", active: false },
    // { icon: Zap, label: "Trending", path: "/trending" },
    { icon: TrendingUp, label: "Live Activity", path: "/" },
    { icon: Users, label: "Creators", path: "/creators" },
    { icon: BarChart3, label: "Whale Tracker", path: "/whale-tracker" },
    // { icon: BarChart3, label: "Top Creators", active: false },
    // { icon: Wallet, label: "Portfolio", active: false },
    // { icon: Settings, label: "Advertise", active: false },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile && onClose) {
      onClose();
    }
  };

  const handleDonate = async () => {
    setDonateLoading(true);
    setDonateMessage(null);
    try {
      const result = await pay({
        amount: "5.00",
        to: "0x1B958A48373109E9146A950a75F5bD25B845143b", // Replace with your address
        testnet: false,
      });
      if ("error" in result) {
        setDonateMessage("Payment failed: " + result.error);
      } else {
        setDonateMessage(
          "Thank you for your donation! Payment ID: " + result.id
        );
      }
    } catch (err: unknown) {
      setDonateMessage(
        "Payment error: " +
          (typeof err === "string"
            ? err
            : err instanceof Error
            ? err.message
            : "Unknown error")
      );
    } finally {
      setDonateLoading(false);
    }
  };

  return (
    <div className="h-full bg-background border-r border-border flex flex-col">
      {/* Header with Logo and Close Button */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-purple-600 rounded-lg flex items-center justify-center">
            <Search className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg sm:text-xl font-bold text-foreground">
            BASE SCREENER
          </span>
        </div>
        {isMobile && onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Menu Items */}
      <div className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.label}
              onClick={() => handleNavigation(item.path)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Footer with Donate Button */}
      <div className="p-4 border-t border-border space-y-3">
        <div className="w-full">
          <RainbowButton
            className="w-full justify-center py-5 text-black dark:text-black"
            onClick={handleDonate}
            disabled={donateLoading}
          >
            <Heart className="w-4 h-4 text-black dark:text-black" />
            {donateLoading ? "Processing..." : "Donate"}
          </RainbowButton>
        </div>

        {/* Donate Message */}
        {donateMessage && (
          <div className="text-xs text-muted-foreground text-center p-2 bg-muted rounded-md">
            {donateMessage}
          </div>
        )}

        {/* Version */}
        {/* <div className="text-xs text-muted-foreground text-center">v1.0.0</div> */}
      </div>
    </div>
  );
}
