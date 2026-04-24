import { RedisClientType } from "@redis/client";
import getRedisClient from "./store";

interface TxData {
  totalTx: number;
  buyTx: number;
  sellTx: number;
  createdAt: string;
}

interface Counter {
  pumpswapTx: number;
  pumpfunTx: number;
  raydiumTx: number;
}

export class TxAnalytics {
  private client: RedisClientType;
  private keyPrefix: string = "txns_analytics";

  constructor(client: RedisClientType) {
    this.client = client;
  }

  private getCurrentHour(): string {
    return new Date().getHours().toString();
  }

  private getKey(): string {
    return `${this.keyPrefix}:${this.getCurrentHour()}`;
  }

  private getDexKey(dex: string): keyof Counter | null {
    const mapping: Record<string, keyof Counter> = {
      pumpswap: "pumpswapTx",
      pumpfun: "pumpfunTx",
      raydium: "raydiumTx",
    };
    return mapping[dex.toLowerCase()] || null;
  }

  async saveAnalytics(
    mint: string,
    isBuy: boolean,
    dex: string,
    created_at: string
  ) {
    const key = this.getKey();

    // Get existing data for this mint
    let existingMintData: TxData | null = null;
    try {
      const raw = await this.client.hGet(key, mint);
      if (raw) existingMintData = JSON.parse(raw);
    } catch (err) {
      console.error("Failed to parse mint data:", (err as Error).message);
    }

    const newMintData: TxData = existingMintData || {
      totalTx: 0,
      buyTx: 0,
      sellTx: 0,
      createdAt: created_at,
    };

    newMintData.totalTx += 1;
    if (isBuy) newMintData.buyTx += 1;
    else newMintData.sellTx += 1;

    await this.client.hSet(key, mint, JSON.stringify(newMintData));
    // Handle counter
    await this.increaseCounter(dex);
  }

  async getMintAnalytics(hour: string): Promise<Record<string, TxData>> {
    const key = `${this.keyPrefix}:${hour}`;
    const allFields = await this.client.hGetAll(key);

    const mintMap: Record<string, TxData> = {};

    for (const [field, value] of Object.entries(allFields)) {
      if (field === "counter") continue;

      try {
        mintMap[field] = JSON.parse(value);
      } catch (err) {
        console.error(`Failed to parse field '${field}':`, err);
      }
    }
    return mintMap;
  }

  async getCounter(hour: string): Promise<Counter | null> {
    const key = `${this.keyPrefix}:${hour}`;
    const raw = await this.client.hGet(key, "counter");
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch (err) {
      console.error("Counter parse error:", err);
      return null;
    }
  }
  
  async deleteHourAnalytics(hour: string): Promise<void> {
    const key = `${this.keyPrefix}:${hour}`;
    try {
      const deleted = await this.client.del(key);
      if (deleted === 1) {
        console.log(`Deleted Redis key: ${key}`);
      } else {
        console.log(`No Redis key found to delete: ${key}`);
      }
    } catch (err) {
      console.error(`Failed to delete Redis key ${key}:`, err);
    }
  }

  private formatDateToYMD(dateInput: string | Date): string {
    const date = new Date(dateInput);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0"); // getMonth() is 0-based
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  private getCounterKey(date?: Date): string {
    const requiredDate = date ?? new Date();
    const dateKey = this.formatDateToYMD(requiredDate);
    return `${this.keyPrefix}:${dateKey}`;
  }

  async increaseCounter(dex:string){
    const key = this.getCounterKey();
    const dexKey = this.getDexKey(dex);
    if (dexKey) {
      let counter: Counter = {
        pumpswapTx: 0,
        pumpfunTx: 0,
        raydiumTx: 0,
      };

      try {
        const rawCounter = await this.client.hGet(key, "counter");
        if (rawCounter) counter = JSON.parse(rawCounter);
      } catch (err) {
        console.error("Failed to parse counter:", err);
      }

      counter[dexKey] += 1;

      await this.client.hSet(key, "counter", JSON.stringify(counter));
    }

  }

  async getCounterValue(date?:Date): Promise<Counter | null> {
    const key = this.getCounterKey(date);
    const raw = await this.client.hGet(key, "counter");
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (err) {
      console.error("Counter parse error:", err);
      return null;
    }
  }

  async deleteCounterValue(date: Date){
    const key = this.getCounterKey(date);
    try {
      const deleted = await this.client.del(key);
      if (deleted === 1) {
        console.log(`Deleted Redis key: ${key}`);
      } else {
        console.log(`No Redis key found to delete: ${key}`);
      }
    } catch (err) {
      console.error(`Failed to delete Redis key ${key}:`, err);
    }

  }

}

let analytics: TxAnalytics | null = null;

async function getTxAnalytics() {
  const tokenMap = await getRedisClient();
  const client: any = tokenMap.getClient();
  if (!analytics) {
    analytics = new TxAnalytics(client);
  }
  return analytics;
}

export default getTxAnalytics;
