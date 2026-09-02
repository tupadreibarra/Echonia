import { useEffect, useState } from "react";
import { eventBus, type RewardStartPayload } from "../bridge/eventBus";

type Step = "xp" | "levelup" | "item";

/**
 * Two distinct beats after a victory, per Phase 4's two separate Must Have
 * acceptance criteria: the XP/level-up moment has to be visibly more than a
 * number quietly changing, and equipping the reward needs an explicit press,
 * not a silent flag. Equip itself already happened server-side when the
 * reward was granted (CombatScene) — the button here is the deliberate
 * confirmation step the AC calls for, not a second network round trip.
 */
export function RewardScreen() {
  const [reward, setReward] = useState<RewardStartPayload | null>(null);
  const [step, setStep] = useState<Step>("xp");

  useEffect(() => {
    const handleStart = (payload: RewardStartPayload) => {
      setReward(payload);
      setStep("xp");
    };
    eventBus.onTyped("reward:start", handleStart);
    return () => eventBus.offTyped("reward:start", handleStart);
  }, []);

  if (!reward) return null;

  function advance(): void {
    if (step === "xp") {
      setStep(reward!.leveledUp ? "levelup" : "item");
      return;
    }
    if (step === "levelup") {
      setStep("item");
      return;
    }
    setReward(null);
    eventBus.emitTyped("reward:closed", {});
  }

  const awaitingEquipPress = step === "item" && Boolean(reward.item);

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
        onClick={awaitingEquipPress ? undefined : advance}
        style={{
          width: 360,
          padding: "24px 28px",
          borderRadius: 8,
          border: "1px solid #5fe0d1",
          background: "#1e2140",
          color: "#ece7f3",
          font: "15px/1.5 system-ui, sans-serif",
          textAlign: "center",
          cursor: awaitingEquipPress ? "default" : "pointer",
        }}
      >
        {step === "xp" && (
          <>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#5fe0d1", marginBottom: 8 }}>
              +{reward.xpGained} XP
            </div>
            <div style={{ opacity: 0.8, marginBottom: 16 }}>+{reward.glimmersGained} Glimmers</div>
            <span style={{ opacity: 0.6, fontSize: 13 }}>Tap to continue</span>
          </>
        )}

        {step === "levelup" && (
          <>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#f0b94a", marginBottom: 8 }}>LEVEL UP!</div>
            <div style={{ fontSize: 18, marginBottom: 16 }}>Level {reward.newLevel}</div>
            <span style={{ opacity: 0.6, fontSize: 13 }}>Tap to continue</span>
          </>
        )}

        {step === "item" && reward.item && (
          <>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: reward.item.visualTint,
                margin: "0 auto 12px",
              }}
            />
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{reward.item.name}</div>
            <div style={{ opacity: 0.8, marginBottom: 18, fontSize: 14 }}>{reward.item.description}</div>
            <button
              onClick={advance}
              style={{
                padding: "8px 20px",
                borderRadius: 6,
                border: "none",
                background: "#5fe0d1",
                color: "#171933",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Equip
            </button>
          </>
        )}

        {step === "item" && !reward.item && (
          <>
            <div style={{ marginBottom: 12 }}>Quest complete!</div>
            <span style={{ opacity: 0.6, fontSize: 13 }}>Tap to continue</span>
          </>
        )}
      </div>
    </div>
  );
}
