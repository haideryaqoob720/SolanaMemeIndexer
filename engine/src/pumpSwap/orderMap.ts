export class ProcessedOrdersTracker {
    private static instance: ProcessedOrdersTracker;
    private processedOrders = new Map<string, string>();

    private constructor() {}

    static getInstance(): ProcessedOrdersTracker {
        if (!ProcessedOrdersTracker.instance) {
            ProcessedOrdersTracker.instance = new ProcessedOrdersTracker();
        }
        return ProcessedOrdersTracker.instance;
    }

    markProcessed(field: string, value: string): void {
        this.processedOrders.set(field, value);
    }

    isProcessed(field: string): boolean {
        return this.processedOrders.has(field);
    }
}
