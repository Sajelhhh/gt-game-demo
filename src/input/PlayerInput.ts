import Phaser from "phaser";

import type { GameConfig } from "../game/config";

export type PlayerInputFrame = Readonly<{
  horizontal: -1 | 0 | 1;
  jumpHeld: boolean;
  jumpPressed: boolean;
  jumpReleased: boolean;
}>;

/** Narrow input port used by the player controller and its unit tests. */
export interface PlayerInput {
  read(): PlayerInputFrame;
}

const isDown = (keys: readonly Phaser.Input.Keyboard.Key[]): boolean =>
  keys.some((key) => key.isDown);

const wasPressed = (keys: readonly Phaser.Input.Keyboard.Key[]): boolean =>
  keys.some((key) => Phaser.Input.Keyboard.JustDown(key));

const wasReleased = (keys: readonly Phaser.Input.Keyboard.Key[]): boolean =>
  keys.some((key) => Phaser.Input.Keyboard.JustUp(key));

const createKeys = (
  keyboard: Phaser.Input.Keyboard.KeyboardPlugin,
  names: readonly string[],
): readonly Phaser.Input.Keyboard.Key[] =>
  names.map((name) => keyboard.addKey(name, false));

/** Phaser adapter. Key bindings come exclusively from GameConfig. */
export class KeyboardPlayerInput implements PlayerInput {
  private readonly left: readonly Phaser.Input.Keyboard.Key[];
  private readonly right: readonly Phaser.Input.Keyboard.Key[];
  private readonly jump: readonly Phaser.Input.Keyboard.Key[];

  constructor(
    keyboard: Phaser.Input.Keyboard.KeyboardPlugin,
    bindings: Readonly<GameConfig["input"]>,
  ) {
    this.left = createKeys(keyboard, bindings.left);
    this.right = createKeys(keyboard, bindings.right);
    this.jump = createKeys(keyboard, bindings.jump);
  }

  read(): PlayerInputFrame {
    const left = isDown(this.left);
    const right = isDown(this.right);

    return {
      horizontal: left === right ? 0 : left ? -1 : 1,
      jumpHeld: isDown(this.jump),
      jumpPressed: wasPressed(this.jump),
      jumpReleased: wasReleased(this.jump),
    };
  }
}
