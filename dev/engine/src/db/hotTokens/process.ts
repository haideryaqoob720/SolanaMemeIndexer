const { fork } = require("child_process");
export function addHotTokens() {
  const child = fork(__dirname + "/getHotTokens.js");
  child.send({ hello: "from pool create parent" });
  child.on("error", () => {
    console.log("❎ failed to add hot tokens");
  });
  child.on("exit", () => {
    child.kill();
    console.log("✅ hotTokens");
  });
}