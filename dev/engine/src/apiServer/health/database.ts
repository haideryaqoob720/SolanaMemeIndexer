import Redis from "ioredis";

export const createRedisClient = (): Redis => {
    return new Redis("redis://default:redisLamboRadarDev@136.243.172.118:6379/0", {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
    });
};
