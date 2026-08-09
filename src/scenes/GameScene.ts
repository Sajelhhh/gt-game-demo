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
import { SCENE_KEY } from "./keys";

export class GameScene extends Phaser.Scene {
  private readonly unsubscribe: Unsubscribe[] = [];
  private flow!: StrictStateMachine<GameFlowState>;

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

    this.createPlaceholderLevel();
    this.registerLifecycleListeners();

    if (!this.scene.isActive(SCENE_KEY.UI)) {
      this.scene.launch(SCENE_KEY.UI);
    }
  }

  private createPlaceholderLevel(): void {
    const { widthPx, heightPx } = this.gameConfig.render;
    const backdrop = this.add.graphics();
    backdrop.fillStyle(0x182033).fillRect(0, 0, widthPx, heightPx);
    backdrop.fillStyle(0x263750).fillRect(0, heightPx - 110, widthPx, 110);
    backdrop.fillStyle(0x78966b).fillRect(0, heightPx - 120, widthPx, 10);

    this.add
      .text(widthPx / 2, heightPx / 2, "关卡骨架已就绪", {
        color: "#c8d4b8",
        fontFamily: "system-ui, sans-serif",
        fontSize: "30px",
      })
      .setOrigin(0.5);
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
