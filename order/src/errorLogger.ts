import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

const errorLoggerWithRotation = winston.createLogger({
    level: "error",
    format: winston.format.combine(
        winston.format.timestamp({
            format: "YYYY-MM-DD HH:mm:ss",
        }),
        winston.format.errors({ stack: true }),
        winston.format.json(),
    ),
    transports: [
        new DailyRotateFile({
            filename: "/root/orderService/orderProcessorError-%DATE%.log",
            datePattern: "YYYY-MM-DD",
            zippedArchive: true, // Compress old files
            maxSize: "20m", // Max file size before rotation
            maxFiles: "2d", // Keep files for 7 days
            createSymlink: true, // Create symlink to current file
            symlinkName: "orderProcessorError.log",
        }),
    ],
});

export const logError = (message: string, error: any = null, metadata = {}) => {
    const logData = {
        message,
        error,
        ...metadata,
    };

    // If error object is provided, include it
    if (error) {
        if (error instanceof Error) {
            logData.error = {
                name: error.name,
                message: error.message,
                stack: error.stack,
            };
        } else {
            logData.error = error;
        }
    }

    errorLoggerWithRotation.error(logData);
};
