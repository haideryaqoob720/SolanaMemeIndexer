// processManager.ts - Process management logic (FIXED)
import { spawn } from "bun";
import type { OrderRequest } from "./src/types";

interface ProcessManagerOptions {
    maxConcurrentProcesses?: number;
    processTimeout?: number;
}

interface ProcessInfo {
    id: string;
    startTime: number;
    timeout: Timer | null;
}

interface ProcessResult {
    success: boolean;
    data: any;
    processingTime: number;
    requestId: string;
}

interface Metrics {
    totalRequests: number;
    activeProcesses: number;
    completedProcesses: number;
    failedProcesses: number;
    averageProcessTime: number;
    timestamp?: string;
}

export class ProcessManager {
    public readonly maxConcurrentProcesses: number;
    private readonly processTimeout: number;
    private activeProcesses: Map<string, ProcessInfo>;
    private processQueue: any[];
    private metrics: Metrics;

    constructor(options: ProcessManagerOptions = {}) {
        this.maxConcurrentProcesses = options.maxConcurrentProcesses || 10;
        this.processTimeout = options.processTimeout || 300000; // 30 seconds
        this.activeProcesses = new Map();
        this.processQueue = [];
        this.metrics = {
            totalRequests: 0,
            activeProcesses: 0,
            completedProcesses: 0,
            failedProcesses: 0,
            averageProcessTime: 0,
        };
    }

    async executeProcess(
        orderData: OrderRequest,
        requestId: string,
    ): Promise<ProcessResult> {
        if (this.activeProcesses.size >= this.maxConcurrentProcesses) {
            throw new Error(
                "Maximum concurrent processes reached. Please try again later.",
            );
        }

        const startTime = Date.now();
        const processInfo: ProcessInfo = {
            id: requestId,
            startTime,
            timeout: null,
        };

        try {
            this.activeProcesses.set(requestId, processInfo);
            this.metrics.activeProcesses = this.activeProcesses.size;
            this.metrics.totalRequests++;

            // Create timeout promise
            const timeoutPromise = new Promise<never>((_, reject) => {
                processInfo.timeout = setTimeout(() => {
                    reject(new Error("Process timeout"));
                }, this.processTimeout);
            });

            // Execute the worker process
            const processPromise = this.spawnWorkerProcess(
                orderData,
                requestId,
            );

            // Race between process completion and timeout
            const result = await Promise.race([processPromise, timeoutPromise]);

            // Clear timeout if process completed successfully
            if (processInfo.timeout) {
                clearTimeout(processInfo.timeout);
            }

            const endTime = Date.now();
            const processingTime = endTime - startTime;

            // Update metrics
            this.updateMetrics(processingTime, true);

            return {
                success: true,
                data: result,
                processingTime,
                requestId,
            };
        } catch (error: any) {
            this.updateMetrics(Date.now() - startTime, false);
            throw error;
        } finally {
            this.activeProcesses.delete(requestId);
            this.metrics.activeProcesses = this.activeProcesses.size;
        }
    }

    private async spawnWorkerProcess(
        orderData: OrderRequest,
        requestId: string,
    ): Promise<any> {
        // console.log(orderData, "processManager");

        return new Promise(async (resolve, reject) => {
            try {
                // Spawn worker process
                const worker = spawn({
                    cmd: ["bun", "worker.js"],
                    stdin: "pipe",
                    stdout: "pipe",
                    stderr: "pipe",
                    env: {
                        ...process.env,
                        REQUEST_ID: requestId,
                        WORKER_MODE: "true",
                    },
                });

                // Send order data to worker immediately
                if (worker.stdin) {
                    // const writer = worker.stdin.getWriter();
                    const encoder = new TextEncoder();
                    worker.stdin.write(
                        encoder.encode(JSON.stringify(orderData) + "\n"),
                    );
                    worker.stdin.end();
                    // await worker.stdin.close();
                }

                // Read stdout completely
                const stdoutPromise = this.readStream(worker.stdout);
                const stderrPromise = this.readStream(worker.stderr);

                // Wait for process to complete
                const [exitCode, stdoutData, stderrData] = await Promise.all([
                    worker.exited,
                    stdoutPromise,
                    stderrPromise,
                ]);

                if (exitCode === 0) {
                    try {
                        const result = JSON.parse(stdoutData.trim());
                        resolve(result);
                    } catch (parseError: any) {
                        reject(
                            new Error(
                                `Failed to parse worker output: ${parseError.message}\nOutput: ${stdoutData}`,
                            ),
                        );
                    }
                } else {
                    reject(
                        new Error(
                            `Worker process failed with exit code ${exitCode}: ${stderrData}`,
                        ),
                    );
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    private async readStream(
        stream: ReadableStream<Uint8Array> | null,
    ): Promise<string> {
        if (!stream) return "";

        const reader = stream.getReader();
        const decoder = new TextDecoder();
        let result = "";

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                result += decoder.decode(value, { stream: true });
            }
            // Final decode call to flush any remaining bytes
            result += decoder.decode();
        } finally {
            reader.releaseLock();
        }

        return result;
    }

    private updateMetrics(processingTime: number, success: boolean): void {
        if (success) {
            this.metrics.completedProcesses++;
        } else {
            this.metrics.failedProcesses++;
        }

        // Update average processing time
        const totalCompleted = this.metrics.completedProcesses;
        if (totalCompleted > 0) {
            this.metrics.averageProcessTime =
                (this.metrics.averageProcessTime * (totalCompleted - 1) +
                    processingTime) /
                totalCompleted;
        }
    }

    getMetrics(): Metrics {
        return {
            ...this.metrics,
            timestamp: new Date().toISOString(),
        };
    }

    async gracefulShutdown(): Promise<void> {
        console.log("Shutting down process manager...");

        // Wait for active processes to complete (with timeout)
        const shutdownTimeout = 10000; // 10 seconds
        const startTime = Date.now();

        while (
            this.activeProcesses.size > 0 &&
            Date.now() - startTime < shutdownTimeout
        ) {
            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        // Force kill remaining processes
        for (const [requestId, processInfo] of this.activeProcesses) {
            if (processInfo.timeout) {
                clearTimeout(processInfo.timeout);
            }
            console.log(`Force terminating process: ${requestId}`);
        }

        this.activeProcesses.clear();
        console.log("Process manager shutdown complete");
    }
}
