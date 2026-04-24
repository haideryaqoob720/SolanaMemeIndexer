import { sniperOrder } from "../../types";

const { fork } = require("child_process");
export function createSniperOrderProcess(
  order:sniperOrder, userId:string, strategyId:string
) {
  const child = fork(__dirname + "/addSniperOrder.js", [
    JSON.stringify(order), userId, strategyId
  ]);
  child.send({ hello: "from sniper add order parent" });
  child.on("error", () => {
    console.log("failed to add order,  order Process");
  });
  child.on("exit", () => {
    child.kill();
    // console.log("✅ sniper sell process completed");
  });
}
