import Phaser from "phaser";

import type { GameConfig } from "../game/config";

/** Edge-triggered input port consumed by PlayerCombat. */
export interface AttackInput {
  readAttackPressed(): boolean;
}

/** J/X keyboard adapter. Bindings remain owned by GameConfig. */
export class KeyboardAttackInput implements AttackInput {
  private readonly attackKeys: readonly Phaser.Input.Keyboard.Key[];

  constructor(
    keyboard: Phaser.Input.Keyboard.KeyboardPlugin,
    bindings: Readonly<GameConfig["input"]>,
  ) {
    this.attackKeys = bindings.attack.map((name) =>
      keyboard.addKey(name, false),
    );
  }

  readAttackPressed(): boolean {
    return this.attackKeys.some((key) => Phaser.Input.Keyboard.JustDown(key));
  }
}
