import { TxAnalytics } from "../redis/txAnalytics";

export async function addTxToAnalytics(
  mint: string,
  isBuy: boolean,
  dex: string,
  created_at: string,
  txAnalyticsCache: TxAnalytics
) {
  try {
    
    await txAnalyticsCache.saveAnalytics(mint, isBuy, dex, created_at);

  } catch (err) {
    console.log("error occured while saving analytics to cache");
  }
}
