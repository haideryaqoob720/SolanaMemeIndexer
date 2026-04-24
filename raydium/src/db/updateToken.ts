import { Prisma, PrismaClient } from "@prisma/client";
import { getAllMetrics } from "../filters/filters";
import prisma from "../prisma/prisma";

// const prisma = new PrismaClient();

const updateToken = async (id: number, mint: string, data: any) => {
  const updatedToken = await prisma.meme_token_test.update({
    where: {
      mint: mint,
    },
    data: data,
  });
  return updatedToken;
};

export const updateBatch = async (batchAmount: number) => {
  const batch = await prisma.meme_token_test.findMany({
    take: batchAmount,
  });
  batch.map(async (token, index) => {
    console.log(`***${index} updating ${token.mint}***`);
    const data = await getAllMetrics(token.mint, token.creator);
    new Promise((resolve) => setTimeout(resolve, 10000));
    const updatedToken = await updateToken(token.id, token.mint, data);
    console.log(updatedToken, "updated token");
  });
};
