import { createApp } from "./app.js";
import { config } from "./config.js";

const server = createApp().listen(config.PORT, () => {
  console.log(`SikaPay API listening on http://localhost:${config.PORT}`);
});

const shutdown = () => server.close(() => process.exit(0));
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
