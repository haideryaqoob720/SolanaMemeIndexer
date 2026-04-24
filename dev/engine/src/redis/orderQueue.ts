import getRedisClient from "./store";


export async function getOrderQueueStats(): Promise<{
  pending: number;
  processing: number;
  failed: number;
}> {
    const tokenMap = await getRedisClient();
    const client: any = tokenMap.getClient();
  if (!client.isOpen) {
    await client.connect();
  }

  const [pending, processing, failed] = await Promise.all([
    client.lLen("orders:queue"),
    client.lLen("orders:processing"),
    client.lLen("orders:failed"),
  ]);

  return { pending, processing, failed };
}
