import BootScene   from './scenes/BootScene.js';
import LoginScene  from './scenes/LoginScene.js';
import RoomScene   from './scenes/RoomScene.js';
import PuzzleScene from './scenes/PuzzleScene.js';
import StoreScene  from './scenes/StoreScene.js';
import LevelSelectScene from './scenes/LevelSelectScene.js';

const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent) ||
                 ('ontouchstart' in window && navigator.maxTouchPoints > 1);

window.isMobile = isMobile;

// ── tamaño lógico: alto fijo 600, ancho según la pantalla ──
// Antes era 800x600 fijo (4:3) y en un teléfono apaisado (~2:1) se perdía hasta el 40 %
// del ancho en bandas negras. Ahora el ancho acompaña la proporción de la pantalla
// (entre 4:3 y 2,2:1). El alto no cambia, así que nada se achica: lo que se gana es
// lugar a los costados (el puzzle lo usa para agrandar el tablero y el pad).
//
// En móvil se mide la pantalla física apaisada (no la ventana): así el cálculo sirve
// aunque el juego arranque con el teléfono parado, y coincide con la pantalla completa.
// Las escenas calibradas sobre un dibujo de 800x600 (cuarto, tienda) se centran con
// ClayUI.centrarEscenario.
function anchoLogico() {
  const a = isMobile ? Math.max(screen.width, screen.height) : window.innerWidth;
  const b = isMobile ? Math.min(screen.width, screen.height) : window.innerHeight;
  const aspecto = Math.min(2.2, Math.max(4 / 3, a / Math.max(1, b)));
  return Math.round(600 * aspecto);
}

const config = {
  type:   Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#2a1a0e',

  scale: {
    mode:       Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width:      anchoLogico(),
    height:     600,
  },

  input: { activePointers: 2 },

  physics: {
    default: 'arcade',
    arcade: { debug: false }
  },

  scene: [BootScene, LoginScene, RoomScene, PuzzleScene, StoreScene, LevelSelectScene]
};

// ── pantalla completa en el teléfono ──
// Al primer toque (los navegadores sólo la permiten tras un gesto) se pide pantalla
// completa y se traba en horizontal. En iPhone Safari no existe la API: ahí la vía es
// "Agregar a pantalla de inicio" (manifest.webmanifest abre en fullscreen + landscape).
function pantallaCompletaAlTocar() {
  if (!isMobile) return;
  const pedir = () => {
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!req || document.fullscreenElement || document.webkitFullscreenElement) return;
    Promise.resolve(req.call(el, { navigationUI: 'hide' }))
      .then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape'))
      .catch(() => { /* el navegador no quiso: se juega igual */ });
  };
  window.addEventListener('pointerup', pedir, { once: true });
}

// Phaser mide el texto al crearlo: si arranca antes de que la fuente esté lista,
// los primeros textos quedan renderizados con la fuente de respaldo. Esperamos
// (con tope de seguridad) a que el navegador la tenga disponible.
function _arrancar() {
  window.game = new Phaser.Game(config);
  const cargando = document.getElementById('cargando');
  if (cargando) cargando.remove();                 // desde acá dibuja el cargador de BootScene
  pantallaCompletaAlTocar();
}

if (document.fonts && document.fonts.load) {
  Promise.race([
    document.fonts.load('16px "Fredoka"').then(() => document.fonts.ready),
    new Promise(res => setTimeout(res, 2000)),   // si no hay red, no bloqueamos el juego
  ]).then(_arrancar).catch(_arrancar);
} else {
  _arrancar();
}
