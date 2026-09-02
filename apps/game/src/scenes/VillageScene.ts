import Phaser from "phaser";
import type { MasteryRecord, Player, ResultTier } from "@echonia/shared-types";
import { eventBus, type ChallengeOption, type DialogueLine } from "../bridge/eventBus";
import { resolveAvatarColor } from "../player/avatarColors";
import { findContentItem, findItem } from "../content/getContentItems";

interface Npc {
  id: string;
  label: string;
  x: number;
  y: number;
  body: Phaser.GameObjects.Arc;
  rangeZone: Phaser.GameObjects.Arc;
}

interface Orb {
  contentItemId: string;
  englishText: string;
  spanishText: string;
  audioUrl: string;
  x: number;
  y: number;
  shape: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
  rangeZone: Phaser.GameObjects.Arc;
  resolved: boolean;
}

interface WasdKeys {
  W: Phaser.Input.Keyboard.Key;
  A: Phaser.Input.Keyboard.Key;
  S: Phaser.Input.Keyboard.Key;
  D: Phaser.Input.Keyboard.Key;
}

const TALK_RANGE = 64;
const ORB_RANGE = 40;
const PUDDLEWUMP_RANGE = 40;
const PLAYER_SPEED = 180;
const CLICK_MOVE_STOP_DISTANCE = 6;

/**
 * The Emberhollow hub. Placeholder shapes stand in for real art per Phase 0
 * §29 — every prop/NPC/orb here occupies the position real sprites will
 * later take, so swapping them in is an asset change, not a rewrite of this
 * scene.
 */
export class VillageScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Arc;
  private playerLabel!: Phaser.GameObjects.Text;
  private playerId: string | null = null;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: WasdKeys;
  private walkTarget: { x: number; y: number } | null = null;
  private npcs: Npc[] = [];
  private npcInRangeId: string | null = null;
  private orbs: Orb[] = [];
  private puddlewump: { shape: Phaser.GameObjects.Ellipse; rangeZone: Phaser.GameObjects.Arc } | null = null;
  private dialogueOpen = false;
  private challengeOpen = false;
  private questAcknowledged = false;

  // Guards async callbacks (the mastery-record fetch below) against firing
  // after this scene/game has been torn down — same StrictMode double-mount
  // hazard BootScene's content fetch hit in Phase 6.
  private active = true;

  // Bound once per instance so they can be removed on shutdown (below) —
  // `eventBus` is a singleton outside Phaser's scene lifecycle, so without
  // this, every return trip from CombatScene would stack a fresh set of
  // listeners on top of the previous VillageScene instance's, and old
  // instances would keep reacting to events meant for the new one.
  private handleTalkRequested = ({ npcId }: { npcId: string }): void => this.startDialogue(npcId);
  private handleDialogueClosed = (): void => {
    this.dialogueOpen = false;
  };
  private handleChallengeClosedBound = ({ contentItemId }: { contentItemId: string; resultTier: ResultTier }): void =>
    this.onChallengeClosed(contentItemId);

  constructor() {
    super("VillageScene");
  }

  create(): void {
    this.active = true;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.active = false;
      eventBus.offTyped("talk:requested", this.handleTalkRequested);
      eventBus.offTyped("dialogue:closed", this.handleDialogueClosed);
      eventBus.offTyped("challenge:closed", this.handleChallengeClosedBound);
    });
    this.events.once(Phaser.Scenes.Events.DESTROY, () => {
      this.active = false;
    });

    // Phaser reuses the same VillageScene instance across every
    // scene.start("VillageScene") call rather than constructing a fresh one
    // per visit -- class-field initializers only run once, at construction.
    // this.orbs/this.npcs are unconditionally reassigned below so they're
    // self-correcting, but every other piece of "what's happening right
    // now" state has to be reset explicitly here, or it leaks in from
    // whatever it was on the visit before this one. walkTarget is the one
    // that actually bit combat: a stale target from the click that walked
    // the player into the Puddlewump would otherwise make the player
    // immediately resume walking into wherever it respawns, re-triggering
    // combat before the player has done anything.
    this.walkTarget = null;
    this.npcInRangeId = null;
    this.dialogueOpen = false;
    this.challengeOpen = false;
    this.puddlewump = null;

    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor("#2f6b3f"); // village green

    this.physics.world.setBounds(0, 0, width, height);

    const player = this.game.registry.get("player") as Player | undefined;
    this.playerId = player?.id ?? null;
    const avatarColor = resolveAvatarColor(player?.avatarChoice);

    // Player (created before props/NPCs/orbs so their colliders can reference it).
    this.player = this.add.circle(width / 2, height * 0.8, 16, avatarColor);
    this.physics.add.existing(this.player);
    (this.player.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);
    if (player?.equippedItemId) {
      const item = findItem(this.game, player.equippedItemId);
      if (item) this.player.setStrokeStyle(3, Phaser.Display.Color.HexStringToColor(item.visualTint).color);
    }
    this.playerLabel = this.add
      .text(this.player.x, this.player.y - 28, player?.displayName ?? "Hero", {
        fontSize: "11px",
        color: "#e9e4ef",
      })
      .setOrigin(0.5);

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

    // The three word-orbs for "The Wizard's Missing Words" — one per
    // everyday-objects ContentItem. Positions chosen to stay clear of the
    // props/NPCs above.
    this.orbs = [
      this.buildOrb("vocab.everyday-objects.apple", width * 0.35, height * 0.65, 0xe0574a),
      this.buildOrb("vocab.everyday-objects.dog", width * 0.5, height * 0.2, 0x8b5e34),
      this.buildOrb("vocab.everyday-objects.book", width * 0.85, height * 0.75, 0x4a7fe0),
    ].filter((orb): orb is Orb => orb !== null);

    // Desktop input: arrow keys + WASD.
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasdKeys = this.input.keyboard!.addKeys("W,S,A,D") as unknown as WasdKeys;
    this.input.keyboard!.on("keydown-E", () => {
      if (this.npcInRangeId && !this.dialogueOpen && !this.challengeOpen) {
        this.startDialogue(this.npcInRangeId);
      }
    });

    // Touch/mouse: tap-to-move. Phaser unifies mouse and touch pointer
    // events, so this one handler covers both desktop click and tablet tap
    // per Phase 0's touch-friendly requirement — no separate virtual joystick.
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.dialogueOpen || this.challengeOpen) return;
      this.walkTarget = { x: pointer.worldX, y: pointer.worldY };
    });

    // React tells us when the Talk prompt was pressed, and when the
    // dialogue box / challenge box has been closed (so movement can resume).
    eventBus.onTyped("talk:requested", this.handleTalkRequested);
    eventBus.onTyped("dialogue:closed", this.handleDialogueClosed);
    eventBus.onTyped("challenge:closed", this.handleChallengeClosedBound);

    this.loadExistingMastery();

    eventBus.emitTyped("sceneReady", { sceneKey: this.scene.key });
  }

  update(): void {
    if (this.dialogueOpen || this.challengeOpen) {
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      this.updatePlayerLabelPosition();
      return;
    }

    this.updateMovement();
    this.updateNpcRange();
    this.updateOrbRange();
    this.updatePuddlewumpRange();
    this.updatePlayerLabelPosition();
  }

  private updatePlayerLabelPosition(): void {
    this.playerLabel.setPosition(this.player.x, this.player.y - 28);
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

  private updateOrbRange(): void {
    for (const orb of this.orbs) {
      if (orb.resolved) continue;
      if (this.physics.overlap(this.player, orb.rangeZone)) {
        this.startChallenge(orb);
        return; // one challenge at a time
      }
    }
  }

  private updatePuddlewumpRange(): void {
    if (!this.puddlewump) return;
    if (this.physics.overlap(this.player, this.puddlewump.rangeZone)) {
      this.startCombat();
    }
  }

  /**
   * The Puddlewump appears once the vocabulary quest is done and hasn't
   * already been beaten this session (`puddlewumpDefeated` lives in the
   * Phaser registry, not on this scene instance, so it survives the
   * VillageScene recreate that happens on every trip to and from combat —
   * see CombatScene). A lost fight never sets that flag, so the Puddlewump
   * is simply spawned again the next time this runs, per Phase 2's "reaching
   * 0 HP is never a game over" rule.
   */
  private maybeSpawnPuddlewump(): void {
    if (this.puddlewump) return;
    if (this.game.registry.get("puddlewumpDefeated")) return;
    if (!this.allOrbsResolved()) return;

    const { width, height } = this.scale;
    const x = width * 0.45;
    const y = height * 0.42;

    const shape = this.add.ellipse(x, y, 40, 32, 0x7cc47c);
    this.add.text(x, y - 28, "Puddlewump", { fontSize: "12px", color: "#e9e4ef" }).setOrigin(0.5);
    this.physics.add.existing(shape, true);
    this.physics.add.collider(this.player, shape);

    const rangeZone = this.add.circle(x, y, PUDDLEWUMP_RANGE, 0xffffff, 0);
    this.physics.add.existing(rangeZone, true);

    this.puddlewump = { shape, rangeZone };
  }

  private startCombat(): void {
    if (!this.playerId) return; // shouldn't happen — App requires a player before the game mounts
    const player = this.game.registry.get("player") as Player | undefined;
    this.scene.start("CombatScene", {
      playerId: this.playerId,
      displayName: player?.displayName ?? "Hero",
      avatarColor: resolveAvatarColor(player?.avatarChoice),
    });
  }

  private startDialogue(npcId: string): void {
    const lines = npcId === "orin" ? this.orinDialogue() : this.pipDialogue();
    this.dialogueOpen = true;
    eventBus.emitTyped("dialogue:start", { lines });
  }

  private startChallenge(orb: Orb): void {
    if (!this.playerId) return; // shouldn't happen — App requires a player before the game mounts
    this.challengeOpen = true;
    const options: ChallengeOption[] = this.orbs.map((o) => ({
      contentItemId: o.contentItemId,
      englishText: o.englishText,
      spanishText: o.spanishText,
    }));
    eventBus.emitTyped("challenge:start", {
      playerId: this.playerId,
      target: { contentItemId: orb.contentItemId, englishText: orb.englishText, audioUrl: orb.audioUrl },
      options,
    });
  }

  private onChallengeClosed(contentItemId: string): void {
    this.challengeOpen = false;
    const orb = this.orbs.find((o) => o.contentItemId === contentItemId);
    if (orb) this.markOrbResolved(orb);

    if (this.allOrbsResolved() && !this.questAcknowledged) {
      this.questAcknowledged = true;
      this.dialogueOpen = true;
      eventBus.emitTyped("dialogue:start", { lines: this.orinDialogue() });
    }
    this.maybeSpawnPuddlewump();
  }

  private allOrbsResolved(): boolean {
    return this.orbs.length > 0 && this.orbs.every((orb) => orb.resolved);
  }

  private markOrbResolved(orb: Orb): void {
    orb.resolved = true;
    orb.shape.setAlpha(0.25);
    orb.label.setAlpha(0.25);
  }

  /**
   * Marks orbs already attempted in a previous session as resolved, so
   * reloading the page doesn't re-offer a challenge the child already
   * completed — this is Phase 4's reload-persistence requirement, powered
   * by the mastery records that already have to exist rather than a
   * separate quest-progress table.
   */
  private loadExistingMastery(): void {
    if (!this.playerId) return;
    fetch(`/api/mastery?playerId=${encodeURIComponent(this.playerId)}`)
      .then((response) => {
        if (!response.ok) throw new Error(`/api/mastery responded ${response.status}`);
        return response.json() as Promise<MasteryRecord[]>;
      })
      .then((records) => {
        if (!this.active) return;
        for (const record of records) {
          const orb = this.orbs.find((o) => o.contentItemId === record.contentItemId);
          if (orb) this.markOrbResolved(orb);
        }
        this.maybeSpawnPuddlewump();
      })
      .catch((error: unknown) => {
        if (!this.active) return;
        console.error("[VillageScene] Could not load existing mastery records:", error);
      });
  }

  private orinDialogue(): DialogueLine[] {
    if (this.allOrbsResolved()) {
      return [
        {
          speaker: "Master Orin",
          text: "¡Las tres palabras han vuelto a mi conjuro! Gracias por tu ayuda, pequeño héroe.",
        },
      ];
    }

    const hello = findContentItem(this.game, "greet.greetings.hello");
    const myNameIs = findContentItem(this.game, "greet.greetings.my-name-is");

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
    const hello = findContentItem(this.game, "greet.greetings.hello");

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

  private buildOrb(contentItemId: string, x: number, y: number, color: number): Orb | null {
    const item = findContentItem(this.game, contentItemId);
    if (!item) {
      console.warn(`[VillageScene] Content item "${contentItemId}" not found — skipping its orb.`);
      return null;
    }

    const shape = this.add.circle(x, y, 12, color);
    shape.setStrokeStyle(2, 0xffffff, 0.6);
    const label = this.add
      .text(x, y - 22, item.englishText, { fontSize: "11px", color: "#e9e4ef" })
      .setOrigin(0.5);
    this.physics.add.existing(shape, true);

    // Same range-zone pattern as NPCs, but sized smaller — orbs auto-open on
    // proximity rather than needing an explicit Talk-style press.
    const rangeZone = this.add.circle(x, y, ORB_RANGE, 0xffffff, 0);
    this.physics.add.existing(rangeZone, true);

    return {
      contentItemId: item.id,
      englishText: item.englishText,
      spanishText: item.spanishText,
      audioUrl: item.audioUrl,
      x,
      y,
      shape,
      label,
      rangeZone,
      resolved: false,
    };
  }
}
