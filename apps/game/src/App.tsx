import { GameCanvas } from "./GameCanvas";
import { TalkPrompt, DialogueBox } from "./ui";

export function App() {
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
        <GameCanvas />
        <TalkPrompt />
        <DialogueBox />
      </div>
    </div>
  );
}
