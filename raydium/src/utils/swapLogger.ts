const winstonTest = require("winston");

export const loggerSwap = winstonTest.createLogger({
  level: "info",
  format: winstonTest.format.json(),
  defaultMeta: { service: "swap-monitor" },
  transports: [
    new winstonTest.transports.File({ filename: "error.log", level: "error" }),
    new winstonTest.transports.File({ filename: "combined.log" }),
  ],
});
