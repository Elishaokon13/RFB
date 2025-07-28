import React, { useState } from "react";
import {
  Copy,
  ExternalLink,
  CheckCircle,
  Users,
  TrendingUp,
  DollarSign,
  BarChart3,
  Loader2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Bell,
  BellOff,
} from "lucide-react";
import { CreatorInfoPointer } from "./CreatorInfoPointer";
import { FollowerPointerCard } from "./ui/following-pointer";
import { useZoraProfile, getProfileImageSmall } from "@/hooks/useZoraProfile";
import { truncateAddress } from "@/lib/utils";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useUserBalances } from "@/hooks/useGetBalance";

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

const CreatorRow = ({
  creator,
  index,
}: {
  creator: Creator;
  index: number;
}) => {
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  // const { profile } = useZoraProfile(creator.address);

  const handle = creator.address || creator.handle || "";
  const {
    profile, // from useUserProfile
    balances, // from useUserBalances
    isLoadingBalance, // from useUserBalances
    isBalanceError, // from useUserBalances
    sorted,
    totalVolume,
    totalEarnings,
    totalPosts,
    totalHolders,
    loading,
    isRefetching,
    error,
  } = useUserProfile(handle);

  const handleCopyAddress = async () => {
    await navigator.clipboard.writeText(creator.address);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };
  
  const toggleFollow = () => {
    setIsFollowing(prev => !prev);
    // In a real application, you would call a function to update the followed creators list
    // For example: updateFollowedCreators(creator.address, !isFollowing);
  };
  
  // Get creator profile for the pointer
  const imageUrl =
    profile?.avatar?.previewImage?.small || getProfileImageSmall(profile);

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
        {profile?.displayName ||
          (creator.address ? truncateAddress(creator.address) : "Unknown")}
      </span>
    </div>
  );

  return (
    <FollowerPointerCard title={creatorInfo} className="contents">
      <tr className="border-b border-border transition-colors duration-200 hover:bg-muted/50">
        <td className="px-6 py-4 text-sm align-top">
          <CreatorInfoPointer
            creatorAddress={profile?.handle || profile?.address}
            showLink={true}
            profile={profile}
          />
        </td>
        <td className="px-6 py-4 text-sm align-top">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-500" />
            <span className="font-semibold text-green-600">
              {isLoadingBalance || isRefetching ? (
                <span className="inline-flex items-center gap-1">
                  <Loader2 className="w-3 h-3 text-primary animate-spin" />
                </span>
              ) : (
                formatNumber(totalEarnings)
              )}
            </span>
          </div>
        </td>
        <td className="px-6 py-4 text-sm align-top">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-500" />
            <span className="font-semibold text-blue-600">
              {isLoadingBalance || isRefetching ? (
                <span className="inline-flex items-center gap-1">
                  <Loader2 className="w-3 h-3 text-primary animate-spin" />
                </span>
              ) : (
                formatVolume(totalVolume)
              )}
            </span>
          </div>
        </td>
        <td className="px-6 py-4 text-sm align-top">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="font-semibold text-primary">
              {isLoadingBalance || isRefetching ? (
                <span className="inline-flex items-center gap-1">
                  <Loader2 className="w-3 h-3 text-primary animate-spin" />
                </span>
              ) : (
                totalPosts
              )}
            </span>
            <span className="text-muted-foreground">tokens</span>
          </div>
        </td>
        <td className="px-6 py-4 text-sm align-top">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleFollow}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                isFollowing 
                ? "bg-primary/10 text-primary hover:bg-primary/20" 
                : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
              title={isFollowing ? "Unfollow creator" : "Follow creator for copy trading"}
            >
              {isFollowing ? (
                <>
                  <BellOff className="w-3 h-3" />
                  <span>Unfollow</span>
                </>
              ) : (
                <>
                  <Bell className="w-3 h-3" />
                  <span>Follow</span>
                </>
              )}
            </button>
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

export function CreatorsTable({ creators }: CreatorsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const creatorsPerPage = 20;
  const { loading, refetch, isRefetching } = useUserProfile();

  // Calculate pagination
  const totalPages = Math.ceil(creators.length / creatorsPerPage);
  const startIndex = (currentPage - 1) * creatorsPerPage;
  const endIndex = startIndex + creatorsPerPage;
  const currentCreators = creators.slice(startIndex, endIndex);

  // Pagination handlers
  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const handlePageClick = (page: number) => {
    setCurrentPage(page);
  };

  // Generate page numbers to show
  const getVisiblePages = () => {
    const pages = [];
    const maxVisiblePages = 5;
    const halfVisible = Math.floor(maxVisiblePages / 2);

    let startPage = Math.max(1, currentPage - halfVisible);
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    // Adjust start page if we're near the end
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  };

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
    <>
      <div className="py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              Top Earnings Creators
            </h2>
          </div>
          <button
            disabled={loading || isRefetching}
            onClick={() => {
              refetch();
              console.log("Refetching data...");
            }}
            title="Refresh data"
            className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 ${
                loading || isRefetching ? "animate-spin" : ""
              }`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>
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
                Tokens
              </th>
              <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {currentCreators.map((creator, index) => (
              <CreatorRow
                key={creator.address}
                creator={creator}
                index={startIndex + index}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-border">
          {/* Results info */}
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, creators.length)} of{" "}
            {creators.length} creators
          </div>

          {/* Pagination buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              className="p-2 rounded-md border border-border bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Page numbers */}
            <div className="flex items-center space-x-1">
              {getVisiblePages().map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageClick(page)}
                  className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                    page === currentPage
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border bg-background hover:bg-muted"
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="p-2 rounded-md border border-border bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
