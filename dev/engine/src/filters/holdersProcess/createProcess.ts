const { fork } = require("child_process");

export function updateHoldersProcess() {
  const child = fork(__dirname + "/getHolderData.js");
  child.send({ hello: "start updating holders in a seperate process" });
  child.on("error", () => {
    console.log("failed to update holders, holders Process");
  });
}
