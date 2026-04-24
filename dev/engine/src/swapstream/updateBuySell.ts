import { PrismaClient } from "@prisma/client";
import { PublicKey } from "@solana/web3.js";

const prisma = new PrismaClient();

function buyOrSellQuery(isBuy: boolean) {
  if (isBuy) {
    return {
      buyCount: {
        increment: 1,
      },
    };
  } else {
    return {
      sellCount: {
        increment: 1,
      },
    };
  }
}

export const updateBuyOrSell = async (token: PublicKey, isBuy: boolean) => {
  try {
    const updateToken = await prisma.meme_token_test.update({
      where: {
        mint: token.toBase58(),
      },
      data: buyOrSellQuery(isBuy),
      // data: {
      //   buyCount: {
      //     increment: 1,
      //   },
      // },
    });
    if (updateToken) {
      console.log(updateToken);
      console.log(`updated token ${isBuy ? "buy " : " sell "} number`);
      return true;
    } else {
      return false;
    }
  } catch (error: any) {
    console.log("token not found", error.message);
    return false;
  }
};

const [token, buy] = process.argv.slice(2);
const isBuy = buy === "true";
console.log(token, "token", isBuy, "child");
process.title = "update-token";
process.on("message", async function () {
  // console.log(token.toBase58(), isBuy);
  console.log("created process, updating...");
  const isUpdated = await updateBuyOrSell(new PublicKey(token), isBuy);
  console.log(isUpdated, "<----child");
  isUpdated;
  process.exit();
  // ? process.send({ updateSuccessful: "update successful", isUpdated })
  // : console.log("error killing process");
});

// process.on(
//   "updateBuySell",
//   async (message: any, token: PublicKey, isBuy: boolean) => {
//     if (message == "updateTokens") {
//       console.log("created process, updating...");
//       // const isUpdated = await updateBuyOrSell(token, isBuy);
//       //   process.send("send");
//       //   isUpdated;
//       // ? process.send({ updateSuccessful: "update successful", isUpdated })
//       // : console.log("error killing process");
//     }
//   }
// );
// process.send({message: "hello"})
