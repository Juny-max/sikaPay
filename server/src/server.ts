import { createApp } from "./app.js";
import { config } from "./config.js";

const server = createApp().listen(config.PORT, config.HOST, () => {
  console.log(`SikaPay API listening on http://${config.HOST}:${config.PORT}`);
});

const shutdown = () => server.close(() => process.exit(0));
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
