import { Request, Response } from "express";
import { HealthService } from "./service";

export class HealthController {
    constructor(private healthService: HealthService) {}

    public getHealth = async (req: Request, res: Response): Promise<void> => {
        try {
            const metrics = await this.healthService.getHealthMetrics();

            // Optionally log health check to database
            // await this.healthService.logHealthCheck(metrics);

            // Set appropriate HTTP status code based on health
            const statusCode =
                metrics.status === "healthy"
                    ? 200
                    : metrics.status === "degraded"
                      ? 206
                      : 503;

            res.status(statusCode).json(metrics);
        } catch (error) {
            console.error("Health check error:", error);
            res.status(500).json({
                timestamp: new Date().toISOString(),
                status: "unhealthy",
                error: "Health check failed",
            });
        }
    };

    public getDetailedHealth = async (
        req: Request,
        res: Response,
    ): Promise<void> => {
        try {
            const metrics = await this.healthService.getDetailedHealthMetrics();

            const statusCode =
                metrics.status === "healthy"
                    ? 200
                    : metrics.status === "degraded"
                      ? 206
                      : 503;

            res.status(statusCode).json(metrics);
        } catch (error) {
            console.error("Detailed health check error:", error);
            res.status(500).json({
                timestamp: new Date().toISOString(),
                status: "unhealthy",
                error: "Detailed health check failed",
            });
        }
    };

    public getLiveness = (req: Request, res: Response): void => {
        const isAlive = this.healthService.isAlive();

        res.status(200).json({
            status: "alive",
            timestamp: new Date().toISOString(),
        });
    };

    public getReadiness = async (
        req: Request,
        res: Response,
    ): Promise<void> => {
        try {
            const readiness = await this.healthService.checkReadiness();

            if (readiness.ready) {
                res.status(200).json({
                    status: "ready",
                    timestamp: new Date().toISOString(),
                });
            } else {
                res.status(503).json({
                    status: "not ready",
                    postgres: readiness.postgres,
                    redis: readiness.redis,
                    timestamp: new Date().toISOString(),
                });
            }
        } catch (error) {
            res.status(503).json({
                status: "not ready",
                error: (error as Error).message,
                timestamp: new Date().toISOString(),
            });
        }
    };
}
