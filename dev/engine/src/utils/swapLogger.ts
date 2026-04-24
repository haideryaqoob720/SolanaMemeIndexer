const winstonTest = require("winston");

export const loggerSwap = winstonTest.createLogger({
  level: "info",
  format: winstonTest.format.json(),
  defaultMeta: { service: "migrate_token" },
  transports: [
    new winstonTest.transports.File({ filename: "error.log", level: "error" }),
    new winstonTest.transports.File({ filename: "combined.log" }),
  ],
});
