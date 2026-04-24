import { CronJob } from "cron";
import { RedisCache } from "../redis/store";
import { getCreateObjectCache } from "../utils/getCreateObject";

const { fork } = require("child_process");
export function removePendingOrdersProcess(
) {
    const pendingJob = new CronJob("0 0 */1 * * *", async()=>{
    // const pendingJob = new CronJob("0 */1 * * * *", async()=>{
  const child = fork(__dirname + "/removePendingOrders.js")
  child.send({ hello: "from sniper sell parent" });
  child.on("error", () => {
    console.log("failed to delete pending, remove pending orders Process");
  });
  child.on("exit", () => {
    child.kill();
    // console.log("✅ sniper sell process completed");
  });
  },null, true)
}
