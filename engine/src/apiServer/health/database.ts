import Redis from "ioredis";

export const createRedisClient = (): Redis => {
    return new Redis("redis://default:redisLamboRadar@46.4.21.252:6379/0", {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
    });
};
