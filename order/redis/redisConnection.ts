import { createClient, type RedisClientType } from "redis";

class RedisConnection {
    private client: RedisClientType;
    constructor() {
        this.client = createClient({
            url:
                process.env.REDIS_URL ??
                "redis://default:redisLamboRadar@46.4.21.252:6379/0",
        });
        this.client.on("error", (err) =>
            console.error("Redis Client Error Main", err),
        );
    }
    getClient(): RedisClientType {
        return this.client;
    }
    async connect() {
        await this.client.connect();
    }

    async disconnect() {
        await this.client.disconnect();
    }
}

let redisConnection: RedisConnection | null = null;

async function getRedisConnection(): Promise<RedisConnection> {
    if (!redisConnection) {
        redisConnection = new RedisConnection();
        await redisConnection.connect();
    }
    return redisConnection;
}

export { RedisConnection, getRedisConnection };
