import { RedisCache } from "../../redis/store";
import { pumpSwapWithdrawDecode } from "../../types";
import { createDefaultTransaction } from "../../utils/defaultValues";

async function addTx(
    decoded: pumpSwapWithdrawDecode,
    signature: string,
    tokenMap: RedisCache,
) {
    let txData = createDefaultTransaction(
        decoded.mint,
        false,
        decoded.holder,
        decoded.solInTx,
        decoded.tokenInTx,
        3,
        decoded.timestamp,
        decoded.priceInSol,
        signature,
    );
    txData.is_liquidity_removed = true;
    // console.log({
    //     withdrawTx: txData,
    //     link: `https://solscan.io/tx/${signature}`,
    // });
    await tokenMap.addTx(signature, txData);
}
export default addTx;
