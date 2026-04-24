import { TransactionCreateInput } from "../utils/defaultValues";
import getRedisClient, { RedisCache } from "../redis/store";
import { PrismaClient } from "@prisma/client";
import prisma from "../prisma/prisma";

// const prisma = new PrismaClient();

export const addTxs = async () => {
  // const tokenMap = new RedisCache();
  // await tokenMap.connect();
  const tokenMap = await getRedisClient()
  let flushed: boolean = true;
  try {
    // const tx = await tokenMap.getAllTx();
    await syncCache(tokenMap)
    // console.log("after db")
    // try {
    //   const dbRecords = await prisma.transactions.findMany()
    //   const sync = Promise.all(dbRecords.map(async(record, index) =>{
    //     if(await tokenMap.readTx(record.signature)){
    //       await tokenMap.deleteFromTx(record.signature)
    //     }
    //   })).then(async()=>{
    //     tx = await tokenMap.getAllTx()
    //   })
    // } catch (error:any) {
    //   console.log("error syncing tx", error.message)
    // }
// if(tx){
//     console.log(tx.length, "tx length")
//     // await tokenMap.flushTx()

//     if(tx.length > 0){
//       // if (flushed) {
//       // flushed = false;
//       console.log("add tx")
//       try {
//         const multipleTx = await prisma.transactions.createMany({
//           data:tx
//         }).then(async()=>{
//           // await tokenMap.flushTx()
//           console.log("tx added **************")

     
          
//           await tokenMap.disconnect()
//           // await prisma.$disconnect()
//         }).catch(async(err:any)=>{
//           console.log("error creating many 1", err.message)
          
//         }).catch(async(err:any)=>{
//           console.log("error creating many", err.message)
//         })
//       } catch (error:any) {
//         console.log(error.message)
//       }

//     // const results = await Promise.all(
//     //   tx.map(async (token: any) => {
//     //     try {
//     //       const { mint, ...transactionData } = token;

//     //       // console.log(token, "add tx")
//     //       const dbRes = await prisma.transactions.create({
//     //         // data: {
//     //         //   ...transactionData,
//     //         //   token: {
//     //         //     connect: {
//     //         //       mint: mint,
//     //         //     },
//     //         //   },
//     //         // },
//     //         data:token
//     //       });
//     //       console.log("Successfully added tx:", dbRes.id);
//     //       return { success: true, data: dbRes };
//     //     } catch (error: any) {
//     //       console.log("Error adding tx:", error.message);
//     //       return { success: false, error: error.message, token };
//     //     }
//     //   })
//     // ).then(async () => {
//     //     console.log(results);
//     //     console.log(flushed, "flush")
//     //     await tokenMap.flushTx().then(() => {
//     //       flushed = true;
//     //     });
//     //   });
//     // console.log(results);
//   // }
//   }else{
//     console.log("no tx in cache")
//   }
// }
// }
    //   // console.log(tx, "tx");
    //   // const dbRes = await prisma.transactions.createMany({
    //   //   data: tx,
    //   // });
    //   await tx.map(async (token: any, index) => {
    //     // console.log(index);
    //     // console.log(token);
    //     try {
    //       const dbRes = await prisma.transactions.create({
    //         data: {
    //           ...token,
    //           token: {
    //             connect: {
    //               mint: token.mint,
    //             },
    //           },
    //         },
    //       });
    //       console.log("adding tx");
    //       console.log(dbRes);
    //     } catch (error: any) {
    //       console.log("error adding tx", error.message);
    //     }
    //   });
    // console.log(dbRes, "dbRes");
    // await tokenMap.flushTx();
  } catch (error: any) {
    console.log("error adding all tx", error.message);
  }
};

process.title = "tx_add";
process.on("message", async () => {
  console.log(process.pid, "process Pid")
  console.log("tx process started");
  await addTxs();
  process.exit()
});
// process.on("SIGTERM", () => {
//   console.log("error in tx process");
// });
process.on('SIGTERM', async () => {
  // process.send('shutdown');
  console.log("error in process ...................")
  // process.exit(0);
});


async function syncCache(tokenMap: RedisCache){
  console.log("sync Process **********-----------------***********")
  let tx:any[] = [];
  tx = await tokenMap.getAllTx()
  console.log("tx in cache before sync: ", tx.length)
  const multipleTx = await prisma.transactions.createMany({
    data:tx,
  }).then(async()=>{
    await Promise.all(tx.map(async(record:any, index:number)=>{
      await tokenMap.deleteFromTx(record.signature)
    })).catch((error:any)=>{
      console.log("error creating tx in db", error.message)
    }).finally(async()=>{
      tx = await tokenMap.getAllTx()
  console.log("tx in cache AFTER sync: ", tx.length)
      console.log("synced Cache")
      await tokenMap.removeLock()
      await tokenMap.disconnect()
      await prisma.$disconnect()
    })
  }).catch((error:any)=>{
    console.log("error creating many tx", error.message, "creating many tx error")
  })
}



// async function syncCache(tokenMap: RedisCache){
//   console.log("sync Process **********-----------------***********")
//   let tx:any[] = [];
//      try {
//       const dbRecords = await prisma.transactions.findMany()
//       // console.log(dbRecords.length, "dbLength")
//       // if(dbRecords.length > 0){


//       // get records from db
//       const sync = await Promise.all(dbRecords.map(async(record, index) =>{
//         const existingSignature = await tokenMap.readTx(record.signature)
//         if(existingSignature){
//           await tokenMap.deleteFromTx(record.signature)
//         }
//       })).then(async()=>{
//         tx = await tokenMap.getAllTx()
//         console.log("**************** cleared duplicates ****************")
//         // get records from db end

//         if(tx){
//            console.log("add tx")
//       try {
//         console.log("**************** in try ****************", tx.length)
//         const multipleTx = await prisma.transactions.createMany({
//           data:tx
//         }).then(async()=>{
//           // await tokenMap.flushTx()
//           // console.log("tx added finallyy **************")
//           console.log("***************** create many successful ***************** ")
//           await tokenMap.disconnect()
//           // await prisma.$disconnect()
//         }).catch(async(err:any)=>{
//           console.log("error creating many 1", err.message,"\ncomplete error:",  err)
          
//         }).catch(async(err:any)=>{
//           console.log("error creating many", err.message)
//         })
//       } catch (error:any) {
//         console.log(error.message)
//       }
//     } else {
//       // console.log("no cache found newwwwwwwwwww")
//     }
//       })
//     // }
//     } catch (error:any) {
//       console.log("error syncing tx", error.message)
//     }
//   }
