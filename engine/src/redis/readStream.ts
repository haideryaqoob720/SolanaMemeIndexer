import { RedisStream } from "./stream"

export async function listenToStreamUpdates(mintId: string, redis:RedisStream): Promise<void> {
  let lastId = '$'; // Start with $ to only get new entries
  
  while (true) {
    try {
      // Block indefinitely (0 means no timeout) until new data arrives
      const updates = await redis.readFromStream(mintId, lastId, {
        blockMs: 0  // Block indefinitely
      });
      
      if (updates.length > 0) {
        // Process each update
        for (const update of updates) {
          console.log('New token metrics:', update);
          process.stdout.write('\r\x1b[K');
        process.stdout.write(`\rToken: ${mintId || 'Unknown'} | Price: $${update.priceSol || '0.00'}`);
          // Your processing logic here
        }
        
        // Update lastId to the ID of the most recent entry
        lastId = updates[updates.length - 1].id;
      }
    } catch (error) {
      console.error('Error reading from stream:', error);
      // Optional: add delay before reconnecting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}