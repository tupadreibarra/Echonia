import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { players } from "../db/schema.js";

const createPlayerSchema = z.object({
  displayName: z.string().min(1).max(40),
  avatarChoice: z.string().min(1),
  ageBand: z.enum(["fledgling", "wordsmith", "loremaster"]),
});

export async function playerRoutes(app: FastifyInstance) {
  app.post("/player", async (request, reply) => {
    const parsed = createPlayerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const player = {
      id: randomUUID(),
      displayName: parsed.data.displayName,
      avatarChoice: parsed.data.avatarChoice,
      ageBand: parsed.data.ageBand,
      createdAt: new Date().toISOString(),
    };

    await db.insert(players).values(player);
    return reply.status(201).send(player);
  });

  app.get("/player/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const [player] = await db.select().from(players).where(eq(players.id, id));
    if (!player) {
      return reply.status(404).send({ error: "not found" });
    }
    return player;
  });
}
