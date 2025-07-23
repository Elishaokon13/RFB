import React, { useState } from 'react';
import { Copy, ExternalLink, CheckCircle, Users, TrendingUp, DollarSign, BarChart3 } from 'lucide-react';
import { CreatorInfoPointer } from './CreatorInfoPointer';
import { FollowerPointerCard } from './ui/following-pointer';
import { useZoraProfile, getProfileImageSmall } from '@/hooks/useZoraProfile';
import { truncateAddress } from '@/lib/utils';

// Import Coin type from useCreators hook
interface Coin {
  id?: string;
  name?: string;
  description?: string;
  address?: string;
  symbol?: string;
  totalSupply?: string;
  totalVolume?: string;
  volume24h?: string;
  createdAt?: string;
  creatorAddress?: string;
  marketCap?: string;
  marketCapDelta24h?: string;
  chainId?: number;
  uniqueHolders?: number;
  image?: string;
  creatorProfile?: {
    handle?: string;
    address?: string;
    displayName?: string;
    avatar?: {
      previewImage?: {
        small?: string;
        medium?: string;
      };
    };
  };
  creatorEarnings?: Array<{
    amountUsd?: string;
    amountRaw?: string;
  }>;
}

interface Creator {
  address: string;
  handle?: string;
  displayName?: string;
  avatar?: string;
  tokenCount: number;
  totalEarnings: number;
  totalVolume: number;
  totalHolders: number;
  coins: Coin[];
}

interface CreatorsTableProps {
  creators: Creator[];
  isLoading?: boolean;
}

// Format large numbers
function formatNumber(num: number): string {
  if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
  return `$${num.toFixed(2)}`;
}

// Format volume numbers
function formatVolume(num: number): string {
  if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
}

const CreatorRow = ({ creator, index }: { creator: Creator; index: number }) => {
  const [copiedAddress, setCopiedAddress] = useState(false);
  const { profile } = useZoraProfile(creator.address);

  const handleCopyAddress = async () => {
    await navigator.clipboard.writeText(creator.address);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  // Get creator profile for the pointer
  const imageUrl = profile?.avatar?.previewImage?.small || getProfileImageSmall(profile);

  // Creator info for the pointer
  const creatorInfo = (
    <div className="flex items-center gap-2">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt="profile"
          className="w-6 h-6 rounded-full object-cover border border-white/10"
        />
      ) : creator.address ? (
        <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs">
          {creator.address.slice(2, 4).toUpperCase()}
        </div>
      ) : (
        <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs">
          ?
        </div>
      )}
      <span className="font-medium">
        {profile?.displayName || (creator.address ? truncateAddress(creator.address) : "Unknown")}
      </span>
    </div>
  );

  return (
    <FollowerPointerCard
      title={creatorInfo}
      className="contents"
    >
      <tr className="border-b border-border transition-colors duration-200 hover:bg-muted/50">
        <td className="px-6 py-4 text-sm align-top">
          <CreatorInfoPointer creatorAddress={creator.address} showLink={true} />
        </td>
        <td className="px-6 py-4 text-sm align-top">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-500" />
            <span className="font-semibold text-green-600">
              {formatNumber(creator.totalEarnings)}
            </span>
          </div>
        </td>
        <td className="px-6 py-4 text-sm align-top">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-500" />
            <span className="font-semibold text-blue-600">
              {formatVolume(creator.totalVolume)}
            </span>
          </div>
        </td>
        <td className="px-6 py-4 text-sm align-top">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-500" />
            <span className="font-semibold text-purple-600">
              {creator.totalHolders.toLocaleString()}
            </span>
          </div>
        </td>
        <td className="px-6 py-4 text-sm align-top">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="font-semibold text-primary">
              {creator.tokenCount}
            </span>
            <span className="text-muted-foreground">tokens</span>
          </div>
        </td>
        <td className="px-6 py-4 text-sm align-top">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyAddress}
              className="p-1 hover:bg-muted rounded transition-colors"
              title="Copy address"
            >
              {copiedAddress ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            <a
              href={`https://zora.co/${creator.handle || creator.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 hover:bg-muted rounded transition-colors"
              title="View on Zora"
            >
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </a>
          </div>
        </td>
      </tr>
    </FollowerPointerCard>
  );
};

export function CreatorsTable({ creators, isLoading }: CreatorsTableProps) {
  if (isLoading) {
    return (
      <div className="w-full">
        <div className="animate-pulse">
          <div className="h-12 bg-muted rounded-t-lg mb-4"></div>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted/50 mb-2 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (creators.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No creators found</h3>
        <p className="text-muted-foreground">
          No creator data is currently available.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="min-w-full w-full">
        <thead className="bg-muted/50 border-b border-border">
          <tr className="text-left">
            <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Creator
            </th>
            <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Earnings
            </th>
            <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Volume
            </th>
            <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Holders
            </th>
            <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Tokens
            </th>
            <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {creators.map((creator, index) => (
            <CreatorRow key={creator.address} creator={creator} index={index} />
          ))}
        </tbody>
      </table>
    </div>
  );
} 