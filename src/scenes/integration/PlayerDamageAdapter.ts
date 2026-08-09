import Phaser from "phaser";

import { Health } from "../../components/Health";
import type {
  Damageable,
  HealthChange,
  HealthSnapshot,
  Vec2,
} from "../../contracts/domain";
import type { GameConfig } from "../../game/config";
import type { Player } from "../../entities/Player";

const PLAYER_COLOR = 0xa7f3d0;
const PLAYER_HURT_COLOR = 0xfca5a5;

/**
 * Keeps health and damage concerns out of the movement-only Player entity.
 * GameScene owns this adapter for exactly the same lifetime as the player.
 */
export class PlayerDamageAdapter implements Damageable {
  readonly id = "player";
  readonly kind = "player" as const;

  private readonly health: Health;
  private invulnerableUntilMs = 0;
  private controlLockedUntilMs = 0;

  constructor(
    private readonly player: Player,
    private readonly config: Readonly<GameConfig["player"]>,
  ) {
    this.health = new Health(config.maxHealth);
  }

  get position(): Vec2 {
    return { x: this.player.x, y: this.player.y };
  }

  getHealth(): HealthSnapshot {
    return this.health.snapshot;
  }

  isAlive(): boolean {
    return this.health.isAlive;
  }

  isInvulnerable(atMs: number): boolean {
    return atMs < this.invulnerableUntilMs;
  }

  isControlLocked(atMs: number): boolean {
    return atMs < this.controlLockedUntilMs;
  }

  commitDamage(amount: number): HealthChange {
    return this.health.commitDamage(amount);
  }

  grantInvulnerability(untilMs: number): void {
    this.invulnerableUntilMs = Math.max(this.invulnerableUntilMs, untilMs);
    const damageStartedAtMs = untilMs - this.config.invulnerabilityMs;
    this.controlLockedUntilMs = Math.max(
      this.controlLockedUntilMs,
      damageStartedAtMs + this.config.hurtControlLockMs,
    );
  }

  applyKnockback(velocity: Vec2): void {
    this.arcadeBody.setVelocity(velocity.x, velocity.y);
  }

  enterHurtState(): void {
    this.player.setFillStyle(PLAYER_HURT_COLOR);
  }

  enterDeadState(): void {
    this.arcadeBody.setVelocity(0, 0);
    this.arcadeBody.enable = false;
    this.player.setActive(false).setVisible(false);
  }

  updatePresentation(nowMs: number): void {
    if (!this.isAlive()) return;

    if (this.isInvulnerable(nowMs)) {
      this.player.setAlpha(Math.floor(nowMs / 90) % 2 === 0 ? 0.35 : 1);
      return;
    }

    this.player.setAlpha(1).setFillStyle(PLAYER_COLOR);
  }

  relocate(position: Vec2): void {
    this.arcadeBody.reset(position.x, position.y);
    this.arcadeBody.setVelocity(0, 0);
  }

  private get arcadeBody(): Phaser.Physics.Arcade.Body {
    const body = this.player.body;
    if (!(body instanceof Phaser.Physics.Arcade.Body)) {
      throw new Error("PlayerDamageAdapter requires an Arcade Physics body");
    }
    return body;
  }
}
