import Phaser from "phaser";
import type { ResultTier } from "@echonia/shared-types";

// One line of dialogue. `text` may contain **bold** spans, which the
// DialogueBox renders as highlighted English — used when a line is
// introducing the actual target-language word, per the Phase 3 immersion
// rule (a brand-new player sees Spanish-primary text with the English term
// picked out, not a separate translation line).
export interface DialogueLine {
  speaker: string;
  text: string;
  /** Present when this line teaches a specific ContentItem's pronunciation. */
  replay?: { contentItemId: string; audioUrl: string };
}

// One vocabulary-matching option shown on a Select-Image challenge card.
// Labeled with Spanish (not English) so matching the English prompt audio to
// its card is a real vocabulary task — see Phase 2's Learning Integration.
export interface ChallengeOption {
  contentItemId: string;
  englishText: string;
  spanishText: string;
}

export interface ChallengeStartPayload {
  playerId: string;
  target: { contentItemId: string; englishText: string; audioUrl: string };
  /** All same-topic items, target included — the "auto" distractor pool. */
  options: ChallengeOption[];
}

export interface RewardStartPayload {
  xpGained: number;
  glimmersGained: number;
  leveledUp: boolean;
  newLevel: number;
  /** Absent if the reward carried no item (defensive — every reward in this MVP has one). */
  item?: { id: string; name: string; description: string; visualTint: string };
}

// The one channel Phaser (game world) and React (UI chrome) are allowed to
// talk through — neither side reaches into the other's state directly.
export interface EchoniaEvents {
  sceneReady: { sceneKey: string };
  /** Phaser -> React: which NPC (if any) the player is currently near. */
  "npc:inRange": { npcId: string | null; label: string | null };
  /** React -> Phaser: the player pressed the Talk prompt for this NPC. */
  "talk:requested": { npcId: string };
  /** Phaser -> React: open the dialogue box with this script. */
  "dialogue:start": { lines: DialogueLine[] };
  /** React -> Phaser: the dialogue box was closed, resume movement. */
  "dialogue:closed": Record<string, never>;
  /** Phaser -> React: open a Select-Image challenge for this word orb. */
  "challenge:start": ChallengeStartPayload;
  /**
   * React -> Phaser: the challenge resolved and closed. `resultTier` is what
   * lets a listener outside the vocabulary-orb quest (Combat, in Phase 8)
   * reuse this same box for its own scoring, rather than forking it.
   */
  "challenge:closed": { contentItemId: string; resultTier: ResultTier };
  /** Phaser -> React: open the reward/level-up screen after a victory. */
  "reward:start": RewardStartPayload;
  /** React -> Phaser: the player clicked through the reward screen (and pressed Equip, if there was an item). */
  "reward:closed": Record<string, never>;
}

class TypedEventBus extends Phaser.Events.EventEmitter {
  emitTyped<K extends keyof EchoniaEvents>(event: K, payload: EchoniaEvents[K]): void {
    this.emit(event, payload);
  }

  onTyped<K extends keyof EchoniaEvents>(
    event: K,
    handler: (payload: EchoniaEvents[K]) => void,
  ): void {
    this.on(event, handler);
  }

  offTyped<K extends keyof EchoniaEvents>(
    event: K,
    handler: (payload: EchoniaEvents[K]) => void,
  ): void {
    this.off(event, handler);
  }
}

export const eventBus = new TypedEventBus();
