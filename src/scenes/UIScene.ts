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
  private healthText!: Phaser.GameObjects.Text;
  private overlay!: Phaser.GameObjects.Container;
  private overlayTitle!: Phaser.GameObjects.Text;
  private overlayDetail!: Phaser.GameObjects.Text;
  private restartButton!: Phaser.GameObjects.Text;
  private outcome: "playing" | "dead" | "completed" = "playing";
  private defeatedEnemyCount = 0;
  private startedAtMs = 0;

  constructor(
    private readonly gameConfig: Readonly<GameConfig>,
    private readonly eventBus: TypedEventBus,
  ) {
    super(SCENE_KEY.UI);
  }

  create(): void {
    this.resetRun();
    this.createHud();
    this.createOverlay();
    this.registerEventListeners();
    this.registerInputListeners();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off("keydown-R", this.restart, this);
      this.input.keyboard?.off("keydown-ENTER", this.restart, this);
      for (const unsubscribe of this.unsubscribe.splice(0)) unsubscribe();
    });
  }

  private createHud(): void {
    const labelStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      color: "#f4f1de",
      fontFamily: "system-ui, sans-serif",
      fontSize: "18px",
      stroke: "#10131f",
      strokeThickness: 4,
    };

    this.add.text(
      24,
      20,
      "A/D 移动 · Space 二段跳 · J 攻击 · Esc 暂停",
      labelStyle,
    );
    this.healthText = this.add
      .text(this.gameConfig.render.widthPx - 24, 20, "", {
        ...labelStyle,
        fontSize: "22px",
        fontStyle: "bold",
      })
      .setOrigin(1, 0);
    this.updateHealth(
      this.gameConfig.player.maxHealth,
      this.gameConfig.player.maxHealth,
    );
  }

  private createOverlay(): void {
    const { widthPx, heightPx } = this.gameConfig.render;
    const shade = this.add
      .rectangle(0, 0, widthPx, heightPx, 0x080a12, 0.82)
      .setOrigin(0);
    this.overlayTitle = this.add
      .text(widthPx / 2, heightPx / 2 - 72, "", {
        color: "#f4f1de",
        fontFamily: "system-ui, sans-serif",
        fontSize: "45px",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.overlayDetail = this.add
      .text(widthPx / 2, heightPx / 2, "", {
        align: "center",
        color: "#d5dbea",
        fontFamily: "system-ui, sans-serif",
        fontSize: "20px",
        lineSpacing: 8,
      })
      .setOrigin(0.5);
    this.restartButton = this.add
      .text(widthPx / 2, heightPx / 2 + 90, "重新开始  [R / Enter]", {
        backgroundColor: "#5c7c5a",
        color: "#ffffff",
        fontFamily: "system-ui, sans-serif",
        fontSize: "22px",
        padding: { x: 24, y: 12 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.restartButton.on("pointerup", this.restart, this);
    this.overlay = this.add
      .container(0, 0, [
        shade,
        this.overlayTitle,
        this.overlayDetail,
        this.restartButton,
      ])
      .setDepth(100)
      .setVisible(false);
  }

  private registerEventListeners(): void {
    this.unsubscribe.push(
      this.eventBus.on(
        GAME_EVENT.HEALTH_CHANGED,
        ({ entityKind, currentHealth, maxHealth }) => {
          if (entityKind === "player") {
            this.updateHealth(currentHealth, maxHealth);
          }
        },
      ),
      this.eventBus.on(GAME_EVENT.ENTITY_DIED, ({ entityKind, diedAtMs }) => {
        if (entityKind !== "player") {
          this.defeatedEnemyCount += 1;
          return;
        }

        this.outcome = "dead";
        this.showResult(
          "挑战失败",
          Math.max(0, diedAtMs - this.startedAtMs),
          this.defeatedEnemyCount,
        );
      }),
      this.eventBus.on(
        GAME_EVENT.LEVEL_COMPLETED,
        ({ elapsedMs, defeatedEnemyCount }) => {
          this.outcome = "completed";
          this.showResult("通关！", elapsedMs, defeatedEnemyCount);
        },
      ),
      this.eventBus.on(GAME_EVENT.PAUSE_CHANGED, ({ paused }) => {
        if (this.outcome !== "playing") return;

        this.overlayTitle.setText("游戏暂停");
        this.overlayDetail.setText("按 Esc 继续");
        this.restartButton.setVisible(false);
        this.overlay.setVisible(paused);
      }),
    );
  }

  private registerInputListeners(): void {
    this.input.keyboard?.on("keydown-R", this.restart, this);
    this.input.keyboard?.on("keydown-ENTER", this.restart, this);
  }

  private updateHealth(currentHealth: number, maxHealth: number): void {
    const safeMax = Math.max(0, maxHealth);
    const safeCurrent = Phaser.Math.Clamp(currentHealth, 0, safeMax);
    const hearts = `${"♥".repeat(safeCurrent)}${"♡".repeat(safeMax - safeCurrent)}`;
    this.healthText.setText(`${hearts}  生命 ${safeCurrent}/${safeMax}`);
  }

  private showResult(
    title: string,
    elapsedMs: number,
    defeatedEnemyCount: number,
  ): void {
    this.overlayTitle.setText(title);
    this.overlayDetail.setText(
      `耗时 ${this.formatElapsed(elapsedMs)}  ·  击败 ${defeatedEnemyCount} 只小怪`,
    );
    this.restartButton.setVisible(true);
    this.overlay.setVisible(true);
  }

  private formatElapsed(elapsedMs: number): string {
    const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  private resetRun(): void {
    this.outcome = "playing";
    this.defeatedEnemyCount = 0;
    this.startedAtMs = this.time.now;
  }

  private readonly restart = (): void => {
    if (this.outcome === "playing") return;

    const reason = this.outcome === "dead" ? "death" : "completion";
    this.resetRun();
    this.updateHealth(
      this.gameConfig.player.maxHealth,
      this.gameConfig.player.maxHealth,
    );
    this.overlay.setVisible(false);
    this.eventBus.emit(GAME_EVENT.RESTART_REQUESTED, {
      mode: "level",
      reason,
    });
  };
}
