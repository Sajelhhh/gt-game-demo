import type {
  DamageRequest,
  DamageResult,
  Damageable,
  Vec2,
} from "../contracts/domain";
import type { HazardZone } from "../level/level01";
import type { CheckpointSystem } from "./CheckpointSystem";
import type { DamageSystem } from "./DamageSystem";

export const SPIKE_KNOCKBACK = {
  x: 180,
  y: -160,
} as const satisfies Vec2;

export type HazardInteractionRequest = Readonly<{
  hazard: HazardZone;
  target: Damageable;
  nowMs: number;
  relocate: (position: Vec2) => void;
}>;

export type HazardInteractionResult = Readonly<{
  damage: DamageResult;
  relocated: boolean;
  respawnPosition: Vec2 | null;
}>;

/**
 * Creates the shared DamageSystem request used by a Hazard/Player overlap.
 * Invulnerability is deliberately omitted so DamageSystem owns the configured
 * approximately 800 ms immunity window.
 */
export const createHazardDamageRequest = (
  hazard: HazardZone,
  target: Damageable,
  nowMs: number,
): DamageRequest => {
  const hazardCenterX = hazard.x + hazard.width / 2;
  const horizontalDirection = target.position.x < hazardCenterX ? -1 : 1;

  return {
    target,
    amount: hazard.damage,
    cause: hazard.kind,
    sourceId: hazard.id,
    attackId: null,
    knockbackVelocity:
      hazard.kind === "spike"
        ? {
            x: horizontalDirection * SPIKE_KNOCKBACK.x,
            y: SPIKE_KNOCKBACK.y,
          }
        : { x: 0, y: 0 },
    nowMs,
  };
};

/** Applies hazard damage and performs the surviving pit reset atomically. */
export class HazardInteraction {
  constructor(
    private readonly damageSystem: DamageSystem,
    private readonly checkpointSystem: CheckpointSystem,
  ) {}

  handle(request: HazardInteractionRequest): HazardInteractionResult {
    const damage = this.damageSystem.applyDamage(
      createHazardDamageRequest(request.hazard, request.target, request.nowMs),
    );

    if (request.hazard.kind !== "pit" || !request.target.isAlive()) {
      return { damage, relocated: false, respawnPosition: null };
    }

    const respawnPosition = this.checkpointSystem.respawnPosition;
    request.relocate(respawnPosition);
    return { damage, relocated: true, respawnPosition };
  }
}
