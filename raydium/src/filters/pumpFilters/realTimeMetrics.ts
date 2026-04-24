import { BN } from "@coral-xyz/anchor";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
export function realTimeMetrics(
  virtualSolReserves: number,
  virtualTokenReserves: number,
  realSolReserves: number,
  realTokenReserves: BN
): {
  priceSol: number;
  progress: number;
  marketCap: number;
  solReserve: number;
  tokenReserve: number;
} {
  const vSol = virtualSolReserves / LAMPORTS_PER_SOL;
  const vToken = virtualTokenReserves / 1000000;
  const price = vSol / vToken;
  const reservedTokens = new BN(206900000).mul(new BN(1000_000));
  const initialRealTokenReserves = new BN(1000_000_000_000_000).sub(
    reservedTokens
  );
  const bondingCurveProgress = new BN(100).sub(
    realTokenReserves.mul(new BN(100)).div(initialRealTokenReserves)
  );
  const marketCap: number = price * 1000000000;
  return {
    priceSol: price,
    progress: bondingCurveProgress.toNumber(),
    // marketCap: new BN(price).mul(new BN(1000_000_000_000_000)),
    marketCap: marketCap,
    solReserve: realSolReserves / LAMPORTS_PER_SOL,
    tokenReserve: realTokenReserves.div(new BN(1000_000)).toNumber(),
  };
}
