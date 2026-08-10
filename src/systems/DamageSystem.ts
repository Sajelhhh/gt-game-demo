import type {
  DamageRequest,
  DamageResult,
  Damageable,
  HealthChangeCause,
} from "../contracts/domain";
import { GAME_EVENT, type TypedEventBus } from "../contracts/events";
import { DEFAULT_GAME_CONFIG } from "../game/config";

export class DamageSystem {
  private readonly hitTargetsByAttack = new Map<string, Set<string>>();

  constructor(
    private readonly eventBus: TypedEventBus,
    private readonly defaultInvulnerabilityMs: number = DEFAULT_GAME_CONFIG
      .player.invulnerabilityMs,
  ) {
    if (
      !Number.isFinite(defaultInvulnerabilityMs) ||
      defaultInvulnerabilityMs < 0
    ) {
      throw new RangeError(
        "defaultInvulnerabilityMs must be a finite, non-negative number",
      );
    }
  }

  applyDamage(request: DamageRequest): DamageResult {
    const {
      target,
      cause,
      knockbackVelocity,
      nowMs,
      sourceId = null,
      attackId = null,
      invulnerabilityMs = this.defaultInvulnerabilityMs,
    } = request;

    this.validateRequest(request.amount, nowMs, invulnerabilityMs);

    if (request.amount === 0) {
      return { applied: false, reason: "zero-damage" };
    }
    if (!target.isAlive()) {
      return { applied: false, reason: "dead" };
    }
    if (target.isInvulnerable(nowMs)) {
      return { applied: false, reason: "invulnerable" };
    }
    if (attackId !== null && this.hasHitTarget(attackId, target.id)) {
      return { applied: false, reason: "duplicate-attack" };
    }

    const change = target.commitDamage(request.amount);
    if (change.appliedDamage === 0) {
      return { applied: false, reason: "zero-damage" };
    }

    if (attackId !== null) this.rememberHit(attackId, target.id);
    target.applyKnockback({ ...knockbackVelocity });
    target.grantInvulnerability(nowMs + invulnerabilityMs, nowMs);

    this.eventBus.emit(GAME_EVENT.DAMAGE_APPLIED, {
      targetId: target.id,
      targetKind: target.kind,
      sourceId,
      cause,
      attackId,
      amount: change.appliedDamage,
      remainingHealth: change.currentHealth,
      knockbackVelocity: { ...knockbackVelocity },
      appliedAtMs: nowMs,
    });
    this.eventBus.emit(GAME_EVENT.HEALTH_CHANGED, {
      entityId: target.id,
      entityKind: target.kind,
      previousHealth: change.previousHealth,
      currentHealth: change.currentHealth,
      maxHealth: change.maxHealth,
      delta: -change.appliedDamage,
      cause,
    });

    const killed = change.currentHealth === 0;
    if (killed) {
      target.enterDeadState();
      this.eventBus.emit(GAME_EVENT.ENTITY_DIED, {
        entityId: target.id,
        entityKind: target.kind,
        sourceId,
        cause,
        position: { ...target.position },
        diedAtMs: nowMs,
      });
    } else {
      target.enterHurtState();
    }

    return { applied: true, change, killed };
  }

  announceHealth(
    target: Damageable,
    cause: Extract<HealthChangeCause, "spawn" | "respawn">,
  ): void {
    const health = target.getHealth();
    this.eventBus.emit(GAME_EVENT.HEALTH_CHANGED, {
      entityId: target.id,
      entityKind: target.kind,
      previousHealth: health.currentHealth,
      currentHealth: health.currentHealth,
      maxHealth: health.maxHealth,
      delta: 0,
      cause,
    });
  }

  endAttack(attackId: string): void {
    this.hitTargetsByAttack.delete(attackId);
  }

  clear(): void {
    this.hitTargetsByAttack.clear();
  }

  private hasHitTarget(attackId: string, targetId: string): boolean {
    return this.hitTargetsByAttack.get(attackId)?.has(targetId) ?? false;
  }

  private rememberHit(attackId: string, targetId: string): void {
    const targets = this.hitTargetsByAttack.get(attackId) ?? new Set<string>();
    targets.add(targetId);
    this.hitTargetsByAttack.set(attackId, targets);
  }

  private validateRequest(
    amount: number,
    nowMs: number,
    invulnerabilityMs: number,
  ): void {
    if (!Number.isFinite(amount) || amount < 0) {
      throw new RangeError("damage amount must be finite and non-negative");
    }
    if (!Number.isFinite(nowMs)) {
      throw new RangeError("nowMs must be finite");
    }
    if (!Number.isFinite(invulnerabilityMs) || invulnerabilityMs < 0) {
      throw new RangeError(
        "invulnerabilityMs must be a finite, non-negative number",
      );
    }
  }
}
