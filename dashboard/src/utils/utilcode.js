import { Connection, PublicKey } from "@solana/web3.js";

// Function to fetch top 20 holders of a token
const top20Holders = async (connection, mintAdd) => {
  try {
    // Fetch the largest token accounts
    const info = await connection.getTokenLargestAccounts(
      new PublicKey(mintAdd),
      "confirmed"
    );
    // console.log(info);

    // Extract the token accounts from the response
    const tokenAccounts = info.value;
    console.log(info);

    // Sort token accounts by amount (descending order)
    tokenAccounts.sort((a, b) => b.uiAmount - a.uiAmount);

    return tokenAccounts;
  } catch (error) {
    console.error("Error fetching top holders:", error);
    throw error;
  }
};

// Function to get top holders data
export const getTopHoldersData = async (mintAddress, setTopHolders) => {
  try {
    const rpc = process.env.REACT_APP_RPC_END_POINT;
    console.log("RPC end point is, ", rpc);
    console.log("mint", mintAddress);

    // Create a connection to the Solana network
    const connection = new Connection(rpc, "confirmed");

    // Fetch the top holders
    const topHolders = await top20Holders(connection, mintAddress);

    // console.log("DATA from RPC IS: ");
    // console.log(topHolders);

    setTopHolders(topHolders);
  } catch (error) {
    console.error("Error in getTopHoldersData:", error);
    // throw error;
  }
};

const calculateSumOfUiAmounts = (topHolders) => {
  // Sum up the uiAmount values
  let sum = 0;
  for (let i = 1; i < topHolders.length; i++) sum += topHolders[i].uiAmount;
  return sum;
};

export const calculatePercent = (topHolders, setPercent) => {
  const sum = calculateSumOfUiAmounts(topHolders);
  const percent = ((sum / 1000000000) * 100).toFixed(2);
  console.log(topHolders);
  // console.log("SUM IS, ", sum);
  // console.log("PERCENTAGE", percent);
  setPercent(percent);
};

export const singleHolderLargeSupply = (topHolders) => {
  // console.log("Executed the single Holder LargerSupply method..");
  const totalSupply = 1000000000;
  for (let i = 1; i < topHolders.length; i++) {
    const percent = (topHolders[i].uiAmount / totalSupply) * 100;
    if (percent > 10)
      console.log("This holder has greater than 10% supply....", percent);
  }
};
