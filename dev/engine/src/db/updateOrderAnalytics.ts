const { fork } = require("child_process");
import { CronJob } from "cron";

export async function updateOrderAnalytics() {
    new CronJob(
        "0 */1 * * * *",
        async () => {
            const child = fork(__dirname + "/addOrderAnalytics.js");
            child.send(
                { hello: "start updating order analytics" },
                async () => {
                    // console.log("order analytics process started");
                },
            );

            child.on("error", async () => {
                console.log("failed to update order analytics process.");
                child.kill();
            });

            child.on("exit", async () => {
                console.log("order analytics process killed");
                child.kill();
            });
        },
        null,
        true,
    );
}
