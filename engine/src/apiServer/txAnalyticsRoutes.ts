import express from "express";
import getTxAnalytics from "../redis/txAnalytics";

const router = express.Router();

router.get("/mint/:mint", async (req: any, res: any) => {
  const { mint } = req.params;
  const { date, hour } = req.query;

  try {
    const analytics = await getTxAnalytics();
    const data = await analytics.getMintAnalytics("0");
    if (!data) return res.status(404).json({ message: "Mint data not found" });

    return res.json({ mint, data });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server error", error: (err as Error).message });
  }
});

router.get("/top-mint/:date", async (req: any, res: any) => {
  const { date } = req.params;

  try {
    const analytics = await getTxAnalytics();
    const result = await analytics.getMintAnalytics(date);
    if (!result) return res.status(404).json({ message: "No top mint found" });

    return res.json(result);
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server error", error: (err as Error).message });
  }
});

router.get("/save", async (req: any, res: any) => {
  try{
    
    const date = new Date();
    date.setDate(date.getDate()+1);
    // const r = await saveDailyTxAnalytics(date);

    return res.json({succes:true, message:"saved to DB"});

  }catch(err){
    return res.json({success:false, message:(err as Error).message})
  }
});

router.get("/tx", async (req: any, res: any) => {

  try{
    // const { date } = req.query.param
    const cache = await getTxAnalytics();
    const analytics = await cache.getCounterValue();
    return res.status(200).json({success:true, analytics});
  }catch(err){
    return res.status(500).json({success:'false', message:(err as Error).message});
  }

});

export const analyticsRouter = router;
