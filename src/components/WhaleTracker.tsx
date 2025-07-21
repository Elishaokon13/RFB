import React, { useState } from 'react';
import { useTokenWhaleTracker } from '../hooks/useTokenWhaleTracker';

export function WhaleTracker({ tokenAddress }: { tokenAddress: string }) {
  const [input, setInput] = useState('');
  const {
    holders,
    transfers,
    loading,
    error,
    followWhale,
    followed,
    followedTrades
  } = useTokenWhaleTracker({ tokenAddress });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Top Holders / Whale Tracker</h2>
      <div className="mb-6">
        <input
          className="border rounded px-2 py-1 mr-2"
          placeholder="Follow whale address..."
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <button
          className="bg-primary text-white px-3 py-1 rounded"
          onClick={() => followWhale(input)}
          disabled={!input}
        >
          Follow
        </button>
        {followed && (
          <span className="ml-4 text-sm">Following: <span className="font-mono">{followed}</span></span>
        )}
      </div>
      {loading && <div className="py-8 text-center animate-pulse">Loading whale data...</div>}
      {error && <div className="py-8 text-center text-red-500">Error: {error}</div>}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-2">Top Holders</h3>
        <table className="w-full border rounded mb-4">
          <thead>
            <tr className="bg-muted">
              <th className="px-2 py-1 text-left">#</th>
              <th className="px-2 py-1 text-left">Address</th>
              <th className="px-2 py-1 text-left">Balance</th>
              <th className="px-2 py-1 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {holders.map((h, i) => (
              <tr key={h.address} className="border-b hover:bg-muted/50">
                <td className="px-2 py-1">{i + 1}</td>
                <td className="px-2 py-1 font-mono">{h.address.slice(0, 6)}...{h.address.slice(-4)}</td>
                <td className="px-2 py-1">{h.balance.toString()}</td>
                <td className="px-2 py-1">
                  <button className="text-xs underline mr-2" onClick={() => navigator.clipboard.writeText(h.address)}>Copy</button>
                  <a className="text-xs underline mr-2" href={`https://basescan.org/address/${h.address}`} target="_blank" rel="noopener noreferrer">Explorer</a>
                  <button className="text-xs underline" onClick={() => followWhale(h.address)}>Follow</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-2">Recent Transfers</h3>
        <div className="overflow-x-auto">
          <table className="w-full border rounded">
            <thead>
              <tr className="bg-muted">
                <th className="px-2 py-1 text-left">From</th>
                <th className="px-2 py-1 text-left">To</th>
                <th className="px-2 py-1 text-left">Value</th>
                <th className="px-2 py-1 text-left">Block</th>
                <th className="px-2 py-1 text-left">Tx</th>
              </tr>
            </thead>
            <tbody>
              {transfers.slice(0, 50).map((t, i) => (
                <tr key={t.txHash + i} className="border-b hover:bg-muted/50">
                  <td className="px-2 py-1 font-mono">{t.from.slice(0, 6)}...{t.from.slice(-4)}</td>
                  <td className="px-2 py-1 font-mono">{t.to.slice(0, 6)}...{t.to.slice(-4)}</td>
                  <td className="px-2 py-1">{t.value.toString()}</td>
                  <td className="px-2 py-1">{t.blockNumber}</td>
                  <td className="px-2 py-1">
                    <a className="text-xs underline" href={`https://basescan.org/tx/${t.txHash}`} target="_blank" rel="noopener noreferrer">View</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {followed && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-2">Recent Trades for Whale</h3>
          <div className="overflow-x-auto">
            <table className="w-full border rounded">
              <thead>
                <tr className="bg-muted">
                  <th className="px-2 py-1 text-left">From</th>
                  <th className="px-2 py-1 text-left">To</th>
                  <th className="px-2 py-1 text-left">Value</th>
                  <th className="px-2 py-1 text-left">Block</th>
                  <th className="px-2 py-1 text-left">Tx</th>
                </tr>
              </thead>
              <tbody>
                {followedTrades.map((t, i) => (
                  <tr key={t.txHash + i} className="border-b hover:bg-muted/50">
                    <td className="px-2 py-1 font-mono">{t.from.slice(0, 6)}...{t.from.slice(-4)}</td>
                    <td className="px-2 py-1 font-mono">{t.to.slice(0, 6)}...{t.to.slice(-4)}</td>
                    <td className="px-2 py-1">{t.value.toString()}</td>
                    <td className="px-2 py-1">{t.blockNumber}</td>
                    <td className="px-2 py-1">
                      <a className="text-xs underline" href={`https://basescan.org/tx/${t.txHash}`} target="_blank" rel="noopener noreferrer">View</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
} 