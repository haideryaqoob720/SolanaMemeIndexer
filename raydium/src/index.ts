import { startGrpc } from "./gRpc";
import { updateProcess } from "./db/updateProcess";
import { deleteProcess } from "./db/deleteProcess";
import { resetCache } from "./redis/reset";
import { updateHoldersProcess } from "./filters/holdersProcess/createProcess";
import { getSocials } from "./filters/getSocials";
import { decode } from "./raydiumDecoder/decode";
import { updateTxProcess } from "./db/addManyTx";
import { tokenMetadataUpdateField } from "@solana/spl-token";
import { fixTxProcess } from "./db/fixTxError";
import { RedisCache } from "./redis/store";
import { getRaydiumMetrics } from "./filters/getRaydiumFilters";
import { ApiServer } from "./apiServer/routes";
import { getTransferFeeAudit } from "./filters/filters";
import { PublicKey } from "@solana/web3.js";
import { sendBuyTransaction } from "./onChain/buy/buy";
import { sendSellTransaction } from "./onChain/sell/sell";
import { getSnipersFromDb } from "./db/getSnipers";
import { startApi } from "./apiServer";
import { JupiterSwap } from "./sniper/jupiterSwap";
import { config } from "./config";
import {
  deleteInactiveTokens,
  deleteRaydiumTokens,
} from "./db/deleteSniperOrders";
const { getSolanaPrice } = require("./utils/getSolPrice");

async function main() {
  try {
    // fixTxProcess()
    // await resetCache();
    // await sendSellTransaction("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "6x45feexbVnncFEwA4TT8tsjXLZFCTf1zJCtyd98QT5z", "41z1T6UudJdyF7wjgRTJzRRff2wJGBtrxYojf2GZSrAaKEL8zrF78jd3XtBEZ7rCGLWRDDo4VLSdvhtAjFiP1atY", 50.0, 6)
    // await sendBuyTransaction("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "6x45feexbVnncFEwA4TT8tsjXLZFCTf1zJCtyd98QT5z", "41z1T6UudJdyF7wjgRTJzRRff2wJGBtrxYojf2GZSrAaKEL8zrF78jd3XtBEZ7rCGLWRDDo4VLSdvhtAjFiP1atY", 0.01)
    //   const jup = new JupiterSwap()
    //   const test = await jup.testApi({
    //     inputMint:config.solMint.toBase58(),
    //     outputMint:"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    //     slippageBps:100,
    //     userPublicKey:"6x45feexbVnncFEwA4TT8tsjXLZFCTf1zJCtyd98QT5z",
    //     amount:"100000000"
    //   },6
    // )
    // console.log(test)
    // deleteRaydiumTokens()
    // .then(() => console.log('Process completed'))
    // .catch(e => console.error('Process failed:', e));
    // deleteInactiveTokens()
    // .then(() => console.log('Process completed'))
    // .catch(e => console.error('Process failed:', e));
    start();
    // await getSnipersFromDb(0.3, 90, 99, false, false)
    // updateHoldersProcess();
  } catch (error: any) {
    console.log("error geting info: ", error.message);
  }
}
main();

function start() {
  console.log("running sniper");
  startGrpc();
  startApi();
}
