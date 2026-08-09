import Phaser from "phaser";

import { PlayerCombat, type AttackPresentation } from "../combat/PlayerCombat";
import {
  GAME_EVENT,
  type TypedEventBus,
  type Unsubscribe,
} from "../contracts/events";
import type { Damageable, EntityKind, Vec2 } from "../contracts/domain";
import {
  GAME_FLOW_STATE,
  createGameFlowStateMachine,
  type StrictStateMachine,
  type GameFlowState,
} from "../contracts/states";
import { Player } from "../entities/Player";
import { ChaseEnemy, PatrolEnemy } from "../entities/enemies";
import type { GameConfig } from "../game/config";
import { CHARACTER_TEXTURE } from "../game/assets";
import { KeyboardAttackInput } from "../input/AttackInput";
import { LEVEL_01, validateLevelLayout } from "../level/level01";
import {
  LEVEL_OBJECT_DATA,
  LevelLoader,
  type LoadedLevel,
} from "../level/LevelLoader";
import { CheckpointSystem } from "../systems/CheckpointSystem";
import { DamageSystem } from "../systems/DamageSystem";
import { HazardInteraction } from "../systems/HazardInteraction";
import { PlayerDamageAdapter } from "./integration/PlayerDamageAdapter";
import { SCENE_KEY } from "./keys";

type RestartData = Readonly<{ playerSpawn?: Vec2 }>;

const PLAYER_VISUAL = {
  widthPx: 32,
  heightPx: 48,
  color: 0xa7f3d0,
  textureKey: CHARACTER_TEXTURE.PLAYER,
  displayWidthPx: 48,
  displayHeightPx: 58,
  offsetYPx: 2,
} as const;

const PATROL_VISUAL = {
  widthPx: 38,
  heightPx: 34,
  color: 0xfbbf24,
  textureKey: CHARACTER_TEXTURE.PATROL_ENEMY,
  displayWidthPx: 56,
  displayHeightPx: 42,
  offsetYPx: -2,
} as const;

const CHASE_VISUAL = {
  widthPx: 42,
  heightPx: 42,
  color: 0xc084fc,
  textureKey: CHARACTER_TEXTURE.CHASE_ENEMY,
  displayWidthPx: 62,
  displayHeightPx: 48,
  offsetYPx: -3,
} as const;

const ENEMY_SPAWNS = [
  {
    kind: "patrol",
    id: "patrol-1",
    x: 1_720,
    y: 590,
    left: 1_560,
    right: 1_980,
  },
  {
    kind: "patrol",
    id: "patrol-2",
    x: 2_220,
    y: 590,
    left: 2_020,
    right: 2_390,
  },
  { kind: "chase", id: "chase-1", x: 2_700, y: 580 },
  {
    kind: "patrol",
    id: "patrol-3",
    x: 3_520,
    y: 590,
    left: 3_300,
    right: 3_760,
  },
  { kind: "chase", id: "chase-2", x: 4_120, y: 580 },
] as const;

export class GameScene extends Phaser.Scene {
  private readonly unsubscribe: Unsubscribe[] = [];
  private flow!: StrictStateMachine<GameFlowState>;
  private player!: Player;
  private playerDamage!: PlayerDamageAdapter;
  private enemies: Array<PatrolEnemy | ChaseEnemy> = [];
  private chaseEnemies: ChaseEnemy[] = [];
  private damageSystem!: DamageSystem;
  private checkpointSystem!: CheckpointSystem;
  private hazardInteraction!: HazardInteraction;
  private playerCombat!: PlayerCombat;
  private attackFlash!: Phaser.GameObjects.Rectangle;
  private lastShockwaveAttackId: string | null = null;
  private gameplayElapsedMs = 0;
  private defeatedEnemyCount = 0;
  public worldLayer!: Phaser.Physics.Arcade.StaticGroup;

  constructor(
    private readonly gameConfig: Readonly<GameConfig>,
    private readonly eventBus: TypedEventBus,
  ) {
    super(SCENE_KEY.GAME);
  }

  create(data: RestartData = {}): void {
    this.flow = createGameFlowStateMachine();
    this.flow.transition(GAME_FLOW_STATE.PLAYING);
    this.physics.world.resume();
    this.anims.resumeAll();
    this.gameplayElapsedMs = 0;
    this.defeatedEnemyCount = 0;
    this.lastShockwaveAttackId = null;
    this.enemies = [];
    this.chaseEnemies = [];
    document.querySelector("#game")?.setAttribute("data-scene", "game");

    const level = this.createLevel();
    this.createGameplay(level, data.playerSpawn ?? level.playerSpawn);
    this.registerLifecycleListeners();

    if (!this.scene.isActive(SCENE_KEY.UI)) {
      this.scene.launch(SCENE_KEY.UI);
    }
  }

  update(_timeMs: number, deltaMs: number): void {
    if (this.flow.state !== GAME_FLOW_STATE.PLAYING) return;

    this.gameplayElapsedMs += Math.max(0, deltaMs);
    const nowMs = this.gameplayElapsedMs;

    if (!this.playerDamage.isControlLocked(nowMs)) {
      this.player.update(nowMs, deltaMs);
    }
    this.playerDamage.updatePresentation(nowMs);
    this.player.updateVisual();

    for (const enemy of this.enemies) {
      if (enemy instanceof PatrolEnemy) enemy.update();
    }
    for (const enemy of this.chaseEnemies) {
      enemy.update(
        { id: this.playerDamage.id, position: this.playerDamage.position },
        nowMs,
      );
      this.tryChaseAttack(enemy, nowMs);
    }
    for (const enemy of this.enemies) enemy.updateVisual();

    const attack = this.playerCombat.update(nowMs, {
      id: this.playerDamage.id,
      position: this.playerDamage.position,
      facing: this.player.facing,
    });
    this.updateAttackFlash(attack);
    if (attack?.active) this.resolvePlayerAttack(nowMs);
  }

  private createLevel(): LoadedLevel {
    const { widthPx, heightPx } = this.gameConfig.render;
    const errors = validateLevelLayout(LEVEL_01, {
      width: widthPx,
      height: heightPx,
    });
    if (errors.length > 0) {
      throw new Error(`Invalid ${LEVEL_01.id}: ${errors.join("; ")}`);
    }

    const level = new LevelLoader(this).load(LEVEL_01);
    this.worldLayer = level.world;

    this.add
      .text(100, 120, "A / D 移动 · SPACE 二段跳 · J 攻击", {
        color: "#c8d4b8",
        fontFamily: "system-ui, sans-serif",
        fontSize: "25px",
      })
      .setDepth(10);

    return level;
  }

  private createGameplay(level: LoadedLevel, spawn: Vec2): void {
    this.damageSystem = new DamageSystem(
      this.eventBus,
      this.gameConfig.player.invulnerabilityMs,
    );
    this.checkpointSystem = new CheckpointSystem(this.eventBus, spawn);
    this.hazardInteraction = new HazardInteraction(
      this.damageSystem,
      this.checkpointSystem,
    );

    this.player = new Player(
      this,
      spawn.x,
      spawn.y,
      this.gameConfig,
      PLAYER_VISUAL,
    );
    this.player.setDepth(5);
    this.playerDamage = new PlayerDamageAdapter(
      this.player,
      this.gameConfig.player,
    );
    this.damageSystem.announceHealth(this.playerDamage, "spawn");

    if (!this.input.keyboard) {
      throw new Error("GameScene requires the Phaser Keyboard plugin");
    }
    this.playerCombat = new PlayerCombat(
      new KeyboardAttackInput(this.input.keyboard, this.gameConfig.input),
      this.damageSystem,
      this.eventBus,
      this.gameConfig.combat.playerMelee,
    );
    this.attackFlash = this.add
      .rectangle(0, 0, 1, 1, 0xf8fafc, 0.7)
      .setDepth(6)
      .setVisible(false);

    this.physics.add.collider(this.player.worldCollisionTarget, level.world);
    this.createEnemies(level.world);
    this.registerLevelInteractions(level);

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setDeadzone(300, 180);
  }

  private createEnemies(world: Phaser.Physics.Arcade.StaticGroup): void {
    for (const spawn of ENEMY_SPAWNS) {
      const enemy =
        spawn.kind === "patrol"
          ? new PatrolEnemy(
              this,
              {
                id: spawn.id,
                x: spawn.x,
                y: spawn.y,
                visual: PATROL_VISUAL,
                patrolLeftXPx: spawn.left,
                patrolRightXPx: spawn.right,
              },
              this.gameConfig,
            )
          : new ChaseEnemy(
              this,
              {
                id: spawn.id,
                x: spawn.x,
                y: spawn.y,
                visual: CHASE_VISUAL,
              },
              this.gameConfig,
            );

      enemy.setDepth(4);
      this.enemies.push(enemy);
      if (enemy instanceof ChaseEnemy) this.chaseEnemies.push(enemy);
      this.damageSystem.announceHealth(enemy, "spawn");
      this.physics.add.collider(enemy.worldCollisionTarget, world);
      this.physics.add.overlap(
        this.player.worldCollisionTarget,
        enemy.contactCollisionTarget,
        () => this.handleEnemyContact(enemy),
      );
    }
  }

  private registerLevelInteractions(level: LoadedLevel): void {
    const hazardById = new Map(LEVEL_01.hazards.map((item) => [item.id, item]));
    const checkpointById = new Map(
      LEVEL_01.checkpoints.map((item) => [item.id, item]),
    );

    this.physics.add.overlap(this.player, level.hazards, (_player, object) => {
      const trigger = this.getGameObject(object);
      const id = trigger.getData(LEVEL_OBJECT_DATA.ID) as string;
      const hazard = hazardById.get(id);
      if (!hazard || !this.playerDamage.isAlive()) return;

      this.hazardInteraction.handle({
        hazard,
        target: this.playerDamage,
        nowMs: this.gameplayElapsedMs,
        relocate: (position) => this.playerDamage.relocate(position),
      });
    });

    this.physics.add.overlap(
      this.player,
      level.checkpoints,
      (_player, object) => {
        const trigger = this.getGameObject(object);
        const id = trigger.getData(LEVEL_OBJECT_DATA.ID) as string;
        const checkpoint = checkpointById.get(id);
        if (!checkpoint) return;

        this.checkpointSystem.reach(
          this.playerDamage.id,
          checkpoint,
          this.gameplayElapsedMs,
        );
      },
    );

    this.physics.add.overlap(this.player, level.goal, () => {
      this.completeLevel();
    });
  }

  private resolvePlayerAttack(nowMs: number): void {
    for (const enemy of this.enemies) {
      if (!enemy.isAlive()) continue;
      this.playerCombat.tryHit(enemy, this.getDamageableBounds(enemy), nowMs);
    }
  }

  private handleEnemyContact(enemy: PatrolEnemy | ChaseEnemy): void {
    if (
      this.flow.state !== GAME_FLOW_STATE.PLAYING ||
      !enemy.isAlive() ||
      !this.playerDamage.isAlive()
    ) {
      return;
    }

    this.damageSystem.applyDamage(
      enemy.createContactDamageRequest(
        this.playerDamage,
        this.gameplayElapsedMs,
      ),
    );
  }

  private tryChaseAttack(enemy: ChaseEnemy, nowMs: number): void {
    if (!enemy.isAlive() || !this.playerDamage.isAlive()) return;

    const playerBounds = new Phaser.Geom.Rectangle(
      this.player.x - PLAYER_VISUAL.widthPx / 2,
      this.player.y - PLAYER_VISUAL.heightPx / 2,
      PLAYER_VISUAL.widthPx,
      PLAYER_VISUAL.heightPx,
    );
    if (!Phaser.Geom.Rectangle.Overlaps(enemy.attackBounds, playerBounds)) {
      return;
    }

    const request = enemy.takeAttackDamageRequest(this.playerDamage, nowMs);
    if (request) this.damageSystem.applyDamage(request);
  }

  private updateAttackFlash(attack: AttackPresentation | null): void {
    if (!attack) {
      this.attackFlash.setVisible(false);
      return;
    }

    if (attack.attackId !== this.lastShockwaveAttackId) {
      this.lastShockwaveAttackId = attack.attackId;
      this.createAttackShockwave(attack);
    }

    this.attackFlash
      .setPosition(attack.flash.bounds.center.x, attack.flash.bounds.center.y)
      .setSize(attack.flash.bounds.widthPx, attack.flash.bounds.heightPx)
      .setDisplaySize(attack.flash.bounds.widthPx, attack.flash.bounds.heightPx)
      .setAlpha(attack.flash.alpha)
      .setVisible(true);
  }

  private createAttackShockwave(attack: AttackPresentation): void {
    const config = this.gameConfig.combat.playerMelee;
    const direction = attack.hitbox.center.x >= this.player.x ? 1 : -1;
    const startAngle = direction > 0 ? -70 : 110;
    const endAngle = direction > 0 ? 70 : 250;
    const originX = this.player.x + direction * 20;

    for (let layer = 0; layer < 2; layer += 1) {
      const wave = this.add
        .arc(
          originX,
          this.player.y,
          config.shockwaveRadiusPx * (1 - layer * 0.25),
          startAngle,
          endAngle,
          false,
          0xd9f9ff,
          0,
        )
        .setStrokeStyle(5 - layer, layer === 0 ? 0xcffafe : 0xfef3c7, 0.95)
        .setScale(0.45, 0.7)
        .setDepth(7);

      this.tweens.add({
        targets: wave,
        x: originX + direction * config.shockwaveTravelPx,
        scaleX: 1.7 + layer * 0.2,
        scaleY: 1.25 + layer * 0.15,
        alpha: 0,
        delay: layer * 28,
        duration: config.shockwaveDurationMs + layer * 45,
        ease: "Cubic.Out",
        onComplete: () => wave.destroy(),
      });
    }
  }

  private completeLevel(): void {
    if (this.flow.state !== GAME_FLOW_STATE.PLAYING) return;

    this.flow.transition(GAME_FLOW_STATE.COMPLETED);
    this.player.setActive(false);
    this.physics.world.pause();
    this.attackFlash.setVisible(false);
    this.eventBus.emit(GAME_EVENT.LEVEL_COMPLETED, {
      levelId: LEVEL_01.id,
      playerId: this.playerDamage.id,
      elapsedMs: this.gameplayElapsedMs,
      defeatedEnemyCount: this.defeatedEnemyCount,
      completedAtMs: this.gameplayElapsedMs,
    });
  }

  private getDamageableBounds(target: Damageable): {
    center: Vec2;
    widthPx: number;
    heightPx: number;
  } {
    const gameObject = target as unknown as Phaser.GameObjects.Rectangle;
    return {
      center: target.position,
      widthPx: gameObject.width,
      heightPx: gameObject.height,
    };
  }

  private getGameObject(
    object:
      | Phaser.Types.Physics.Arcade.GameObjectWithBody
      | Phaser.Physics.Arcade.Body
      | Phaser.Physics.Arcade.StaticBody
      | Phaser.Tilemaps.Tile,
  ): Phaser.GameObjects.GameObject {
    if (object instanceof Phaser.Tilemaps.Tile) {
      throw new TypeError(
        "Expected a level trigger GameObject, received a Tile",
      );
    }
    if (
      object instanceof Phaser.Physics.Arcade.Body ||
      object instanceof Phaser.Physics.Arcade.StaticBody
    ) {
      return object.gameObject;
    }
    return object;
  }

  private registerLifecycleListeners(): void {
    this.unsubscribe.push(
      this.eventBus.on(GAME_EVENT.RESTART_REQUESTED, ({ mode }) => {
        const playerSpawn =
          mode === "checkpoint"
            ? this.checkpointSystem.respawnPosition
            : LEVEL_01.playerSpawn;
        this.scene.restart({ playerSpawn });
      }),
      this.eventBus.on(GAME_EVENT.ENTITY_DIED, ({ entityId, entityKind }) => {
        this.handleEntityDeath(entityId, entityKind);
      }),
    );

    this.input.keyboard?.on("keydown-ESC", this.togglePause, this);
    this.input.keyboard?.on("keydown-R", this.requestRestart, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off("keydown-ESC", this.togglePause, this);
      this.input.keyboard?.off("keydown-R", this.requestRestart, this);
      this.playerCombat.dispose();
      this.damageSystem.clear();
      for (const unsubscribe of this.unsubscribe.splice(0)) unsubscribe();
    });
  }

  private handleEntityDeath(entityId: string, entityKind: EntityKind): void {
    if (entityKind !== "player") {
      this.defeatedEnemyCount += 1;
      return;
    }
    if (
      entityId !== this.playerDamage.id ||
      this.flow.state !== GAME_FLOW_STATE.PLAYING
    ) {
      return;
    }

    this.flow.transition(GAME_FLOW_STATE.FAILED);
    this.physics.world.pause();
    this.attackFlash.setVisible(false);
  }

  private readonly requestRestart = (): void => {
    if (
      this.flow.state !== GAME_FLOW_STATE.FAILED &&
      this.flow.state !== GAME_FLOW_STATE.COMPLETED
    ) {
      return;
    }
    this.eventBus.emit(GAME_EVENT.RESTART_REQUESTED, {
      mode: this.flow.state === GAME_FLOW_STATE.FAILED ? "checkpoint" : "level",
      reason:
        this.flow.state === GAME_FLOW_STATE.FAILED ? "death" : "completion",
    });
  };

  private readonly togglePause = (): void => {
    if (this.flow.state === GAME_FLOW_STATE.PLAYING) {
      this.flow.transition(GAME_FLOW_STATE.PAUSED);
      this.physics.world.pause();
      this.anims.pauseAll();
      this.attackFlash.setVisible(false);
      this.eventBus.emit(GAME_EVENT.PAUSE_CHANGED, {
        paused: true,
        reason: "keyboard",
      });
      return;
    }

    if (this.flow.state === GAME_FLOW_STATE.PAUSED) {
      this.flow.transition(GAME_FLOW_STATE.PLAYING);
      this.physics.world.resume();
      this.anims.resumeAll();
      this.eventBus.emit(GAME_EVENT.PAUSE_CHANGED, {
        paused: false,
        reason: "keyboard",
      });
    }
  };
}
