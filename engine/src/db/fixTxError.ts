const { fork } = require("child_process");
import {CronJob} from 'cron'
export function fixTxProcess() {

//   const job = new CronJob('0 */2 * * * *', async()=>{

    const child = fork(__dirname + "/fixTxFunction.js");
    
    child.send({ hello: "start updating transactions in a seperate process" }, ()=>{
      console.log("tx Fix process stared")
    });
    child.on("error", () => {
      console.log("failed to Fix transactions, tx Process");
      child.kill()
    });
    child.on("exit", () => {
      console.log("tx FIX process killed")
      child.kill();
    });
//   },null, true)
  }
