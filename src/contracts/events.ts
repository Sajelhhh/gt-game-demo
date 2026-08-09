import type {
  AttackKind,
  DamageCause,
  EntityId,
  EntityKind,
  Facing,
  HealthChangeCause,
  Vec2,
} from "./domain";

export const GAME_EVENT = {
  HEALTH_CHANGED: "health-changed",
  ATTACK_STARTED: "attack-started",
  DAMAGE_APPLIED: "damage-applied",
  ENTITY_DIED: "entity-died",
  CHECKPOINT_REACHED: "checkpoint-reached",
  LEVEL_COMPLETED: "level-completed",
  PAUSE_CHANGED: "pause-changed",
  RESTART_REQUESTED: "restart-requested",
  AUDIO_SETTINGS_CHANGED: "audio-settings-changed",
} as const;

export interface GameEventMap {
  "health-changed": Readonly<{
    entityId: EntityId;
    entityKind: EntityKind;
    previousHealth: number;
    currentHealth: number;
    maxHealth: number;
    delta: number;
    cause: HealthChangeCause;
  }>;
  "attack-started": Readonly<{
    attackId: string;
    attackKind: AttackKind;
    attackerId: EntityId;
    attackerKind: EntityKind;
    facing: Facing;
    origin: Vec2;
    damage: number;
    startedAtMs: number;
  }>;
  "damage-applied": Readonly<{
    targetId: EntityId;
    targetKind: EntityKind;
    sourceId: EntityId | null;
    cause: DamageCause;
    attackId: string | null;
    amount: number;
    remainingHealth: number;
    knockbackVelocity: Vec2;
    appliedAtMs: number;
  }>;
  "entity-died": Readonly<{
    entityId: EntityId;
    entityKind: EntityKind;
    sourceId: EntityId | null;
    cause: DamageCause;
    position: Vec2;
    diedAtMs: number;
  }>;
  "checkpoint-reached": Readonly<{
    playerId: EntityId;
    checkpointId: string;
    previousCheckpointId: string | null;
    respawnPosition: Vec2;
    reachedAtMs: number;
  }>;
  "level-completed": Readonly<{
    levelId: string;
    playerId: EntityId;
    elapsedMs: number;
    defeatedEnemyCount: number;
    completedAtMs: number;
  }>;
  "pause-changed": Readonly<{
    paused: boolean;
    reason: "keyboard" | "ui" | "system";
  }>;
  "restart-requested": Readonly<{
    mode: "checkpoint" | "level";
    reason: "death" | "user" | "completion";
  }>;
  "audio-settings-changed": Readonly<{
    musicEnabled: boolean;
    soundEffectsEnabled: boolean;
    musicVolume: number;
    soundEffectsVolume: number;
  }>;
}

export type Unsubscribe = () => void;

export interface TypedEventBus {
  emit<K extends keyof GameEventMap>(name: K, payload: GameEventMap[K]): void;
  on<K extends keyof GameEventMap>(
    name: K,
    listener: (payload: GameEventMap[K]) => void,
  ): Unsubscribe;
  once<K extends keyof GameEventMap>(
    name: K,
    listener: (payload: GameEventMap[K]) => void,
  ): Unsubscribe;
  clear(): void;
}
