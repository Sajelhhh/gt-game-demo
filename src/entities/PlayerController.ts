import type { PlayerState } from "../contracts/states";
import { PLAYER_STATE, createPlayerStateMachine } from "../contracts/states";
import type { GameConfig } from "../game/config";
import type { PlayerInput, PlayerInputFrame } from "../input/PlayerInput";

export interface PlayerBody {
  readonly velocityX: number;
  readonly velocityY: number;
  readonly grounded: boolean;
  setVelocityX(value: number): void;
  setVelocityY(value: number): void;
}

const moveTowards = (
  current: number,
  target: number,
  maxDelta: number,
): number =>
  current < target
    ? Math.min(current + maxDelta, target)
    : Math.max(current - maxDelta, target);

/** Pure movement/state controller; Phaser is kept behind PlayerBody. */
export class PlayerController {
  private readonly stateMachine = createPlayerStateMachine();
  private lastGroundedAtMs = Number.NEGATIVE_INFINITY;
  private jumpRequestedAtMs = Number.NEGATIVE_INFINITY;
  private remainingAirJumps: number;

  constructor(
    private readonly body: PlayerBody,
    private readonly input: PlayerInput,
    private readonly config: Readonly<GameConfig["player"]>,
  ) {
    this.remainingAirJumps = config.airJumps;
  }

  get state(): PlayerState {
    return this.stateMachine.state;
  }

  update(nowMs: number, deltaMs: number): void {
    const frame = this.input.read();
    const deltaSeconds = Math.max(0, deltaMs) / 1000;

    if (this.body.grounded) {
      this.lastGroundedAtMs = nowMs;
      this.remainingAirJumps = this.config.airJumps;
    }
    if (frame.jumpPressed) this.jumpRequestedAtMs = nowMs;

    this.updateHorizontal(frame, deltaSeconds);

    const canUseCoyoteTime =
      nowMs - this.lastGroundedAtMs <= this.config.coyoteTimeMs;
    const hasBufferedJump =
      nowMs - this.jumpRequestedAtMs <= this.config.jumpBufferTimeMs;

    const usedGroundJump = canUseCoyoteTime && hasBufferedJump;
    const usedAirJump =
      !canUseCoyoteTime &&
      hasBufferedJump &&
      frame.jumpPressed &&
      this.remainingAirJumps > 0;
    const jumped = usedGroundJump || usedAirJump;
    if (jumped) {
      this.body.setVelocityY(-this.config.jumpSpeedPxPerSecond);
      if (usedAirJump) this.remainingAirJumps -= 1;
      this.lastGroundedAtMs = Number.NEGATIVE_INFINITY;
      this.jumpRequestedAtMs = Number.NEGATIVE_INFINITY;
    } else if (frame.jumpReleased && this.body.velocityY < 0) {
      this.body.setVelocityY(
        this.body.velocityY * this.config.releasedJumpVelocityFactor,
      );
    }

    this.resolveLocomotionState(jumped);
  }

  private updateHorizontal(
    frame: PlayerInputFrame,
    deltaSeconds: number,
  ): void {
    const target = frame.horizontal * this.config.moveSpeedPxPerSecond;
    const rate =
      frame.horizontal === 0 && this.body.grounded
        ? this.config.groundDragPxPerSecondSquared
        : this.config.accelerationPxPerSecondSquared;

    this.body.setVelocityX(
      moveTowards(this.body.velocityX, target, rate * deltaSeconds),
    );
  }

  private resolveLocomotionState(jumped: boolean): void {
    const next =
      jumped || !this.body.grounded
        ? this.body.velocityY < 0
          ? PLAYER_STATE.JUMP
          : PLAYER_STATE.FALL
        : this.body.velocityX === 0
          ? PLAYER_STATE.IDLE
          : PLAYER_STATE.RUN;

    if (next === this.stateMachine.state) return;

    // The shared strict graph deliberately excludes jump -> grounded and
    // fall -> jump edges. Walk through a legal locomotion state when a frame
    // crosses either boundary (including buffered and coyote jumps).
    if (
      this.stateMachine.state === PLAYER_STATE.JUMP &&
      (next === PLAYER_STATE.IDLE || next === PLAYER_STATE.RUN)
    ) {
      this.stateMachine.transition(PLAYER_STATE.FALL);
    } else if (
      this.stateMachine.state === PLAYER_STATE.FALL &&
      next === PLAYER_STATE.JUMP
    ) {
      this.stateMachine.transition(PLAYER_STATE.IDLE);
    }

    this.stateMachine.transition(next);
  }
}
