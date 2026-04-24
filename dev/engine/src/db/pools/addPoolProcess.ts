import { pool } from "../../redis/pools";

const { fork } = require("child_process");
export function addPoolToDbProcess(pool:pool) {
  const child = fork(__dirname + "/addPool.js", [JSON.stringify(pool)]);
  child.send({ hello: "from pool create parent" });
  child.on("error", () => {
    console.log("❎ failed to add pool, create pumpswap pool");
  });
  child.on("exit", () => {
    child.kill();
    console.log("✅ pool Added");
  });
}
