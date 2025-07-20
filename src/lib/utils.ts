import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
export function truncateWords(text: string, maxWords: number, suffix: string = "..."): string {
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
