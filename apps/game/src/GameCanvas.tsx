import { useEffect, useRef } from "react";
import Phaser from "phaser";
import type { Player } from "@echonia/shared-types";
import { BootScene } from "./scenes/BootScene";
import { VillageScene } from "./scenes/VillageScene";
import { CombatScene } from "./scenes/CombatScene";

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
      scene: [BootScene, VillageScene, CombatScene],
    });

    // Scenes read this via `this.game.registry.get("player")` — same pattern
    // BootScene already uses to hand content down to VillageScene.
    game.registry.set("player", player);

    return () => {
      game.destroy(true);
    };
  }, [player]);

  // Phaser's Scale.FIT reads this element's actual rendered size to compute
  // its fit-to-container scale — it needs an explicit 100% here, since a
  // bare block div only sizes to its content (the canvas Phaser inserts),
  // not to the responsive parent box set up in App.tsx.
  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
