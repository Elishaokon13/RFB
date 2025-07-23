import { useZoraProfile, getProfileImageSmall } from "@/hooks/useZoraProfile";
import { truncateAddress } from "@/lib/utils";

interface CreatorInfoProps {
  creatorAddress?: string;
}

export function CreatorInfoPointer({ creatorAddress }: CreatorInfoProps) {
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
      <span className="font-medium">
        {profile?.displayName
          ? isUrl(profile.displayName)
            ? truncateAddress(profile.displayName)
            : profile.displayName
          : truncateAddress(creatorAddress)}
      </span>
    </div>
  );
} 