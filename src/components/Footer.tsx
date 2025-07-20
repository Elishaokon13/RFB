import { useState } from 'react';
import { pay } from '@base-org/account';

export function Footer() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleDonate = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const result = await pay({
        amount: '1.00',
        to: '0x1234567890123456789012345678901234567890', // Replace with your address
        testnet: true,
      });
      if ('error' in result) {
        setMessage('Payment failed: ' + result.error);
      } else {
        setMessage('Thank you for your donation! Payment ID: ' + result.id);
      }
    } catch (err: unknown) {
      setMessage('Payment error: ' + (typeof err === 'string' ? err : (err instanceof Error ? err.message : 'Unknown error')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="h-16 bg-background border-t border-border flex items-center justify-between px-6 fixed bottom-0 left-0 right-0 z-50">
      <div className="flex items-center gap-4">
        <button
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition disabled:opacity-50"
          onClick={handleDonate}
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Donate'}
        </button>
        {message && (
          <span className="ml-4 text-sm text-muted-foreground">{message}</span>
        )}
      </div>
      <div className="text-sm text-muted-foreground">
        Built with <span className="text-red-500">❤️</span> and <span className="text-blue-500">🎶</span>
      </div>
    </footer>
  );
} 