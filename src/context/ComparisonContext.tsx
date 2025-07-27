import React, { createContext, useContext, useState, useCallback } from 'react';

// Define types
export interface ComparisonToken {
  address: string;
  name: string;
  symbol: string;
  image?: string;
  color: string; // For chart visualization
}

export type TimeframeOption = '1h' | '24h' | '7d' | '30d' | '1y';
export type MetricOption = 'price' | 'volume' | 'marketCap' | 'holders' | 'socialActivity';
export type ChartType = 'line' | 'bar' | 'area';

export interface ComparisonState {
  tokens: ComparisonToken[];
  timeframe: TimeframeOption;
  metrics: MetricOption[];
  chartType: ChartType;
  isRelative: boolean; // Whether to show absolute values or % change
}

interface ComparisonContextType {
  state: ComparisonState;
  addToken: (token: Omit<ComparisonToken, 'color'>) => void;
  removeToken: (address: string) => void;
  clearTokens: () => void;
  setTimeframe: (timeframe: TimeframeOption) => void;
  toggleMetric: (metric: MetricOption) => void;
  setChartType: (type: ChartType) => void;
  toggleRelativeMode: () => void;
}

// Define default chart colors
const DEFAULT_COLORS = [
  '#ff6384', // Red
  '#36a2eb', // Blue
  '#ffce56', // Yellow
  '#4bc0c0', // Teal
];

// Create context with default values
const ComparisonContext = createContext<ComparisonContextType | undefined>(undefined);

export const ComparisonProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<ComparisonState>({
    tokens: [],
    timeframe: '24h',
    metrics: ['price', 'volume', 'marketCap'],
    chartType: 'line',
    isRelative: false,
  });

  const addToken = useCallback((token: Omit<ComparisonToken, 'color'>) => {
    setState((prev) => {
      // Don't add if already exists or more than 4 tokens
      if (prev.tokens.some(t => t.address === token.address) || prev.tokens.length >= 4) {
        return prev;
      }

      // Assign a color based on position
      const color = DEFAULT_COLORS[prev.tokens.length % DEFAULT_COLORS.length];
      
      return {
        ...prev,
        tokens: [...prev.tokens, { ...token, color }],
      };
    });
  }, []);

  const removeToken = useCallback((address: string) => {
    setState((prev) => ({
      ...prev,
      tokens: prev.tokens.filter((token) => token.address !== address),
    }));
  }, []);

  const clearTokens = useCallback(() => {
    setState((prev) => ({
      ...prev,
      tokens: [],
    }));
  }, []);

  const setTimeframe = useCallback((timeframe: TimeframeOption) => {
    setState((prev) => ({
      ...prev,
      timeframe,
    }));
  }, []);

  const toggleMetric = useCallback((metric: MetricOption) => {
    setState((prev) => {
      const metrics = prev.metrics.includes(metric)
        ? prev.metrics.filter((m) => m !== metric)
        : [...prev.metrics, metric];
      return {
        ...prev,
        metrics,
      };
    });
  }, []);

  const setChartType = useCallback((chartType: ChartType) => {
    setState((prev) => ({
      ...prev,
      chartType,
    }));
  }, []);

  const toggleRelativeMode = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isRelative: !prev.isRelative,
    }));
  }, []);

  return (
    <ComparisonContext.Provider
      value={{
        state,
        addToken,
        removeToken,
        clearTokens,
        setTimeframe,
        toggleMetric,
        setChartType,
        toggleRelativeMode,
      }}
    >
      {children}
    </ComparisonContext.Provider>
  );
};

// Custom hook for using the comparison context
export const useComparison = () => {
  const context = useContext(ComparisonContext);
  if (context === undefined) {
    throw new Error('useComparison must be used within a ComparisonProvider');
  }
  return context;
}; 