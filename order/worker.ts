import { OrderWorker } from "./src/workers/orderProcessor";

// Create and start 3 virtual workers
const workers: any = [];
const totalWorkers: number = parseInt(process.env.WORKERS ?? "3");
for (let i = 0; i < totalWorkers; i++) {
    const config = {
        workerId: `${process.env.WORKER_ID || "worker"}_virtual_${i}`,
    };

    const worker = new OrderWorker(config);
    workers.push(worker);

    // Start worker without awaiting (non-blocking)
    worker.start().catch(console.error);
}

console.log(`${process.env.WORKERS} virtual workers started`);

// Keep process alive
process.on("SIGTERM", async () => {
    console.log("Shutting down virtual workers...");
    await Promise.all(workers.map((w: any) => w.stop()));
    process.exit(0);
});

// Simple keep-alive
setInterval(async () => {
    console.log(`${workers.length} virtual workers running`);
    await Promise.all(workers.map((w: any) => w.getWorkerStats()));
}, 5000);
