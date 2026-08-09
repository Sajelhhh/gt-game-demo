import Phaser from "phaser";

import "./style.css";
import { DEFAULT_GAME_CONFIG } from "./game/config";
import { GameEventBus } from "./game/GameEventBus";
import { BootScene } from "./scenes/BootScene";
import { GameScene } from "./scenes/GameScene";
import { MenuScene } from "./scenes/MenuScene";
import { UIScene } from "./scenes/UIScene";

const config = DEFAULT_GAME_CONFIG;
const eventBus = new GameEventBus();

const phaserConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  width: config.render.widthPx,
  height: config.render.heightPx,
  backgroundColor: config.render.backgroundColor,
  pixelArt: config.render.pixelArt,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: config.physics.gravityY },
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [
    new BootScene(config),
    new MenuScene(config),
    new GameScene(config, eventBus),
    new UIScene(config, eventBus),
  ],
};

const game = new Phaser.Game(phaserConfig);
game.events.once(Phaser.Core.Events.DESTROY, () => eventBus.clear());
