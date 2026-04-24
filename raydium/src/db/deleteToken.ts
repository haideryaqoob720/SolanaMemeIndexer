import { PrismaClient } from "@prisma/client";
import getRedisClient, { RedisCache } from "../redis/store";
import prisma from "../prisma/prisma";

// const prisma = new PrismaClient();

interface Token {
  mint: string;
}

interface Transaction {
  signature: string;
}

function getFilterClause(hours: number, progress: number) {
  const createdBefore = new Date(Date.now() - hours * 60 * 60 * 1000);
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
  // const tokenMap = new RedisCache();
  const tokenMap = await getRedisClient()
  
  try {
    // await tokenMap.connect();
    
    // Get tokens from pump_tokens
    const filteredTokens = await prisma.pump_tokens.findMany({
      where: getFilterClause(8, 50),
      select: { mint: true },
      orderBy: {
        created_at: 'desc'
      }
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
      console.log(`Deleted ${deletedTokens.count} tokens from tokens cache and db`);
    }

  } catch (error) {
    console.error("Error in filterTokens:", error);
    throw error;
  } finally {
    await tokenMap.disconnect?.();
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
}