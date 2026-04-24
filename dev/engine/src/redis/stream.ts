import { createClient } from "redis";
import { realTimeTokenMetrics } from "../types";
import Redis, { RedisOptions } from "ioredis";

interface StreamOptions {
  maxLen?: number;
  approximate?: boolean;
}

interface ReadOptions {
  count?: number;
  blockMs?: number;
  autoAck?: boolean;
}

interface StreamEntry {
  id: string;
  [key: string]: any;
}

interface StreamInfo {
  [key: string]: any;
}

export class RedisStream{
    private client:Redis;
    private streamKey:string = "tokenStream";


    constructor(config: RedisOptions){
        this.client = new Redis({
      host: config.host || 'localhost',
      port: config.port || 6379,
      password: "redisLamboRadarDev",
      db: config.db || 0,
    });
        this.client.on("error", (err:any) => console.error("Redis Client Error Stream", err));
    }

    //public functions to interact with stream
    async createTokenStream(mint:string){
         try {
      // Check if the stream exists by attempting to get stream info
      const streamInfo = await this.client.xinfo('STREAM', mint.toString()).catch(() => null);
      
      if (!streamInfo) {
        // If stream doesn't exist, add a dummy message that can be deleted later
        // This is a common pattern to initialize Redis streams
        const initialId = await this.client.xadd(
          mint.toString(),
          '*',  // Auto-generate ID
          'initializer', 'true'
        );
        
        // Delete the initialization entry
        // await this.client.xdel(mint.toString());
      }
      
      return true;
    } catch (error) {
      console.error(`Failed to create stream ${mint}: `, error);
      throw error;
    }
    }

    async writeToStream(
    mint: string, 
    data: realTimeTokenMetrics, 
    id: string = '*', 
    options: StreamOptions = {}
  ): Promise<string | null> {
    try {
      const { maxLen, approximate = true } = options;
      const args: any[] = [];
      
      // Add MAXLEN if specified
      if (maxLen) {
        args.push('MAXLEN');
        if (approximate) {
          args.push('~');
        }
        args.push(maxLen);
      }
      
      // Add ID
      args.push(id);
      
      // Add data fields as key-value pairs
      for (const [key, value] of Object.entries(data)) {
        args.push(key);
        args.push(typeof value === 'object' ? JSON.stringify(value) : String(value));
      }
      
      // Execute XADD command
      return await this.client.xadd(mint, ...args);
    } catch (error) {
      console.error(`Failed to write to stream ${mint}:`, error);
      throw error;
    }
  }

     async readFromStream(
    mint: string, 
    startId: string, 
    options: ReadOptions = {}
  ): Promise<any> {
    try {
      const { count, blockMs } = options;
      const args: any[] = [];
      
      if (blockMs !== undefined) {
        args.push('BLOCK', blockMs);
      }
      
      if (count) {
        args.push('COUNT', count);
      }
      
      args.push('STREAMS', mint, startId);
      
      // Use consumerRedis for blocking operations to keep main connection free
    //   const redis = blockMs !== undefined ? this.consumerRedis : this.redis;

    const results = await this.client.xrevrange(mint, '+', '-', 'COUNT', 1);
    //   const results = await this.client.xread('COUNT', 10, 'STREAMS', mint, 0);

      // Format the results into a more user-friendly structure
      if (!results) {
        // console.log("no results")
        return [];
      }
      
    //   return results[0][1].map(([id, fields]: [string, string[]]) => {
    //     const entry: StreamEntry = { id };
        
    //     // Convert array of field/value pairs to object
    //     for (let i = 0; i < fields.length; i += 2) {
    //       const key = fields[i];
    //       let value = fields[i + 1];
          
    //       // Try to parse JSON values
    //       try {
    //         if (value.startsWith('{') || value.startsWith('[')) {
    //           value = JSON.parse(value);
    //         }
    //       } catch {
    //         // Keep as string if not valid JSON
    //       }
          
    //       entry[key] = value;
    //     }
        
    //     return entry;
    //   });
     const [messageId, fields] = results[0];
    const data:any = {};
    for (let i = 0; i < fields.length; i += 2) {
      data[fields[i]] = fields[i + 1];
    }
    
    return { id: messageId, data };
    } catch (error) {
      console.error(`Failed to read from stream ${mint}:`, error);
      throw error;
    }
  }

async streamExist(mint:string){
    try {
        const exists = await this.client.exists(mint);
    return exists === 1;
    } catch (error:any) {
         if (error.message && error.message.includes('no such key')) {
      return false;
    }
     throw error;
    }
}
    async deleteTokenStream(mint:string){

    }
}