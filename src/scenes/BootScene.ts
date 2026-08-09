import Phaser from "phaser";

import type { GameConfig } from "../game/config";
import { CHARACTER_ASSET } from "../game/assets";
import { SCENE_KEY } from "./keys";

export class BootScene extends Phaser.Scene {
  private loadFailed = false;

  constructor(private readonly gameConfig: Readonly<GameConfig>) {
    super(SCENE_KEY.BOOT);
  }

  preload(): void {
    this.load.once("loaderror", () => {
      this.loadFailed = true;
    });
    for (const [key, path] of Object.entries(CHARACTER_ASSET)) {
      this.load.image(key, path);
    }
  }

  create(): void {
    if (this.loadFailed) {
      this.showLoadFailure();
      return;
    }

    this.scene.start(SCENE_KEY.MENU);
  }

  private showLoadFailure(): void {
    const { widthPx, heightPx } = this.gameConfig.render;
    this.add
      .text(widthPx / 2, heightPx / 2 - 32, "加载失败，请检查网络后重试。", {
        color: "#f4f1de",
        fontFamily: "system-ui, sans-serif",
        fontSize: "26px",
      })
      .setOrigin(0.5);

    const retry = this.add
      .text(widthPx / 2, heightPx / 2 + 28, "重试", {
        backgroundColor: "#3d5a80",
        color: "#ffffff",
        fontFamily: "system-ui, sans-serif",
        fontSize: "22px",
        padding: { x: 24, y: 12 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    retry.once("pointerup", () => this.scene.restart());
  }
}
