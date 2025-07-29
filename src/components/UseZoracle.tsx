import { useTokenDetails } from "@/hooks/useTokenDetails";
// import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/utils";
import {
  Coins,
  TrendingUp,
  Users,
  Wallet,
  DollarSign,
  LineChart,
} from "lucide-react";

export default function UseZoracle({
  tokenAddress = "0x907bdae00e91544a270694714832410ad8418888",
}) {
  const {
    data: token,
    isLoading,
    error,
    refetch,
  } = useTokenDetails(tokenAddress);

  // Group token stats for cleaner rendering
  const tokenStats = [
    {
      icon: <Coins className="w-3 h-3" />,
      label: "Name",
      value: token?.name,
      skeleton: 80,
    },
    {
      icon: <Wallet className="w-3 h-3" />,
      label: "Supply",
      value: token?.totalSupply && formatNumber(Number(token.totalSupply)),
      skeleton: 60,
    },
    {
      icon: <TrendingUp className="w-3 h-3" />,
      label: "Volume",
      value: token?.totalVolume && formatNumber(Number(token.totalVolume)),
      skeleton: 70,
    },
    {
      icon: <LineChart className="w-3 h-3" />,
      label: "Vol. 24h",
      value: token?.volume24h && formatNumber(Number(token.volume24h)),
      skeleton: 65,
    },
    {
      icon: <Users className="w-3 h-3" />,
      label: "Holders",
      value: token?.uniqueHolders && formatNumber(Number(token.uniqueHolders)),
      skeleton: 50,
    },
    {
      icon: <DollarSign className="w-3 h-3" />,
      label: "Price",
      value:
        token?.tokenPrice?.priceInUsdc &&
        `$${parseFloat(token.tokenPrice.priceInUsdc).toFixed(6)}`,
      skeleton: 75,
    },
  ];

  if (error) {
    return (
      <div className="w-full p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-md text-xs flex items-center gap-2">
        <span className="font-medium">Error loading token data:</span>
        {error.message || "Failed to fetch token details"}
      </div>
    );
  }

  return (
    <div className="w-full px-3 py-3 bg-card border-b border-b-gray-300 flex overflow-auto items-center gap-x-6 gap-y-2">
      {tokenStats.map((stat, index) => (
        <div key={index} className="flex items-center gap-1.5">
          <span className="text-primary">{stat.icon}</span>
          <span className="text-xs text-muted-foreground">{stat.label}:</span>
          {isLoading ? (
            <div
              className={`h-3.5 w-${stat.skeleton / 10} rounded-sm bg-muted`}
            />
          ) : (
            <span className="text-xs font-medium">{stat.value || "N/A"}</span>
          )}
        </div>
      ))}

      {/* Optional refresh button */}
      {!isLoading && (
        <button
          onClick={() => refetch()}
          className="ml-auto text-xs text-primary hover:text-primary/80 transition-colors"
        >
          Refresh
        </button>
      )}
    </div>
  );
}
