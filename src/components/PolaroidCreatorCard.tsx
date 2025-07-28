import React from "react";
import { DraggableCardBody, DraggableCardContainer } from "@/components/ui/draggable-card";
import { cn } from "@/lib/utils";
import { Bell, BellOff, DollarSign } from "lucide-react";
import { truncateAddress } from "@/lib/utils";
import { motion } from "framer-motion";

interface CreatorCardProps {
  creator: {
    address: string;
    handle?: string;
    displayName?: string;
    avatar?: string;
    totalEarnings: number;
    totalVolume: number;
    totalPosts?: number;
  };
  isFollowing?: boolean;
  onToggleFollow?: (address: string) => void;
}

// Format large numbers
function formatMoney(num: number): string {
  if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
  return `$${num.toFixed(2)}`;
}

export function PolaroidCreatorCard({ creator, isFollowing = false, onToggleFollow }: CreatorCardProps) {
  const handleToggleFollow = () => {
    if (onToggleFollow) {
      onToggleFollow(creator.address);
    }
  };

  // Generate a random rotation for the Polaroid effect (between -5 and 5 degrees)
  const randomRotation = Math.random() * 10 - 5;

  return (
    <DraggableCardContainer>
      <DraggableCardBody 
        className={cn(
          "p-0 flex flex-col bg-card border-8 border-white dark:border-neutral-800 shadow-xl",
          `rotate-[${randomRotation}deg]`
        )}
      >
        {/* Creator Image */}
        <div className="relative w-full pb-[100%] overflow-hidden bg-muted">
          {creator.avatar ? (
            <img 
              src={creator.avatar} 
              alt={creator.displayName || truncateAddress(creator.address)}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
              <span className="text-4xl font-bold text-primary/30">
                {(creator.displayName || creator.address).slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}
          
          {/* Follow Button - Positioned in the corner */}
          <button
            onClick={handleToggleFollow}
            className={cn(
              "absolute top-3 right-3 p-2 rounded-full transition-colors",
              isFollowing 
                ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                : "bg-muted/80 backdrop-blur-sm text-muted-foreground hover:bg-muted"
            )}
          >
            {isFollowing ? (
              <BellOff className="w-4 h-4" />
            ) : (
              <Bell className="w-4 h-4" />
            )}
          </button>
        </div>
        
        {/* Creator Info */}
        <div className="p-4 flex flex-col">
          <h3 className="font-medium text-lg truncate">
            {creator.displayName || truncateAddress(creator.address)}
          </h3>
          
          <p className="text-sm text-muted-foreground mb-2">
            {creator.handle ? `@${creator.handle}` : truncateAddress(creator.address)}
          </p>
          
          <div className="flex items-center gap-1 mt-1">
            <DollarSign className="w-4 h-4 text-green-600" />
            <span className="font-semibold text-green-600">
              {formatMoney(creator.totalEarnings)}
            </span>
          </div>
          
          {creator.totalPosts && (
            <p className="text-xs text-muted-foreground mt-1">
              {creator.totalPosts} tokens
            </p>
          )}
          
          {/* Polaroid "Tape" Effect */}
          <motion.div
            initial={{ opacity: 0.7 }}
            whileHover={{ opacity: 1 }}
            className="absolute top-[-5px] left-[50%] w-16 h-6 bg-neutral-200/70 dark:bg-neutral-700/50 transform -translate-x-1/2 rotate-2 blur-[0.5px]"
          />
        </div>
      </DraggableCardBody>
    </DraggableCardContainer>
  );
} 