const { fork } = require("child_process");
import {CronJob} from 'cron'
export function updateProcess() {
  const job = new CronJob("0 */1 * * * *", async()=>{
  const child = fork(__dirname + "/updateDbFromCache.js");
  console.log("🚙 started db update process");
  child.send({ hello: "start updating the database" });
  child.on("error", () => {
    console.log("failed to update db, update Process");
    child.kill()
  });
  child.on("exit", () => {
    child.kill();
  });
  },null, true)


  //raydium update process
  const rayJob = new CronJob("0 */1 * * * *", async()=>{
  const child = fork(__dirname + "/updateRay.js");
  console.log("🙏 started ray update process");
  child.send({ hello: "start updating the database" });
  child.on("error", () => {
    console.log("failed to update db, update Process");
    child.kill()
  });
  child.on("exit", () => {
    child.kill();
  });
  },null, true)
}
