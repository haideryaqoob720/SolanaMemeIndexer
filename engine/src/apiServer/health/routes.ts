import { Router } from "express";
import { HealthController } from "./controller";
import { HealthService } from "./service";
import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";

export const createHealthRoutes = (
    prisma: PrismaClient,
    redisClient: Redis,
): Router => {
    const router = Router();

    // Initialize service and controller
    const healthService = new HealthService(prisma, redisClient);
    const healthController = new HealthController(healthService);

    // Define routes
    router.get("/", healthController.getHealth);
    router.get("/detailed", healthController.getDetailedHealth);
    router.get("/live", healthController.getLiveness);
    router.get("/ready", healthController.getReadiness);

    return router;
};
