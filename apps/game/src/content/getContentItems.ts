import type Phaser from "phaser";
import type { ContentItem } from "@echonia/shared-types";

/** Reads the content payload BootScene fetched and stashed in the registry. */
export function getContentItems(game: Phaser.Game): ContentItem[] {
  const content = game.registry.get("content") as { contentItems: ContentItem[] } | undefined;
  return content?.contentItems ?? [];
}

export function findContentItem(game: Phaser.Game, id: string): ContentItem | undefined {
  return getContentItems(game).find((item) => item.id === id);
}
