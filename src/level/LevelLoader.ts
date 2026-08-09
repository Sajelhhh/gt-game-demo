import Phaser from "phaser";

import { COLLISION_LAYER } from "../contracts/collision";
import type {
  CheckpointDefinition,
  GoalDefinition,
  HazardZone,
  LevelLayout,
  LevelPoint,
  LevelRectangle,
} from "./level01";

export const LEVEL_TRIGGER_LAYER = {
  CHECKPOINT: "Checkpoint",
  GOAL: "Goal",
} as const;

export const LEVEL_OBJECT_DATA = {
  ID: "levelObjectId",
  KIND: "levelObjectKind",
  RESPAWN_X: "respawnX",
  RESPAWN_Y: "respawnY",
} as const;

export type LoadedLevel = Readonly<{
  world: Phaser.Physics.Arcade.StaticGroup;
  hazards: Phaser.Physics.Arcade.StaticGroup;
  checkpoints: Phaser.Physics.Arcade.StaticGroup;
  goal: Phaser.Physics.Arcade.StaticGroup;
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

    const hazards = this.createHazards(layout.hazards);
    const checkpoints = this.createCheckpoints(layout.checkpoints);
    const goal = this.createGoal(layout.goal);

    return {
      world,
      hazards,
      checkpoints,
      goal,
      playerSpawn: layout.playerSpawn,
    };
  }

  private createHazards(
    definitions: readonly HazardZone[],
  ): Phaser.Physics.Arcade.StaticGroup {
    const group = this.scene.physics.add.staticGroup();
    group.name = COLLISION_LAYER.HAZARD;

    for (const hazard of definitions) {
      const trigger = this.createTrigger(hazard)
        .setData(LEVEL_OBJECT_DATA.KIND, hazard.kind)
        .setData("damage", hazard.damage);
      group.add(trigger);
      if (hazard.kind === "spike") this.drawSpikes(hazard);
      else this.drawPitWarning(hazard);
    }
    group.refresh();
    return group;
  }

  private createCheckpoints(
    definitions: readonly CheckpointDefinition[],
  ): Phaser.Physics.Arcade.StaticGroup {
    const group = this.scene.physics.add.staticGroup();
    group.name = LEVEL_TRIGGER_LAYER.CHECKPOINT;

    for (const checkpoint of definitions) {
      group.add(
        this.createTrigger(checkpoint)
          .setData(LEVEL_OBJECT_DATA.KIND, "checkpoint")
          .setData(LEVEL_OBJECT_DATA.RESPAWN_X, checkpoint.respawnPosition.x)
          .setData(LEVEL_OBJECT_DATA.RESPAWN_Y, checkpoint.respawnPosition.y),
      );
      this.drawCheckpoint(checkpoint);
    }
    group.refresh();
    return group;
  }

  private createGoal(
    definition: GoalDefinition,
  ): Phaser.Physics.Arcade.StaticGroup {
    const group = this.scene.physics.add.staticGroup();
    group.name = LEVEL_TRIGGER_LAYER.GOAL;
    group.add(
      this.createTrigger(definition).setData(LEVEL_OBJECT_DATA.KIND, "goal"),
    );
    group.refresh();
    this.drawGoal(definition);
    return group;
  }

  private createTrigger(
    definition: LevelRectangle,
  ): Phaser.GameObjects.Rectangle {
    return this.scene.add
      .rectangle(
        definition.x + definition.width / 2,
        definition.y + definition.height / 2,
        definition.width,
        definition.height,
      )
      .setName(definition.id)
      .setData(LEVEL_OBJECT_DATA.ID, definition.id)
      .setVisible(false);
  }

  private drawSpikes(hazard: HazardZone): void {
    const graphics = this.scene.add.graphics();
    const toothWidth = 20;
    graphics.fillStyle(0xcbd5e1, 1).lineStyle(2, 0x5b2333, 1);
    for (let x = hazard.x; x < hazard.x + hazard.width; x += toothWidth) {
      const right = Math.min(x + toothWidth, hazard.x + hazard.width);
      const tip = (x + right) / 2;
      graphics.fillTriangle(
        x,
        hazard.y + hazard.height,
        tip,
        hazard.y,
        right,
        hazard.y + hazard.height,
      );
      graphics.strokeTriangle(
        x,
        hazard.y + hazard.height,
        tip,
        hazard.y,
        right,
        hazard.y + hazard.height,
      );
    }
  }

  private drawPitWarning(hazard: HazardZone): void {
    const graphics = this.scene.add.graphics();
    graphics.lineStyle(4, 0x020617, 0.9);
    for (let x = hazard.x + 18; x < hazard.x + hazard.width; x += 34) {
      graphics.beginPath();
      graphics.moveTo(x - 9, hazard.y + 16);
      graphics.lineTo(x, hazard.y + 30);
      graphics.lineTo(x + 9, hazard.y + 16);
      graphics.strokePath();
    }
  }

  private drawCheckpoint(checkpoint: CheckpointDefinition): void {
    const graphics = this.scene.add.graphics();
    const poleX = checkpoint.x + checkpoint.width / 2;
    const bottomY = checkpoint.y + checkpoint.height;
    graphics
      .lineStyle(5, 0xe2e8f0, 1)
      .lineBetween(poleX, checkpoint.y, poleX, bottomY);
    graphics
      .fillStyle(0x93c5fd, 1)
      .fillTriangle(
        poleX + 2,
        checkpoint.y + 5,
        poleX + 58,
        checkpoint.y + 25,
        poleX + 2,
        checkpoint.y + 45,
      );
  }

  private drawGoal(goal: GoalDefinition): void {
    const graphics = this.scene.add.graphics();
    const centerX = goal.x + goal.width / 2;
    graphics.lineStyle(8, 0xfde68a, 1);
    graphics.strokeRoundedRect(goal.x, goal.y, goal.width, goal.height, 42);
    graphics
      .fillStyle(0xfde68a, 1)
      .fillTriangle(
        centerX,
        goal.y + 34,
        centerX + 14,
        goal.y + 52,
        centerX,
        goal.y + 70,
      )
      .fillTriangle(
        centerX,
        goal.y + 34,
        centerX - 14,
        goal.y + 52,
        centerX,
        goal.y + 70,
      );
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
