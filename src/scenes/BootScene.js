import GameState    from '../state/GameState.js';
import Dev          from '../Dev.js';
import SpriteConfig, { FUENTE } from '../SpriteConfig.js';

export default class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  preload() {
    // pantalla de carga
    const { width, height } = this.scale;
    const bar = this.add.rectangle(width/2, height/2, 300, 6, 0x2a2a4a).setOrigin(0.5);
    const fill = this.add.rectangle(width/2 - 150, height/2, 0, 6, 0x4fc3f7).setOrigin(0, 0.5);
    const txt = this.add.text(width/2, height/2 + 20, 'cargando...', {
      fontSize: '12px', color: '#555', fontFamily: FUENTE
    }).setOrigin(0.5);

    this.load.on('progress', v => {
      fill.width = 300 * v;
      txt.setText(`cargando... ${Math.floor(v * 100)}%`);
    });

    // carga tolerante: los assets faltantes se ignoran (caen al dibujo vectorial)
    this.load.on('loaderror', () => { /* asset ausente — se usa el placeholder vectorial */ });

    // solo carga assets si USE_SPRITES está activo
    if (SpriteConfig.activo()) {
      const { images, spritesheets } = SpriteConfig.listarParaCargar();

      images.forEach(a => {
        this.load.image(a.key, a.path);
      });

      spritesheets.forEach(a => {
        this.load.spritesheet(a.key, a.path, {
          frameWidth:  a.frameW,
          frameHeight: a.frameH,
        });
      });

    }
  }

  create() {
    // ── atajos de desarrollo ──
    // Sólo existen en la máquina de desarrollo (ver src/dev-guard.js). Para el
    // usuario normal estos parámetros se ignoran y el juego arranca en el login.
    // ?nivel=N   → entra directo a ese puzzle (perfil "Dev", sin login ni caminata)
    // ?sel       → entra directo al selector de niveles
    // ?editroom  → entra al cuarto en modo editor (arrastrar objetos)
    // ?editstore → entra a la tienda en modo editor
    // ?store     → entra a la tienda normal
    if (Dev.activo()) {
      const params = new URLSearchParams(location.search);
      if (params.has('nivel') || params.has('sel') || params.has('editroom') ||
          params.has('editstore') || params.has('store')) {
        GameState.login('Dev');
        GameState.ultimoNivelDesbloqueado = Math.max(GameState.ultimoNivelDesbloqueado, 99);  // todo desbloqueado para testear
        if (params.has('sel'))            this.scene.start('LevelSelectScene');
        else if (params.has('editroom'))  this.scene.start('RoomScene');
        else if (params.has('editstore') || params.has('store')) this.scene.start('StoreScene');
        else {
          const idx = parseInt(params.get('nivel'), 10) || 0;
          this.scene.start('PuzzleScene', { nivelIdx: idx });
        }
        return;
      }
    }
    this.scene.start('LoginScene');
  }
}
