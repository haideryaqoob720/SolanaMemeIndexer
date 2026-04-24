import getRedisClient, { RedisCache } from "../redis/store";

const axios = require('axios');

let solanaPrice:string | null = null;

async function updateSolanaPrice() {
    // const tokenMap = new RedisCache()
    // await tokenMap.connect()
  const tokenMap = await getRedisClient()

 try {
   const response = await axios.get('https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT');
   solanaPrice = response.data.price;
//    console.log(`[${new Date().toLocaleTimeString()}] Updated SOL price: $${solanaPrice}`);
   if(solanaPrice){
    await tokenMap.setSolanaPrice(solanaPrice.toString())
   }
 } catch (error:any) {
   console.error('Error:', error.message);
 }
}

updateSolanaPrice();
setInterval(updateSolanaPrice, 60000);

module.exports = {
 getSolanaPrice: () => solanaPrice
};