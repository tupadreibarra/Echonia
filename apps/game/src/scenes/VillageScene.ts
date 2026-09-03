import Phaser from "phaser";
import type { MasteryRecord, Player, ResultTier } from "@echonia/shared-types";
import { eventBus, type ChallengeOption, type DialogueLine } from "../bridge/eventBus";
import { resolveAvatarColor } from "../player/avatarColors";
import { findContentItem, findItem } from "../content/getContentItems";
import {
  ensureHeroTexture,
  ensureWizardTexture,
  ensureSpiritTexture,
  ensureBlobTexture,
  ensureGrassTileTexture,
} from "../sprites/spriteFactory";

interface Npc {
  id: string;
  label: string;
  x: number;
  y: number;
  body: Phaser.GameObjects.Image;
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
const GATE_TRIGGER_RANGE = 50;
// Width of the cosmetic strip just past the gate — not a new region (that's
// explicitly out of scope), just enough space for the "wider world" the
// camera pull-back is supposed to glimpse to be something other than the
// edge of the canvas.
const GATE_BEYOND_WIDTH = 180;
const PLAYER_SPEED = 180;
const CLICK_MOVE_STOP_DISTANCE = 6;

/**
 * The Emberhollow hub. Placeholder shapes stand in for real art per Phase 0
 * §29 — every prop/NPC/orb here occupies the position real sprites will
 * later take, so swapping them in is an asset change, not a rewrite of this
 * scene.
 */
export class VillageScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Image;
  private playerEquipRing: Phaser.GameObjects.Arc | null = null;
  private playerLabel!: Phaser.GameObjects.Text;
  private playerId: string | null = null;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: WasdKeys;
  private walkTarget: { x: number; y: number } | null = null;
  private npcs: Npc[] = [];
  private npcInRangeId: string | null = null;
  private orbs: Orb[] = [];
  private puddlewump: { shape: Phaser.GameObjects.Image; rangeZone: Phaser.GameObjects.Arc } | null = null;
  private dialogueOpen = false;
  private challengeOpen = false;
  private questAcknowledged = false;
  private gateOpen = false;
  private gateMessageShown = false;
  private gateTriggerZone: Phaser.GameObjects.Arc | null = null;

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
    this.gateMessageShown = false;

    const { width, height } = this.scale;

    // Tiled grass instead of one flat fill — covers the full extended width
    // (see GATE_BEYOND_WIDTH below) so the ground reads consistently once the
    // gate opens and reveals the strip beyond it. A softer overlay tints that
    // strip so it still visually reads as "further land," same distinction
    // the old flat-color rectangle used to carry.
    const grassKey = ensureGrassTileTexture(this, 0x2f6b3f);
    this.add.tileSprite(0, 0, width + GATE_BEYOND_WIDTH, height, grassKey).setOrigin(0, 0).setDepth(-3);
    this.add
      .rectangle(width, 0, GATE_BEYOND_WIDTH, height, 0x1f4a30, 0.35)
      .setOrigin(0, 0)
      .setDepth(-2);
    this.drawVillagePath(width, height);

    // Extended past the gate so there's somewhere to actually walk once it
    // opens — see GATE_BEYOND_WIDTH above.
    this.physics.world.setBounds(0, 0, width + GATE_BEYOND_WIDTH, height);

    const player = this.game.registry.get("player") as Player | undefined;
    this.playerId = player?.id ?? null;
    const avatarColor = resolveAvatarColor(player?.avatarChoice);

    // Player (created before props/NPCs/orbs so their colliders can reference it).
    const heroKey = ensureHeroTexture(this, avatarColor);
    this.player = this.add.image(width / 2, height * 0.8, heroKey);
    this.physics.add.existing(this.player);
    (this.player.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);
    this.playerEquipRing = null;
    if (player?.equippedItemId) {
      const item = findItem(this.game, player.equippedItemId);
      if (item) {
        const tint = Phaser.Display.Color.HexStringToColor(item.visualTint).color;
        this.playerEquipRing = this.add
          .circle(this.player.x, this.player.y, 17, 0x000000, 0)
          .setStrokeStyle(3, tint);
      }
    }
    this.playerLabel = this.add
      .text(this.player.x, this.player.y - 28, player?.displayName ?? "Hero", {
        fontSize: "11px",
        color: "#e9e4ef",
      })
      .setOrigin(0.5);

    // Static props (well, fence post, sign, closed gate).
    this.addWell(width * 0.3, height * 0.35);
    this.addProp(width * 0.7, height * 0.25, 14, 0x8b5e34, "Fence Post");
    this.addProp(width * 0.15, height * 0.7, 16, 0x8b5e34, "Sign");
    // Open once the player has equipped the quest's reward — that's the
    // completion signal for this MVP's one quest, no separate flag needed.
    this.addGate(width - 20, height / 2, Boolean(player?.equippedItemId));
    if (this.gateOpen) {
      if (!this.game.registry.get("gateOpenMomentPlayed")) {
        // First time the gate is open this game session (whether that's
        // "just equipped the reward" or "loaded the page already unlocked")
        // — animate the reveal.
        this.game.registry.set("gateOpenMomentPlayed", true);
        this.cameras.main.setZoom(1);
        this.playGateOpenCameraMoment();
      } else {
        // Already revealed earlier this session (e.g. a return trip from
        // combat) — stay pulled back, don't replay the animation every visit.
        this.cameras.main.setZoom(0.85);
      }
    } else {
      this.cameras.main.setZoom(1);
    }

    // NPCs. Orin reads as a wizard (robe + hat); Pip is explicitly not
    // humanoid per Phase 0's lore, so it gets the spirit sparkle instead.
    this.npcs = [
      this.addNpc("orin", "Master Orin", width * 0.55, height * 0.55, ensureWizardTexture(this, 0x9c6a17)),
      this.addNpc("pip", "Pip", width * 0.62, height * 0.5, ensureSpiritTexture(this, 0xf0d94a)),
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
    this.updateGateTrigger();
    this.updatePlayerLabelPosition();
  }

  private updatePlayerLabelPosition(): void {
    this.playerLabel.setPosition(this.player.x, this.player.y - 28);
    this.playerEquipRing?.setPosition(this.player.x, this.player.y);
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
   * The Puddlewump appears once the vocabulary quest is done, and stops
   * appearing for good once its reward has actually been equipped — derived
   * from the player's persisted `equippedItemId` (same "reuse data that
   * already has to exist" pattern as orb-resolved state, Phase 7, and
   * gate-open state, Phase 10), not a session-only flag. That used to be an
   * in-memory `puddlewumpDefeated` registry flag, which reset on reload and
   * let a player re-fight and re-grant the reward indefinitely; equippedItemId
   * survives a reload (it's loaded from the server/localStorage on boot and
   * updated in the registry the moment the reward grant succeeds — see
   * CombatScene.grantQuestReward), so this closes that gap. It also means a
   * failed reward grant (network error mid-victory) correctly leaves the
   * Puddlewump fightable again next visit, instead of permanently losing the
   * reward for that session — a fix that fell out of the persistence switch,
   * not a separate change. A lost fight never sets equippedItemId, so the
   * Puddlewump is simply spawned again the next time this runs, per Phase 2's
   * "reaching 0 HP is never a game over" rule.
   */
  private maybeSpawnPuddlewump(): void {
    if (this.puddlewump) return;
    const player = this.game.registry.get("player") as Player | undefined;
    if (player?.equippedItemId) return;
    if (!this.allOrbsResolved()) return;

    const { width, height } = this.scale;
    const x = width * 0.45;
    const y = height * 0.42;

    const shape = this.add.image(x, y, ensureBlobTexture(this, "spr-puddlewump", 0x7cc47c));
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

  /** A slightly more built-up prop than a flat circle: a rim highlight and a dark well mouth. */
  private addWell(x: number, y: number): void {
    const radius = 28;
    this.add.circle(x, y, radius, 0x8a95a3);
    const mouth = this.add.circle(x, y, radius * 0.62, 0x2a2440);
    this.physics.add.existing(mouth, true);
    this.add.text(x, y - radius - 12, "Well", { fontSize: "12px", color: "#e9e4ef" }).setOrigin(0.5);
    this.physics.add.collider(this.player, mouth);
  }

  /** A simple tan path connecting the entrance to the village center and on toward the gate. */
  private drawVillagePath(width: number, height: number): void {
    const path = this.add.graphics().setDepth(-1);
    path.lineStyle(30, 0xc9a66b, 0.9);
    path.beginPath();
    path.moveTo(width * 0.5, height * 1.02);
    path.lineTo(width * 0.5, height * 0.62);
    path.lineTo(width * 0.58, height * 0.53);
    path.lineTo(width * 0.9, height * 0.5);
    path.strokePath();
  }

  private addGate(x: number, y: number, isOpen: boolean): void {
    this.gateOpen = isOpen;
    const gate = this.add.rectangle(x, y, 24, 140, isOpen ? 0x3a7d3a : 0x5c5580);
    this.physics.add.existing(gate, true);
    if (!isOpen) {
      this.physics.add.collider(this.player, gate);
    }
    this.add
      .text(x, y - 84, isOpen ? "Gate (open)" : "Gate (closed)", { fontSize: "12px", color: "#e9e4ef" })
      .setOrigin(0.5);

    // Cosmetic-only strip past the gate (not a new region — see
    // GATE_BEYOND_WIDTH above) so the pull-back below reveals something
    // instead of empty canvas, plus a silent trigger zone within it for the
    // one-line closing beat once the player actually steps through. The
    // ground tile + tint overlay drawn in create() already cover this area
    // visually — nothing to draw here but the label and the trigger zone.
    const beyondX = x + 20 + GATE_BEYOND_WIDTH / 2;
    this.add
      .text(beyondX, this.scale.height * 0.15, "The road continues...", { fontSize: "12px", color: "#cfe8d6" })
      .setOrigin(0.5)
      .setDepth(-1);

    const triggerZone = this.add.circle(beyondX, y, GATE_TRIGGER_RANGE, 0xffffff, 0);
    this.physics.add.existing(triggerZone, true);
    this.gateTriggerZone = triggerZone;
  }

  /** A brief camera pull-back so more of the map is visibly in view the
   * moment the gate opens — plays once per running game session (guarded by
   * a registry flag at the call site), whether that moment is "just equipped
   * the reward" or "loaded the page with the gate already unlocked." */
  private playGateOpenCameraMoment(): void {
    this.tweens.add({
      targets: this.cameras.main,
      zoom: 0.85,
      duration: 600,
      ease: "Sine.easeInOut",
    });
  }

  private updateGateTrigger(): void {
    if (!this.gateOpen || this.gateMessageShown || !this.gateTriggerZone) return;
    if (this.physics.overlap(this.player, this.gateTriggerZone)) {
      this.gateMessageShown = true;
      this.dialogueOpen = true;
      eventBus.emitTyped("dialogue:start", {
        lines: [
          {
            speaker: "Master Orin",
            text:
              "El camino más allá de Emberhollow está abierto. Tu aventura apenas comienza... " +
              "(The path beyond Emberhollow is open. Your adventure has only just begun...)",
          },
        ],
      });
    }
  }

  private addNpc(id: string, label: string, x: number, y: number, textureKey: string): Npc {
    const body = this.add.image(x, y, textureKey);
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
