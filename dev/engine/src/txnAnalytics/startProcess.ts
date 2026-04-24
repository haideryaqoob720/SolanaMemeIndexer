import { fork } from "child_process";
import { CronJob } from "cron";

export function updateTxAnalytics(){
    updateHourlyTxAnalytics();
    updateDailyAnalytics();
}

function updateHourlyTxAnalytics() {
  new CronJob(
    "0 * * * *", 
    async () => {
      console.log(
        `[${new Date().toISOString()}] ⏳ Starting hourly tx analytics job...`
      );

      const child = fork(__dirname + "/updateDb.js");

      child.send({ start: "hourly tx analytics"});

      child.on("error", (err: any) => {
        console.error("❌ Failed hourly tx analytics process", err);
        child.kill();
      });

      child.on("exit", (code: any) => {
        console.log(`✅ Hourly analytics process exited with code ${code}`);
        child.kill();
      });
    },
    null,
    true
  );
}

function updateDailyAnalytics() {
  new CronJob(
    "1 0 * * *", // 12:01AM
    async () => {
      console.log(
        `[${new Date().toISOString()}] ⏳ Starting daily analytics job...`
      );

      const child = fork(__dirname + "/updateDailyTxAnalytics.js");

      child.send({ start: "daily analytics calculation" }, () => {
        // console.log("📨 Daily analytics process started");
      });

      child.on("error", (err: any) => {
        console.error("❌ Failed daily analytics process", err);
        child.kill();
      });

      child.on("exit", (code: any) => {
        console.log(`✅ Daily analytics process exited with code ${code}`);
        child.kill();
      });
    },
    null,
    true
  );
}

