import { RedisClientType } from "redis";
import getRedisClient from "./store";

export interface strategyPendingVolume {
    volumePending: number; //usd value of order in pending state
}

class OrderVolumeStore {
    private key: string = "orderVolume";
    private client: RedisClientType;
    private volumeCheckAndUpdateScript = `
          local hashKey = KEYS[1]
          local field = ARGV[1]
          local maxVolume = tonumber(ARGV[2])
          local changeValue = tonumber(ARGV[3])
          local isBuy = ARGV[4] == "true"

          -- Get current volume from the hash field
          local currentData = redis.call('HGET', hashKey, field)
          local currentVolume = 0

          if currentData then
              -- Parse JSON to get volumePending value
              local decoded = cjson.decode(currentData)
              currentVolume = tonumber(decoded.volumePending) or 0
          end

          -- If current volume is negative, reset to 0 and return false
          if currentVolume < 0 then
              local newData = cjson.encode({volumePending = 0})
              redis.call('HSET', hashKey, field, newData)
              return 0  -- false
          end

          local newVolume

          if isBuy then
              -- BUY LOGIC
              -- If current volume >= maxVolume, return false (cannot increment)
              if currentVolume >= maxVolume then
                  return 0  -- false
              end

              -- Check if increment would exceed maxVolume
              if (currentVolume + changeValue) > maxVolume then
                  return 0  -- false - would exceed limit
              end

              -- Increment is allowed
              newVolume = currentVolume + changeValue
          else
              -- SELL LOGIC
              -- Always allow sells (decrement)
              newVolume = math.max(0, currentVolume - changeValue)
          end

          -- Update the volume
          local newData = cjson.encode({volumePending = newVolume})
          redis.call('HSET', hashKey, field, newData)

          return 1  -- true`;

    constructor(client: RedisClientType) {
        this.client = client;
    }

    async getAllUsersOrderVolume(): Promise<Map<
        string,
        strategyPendingVolume
    > | null> {
        const data = await this.client.hGetAll(this.key);
        if (!data) return null;
        const map = new Map<string, strategyPendingVolume>();
        Object.entries(data).forEach(([key, value]) => {
            map.set(key, JSON.parse(value) as strategyPendingVolume);
        });
        return map;
    }

    async updatePendingOrderVolume(
        userId: number | string,
        strategyId: number | string,
        orderAmount: number,
        isBuy: boolean,
    ) {
        let volume: strategyPendingVolume = { volumePending: 0 };
        let data = await this.client.hGet(this.key, `${userId}:${strategyId}`);
        if (!data && isBuy) {
            volume.volumePending += orderAmount;
            volume.volumePending = parseFloat(volume.volumePending.toFixed(2));
            await this.client.hSet(
                this.key,
                `${userId}:${strategyId}`,
                JSON.stringify(volume),
            );
        } else if (data) {
            let currentVolume = JSON.parse(data);
            if (currentVolume.volumePending === 0 && !isBuy) {
                currentVolume.volumePending = 0;
            } else {
                isBuy
                    ? (currentVolume.volumePending += orderAmount)
                    : (currentVolume.volumePending -= orderAmount);
            }
            if (currentVolume.volumePending < 0) {
                currentVolume.volumePending = 0;
            }
            currentVolume.volumePending = parseFloat(
                currentVolume.volumePending.toFixed(2),
            );
            await this.client.hSet(
                this.key,
                `${userId}:${strategyId}`,
                JSON.stringify(currentVolume),
            );
        }
    }
    /*
   if current volume exceeds the max volume in the strategy then return false.
   Order should not be placed
*/
    async canPlaceOrder(
        userId: number | string,
        strategyId: number | string,
        maxVolume: number,
    ) {
        const currentVolume = await this.client.hGet(
            this.key,
            `${userId}:${strategyId}`,
        );
        if (!currentVolume) {
            return true;
        }
        const volume = JSON.parse(currentVolume);
        console.log(volume.volumePending, maxVolume, "orderVolume");
        return volume.volumePending < maxVolume;
    }
    async canPlaceAndUpdateOrder(
        field: string,
        maxVolume: number,
        changeValue: number,
        isBuy: boolean,
    ): Promise<boolean> {
        const result = await this.client.eval(this.volumeCheckAndUpdateScript, {
            keys: [this.key],
            arguments: [
                field,
                maxVolume.toString(),
                changeValue.toString(),
                isBuy.toString(),
            ],
        });
        return result === 1;
    }
}

let orderVolumeCache: OrderVolumeStore | null = null;

async function getOrderVolumeStore() {
    const tokenMap = await getRedisClient();
    const client: any = tokenMap.getClient();
    if (!orderVolumeCache) {
        orderVolumeCache = new OrderVolumeStore(client);
    }
    return orderVolumeCache;
}

export { getOrderVolumeStore, OrderVolumeStore };
