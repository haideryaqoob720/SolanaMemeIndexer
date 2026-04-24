import { promiseHooks } from "v8";
import prisma from "../../prisma/prisma";
async function getHotTokens() {
  try {
    await removeOldHotTokens();

    const tokens = await prisma.tokens.findMany({
      where: {
        AND: {
          total_holders: {
            gte: 200,
          },
          created_at: {
            lte: new Date(Date.now() - 15 * 60000),
            gte: new Date(Date.now() - 30 * 60000),
          },
        },
      },
    });
    let mints = tokens.map((token) => {
      return token.mint;
    });
    console.log(new Date(Date.now() - 5 * 60000).toISOString());
    const transactions = await prisma.transactions.findMany({
      where: {
        AND: {
          mint: {
            in: mints,
          },
          created_at: {
            gte: new Date(Date.now() - 5 * 60000),
          },
          dex: {
            not: 1,
          },
        },
      },
    });
    if (!transactions) {
      const message: string = "no tranactions found in this time range";
      console.log(message);
    }
    mints = transactions.map((tx) => {
      return tx.mint;
    });
    mints = [...new Set(mints)];
    console.log(transactions.length, mints.length, "tx, mints");
    const hotTokens = await prisma.tokens.findMany({
      where: {
        // AND: {
        mint: {
          in: mints,
        },
      },
      //   include: {
      //     ray_token: true,
      //     pumpswap_tokens: true,
      //   },
      orderBy: {
        created_at: "desc",
      },
    });
    console.log(hotTokens.length, "tokens");
    await Promise.all(
      hotTokens.map(async (token) => {
        try {
          await prisma.hotTokens.create({
            data: {
              mint: token.mint,
            },
          });
        } catch (error: any) {
          console.log("error adding hot token: ", error.message);
        }
      })
    );
  } catch (error: any) {
    console.log("error fetching hot tokens", error.message);
  }
}

process.on("message", async () => {
  await getHotTokens();
  process.exit();
});

// remove the hot tokens those does have transaction in last 30 minutes.
async function removeOldHotTokens() {
  try {
    const allHotTokens = await prisma.hotTokens.findMany();
    const hotTokenMints = allHotTokens.map((t) => t.mint);

    // Check which have transactions in last 10 mins
    const recentTransactions = await prisma.transactions.findMany({
      where: {
        mint: {
          in: hotTokenMints,
        },
        created_at: {
          gte: new Date(Date.now() - 30 * 60000),
        },
      },
      distinct: ["mint"],
    });

    const activeMints = recentTransactions.map((tx) => tx.mint);
    const inactiveMints = hotTokenMints.filter(
      (mint) => !activeMints.includes(mint)
    );

    // remove irrelevant tokens.
    if (inactiveMints.length > 0) {
      await prisma.hotTokens.deleteMany({
        where: {
          mint: {
            in: inactiveMints,
          },
        },
      });
      console.log(
        `Removed hot tokens ${inactiveMints.length} with greater transaction time > 30mins.`
      );
    }
  } catch (error: any) {
    console.log("Error removing old hot tokens:");
  }
}
