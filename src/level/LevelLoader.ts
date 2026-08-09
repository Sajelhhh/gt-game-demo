import Phaser from "phaser";

import { COLLISION_LAYER } from "../contracts/collision";
import type { LevelLayout, LevelPoint } from "./level01";

export type LoadedLevel = Readonly<{
  world: Phaser.Physics.Arcade.StaticGroup;
  playerSpawn: LevelPoint;
}>;

const GEOMETRY_COLOR = {
  ground: 0x263750,
  platform: 0x3f5870,
  wall: 0x263750,
} as const;

export class LevelLoader {
  constructor(private readonly scene: Phaser.Scene) {}

  load(layout: LevelLayout): LoadedLevel {
    this.configureBounds(layout);
    this.createBackdrop(layout);

    const world = this.scene.physics.add.staticGroup();
    world.name = COLLISION_LAYER.WORLD;

    for (const geometry of layout.world) {
      const block = this.scene.add
        .rectangle(
          geometry.x + geometry.width / 2,
          geometry.y + geometry.height / 2,
          geometry.width,
          geometry.height,
          GEOMETRY_COLOR[geometry.kind],
        )
        .setName(geometry.id)
        .setStrokeStyle(2, 0x78966b, 0.75);

      world.add(block);
    }
    world.refresh();

    return { world, playerSpawn: layout.playerSpawn };
  }

  private configureBounds(layout: LevelLayout): void {
    const { width, height } = layout.bounds;
    this.scene.physics.world.setBounds(0, 0, width, height);
    this.scene.cameras.main.setBounds(0, 0, width, height);
    this.scene.cameras.main.setScroll(0, 0);
  }

  private createBackdrop(layout: LevelLayout): void {
    const { width, height } = layout.bounds;
    this.scene.add
      .rectangle(width / 2, height / 2, width, height, 0x182033)
      .setDepth(-100);

    // Broad silhouettes give the generated demo some depth without assets.
    const scenery = this.scene.add.graphics().setDepth(-90);
    scenery.fillStyle(0x202b43, 1);
    for (let x = 200; x < width; x += 520) {
      scenery.fillTriangle(x, height - 80, x + 210, 170, x + 430, height - 80);
    }
    scenery.fillStyle(0x111827, 0.55).fillRect(0, height - 96, width, 96);
  }
}
