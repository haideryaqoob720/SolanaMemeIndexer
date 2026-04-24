import { config } from "../config";

function getBalances(txn:any){
      const preToken = txn.meta.preTokenBalances.map((balances:any) => ({
        amt: balances.uiTokenAmount.amount,
        amtString: balances.uiTokenAmount.uiAmountString,
        token: balances.mint,
        programId: balances.programId,
        accountIndex: balances.accountIndex,
        owner: balances.owner,
      }));
      const postToken = txn.meta.postTokenBalances.map((balances:any) => ({
        amt: balances.uiTokenAmount.amount,
        amtString: balances.uiTokenAmount.uiAmountString,
        token: balances.mint,
        programId: balances.programId,
        accountIndex: balances.accountIndex,
        owner: balances.owner,
      }));
      return { preToken, postToken };
}


export function getPoolReserves(txn:any, pool:string, mint:string):{sol:number, token:number}{
  const {preToken, postToken} = getBalances(txn);
  let solReserve:number = 0;
  let tokenReserve:number = 0;
  try {
    
    if (preToken.length !== postToken.length) {
      throw new Error("Arrays have different lengths!");
    }
    for (let i = 0; i < preToken.length; i++) {
      const pre = preToken[i];
      const post = postToken[i];
      if (pre.token !== post.token) {
        console.warn(`Token mismatch at index ${i}: ${pre.token} vs ${post.token}`);
        continue;
      }
      if(pre.token === config.solMint.toBase58() && post.token === config.solMint.toBase58()){
        if(post.owner === pool){
          console.log(post.amt, pre.amt)
          const change = parseFloat(post.amtString)-parseFloat(pre.amtString)
          if(change === 0){
            continue;
          }
          solReserve = parseFloat(post.amtString)
        }
      }
      if(pre.token === mint && post.token === mint){
        if(post.owner === pool){
          const change = parseFloat(post.amtString) - parseFloat(pre.amtString)
          console.log(post.amtString, pre.amtString)
          if(change === 0){
            continue;
          }
          tokenReserve = parseFloat(post.amtString)
        }
      }
    }
  } catch (error:any) {
    console.log("error getting solReserves from prePost balances", error.message)
  }
  return {sol:solReserve, token:tokenReserve}
}


function compareTokenChanges(preToken:any, postToken:any, decodedTx:any, pool:string) {
  let solReserves:number
  // Ensure both arrays have the same length and order
  if (preToken.length !== postToken.length) {
    throw new Error("Arrays have different lengths!");
  }

  const changes = [];

  for (let i = 0; i < preToken.length; i++) {
    const pre = preToken[i];
    const post = postToken[i];

    if (pre.token !== post.token) {
      console.warn(
        `Token mismatch at index ${i}: ${pre.token} vs ${post.token}`
        
      );
        console.log(`https://solscan.io/tx/${decodedTx.transaction.signatures[0]}`)

      continue;
    }
    if (pre.amt !== post.amt) {
      let buySell = "";
      if (pre.token !== config.solMint.toBase58()) {
        const difference = BigInt(pre.amt) - BigInt(post.amt);
        buySell = difference > 0 ? "BUY" : "SELL";
        changes.push({
            index: i,
            token: pre.token,
            preAmount: pre.amt,
            postAmount: post.amt,
            preAmountString: pre.amtString,
            postAmountString: post.amtString,
            isChanged: true,
            preOwner: pre.owner,
            postOwner: post.owner,
            buySell,
        });
    }
}
  }

  return changes;
}


export const getPools = (txn:any, pool:string) => {
    const {preToken, postToken} = getBalances(txn);
    try {
        const changes = compareTokenChanges(preToken, postToken, txn, pool);
        return changes;
    } catch (error:any) {
        return []
        // console.log("error comparing token changes: ", error.message);
    }
}


