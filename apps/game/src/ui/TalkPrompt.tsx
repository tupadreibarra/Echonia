import { useEffect, useState } from "react";
import { eventBus } from "../bridge/eventBus";

/**
 * A screen-anchored prompt, not one positioned at the NPC's world
 * coordinates — simpler than converting Phaser's letterboxed canvas space
 * into DOM pixels, and a fixed "press to talk" prompt is a normal, legible
 * pattern on its own. Revisit if a later phase wants speech-bubble-style
 * anchoring above the NPC instead.
 */
export function TalkPrompt() {
  const [target, setTarget] = useState<{ npcId: string; label: string } | null>(null);
  const [dialogueOpen, setDialogueOpen] = useState(false);

  useEffect(() => {
    const handleInRange = ({ npcId, label }: { npcId: string | null; label: string | null }) => {
      setTarget(npcId && label ? { npcId, label } : null);
    };
    const handleDialogueStart = () => setDialogueOpen(true);
    const handleDialogueClosed = () => setDialogueOpen(false);

    eventBus.onTyped("npc:inRange", handleInRange);
    eventBus.onTyped("dialogue:start", handleDialogueStart);
    eventBus.onTyped("dialogue:closed", handleDialogueClosed);
    return () => {
      eventBus.offTyped("npc:inRange", handleInRange);
      eventBus.offTyped("dialogue:start", handleDialogueStart);
      eventBus.offTyped("dialogue:closed", handleDialogueClosed);
    };
  }, []);

  if (!target || dialogueOpen) return null;

  return (
    <button
      onClick={() => eventBus.emitTyped("talk:requested", { npcId: target.npcId })}
      style={{
        position: "absolute",
        bottom: 32,
        left: "50%",
        transform: "translateX(-50%)",
        padding: "10px 20px",
        borderRadius: 6,
        border: "1px solid #5fe0d1",
        background: "#1e2140",
        color: "#ece7f3",
        font: "600 15px system-ui, sans-serif",
        cursor: "pointer",
      }}
    >
      Talk to {target.label} <span style={{ opacity: 0.6 }}>(E)</span>
    </button>
  );
}
