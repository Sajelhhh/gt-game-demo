import { describe, expect, it } from "vitest";

import { PLAYER_STATE } from "../../src/contracts/states";
import {
  PlayerController,
  type PlayerBody,
} from "../../src/entities/PlayerController";
import { DEFAULT_GAME_CONFIG } from "../../src/game/config";
import type {
  PlayerInput,
  PlayerInputFrame,
} from "../../src/input/PlayerInput";

const neutralInput: PlayerInputFrame = {
  horizontal: 0,
  jumpHeld: false,
  jumpPressed: false,
  jumpReleased: false,
};

class FakeInput implements PlayerInput {
  frame = neutralInput;

  read(): PlayerInputFrame {
    return this.frame;
  }
}

class FakeBody implements PlayerBody {
  velocityX = 0;
  velocityY = 0;
  grounded = true;

  setVelocityX(value: number): void {
    this.velocityX = value;
  }

  setVelocityY(value: number): void {
    this.velocityY = value;
  }
}

const setup = (
  config: Readonly<
    (typeof DEFAULT_GAME_CONFIG)["player"]
  > = DEFAULT_GAME_CONFIG.player,
) => {
  const body = new FakeBody();
  const input = new FakeInput();
  const controller = new PlayerController(body, input, config);
  return { body, input, controller };
};

describe("PlayerController", () => {
  it("accelerates, clamps to move speed, and uses ground drag", () => {
    const { body, input, controller } = setup();
    input.frame = { ...neutralInput, horizontal: 1 };

    controller.update(0, 100);
    expect(body.velocityX).toBe(160);
    expect(controller.state).toBe(PLAYER_STATE.RUN);
    controller.update(100, 100);
    expect(body.velocityX).toBe(
      DEFAULT_GAME_CONFIG.player.moveSpeedPxPerSecond,
    );

    input.frame = neutralInput;
    controller.update(200, 100);
    expect(body.velocityX).toBe(40);
    controller.update(300, 100);
    expect(body.velocityX).toBe(0);
    expect(controller.state).toBe(PLAYER_STATE.IDLE);
  });

  it("jumps during coyote time and shortens the jump on release", () => {
    const { body, input, controller } = setup();
    controller.update(0, 16);
    body.grounded = false;
    body.velocityY = 1;
    input.frame = { ...neutralInput, jumpPressed: true, jumpHeld: true };

    controller.update(DEFAULT_GAME_CONFIG.player.coyoteTimeMs, 16);
    expect(body.velocityY).toBe(
      -DEFAULT_GAME_CONFIG.player.jumpSpeedPxPerSecond,
    );
    expect(controller.state).toBe(PLAYER_STATE.JUMP);

    input.frame = { ...neutralInput, jumpReleased: true };
    controller.update(116, 16);
    expect(body.velocityY).toBe(
      -DEFAULT_GAME_CONFIG.player.jumpSpeedPxPerSecond *
        DEFAULT_GAME_CONFIG.player.releasedJumpVelocityFactor,
    );
  });

  it("consumes a buffered jump when the player lands", () => {
    const { body, input, controller } = setup({
      ...DEFAULT_GAME_CONFIG.player,
      airJumps: 0,
    });
    body.grounded = false;
    body.velocityY = 100;
    input.frame = { ...neutralInput, jumpPressed: true };
    controller.update(0, 16);
    expect(controller.state).toBe(PLAYER_STATE.FALL);

    input.frame = neutralInput;
    controller.update(DEFAULT_GAME_CONFIG.player.jumpBufferTimeMs - 1, 16);
    expect(body.velocityY).toBe(100);

    body.grounded = true;
    controller.update(DEFAULT_GAME_CONFIG.player.jumpBufferTimeMs, 16);
    expect(body.velocityY).toBe(
      -DEFAULT_GAME_CONFIG.player.jumpSpeedPxPerSecond,
    );
    expect(controller.state).toBe(PLAYER_STATE.JUMP);
  });

  it("allows exactly one air jump and resets it after landing", () => {
    const { body, input, controller } = setup();
    controller.update(0, 16);

    input.frame = { ...neutralInput, jumpPressed: true };
    controller.update(16, 16);
    expect(body.velocityY).toBe(
      -DEFAULT_GAME_CONFIG.player.jumpSpeedPxPerSecond,
    );

    body.grounded = false;
    body.velocityY = 120;
    input.frame = neutralInput;
    controller.update(32, 16);
    input.frame = { ...neutralInput, jumpPressed: true };
    controller.update(48, 16);
    expect(body.velocityY).toBe(
      -DEFAULT_GAME_CONFIG.player.jumpSpeedPxPerSecond,
    );

    body.velocityY = 120;
    input.frame = neutralInput;
    controller.update(64, 16);
    input.frame = { ...neutralInput, jumpPressed: true };
    controller.update(80, 16);
    expect(body.velocityY).toBe(120);

    body.grounded = true;
    input.frame = neutralInput;
    controller.update(200, 16);
    body.grounded = false;
    body.velocityY = 120;
    input.frame = { ...neutralInput, jumpPressed: true };
    controller.update(400, 16);
    expect(body.velocityY).toBe(
      -DEFAULT_GAME_CONFIG.player.jumpSpeedPxPerSecond,
    );
  });

  it("expires coyote time and the input buffer", () => {
    const { body, input, controller } = setup({
      ...DEFAULT_GAME_CONFIG.player,
      airJumps: 0,
    });
    controller.update(0, 16);
    body.grounded = false;
    body.velocityY = 20;
    input.frame = { ...neutralInput, jumpPressed: true };
    controller.update(DEFAULT_GAME_CONFIG.player.coyoteTimeMs + 1, 16);
    expect(body.velocityY).toBe(20);

    input.frame = neutralInput;
    body.grounded = true;
    controller.update(
      DEFAULT_GAME_CONFIG.player.coyoteTimeMs +
        DEFAULT_GAME_CONFIG.player.jumpBufferTimeMs +
        2,
      16,
    );
    expect(body.velocityY).toBe(20);
  });
});
