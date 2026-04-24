import prisma from "../prisma/prisma";
import getTxAnalytics from "../redis/txAnalytics";

process.on("message", async (msg: { start: string }) => {
  if (msg.start === "daily analytics calculation") {
    console.log("🛠️ Computing daily analytics...");
    try {
      await saveDailyTxAnalytics();
      console.log("✅ Daily tx analytics saved to DB.");
      process.exit(0);

    } catch (err) {
      console.error("❌ Error computing analytics:", err);
      process.exit(1);
    }
  }
});


export const saveDailyTxAnalytics = async(saveDate?: Date)=>{

  const cache = await getTxAnalytics();
  
  const requiredDate = saveDate ?? new Date();
  requiredDate.setDate(requiredDate.getDate() - 1);
  const txCounter = await cache.getCounterValue(requiredDate);

  //Save to DB table tx_counter
  if(txCounter){
     await prisma.txCounter.create({
      data : {
        ...txCounter,
        date: requiredDate,
      }
    })
    // await cache.deleteCounterValue(requiredDate);
    console.log("Tx Analytics saved to DB.");
  }

}
