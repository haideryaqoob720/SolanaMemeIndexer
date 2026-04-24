import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getMint } from '@solana/spl-token';

const connection = new Connection('https://api.mainnet-beta.solana.com');

export async function getSolanaTokenData(tokenAddress: string) {
  try {
    const mintPublicKey = new PublicKey(tokenAddress);
    const mintInfo = await getMint(connection, mintPublicKey);

    return {
      supply: mintInfo.supply.toString(),
      decimals: mintInfo.decimals,
    };
  } catch (error) {
    console.error('Error fetching Solana token data:', error);
    throw error;
  }
}