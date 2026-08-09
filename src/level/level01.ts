export type LevelBounds = Readonly<{
  width: number;
  height: number;
}>;

export type LevelPoint = Readonly<{
  x: number;
  y: number;
}>;

export type LevelRectangle = Readonly<{
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}>;

export type WorldGeometry = LevelRectangle &
  Readonly<{
    kind: "ground" | "platform" | "wall";
  }>;

export type HazardZone = LevelRectangle &
  Readonly<{
    kind: "spike" | "pit";
    damage: number;
  }>;

export type CheckpointDefinition = LevelRectangle &
  Readonly<{
    respawnPosition: LevelPoint;
  }>;

export type GoalDefinition = LevelRectangle;

export type LevelLayout = Readonly<{
  id: string;
  bounds: LevelBounds;
  playerSpawn: LevelPoint;
  world: readonly WorldGeometry[];
  hazards: readonly HazardZone[];
  checkpoints: readonly CheckpointDefinition[];
  goal: GoalDefinition;
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

    // The first pit intentionally leaves generous base-jump clearance.
    {
      id: "tutorial-ground",
      x: 0,
      y: 640,
      width: 1_140,
      height: 80,
      kind: "ground",
    },
    {
      id: "main-ground",
      x: 1_200,
      y: 640,
      width: WORLD_WIDTH - 1_200,
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
      x: 1_200,
      y: 540,
      width: 320,
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
  hazards: [
    {
      id: "tutorial-pit",
      x: 1_140,
      y: 648,
      width: 60,
      height: 72,
      kind: "pit",
      damage: 1,
    },
    {
      id: "challenge-spikes-1",
      x: 2_430,
      y: 608,
      width: 140,
      height: 32,
      kind: "spike",
      damage: 1,
    },
    {
      id: "challenge-spikes-2",
      x: 2_860,
      y: 608,
      width: 90,
      height: 32,
      kind: "spike",
      damage: 1,
    },
  ],
  checkpoints: [
    {
      id: "checkpoint-1",
      x: 3_420,
      y: 445,
      width: 180,
      height: 100,
      respawnPosition: { x: 3_480, y: 500 },
    },
  ],
  goal: {
    id: "level-goal",
    x: 4_540,
    y: 500,
    width: 100,
    height: 140,
  },
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
  const rectangles: readonly LevelRectangle[] = [
    ...layout.world,
    ...layout.hazards,
    ...layout.checkpoints,
    layout.goal,
  ];
  for (const geometry of rectangles) {
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

  for (const hazard of layout.hazards) {
    if (!Number.isFinite(hazard.damage) || hazard.damage <= 0) {
      errors.push(`${hazard.id} damage must be a finite, positive number`);
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

  if (
    layout.hazards.some((hazard) => containsPoint(hazard, layout.playerSpawn))
  ) {
    errors.push("player spawn must not overlap a hazard");
  }

  for (const checkpoint of layout.checkpoints) {
    if (!isPointInsideBounds(layout.bounds, checkpoint.respawnPosition)) {
      errors.push(
        `${checkpoint.id} respawn position must stay inside level bounds`,
      );
    }
    if (
      layout.hazards.some((hazard) =>
        containsPoint(hazard, checkpoint.respawnPosition),
      )
    ) {
      errors.push(
        `${checkpoint.id} respawn position must not overlap a hazard`,
      );
    }
  }

  return errors;
};

const containsPoint = (
  rectangle: Pick<LevelRectangle, "x" | "y" | "width" | "height">,
  point: LevelPoint,
): boolean =>
  point.x >= rectangle.x &&
  point.x <= rectangle.x + rectangle.width &&
  point.y >= rectangle.y &&
  point.y <= rectangle.y + rectangle.height;

const isPointInsideBounds = (bounds: LevelBounds, point: LevelPoint): boolean =>
  point.x >= 0 &&
  point.x <= bounds.width &&
  point.y >= 0 &&
  point.y <= bounds.height;
