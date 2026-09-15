import { createApp } from "./app.js";
import { env } from "./config.js";
import { logger } from "./lib/logger.js";

const app = createApp();

app.listen(env.PORT, () => {
  logger.info("api_started", { port: env.PORT, env: env.NODE_ENV });
});
