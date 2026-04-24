import axios from "axios";
import { checkWebsite } from "./checkWebsite";
import { createDefaultRugCheck } from "../../utils/defaultValues";
import { PublicKey } from "@solana/web3.js";
import { getTransferFeeAudit } from "../filters";
export async function rugCheck(
  mint: string,
  name: string,
  symbol: string,
  socials: string[],
  mintable: boolean,
  freezeable: boolean,
  creatorEquity: number,
  top10Holders:number,
) {
  const rugCheckData = createDefaultRugCheck(mint);
  rugCheckData.is_website_valid = await checkWebsite(socials, name, symbol);

  //get transfer fees
  const fees: boolean | undefined = await getTransferFeeAudit(
    new PublicKey(mint)
  );
  rugCheckData.custom_fees = fees ?? true;
  if(creatorEquity < 3){
    rugCheckData.team_wallet_holdings = true;
  }
  if(top10Holders < 5){
    rugCheckData.top_10_holders = true;
  }
  //if there is no website then the metadata will be concerning.
  rugCheckData.has_concerning_metadata = !rugCheckData.is_website_valid;
  rugCheckData.not_mintable_risk = !mintable;
  rugCheckData.not_freeze_risk = !freezeable;

  const tweets = await getTweets(name);
  if (tweets.hasTweets && tweets.numberOfTweets) {
    rugCheckData.has_tweets = tweets.hasTweets;
    rugCheckData.number_of_twitters = tweets.numberOfTweets;
  }
  return rugCheckData;
}

const getTweets = async (name: string) => {
  try {
    const API_KEY = "880ad3087996f0040fe38e4be9fbb09e";
    const base_url = "https://toto.oz.xyz/api";
    const namespace = "metadata";
    const endpoint = "get_current_metadata";
    const url = `${base_url}/${namespace}/${endpoint}`;

    // to be used when toto api is working with credits

    // const totoResponse = await axios.post(
    //   url,
    //   {
    //     user: name,
    //     how: "username",
    //     page: 1,
    //   },
    //   {
    //     headers: {
    //       accept: "application/json",
    //       "x-api-key": API_KEY,
    //     },
    //   }
    // );
    // const hasTweets = totoResponse.data?.has_tweets;
    // const numberOfTweets = totoResponse.data?.twitters;

    // constant to be chnaged later

    const hasTweets = false;
    const numberOfTweets = 0;

    return { succes: true, hasTweets, numberOfTweets };
  } catch (err: any) {
    console.log("error fetching toto api", err.message);
    return { succes: false, err: err.message };
  }
};
