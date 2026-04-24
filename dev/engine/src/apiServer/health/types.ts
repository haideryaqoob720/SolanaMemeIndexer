export interface HealthMetrics {
    timestamp: string;
    status: "healthy" | "degraded" | "unhealthy";
    services: {
        postgres: {
            status: "up" | "down";
            activeConnections: number;
            totalConnections: number;
            responseTime: number;
        };
        redis: {
            status: "up" | "down";
            connections: number;
            responseTime: number;
            memoryUsage: string;
        };
    };
    system: {
        cpu: {
            usage: number;
            loadAverage: number[];
        };
        memory: {
            total: number;
            used: number;
            free: number;
            usage: number;
        };
        network: {
            dataIn: number;
            dataOut: number;
        };
    };
    uptime: number;
}

export interface NetworkStats {
    bytesReceived: number;
    bytesTransmitted: number;
}

export interface DetailedHealthMetrics extends HealthMetrics {
    system: HealthMetrics["system"] & {
        platform: string;
        arch: string;
        hostname: string;
        nodeVersion: string;
        processUptime: number;
        processMemory: NodeJS.MemoryUsage;
    };
}
