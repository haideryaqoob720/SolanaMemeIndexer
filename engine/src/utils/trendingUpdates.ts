import getRedisClient, { RedisCache } from "../redis/store";


async function sendTrendingUpdates() {
    // const tokenMap = new RedisCache()
    // await tokenMap.connect()
  const tokenMap = await getRedisClient()


 try {
   await tokenMap.trendingUpdatePub()
 } catch (error:any) {
   console.error('Error:', error.message);
 }
}

sendTrendingUpdates();
setInterval(sendTrendingUpdates, 5000);

module.exports = { sendTrendingUpdates };