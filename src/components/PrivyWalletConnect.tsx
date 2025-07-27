import { usePrivy } from '@privy-io/react-auth';
import { Button } from '@/components/ui/button';
import { Wallet, LogOut, Copy, Check, ExternalLink, User } from 'lucide-react';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function PrivyWalletConnect() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const [copied, setCopied] = useState(false);

  // Don't render anything until Privy is ready
  if (!ready) {
    return (
      <div className="relative">
        <Button 
          variant="outline" 
          size="sm" 
          disabled
          className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-400 cursor-not-allowed"
        >
          <div className="w-4 h-4 mr-2 animate-pulse rounded-full bg-gray-300 dark:bg-gray-600" />
          Loading...
        </Button>
      </div>
    );
  }

  // If not authenticated, show login button
  if (!authenticated) {
    return (
      <div className="relative">
        <Button 
          onClick={login}
          className="bg-primary hover:bg-primary/90 text-primary-foreground border-0 shadow-md hover:shadow-lg transition-all duration-200"
          size="sm"
        >
          <Wallet className="w-4 h-4 mr-2" />
          Connect Wallet
        </Button>
      </div>
    );
  }

  // Get wallet address
  const walletAddress = user?.wallet?.address;
  const truncatedAddress = walletAddress 
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : 'Unknown';

  const handleCopyAddress = async () => {
    if (walletAddress) {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="bg-primary/5 dark:bg-primary/10 border-primary/20 dark:border-primary/30 text-primary dark:text-primary hover:bg-primary/10 dark:hover:bg-primary/20 transition-all duration-200 shadow-sm hover:shadow-md"
        >
          <div className="flex items-center">
            <div className="w-2 h-2 bg-primary rounded-full mr-2 animate-pulse" />
            <Wallet className="w-4 h-4 mr-2" />
            {truncatedAddress}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50 shadow-xl">
        <DropdownMenuLabel className="text-gray-900 dark:text-white font-semibold">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4" />
            My Account
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-gray-200/50 dark:bg-gray-700/50" />
        
        {/* User Info */}
        <div className="px-3 py-3 bg-gray-50/50 dark:bg-gray-800/50 mx-2 rounded-lg mb-2">
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
            {user?.email?.address || 'Wallet User'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
            {truncatedAddress}
          </p>
        </div>
        
        <DropdownMenuSeparator className="bg-gray-200/50 dark:bg-gray-700/50" />
        
        {/* Copy Address */}
        <DropdownMenuItem 
          onClick={handleCopyAddress}
          className="hover:bg-primary/5 dark:hover:bg-primary/10 text-gray-700 dark:text-gray-300 cursor-pointer"
        >
          <div className="flex items-center">
            {copied ? (
              <Check className="w-4 h-4 mr-2 text-green-500" />
            ) : (
              <Copy className="w-4 h-4 mr-2" />
            )}
            {copied ? 'Address Copied!' : 'Copy Address'}
          </div>
        </DropdownMenuItem>
        
        {/* View on Explorer */}
        <DropdownMenuItem asChild>
          <a
            href={`https://basescan.org/address/${walletAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center hover:bg-primary/5 dark:hover:bg-primary/10 text-gray-700 dark:text-gray-300 cursor-pointer"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View on Basescan
          </a>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator className="bg-gray-200/50 dark:bg-gray-700/50" />
        
        {/* Logout */}
        <DropdownMenuItem 
          onClick={logout} 
          className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Disconnect Wallet
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 