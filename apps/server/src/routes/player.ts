import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { players } from "../db/schema.js";
import { grantReward } from "../progression/grantReward.js";

const createPlayerSchema = z.object({
  displayName: z.string().min(1).max(40),
  avatarChoice: z.string().min(1),
  ageBand: z.enum(["fledgling", "wordsmith", "loremaster"]),
});

const grantRewardSchema = z.object({
  xp: z.number().int().min(0),
  glimmers: z.number().int().min(0),
  itemId: z.string().min(1).optional(),
});

export async function playerRoutes(app: FastifyInstance) {
  app.post("/player", async (request, reply) => {
    const parsed = createPlayerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const id = randomUUID();
    await db.insert(players).values({
      id,
      displayName: parsed.data.displayName,
      avatarChoice: parsed.data.avatarChoice,
      ageBand: parsed.data.ageBand,
      createdAt: new Date().toISOString(),
      // xp/level/glimmers/equippedItemId are left out so SQLite applies the
      // schema's defaults — re-selected below so the response (and the
      // client's cached copy of it) reflects those defaults exactly, instead
      // of duplicating them here and risking the two falling out of sync.
    });

    const [player] = await db.select().from(players).where(eq(players.id, id));
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

  app.post("/player/:id/reward", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = grantRewardSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const [player] = await db.select().from(players).where(eq(players.id, id));
    if (!player) {
      return reply.status(404).send({ error: "not found" });
    }

    const result = grantReward({
      currentXp: player.xp,
      currentLevel: player.level,
      currentGlimmers: player.glimmers,
      xpGained: parsed.data.xp,
      glimmersGained: parsed.data.glimmers,
      itemId: parsed.data.itemId,
    });

    await db
      .update(players)
      .set({
        xp: result.xp,
        level: result.level,
        glimmers: result.glimmers,
        equippedItemId: result.equippedItemId ?? player.equippedItemId,
      })
      .where(eq(players.id, id));

    const [updated] = await db.select().from(players).where(eq(players.id, id));
    return reply.status(200).send({ player: updated, leveledUp: result.leveledUp, newLevel: result.newLevel });
  });
}
