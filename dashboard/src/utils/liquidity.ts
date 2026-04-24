export const sortTokensByLiquidity = (
  tokens: any[],
  solPrice: number,
  sortOrder: "asc" | "desc" = "desc"
) => {
  return tokens.sort((a, b) => {
    const liquidityA = getLiquidity(a, solPrice);
    const liquidityB = getLiquidity(b, solPrice);

    if (sortOrder === "asc") {
      return liquidityA - liquidityB;
    } else {
      return liquidityB - liquidityA;
    }
  });
};

export const calculateLiquidity = (
  reserve_token: number,
  reserve_sol: number,
  solPrice: number
) => {
  if (reserve_token === 0 || reserve_sol === 0) {
    return 0;
  }

  const priceInSol = reserve_sol / reserve_token;

  const priceInUSD = priceInSol * solPrice;

  const liquidity = reserve_token * priceInUSD + reserve_sol * solPrice;
  if (isNaN(liquidity)) return 0;
  return liquidity;
};

export const getLiquidity = (token: any, solPrice: number) => {
  if (token.ray_token) {
    // console.log(token.ray_token.liquidity_in_usd);
    return token.ray_token.liquidity_in_usd;
  } else {
    return calculateLiquidity(
      token.pump_tokens?.reserve_token,
      token.pump_tokens?.reserve_sol,
      solPrice
    );
  }
};
