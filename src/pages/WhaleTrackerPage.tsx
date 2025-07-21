import React, { useState } from 'react';
import { WhaleTracker } from '../components/WhaleTracker';
import { Footer } from '../components/Footer';

export default function WhaleTrackerPage() {
  const [tokenAddress, setTokenAddress] = useState('');
  const [submittedAddress, setSubmittedAddress] = useState('');

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex flex-1">
        <main className="flex-1 p-8 pb-24">
          <h1 className="text-3xl font-bold mb-6">Whale Tracker</h1>
          <div className="mb-6 flex items-center gap-2">
            <input
              className="border rounded px-3 py-2 w-[400px]"
              placeholder="Enter ERC20/721/1155 Token Address..."
              value={tokenAddress}
              onChange={e => setTokenAddress(e.target.value)}
            />
            <button
              className="bg-primary text-white px-4 py-2 rounded disabled:opacity-50"
              disabled={!tokenAddress}
              onClick={() => setSubmittedAddress(tokenAddress)}
            >
              Track
            </button>
          </div>
          {submittedAddress && <WhaleTracker tokenAddress={submittedAddress} />}
          {!submittedAddress && (
            <div className="text-muted-foreground mt-8">Enter a token address above to start tracking whales and top holders.</div>
          )}
        </main>
      </div>
      <Footer />
    </div>
  );
} 