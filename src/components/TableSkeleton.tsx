import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  className?: string;
}

export function TableSkeleton({ 
  rows = 10, 
  columns = 7, 
  showHeader = true,
  className = "" 
}: TableSkeletonProps) {
  return (
    <div className={`overflow-auto ${className}`}>
      <table className="w-full">
        {showHeader && (
          <thead className="bg-muted border-b border-border">
            <tr className="text-left">
              {Array.from({ length: columns }, (_, i) => (
                <th key={i} className="px-2 sm:px-4 py-3">
                  <Skeleton className="h-4 w-16 sm:w-20" />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {Array.from({ length: rows }, (_, rowIndex) => (
            <tr
              key={rowIndex}
              className={`border-b border-border ${
                rowIndex % 2 === 0 ? "bg-card" : "bg-background"
              }`}
            >
              {Array.from({ length: columns }, (_, colIndex) => (
                <td key={colIndex} className="px-2 sm:px-4 py-3">
                  {colIndex === 0 ? (
                    // First column - token info with image
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-20 sm:w-24" />
                        <Skeleton className="h-3 w-12 sm:w-16" />
                      </div>
                    </div>
                  ) : colIndex === 1 ? (
                    // Second column - price
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-16 sm:w-20" />
                      <Skeleton className="h-3 w-12 sm:w-16" />
                    </div>
                  ) : colIndex === 2 ? (
                    // Third column - age
                    <Skeleton className="h-4 w-8 sm:w-12" />
                  ) : colIndex === 3 ? (
                    // Fourth column - volume (hidden on mobile)
                    <Skeleton className="h-4 w-12 sm:w-16" />
                  ) : colIndex === 4 ? (
                    // Fifth column - market cap
                    <Skeleton className="h-4 w-16 sm:w-20" />
                  ) : colIndex === 5 ? (
                    // Sixth column - creator (hidden on mobile/tablet)
                    <Skeleton className="h-4 w-20 sm:w-24" />
                  ) : (
                    // Other columns
                    <Skeleton className="h-4 w-20 sm:w-24" />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Specific skeleton for token table rows
export function TokenTableRowSkeleton() {
  return (
    <tr className="border-b border-border hover:bg-muted/50 transition-colors">
      <td className="px-2 sm:px-4 py-3">
        <Skeleton className="h-4 w-8" />
      </td>
      <td className="px-2 sm:px-4 py-3">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-20 sm:w-24" />
            <Skeleton className="h-3 w-12 sm:w-16" />
          </div>
        </div>
      </td>
      <td className="px-2 sm:px-4 py-3">
        <div className="space-y-1">
          <Skeleton className="h-4 w-16 sm:w-20" />
          <Skeleton className="h-3 w-12 sm:w-16" />
        </div>
      </td>
      <td className="px-2 sm:px-4 py-3">
        <Skeleton className="h-4 w-8 sm:w-12" />
      </td>
      <td className="px-2 sm:px-4 py-3">
        <Skeleton className="h-4 w-12 sm:w-16" />
      </td>
      <td className="px-2 sm:px-4 py-3">
        <Skeleton className="h-4 w-16 sm:w-20" />
      </td>
      <td className="px-2 sm:px-4 py-3">
        <Skeleton className="h-4 w-20 sm:w-24" />
      </td>
    </tr>
  );
}

// Skeleton for table header
export function TableHeaderSkeleton() {
  return (
    <thead className="bg-muted border-b border-border">
      <tr className="text-left">
        <th className="px-2 sm:px-4 py-3">
          <Skeleton className="h-4 w-8" />
        </th>
        <th className="px-2 sm:px-4 py-3">
          <Skeleton className="h-4 w-12 sm:w-16" />
        </th>
        <th className="px-2 sm:px-4 py-3">
          <Skeleton className="h-4 w-8 sm:w-12" />
        </th>
        <th className="px-2 sm:px-4 py-3">
          <Skeleton className="h-4 w-6 sm:w-8" />
        </th>
        <th className="px-2 sm:px-4 py-3">
          <Skeleton className="h-4 w-8 sm:w-12" />
        </th>
        <th className="px-2 sm:px-4 py-3">
          <Skeleton className="h-4 w-8 sm:w-12" />
        </th>
        <th className="px-2 sm:px-4 py-3">
          <Skeleton className="h-4 w-12 sm:w-16" />
        </th>
      </tr>
    </thead>
  );
} 