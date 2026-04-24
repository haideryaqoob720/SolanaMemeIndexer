const { fork } = require("child_process");
import { CronJob } from "cron";
import { RedisCache } from "../redis/store";
import { addHotTokens } from "./hotTokens/process";
// const tokenMap = new RedisCache()

export function updateProcess(tokenMap: RedisCache) {
    const job = new CronJob(
        "0 */5 * * * *",
        async () => {
            // await tokenMap.connect()
            // const lock = await tokenMap.checkTokenUpdateProcessLock()
            // if(lock){
            //   console.log('Another token update process is running');
            // await tokenMap.disconnect()
            // return;
            // }
            //  await tokenMap.tokenUpdateProcessStart()
            const child = fork(__dirname + "/updateDbFromCache.js");
            console.log("🚙 started db update process");
            child.send({ hello: "start updating the database" });
            child.on("error", () => {
                console.log("failed to update db, update Process");
                child.kill();
            });
            child.on("exit", async () => {
                await tokenMap.removeTokenProcessLock();
                // await tokenMap.disconnect()
                child.kill();
            });
        },
        null,
        true,
    );

    //raydium update process
    const rayJob = new CronJob(
        "0 */1 * * * *",
        async () => {
            const child = fork(__dirname + "/updateRay.js");
            console.log("🙏 started ray update process");
            child.send({ hello: "start updating the database" });
            child.on("error", () => {
                console.log("failed to update db, update Process");
                child.kill();
            });
            child.on("exit", () => {
                child.kill();
            });
        },
        null,
        true,
    );
    const pumpswapJob = new CronJob(
        "0 */1 * * * *",
        async () => {
            const child = fork(__dirname + "/updatePumpSwap.js");
            console.log("🙏 started pumpSwap update process");
            child.send({ hello: "start updating the database" });
            child.on("error", () => {
                console.log("failed to update db, update Process");
                child.kill();
            });
            child.on("exit", () => {
                child.kill();
            });
        },
        null,
        true,
    );

    const poolsJob = new CronJob(
        "0 */1 * * * *",
        async () => {
            const child = fork(__dirname + "/updatePools.js");
            console.log("🙏 started pools update process");
            child.send({ hello: "start updating the database" });
            child.on("error", () => {
                console.log("failed to update db, update Process");
                child.kill();
            });
            child.on("exit", () => {
                child.kill();
            });
        },
        null,
        true,
    );

    const hotTokensJob = new CronJob(
        "0 */5 * * * *",
        () => {
            console.log("Hot tokens...");
            addHotTokens();
        },
        null,
        true,
    );
}
