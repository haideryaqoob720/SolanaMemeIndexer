import { config } from "../../config";
import getPumpSwapStore from "../../redis/pumpswap";
import { getOrderMetricsStore } from "../../redis/sniperOrderMetrics";
import getOrdersStore from "../../redis/sniperOrders";
import getSniperStrategyStore from "../../redis/sniperStrategies";
import getRedisClient from "../../redis/store";
import { TransactionFormatter } from "../../utils/generalDecoder";
import decodeWithdrawEvent from "./decode";
import updateAllOrders from "./orders";
import addTx from "./transaction";
import updatePumpToken from "./updatePump";

async function handleWithdrawEvent(
    args: any,
    data: any,
    logs: string[],
    isQuoteVaultSol: boolean,
) {
    const tokenMap = await getRedisClient();
    const pumpSwapCache = await getPumpSwapStore();
    const sniperStrategiesCache = await getSniperStrategyStore();
    const orderMetricsCache = await getOrderMetricsStore();
    const orderCache = await getOrdersStore();
    const solPrice = await tokenMap.getSolPrice();
    const decode = new TransactionFormatter();
    const decodedTx = decode.formTransactionFromJson(
        data?.transaction,
        new Date().getTime(),
    );
    let signer: string = "";
    if (decodedTx.transaction.message.version === 0) {
        signer = decodedTx.transaction.message.staticAccountKeys[0].toBase58();
    } else {
        signer = decodedTx.transaction.message.accountKeys[0].toBase58();
    }
    const mint: string = args.mint;
    // data?.transaction?.transaction?.meta?.preTokenBalances.find(
    //     (account: any) => account.mint !== config.solMint.toBase58(),
    // )?.mint;
    if (!mint) {
        console.log("❗ mint not found withdraw event");
        return;
    }
    const signature: string = decodedTx.transaction.signatures[0];
    const existingToken = await tokenMap.readToken(mint);
    const existingPump = await pumpSwapCache.getToken(mint);
    if (!existingPump || !existingToken) {
        return;
    }
    console.log("withdraw event detected");
    const decoded = decodeWithdrawEvent(
        args,
        solPrice,
        existingToken.decimals,
        isQuoteVaultSol,
        mint,
        signature,
    );
    if (!decoded) {
        console.log("incomplete decoded");
        return null;
    }
    await Promise.all([
        updatePumpToken(decoded, existingPump, pumpSwapCache),
        addTx(decoded, signature, tokenMap),
        updateAllOrders(
            decoded.priceInSol,
            decoded.mint,
            decoded.priceInUsd,
            solPrice,
            existingPump.marketAccount,
            sniperStrategiesCache,
            orderMetricsCache,
            orderCache,
            isQuoteVaultSol,
        ),
    ]);
}

export default handleWithdrawEvent;
