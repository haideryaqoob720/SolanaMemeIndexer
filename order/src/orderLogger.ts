import winston from "winston";

// Define your custom logging levels
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
    verbose: 4,
    silly: 5,
};

// Custom colors for different levels
const colors = {
    error: "red",
    warn: "yellow",
    info: "green",
    debug: "blue",
    verbose: "cyan",
    silly: "white",
};

winston.addColors(colors);

// Create a format for the logs
const format = winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
    winston.format.colorize({ all: true }),
    winston.format.printf(
        (info) => `${info.timestamp} [${info.level}]: ${info.message}`,
    ),
);

// Define which transports the logger should use
const transports = [
    new winston.transports.Console(),
    // new winston.transports.File({
    //   filename: 'logs/error.log',
    //   level: 'error',
    // }),
    new winston.transports.File({ filename: "../logs/order.log" }),
];

// Create the logger instance
const orderLogger = winston.createLogger({
    level: "debug", // default level - shows debug and above
    levels,
    format,
    transports,
});

export default orderLogger;
