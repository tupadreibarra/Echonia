import Phaser from "phaser";
import { eventBus, type DialogueLine } from "../bridge/eventBus";

interface Npc {
  id: string;
  label: string;
  x: number;
  y: number;
  body: Phaser.GameObjects.Arc;
  rangeZone: Phaser.GameObjects.Arc;
}

interface WasdKeys {
  W: Phaser.Input.Keyboard.Key;
  A: Phaser.Input.Keyboard.Key;
  S: Phaser.Input.Keyboard.Key;
  D: Phaser.Input.Keyboard.Key;
}

const TALK_RANGE = 64;
const PLAYER_SPEED = 180;
const CLICK_MOVE_STOP_DISTANCE = 6;

/**
 * The Emberhollow hub. Placeholder shapes stand in for real art per Phase 0
 * §29 — every prop/NPC here occupies the position real sprites will later
 * take, so swapping them in is an asset change, not a rewrite of this scene.
 */
export class VillageScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Arc;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: WasdKeys;
  private walkTarget: { x: number; y: number } | null = null;
  private npcs: Npc[] = [];
  private npcInRangeId: string | null = null;
  private dialogueOpen = false;

  constructor() {
    super("VillageScene");
  }

  create(): void {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor("#2f6b3f"); // village green

    this.physics.world.setBounds(0, 0, width, height);

    // Player (created before props/NPCs so their colliders can reference it).
    this.player = this.add.circle(width / 2, height * 0.8, 16, 0x5fe0d1);
    this.physics.add.existing(this.player);
    (this.player.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);

    // Static props (well, fence post, sign, closed gate).
    this.addProp(width * 0.3, height * 0.35, 28, 0x6b7280, "Well");
    this.addProp(width * 0.7, height * 0.25, 14, 0x8b5e34, "Fence Post");
    this.addProp(width * 0.15, height * 0.7, 16, 0x8b5e34, "Sign");
    this.addGate(width - 20, height / 2);

    // NPCs.
    this.npcs = [
      this.addNpc("orin", "Master Orin", width * 0.55, height * 0.55, 0x9c6a17),
      this.addNpc("pip", "Pip", width * 0.62, height * 0.5, 0xf0d94a),
    ];
    for (const npc of this.npcs) {
      this.physics.add.collider(this.player, npc.body);
    }

    // Desktop input: arrow keys + WASD.
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasdKeys = this.input.keyboard!.addKeys("W,S,A,D") as unknown as WasdKeys;
    this.input.keyboard!.on("keydown-E", () => {
      if (this.npcInRangeId && !this.dialogueOpen) {
        this.startDialogue(this.npcInRangeId);
      }
    });

    // Touch/mouse: tap-to-move. Phaser unifies mouse and touch pointer
    // events, so this one handler covers both desktop click and tablet tap
    // per Phase 0's touch-friendly requirement — no separate virtual joystick.
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.dialogueOpen) return;
      this.walkTarget = { x: pointer.worldX, y: pointer.worldY };
    });

    // React tells us when the Talk prompt was pressed, and when the
    // dialogue box has been closed (so movement can resume).
    eventBus.onTyped("talk:requested", ({ npcId }) => this.startDialogue(npcId));
    eventBus.onTyped("dialogue:closed", () => {
      this.dialogueOpen = false;
    });

    eventBus.emitTyped("sceneReady", { sceneKey: this.scene.key });
  }

  update(): void {
    if (this.dialogueOpen) {
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      return;
    }

    this.updateMovement();
    this.updateNpcRange();
  }

  private updateMovement(): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const left = this.cursors.left.isDown || this.wasdKeys.A.isDown;
    const right = this.cursors.right.isDown || this.wasdKeys.D.isDown;
    const up = this.cursors.up.isDown || this.wasdKeys.W.isDown;
    const down = this.cursors.down.isDown || this.wasdKeys.S.isDown;
    const keyboardActive = left || right || up || down;

    if (keyboardActive) {
      this.walkTarget = null; // keyboard input always overrides a pending tap-to-move
      const vx = (left ? -1 : 0) + (right ? 1 : 0);
      const vy = (up ? -1 : 0) + (down ? 1 : 0);
      const velocity = new Phaser.Math.Vector2(vx, vy).normalize().scale(PLAYER_SPEED);
      body.setVelocity(velocity.x, velocity.y);
      return;
    }

    if (this.walkTarget) {
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        this.walkTarget.x,
        this.walkTarget.y,
      );
      if (distance < CLICK_MOVE_STOP_DISTANCE) {
        this.walkTarget = null;
        body.setVelocity(0, 0);
        return;
      }
      const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, this.walkTarget.x, this.walkTarget.y);
      body.setVelocity(Math.cos(angle) * PLAYER_SPEED, Math.sin(angle) * PLAYER_SPEED);
      return;
    }

    body.setVelocity(0, 0);
  }

  private updateNpcRange(): void {
    let nearest: Npc | null = null;
    let nearestDistance = Infinity;
    for (const npc of this.npcs) {
      if (this.physics.overlap(this.player, npc.rangeZone)) {
        const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.x, npc.y);
        if (distance < nearestDistance) {
          nearest = npc;
          nearestDistance = distance;
        }
      }
    }

    const nextId = nearest?.id ?? null;
    if (nextId !== this.npcInRangeId) {
      this.npcInRangeId = nextId;
      eventBus.emitTyped("npc:inRange", { npcId: nextId, label: nearest?.label ?? null });
    }
  }

  private startDialogue(npcId: string): void {
    const lines = npcId === "orin" ? this.orinDialogue() : this.pipDialogue();
    this.dialogueOpen = true;
    eventBus.emitTyped("dialogue:start", { lines });
  }

  private orinDialogue(): DialogueLine[] {
    const content = this.game.registry.get("content") as
      | { contentItems: Array<{ id: string; audioUrl: string }> }
      | undefined;
    const hello = content?.contentItems.find((item) => item.id === "greet.greetings.hello");
    const myNameIs = content?.contentItems.find((item) => item.id === "greet.greetings.my-name-is");

    return [
      { speaker: "Master Orin", text: "¡Hola, pequeño héroe! Bienvenido a Emberhollow. Soy el Maestro Orin." },
      { speaker: "Master Orin", text: "Este es Pip, tu compañero. Él te enseñará las Palabras Antiguas." },
      {
        speaker: "Pip",
        text: "¡Hola! Let's learn our first word: **Hello**.",
        replay: hello ? { contentItemId: hello.id, audioUrl: hello.audioUrl } : undefined,
      },
      {
        speaker: "Pip",
        text: "Ahora prueba esta: **My name is...**",
        replay: myNameIs ? { contentItemId: myNameIs.id, audioUrl: myNameIs.audioUrl } : undefined,
      },
      { speaker: "Master Orin", text: "¡Muy bien! Cuando estés listo, hay algo importante que hacer en el pueblo." },
    ];
  }

  private pipDialogue(): DialogueLine[] {
    const content = this.game.registry.get("content") as
      | { contentItems: Array<{ id: string; audioUrl: string }> }
      | undefined;
    const hello = content?.contentItems.find((item) => item.id === "greet.greetings.hello");

    return [
      {
        speaker: "Pip",
        text: "¡Hola de nuevo! Recuerda: **Hello** es como saludamos.",
        replay: hello ? { contentItemId: hello.id, audioUrl: hello.audioUrl } : undefined,
      },
    ];
  }

  private addProp(x: number, y: number, radius: number, color: number, label: string): void {
    const prop = this.add.circle(x, y, radius, color);
    this.physics.add.existing(prop, true);
    this.add
      .text(x, y - radius - 12, label, { fontSize: "12px", color: "#e9e4ef" })
      .setOrigin(0.5);
    this.physics.add.collider(this.player, prop);
  }

  private addGate(x: number, y: number): void {
    const gate = this.add.rectangle(x, y, 24, 140, 0x5c5580);
    this.physics.add.existing(gate, true);
    this.physics.add.collider(this.player, gate);
    this.add.text(x, y - 84, "Gate (closed)", { fontSize: "12px", color: "#e9e4ef" }).setOrigin(0.5);
    // Static prop only — no unlock logic here, that lands in Phase 10 once
    // the quest + combat + reward chain that opens it actually exists.
  }

  private addNpc(id: string, label: string, x: number, y: number, color: number): Npc {
    const body = this.add.circle(x, y, 18, color);
    this.physics.add.existing(body, true);
    this.add.text(x, y - 32, label, { fontSize: "12px", color: "#e9e4ef" }).setOrigin(0.5);

    // A larger, invisible circle used only for the "is the player near enough
    // to talk" check — kept separate from the NPC's own collider so the two
    // radii (collision vs. conversation range) can be tuned independently.
    const rangeZone = this.add.circle(x, y, TALK_RANGE, 0xffffff, 0);
    this.physics.add.existing(rangeZone, true);

    return { id, label, x, y, body, rangeZone };
  }
}
