import BootScene   from './scenes/BootScene.js';
import LoginScene  from './scenes/LoginScene.js';
import RoomScene   from './scenes/RoomScene.js';
import PuzzleScene from './scenes/PuzzleScene.js';
import StoreScene  from './scenes/StoreScene.js';
import LevelSelectScene from './scenes/LevelSelectScene.js';

const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent) ||
                 ('ontouchstart' in window && navigator.maxTouchPoints > 1);

window.isMobile = isMobile;

const config = {
  type:   Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#0d0d1f',

  scale: {
    mode:       Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width:      800,
    height:     600,
  },

  physics: {
    default: 'arcade',
    arcade: { debug: false }
  },

  scene: [BootScene, LoginScene, RoomScene, PuzzleScene, StoreScene, LevelSelectScene]
};

window.game = new Phaser.Game(config);
