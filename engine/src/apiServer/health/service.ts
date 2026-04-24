import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";
import os from "os";
import fs from "fs";
import { HealthMetrics, NetworkStats, DetailedHealthMetrics } from "./types";

export class HealthService {
    private prisma: PrismaClient;
    private redisClient: Redis;
    private networkStatsHistory: NetworkStats[] = [];
    private startTime: number;

    constructor(prisma: PrismaClient, redisClient: Redis) {
        this.prisma = prisma;
        this.redisClient = redisClient;
        this.startTime = Date.now();

        // Start collecting network stats periodically
        this.collectNetworkStats();
        setInterval(() => this.collectNetworkStats(), 5000); // Every 5 seconds
    }

    private async collectNetworkStats(): Promise<void> {
        try {
            const stats = await this.getNetworkStats();
            this.networkStatsHistory.push(stats);

            // Keep only last 10 measurements for rate calculation
            if (this.networkStatsHistory.length > 10) {
                this.networkStatsHistory.shift();
            }
        } catch (error) {
            console.error("Error collecting network stats:", error);
        }
    }

    private async getNetworkStats(): Promise<NetworkStats> {
        try {
            const data = await fs.promises.readFile("/proc/net/dev", "utf8");
            const lines = data.split("\n");
            let totalReceived = 0;
            let totalTransmitted = 0;

            for (const line of lines) {
                if (line.includes(":") && !line.includes("lo:")) {
                    // Skip loopback
                    const parts = line.trim().split(/\s+/);
                    if (parts.length >= 10) {
                        totalReceived += parseInt(parts[1]) || 0;
                        totalTransmitted += parseInt(parts[9]) || 0;
                    }
                }
            }

            return {
                bytesReceived: totalReceived,
                bytesTransmitted: totalTransmitted,
            };
        } catch (error) {
            // Fallback for non-Linux systems or if /proc/net/dev is not available
            return { bytesReceived: 0, bytesTransmitted: 0 };
        }
    }

    private getNetworkRate(): { dataIn: number; dataOut: number } {
        if (this.networkStatsHistory.length < 2) {
            return { dataIn: 0, dataOut: 0 };
        }

        const current =
            this.networkStatsHistory[this.networkStatsHistory.length - 1];
        const previous =
            this.networkStatsHistory[this.networkStatsHistory.length - 2];

        // Calculate bytes per second (approximate)
        const dataIn = Math.max(
            0,
            (current.bytesReceived - previous.bytesReceived) / 5,
        ); // 5 second interval
        const dataOut = Math.max(
            0,
            (current.bytesTransmitted - previous.bytesTransmitted) / 5,
        );

        return { dataIn, dataOut };
    }

    private async checkPostgresHealth(): Promise<
        HealthMetrics["services"]["postgres"]
    > {
        try {
            const startTime = Date.now();

            // Use Prisma's raw query to get connection stats
            const result = await this.prisma.$queryRaw<
                Array<{
                    active_connections: bigint;
                    max_connections: number;
                }>
            >`
        SELECT
          count(*) as active_connections,
          (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections
        FROM pg_stat_activity
        WHERE state = 'active'
      `;

            const responseTime = Date.now() - startTime;
            const { active_connections, max_connections } = result[0];

            return {
                status: "up",
                activeConnections: Number(active_connections),
                totalConnections: max_connections,
                responseTime,
            };
        } catch (error) {
            console.error("PostgreSQL health check failed:", error);
            return {
                status: "down",
                activeConnections: 0,
                totalConnections: 0,
                responseTime: -1,
            };
        }
    }

    private async checkRedisHealth(): Promise<
        HealthMetrics["services"]["redis"]
    > {
        try {
            const startTime = Date.now();

            // Test Redis connection and get info
            await this.redisClient.ping();
            const info = await this.redisClient.info();

            const responseTime = Date.now() - startTime;

            // Parse Redis info for connection count and memory usage
            const lines = info.split("\r\n");
            let connections = 0;
            let memoryUsage = "0B";

            for (const line of lines) {
                if (line.startsWith("connected_clients:")) {
                    connections = parseInt(line.split(":")[1]);
                }
                if (line.startsWith("used_memory_human:")) {
                    memoryUsage = line.split(":")[1];
                }
            }

            return {
                status: "up",
                connections,
                responseTime,
                memoryUsage,
            };
        } catch (error) {
            console.error("Redis health check failed:", error);
            return {
                status: "down",
                connections: 0,
                responseTime: -1,
                memoryUsage: "0B",
            };
        }
    }

    private getCPUUsage(): { usage: number; loadAverage: number[] } {
        const cpus = os.cpus();
        let totalIdle = 0;
        let totalTick = 0;

        for (const cpu of cpus) {
            for (const type in cpu.times) {
                totalTick += cpu.times[type as keyof typeof cpu.times];
            }
            totalIdle += cpu.times.idle;
        }

        const idle = totalIdle / cpus.length;
        const total = totalTick / cpus.length;
        const usage = 100 - ~~((100 * idle) / total);

        return {
            usage,
            loadAverage: os.loadavg(),
        };
    }

    private getMemoryUsage(): HealthMetrics["system"]["memory"] {
        const total = os.totalmem();
        const free = os.freemem();
        const used = total - free;
        const usage = (used / total) * 100;

        return {
            total: Math.round(total / 1024 / 1024), // MB
            used: Math.round(used / 1024 / 1024), // MB
            free: Math.round(free / 1024 / 1024), // MB
            usage: Math.round(usage * 100) / 100,
        };
    }

    public async getHealthMetrics(): Promise<HealthMetrics> {
        const [postgres, redis] = await Promise.all([
            this.checkPostgresHealth(),
            this.checkRedisHealth(),
        ]);

        const cpu = this.getCPUUsage();
        const memory = this.getMemoryUsage();
        const network = this.getNetworkRate();

        // Determine overall status
        let status: HealthMetrics["status"] = "healthy";
        if (postgres.status === "down" || redis.status === "down") {
            status = "unhealthy";
        } else if (cpu.usage > 80 || memory.usage > 90) {
            status = "degraded";
        }

        return {
            timestamp: new Date().toISOString(),
            status,
            services: {
                postgres,
                redis,
            },
            system: {
                cpu,
                memory,
                network,
            },
            uptime: Math.floor((Date.now() - this.startTime) / 1000),
        };
    }

    public async getDetailedHealthMetrics(): Promise<DetailedHealthMetrics> {
        const baseMetrics = await this.getHealthMetrics();

        return {
            ...baseMetrics,
            system: {
                ...baseMetrics.system,
                platform: os.platform(),
                arch: os.arch(),
                hostname: os.hostname(),
                nodeVersion: process.version,
                processUptime: process.uptime(),
                processMemory: process.memoryUsage(),
            },
        };
    }

    public async checkReadiness(): Promise<{
        ready: boolean;
        postgres: boolean;
        redis: boolean;
    }> {
        try {
            // Quick checks for essential services using Prisma
            const pgCheck = this.prisma.$queryRaw`SELECT 1 as test`
                .then(() => true)
                .catch(() => false);

            const redisCheck = this.redisClient
                .ping()
                .then(() => true)
                .catch(() => false);

            const [postgres, redis] = await Promise.all([pgCheck, redisCheck]);

            return {
                ready: postgres && redis,
                postgres,
                redis,
            };
        } catch (error) {
            return {
                ready: false,
                postgres: false,
                redis: false,
            };
        }
    }

    public isAlive(): boolean {
        return true; // Simple liveness check
    }
}
