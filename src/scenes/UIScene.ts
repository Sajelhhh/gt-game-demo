import Phaser from "phaser";

import {
  GAME_EVENT,
  type TypedEventBus,
  type Unsubscribe,
} from "../contracts/events";
import type { GameConfig } from "../game/config";
import { SCENE_KEY } from "./keys";

export class UIScene extends Phaser.Scene {
  private readonly unsubscribe: Unsubscribe[] = [];
  private statusText!: Phaser.GameObjects.Text;

  constructor(
    private readonly gameConfig: Readonly<GameConfig>,
    private readonly eventBus: TypedEventBus,
  ) {
    super(SCENE_KEY.UI);
  }

  create(): void {
    this.add.text(24, 20, "A/D 移动 · Space 跳跃 · J 攻击 · Esc 暂停", {
      color: "#f4f1de",
      fontFamily: "system-ui, sans-serif",
      fontSize: "18px",
    });
    this.statusText = this.add
      .text(this.gameConfig.render.widthPx - 24, 20, "", {
        color: "#f4f1de",
        fontFamily: "system-ui, sans-serif",
        fontSize: "22px",
      })
      .setOrigin(1, 0);

    this.unsubscribe.push(
      this.eventBus.on(GAME_EVENT.PAUSE_CHANGED, ({ paused }) => {
        this.statusText.setText(paused ? "已暂停" : "");
      }),
    );

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const unsubscribe of this.unsubscribe.splice(0)) unsubscribe();
    });
  }
}
