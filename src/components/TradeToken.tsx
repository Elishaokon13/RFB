import { useState, useCallback } from "react";
import { ArrowUpDown, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TradeTokenProps {
  token: {
    name: string;
    symbol: string;
    address: string;
  };
  currentPrice: string;
  priceChange24h?: number;
  onTrade?: (type: 'buy' | 'sell', amount: number, tokenAmount: number) => void;
}

export function TradeToken({ token, currentPrice, priceChange24h, onTrade }: TradeTokenProps) {
  const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy");
  const [usdAmount, setUsdAmount] = useState("");
  const [tokenAmount, setTokenAmount] = useState("");

  const currentPriceNum = parseFloat(currentPrice.replace(/[$,]/g, "")) || 0;

  // Calculate token amount when USD amount changes
  const handleUsdAmountChange = useCallback((value: string) => {
    setUsdAmount(value);
    if (currentPriceNum > 0) {
      const usd = parseFloat(value) || 0;
      const tokens = usd / currentPriceNum;
      setTokenAmount(tokens.toFixed(6));
    } else {
      setTokenAmount("");
    }
  }, [currentPriceNum]);

  // Calculate USD amount when token amount changes
  const handleTokenAmountChange = useCallback((value: string) => {
    setTokenAmount(value);
    if (currentPriceNum > 0) {
      const tokens = parseFloat(value) || 0;
      const usd = tokens * currentPriceNum;
      setUsdAmount(usd.toFixed(2));
    } else {
      setUsdAmount("");
    }
  }, [currentPriceNum]);

  const handleTrade = useCallback(() => {
    const usd = parseFloat(usdAmount) || 0;
    const tokens = parseFloat(tokenAmount) || 0;
    
    if (usd > 0 && tokens > 0) {
      onTrade?.(activeTab, usd, tokens);
      // Reset form after trade
      setUsdAmount("");
      setTokenAmount("");
    }
  }, [activeTab, usdAmount, tokenAmount, onTrade]);

  const isTradeDisabled = !usdAmount || !tokenAmount || parseFloat(usdAmount) <= 0 || parseFloat(tokenAmount) <= 0;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowUpDown className="w-5 h-5" />
          Trade {token.symbol}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Price Display */}
        <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Current Price</p>
            <p className="text-lg font-semibold text-foreground">{currentPrice}</p>
          </div>
          {priceChange24h !== undefined && (
            <div className="flex items-center gap-1">
              {priceChange24h >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
              <span className={cn(
                "text-sm font-medium",
                priceChange24h >= 0 ? "text-green-500" : "text-red-500"
              )}>
                {priceChange24h >= 0 ? '+' : ''}{priceChange24h.toFixed(2)}%
              </span>
            </div>
          )}
        </div>

        {/* Trade Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "buy" | "sell")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="buy" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Buy
            </TabsTrigger>
            <TabsTrigger value="sell" className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              Sell
            </TabsTrigger>
          </TabsList>

          <TabsContent value="buy" className="space-y-4">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground">Amount (USD)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={usdAmount}
                    onChange={(e) => handleUsdAmountChange(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-foreground">Amount ({token.symbol})</label>
                <Input
                  type="number"
                  placeholder="0.000000"
                  value={tokenAmount}
                  onChange={(e) => handleTokenAmountChange(e.target.value)}
                />
              </div>

              <Button 
                onClick={handleTrade}
                disabled={isTradeDisabled}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                Buy {token.symbol}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="sell" className="space-y-4">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground">Amount ({token.symbol})</label>
                <Input
                  type="number"
                  placeholder="0.000000"
                  value={tokenAmount}
                  onChange={(e) => handleTokenAmountChange(e.target.value)}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-foreground">Amount (USD)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={usdAmount}
                    onChange={(e) => handleUsdAmountChange(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Button 
                onClick={handleTrade}
                disabled={isTradeDisabled}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
              >
                Sell {token.symbol}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Quick Amount Buttons */}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Quick Amount</p>
          <div className="grid grid-cols-2 gap-2">
            {[10, 50, 100, 500].map((amount) => (
              <Button
                key={amount}
                variant="outline"
                size="sm"
                onClick={() => handleUsdAmountChange(amount.toString())}
                className="text-xs"
              >
                ${amount}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 