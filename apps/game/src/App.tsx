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
      {/* Fixed to the game's logical resolution so the overlay's `position:
          absolute` children line up with the canvas, not the full viewport
          (which is typically larger once centered). Responsive scaling of
          this box is a later-phase polish item. */}
      <div style={{ position: "relative", width: 960, height: 540 }}>
        <GameCanvas player={player} />
        <TalkPrompt />
        <DialogueBox />
        <ChallengeBox />
        <RewardScreen />
      </div>
    </div>
  );
}
