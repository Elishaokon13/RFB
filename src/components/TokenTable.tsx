import { useState } from "react";
import { ChevronDown, TrendingUp, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

// Mock data for demonstration
const mockTokens = [
  {
    rank: 1,
    chain: "Solana",
    dex: "Raydium",
    token: "ALT",
    name: "Altcoin",
    price: "$0.005765",
    age: "12d",
    txns: "51,612",
    volume: "$12.1M",
    makers: "12,125",
    change5m: -3.82,
    change1h: -33.19,
    change6h: 37.04,
    change24h: 409,
    liquidity: "$418K",
    mcap: "$5.7M",
    boost: 500,
  },
  {
    rank: 2,
    chain: "Solana", 
    dex: "PumpSwap",
    token: "AltSeason",
    name: "AltSeason Coin",
    price: "$0.0006741",
    age: "7h",
    txns: "38,373",
    volume: "$4.3M",
    makers: "10,241",
    change5m: 7.18,
    change1h: -9.22,
    change6h: -0.73,
    change24h: 728,
    liquidity: "$100K",
    mcap: "$674K",
    boost: 700,
  },
  {
    rank: 3,
    chain: "Solana",
    dex: "Raydium", 
    token: "Valentine",
    name: "Valentine's Day",
    price: "$0.0005990",
    age: "16h",
    txns: "114,179",
    volume: "$4.6M",
    makers: "13,343",
    change5m: -1.00,
    change1h: 18.21,
    change6h: -62.81,
    change24h: 1297,
    liquidity: "$71K",
    mcap: "$599K",
    boost: 500,
  },
];

const timeFilters = ["5M", "1H", "6H", "24H"];
const topFilters = ["Top", "Gainers", "New Pairs"];

function PercentageCell({ value }: { value: number }) {
  const isPositive = value > 0;
  return (
    <span className={cn(
      "font-medium",
      isPositive ? "text-gain" : "text-loss"
    )}>
      {isPositive ? "+" : ""}{value.toFixed(2)}%
    </span>
  );
}

export function TokenTable() {
  const [activeTimeFilter, setActiveTimeFilter] = useState("6H");
  const [activeTopFilter, setActiveTopFilter] = useState("Top");

  return (
    <div className="flex-1 bg-background">
      {/* Header Stats */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-8">
            <div>
              <span className="text-sm text-muted-foreground">24H Volume:</span>
              <div className="text-2xl font-bold text-foreground">$25.34B</div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">24H Txns:</span>
              <div className="text-2xl font-bold text-foreground">52,656,944</div>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">24H Last 24 hours</div>
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex bg-muted rounded-lg p-1">
              <button className="px-3 py-1 bg-primary text-primary-foreground rounded-md text-sm font-medium">
                Trending
              </button>
            </div>

            <div className="flex bg-muted rounded-lg p-1">
              {timeFilters.map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveTimeFilter(filter)}
                  className={cn(
                    "px-3 py-1 rounded-md text-sm font-medium transition-colors",
                    activeTimeFilter === filter
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {filter}
                </button>
              ))}
            </div>

            <div className="flex bg-muted rounded-lg p-1">
              {topFilters.map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveTopFilter(filter)}
                  className={cn(
                    "px-3 py-1 rounded-md text-sm font-medium transition-colors",
                    activeTopFilter === filter
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rank by:</span>
            <button className="flex items-center gap-1 text-sm text-foreground hover:text-primary">
              Trending 6H
              <ChevronDown className="w-4 h-4" />
            </button>
            <button className="flex items-center gap-1 px-3 py-1 bg-muted rounded-lg text-sm text-muted-foreground hover:text-foreground">
              <Filter className="w-4 h-4" />
              Filters
            </button>
            <button className="px-3 py-1 bg-muted rounded-lg text-sm text-muted-foreground hover:text-foreground">
              Customize
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto">
        <table className="w-full">
          <thead className="bg-muted border-b border-border">
            <tr className="text-left">
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">#</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">TOKEN</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">PRICE</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">AGE</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">TXNS</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">VOLUME</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">MAKERS</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">5M</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">1H</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">6H</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">24H</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">LIQUIDITY</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">MCAP</th>
            </tr>
          </thead>
          <tbody>
            {mockTokens.map((token, index) => (
              <tr 
                key={token.rank} 
                className={cn(
                  "border-b border-border hover:bg-muted/50 transition-colors cursor-pointer",
                  index % 2 === 0 ? "bg-card" : "bg-background"
                )}
              >
                <td className="px-4 py-3 text-sm text-muted-foreground">#{token.rank}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <span className="w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center text-xs">◎</span>
                      <span className="w-4 h-4 bg-orange-500 rounded-full"></span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{token.token}</span>
                        <span className="text-xs text-muted-foreground">/{token.name}</span>
                        {token.boost && (
                          <span className="bg-yellow-500 text-black text-xs px-1 rounded font-bold">
                            ⚡{token.boost}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm font-medium text-foreground">{token.price}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{token.age}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{token.txns}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{token.volume}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{token.makers}</td>
                <td className="px-4 py-3 text-sm"><PercentageCell value={token.change5m} /></td>
                <td className="px-4 py-3 text-sm"><PercentageCell value={token.change1h} /></td>
                <td className="px-4 py-3 text-sm"><PercentageCell value={token.change6h} /></td>
                <td className="px-4 py-3 text-sm"><PercentageCell value={token.change24h} /></td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{token.liquidity}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{token.mcap}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}