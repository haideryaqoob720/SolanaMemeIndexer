import { PublicKey } from "@solana/web3.js";
const { spawn, fork } = require("child_process");
const MAX_CHILD_PROCESSES = 50;
let activeProcesses = 0;
export async function createChildProcess(token: string, isBuy: boolean) {
  if (!token || !isBuy) {
    console.log("args are undefined");
    return;
  }
  // console.log(token);
  if (activeProcesses >= MAX_CHILD_PROCESSES) {
    console.log("Maximum child processes reached, waiting...");
    return; // Limit reached, return without spawning a new process
  }
  activeProcesses++; // Increment active process count
  const child = fork(__dirname + "/updateBuySell.js", [token, isBuy]);
  //   const child = spawn("dir", ["/updateBuySell.js"], { shell: true });
  //   child.stdout.on("data", (data: any) => {
  //     console.log(`stdout: ${data}`);
  //   });
  //   child.stderr.on("data", (data: any) => {
  //     console.error(`stderr: ${data}`);
  //   });
  //   child.on("close", (code: any) => {
  //     console.log(`child process exited with code ${code}`);
  //   });
  //   child.send({ task: "updateBuyOrSell", token, isBuy });
  // child.send("updateTokens", () => {});
  // child.on("message", (m: any) => {
  //   console.log("updateTokens", m);
  // });
  // child.on("message ", (result: any) => {
  //   child.kill();
  // });

  child.send({ hello: "from parent" });
  //     child.on("updateSuccessful", (result: any) => {
  //       console.log(`Result from child: ${result}`); // Output result
  //       activeProcesses--; // Decrement active process count
  //       child.kill(); // Kill the child process after use
  //     });

  child.on("exit", () => {
    activeProcesses--;
    child.kill(); // Ensure active process count is decremented on exit
    console.log("update token Child process exited");
  });
}
