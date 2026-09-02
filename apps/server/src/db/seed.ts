import { randomUUID } from "node:crypto";
import { db } from "./client.js";
import { players } from "./schema.js";

async function seed() {
  const demoPlayer = {
    id: randomUUID(),
    displayName: "Demo Hero",
    avatarChoice: "knight-default",
    ageBand: "wordsmith",
    createdAt: new Date().toISOString(),
  };

  await db.insert(players).values(demoPlayer);
  console.log(`Seeded demo player: ${demoPlayer.id}`);
}

seed();
