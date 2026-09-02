import Phaser from "phaser";

// The one channel Phaser (game world) and React (UI chrome) are allowed to
// talk through — neither side reaches into the other's state directly.
// Real gameplay events (quest progress, combat results, etc.) get added here
// as Phases 6-10 build them; this is scaffold-only wiring.
export interface EchoniaEvents {
  sceneReady: { sceneKey: string };
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
