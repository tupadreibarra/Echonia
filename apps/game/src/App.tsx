import { useState } from "react";
import type { Player } from "@echonia/shared-types";
import { GameCanvas } from "./GameCanvas";
import { TalkPrompt, DialogueBox, ChallengeBox, CharacterCreation, RewardScreen } from "./ui";
import { loadStoredPlayer } from "./player/playerStorage";

export function App() {
  // Lazy initial state: reads localStorage synchronously on first render, so
  // a returning player never sees a flash of the character creation screen.
  const [player, setPlayer] = useState<Player | null>(() => loadStoredPlayer());

  if (!player) {
    return <CharacterCreation onCreated={setPlayer} />;
  }

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
      }}
    >
      {/*
        Scales the box to fit the viewport while preserving the game's 960x540
        (16:9) aspect ratio, so the overlay's `position: absolute` children
        always line up with the canvas underneath at any size — Phase 0
        requires mobile/tablet play to actually fit the screen, not just be
        touch-controllable. `min(...)` picks whichever constraint binds
        first: the natural 960px size, the full viewport width, or the width
        implied by capping height at 100vh (960/540 = 1.7778, so 177.78vh is
        "the width you'd get if height maxed out the viewport"). Phaser's own
        internal resolution stays 960x540 (see GameCanvas) — only the CSS box
        it's scaled into changes.
      */}
      <div style={{ position: "relative", width: "min(960px, 100vw, 177.78vh)", aspectRatio: "960 / 540" }}>
        <GameCanvas player={player} />
        <TalkPrompt />
        <DialogueBox />
        <ChallengeBox />
        <RewardScreen />
      </div>
    </div>
  );
}
