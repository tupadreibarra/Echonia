import type { Player } from "@echonia/shared-types";

// The MVP has no accounts (Phase 1) — a player created once via character
// creation is remembered here so a page reload resumes the same hero
// instead of asking to create a new one every visit.
const STORAGE_KEY = "echonia.player";

export function loadStoredPlayer(): Player | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Player;
  } catch {
    return null;
  }
}

export function saveStoredPlayer(player: Player): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(player));
}
