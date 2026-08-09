import Phaser from "phaser";

import type { GameConfig } from "../game/config";
import { SCENE_KEY } from "./keys";

export class MenuScene extends Phaser.Scene {
  constructor(private readonly gameConfig: Readonly<GameConfig>) {
    super(SCENE_KEY.MENU);
  }

  create(): void {
    const { widthPx, heightPx } = this.gameConfig.render;
    document.querySelector("#game")?.setAttribute("data-scene", "menu");

    this.add
      .text(widthPx / 2, heightPx / 2 - 76, "SHADOW SPROUT", {
        color: "#f4f1de",
        fontFamily: "system-ui, sans-serif",
        fontSize: "52px",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(widthPx / 2, heightPx / 2 - 16, "一个小而完整的浏览器动作 Demo", {
        color: "#9ba7c4",
        fontFamily: "system-ui, sans-serif",
        fontSize: "21px",
      })
      .setOrigin(0.5);

    this.add
      .text(
        widthPx / 2,
        heightPx / 2 + 31,
        "A / D 或 ← / → 移动  ·  Space / W 跳跃  ·  J / X 攻击  ·  Esc 暂停",
        {
          color: "#d5dbea",
          fontFamily: "system-ui, sans-serif",
          fontSize: "17px",
        },
      )
      .setOrigin(0.5);

    const startButton = this.add
      .text(widthPx / 2, heightPx / 2 + 91, "开始游戏  [Enter]", {
        backgroundColor: "#5c7c5a",
        color: "#ffffff",
        fontFamily: "system-ui, sans-serif",
        fontSize: "26px",
        padding: { x: 30, y: 14 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const startGame = (): void => {
      this.scene.start(SCENE_KEY.GAME);
    };
    startButton.once("pointerup", startGame);
    this.input.keyboard?.once("keydown-ENTER", startGame);
  }
}
