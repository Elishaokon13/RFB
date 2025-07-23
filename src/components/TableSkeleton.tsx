import { cn } from "@/lib/utils";

export function TableSkeleton({
  rows = 10,
  columns = 7,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn("w-full overflow-x-auto bg-card rounded-lg border border-border", className)}>
      <table className="min-w-[800px] w-full">
        <TableHeaderSkeleton columns={columns} />
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <TokenTableRowSkeleton key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TableHeaderSkeleton({ columns = 7 }: { columns?: number }) {
  return (
    <thead className="bg-muted border-b border-border">
      <tr className="text-left">
        {Array.from({ length: columns }).map((_, i) => (
          <th key={i} className="px-4 py-3">
            <div className="h-4 w-16 bg-muted-foreground/20 rounded animate-pulse"></div>
          </th>
        ))}
      </tr>
    </thead>
  );
}

export function TokenTableRowSkeleton({ columns = 7 }: { columns?: number }) {
  return (
    <tr className="border-b border-border">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className={cn(
            "h-4 bg-muted-foreground/20 rounded animate-pulse",
            i === 0 ? "w-6" : i === 1 ? "w-32" : "w-16"
          )}></div>
        </td>
      ))}
    </tr>
  );
} 