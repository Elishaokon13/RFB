import React from "react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  YAxis,
  XAxis,
} from "recharts";
import { cn } from "@/lib/utils";

// Type for historical price data from DefiLlama
type PriceDataPoint = {
  timestamp: number;
  price: number;
};

// Type for market cap data point (transformed from price data)
type MarketCapDataPoint = {
  timestamp: number;
  value: number; // This will be market cap value
  price: number; // Keep original price for reference
};

type ChartProps = {
  data: MarketCapDataPoint[];
  changePercent: number;
  selectedRange: string;
  onRangeChange: (range: string) => void;
  loading?: boolean;
  error?: string | null;
  totalSupply?: string | number;
};

const ranges = ["1H", "6H", "24H", "7D", "1M", "All"];

const formatCurrency = (value: number) =>
  `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const formatTimestamp = (timestamp: number) => {
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const MarketCapChart: React.FC<ChartProps> = ({
  data,
  changePercent,
  selectedRange,
  onRangeChange,
  loading = false,
  error = null,
  totalSupply,
}) => {
  const color = changePercent >= 0 ? "#00C853" : "#D50000";

  // Calculate current market cap from the latest data point
  const currentMarketCap = data.length > 0 ? data[data.length - 1].value : 0;



  if (loading) {
    return (
      <div className="bg-white dark:bg-black p-4 rounded-xl shadow-sm">
        <p className="text-muted-foreground text-sm mb-1">Market cap</p>
        <div className="flex items-end gap-2 mb-4">
          <div className="w-32 h-10 bg-muted animate-pulse rounded"></div>
          <div className="w-16 h-6 bg-muted animate-pulse rounded"></div>
        </div>
        <div className="w-full h-64 bg-muted animate-pulse rounded"></div>
        <div className="flex justify-center gap-3 mt-4">
          {ranges.map((r) => (
            <div key={r} className="w-12 h-8 bg-muted animate-pulse rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-black p-4 rounded-xl shadow-sm">
        <p className="text-muted-foreground text-sm mb-1">Market cap</p>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Error loading chart data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-black p-4 rounded-xl shadow-sm">
      <p className="text-muted-foreground text-sm mb-1">Market cap</p>
      <div className="flex items-end gap-2 mb-4">
        <p className="text-3xl font-bold text-foreground">
          {formatCurrency(currentMarketCap)}
        </p>
        <p className={cn("text-lg", changePercent >= 0 ? "text-green-600" : "text-red-500")}>
          {`${changePercent > 0 ? "+" : ""}${changePercent.toFixed(1)}%`}
        </p>
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <Tooltip
            contentStyle={{ 
              background: "white", 
              borderRadius: 8, 
              border: "none",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
            }}
            formatter={(value: number, name: string) => [
              formatCurrency(value),
              name === 'value' ? 'Market Cap' : 'Price'
            ]}
            labelFormatter={(label) => formatTimestamp(Number(label))}
          />
          <YAxis 
            hide 
            domain={["dataMin", "dataMax"]} 
          />
          <XAxis 
            hide 
            dataKey="timestamp"
            type="number"
            domain={["dataMin", "dataMax"]}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: color }}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="flex justify-center gap-3 mt-4">
        {ranges.map((r) => (
          <button
            key={r}
            onClick={() => onRangeChange(r)}
            className={cn(
              "px-3 py-1 text-sm rounded-lg transition-colors",
              r === selectedRange
                ? "bg-black text-white dark:bg-white dark:text-black"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {r}
          </button>
        ))}
      </div>
    </div>
  );
};

export default MarketCapChart;
