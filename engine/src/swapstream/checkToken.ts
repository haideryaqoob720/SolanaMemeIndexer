import { PrismaClient } from "@prisma/client";
import { PublicKey } from "@solana/web3.js";

export const checkToken = async (token: PublicKey): Promise<Boolean> => {
  const prisma = new PrismaClient();
  const isToken = await prisma.meme_token_test.findUnique({
    where: {
      mint: token.toBase58(),
    },
  });
  return isToken ? true : false;
};
