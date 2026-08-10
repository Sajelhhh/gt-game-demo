import type { EntityId } from "../contracts/domain";

/** Per-enemy clash protection; attacking one target never grants global armor. */
export class ContactGuard {
  private readonly guardedUntilByTarget = new Map<EntityId, number>();

  grant(targetId: EntityId, nowMs: number, durationMs: number): void {
    if (!Number.isFinite(nowMs) || !Number.isFinite(durationMs)) {
      throw new RangeError("contact guard timing must be finite");
    }
    if (durationMs < 0) {
      throw new RangeError("contact guard duration must be non-negative");
    }

    const untilMs = nowMs + durationMs;
    this.guardedUntilByTarget.set(
      targetId,
      Math.max(this.guardedUntilByTarget.get(targetId) ?? 0, untilMs),
    );
  }

  protectsAgainst(targetId: EntityId, nowMs: number): boolean {
    const untilMs = this.guardedUntilByTarget.get(targetId);
    if (untilMs === undefined) return false;
    if (nowMs < untilMs) return true;
    this.guardedUntilByTarget.delete(targetId);
    return false;
  }

  clear(): void {
    this.guardedUntilByTarget.clear();
  }
}
