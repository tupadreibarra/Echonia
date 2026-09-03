import Phaser from "phaser";

/**
 * Procedurally-generated placeholder sprites, per Phase 0 §29 — runtime
 * Graphics -> texture generation, no binary asset files. Swapping in real
 * illustrated art later means pointing a texture key at a loaded image
 * instead of one of these generators, not touching any scene logic.
 *
 * Every generator checks `scene.textures.exists` first: Phaser's texture
 * manager is global across scenes, so a texture made in an earlier
 * VillageScene.create() (Phaser reuses scene instances — see that file's own
 * comment on this) is reused rather than redrawn on every visit.
 */

function shade(color: number, factor: number): number {
  const c = Phaser.Display.Color.IntegerToColor(color);
  const adjust = (v: number) => Phaser.Math.Clamp(Math.round(v * factor), 0, 255);
  return Phaser.Display.Color.GetColor(adjust(c.red), adjust(c.green), adjust(c.blue));
}

const HUMANOID_W = 34;
const HUMANOID_H = 42;
const SKIN_TONE = 0xe8c9a0;
const INK = 0x2a2440;

function drawHead(g: Phaser.GameObjects.Graphics, bodyColor: number, cx: number, headY: number): void {
  // Hood/hair band peeking from behind the head, so the head-body seam
  // reads as one figure instead of two stacked shapes.
  g.fillStyle(shade(bodyColor, 0.7), 1);
  g.fillCircle(cx, headY + 1.5, 9.5);

  g.fillStyle(SKIN_TONE, 1);
  g.fillCircle(cx, headY, 7.5);

  // Eyes — the single cheapest thing that makes a blob read as a face.
  g.fillStyle(INK, 1);
  g.fillCircle(cx - 2.6, headY - 1, 1.1);
  g.fillCircle(cx + 2.6, headY - 1, 1.1);
}

/** The player's hero — plain torso, outfit color is the player's chosen avatar color. */
export function ensureHeroTexture(scene: Phaser.Scene, bodyColor: number): string {
  const key = `spr-hero-${bodyColor.toString(16)}`;
  if (scene.textures.exists(key)) return key;

  const g = scene.add.graphics();
  const cx = HUMANOID_W / 2;
  const headY = HUMANOID_H - 27;

  g.fillStyle(bodyColor, 1);
  g.fillRoundedRect(cx - 11, HUMANOID_H - 24, 22, 24, 7);
  drawHead(g, bodyColor, cx, headY);

  g.generateTexture(key, HUMANOID_W, HUMANOID_H);
  g.destroy();
  return key;
}

/** Master Orin — same humanoid base, wider robe silhouette, a pointed hat. */
export function ensureWizardTexture(scene: Phaser.Scene, bodyColor: number): string {
  const key = `spr-wizard-${bodyColor.toString(16)}`;
  if (scene.textures.exists(key)) return key;

  const g = scene.add.graphics();
  const cx = HUMANOID_W / 2;
  const height = HUMANOID_H + 10; // extra headroom for the hat
  const headY = height - 27;

  // Robe: wider at the base than a plain torso.
  g.fillStyle(bodyColor, 1);
  g.fillTriangle(cx - 14, height - 2, cx + 14, height - 2, cx, height - 26);
  g.fillRoundedRect(cx - 11, height - 26, 22, 12, 5);

  drawHead(g, bodyColor, cx, headY);

  // Pointed wizard hat, brim resting just above the head.
  const hatColor = shade(bodyColor, 0.85);
  g.fillStyle(hatColor, 1);
  g.fillTriangle(cx - 9, height - 34, cx + 9, height - 34, cx, height - 52);
  g.fillEllipse(cx, height - 34, 21, 5);

  g.generateTexture(key, HUMANOID_W, height);
  g.destroy();
  return key;
}

/**
 * Pip — a spark-spirit, explicitly NOT humanoid per Phase 0's lore. A soft
 * glow behind a small four-point sparkle core, so it reads as light/magic
 * rather than a shrunken person.
 */
export function ensureSpiritTexture(scene: Phaser.Scene, color: number): string {
  const key = `spr-spirit-${color.toString(16)}`;
  if (scene.textures.exists(key)) return key;

  const size = 28;
  const cx = size / 2;
  const cy = size / 2;
  const g = scene.add.graphics();

  g.fillStyle(color, 0.25);
  g.fillCircle(cx, cy, size / 2);

  const outerR = 8;
  const innerR = 3.2;
  const points: Phaser.Types.Math.Vector2Like[] = [];
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI / 4) * i;
    const r = i % 2 === 0 ? outerR : innerR;
    points.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
  }
  g.fillStyle(color, 1);
  g.fillPoints(points, true);

  g.fillStyle(0xffffff, 0.9);
  g.fillCircle(cx, cy, 1.6);

  g.generateTexture(key, size, size);
  g.destroy();
  return key;
}

/** The Puddlewump — a friendly slime/blob with a face. Never scary, per Phase 0. */
export function ensureBlobTexture(scene: Phaser.Scene, key: string, color: number): string {
  if (scene.textures.exists(key)) return key;

  const w = 44;
  const h = 34;
  const g = scene.add.graphics();

  g.fillStyle(color, 1);
  g.fillEllipse(w / 2, h / 2 + 2, w - 4, h - 6);

  g.fillStyle(shade(color, 1.3), 0.5);
  g.fillEllipse(w / 2, h / 2 + 6, w - 18, h - 20);

  g.fillStyle(INK, 1);
  g.fillCircle(w / 2 - 6, h / 2 - 2, 1.4);
  g.fillCircle(w / 2 + 6, h / 2 - 2, 1.4);

  g.lineStyle(1.4, INK, 0.8);
  g.beginPath();
  g.arc(w / 2, h / 2 + 1, 4, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(160));
  g.strokePath();

  g.generateTexture(key, w, h);
  g.destroy();
  return key;
}

/** A small tileable grass texture with speckled variation, in place of a flat color fill. */
export function ensureGrassTileTexture(scene: Phaser.Scene, baseColor: number): string {
  const key = `spr-grass-${baseColor.toString(16)}`;
  if (scene.textures.exists(key)) return key;

  const size = 32;
  const g = scene.add.graphics();

  g.fillStyle(baseColor, 1);
  g.fillRect(0, 0, size, size);

  const speckles: Array<[number, number, number, number]> = [
    [4, 6, 5, 0.85],
    [19, 4, 4, 1.2],
    [9, 21, 6, 0.85],
    [25, 23, 5, 1.2],
    [14, 13, 4, 0.9],
    [27, 10, 3, 1.15],
  ];
  for (const [x, y, r, factor] of speckles) {
    g.fillStyle(shade(baseColor, factor), 0.55);
    g.fillCircle(x, y, r);
  }

  g.generateTexture(key, size, size);
  g.destroy();
  return key;
}
