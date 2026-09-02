// The three appearance choices offered at character creation. `avatarChoice`
// is stored as this semantic key (not a raw color), so the schema/DB column
// stays a plain string that a future, richer avatar system can reinterpret
// without a migration.
export const AVATAR_COLORS: Record<string, number> = {
  teal: 0x5fe0d1,
  gold: 0xf0b94a,
  coral: 0xe0715f,
};

export const DEFAULT_AVATAR_CHOICE = "teal";

const FALLBACK_COLOR = 0x5fe0d1; // matches AVATAR_COLORS.teal — never actually reached

export function resolveAvatarColor(avatarChoice: string | undefined): number {
  return AVATAR_COLORS[avatarChoice ?? ""] ?? AVATAR_COLORS[DEFAULT_AVATAR_CHOICE] ?? FALLBACK_COLOR;
}
