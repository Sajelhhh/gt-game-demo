import Phaser from "phaser";

import type { Facing } from "../contracts/domain";
import type { PlayerState } from "../contracts/states";
import type { GameConfig } from "../game/config";
import { KeyboardPlayerInput, type PlayerInput } from "../input/PlayerInput";
import { PlayerController, type PlayerBody } from "./PlayerController";

export type PlayerVisual = Readonly<{
  widthPx: number;
  heightPx: number;
  color: number;
  textureKey: string;
  displayWidthPx: number;
  displayHeightPx: number;
  offsetYPx: number;
}>;

class ArcadePlayerBody implements PlayerBody {
  constructor(private readonly body: Phaser.Physics.Arcade.Body) {}

  get velocityX(): number {
    return this.body.velocity.x;
  }

  get velocityY(): number {
    return this.body.velocity.y;
  }

  get grounded(): boolean {
    return this.body.blocked.down || this.body.touching.down;
  }

  setVelocityX(value: number): void {
    this.body.setVelocityX(value);
  }

  setVelocityY(value: number): void {
    this.body.setVelocityY(value);
  }
}

/**
 * Asset-free player entity for the browser demo.
 * GameScene owns collider registration through `worldCollisionTarget`.
 */
export class Player extends Phaser.GameObjects.Rectangle {
  private readonly controller: PlayerController;
  private readonly characterImage: Phaser.GameObjects.Image;
  private readonly visualOffsetYPx: number;
  private facingValue: Facing = "right";

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    gameConfig: Readonly<GameConfig>,
    visual: PlayerVisual,
    input?: PlayerInput,
  ) {
    super(scene, x, y, visual.widthPx, visual.heightPx, visual.color, 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.visualOffsetYPx = visual.offsetYPx;
    this.characterImage = scene.add
      .image(x, y + visual.offsetYPx, visual.textureKey)
      .setDisplaySize(visual.displayWidthPx, visual.displayHeightPx)
      .setDepth(5);

    const arcadeBody = this.body;
    if (!(arcadeBody instanceof Phaser.Physics.Arcade.Body)) {
      throw new Error("Player requires an Arcade Physics body");
    }

    arcadeBody.setCollideWorldBounds(true);
    const playerInput = input ?? this.createKeyboardInput(scene, gameConfig);
    this.controller = new PlayerController(
      new ArcadePlayerBody(arcadeBody),
      playerInput,
      gameConfig.player,
    );
  }

  get locomotionState(): PlayerState {
    return this.controller.state;
  }

  get facing(): Facing {
    return this.facingValue;
  }

  /** Pass this to `physics.add.collider(player.worldCollisionTarget, world)`. */
  get worldCollisionTarget(): Phaser.Types.Physics.Arcade.ArcadeColliderType {
    return this;
  }

  update(nowMs: number, deltaMs: number): void {
    const previousX = this.x;
    this.controller.update(nowMs, deltaMs);
    const velocityX = this.arcadeBody.velocity.x;
    if (velocityX < 0) this.facingValue = "left";
    if (velocityX > 0) this.facingValue = "right";

    // Keep the branch observable for headless/manual adapters that update
    // position immediately rather than through Arcade's world step.
    if (this.x < previousX) this.facingValue = "left";
    if (this.x > previousX) this.facingValue = "right";
    this.updateVisual();
  }

  updateVisual(): void {
    this.characterImage
      .setPosition(this.x, this.y + this.visualOffsetYPx)
      .setFlipX(this.facingValue === "left");
  }

  setPresentationAlpha(alpha: number): void {
    this.characterImage.setAlpha(alpha);
  }

  setHurtVisual(hurt: boolean): void {
    if (hurt) {
      this.characterImage.setTint(0xff9b9b);
    } else {
      this.characterImage.clearTint();
    }
  }

  setCharacterVisible(visible: boolean): void {
    this.characterImage.setVisible(visible);
  }

  private get arcadeBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body;
  }

  private createKeyboardInput(
    scene: Phaser.Scene,
    gameConfig: Readonly<GameConfig>,
  ): PlayerInput {
    if (!scene.input.keyboard) {
      throw new Error("Player requires the Phaser Keyboard plugin");
    }
    return new KeyboardPlayerInput(scene.input.keyboard, gameConfig.input);
  }
}
