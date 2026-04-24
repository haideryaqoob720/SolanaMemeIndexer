import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import { getAuthToken } from '../utils/auth';

interface TokenMetricsProps {
  tokenId: string;
}

interface MetricsData {
  totalSupply: number;
  holders: number;
  volume24h: number;
  marketCap: number;
}

const TokenMetrics: React.FC<TokenMetricsProps> = ({ tokenId }) => {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await axios.get(`/api/tokens/${tokenId}/metrics`, {
          headers: { Authorization: `Bearer ${getAuthToken()}` }
        });
        setMetrics(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
        setError('Failed to load metrics');
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [tokenId]);

  if (loading) return <div>Loading metrics...</div>;
  if (error) return <div>{error}</div>;
  if (!metrics) return null;

  return (
    <div className="token-metrics">
      <h3>Token Metrics</h3>
      <div className="metrics-grid">
        <div className="metric-item">
          <h4>Total Supply</h4>
          <p>{metrics.totalSupply.toLocaleString()}</p>
        </div>
        <div className="metric-item">
          <h4>Holders</h4>
          <p>{metrics.holders.toLocaleString()}</p>
        </div>
        <div className="metric-item">
          <h4>24h Volume</h4>
          <p>${metrics.volume24h.toLocaleString()}</p>
        </div>
        <div className="metric-item">
          <h4>Market Cap</h4>
          <p>${metrics.marketCap.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};

export default TokenMetrics;