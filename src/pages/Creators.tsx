import { CreatorsTable } from '@/components/TokenTable';
import { useTokenFeed } from '@/hooks/useTokenFeed';
import { RefreshCw } from 'lucide-react';

export default function CreatorsPage() {
  const { coins, isLoading, error, refetchAll } = useTokenFeed('Most Valuable');

  return (
    <div className="flex-1 bg-background p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Creators</h1>
          <p className="text-muted-foreground text-sm">Explore all unique creators and the number of tokens they've launched on Base.</p>
        </div>
        <button
          onClick={refetchAll}
          disabled={isLoading}
          className="flex items-center gap-1 px-3 py-1 bg-muted rounded-lg text-sm text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={isLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>
      <div className="bg-card border border-border rounded-lg p-6">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Loading creators...</span>
            </div>
          </div>
        ) : error ? (
          <div className="text-center text-red-500">{error}</div>
        ) : (
          <CreatorsTable coins={coins} />
        )}
      </div>
    </div>
  );
} 