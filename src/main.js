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

// Phaser mide el texto al crearlo: si arranca antes de que la fuente esté lista,
// los primeros textos quedan renderizados con la fuente de respaldo. Esperamos
// (con tope de seguridad) a que el navegador la tenga disponible.
function _arrancar() {
  window.game = new Phaser.Game(config);
}

if (document.fonts && document.fonts.load) {
  Promise.race([
    document.fonts.load('16px "Fredoka"').then(() => document.fonts.ready),
    new Promise(res => setTimeout(res, 2000)),   // si no hay red, no bloqueamos el juego
  ]).then(_arrancar).catch(_arrancar);
} else {
  _arrancar();
}
