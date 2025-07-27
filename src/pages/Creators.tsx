import { CreatorsTable } from "@/components/CreatorsTable";
import { useCreators } from "@/hooks/useCreators";
import { RefreshCw, Users, DollarSign } from "lucide-react";
import { useState, useMemo } from "react";

export default function CreatorsPage() {
  const { creators, totalCreators, totalCoins, isLoading, error, refetch } =
    useCreators({ count: 200 });
  const [currentPage, setCurrentPage] = useState(1);
  const creatorsPerPage = 20;

  // Calculate pagination
  const totalPages = Math.ceil(creators.length / creatorsPerPage);
  const startIndex = (currentPage - 1) * creatorsPerPage;
  const endIndex = startIndex + creatorsPerPage;
  const currentCreators = creators;

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
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              Top Creators
            </h1>
          </div>
          <p className="text-muted-foreground text-sm sm:text-base">
            Discover the most successful creators on Zora ranked by their total
            earnings from token launches
          </p>
        </div>

        {/* Main Content */}
        <div className="bg-card rounded-xl shadow-sm overflow-hidden">
          <div className="">
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
              <>
                <CreatorsTable creators={currentCreators} />

                {/* Pagination */}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
