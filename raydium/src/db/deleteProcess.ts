const { fork } = require("child_process");
import {CronJob} from 'cron'
export function deleteProcess() {
  const job = new CronJob("0 0 */5 * * *", async()=>{
  // const job = new CronJob("0 */5 * * * *", async()=>{ // five minutes
  const child = fork(__dirname + "/deleteToken.js");
  console.log("🎄 started db delete process");
  child.send({ hello: "start deleting the database" });
  child.on("exit", () => {
    child.kill();
    console.log("⭕ deleted tokens. Process killed");
  });
  },null, true)
}
