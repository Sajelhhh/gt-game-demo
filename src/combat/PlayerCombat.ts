import type {
  DamageResult,
  Damageable,
  EntityId,
  Facing,
  Vec2,
} from "../contracts/domain";
import { GAME_EVENT, type TypedEventBus } from "../contracts/events";
import type { GameConfig } from "../game/config";
import type { AttackInput } from "../input/AttackInput";
import type { DamageSystem } from "../systems/DamageSystem";
import { AttackHitbox, type HitBounds } from "./AttackHitbox";

const DEFAULT_FRAME_DURATION_MS = 1000 / 60;

export type PlayerAttackSource = Readonly<{
  id: EntityId;
  position: Vec2;
  facing: Facing;
}>;

export type AttackPresentation = Readonly<{
  attackId: string;
  active: boolean;
  hitbox: HitBounds;
  /** A renderer may draw this translucent box for an asset-free slash flash. */
  flash: Readonly<{ bounds: HitBounds; alpha: number }>;
}>;

export type PlayerHitAttempt =
  | Readonly<{ attempted: true; result: DamageResult }>
  | Readonly<{
      attempted: false;
      reason: "inactive" | "outside-hitbox" | "duplicate-target";
    }>;

type DamagePort = Pick<DamageSystem, "applyDamage" | "endAttack">;

type ActiveAttack = {
  readonly id: string;
  readonly startedAtMs: number;
  readonly source: PlayerAttackSource;
  readonly hitbox: HitBounds;
  readonly attemptedTargetIds: Set<EntityId>;
};

/**
 * Small, scene-agnostic player melee controller.
 *
 * Integration: call update once per frame, draw the returned presentation,
 * and call tryHit for each candidate enemy while a presentation is active.
 */
export class PlayerCombat {
  private activeAttack: ActiveAttack | null = null;
  private lastAttackStartedAtMs = Number.NEGATIVE_INFINITY;
  private attackSequence = 0;

  constructor(
    private readonly input: AttackInput,
    private readonly damageSystem: DamagePort,
    private readonly eventBus: TypedEventBus,
    private readonly config: Readonly<GameConfig["combat"]["playerMelee"]>,
    private readonly frameDurationMs = DEFAULT_FRAME_DURATION_MS,
  ) {
    if (!Number.isFinite(frameDurationMs) || frameDurationMs <= 0) {
      throw new RangeError("frameDurationMs must be a finite, positive number");
    }
  }

  update(nowMs: number, source: PlayerAttackSource): AttackPresentation | null {
    this.validateNow(nowMs);
    this.finishExpiredAttack(nowMs);

    if (
      this.input.readAttackPressed() &&
      this.activeAttack === null &&
      nowMs - this.lastAttackStartedAtMs >= this.config.cooldownMs
    ) {
      this.startAttack(nowMs, source);
    }

    return this.getPresentation(nowMs);
  }

  getPresentation(nowMs: number): AttackPresentation | null {
    this.validateNow(nowMs);
    const attack = this.activeAttack;
    if (attack === null || this.isExpired(attack, nowMs)) return null;

    const active = this.isDamageWindowActive(attack, nowMs);
    return {
      attackId: attack.id,
      active,
      hitbox: attack.hitbox,
      flash: { bounds: attack.hitbox, alpha: active ? 0.75 : 0.3 },
    };
  }

  tryHit(
    target: Damageable,
    targetBounds: HitBounds,
    nowMs: number,
  ): PlayerHitAttempt {
    this.validateNow(nowMs);
    const attack = this.activeAttack;
    if (attack === null || !this.isDamageWindowActive(attack, nowMs)) {
      return { attempted: false, reason: "inactive" };
    }
    if (attack.attemptedTargetIds.has(target.id)) {
      return { attempted: false, reason: "duplicate-target" };
    }
    if (!AttackHitbox.overlaps(attack.hitbox, targetBounds)) {
      return { attempted: false, reason: "outside-hitbox" };
    }

    attack.attemptedTargetIds.add(target.id);
    const direction = attack.source.facing === "right" ? 1 : -1;
    return {
      attempted: true,
      result: this.damageSystem.applyDamage({
        target,
        amount: this.config.damage,
        cause: "player-attack",
        sourceId: attack.source.id,
        attackId: attack.id,
        knockbackVelocity: {
          x: direction * this.config.knockbackXPxPerSecond,
          y: -this.config.knockbackYPxPerSecond,
        },
        nowMs,
      }),
    };
  }

  dispose(): void {
    this.endCurrentAttack();
  }

  private startAttack(nowMs: number, source: PlayerAttackSource): void {
    const snapshot = {
      id: source.id,
      position: { ...source.position },
      facing: source.facing,
    } as const;
    const id = `${source.id}:melee:${++this.attackSequence}`;
    this.activeAttack = {
      id,
      startedAtMs: nowMs,
      source: snapshot,
      hitbox: AttackHitbox.fromOrigin(snapshot.position, snapshot.facing, {
        offsetXPx: this.config.hitboxOffsetXPx,
        widthPx: this.config.hitboxWidthPx,
        heightPx: this.config.hitboxHeightPx,
      }),
      attemptedTargetIds: new Set(),
    };
    this.lastAttackStartedAtMs = nowMs;

    this.eventBus.emit(GAME_EVENT.ATTACK_STARTED, {
      attackId: id,
      attackKind: "player-melee",
      attackerId: snapshot.id,
      attackerKind: "player",
      facing: snapshot.facing,
      origin: { ...snapshot.position },
      damage: this.config.damage,
      startedAtMs: nowMs,
    });
  }

  private finishExpiredAttack(nowMs: number): void {
    if (this.activeAttack && this.isExpired(this.activeAttack, nowMs)) {
      this.endCurrentAttack();
    }
  }

  private endCurrentAttack(): void {
    if (this.activeAttack === null) return;
    this.damageSystem.endAttack(this.activeAttack.id);
    this.activeAttack = null;
  }

  private isDamageWindowActive(attack: ActiveAttack, nowMs: number): boolean {
    const elapsedMs = nowMs - attack.startedAtMs;
    return (
      elapsedMs >= this.config.activeFrameStart * this.frameDurationMs &&
      elapsedMs < (this.config.activeFrameEnd + 1) * this.frameDurationMs
    );
  }

  private isExpired(attack: ActiveAttack, nowMs: number): boolean {
    return (
      nowMs - attack.startedAtMs >=
      (this.config.activeFrameEnd + 1) * this.frameDurationMs
    );
  }

  private validateNow(nowMs: number): void {
    if (!Number.isFinite(nowMs)) throw new RangeError("nowMs must be finite");
  }
}
