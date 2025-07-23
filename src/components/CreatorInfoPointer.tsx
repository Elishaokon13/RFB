import { useZoraProfile, getProfileImageSmall } from "@/hooks/useZoraProfile";
import { truncateAddress } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

interface CreatorInfoProps {
  creatorAddress?: string;
  showLink?: boolean;
}

export function CreatorInfoPointer({ creatorAddress, showLink = false }: CreatorInfoProps) {
  const { profile, loading, error } = useZoraProfile(creatorAddress || "");

  if (!creatorAddress) {
    return <div className="flex items-center gap-2">No creator info</div>;
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-full animate-pulse bg-gray-300"></div>
        <span>Loading...</span>
      </div>
    );
  }

  // Prefer avatar.previewImage.small if available, else fallback
  const imageUrl = profile?.avatar?.previewImage?.small || getProfileImageSmall(profile);

  // Helper to check if displayName is a URL
  const isUrl = (str?: string) => {
    if (!str) return false;
    try {
      new URL(str);
      return true;
    } catch {
      return false;
    }
  };

  const displayName = profile?.displayName
    ? isUrl(profile.displayName)
      ? truncateAddress(profile.displayName)
      : profile.displayName
    : truncateAddress(creatorAddress);

  const zoraUrl = `https://zora.co/${profile?.handle || creatorAddress}`;

  return (
    <div className="flex items-center gap-2">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt="profile"
          className="w-6 h-6 rounded-full object-cover border border-white/10"
        />
      ) : (
        <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs">
          {creatorAddress.slice(2, 4).toUpperCase()}
        </div>
      )}
      <div className="flex items-center gap-1">
        <span className="font-medium">{displayName}</span>
        {showLink && (
          <a
            href={zoraUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 hover:bg-muted rounded transition-colors"
            title="View on Zora"
          >
            <ExternalLink className="w-3 h-3 text-muted-foreground" />
          </a>
        )}
      </div>
    </div>
  );
} 