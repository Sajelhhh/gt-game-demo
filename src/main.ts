import Phaser from 'phaser';

import './style.css';

const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: 1280,
  height: 720,
  backgroundColor: '#10131f',
  pixelArt: true,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 1200 },
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: {
    create(this: Phaser.Scene): void {
      this.add
        .text(640, 330, 'SHADOW SPROUT', {
          color: '#f4f1de',
          fontFamily: 'system-ui, sans-serif',
          fontSize: '48px',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);

      this.add
        .text(640, 395, 'Phaser foundation is ready', {
          color: '#9ba7c4',
          fontFamily: 'system-ui, sans-serif',
          fontSize: '24px',
        })
        .setOrigin(0.5);
    },
  },
};

new Phaser.Game(gameConfig);
