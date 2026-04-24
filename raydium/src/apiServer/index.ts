const { fork } = require("child_process");

export function startApi() {
  const child = fork(__dirname + "/routes.js");
  child.send({ hello: "Start Api server" });
}
