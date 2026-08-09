import Phaser from "phaser";

import { ENEMY_STATE } from "../../contracts/states";
import type { Damageable, DamageRequest } from "../../contracts/domain";
import type { GameConfig } from "../../game/config";
import { BaseEnemy, type EnemySpawn } from "./BaseEnemy";

export type PatrolEnemySpawn = EnemySpawn &
  Readonly<{
    patrolLeftXPx: number;
    patrolRightXPx: number;
    initialDirection?: -1 | 1;
  }>;

export class PatrolEnemy extends BaseEnemy {
  readonly kind = "patrol-enemy" as const;
  private direction: -1 | 1;

  constructor(
    scene: Phaser.Scene,
    private readonly spawnOptions: PatrolEnemySpawn,
    gameConfig: Readonly<GameConfig>,
  ) {
    super(scene, spawnOptions, gameConfig.enemies.patrol.maxHealth, gameConfig);
    if (spawnOptions.patrolLeftXPx >= spawnOptions.patrolRightXPx) {
      throw new RangeError("patrolLeftXPx must be less than patrolRightXPx");
    }
    this.direction = spawnOptions.initialDirection ?? -1;
    this.facingValue = this.direction < 0 ? "left" : "right";
    this.stateMachine.transition(ENEMY_STATE.PATROL);
  }

  update(): void {
    if (!this.isAlive()) return;
    this.recoverFromHurt(ENEMY_STATE.PATROL);

    const body = this.arcadeBody;
    if (
      this.x <= this.spawnOptions.patrolLeftXPx ||
      body.blocked.left ||
      body.touching.left
    ) {
      this.direction = 1;
    } else if (
      this.x >= this.spawnOptions.patrolRightXPx ||
      body.blocked.right ||
      body.touching.right
    ) {
      this.direction = -1;
    }

    const velocityX =
      this.direction * this.gameConfig.enemies.patrol.moveSpeedPxPerSecond;
    body.setVelocityX(velocityX);
    this.faceVelocity(velocityX);
  }

  createContactDamageRequest(target: Damageable, nowMs: number): DamageRequest {
    return super.createContactDamageRequest(
      target,
      nowMs,
      this.gameConfig.enemies.patrol.contactDamage,
    );
  }
}
