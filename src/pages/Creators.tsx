import { CreatorsTable } from "@/components/CreatorsTable";
import { useCreators } from "@/hooks/useCreators";
import { RefreshCw, Users, Bell, Settings, AlertCircle, X, LayoutGrid, List } from "lucide-react";
import { useState, useMemo } from "react";
import CreatorMonitoringSettings from "@/components/CreatorMonitoringSettings";
import TelegramConnectSettings from "@/components/TelegramConnectSettings";
import { usePrivy } from '@privy-io/react-auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { PolaroidCreatorCard } from "@/components/PolaroidCreatorCard";
import { cn } from "@/lib/utils";

type ViewMode = "table" | "cards";

export default function CreatorsPage() {
  const { creators, totalCreators, totalCoins, isLoading, error, refetch } =
    useCreators({ count: 200 });
  const [currentPage, setCurrentPage] = useState(1);
  const creatorsPerPage = 20;
  const { user, authenticated } = usePrivy();
  const [showNotificationTip, setShowNotificationTip] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [followedCreators, setFollowedCreators] = useState<string[]>([]);

  // Calculate pagination
  const totalPages = Math.ceil(creators.length / creatorsPerPage);
  const startIndex = (currentPage - 1) * creatorsPerPage;
  const endIndex = startIndex + creatorsPerPage;
  const currentCreators = creators.slice(startIndex, endIndex);

  // Calculate total earnings across all creators
  const totalEarnings = useMemo(() => {
    return creators.reduce((sum, creator) => sum + creator.totalEarnings, 0);
  }, [creators]);

  // Calculate total volume across all creators
  const totalVolume = useMemo(() => {
    return creators.reduce((sum, creator) => sum + creator.totalVolume, 0);
  }, [creators]);

  // Format large numbers
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
    return `$${num.toFixed(2)}`;
  };

  // Toggle follow state for a creator
  const handleToggleFollow = (address: string) => {
    setFollowedCreators(prev => {
      if (prev.includes(address)) {
        return prev.filter(a => a !== address);
      } else {
        return [...prev, address];
      }
    });
  };

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of the table
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header with Notification Action */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                Top Creators
              </h1>
            </div>
            
            {/* Copy Trade Button */}
            {authenticated ? (
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2 border-primary/20 hover:bg-primary/10 hover:text-primary"
                  >
                    <Bell className="w-4 h-4" />
                    <span className="hidden sm:inline">Copy Trade</span>
                    <Badge variant="secondary" className="h-5 px-1.5">New</Badge>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden">
                  <DialogHeader className="px-6 pt-6 pb-2">
                    <DialogTitle>Copy Trade Settings</DialogTitle>
                    <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                      <X className="h-4 w-4" />
                      <span className="sr-only">Close</span>
                    </DialogClose>
                  </DialogHeader>
                  
                  {/* Copy Trade Settings Tabs */}
                  <div className="px-1">
                    <Tabs defaultValue="app" className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="app" className="text-sm">In-App Alerts</TabsTrigger>
                        <TabsTrigger value="telegram" className="text-sm">Telegram Alerts</TabsTrigger>
                      </TabsList>
                      <TabsContent value="app" className="p-5 pt-6">
                        <CreatorMonitoringSettings />
                      </TabsContent>
                      <TabsContent value="telegram" className="p-5 pt-6">
                        <TelegramConnectSettings />
                      </TabsContent>
                    </Tabs>
                  </div>
                </DialogContent>
              </Dialog>
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2 border-primary/20 hover:bg-primary/10 hover:text-primary"
                disabled
              >
                <Bell className="w-4 h-4" />
                <span className="hidden sm:inline">Copy Trade</span>
                <Badge variant="outline" className="h-5 px-1.5 opacity-50">Login Required</Badge>
              </Button>
            )}
          </div>
          
          <p className="text-muted-foreground text-sm sm:text-base mb-3">
            Discover the most successful creators on Zora ranked by their total
            earnings from token launches
          </p>
          
          {/* View Toggle - Now underneath the text and left-aligned */}
          <div className="flex items-center justify-start bg-muted/50 p-1 rounded-lg w-fit">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "gap-1.5 rounded",
                viewMode === "table" && "bg-card shadow-sm"
              )}
              onClick={() => setViewMode("table")}
            >
              <List className="w-4 h-4" />
              <span className="text-xs">Table</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "gap-1.5 rounded",
                viewMode === "cards" && "bg-card shadow-sm"
              )}
              onClick={() => setViewMode("cards")}
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="text-xs">Cards</span>
            </Button>
          </div>
          
          {/* Notification Tip */}
          <AnimatePresence>
            {!authenticated && showNotificationTip && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-3"
              >
                <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="p-1.5 bg-primary/10 rounded-full mt-0.5">
                    <Bell className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium mb-1 text-foreground">Copy trade your favorite creators</h4>
                    <p className="text-xs text-muted-foreground">
                      Connect your wallet to copy trade when your favorite creators mint or interact with tokens.
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6" 
                    onClick={() => setShowNotificationTip(false)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Creators Content - Table or Card View */}
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Loading creators...</span>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg max-w-md mx-auto">
              <p className="text-red-800 font-medium mb-2">
                Error loading data
              </p>
              <p className="text-red-600 text-sm">{error.toString()}</p>
            </div>
          </div>
        ) : (
          <div className="w-full">
            <AnimatePresence mode="wait">
              {viewMode === "table" ? (
                <motion.div
                  key="table-view"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="bg-card rounded-xl shadow-sm overflow-hidden"
                >
                  <CreatorsTable creators={currentCreators} />
                </motion.div>
              ) : (
                <motion.div
                  key="card-view"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 py-6">
                    {currentCreators.map((creator) => (
                      <div key={creator.address} className="flex justify-center">
                        <PolaroidCreatorCard 
                          creator={creator} 
                          isFollowing={followedCreators.includes(creator.address)}
                          onToggleFollow={handleToggleFollow}
                        />
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center mt-8 gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <X className="w-4 h-4 rotate-45" />
                </Button>
                {getPageNumbers().map((page, idx) => (
                  page === "..." ? (
                    <span key={`ellipsis-${idx}`} className="px-3 py-2">...</span>
                  ) : (
                    <Button
                      key={`page-${page}`}
                      variant={page === currentPage ? "default" : "outline"}
                      onClick={() => handlePageChange(page as number)}
                      className="min-w-[40px]"
                    >
                      {page}
                    </Button>
                  )
                ))}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  <X className="w-4 h-4 rotate-[225deg]" />
                </Button>
              </div>
            )}
          </div>
        )}
        
        {/* Additional Quick Access Copy Trade Button for Mobile */}
        {authenticated && (
          <div className="md:hidden fixed bottom-6 right-6">
            <Dialog>
              <DialogTrigger asChild>
                <Button 
                  size="icon" 
                  className="h-12 w-12 rounded-full shadow-lg shadow-primary/20"
                >
                  <Bell className="h-5 w-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-2">
                  <DialogTitle>Copy Trade Settings</DialogTitle>
                  <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                  </DialogClose>
                </DialogHeader>
                
                {/* Copy Trade Settings Tabs */}
                <div className="px-1">
                  <Tabs defaultValue="app" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="app" className="text-sm">In-App Alerts</TabsTrigger>
                      <TabsTrigger value="telegram" className="text-sm">Telegram Alerts</TabsTrigger>
                    </TabsList>
                    <TabsContent value="app" className="p-5 pt-6">
                      <CreatorMonitoringSettings />
                    </TabsContent>
                    <TabsContent value="telegram" className="p-5 pt-6">
                      <TelegramConnectSettings />
                    </TabsContent>
                  </Tabs>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </div>
  );
}
