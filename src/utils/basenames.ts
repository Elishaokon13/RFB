import { Address, createPublicClient, http, encodePacked, keccak256, namehash } from 'viem';
import { base } from 'viem/chains';
import L2ResolverAbi from '@/abis/L2ResolverAbi';

// Official deployed contract address for Basenames L2 Resolver (Base Mainnet)
export const BASENAME_L2_RESOLVER_ADDRESS: `0x${string}` = '0xC6d566A56A1aFf6508b41f6c90ff131615583BCD';

// Utility: Convert an address to its reverse node (for ENS-style lookup)
export function convertReverseNodeToBytes(address: Address, chainId: number): string {
  // Remove 0x prefix and lowercase
  const clean = address.toLowerCase().replace(/^0x/, '');
  // Reverse the address bytes
  const reversed = clean.match(/.{1,2}/g)?.reverse().join('') ?? '';
  // Compose the reverse node (address.reverse.baseid.addr.reverse)
  const node = `${reversed}.baseid.addr.reverse`;
  // Return the namehash (ENS-compatible)
  return namehash(node);
}

// Create a public client for Base
export const baseClient = createPublicClient({
  chain: base,
  transport: http(),
});

// Main function: resolve a Basename for an address
export async function resolveBasename(address: Address): Promise<string | null> {
  try {
    const addressReverseNode = convertReverseNodeToBytes(address, base.id);
    // Ensure addressReverseNode is a 0x-prefixed 32-byte hex string
    const nodeHex = addressReverseNode.startsWith('0x') ? addressReverseNode : `0x${addressReverseNode}`;
    const basename = await baseClient.readContract({
      abi: L2ResolverAbi,
      address: BASENAME_L2_RESOLVER_ADDRESS,
      functionName: 'name',
      args: [nodeHex as `0x${string}`],
    });
    if (basename && typeof basename === 'string' && basename.length > 0) {
      return basename;
    }
    return null;
  } catch (error) {
    console.error('Error resolving Basename:', error);
    return null;
  }
} 