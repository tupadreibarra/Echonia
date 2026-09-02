import { useEffect, useState } from "react";
import { eventBus, type DialogueLine } from "../bridge/eventBus";
import { pronunciationAudioProvider } from "../audio/PronunciationAudioProvider";

/** Splits "text **English** text" into plain/highlighted fragments. */
function renderLineText(text: string) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, index) =>
    index % 2 === 1 ? (
      <strong key={index} style={{ color: "#5fe0d1" }}>
        {part}
      </strong>
    ) : (
      <span key={index}>{part}</span>
    ),
  );
}

export function DialogueBox() {
  const [lines, setLines] = useState<DialogueLine[] | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const handleStart = ({ lines: newLines }: { lines: DialogueLine[] }) => {
      setLines(newLines);
      setIndex(0);
    };
    eventBus.onTyped("dialogue:start", handleStart);
    return () => eventBus.offTyped("dialogue:start", handleStart);
  }, []);

  useEffect(() => {
    if (!lines) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.code === "Space") advance();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, index]);

  if (!lines) return null;
  const line = lines[index];
  if (!line) return null;

  function advance(): void {
    if (!lines) return;
    if (index < lines.length - 1) {
      setIndex(index + 1);
    } else {
      setLines(null);
      setIndex(0);
      eventBus.emitTyped("dialogue:closed", {});
    }
  }

  return (
    <div
      onClick={advance}
      style={{
        position: "absolute",
        bottom: 24,
        left: 24,
        right: 24,
        maxWidth: 720,
        margin: "0 auto",
        padding: "16px 20px",
        borderRadius: 8,
        border: "1px solid #5fe0d1",
        background: "#1e2140ee",
        color: "#ece7f3",
        font: "15px/1.5 system-ui, sans-serif",
        cursor: "pointer",
      }}
    >
      <div style={{ font: "700 13px system-ui, sans-serif", color: "#f0b94a", marginBottom: 6 }}>
        {line.speaker}
      </div>
      <div>{renderLineText(line.text)}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
        {line.replay ? (
          <button
            onClick={(event) => {
              event.stopPropagation();
              void pronunciationAudioProvider.play({
                id: line.replay!.contentItemId,
                audioUrl: line.replay!.audioUrl,
              });
            }}
            style={{
              padding: "4px 12px",
              borderRadius: 4,
              border: "1px solid #b3addb",
              background: "transparent",
              color: "#ece7f3",
              cursor: "pointer",
            }}
          >
            🔊 Replay
          </button>
        ) : (
          <span />
        )}
        <span style={{ opacity: 0.6, fontSize: 13 }}>
          {index < lines.length - 1 ? "Tap to continue" : "Tap to close"}
        </span>
      </div>
    </div>
  );
}
