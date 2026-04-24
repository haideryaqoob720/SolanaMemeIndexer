import { RedisCache } from "../redis/store";
import { getCreateObjectCache } from "../utils/getCreateObject";

const { fork } = require("child_process");
export function createProcess(
  mint: string,
  creator: string,
  name: string,
  symbol: string,
  uri: string,
  bondingCurve: string
) {
  const child = fork(__dirname + "/handleCreate.js", [
    mint,
    creator,
    name,
    symbol,
    uri,
    bondingCurve,
  ]);
  child.send({ hello: "from create token parent" });
  child.on("error", () => {
    console.log("failed to add token, create Process");
  });
  child.on("exit", () => {
    child.kill();
    console.log("✅ token Added");
  });
}
