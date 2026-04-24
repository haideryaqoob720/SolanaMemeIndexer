const redis = require("redis");

class RedisPipeline {
    private client;
    private pipeline: any;
    private operations: any[];
    constructor(redisUrl = "redis://localhost:6379") {
        this.client = redis.createClient({ url: redisUrl });
        this.client.connect();
        this.pipeline = null;
        this.operations = [];
    }

    start() {
        this.pipeline = this.client.multi();
        this.operations = [];
        return this;
    }

    add(classInstance: any, methodName: any, ...args: any[]) {
        if (!this.pipeline) this.start();

        // Get the method and bind it to the pipeline instead of redis client
        const method = classInstance[methodName].bind({
            client: this.pipeline,
            ...classInstance,
        });

        this.operations.push(() => method(...args));
        return this;
    }

    async execute() {
        if (!this.pipeline) return [];

        // Execute all operations to build the pipeline
        this.operations.forEach((op) => op());

        const results = await this.pipeline.exec();
        this.pipeline = null;
        this.operations = [];

        return results;
    }

    async close() {
        await this.client.quit();
    }
}

module.exports = RedisPipeline;
