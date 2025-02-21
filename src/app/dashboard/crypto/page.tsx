'use client';
import { useEffect, useState } from 'react';
import { CryptoIcon } from '@/components/ui/CryptoIcon';

interface CryptoData {
  [key: string]: {
    usd: number;
    usd_24h_change: number;
  };
}

const cryptoNames: { [key: string]: string } = {
  'bitcoin': 'Bitcoin',
  'ethereum': 'Ethereum',
  'ripple': 'XRP',
  'dogecoin': 'Dogecoin',
  'cardano': 'Cardano',
  'solana': 'Solana',
  'polkadot': 'Polkadot',
  'avalanche-2': 'Avalanche',
  'chainlink': 'Chainlink',
  'matic-network': 'Polygon'
};

export default function CryptoPage() {
  const [cryptoData, setCryptoData] = useState<CryptoData | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const response = await fetch('/api/crypto');
      const data = await response.json();
      setCryptoData(data);
    };

    fetchData();
    const interval = setInterval(fetchData, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  if (!cryptoData) return <div>Loading...</div>;

  return (
    <div className="p-6 mt-10">
      <h1 className="text-2xl font-bold mb-6">Cryptocurrency Prices</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(cryptoData).map(([crypto, data]) => {
          if (!data?.usd) return null; // Skip if data is invalid
          return (
            <div key={crypto} className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center gap-2">
                <CryptoIcon symbol={crypto} />
                <h2 className="text-xl font-semibold capitalize">{cryptoNames[crypto] || crypto}</h2>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold">${data.usd.toFixed(2)}</p>
                <p className={`text-sm ${data.usd_24h_change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {data.usd_24h_change?.toFixed(2) || '0.00'}% (24h)
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
