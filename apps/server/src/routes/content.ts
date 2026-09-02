import type { FastifyInstance } from "fastify";
import { loadContent } from "@echonia/content";

export async function contentRoutes(app: FastifyInstance) {
  app.get("/content", async () => {
    // Re-loads and re-validates on every request for now (MVP scale is a
    // handful of files); revisit with a cache once content volume grows.
    return loadContent();
  });
}
