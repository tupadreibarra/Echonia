import { useEffect, useRef, useState } from "react";
import type { ResultTier } from "@echonia/shared-types";
import { eventBus, type ChallengeOption, type ChallengeStartPayload } from "../bridge/eventBus";
import { pronunciationAudioProvider } from "../audio/PronunciationAudioProvider";

interface OptionVisual {
  shape: "circle" | "roundedRect" | "rect";
  color: string;
}

// Placeholder icons standing in for real illustrations, per Phase 0 §29 — a
// plain shape per word lets a child tell the three cards apart; real art
// later only touches this map, not the challenge logic below.
const OPTION_VISUALS: Record<string, OptionVisual> = {
  "vocab.everyday-objects.apple": { shape: "circle", color: "#e0574a" },
  "vocab.everyday-objects.dog": { shape: "roundedRect", color: "#8b5e34" },
  "vocab.everyday-objects.book": { shape: "rect", color: "#4a7fe0" },
};
const DEFAULT_VISUAL: OptionVisual = { shape: "circle", color: "#5c5580" };

function OptionIcon({ contentItemId }: { contentItemId: string }) {
  const visual = OPTION_VISUALS[contentItemId] ?? DEFAULT_VISUAL;
  const radius = visual.shape === "circle" ? "50%" : visual.shape === "roundedRect" ? 10 : 2;
  return <div style={{ width: 40, height: 40, background: visual.color, borderRadius: radius }} />;
}

interface Feedback {
  correct: boolean;
  message: string;
  resultTier: ResultTier;
}

export function ChallengeBox() {
  const [challenge, setChallenge] = useState<ChallengeStartPayload | null>(null);
  const [hintUsed, setHintUsed] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  // A ref, not state: two click events dispatched in the same tick (a fast
  // double-click/double-tap) both run before React commits the `feedback`
  // state update from the first one, so checking `feedback` alone let both
  // calls through and double-recorded one mastery attempt. Refs update
  // synchronously, so this closes that race where state can't.
  const answeredRef = useRef(false);

  useEffect(() => {
    const handleStart = (payload: ChallengeStartPayload) => {
      setChallenge(payload);
      setHintUsed(false);
      setFeedback(null);
      answeredRef.current = false;
      void pronunciationAudioProvider.play({
        id: payload.target.contentItemId,
        audioUrl: payload.target.audioUrl,
      });
    };
    eventBus.onTyped("challenge:start", handleStart);
    return () => eventBus.offTyped("challenge:start", handleStart);
  }, []);

  if (!challenge) return null;
  // Narrowed non-null for the rest of this render — avoids relying on TS to
  // re-narrow `challenge` inside the closures defined below.
  const active = challenge;

  async function submitAttempt(resultTier: ResultTier): Promise<void> {
    try {
      const response = await fetch("/api/mastery/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: active.playerId,
          contentItemId: active.target.contentItemId,
          resultTier,
        }),
      });
      if (!response.ok) throw new Error(`Server responded ${response.status}`);
    } catch (cause) {
      // A failed write never blocks the child from continuing — Phase 0
      // requires the game never leave a kid stuck, even when the network does.
      console.error("[ChallengeBox] Could not record mastery attempt:", cause);
    }
  }

  function handleSelect(option: ChallengeOption): void {
    if (answeredRef.current) return; // already resolved this challenge — see answeredRef above
    answeredRef.current = true;
    const correct = option.contentItemId === active.target.contentItemId;
    const resultTier: ResultTier = correct ? (hintUsed ? "good" : "perfect") : "practice";

    void submitAttempt(resultTier);

    if (correct) {
      setFeedback({ correct: true, message: "¡Correcto! Great job!", resultTier });
    } else {
      const targetOption = active.options.find((o) => o.contentItemId === active.target.contentItemId);
      setFeedback({
        correct: false,
        message: `¡Casi! Era "${targetOption?.spanishText ?? active.target.englishText}". Almost! It was "${active.target.englishText}".`,
        resultTier,
      });
    }
  }

  function handleClose(): void {
    if (!feedback) return; // only reachable from the feedback branch below, but keeps this safe on its own
    const contentItemId = active.target.contentItemId;
    const { resultTier } = feedback;
    setChallenge(null);
    eventBus.emitTyped("challenge:closed", { contentItemId, resultTier });
  }

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#171933cc",
      }}
    >
      <div
        style={{
          width: 420,
          padding: "20px 24px",
          borderRadius: 8,
          border: "1px solid #5fe0d1",
          background: "#1e2140",
          color: "#ece7f3",
          font: "15px/1.5 system-ui, sans-serif",
        }}
      >
        {!feedback ? (
          <>
            <div style={{ font: "700 13px system-ui, sans-serif", color: "#f0b94a", marginBottom: 6 }}>
              Which one is...
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>{active.target.englishText}</div>
            <button
              onClick={() =>
                void pronunciationAudioProvider.play({
                  id: active.target.contentItemId,
                  audioUrl: active.target.audioUrl,
                })
              }
              style={{
                padding: "4px 12px",
                borderRadius: 4,
                border: "1px solid #b3addb",
                background: "transparent",
                color: "#ece7f3",
                cursor: "pointer",
                marginBottom: 16,
              }}
            >
              Replay
            </button>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 16 }}>
              {active.options.map((option) => {
                const isHinted = hintUsed && option.contentItemId === active.target.contentItemId;
                return (
                  <button
                    key={option.contentItemId}
                    onClick={() => handleSelect(option)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 6,
                      padding: 10,
                      borderRadius: 6,
                      border: isHinted ? "2px solid #f0b94a" : "1px solid #5c5580",
                      background: "transparent",
                      cursor: "pointer",
                      color: "#ece7f3",
                    }}
                  >
                    <OptionIcon contentItemId={option.contentItemId} />
                    <span>{option.spanishText}</span>
                  </button>
                );
              })}
            </div>
            {!hintUsed && (
              <button
                onClick={() => setHintUsed(true)}
                style={{
                  padding: "4px 12px",
                  borderRadius: 4,
                  border: "1px solid #b3addb",
                  background: "transparent",
                  color: "#ece7f3",
                  cursor: "pointer",
                }}
              >
                Hint
              </button>
            )}
          </>
        ) : (
          <div onClick={handleClose} style={{ cursor: "pointer" }}>
            <div style={{ marginBottom: 12 }}>{feedback.message}</div>
            <span style={{ opacity: 0.6, fontSize: 13 }}>Tap to continue</span>
          </div>
        )}
      </div>
    </div>
  );
}
