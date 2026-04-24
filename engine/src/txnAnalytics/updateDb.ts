import prisma from "../prisma/prisma";
import getTxAnalytics from "../redis/txAnalytics";


process.on("message", async (msg: { start: string }) => {
  if (msg.start === "hourly tx analytics") {
    console.log("🛠️ Computing hourly tx analytics...");

    try {
      await saveToTxAnalytics();
      console.log("✅ Hourly tx analytics saved to DB.");
      process.exit(0);
    } catch (err) {
      console.error("❌ Error computing tx analytics:", err);
      process.exit(1);
    }
  }
});

const saveToTxAnalytics = async () => {
  const cache = await getTxAnalytics();

  const now = new Date();
  const currentHour = now.getHours();
  const previousHour = currentHour === 0 ? 23 : currentHour - 1;

  const analyticDate = new Date(now.toDateString());

  const mintsAnalytics = await cache.getMintAnalytics(previousHour.toString());
  if (!mintsAnalytics || Object.keys(mintsAnalytics).length === 0) {
    console.log(`ℹ️ No mint analytics found for hour ${previousHour}`);
    return;
  }

  const hourData = Object.entries(mintsAnalytics).map(([mint, data]) => ({
    mint,
    totalTx: data.totalTx,
    buyTx: data.buyTx,
    sellTx: data.sellTx,
    analyticDate: analyticDate,
    hour: previousHour,
    firstTxAt: new Date(data.createdAt),
  }));

  await prisma.hourlyTxAnalytics.createMany({ data: hourData });

  await cache.deleteHourAnalytics(previousHour.toString());

  console.log(`🧹 Analytics deleted from Redis for hour ${previousHour}`);
};
