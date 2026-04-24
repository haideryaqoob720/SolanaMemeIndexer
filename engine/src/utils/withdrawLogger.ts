import winston from "winston";

const withdrawLog = winston.createLogger({
    level: "info",
    format: winston.format.combine(
        winston.format.timestamp({
            format: "YYYY-MM-DD HH:mm:ss",
        }),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [${level}]: ${typeof message === "string" ? message : JSON.stringify(message)} ${Object.keys(meta).length ? JSON.stringify(meta) : ""}`;
        }),
        winston.format.errors({ stack: true }),
        winston.format.json(),
    ),
    transports: [
        new winston.transports.File({
            filename: "/root/MemeMonitor/withdrawLog.log",
        }),
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple(),
            ),
        }),
    ],
});

export const logWithdraw = (
    message: string,
    data: any = null,
    metadata = {},
) => {
    const logData = {
        message,
        data,
        ...metadata,
    };

    withdrawLog.info(logData);
};

export const logWithdrawError = (
    message: string,
    error: any = null,
    metadata = {},
) => {
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

    withdrawLog.error(logData);
};

export const logWithdrawWarning = (
    message: string,
    data: any = null,
    metadata = {},
) => {
    const logData = {
        message,
        data,
        ...metadata,
    };

    withdrawLog.warn(logData);
};

export default withdrawLog;

export const eventLogger = winston.createLogger({
    level: "info",
    format: winston.format.combine(
        winston.format.timestamp({
            format: "YYYY-MM-DD HH:mm:ss",
        }),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [${level}]: ${typeof message === "string" ? message : JSON.stringify(message)} ${Object.keys(meta).length ? JSON.stringify(meta) : ""}`;
        }),
        winston.format.errors({ stack: true }),
        winston.format.json(),
    ),
    transports: [
        new winston.transports.File({
            filename: "/root/MemeMonitor/eventTrigger.log",
        }),
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple(),
            ),
        }),
    ],
});
