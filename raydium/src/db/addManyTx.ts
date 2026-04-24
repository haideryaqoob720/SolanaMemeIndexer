const { fork } = require("child_process");
import {CronJob} from 'cron'
import getRedisClient, { RedisCache } from '../redis/store';
export async function updateTxProcess() {
// const tokenMap = new RedisCache()
const tokenMap = await getRedisClient()
  const job = new CronJob('0 */2 * * * *', async()=>{
// await tokenMap.connect()
const locked = await tokenMap.acquireLock();
  
  if (!locked) {
    console.log('Another process is running');
    await tokenMap.disconnect()
    return;
  }
    const child = fork(__dirname + "/transaction.js");
    child.send({ hello: "start updating transactions in a seperate process" }, async()=>{
      console.log("tx process stared")
    });
    child.on("error", async() => {
      console.log("failed to update transactions, tx Process");
      await tokenMap.removeLock()
      await tokenMap.disconnect()
      child.kill()
    });
    child.on("exit", async() => {
      console.log("tx process killed")
      await tokenMap.removeLock()
      await tokenMap.disconnect()
      child.kill();
    });

  },null, true)
  }
