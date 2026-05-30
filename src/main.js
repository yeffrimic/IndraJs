import BootScene   from './scenes/BootScene.js';
import LoginScene  from './scenes/LoginScene.js';
import RoomScene   from './scenes/RoomScene.js';
import PuzzleScene from './scenes/PuzzleScene.js';

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#0d0d1f',
  physics: {
    default: 'arcade',
    arcade: { debug: false }
  },
  scene: [BootScene, LoginScene, RoomScene, PuzzleScene]
};

window.game = new Phaser.Game(config);
