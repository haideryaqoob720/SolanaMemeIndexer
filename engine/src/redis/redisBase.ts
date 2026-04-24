import { createClient, RedisClientOptions, RedisClientType, RedisDefaultModules, RedisFunctions, RedisScripts } from 'redis';

export abstract class BaseRedisClient {
  protected static instance: BaseRedisClient | null = null;
  protected client: RedisClientType<RedisDefaultModules, RedisFunctions, RedisScripts>;
  protected readonly moduleName: string;
  protected connected: boolean = false;
  protected redisUrl:string = process.env.REDIS_URL ?? "redis://default:redisLamboRadar@136.243.172.118:6379/0"

  protected constructor(moduleName: string) {
    this.moduleName = moduleName;
    this.client = createClient({url: this.redisUrl});
    
    // Setup error handling
    this.client.on('error', (err) => {
      console.error(`[${this.moduleName}] Redis Error:`, err);
      this.connected = false;
    });
    
    this.client.on('connect', () => {
      console.log(`[${this.moduleName}] Redis connected successfully`);
      this.connected = true;
    });
    
    this.client.on('reconnecting', () => {
      console.log(`[${this.moduleName}] Redis reconnecting...`);
    });
    
    this.client.on('end', () => {
      console.log(`[${this.moduleName}] Redis connection closed`);
      this.connected = false;
    });
    
    // Connect to Redis
    this.connect().catch(err => {
      console.error(`[${this.moduleName}] Failed to connect to Redis:`, err);
    });
    
    // Handle graceful shutdown
    const handleExit = async () => {
      try {
        await this.disconnect();
        process.exit(0);
      } catch (err) {
        console.error(`[${this.moduleName}] Error disconnecting from Redis:`, err);
        process.exit(1);
      }
    };
    
    process.on('SIGINT', handleExit);
    process.on('SIGTERM', handleExit);
  }

  // Method to ensure connection is established
  protected async ensureConnection(): Promise<void> {
    if (!this.connected) {
      await this.connect();
    }
  }

  // Connect to Redis
  protected async connect(): Promise<void> {
    if (!this.connected) {
      await this.client.connect();
      this.connected = true;
    }
  }
  public async disconnect(): Promise<void> {
    if (this.connected) {
      await this.client.quit();
      this.connected = false;
      console.log(`[${this.moduleName}] Redis disconnected`);
    }
  }

  // Abstract static method that child classes must implement to get the instance
  public static getInstance(options?: RedisClientOptions): BaseRedisClient {
    throw new Error('Method getInstance() must be implemented by child classes');
  }
}