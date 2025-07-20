import { useMemo } from "react";

interface FormatOptions {
  decimals?: number;
  prefix?: string;
  suffix?: string;
  fallback?: string;
  locale?: string;
  notation?: "standard" | "scientific" | "engineering" | "compact";
  compactDisplay?: "short" | "long";
}

interface NumberFormatterResult {
  formatted: string;
  formatNumber: (
    num: number | string | null | undefined,
    options?: FormatOptions
  ) => string;
  formatCurrency: (
    num: number | string | null | undefined,
    currency?: string,
    options?: Omit<FormatOptions, "prefix" | "suffix">
  ) => string;
  formatPercentage: (
    num: number | string | null | undefined,
    options?: Omit<FormatOptions, "suffix">
  ) => string;
  formatCompact: (
    num: number | string | null | undefined,
    options?: FormatOptions
  ) => string;
}

export const useNumberFormatter = (
  value?: number | string | null,
  defaultOptions?: FormatOptions
): NumberFormatterResult => {
  const formatNumber = useMemo(() => {
    return (
      num: number | string | null | undefined,
      options: FormatOptions = {}
    ): string => {
      const opts = { ...defaultOptions, ...options };
      const {
        decimals,
        prefix = "",
        suffix = "",
        fallback = "N/A",
        locale = "en-US",
        notation = "standard",
        compactDisplay = "short",
      } = opts;

      // Handle null/undefined/empty values
      if (num === null || num === undefined || num === "") {
        return fallback;
      }

      // Convert string to number
      const numValue = typeof num === "string" ? parseFloat(num) : num;

      // Handle invalid numbers
      if (isNaN(numValue)) {
        return fallback;
      }

      try {
        const formatter = new Intl.NumberFormat(locale, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
          notation,
          compactDisplay: notation === "compact" ? compactDisplay : undefined,
        });

        const formatted = formatter.format(numValue);
        return `${prefix}${formatted}${suffix}`;
      } catch (error) {
        // Fallback to basic formatting if Intl.NumberFormat fails
        const basicFormatted =
          decimals !== undefined
            ? numValue.toFixed(decimals)
            : numValue.toLocaleString(locale);
        return `${prefix}${basicFormatted}${suffix}`;
      }
    };
  }, [defaultOptions]);

  const formatCurrency = useMemo(() => {
    return (
      num: number | string | null | undefined,
      currency: string = "USD",
      options: Omit<FormatOptions, "prefix" | "suffix"> = {}
    ): string => {
      const opts = { ...defaultOptions, ...options };
      const {
        decimals = 2,
        fallback = "N/A",
        locale = "en-US",
        notation = "standard",
        compactDisplay = "short",
      } = opts;

      if (num === null || num === undefined || num === "") {
        return fallback;
      }

      const numValue = typeof num === "string" ? parseFloat(num) : num;

      if (isNaN(numValue)) {
        return fallback;
      }

      try {
        const formatter = new Intl.NumberFormat(locale, {
          style: "currency",
          currency,
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
          notation,
          compactDisplay: notation === "compact" ? compactDisplay : undefined,
        });

        return formatter.format(numValue);
      } catch (error) {
        // Fallback formatting
        const symbol =
          currency === "USD" ? "$" : currency === "EUR" ? "€" : currency;
        return `${symbol}${numValue.toFixed(decimals)}`;
      }
    };
  }, [defaultOptions]);

  const formatPercentage = useMemo(() => {
    return (
      num: number | string | null | undefined,
      options: Omit<FormatOptions, "suffix"> = {}
    ): string => {
      return formatNumber(num, { ...options, suffix: "%" });
    };
  }, [formatNumber]);

  const formatCompact = useMemo(() => {
    return (
      num: number | string | null | undefined,
      options: FormatOptions = {}
    ): string => {
      return formatNumber(num, { ...options, notation: "compact" });
    };
  }, [formatNumber]);

  // Format the primary value if provided
  const formatted = useMemo(() => {
    return formatNumber(value);
  }, [value, formatNumber]);

  return {
    formatted,
    formatNumber,
    formatCurrency,
    formatPercentage,
    formatCompact,
  };
};

// Additional utility hook for common crypto/financial formatting
export const useCryptoFormatter = () => {
  const { formatNumber, formatCurrency, formatCompact } = useNumberFormatter();

  const formatPrice = useMemo(() => {
    return (price: number | string | null | undefined): string => {
      const numPrice = typeof price === "string" ? parseFloat(price) : price;

      if (!numPrice || isNaN(numPrice)) return "N/A";

      // For very small prices (< 0.01), show more decimals
      if (numPrice < 0.01) {
        return formatCurrency(numPrice, "USD", { decimals: 6 });
      }
      // For small prices (< 1), show 4 decimals
      if (numPrice < 1) {
        return formatCurrency(numPrice, "USD", { decimals: 4 });
      }
      // For normal prices, show 2 decimals
      return formatCurrency(numPrice, "USD", { decimals: 2 });
    };
  }, [formatCurrency]);

  const formatMarketCap = useMemo(() => {
    return (marketCap: number | string | null | undefined): string => {
      return formatCurrency(marketCap, "USD", {
        notation: "compact",
        decimals: 1,
        compactDisplay: "short",
      });
    };
  }, [formatCurrency]);

  const formatVolume = useMemo(() => {
    return (volume: number | string | null | undefined): string => {
      return formatCurrency(volume, "USD", {
        notation: "compact",
        decimals: 1,
        compactDisplay: "short",
      });
    };
  }, [formatCurrency]);

  const formatSupply = useMemo(() => {
    return (supply: number | string | null | undefined): string => {
      return formatCompact(supply, { decimals: 0 });
    };
  }, [formatCompact]);

  const formatPriceChange = useMemo(() => {
    return (change: number | string | null | undefined): string => {
      const numChange =
        typeof change === "string" ? parseFloat(change) : change;

      if (!numChange || isNaN(numChange)) return "N/A";

      const sign = numChange >= 0 ? "+" : "";
      return `${sign}${formatNumber(numChange, { decimals: 2 })}%`;
    };
  }, [formatNumber]);

  return {
    formatPrice,
    formatMarketCap,
    formatVolume,
    formatSupply,
    formatPriceChange,
    formatNumber,
    formatCurrency,
    formatCompact,
  };
};
