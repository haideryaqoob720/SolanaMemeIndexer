const winston = require("winston");
// // const logDir: string = "logs";
// // const path = require("path");
// export const createLogger = winston.createLogger({
//   level: "create",
//   format: winston.format.json(),
//   defaultMeta: { service: "create-stream-logs" },
//   transports: [
//     //
//     // - Write all logs with importance level of `error` or higher to `error.log`
//     //   (i.e., error, fatal, but not other levels)
//     //
//     new winston.transports.File({
//       // filename: path.join(logDir, "/error.log").toString(),
//       filename: "error.log",
//       dirname: "logs",
//       level: "error",
//     }),
//     //
//     // - Write all logs with importance level of `info` or higher to `combined.log`
//     //   (i.e., fatal, error, warn, and info, but not trace)
//     //
//     new winston.transports.File({
//       // dirname:"logs",
//       // filename: path.join(logDir, "/create.log").toString(),
//       filename: "create.log",
//       dirname: "logs",
//       // dirname: "logs"
//     }),
//   ],
// });

// export const swapLogger = winston.createLogger({
//   level: "swap",
//   format: winston.format.json(),
//   defaultMeta: { service: "swap-stream-logs" },
//   transports: [
//     //
//     // - Write all logs with importance level of `error` or higher to `error.log`
//     //   (i.e., error, fatal, but not other levels)
//     //
//     new winston.transports.File({
//       // filename: path.join(logDir, "/error.log").toString(),
//       filename: "error.log",
//       dirname: "logs",
//       level: "error",
//     }),
//     //
//     // - Write all logs with importance level of `info` or higher to `combined.log`
//     //   (i.e., fatal, error, warn, and info, but not trace)
//     //
//     new winston.transports.File({
//       // dirname: "logs",
//       // new winston.transports.File({
//       // filename: path.join(logDir, "/swap.log").toString(),
//       filename: "swap.log",
//       dirname: "logs",
//       // }),
//     }),
//   ],
// });
// export const logger = winston.createLogger({
//   level: "info",
//   format: winston.format.json(),
//   defaultMeta: { service: "user-service" },
//   transports: [
//     //
//     // - Write all logs with importance level of `error` or higher to `error.log`
//     //   (i.e., error, fatal, but not other levels)
//     //
//     new winston.transports.File({
//       filename: "error.log",
//       dirname: "logs",
//       // filename: path.join(logDir, "/error.log").toString(),
//       level: "error",
//     }),
//     //
//     // - Write all logs with importance level of `info` or higher to `combined.log`
//     //   (i.e., fatal, error, warn, and info, but not trace)
//     //
//     new winston.transports.File({
//       // filename: path.join(logDir, "/general.log").toString(),
//       filename: "general.log",
//       dirname: "logs",
//     }),
//   ],
// });

/* new code for logging start */
const fs = require("fs");
const path = require("path");
const { createLogger, format, transports } = require("winston");

// Ensure the logs directory exists
const logsDir = path.join(__dirname, "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
} else {
  // console.log(logsDir);
  // console.log("🍓");
}

// Common log format
const logFormat = format.combine(
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  format.printf(
    ({ timestamp, level, message }: any) =>
      `${timestamp} [${level.toUpperCase()}]: ${message}`
  )
);

// Shared error transport for all loggers
const errorTransport = new transports.File({
  filename: "error.log",
  level: "error",
});

// Create specific loggers
const createLoggerInstance = createLogger({
  level: "info",
  // format: logFormat,
  format: winston.format.json(),
  defaultMeta: { service: "user-service" },
  transports: [new transports.File({ filename: "create.log" }), errorTransport],
});

const swapLogger = createLogger({
  level: "info",
  // format: logFormat,
  format: winston.format.json(),
  defaultMeta: { service: "user-service" },
  transports: [new transports.File({ filename: "swap.log" }), errorTransport],
});

const logger = createLogger({
  level: "info",
  // format: logFormat,
  format: winston.format.json(),
  defaultMeta: { service: "user-service" },
  transports: [
    new transports.File({ filename: "general.log" }),
    errorTransport,
  ],
});

const sniperLogger = createLogger({
  level:"info",
  format: winston.format.json(),
  defaultMeta: {service: "sniper-order"},
  transports: [
    new transports.File({ filename: "sniper.log" }),
    errorTransport,
  ],
})

// Export the loggers
module.exports = {
  createLogger: createLoggerInstance,
  swapLogger: swapLogger,
  logger: logger,
  sniperLogger: sniperLogger
};
