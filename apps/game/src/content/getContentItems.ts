import type Phaser from "phaser";
import type { ContentItem, Item, Quest } from "@echonia/shared-types";

interface RegistryContent {
  contentItems: ContentItem[];
  quests: Quest[];
  items: Item[];
}

/** Reads the content payload BootScene fetched and stashed in the registry. */
function getContent(game: Phaser.Game): RegistryContent {
  const content = game.registry.get("content") as Partial<RegistryContent> | undefined;
  return {
    contentItems: content?.contentItems ?? [],
    quests: content?.quests ?? [],
    items: content?.items ?? [],
  };
}

export function getContentItems(game: Phaser.Game): ContentItem[] {
  return getContent(game).contentItems;
}

export function findContentItem(game: Phaser.Game, id: string): ContentItem | undefined {
  return getContentItems(game).find((item) => item.id === id);
}

export function findQuest(game: Phaser.Game, id: string): Quest | undefined {
  return getContent(game).quests.find((quest) => quest.id === id);
}

export function findItem(game: Phaser.Game, id: string): Item | undefined {
  return getContent(game).items.find((item) => item.id === id);
}
