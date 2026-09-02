import Phaser from "phaser";
import { eventBus } from "../bridge/eventBus";

/**
 * Fetches validated content from apps/server (proving the JSON -> Zod ->
 * API -> game pipeline works end to end) and stashes it in the registry for
 * every later scene to read, then hands off to the village. Shows a plain
 * error if the server isn't reachable, rather than failing silently.
 */
export class BootScene extends Phaser.Scene {
  // Guards against the fetch below resolving after this scene (and possibly
  // the whole Phaser.Game instance) has already been torn down — which
  // React 18 StrictMode triggers routinely in dev via its intentional
  // mount -> cleanup -> mount double-invoke. Without this guard, the stale
  // callback throws trying to touch a destroyed scene/game.
  private active = true;

  constructor() {
    super("BootScene");
  }

  create(): void {
    this.active = true;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.active = false;
    });
    this.events.once(Phaser.Scenes.Events.DESTROY, () => {
      this.active = false;
    });

    this.cameras.main.setBackgroundColor("#171933");

    const loadingText = this.add
      .text(this.scale.width / 2, this.scale.height / 2, "ECHONIA\nLoading...", {
        fontFamily: "Georgia, serif",
        fontSize: "48px",
        color: "#5fe0d1",
        align: "center",
      })
      .setOrigin(0.5);

    eventBus.emitTyped("sceneReady", { sceneKey: this.scene.key });

    fetch("/api/content")
      .then((response) => {
        if (!response.ok) throw new Error(`/api/content responded ${response.status}`);
        return response.json();
      })
      .then((content) => {
        if (!this.active) return;
        this.game.registry.set("content", content);
        this.scene.start("VillageScene");
      })
      .catch((error: unknown) => {
        if (!this.active) return;
        console.error("[BootScene] Could not load content from the server:", error);
        loadingText.setText(
          "Could not reach the server.\nMake sure `pnpm --filter server dev` is running,\nthen reload this page.",
        );
        loadingText.setFontSize(20);
      });
  }
}
