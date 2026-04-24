import axios from 'axios';
import { config } from '../config';

export interface TokenData {
  id: number;
  created_at: string;
  mint: string;
  name: string;
  uri: string | null;
  symbol: string;
  socials: any;
  top10holderEquity: number;
  creatorEquity: number;
  totalSupply: number;
  lpBurned: boolean;
  lpBurnedAmount: number;
  mintable: boolean;
  freezeable: boolean;
  tax: number | null;
  liquidityLock: boolean;
  bondingCurveVault: string | null;
  creator: string;
  bondingProgress: number;
  marketCap: number;
  reserveSol: number;
  reserveToken: number;
  status: string;
  buyCount: number;
  sellCount: number;
  totalHolders: number;
}

export interface PaginatedResponse {
  tokens: TokenData[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

export async function getTokens(
  page: number = 1, 
  pageSize: number = 100,
  filters: Record<string, any> = {}
): Promise<PaginatedResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
    ...filters
  });

  try {
    const token = localStorage.getItem('authToken');
    console.log(`Fetching tokens from: ${config.apiUrl}/tokens with params:`, params.toString());
    console.log('Auth token used for fetching tokens:', token ? 'Token exists' : 'No token found');
    
    const response = await axios.get(`${config.apiUrl}/tokens?${params}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('API response status:', response.status);
    return response.data;
  } catch (error) {
    console.error('Error fetching tokens:', error);
    throw error;
  }
}

export async function getTokenDetail(mint: string): Promise<TokenData> {
  try {
    const token = localStorage.getItem('authToken'); // Changed from 'token' to 'authToken'
    console.log('Auth token used for fetching token details:', token ? 'Token exists' : 'No token found');
    const response = await axios.get(`${config.apiUrl}/tokens/${mint}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching token details:', error);
    throw error;
  }
}