import getPumpSwapStore from "../../redis/pumpswap";
import getRedisClient from "../../redis/store";
/*
  dex enum
  pumpFun 0
  pumpswap 1
  raydium 2
*/
export async function getTokenFromRedis(mint: string) {
    try {
        const tokenMap = await getRedisClient();
        const pumpSwapCache = await getPumpSwapStore();
        let reserve_sol: number = 0.0;
        let reserve_token: number = 0.0;
        let token_source: "pumpswap_tokens" | "ray_tokens" | "pump_tokens" =
            "pumpswap_tokens";
        const token = await tokenMap.readToken(mint);
        if (!token) {
            console.log(`${mint} not found in cache`);
            return null;
        }
        let dex: number | null = null;
        if (token.dex) {
            dex = token.dex;
        }
        if (!dex) {
            const pumpswap = await pumpSwapCache.getToken(mint);
            const raydium = await tokenMap.readRayToken(mint);
            const pumpFun = await tokenMap.readPump(mint);
            if (pumpswap) {
                reserve_sol = parseFloat(pumpswap.reserveSol);
                reserve_token = parseFloat(pumpswap.reserveToken);
                token_source = "pumpswap_tokens";
                return { ...token, reserve_sol, reserve_token, token_source };
            } else if (pumpFun) {
                reserve_sol = parseFloat(pumpFun.reserveSol);
                reserve_token = parseFloat(pumpFun.reserveToken);
                token_source = "pump_tokens";
                return { ...token, reserve_sol, reserve_token, token_source };
            } else {
                reserve_sol = parseFloat(raydium.reserve_sol);
                reserve_token = parseFloat(raydium.reserve_token);
                token_source = "ray_tokens";
                return { ...token, reserve_sol, reserve_token, token_source };
            }
        }
        switch (dex) {
            case 2:
                const raydium = await tokenMap.readRayToken(mint);
                if (!raydium) {
                    console.log(`token not found in ${dex}`);
                    return;
                }
                reserve_sol = parseFloat(raydium.reserve_sol);
                reserve_token = parseFloat(raydium.reserve_token);
                token_source = "ray_tokens";
                return { ...token, reserve_sol, reserve_token, token_source };
                break;

            case 1:
                const pumpswap = await pumpSwapCache.getToken(mint);
                if (!pumpswap) {
                    console.log(`token not found in ${dex}`);
                    return;
                }
                reserve_sol = parseFloat(pumpswap.reserveSol);
                reserve_token = parseFloat(pumpswap.reserveToken);
                token_source = "pumpswap_tokens";
                return { ...token, reserve_sol, reserve_token, token_source };
                break;

            case 0:
                const pumpFun = await tokenMap.readPump(mint);
                if (!pumpFun) {
                    console.log(`token not found in ${dex}`);
                    return;
                }
                reserve_sol = parseFloat(pumpFun.reserveSol);
                reserve_token = parseFloat(pumpFun.reserveToken);
                token_source = "pump_tokens";
                return { ...token, reserve_sol, reserve_token, token_source };
                break;

            default:
                console.log("Invalid Dex");
                return { ...token, reserve_sol, reserve_token, token_source };
                break;
        }
    } catch (error: any) {
        console.log("from function", error.message);
    }
}
