import { useState } from "react";
import type { AgeBand, Player } from "@echonia/shared-types";
import { AVATAR_COLORS, DEFAULT_AVATAR_CHOICE } from "../player/avatarColors";
import { saveStoredPlayer } from "../player/playerStorage";

interface Props {
  onCreated: (player: Player) => void;
}

const AGE_BANDS: Array<{ label: string; value: AgeBand }> = [
  { label: "4-6", value: "fledgling" },
  { label: "7-9", value: "wordsmith" },
  { label: "10-12", value: "loremaster" },
];

function toHexColor(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}

export function CharacterCreation({ onCreated }: Props) {
  const [displayName, setDisplayName] = useState("");
  const [avatarChoice, setAvatarChoice] = useState(DEFAULT_AVATAR_CHOICE);
  const [ageBand, setAgeBand] = useState<AgeBand | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = displayName.trim().length > 0 && ageBand !== null && !submitting;

  async function handleSubmit(): Promise<void> {
    if (!canSubmit || !ageBand) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/player", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: displayName.trim(), avatarChoice, ageBand }),
      });
      if (!response.ok) throw new Error(`Server responded ${response.status}`);
      const player = (await response.json()) as Player;
      saveStoredPlayer(player);
      onCreated(player);
    } catch (cause) {
      console.error("[CharacterCreation] Could not create player:", cause);
      setError("Could not reach the server. Make sure `pnpm --filter server dev` is running, then try again.");
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#171933",
        color: "#ece7f3",
        font: "15px/1.5 system-ui, sans-serif",
      }}
    >
      <div
        style={{
          width: 360,
          padding: "28px 32px",
          borderRadius: 8,
          border: "1px solid #5fe0d1",
          background: "#1e2140",
        }}
      >
        <h1 style={{ fontSize: 22, margin: "0 0 4px", fontFamily: "Georgia, serif", color: "#5fe0d1" }}>
          ECHONIA
        </h1>
        <p style={{ margin: "0 0 20px", opacity: 0.75 }}>Create your hero.</p>

        <label style={{ display: "block", fontSize: 13, marginBottom: 6, opacity: 0.8 }}>Name</label>
        <input
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value.slice(0, 20))}
          maxLength={20}
          placeholder="Hero name"
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: 4,
            border: "1px solid #5c5580",
            background: "#171933",
            color: "#ece7f3",
            marginBottom: 18,
            boxSizing: "border-box",
          }}
        />

        <label style={{ display: "block", fontSize: 13, marginBottom: 6, opacity: 0.8 }}>Color</label>
        <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
          {Object.entries(AVATAR_COLORS).map(([key, color]) => (
            <button
              key={key}
              onClick={() => setAvatarChoice(key)}
              aria-label={key}
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: toHexColor(color),
                border: avatarChoice === key ? "3px solid #ece7f3" : "3px solid transparent",
                cursor: "pointer",
              }}
            />
          ))}
        </div>

        <label style={{ display: "block", fontSize: 13, marginBottom: 6, opacity: 0.8 }}>Age</label>
        <div style={{ display: "flex", gap: 8, marginBottom: 22 }}>
          {AGE_BANDS.map((band) => (
            <button
              key={band.value}
              onClick={() => setAgeBand(band.value)}
              style={{
                flex: 1,
                padding: "8px 0",
                borderRadius: 4,
                border: ageBand === band.value ? "1px solid #5fe0d1" : "1px solid #5c5580",
                background: ageBand === band.value ? "#5fe0d122" : "transparent",
                color: "#ece7f3",
                cursor: "pointer",
              }}
            >
              {band.label}
            </button>
          ))}
        </div>

        {error && <p style={{ color: "#e58671", fontSize: 13, marginBottom: 12 }}>{error}</p>}

        <button
          onClick={() => void handleSubmit()}
          disabled={!canSubmit}
          style={{
            width: "100%",
            padding: "10px 0",
            borderRadius: 6,
            border: "none",
            background: canSubmit ? "#5fe0d1" : "#5c5580",
            color: "#171933",
            fontWeight: 700,
            cursor: canSubmit ? "pointer" : "not-allowed",
          }}
        >
          {submitting ? "Starting..." : "Start Adventure"}
        </button>
      </div>
    </div>
  );
}
