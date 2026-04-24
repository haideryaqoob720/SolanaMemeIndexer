import { PrismaClient } from "@prisma/client";
import getRedisClient, { RedisCache } from "../redis/store";
import prisma from "../prisma/prisma";
import  tokenCache  from "../redis/tokenStore";

// const prisma = new PrismaClient();

interface Token {
  mint: string;
}

interface Transaction {
  signature: string;
}

function getFilterClause(hours: number, progress: number) {
  const createdBefore = new Date(Date.now() - hours * 60 * 60 * 1000);
  console.log(createdBefore)
  return {
    OR: [
      {
        bonding_progress: {
          gt: 100,
        },
      },
      {
        AND: [
        // OR: [
          {
            OR: [
              {
                bonding_progress: {
                  lt: progress,
                },
              },
              {
                bonding_progress: null,
              },
            ],
          },
          {
            created_at: {
              lt: createdBefore,
            },
          },
        ],
      },
    ],
  };
}

async function filterTokens() {
  console.log("deleting Tokens")
  // const tokenMap = new RedisCache();
  
  const tokenMap = await getRedisClient()
  try {
    
    // await tokenMap.connect();
    // const tokenCache = tokenStore.getInstance()
    
    // Get tokens from pump_tokens
    
    const filteredTokens = await prisma.pump_tokens.findMany({
      // delete if the token is older than hours or has bonding progress less than progress
      where: getFilterClause(8, 50), 
      select: { mint: true },
      orderBy: {
        created_at: 'desc'
      }
    }).catch((err:any)=>{
      console.log("error getting tokens to delete", err.message)
    }) as Token[];

    if (!filteredTokens?.length) {
      console.log("No tokens matched filters");
      return;
    }

    // Extract mint values directly from the tokens array
    const mints = filteredTokens.map(token => token.mint);

    // Find and delete transactions
    const signatures = await prisma.transactions.findMany({
      where: {
        mint: {
          in: mints
        }
      },
      select: {
        signature: true
      }
    }) as Transaction[];

    const deletedTransactions = await prisma.transactions.deleteMany({
      where: {
        mint: {
          in: mints
        }
      }
    });

    if (deletedTransactions.count > 0) {
      await tokenMap.deleteManyTx(signatures);
      console.log(`Deleted ${deletedTransactions.count} transactions for ${filteredTokens.length} tokens`);
    }

    // Delete tokens from pump_tokens
    const deletedPumpTokens = await prisma.pump_tokens.deleteMany({
      where: {
        mint: {
          in: mints
        }
      }
    });
    

    const deletedRugScore = await prisma.rug_score.deleteMany({
      where:{
        mint:{
          in: mints
        }
      }
    })
    if (deletedRugScore.count > 0) {
      // await tokenMap.deleteManyTx(signatures);
      console.log(`Deleted ${deletedRugScore.count} transactions for ${filteredTokens.length} tokens`);
    }
    if (deletedPumpTokens.count > 0) {
      await tokenMap.deleteManyPump(mints);
      console.log(`Deleted ${deletedPumpTokens.count} tokens from pumpFun cache and db`);
      console.log(`Deleted ${deletedPumpTokens.count} tokens from pump_tokens`);
    }

    const deletedRaydium = await prisma.raydium_tokens.deleteMany({
      where:{
        mint:{
          in:mints
        }
      }
    })
    if (deletedRaydium.count > 0) {
      // console.log(`Deleted ${deletedRaydium.count} tokens from pumpFun cache and db`);
      console.log(`Deleted ${deletedRaydium.count} tokens from raydium`);
    }

    // Delete from tokens table
    const deletedTokens = await prisma.tokens.deleteMany({
      where: {
        mint: {
          in: mints
        }
      }
    });
    if (deletedTokens.count > 0) {
      await tokenMap.deleteManyTokens(mints);
      await Promise.all(mints.map(async(mint)=>{
        await tokenMap.deleteHoldersForToken(mint)
      }))
      // await tokenCache.deleteManyTokens(mints);
      console.log(`Deleted ${deletedTokens.count} tokens from tokens cache and db`);
    }

  } catch (error) {
    console.error("Error in filterTokens:", error);
    throw error;
  } finally {
    // await tokenMap.disconnect?.();
  }
}

// Export the function
export { filterTokens };

// Only run if this is the main module
if (require.main === module) {
  process.on("message", async () => {
    try {
      await filterTokens();
      process.exit(0);
    } catch (error) {
      console.error("Fatal error:", error);
      process.exit(1);
    }
  });
  process.on('SIGINT', async () => {
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await prisma.$disconnect()
  process.exit(0)
})
}