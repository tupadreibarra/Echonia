import Phaser from "phaser";

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
