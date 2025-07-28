import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useWalletTokens } from "@/hooks/useWalletTokens";
import { usePrivy } from "@privy-io/react-auth";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  BarChart3,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  EyeOff,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

const PortfolioPage = () => {
  const [showBalances, setShowBalances] = useState(true);
  const { user, authenticated } = usePrivy();
  const { tokens, loading, error, refetch, isConnected, walletAddress } =
    useWalletTokens();

  // Calculate portfolio summary from real data
  const portfolioSummary = {
    totalTokens: tokens.length,
    totalValue: 0, // TODO: Add price fetching to calculate real value
    bestPerformer: tokens.length > 0 ? tokens[0] : null,
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const formatTokenAmount = (amount: number) => {
    if (amount >= 1000000) {
      return (amount / 1000000).toFixed(2) + "M";
    } else if (amount >= 1000) {
      return (amount / 1000).toFixed(2) + "K";
    }
    return amount.toLocaleString();
  };

  return (
    <div className="container mx-auto p-4 max-w-[1800px]">
      <div className="flex flex-col space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Portfolio</h1>
            <p className="text-muted-foreground text-sm">
              {isConnected ? (
                <></>
              ) : (
                "Connect your wallet to view your portfolio"
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refetch}
              disabled={loading}
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBalances(!showBalances)}
            >
              {showBalances ? (
                <EyeOff className="w-4 h-4 mr-2" />
              ) : (
                <Eye className="w-4 h-4 mr-2" />
              )}
              {showBalances ? "Hide" : "Show"} Balances
            </Button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid gap-3">
            <Skeleton className="h-48 w-full" />
          </div>
        ) : !isConnected ? (
          <Card className="w-full">
            <CardContent className="pt-4">
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <Wallet className="w-10 h-10 text-muted-foreground mb-3" />
                <h3 className="text-lg font-medium">Connect your wallet</h3>
                <p className="text-muted-foreground mt-1 max-w-md text-sm">
                  Please connect your wallet to view your portfolio and token
                  holdings.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="w-full">
            <CardContent className="pt-4">
              <div className="flex flex-col items-center justify-center p-4 text-center">
                <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
                <h3 className="text-base font-medium">
                  Error loading portfolio
                </h3>
                <p className="text-muted-foreground mt-1 text-sm">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={refetch}
                >
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : tokens.length === 0 ? (
          <Card className="w-full">
            <CardContent className="pt-4">
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <Wallet className="w-10 h-10 text-muted-foreground mb-3" />
                <h3 className="text-lg font-medium">No tokens found</h3>
                <p className="text-muted-foreground mt-1 max-w-md text-sm">
                  No ERC20 tokens found in your connected wallet.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {/* Portfolio Overview */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Wallet className="w-4 h-4" />
                  Portfolio Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Total Tokens
                    </p>
                    <p className="text-xl font-bold">
                      {portfolioSummary.totalTokens}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ERC20 tokens found
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Total Value</p>
                    <p className="text-xl font-bold">
                      {showBalances
                        ? formatNumber(portfolioSummary.totalValue)
                        : "****"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      USD value (coming soon)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Holdings Table */}
            <div className="w-full overflow-x-auto bg-card rounded-lg border border-border">
              <table className="w-full">
                <thead className="bg-muted/50 text-muted-foreground text-sm">
                  <tr>
                    <th className="py-2 px-3 text-left font-medium">Token</th>
                    <th className="py-2 px-3 text-left font-medium">Balance</th>
                    <th className="py-2 px-3 text-right font-medium">
                      Contract Address
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tokens.map((token, index) => (
                    <tr
                      key={token.contractAddress}
                      className={cn(
                        "border-b border-border hover:bg-muted/50 transition-colors",
                        index % 2 === 0 ? "bg-card" : "bg-background"
                      )}
                    >
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center overflow-hidden">
                            {token.logo ? (
                              <img
                                src={token.logo}
                                alt={token.symbol}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="flex items-center justify-center w-full h-full text-xs font-medium">
                                {token.symbol?.charAt(0) || "?"}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-sm">
                              {token.symbol}
                            </div>
                            <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                              {token.name}
                            </div>
                            {token.error && (
                              <div className="text-xs text-red-500">
                                {token.error}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <div className="font-medium text-sm">
                          {showBalances
                            ? formatTokenAmount(token.balance)
                            : "****"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatTokenAmount(token.balance)} {token.symbol}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="text-xs font-mono text-muted-foreground">
                          {token.contractAddress.slice(0, 6)}...
                          {token.contractAddress.slice(-4)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PortfolioPage;
