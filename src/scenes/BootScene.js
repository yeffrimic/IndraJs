import GameState    from '../state/GameState.js';
import Dev          from '../Dev.js';
import SpriteConfig from '../SpriteConfig.js';

export default class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  preload() {
    // pantalla de carga: barra de plastilina sobre chocolate (el mismo tono de las
    // transiciones, así el arranque ya se siente parte del juego)
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#2a1a0e');
    const W = 320, H = 26, x0 = width / 2 - W / 2, y0 = height / 2 - H / 2;
    const marco = this.add.graphics();
    marco.fillStyle(0x1a0e06, 0.6); marco.fillRoundedRect(x0 - 6, y0 - 2, W + 12, H + 12, 18);
    marco.fillStyle(0xf7e7bd, 1);   marco.fillRoundedRect(x0 - 6, y0 - 6, W + 12, H + 12, 18);
    const fill = this.add.graphics();
    const dot = this.add.circle(width / 2, y0 - 40, 12, 0xf08a3c).setStrokeStyle(4, 0xa35a1e);
    this.tweens.add({ targets: dot, y: y0 - 60, duration: 320, yoyo: true, repeat: -1, ease: 'Sine.easeOut' });

    this.load.on('progress', v => {
      fill.clear();
      if (v <= 0) return;
      fill.fillStyle(0xa35a1e, 1); fill.fillRoundedRect(x0, y0 + 3, Math.max(H, W * v), H - 3, 11);
      fill.fillStyle(0xf08a3c, 1); fill.fillRoundedRect(x0, y0, Math.max(H, W * v), H - 4, 11);
      fill.fillStyle(0xffffff, 0.35); fill.fillRoundedRect(x0 + 8, y0 + 4, Math.max(8, W * v - 16), 5, 2);
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
    // ?room      → entra al cuarto normal (sin editor)
    // ?nuevo     → perfil nuevo "Prueba": recorrido guiado desde el principio
    if (Dev.activo()) {
      const params = new URLSearchParams(location.search);
      // ?nuevo → perfil "Prueba" recién creado: arranca el recorrido guiado desde cero
      if (params.has('nuevo')) {
        localStorage.removeItem('circuito_perfil_Prueba');
        GameState.login('Prueba');
        this.scene.start('RoomScene');
        return;
      }
      if (params.has('nivel') || params.has('sel') || params.has('editroom') ||
          params.has('editstore') || params.has('store') || params.has('room')) {
        GameState.login('Dev');
        GameState.ultimoNivelDesbloqueado = Math.max(GameState.ultimoNivelDesbloqueado, 99);  // todo desbloqueado para testear
        GameState.tutorial = 'listo';                     // los atajos de dev no pasan por el recorrido guiado
        if (params.has('sel'))            this.scene.start('LevelSelectScene');
        else if (params.has('editroom') || params.has('room')) this.scene.start('RoomScene');
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
