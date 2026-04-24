import { RedisCache } from "../redis/store";
import { getCreateObjectCache } from "../utils/getCreateObject";

const { fork } = require("child_process");
export function startPumpswapCreateTokenProcess(args: any, slot: any) {
    // console.log(slot, "slot from create")
    args = JSON.stringify(args);
    const child = fork(__dirname + "/createEvent.js", [args, slot]);
    child.send({ hello: "from create token parent" });
    child.on("error", () => {
        console.log("❎ failed to add token, create pumpswap token");
    });
    child.on("exit", () => {
        child.kill();
        console.log("✅ token Added to pumpSwap");
    });
}
