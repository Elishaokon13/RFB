import { useEffect, useState } from 'react';
import { ethers } from 'ethers';

// Replace with the actual Zora Creator 1155 implementation contract address
const contractAddress = "0xZoraCreator1155ImplAddress";
const abi = [
  "event UpdatedToken(address indexed sender, uint256 indexed tokenId, tuple(string uri, uint256 maxSupply) TokenData)"
];

export interface ZoraTokenEvent {
  tokenId: string;
  uri: string;
  maxSupply: string;
  timestamp: number;
  sender: string;
}

export function useZoraTokenListener() {
  const [tokens, setTokens] = useState<ZoraTokenEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const provider = new ethers.providers.WebSocketProvider("wss://zora-mainnet.chainstack.com/ws");
    const contract = new ethers.Contract(contractAddress, abi, provider);

    const handler = (sender: string, tokenId: ethers.BigNumberish, tokenData: { uri: string; maxSupply: ethers.BigNumberish }, event) => {
      const timestamp = Date.now();
      const newToken: ZoraTokenEvent = {
        tokenId: tokenId.toString(),
        uri: tokenData.uri,
        maxSupply: tokenData.maxSupply.toString(),
        timestamp,
        sender,
      };
      setTokens(prev => [newToken, ...prev].slice(0, 50)); // Keep only the latest 50
      console.log(`New Token Created:\n  - Token ID: ${newToken.tokenId}\n  - Metadata URI: ${newToken.uri}\n  - Max Supply: ${newToken.maxSupply}\n  - Timestamp: ${newToken.timestamp} ms\n  - Sender: ${newToken.sender}`);
    };

    contract.on("UpdatedToken", handler);
    setLoading(false);

    return () => {
      contract.off("UpdatedToken", handler);
      provider.destroy?.();
    };
  }, []);

  return { tokens, loading };
} 