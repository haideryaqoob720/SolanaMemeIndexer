import { Prisma } from "@prisma/client";
import { mintTo } from "@solana/spl-token";

export type TokenCreateInput = Omit<
  Prisma.tokensCreateInput,
  "ray_token" | "pump_tokens" | "transactions" | "hot_monitoring"
>;
export type PumpTokenCreateInput = Omit<Prisma.pump_tokensCreateInput, "token">;
export type RaydiumTokenCreateInput = Omit<
  Prisma.raydium_tokensCreateInput,
  "token"
>;
export type TransactionCreateInput = Omit<
  Prisma.transactionsCreateInput,
  "token"
>;
export type HotMonitoringCreateInput = Omit<
  Prisma.hot_monitoringCreateInput,
  "token"
>;

export type SniperCreateInput = {
  mint:string;
  userId:number;
  strategyId:number;
  orderAmountInSol:number;
  buyingPrice:number;
  takeProfitPrice:number;
  stopLossPrice:number;
  status:string;
}

export type RugScoreCreateInput = Omit<Prisma.rug_scoreCreateInput, "token">;

export const createDefaultToken = (mint: string): TokenCreateInput => ({
  mint,
  name: "",
  uri: "",
  symbol: "",
  socials: [],
  mintable: false,
  freezeable: false,
  decimals:6,
  top_10_holder_equity: 0.0,
  creator: "",
  creator_equity: 0.0,
  total_supply: 0.0,
  total_holders: 0,
  market_cap: 0.0,
  creator_balance: 0.0,
  sol_volume: 0.0,
  token_volume: 0.0,
  solVolumeBN: "0",
  tokenVolumeBN: "0",
  buy_count: 0.0,
  sell_count: 0.0,
  total_tx: 0,
  updated_at: new Date(),
});

export const createDefaultPumpToken = (
  curve: string
): PumpTokenCreateInput => ({
  bonding_curve: curve,
  bonding_progress: 0.0,
  reserve_sol: 0,
  reserve_token: 0,
  buy_count: 0,
  sell_count: 0,
  updated_at: new Date(),
});

export const createDefaultRaydiumToken = (
  token: string,
  market_account: string
): RaydiumTokenCreateInput => ({
  market_account,
  reserve_sol: 0,
  reserve_token: 0,
  lp_burn: 0,
  lp_burned: false,
  lp_reserve: 0,
  liquidity_in_sol: 0.0,
  price_in_sol: 0.0,
  price_in_usd: 0.0,
  liquidity_in_usd: 0.0,
  is_quote_vault_sol:true,
  base_vault:null,
  quote_vault:null,
  // created_at: new Date(),
  updated_at: new Date(),
});

export const createDefaultTransaction = (
  mint: string,
  is_buy: boolean,
  user: string,
  sol_amount: number,
  token_amount: number,
  dex: number,
  timestamp: number,
  price: number,
  signature: string
): TransactionCreateInput => ({
  mint,
  is_buy,
  sol_amount,
  token_amount,
  status: 0,
  dex,
  user,
  token_price_in_sol: price,
  timestamp,
  signature,
});

export const createDefaultHotMonitoring = (
  mint: string
): HotMonitoringCreateInput => ({
  sol_volume: 0.0,
  token_volume: 0.0,
});

export const createDefaultRugCheck = (mint: string): RugScoreCreateInput => {
  return {
    // mint,
    created_at: new Date(),
    is_website_valid: false,
    has_tweets: false,
    number_of_twitters: 0,
    not_mintable_risk: true,
    not_freeze_risk: true,
    not_auto_freeze: true,
    permanent_control: true,
    has_concerning_metadata: true,
    liquidity_confirmed: true,
    liquidity_level: true,
    custom_fees: true,
    recent_activity: true,
    all_pools: true,
    lp_providers: true,
    stable_contract: true,
    team_wallet_holdings: false,
    top_10_holders: false,
    tx_24h:false,
    vol_24h: false
  };
};

export const createDefaultSniperOrder = (mint:string, userId:number, strategyId:number, price:number, profit:number, loss:number, amount?:number):SniperCreateInput  =>{
  return {
    mint:mint,
    userId:userId,
    strategyId:strategyId,
    orderAmountInSol: amount ?? 0.0,
    buyingPrice:price,
    takeProfitPrice:profit,
    stopLossPrice:loss,
    status:"pending"
  }
}
