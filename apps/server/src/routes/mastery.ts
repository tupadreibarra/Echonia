import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { loadContent } from "@echonia/content";
import { db } from "../db/client.js";
import { masteryRecords } from "../db/schema.js";
import { recordAttempt } from "../mastery/updateMastery.js";

const attemptSchema = z.object({
  playerId: z.string().min(1),
  contentItemId: z.string().min(1),
  resultTier: z.enum(["perfect", "good", "practice"]),
});

export async function masteryRoutes(app: FastifyInstance) {
  app.post("/mastery/attempt", async (request, reply) => {
    const parsed = attemptSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const { contentItems } = await loadContent();
    const contentItem = contentItems.find((item) => item.id === parsed.data.contentItemId);
    if (!contentItem) {
      return reply.status(404).send({ error: `Unknown contentItemId: ${parsed.data.contentItemId}` });
    }

    const updated = await recordAttempt({
      playerId: parsed.data.playerId,
      contentItemId: parsed.data.contentItemId,
      skillStrand: contentItem.skillStrand,
      resultTier: parsed.data.resultTier,
    });

    return reply.status(200).send(updated);
  });

  app.get("/mastery", async (request, reply) => {
    const query = request.query as { playerId?: string };
    if (!query.playerId) {
      return reply.status(400).send({ error: "playerId query parameter is required" });
    }
    return db.select().from(masteryRecords).where(eq(masteryRecords.playerId, query.playerId));
  });
}
