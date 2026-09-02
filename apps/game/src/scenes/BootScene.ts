import Phaser from "phaser";
import { eventBus } from "../bridge/eventBus";

// Placeholder scene proving Phaser boots and renders inside the
// React-owned canvas. Real scenes (Village, Combat, ...) land in Phase 6+.
export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#171933");

    this.add
      .text(this.scale.width / 2, this.scale.height / 2, "ECHONIA", {
        fontFamily: "Georgia, serif",
        fontSize: "48px",
        color: "#5fe0d1",
      })
      .setOrigin(0.5);

    eventBus.emitTyped("sceneReady", { sceneKey: this.scene.key });
  }
}
