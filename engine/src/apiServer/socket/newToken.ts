import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import Redis from "ioredis";
import { createAdapter } from "@socket.io/redis-adapter";
import express, { Request, Response } from "express";
import { RedisCache } from "../../redis/store";

export class SocketService {
  private io: Server;
  private pubClient: Redis;
  private subClient: Redis;
  private redisChannel: string;
  private trendingChannel: string;

  //   "136.243.172.118"
  constructor(
    httpServer: HttpServer,
    redisHost: string = process.env.REDIS_HOST || "136.243.172.118",
    redisPort: number = parseInt(process.env.REDIS_PORT || "6379"),
    redisPassword: string | undefined = process.env.REDIS_PASSWORD,
    redisChannel: string = process.env.REDIS_CHANNEL || "new-tokens",
    trendingChannel: string = process.env.TRENDING_CHANNEL || "trending-tokens"
  ) {
    // Initialize Socket.io
    this.io = new Server(httpServer, {
      // path: "/new-tokens/socket.io",
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true,
      },
    });
    // httpServer.listen(3003)
    // this.io.listen(httpServer);

    // Redis clients configuration
    const redisOptions = {
      host: redisHost,
      port: redisPort,
      password: "redisLamboRadar",
      retryStrategy: (times: number) => Math.min(times * 5, 3000),
    };

    // Create Redis clients
    this.pubClient = new Redis(redisOptions);
    this.subClient = this.pubClient.duplicate();
    this.redisChannel = redisChannel;
    this.trendingChannel = trendingChannel

    // Set up Redis adapter
    this.io.adapter(createAdapter(this.pubClient, this.subClient));

    // Initialize socket handlers and Redis subscription
    this.initializeSocketHandlers();
    this.initializeRedisSubscription();
  }

  private initializeSocketHandlers(): void {
    this.io.on("connection", (socket: Socket) => {
      // Check if the socket connection is from the new-tokens page
      const referer = socket.handshake.headers.referer || "";

      console.log(`Client connected from new-tokens page: ${socket.id}`);
      socket.join("new-tokens");
      socket.join("trending-tokens")
      if (referer.includes("/api/new-tokens")) {
      }

      socket.on("disconnect", () => {
        console.log(`Client disconnected: ${socket.id}`);
      });
    });
  }

  private initializeRedisSubscription(): void {
    // Subscribe to Redis channel
    this.subClient.subscribe(this.redisChannel, (err: any, count: any) => {
      if (err) {
        console.error("Failed to subscribe to Redis channel:", err);
        return;
      }
      console.log(
        `Subscribed to ${count} channel(s). Listening for updates on ${this.redisChannel}`
      );
      console.log("address: ", this.io.httpServer.address());
    });

    // Listen for messages from Redis and broadcast to clients
    this.subClient.on("message", (channel: string, message: string) => {
      //   console.log(channel, message);
      if (channel === this.redisChannel) {
        try {
          const parsedMessage = JSON.parse(message);
          // Send to the new-tokens room
          if (parsedMessage.action === "update-token") {
            this.io.to("new-tokens").emit("new-token-update", parsedMessage);
            // console.log(
            //   `Redis message forwarded to new-tokens room`,
            //   parsedMessage
            // );
          } else if (parsedMessage.action === "new-token") {
            this.io.to("new-tokens").emit("new-token-update", parsedMessage);
          }
        } catch (error: any) {
          console.error(
            "Error parsing or forwarding Redis message:",
            error.message
          );
        }
      }else if(channel === this.trendingChannel){
        try {
          const parsedMessage = JSON.parse(message);
          console.log(parsedMessage, "trending")
          this.io.to("trending-tokens").emit("trending-update", parsedMessage)
        } catch (error: any) {
          console.error(
            "Error parsing or forwarding Redis message:",
            error.message
          );
        }
      }
    });

    // Handle Redis client errors
    this.pubClient.on("error", (error: any) => {
      console.error("Redis Pub Client Error:", error);
    });

    this.subClient.on("error", (error: any) => {
      console.error("Redis Sub Client Error:", error);
    });
  }

  // Register the API route to the Express app
  public registerRoutes(app: express.Application): void {
    app.get("/api/new-tokens", (req: Request, res: Response) => {
      res.status(200).send({ connected: true });
    });
  }

  public async sendTrendindUpdates(tokenMap:RedisCache){
    const trending = await tokenMap.getAllTrendingTokens();
    try {
          // const parsedMessage = JSON.parse(trending);
          // console.log(trending, "trending")
          this.io.to("trending-tokens").emit("trending-update", trending)
        } catch (error: any) {
          console.error(
            "Error parsing or forwarding Redis message:",
            error.message
          );
        }
  }

  // Cleanup method for graceful shutdown
  public cleanup(): void {
    this.io.close();
    this.pubClient.quit();
    this.subClient.quit();
  }
}

// Export a factory function to create the socket service
export const createSocketService = (httpServer: HttpServer): SocketService => {
  return new SocketService(httpServer);
};


// module.exports = { createSocketService }
