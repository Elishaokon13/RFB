import { useZoraProfile, getProfileImageSmall } from "@/hooks/useZoraProfile";
import { truncateAddress } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

interface CreatorInfoProps {
  creatorAddress?: string;
  showLink?: boolean;
  profile?: any; // Adjust type as needed
}

export function CreatorInfoPointer({
  creatorAddress,
  profile,
  showLink = false,
}: CreatorInfoProps) {
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
      {profile ? (
        <img
          src={profile?.avatar?.medium}
          alt="profile"
          className="w-6 h-6 rounded-full object-cover border border-white/10"
        />
      ) : (
        <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs">
          {truncateAddress(creatorAddress || "Unknown")}
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
