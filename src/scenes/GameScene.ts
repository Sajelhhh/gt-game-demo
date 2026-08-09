import Phaser from "phaser";

import {
  GAME_EVENT,
  type TypedEventBus,
  type Unsubscribe,
} from "../contracts/events";
import {
  GAME_FLOW_STATE,
  createGameFlowStateMachine,
  type StrictStateMachine,
  type GameFlowState,
} from "../contracts/states";
import type { GameConfig } from "../game/config";
import { LEVEL_01, validateLevelLayout } from "../level/level01";
import { LevelLoader } from "../level/LevelLoader";
import { SCENE_KEY } from "./keys";

export class GameScene extends Phaser.Scene {
  private readonly unsubscribe: Unsubscribe[] = [];
  private flow!: StrictStateMachine<GameFlowState>;
  public worldLayer!: Phaser.Physics.Arcade.StaticGroup;

  constructor(
    private readonly gameConfig: Readonly<GameConfig>,
    private readonly eventBus: TypedEventBus,
  ) {
    super(SCENE_KEY.GAME);
  }

  create(): void {
    this.flow = createGameFlowStateMachine();
    this.flow.transition(GAME_FLOW_STATE.PLAYING);
    document.querySelector("#game")?.setAttribute("data-scene", "game");

    this.createLevel();
    this.registerLifecycleListeners();

    if (!this.scene.isActive(SCENE_KEY.UI)) {
      this.scene.launch(SCENE_KEY.UI);
    }
  }

  private createLevel(): void {
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
      .text(100, 120, "A / D 移动 · SPACE 跳跃", {
        color: "#c8d4b8",
        fontFamily: "system-ui, sans-serif",
        fontSize: "25px",
      })
      .setDepth(10);
  }

  private registerLifecycleListeners(): void {
    this.unsubscribe.push(
      this.eventBus.on(GAME_EVENT.RESTART_REQUESTED, () =>
        this.scene.restart(),
      ),
    );

    this.input.keyboard?.on("keydown-ESC", this.togglePause, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off("keydown-ESC", this.togglePause, this);
      for (const unsubscribe of this.unsubscribe.splice(0)) unsubscribe();
    });
  }

  private readonly togglePause = (): void => {
    if (this.flow.state === GAME_FLOW_STATE.PLAYING) {
      this.flow.transition(GAME_FLOW_STATE.PAUSED);
      this.physics.world.pause();
      this.anims.pauseAll();
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
