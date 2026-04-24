import prisma from "../prisma/prisma";
import { RugScoreCreateInput } from "../utils/defaultValues";

export const addRugCheck = async (data: RugScoreCreateInput, mint: string) => {
  console.log("data: ", data);
  try {
    const newRugCheck = await prisma.rug_score.create({
      data: {
        ...data,
        token: {
          connect: {
            mint: mint,
          },
        },
      },
    });
    console.log("added new rug check: ", newRugCheck);
    return newRugCheck;
  } catch (error: any) {
    console.error("error adding rug check: ", error.message);
  }
};
