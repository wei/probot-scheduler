import { appConfig } from "./config.ts";
import pino from "pino";
import { getTransformStream } from "@probot/pino";

const transform = getTransformStream({
  logFormat: appConfig.logFormat,
  logLevelInString: appConfig.logLevelInString,
});
transform.pipe(pino.destination(1));

const log = pino(
  {
    name: appConfig.name,
    level: appConfig.logLevel || "info",
    messageKey: appConfig.logMessageKey || "msg",
  },
  transform,
);

export default log;
