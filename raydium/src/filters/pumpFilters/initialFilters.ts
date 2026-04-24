import { PublicKey } from "@solana/web3.js";
import {
  createDefaultPumpToken,
  PumpTokenCreateInput,
} from "../../utils/defaultValues";
import { getBondingPercentage, getBondingVault } from "../filters";

export async function getInitialPumpMetrics(
  mint: string,
  curve: string
): Promise<PumpTokenCreateInput> {
  const mintAddress = new PublicKey(mint);
  let tokenData = createDefaultPumpToken(curve);

  //get token and sol reserves
  const bondingData = await getBondingVault(mintAddress, curve);
  tokenData.reserve_sol = bondingData.solBalance;
  tokenData.reserve_token = bondingData.amount;

  //calculate bonding progress
  tokenData.bonding_progress = getBondingPercentage(bondingData.amount);

  return tokenData;
}
