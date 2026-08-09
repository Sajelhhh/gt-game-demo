import type { Facing, Vec2 } from "../contracts/domain";

/** Centre-based axis-aligned bounds, matching Phaser rectangle positioning. */
export type HitBounds = Readonly<{
  center: Vec2;
  widthPx: number;
  heightPx: number;
}>;

export type AttackHitboxConfig = Readonly<{
  offsetXPx: number;
  widthPx: number;
  heightPx: number;
}>;

/** Pure geometry used by both Arcade overlap adapters and unit tests. */
export class AttackHitbox {
  static fromOrigin(
    origin: Vec2,
    facing: Facing,
    config: AttackHitboxConfig,
  ): HitBounds {
    return {
      center: {
        x: origin.x + (facing === "right" ? 1 : -1) * config.offsetXPx,
        y: origin.y,
      },
      widthPx: config.widthPx,
      heightPx: config.heightPx,
    };
  }

  static overlaps(left: HitBounds, right: HitBounds): boolean {
    const horizontalDistance = Math.abs(left.center.x - right.center.x);
    const verticalDistance = Math.abs(left.center.y - right.center.y);

    return (
      horizontalDistance <= (left.widthPx + right.widthPx) / 2 &&
      verticalDistance <= (left.heightPx + right.heightPx) / 2
    );
  }
}
