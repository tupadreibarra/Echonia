import Fastify from "fastify";
import { healthRoutes } from "./routes/health.js";
import { contentRoutes } from "./routes/content.js";
import { playerRoutes } from "./routes/player.js";

const app = Fastify({ logger: true });

await app.register(healthRoutes);
await app.register(contentRoutes);
await app.register(playerRoutes);

const port = Number(process.env.PORT ?? 4000);

app
  .listen({ port, host: "0.0.0.0" })
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
