import { appConfig } from "./config.ts";
import pino from "pino";
import { getTransformStream } from "@probot/pino";

const transform = getTransformStream();
transform.pipe(pino.destination(1));
const log = pino(
  {
    name: appConfig.name,
    level: appConfig.logLevel || "info",
  },
  transform,
);

export default log;
