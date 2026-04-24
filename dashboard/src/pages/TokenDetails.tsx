import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { getAuthToken } from '../utils/auth';

interface TokenDetailsType {
  id: number;
  created_at: string;
  mint: string;
  name: string | null;
  uri: string | null;
  symbol: string | null;
  socials: any;
  top10holderEquity: number | null;
  creatorEquity: number | null;
  totalSupply: number | null;
  lpBurned: boolean | null;
  lpBurnedAmount: number | null;
  mintable: boolean | null;
  freezeable: boolean | null;
  tax: number | null;
  liquidityLock: boolean | null;
  bondingCurveVault: string | null;
  creator: string | null;
  bondingProgress: number | null;
  marketCap: number | null;
  reserveSol: number | null;
  reserveToken: number | null;
  status: number;
  buyCount: number | null;
  sellCount: number | null;
  totalHolders: number | null;
}

interface InfoItemProps {
  label: string;
  value: string;
}

const InfoItem: React.FC<InfoItemProps> = ({ label, value }) => (
  <div style={itemStyle}>
    <h4 style={labelStyle}>{label}</h4>
    <p style={valueStyle}>{value}</p>
  </div>
);

const TokenDetails: React.FC = (): JSX.Element => {
  const { id } = useParams<{ id: string }>();
  const [token, setToken] = useState<TokenDetailsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTokenData = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/tokens/${id}`, {
          headers: { Authorization: `Bearer ${getAuthToken()}` }
        });
        setToken(response.data);
      } catch (err) {
        console.error('Failed to fetch token details:', err);
        setError('Failed to load token details');
      } finally {
        setLoading(false);
      }
    };

    fetchTokenData();
  }, [id]);

  const formatNumber = (value: number | null): string => {
    if (value === null || value === undefined) return 'N/A';
    return value.toLocaleString();
  };

  const formatCurrency = (value: number | null): string => {
    if (value === null || value === undefined) return 'N/A';
    return `$${value.toLocaleString()}`;
  };

  const formatBoolean = (value: boolean | null): string => {
    if (value === null || value === undefined) return 'N/A';
    return value ? 'Yes' : 'No';
  };

  if (loading) return <div style={containerStyle}>Loading...</div>;
  if (error) return <div style={containerStyle}>{error}</div>;
  if (!token) return <div style={containerStyle}>Token not found</div>;

  return (
    <div style={containerStyle}>
      <h2 style={titleStyle}>Token Details</h2>
      <div style={gridStyle}>
        <InfoItem label="Name" value={token.name || 'N/A'} />
        <InfoItem label="Symbol" value={token.symbol || 'N/A'} />
        <InfoItem label="Mint Address" value={token.mint} />
        <InfoItem label="Total Supply" value={formatNumber(token.totalSupply)} />
        <InfoItem label="Market Cap" value={formatCurrency(token.marketCap)} />
        <InfoItem label="Creator" value={token.creator || 'N/A'} />
        <InfoItem label="Total Holders" value={formatNumber(token.totalHolders)} />
        <InfoItem label="Buy Count" value={formatNumber(token.buyCount)} />
        <InfoItem label="Sell Count" value={formatNumber(token.sellCount)} />
        <InfoItem label="LP Burned" value={formatBoolean(token.lpBurned)} />
        <InfoItem label="LP Burned Amount" value={formatNumber(token.lpBurnedAmount)} />
        <InfoItem label="Mintable" value={formatBoolean(token.mintable)} />
        <InfoItem label="Freezeable" value={formatBoolean(token.freezeable)} />
        <InfoItem label="Liquidity Lock" value={formatBoolean(token.liquidityLock)} />
        <InfoItem label="Top 10 Holder Equity" value={formatNumber(token.top10holderEquity)} />
        <InfoItem label="Creator Equity" value={formatNumber(token.creatorEquity)} />
        <InfoItem label="Bonding Progress" value={formatNumber(token.bondingProgress)} />
        <InfoItem label="Reserve SOL" value={formatNumber(token.reserveSol)} />
        <InfoItem label="Reserve Token" value={formatNumber(token.reserveToken)} />
      </div>
    </div>
  );
};

// Styles
const containerStyle: React.CSSProperties = {
  padding: '20px',
  maxWidth: '1200px',
  margin: '0 auto',
  backgroundColor: '#1a1a1a',
  minHeight: '100vh',
  color: '#ffffff',
};

const titleStyle: React.CSSProperties = {
  color: '#DDB06F',
  marginBottom: '24px',
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
  gap: '20px',
  marginTop: '20px',
};

const itemStyle: React.CSSProperties = {
  backgroundColor: '#252525',
  padding: '15px',
  borderRadius: '8px',
  border: '1px solid #333',
};

const labelStyle: React.CSSProperties = {
  color: '#DDB06F',
  margin: '0 0 8px 0',
  fontSize: '1rem',
};

const valueStyle: React.CSSProperties = {
  color: '#ffffff',
  margin: '0',
  fontSize: '1.1rem',
  wordBreak: 'break-all',
};

export default TokenDetails;