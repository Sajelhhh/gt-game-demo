export type EntityId = string;

export type EntityKind = "player" | "patrol-enemy" | "chase-enemy";
export type AttackKind = "player-melee" | "enemy-melee";
export type DamageCause =
  | "player-attack"
  | "enemy-attack"
  | "enemy-contact"
  | "spike"
  | "pit";
export type HealthChangeCause = DamageCause | "spawn" | "respawn";
export type Facing = "left" | "right";

export type Vec2 = Readonly<{ x: number; y: number }>;

export type HealthSnapshot = Readonly<{
  currentHealth: number;
  maxHealth: number;
}>;

export type HealthChange = Readonly<{
  previousHealth: number;
  currentHealth: number;
  maxHealth: number;
  appliedDamage: number;
}>;

export interface Damageable {
  readonly id: EntityId;
  readonly kind: EntityKind;
  readonly position: Vec2;
  getHealth(): HealthSnapshot;
  isAlive(): boolean;
  isInvulnerable(atMs: number): boolean;
  commitDamage(amount: number): HealthChange;
  grantInvulnerability(untilMs: number): void;
  applyKnockback(velocity: Vec2): void;
  enterDeadState(): void;
}
