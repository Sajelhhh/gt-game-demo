export type JumpMotion = Readonly<{
  moveSpeedPxPerSecond: number;
  jumpSpeedPxPerSecond: number;
  gravityYPxPerSecondSquared: number;
  airJumps: number;
}>;

export type JumpEnvelope = Readonly<{
  baseJumpAirtimeSeconds: number;
  baseJumpDistancePx: number;
  apexChainedDistancePx: number;
  maximumDistancePx: number;
  maximumRisePx: number;
}>;

/**
 * Ideal full-speed limits used to reject authored traversals that are
 * mathematically impossible. Gameplay keeps additional safety margin below
 * these limits for imperfect timing and acceleration.
 */
export const calculateJumpEnvelope = (motion: JumpMotion): JumpEnvelope => {
  const airtime =
    (2 * motion.jumpSpeedPxPerSecond) / motion.gravityYPxPerSecondSquared;
  const baseDistance = airtime * motion.moveSpeedPxPerSecond;
  const jumpCount = motion.airJumps + 1;
  const ascentSeconds =
    (jumpCount * motion.jumpSpeedPxPerSecond) /
    motion.gravityYPxPerSecondSquared;
  const descentSeconds =
    (Math.sqrt(jumpCount) * motion.jumpSpeedPxPerSecond) /
    motion.gravityYPxPerSecondSquared;

  return {
    baseJumpAirtimeSeconds: airtime,
    baseJumpDistancePx: baseDistance,
    apexChainedDistancePx:
      (ascentSeconds + descentSeconds) * motion.moveSpeedPxPerSecond,
    maximumDistancePx: baseDistance * jumpCount,
    maximumRisePx:
      (jumpCount * motion.jumpSpeedPxPerSecond ** 2) /
      (2 * motion.gravityYPxPerSecondSquared),
  };
};

/**
 * Maximum obstacle width clearable while the player's full body stays above
 * a raised trigger. This is stricter than ground-to-ground jump distance.
 */
export const calculateBaseJumpHazardLimitPx = (
  motion: JumpMotion,
  requiredRisePx: number,
  playerWidthPx: number,
): number => {
  const discriminant =
    motion.jumpSpeedPxPerSecond ** 2 -
    2 * motion.gravityYPxPerSecondSquared * requiredRisePx;
  if (discriminant <= 0) return 0;

  const safeWindowSeconds =
    (2 * Math.sqrt(discriminant)) / motion.gravityYPxPerSecondSquared;
  return Math.max(
    0,
    safeWindowSeconds * motion.moveSpeedPxPerSecond - playerWidthPx,
  );
};
