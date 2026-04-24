import { RedisCache } from "../redis/store";
import { getCreateObjectCache } from "../utils/getCreateObject";

const { fork } = require("child_process");
export function createSniperSellProcess(
  mint:string, priceInSol:number, priceInUsd:number, pnl:boolean, orderId:string, dex:string
) {
  const child = fork(__dirname + "/sniperSell.js", [
    mint, priceInSol, priceInUsd, pnl, orderId, dex
  ]);
  child.send({ hello: "from sniper sell parent" });
  child.on("error", () => {
    console.log("failed to sell, sniper sell Process");
  });
  child.on("exit", () => {
    child.kill();
    // console.log("✅ sniper sell process completed");
  });
}
