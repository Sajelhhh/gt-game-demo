export type LevelBounds = Readonly<{
  width: number;
  height: number;
}>;

export type LevelPoint = Readonly<{
  x: number;
  y: number;
}>;

export type WorldGeometry = Readonly<{
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  kind: "ground" | "platform" | "wall";
}>;

export type LevelLayout = Readonly<{
  id: string;
  bounds: LevelBounds;
  playerSpawn: LevelPoint;
  world: readonly WorldGeometry[];
}>;

const WORLD_WIDTH = 4_800;
const WORLD_HEIGHT = 720;

/**
 * The level is deliberately data-first. Gameplay systems may consume this
 * layout without knowing how the placeholder geometry is rendered.
 * Coordinates use top-left origins; LevelLoader converts them for Phaser.
 */
export const LEVEL_01: LevelLayout = {
  id: "level-01",
  bounds: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
  playerSpawn: { x: 160, y: 540 },
  world: [
    // Boundary walls keep physics bodies inside the authored play space.
    {
      id: "left-wall",
      x: 0,
      y: 0,
      width: 40,
      height: WORLD_HEIGHT,
      kind: "wall",
    },
    {
      id: "right-wall",
      x: WORLD_WIDTH - 40,
      y: 0,
      width: 40,
      height: WORLD_HEIGHT,
      kind: "wall",
    },

    // A single readable pit separates the tutorial and combat spaces.
    {
      id: "tutorial-ground",
      x: 0,
      y: 640,
      width: 1_080,
      height: 80,
      kind: "ground",
    },
    {
      id: "main-ground",
      x: 1_300,
      y: 640,
      width: WORLD_WIDTH - 1_300,
      height: 80,
      kind: "ground",
    },

    // Low, generous platforms require no advanced movement ability.
    {
      id: "tutorial-step-1",
      x: 520,
      y: 545,
      width: 230,
      height: 24,
      kind: "platform",
    },
    {
      id: "tutorial-step-2",
      x: 810,
      y: 485,
      width: 210,
      height: 24,
      kind: "platform",
    },
    {
      id: "pit-landing",
      x: 1_300,
      y: 540,
      width: 260,
      height: 24,
      kind: "platform",
    },
    {
      id: "combat-platform-1",
      x: 1_720,
      y: 520,
      width: 300,
      height: 24,
      kind: "platform",
    },
    {
      id: "combat-platform-2",
      x: 2_140,
      y: 445,
      width: 250,
      height: 24,
      kind: "platform",
    },
    {
      id: "challenge-platform-1",
      x: 2_590,
      y: 535,
      width: 250,
      height: 24,
      kind: "platform",
    },
    {
      id: "challenge-platform-2",
      x: 2_950,
      y: 455,
      width: 280,
      height: 24,
      kind: "platform",
    },
    {
      id: "checkpoint-shelf",
      x: 3_390,
      y: 545,
      width: 300,
      height: 24,
      kind: "platform",
    },
    {
      id: "final-platform-1",
      x: 3_820,
      y: 490,
      width: 260,
      height: 24,
      kind: "platform",
    },
    {
      id: "final-platform-2",
      x: 4_180,
      y: 420,
      width: 240,
      height: 24,
      kind: "platform",
    },
  ],
};

export const validateLevelLayout = (
  layout: LevelLayout,
  viewport: LevelBounds,
): readonly string[] => {
  const errors: string[] = [];

  if (layout.bounds.width < viewport.width) {
    errors.push("level width must cover the viewport");
  }
  if (layout.bounds.height < viewport.height) {
    errors.push("level height must cover the viewport");
  }

  const ids = new Set<string>();
  for (const geometry of layout.world) {
    if (ids.has(geometry.id))
      errors.push(`duplicate geometry id: ${geometry.id}`);
    ids.add(geometry.id);

    if (geometry.width <= 0 || geometry.height <= 0) {
      errors.push(`${geometry.id} must have positive dimensions`);
    }
    if (
      geometry.x < 0 ||
      geometry.y < 0 ||
      geometry.x + geometry.width > layout.bounds.width ||
      geometry.y + geometry.height > layout.bounds.height
    ) {
      errors.push(`${geometry.id} must stay inside level bounds`);
    }
  }

  if (
    layout.playerSpawn.x < 0 ||
    layout.playerSpawn.y < 0 ||
    layout.playerSpawn.x > layout.bounds.width ||
    layout.playerSpawn.y > layout.bounds.height
  ) {
    errors.push("player spawn must stay inside level bounds");
  }

  return errors;
};
