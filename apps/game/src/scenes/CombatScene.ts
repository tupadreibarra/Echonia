import Phaser from "phaser";
import type { ResultTier } from "@echonia/shared-types";
import { eventBus, type ChallengeOption } from "../bridge/eventBus";
import { getContentItems } from "../content/getContentItems";

export interface CombatSceneData {
  playerId: string;
  displayName: string;
  avatarColor: number;
}

// Level-1 stats per docs/phase-2-game-design-document.md's Classes table.
const KNIGHT = { hp: 32, pow: 9, grd: 4 };

// Not in the design doc (there's no enemy stat block yet) — a deliberately
// weak intro enemy matching Phase 0's "friendly fantasy enemy" framing, so
// the first fight is winnable even on all-Practice answers.
const PUDDLEWUMP = { hp: 26, pow: 4, grd: 1 };

// Phase 2's Combat System section, exactly.
const DAMAGE_MULTIPLIER: Record<ResultTier, number> = {
  perfect: 1,
  good: 0.7,
  practice: 0.35,
};

const HP_BAR_WIDTH = 120;

/**
 * The Puddlewump encounter. Turn-based per Phase 2: a Challenge (reusing
 * ChallengeBox, the same component the vocabulary quest uses) resolves to a
 * Result Tier that scales the Knight's attack, then the enemy's telegraphed
 * move lands. Neither side's HP hitting 0 ends the session — see
 * playVictory/playDefeat below.
 */
export class CombatScene extends Phaser.Scene {
  private sceneData!: CombatSceneData;
  private playerHp = KNIGHT.hp;
  private enemyHp = PUDDLEWUMP.hp;
  private turnIndex = 0;
  private resolving = false;

  // Same StrictMode/scene-teardown guard as VillageScene and BootScene.
  private active = true;

  private enemyShape!: Phaser.GameObjects.Ellipse;
  private playerHpText!: Phaser.GameObjects.Text;
  private enemyHpText!: Phaser.GameObjects.Text;
  private playerHpFill!: Phaser.GameObjects.Rectangle;
  private enemyHpFill!: Phaser.GameObjects.Rectangle;
  private telegraphText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;

  // Bound once so it can be added/removed from the singleton eventBus
  // without leaking a fresh listener on every encounter — see VillageScene,
  // which hit exactly this bug when it started making repeated round trips.
  private handleChallengeClosed = (payload: { contentItemId: string; resultTier: ResultTier }): void => {
    if (!this.active || this.resolving) return;
    this.resolving = true;
    this.resolvePlayerAttack(payload.resultTier);
  };

  constructor() {
    super("CombatScene");
  }

  create(data: CombatSceneData): void {
    this.sceneData = data;
    this.active = true;
    this.resolving = false;
    this.playerHp = KNIGHT.hp;
    this.enemyHp = PUDDLEWUMP.hp;
    this.turnIndex = 0;

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.active = false;
      eventBus.offTyped("challenge:closed", this.handleChallengeClosed);
    });
    this.events.once(Phaser.Scenes.Events.DESTROY, () => {
      this.active = false;
    });

    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor("#1e2140");

    const playerX = width * 0.25;
    const enemyX = width * 0.75;
    const rowY = height * 0.5;

    this.add.circle(playerX, rowY, 20, data.avatarColor);
    this.add.text(playerX, rowY - 46, data.displayName, { fontSize: "13px", color: "#e9e4ef" }).setOrigin(0.5);
    const playerBars = this.buildHpBar(playerX, rowY + 40);
    this.playerHpFill = playerBars.fill;
    this.playerHpText = playerBars.text;

    this.enemyShape = this.add.ellipse(enemyX, rowY, 56, 44, 0x7cc47c);
    this.add.text(enemyX, rowY - 46, "Puddlewump", { fontSize: "13px", color: "#e9e4ef" }).setOrigin(0.5);
    const enemyBars = this.buildHpBar(enemyX, rowY + 40);
    this.enemyHpFill = enemyBars.fill;
    this.enemyHpText = enemyBars.text;

    this.telegraphText = this.add
      .text(width / 2, height * 0.18, "", { fontSize: "15px", color: "#f0b94a", align: "center" })
      .setOrigin(0.5);
    this.messageText = this.add
      .text(width / 2, height * 0.85, "", { fontSize: "15px", color: "#ece7f3", align: "center" })
      .setOrigin(0.5);

    this.updateHpDisplays();
    eventBus.onTyped("challenge:closed", this.handleChallengeClosed);

    this.startRound();
  }

  private buildHpBar(
    x: number,
    y: number,
  ): { fill: Phaser.GameObjects.Rectangle; text: Phaser.GameObjects.Text } {
    this.add.rectangle(x, y, HP_BAR_WIDTH, 10, 0x10122480).setOrigin(0.5);
    const fill = this.add.rectangle(x - HP_BAR_WIDTH / 2, y, HP_BAR_WIDTH, 10, 0x5fe0d1).setOrigin(0, 0.5);
    const text = this.add.text(x, y + 14, "", { fontSize: "12px", color: "#b3addb" }).setOrigin(0.5);
    return { fill, text };
  }

  private updateHpDisplays(): void {
    this.playerHpText.setText(`${this.playerHp}/${KNIGHT.hp}`);
    this.enemyHpText.setText(`${this.enemyHp}/${PUDDLEWUMP.hp}`);
    this.playerHpFill.width = HP_BAR_WIDTH * Math.max(0, this.playerHp / KNIGHT.hp);
    this.enemyHpFill.width = HP_BAR_WIDTH * Math.max(0, this.enemyHp / PUDDLEWUMP.hp);
  }

  private startRound(): void {
    this.resolving = false;
    this.telegraphText.setText("Puddlewump prepares to bump you!");
    this.messageText.setText("");
    this.time.delayedCall(500, () => {
      if (this.active) this.openChallenge();
    });
  }

  private openChallenge(): void {
    const items = getContentItems(this.game).filter((item) => item.topic === "everyday-objects");
    if (items.length === 0) {
      console.warn("[CombatScene] No everyday-objects content items found — cannot open a challenge.");
      return;
    }
    const target = items[this.turnIndex % items.length]!;
    this.turnIndex += 1;

    const options: ChallengeOption[] = items.map((item) => ({
      contentItemId: item.id,
      englishText: item.englishText,
      spanishText: item.spanishText,
    }));

    eventBus.emitTyped("challenge:start", {
      playerId: this.sceneData.playerId,
      target: { contentItemId: target.id, englishText: target.englishText, audioUrl: target.audioUrl },
      options,
    });
  }

  private resolvePlayerAttack(resultTier: ResultTier): void {
    const damage = Math.max(1, Math.round(KNIGHT.pow * DAMAGE_MULTIPLIER[resultTier]));
    this.enemyHp = Math.max(0, this.enemyHp - damage);
    this.telegraphText.setText("");
    this.messageText.setText(`Your strike lands for ${damage}!`);
    this.updateHpDisplays();

    if (this.enemyHp <= 0) {
      this.time.delayedCall(500, () => {
        if (this.active) this.playVictory();
      });
      return;
    }

    this.time.delayedCall(700, () => {
      if (this.active) this.resolveEnemyAttack();
    });
  }

  private resolveEnemyAttack(): void {
    const damage = Math.max(1, PUDDLEWUMP.pow - KNIGHT.grd);
    this.playerHp = Math.max(0, this.playerHp - damage);
    this.messageText.setText(`Puddlewump bumps you for ${damage}.`);
    this.updateHpDisplays();

    if (this.playerHp <= 0) {
      this.time.delayedCall(900, () => {
        if (this.active) this.playDefeat();
      });
      return;
    }

    this.time.delayedCall(700, () => {
      if (this.active) this.startRound();
    });
  }

  private playVictory(): void {
    // Registry, not an instance field, so it survives the VillageScene
    // recreate that happens when we transition back — see
    // VillageScene.maybeSpawnPuddlewump.
    this.game.registry.set("puddlewumpDefeated", true);
    this.messageText.setText("Victory!");
    this.tweens.add({
      targets: this.enemyShape,
      alpha: 0,
      scale: 0.2,
      duration: 500,
      onComplete: () => {
        this.time.delayedCall(600, () => {
          if (this.active) this.scene.start("VillageScene");
        });
      },
    });
  }

  private playDefeat(): void {
    // Phase 2 is explicit: 0 HP is never a game over. No shame-toned
    // message, per Phase 0 §24 — just a beat, then back to the village at
    // full health with the Puddlewump still there to try again.
    this.messageText.setText("Puddlewump's bump sends you back to the village to catch your breath.");
    this.time.delayedCall(1400, () => {
      if (this.active) this.scene.start("VillageScene");
    });
  }
}
