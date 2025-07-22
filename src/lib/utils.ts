import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Validates if a string is a valid Ethereum address
 */
export function isValidEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Sanitizes an Ethereum address, handling potential issues like duplicated addresses
 * @param address The address to sanitize
 * @param context Optional context for logging
 * @returns Sanitized address or null if invalid
 */
export function sanitizeEthereumAddress(address: string, context: string = "unknown"): string | null {
  if (!address) {
    console.warn(`[Address Sanitization] Empty address in context: ${context}`);
    return null;
  }
  
  // Handle case where address might be duplicated (e.g., "0x123...0x456...")
  if (address.includes("0x") && address.lastIndexOf("0x") > 0) {
    console.error(`[Address Sanitization] Duplicated address detected in context: ${context}`, {
      originalAddress: address,
      duplicatePosition: address.lastIndexOf("0x")
    });
    
    // Try to extract the first valid address
    const firstPart = address.substring(0, address.lastIndexOf("0x"));
    if (isValidEthereumAddress(firstPart)) {
      console.warn(`[Address Sanitization] Extracted first part: ${firstPart}`);
      return firstPart;
    }
    
    // If first part isn't valid, try the second part
    const secondPart = address.substring(address.lastIndexOf("0x"));
    if (isValidEthereumAddress(secondPart)) {
      console.warn(`[Address Sanitization] Extracted second part: ${secondPart}`);
      return secondPart;
    }
  }
  
  // Clean up the address (trim whitespace, lowercase)
  const cleaned = address.trim().toLowerCase();
  
  // Validate the cleaned address
  if (!isValidEthereumAddress(cleaned)) {
    console.error(`[Address Sanitization] Invalid address in context: ${context}`, {
      originalAddress: address,
      cleanedAddress: cleaned
    });
    return null;
  }
  
  return cleaned;
}

export function formatNumber(num: number, options: { decimals?: number; prefix?: string; suffix?: string } = {}) {
  const { decimals = 0, prefix = "", suffix = "" } = options;
  return `${prefix}${num.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}${suffix}`;
}

export function getTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}

/**
 * Truncates a string to a specified length and adds an ellipsis
 * @param text - The text to truncate
 * @param maxLength - Maximum length before truncation
 * @param suffix - Suffix to add after truncation (default: "...")
 * @returns Truncated string
 */
export function truncate(text: string, maxLength: number, suffix: string = "..."): string {
  if (!text || text.length <= maxLength) {
    return text;
  }
  
  return text.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * Truncates text to a specified number of words
 * @param text - The text to truncate
 * @param maxWords - Maximum number of words
 * @param suffix - Suffix to add after truncation (default: "...")
 * @returns Truncated string
 */
export function truncateWords(text: string, maxWords: number = 100, suffix: string = "..."): string {
  if (!text) return text;
  
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) {
    return text;
  }
  
  return words.slice(0, maxWords).join(" ") + suffix;
}

/**
 * Truncates an Ethereum address to show first and last characters
 * @param address - The Ethereum address to truncate
 * @param startLength - Number of characters to show at start (default: 6)
 * @param endLength - Number of characters to show at end (default: 4)
 * @returns Truncated address like "0x1234...5678"
 */
export function truncateAddress(address: string, startLength: number = 6, endLength: number = 4): string {
  if (!address || address.length < startLength + endLength) {
    return address;
  }
  
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
}

/**
 * Truncates a number to a specified number of decimal places
 * @param num - The number to truncate
 * @param decimals - Number of decimal places (default: 2)
 * @returns Truncated number as string
 */
export function truncateNumber(num: number, decimals: number = 2): string {
  return Number(num.toFixed(decimals)).toString();
}
