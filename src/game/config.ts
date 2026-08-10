export interface GameConfig {
  readonly render: {
    readonly widthPx: number;
    readonly heightPx: number;
    readonly backgroundColor: string;
    readonly pixelArt: boolean;
  };
  readonly physics: { readonly gravityY: number };
  readonly input: {
    readonly left: readonly ["A", "LEFT"];
    readonly right: readonly ["D", "RIGHT"];
    readonly jump: readonly ["SPACE", "W", "UP"];
    readonly attack: readonly ["J", "X"];
    readonly pause: readonly ["ESC"];
  };
  readonly player: {
    readonly maxHealth: number;
    readonly moveSpeedPxPerSecond: number;
    readonly accelerationPxPerSecondSquared: number;
    readonly groundDragPxPerSecondSquared: number;
    readonly jumpSpeedPxPerSecond: number;
    readonly airJumps: number;
    readonly coyoteTimeMs: number;
    readonly jumpBufferTimeMs: number;
    readonly releasedJumpVelocityFactor: number;
    readonly invulnerabilityMs: number;
    readonly hurtControlLockMs: number;
  };
  readonly combat: {
    readonly playerMelee: {
      readonly damage: number;
      readonly cooldownMs: number;
      readonly activeFrameStart: number;
      readonly activeFrameEnd: number;
      readonly hitboxOffsetXPx: number;
      readonly hitboxWidthPx: number;
      readonly hitboxHeightPx: number;
      readonly knockbackXPxPerSecond: number;
      readonly knockbackYPxPerSecond: number;
      readonly shockwaveDurationMs: number;
      readonly shockwaveTravelPx: number;
      readonly shockwaveRadiusPx: number;
      readonly hitSparkDurationMs: number;
      readonly contactGuardMs: number;
      readonly enemyHitStunMs: number;
      readonly targetInvulnerabilityMs: number;
    };
    readonly contactKnockbackXPxPerSecond: number;
    readonly contactKnockbackYPxPerSecond: number;
  };
  readonly enemies: {
    readonly patrol: {
      readonly maxHealth: number;
      readonly moveSpeedPxPerSecond: number;
      readonly contactDamage: number;
    };
    readonly chase: {
      readonly maxHealth: number;
      readonly moveSpeedPxPerSecond: number;
      readonly detectionRangePx: number;
      readonly disengageRangePx: number;
      readonly contactDamage: number;
      readonly attackRangePx: number;
      readonly attackDamage: number;
      readonly attackCooldownMs: number;
      readonly activeFrameStart: number;
      readonly activeFrameEnd: number;
      readonly hitboxOffsetXPx: number;
      readonly hitboxWidthPx: number;
      readonly hitboxHeightPx: number;
      readonly knockbackXPxPerSecond: number;
      readonly knockbackYPxPerSecond: number;
    };
  };
  readonly hazards: {
    readonly spikeDamage: number;
    readonly pitDamage: number;
    readonly pitResetMarginPx: number;
  };
  readonly respawn: { readonly delayMs: number };
  readonly level: {
    readonly id: string;
    readonly targetDurationMinMs: number;
    readonly targetDurationMaxMs: number;
    readonly offscreenSleepMarginPx: number;
  };
  readonly audio: {
    readonly musicEnabled: boolean;
    readonly soundEffectsEnabled: boolean;
    readonly musicVolume: number;
    readonly soundEffectsVolume: number;
  };
}

const DEFAULTS = {
  render: {
    widthPx: 1280,
    heightPx: 720,
    backgroundColor: "#10131f",
    pixelArt: true,
  },
  physics: { gravityY: 1200 },
  input: {
    left: ["A", "LEFT"],
    right: ["D", "RIGHT"],
    jump: ["SPACE", "W", "UP"],
    attack: ["J", "X"],
    pause: ["ESC"],
  },
  player: {
    maxHealth: 5,
    moveSpeedPxPerSecond: 220,
    accelerationPxPerSecondSquared: 1600,
    groundDragPxPerSecondSquared: 1800,
    jumpSpeedPxPerSecond: 430,
    airJumps: 1,
    coyoteTimeMs: 100,
    jumpBufferTimeMs: 100,
    releasedJumpVelocityFactor: 0.5,
    invulnerabilityMs: 800,
    hurtControlLockMs: 180,
  },
  combat: {
    playerMelee: {
      damage: 1,
      cooldownMs: 350,
      activeFrameStart: 2,
      activeFrameEnd: 4,
      hitboxOffsetXPx: 28,
      hitboxWidthPx: 36,
      hitboxHeightPx: 24,
      knockbackXPxPerSecond: 180,
      knockbackYPxPerSecond: 140,
      shockwaveDurationMs: 220,
      shockwaveTravelPx: 58,
      shockwaveRadiusPx: 24,
      hitSparkDurationMs: 170,
      contactGuardMs: 260,
      enemyHitStunMs: 180,
      targetInvulnerabilityMs: 180,
    },
    contactKnockbackXPxPerSecond: 160,
    contactKnockbackYPxPerSecond: 120,
  },
  enemies: {
    patrol: {
      maxHealth: 2,
      moveSpeedPxPerSecond: 80,
      contactDamage: 1,
    },
    chase: {
      maxHealth: 3,
      moveSpeedPxPerSecond: 110,
      detectionRangePx: 240,
      disengageRangePx: 320,
      contactDamage: 1,
      attackRangePx: 48,
      attackDamage: 1,
      attackCooldownMs: 900,
      activeFrameStart: 2,
      activeFrameEnd: 3,
      hitboxOffsetXPx: 24,
      hitboxWidthPx: 32,
      hitboxHeightPx: 24,
      knockbackXPxPerSecond: 160,
      knockbackYPxPerSecond: 100,
    },
  },
  hazards: {
    spikeDamage: 1,
    pitDamage: 1,
    pitResetMarginPx: 96,
  },
  respawn: { delayMs: 600 },
  level: {
    id: "level-01",
    targetDurationMinMs: 180000,
    targetDurationMaxMs: 300000,
    offscreenSleepMarginPx: 128,
  },
  audio: {
    musicEnabled: true,
    soundEffectsEnabled: true,
    musicVolume: 0.6,
    soundEffectsVolume: 0.8,
  },
} as const satisfies GameConfig;

const deepFreeze = <Value>(value: Value): Readonly<Value> => {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const nested of Object.values(value)) {
      deepFreeze(nested);
    }
    Object.freeze(value);
  }
  return value;
};

export const validateGameConfig = (config: GameConfig): readonly string[] => {
  const errors: string[] = [];

  const visitNumbers = (value: unknown, path: string): void => {
    if (typeof value === "number" && (!Number.isFinite(value) || value < 0)) {
      errors.push(`${path} must be a finite, non-negative number`);
      return;
    }
    if (value !== null && typeof value === "object") {
      for (const [key, nested] of Object.entries(value)) {
        visitNumbers(nested, path ? `${path}.${key}` : key);
      }
    }
  };

  visitNumbers(config, "");

  const unitValues = [
    [
      "player.releasedJumpVelocityFactor",
      config.player.releasedJumpVelocityFactor,
    ],
    ["audio.musicVolume", config.audio.musicVolume],
    ["audio.soundEffectsVolume", config.audio.soundEffectsVolume],
  ] as const;
  for (const [path, value] of unitValues) {
    if (value > 1) errors.push(`${path} must be between 0 and 1`);
  }

  if (
    config.combat.playerMelee.activeFrameStart >
    config.combat.playerMelee.activeFrameEnd
  ) {
    errors.push("combat.playerMelee active frame range is invalid");
  }
  if (
    config.enemies.chase.activeFrameStart > config.enemies.chase.activeFrameEnd
  ) {
    errors.push("enemies.chase active frame range is invalid");
  }
  if (
    config.enemies.chase.disengageRangePx <
    config.enemies.chase.detectionRangePx
  ) {
    errors.push("enemies.chase disengage range must cover detection range");
  }
  if (config.level.targetDurationMaxMs < config.level.targetDurationMinMs) {
    errors.push("level target duration range is invalid");
  }
  if (!Number.isInteger(config.player.airJumps)) {
    errors.push("player.airJumps must be an integer");
  }

  return errors;
};

const configErrors = validateGameConfig(DEFAULTS);
if (configErrors.length > 0) {
  throw new Error(`Invalid default game config: ${configErrors.join("; ")}`);
}

export const DEFAULT_GAME_CONFIG: Readonly<GameConfig> = deepFreeze(DEFAULTS);
