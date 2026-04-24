import { createLogger } from "winston";

const sell = createLogger({
  level: "info",
  // format: logFormat,
  format: winston.format.json(),
  defaultMeta: { service: "sniperSell" },
  transports: [
    new transports.File({ filename: "sniperSell.log" }),
    errorTransport,
  ],
});

module.exports = {sell}