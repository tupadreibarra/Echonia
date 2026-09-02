import { useEffect, useRef } from "react";
import Phaser from "phaser";
import type { Player } from "@echonia/shared-types";
import { BootScene } from "./scenes/BootScene";
import { VillageScene } from "./scenes/VillageScene";

interface Props {
  player: Player;
}

export function GameCanvas({ player }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: 960,
      height: 540,
      parent: containerRef.current,
      backgroundColor: "#171933",
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      physics: {
        default: "arcade",
        arcade: { debug: false },
      },
      scene: [BootScene, VillageScene],
    });

    // Scenes read this via `this.game.registry.get("player")` — same pattern
    // BootScene already uses to hand content down to VillageScene.
    game.registry.set("player", player);

    return () => {
      game.destroy(true);
    };
  }, [player]);

  return <div ref={containerRef} />;
}
