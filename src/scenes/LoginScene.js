import GameState    from '../state/GameState.js';
import SpriteConfig, { FUENTE } from '../SpriteConfig.js';
import Sonido       from '../Sonido.js';
import {
  CLAY, losa, boton, estrella, estiloTexto, hex, oscurecer,
  entrarEscena, irA, aparecer, respirar,
} from '../ClayUI.js';

const PERFILES = [
  { nombre: 'Yeffri',       color: 0x5fb0e8 },
  { nombre: 'Estudiante 1', color: 0xb48ad8 },
  { nombre: 'Estudiante 2', color: 0x7cc35a },
  { nombre: 'Estudiante 3', color: 0xf08a3c },
  { nombre: 'Estudiante 4', color: 0xf6c945 },
  { nombre: 'Invitado',     color: 0xb0a488 },
];

// colores del logo, letra por letra (los mismos del arcoíris del cuarto)
const COLORES_LOGO = [0xe8705e, 0xf08a3c, 0xf6c945, 0x7cc35a, 0x5fb0e8, 0xb48ad8];

export default class LoginScene extends Phaser.Scene {
  constructor() { super('LoginScene'); }

  create() {
    const { width, height } = this.scale;
    entrarEscena(this);
    this._eligiendo = false;   // la instancia se reutiliza al cerrar sesión

    SpriteConfig.fondo(this, 'login', width, height, 0xc8763f);
    this.add.rectangle(0, 0, width, height, 0x2a1a0e, 0.18).setOrigin(0);

    this._crearLogo(width / 2, 92);

    // 6 tarjetas grandes en 3x2 — un mismo layout para escritorio y móvil:
    // la resolución lógica es fija y en el celu las tarjetas quedan del tamaño de un pulgar
    const cols = 3, cw = 220, ch = 118, gx = 22, gy = 22;
    const x0 = width / 2 - (cols * cw + (cols - 1) * gx) / 2 + cw / 2;
    const y0 = 238;
    PERFILES.forEach((perfil, i) => {
      const x = x0 + (i % cols) * (cw + gx);
      const y = y0 + Math.floor(i / cols) * (ch + gy) + ch / 2;
      const t = this._crearTarjeta(x, y, cw, ch, perfil);
      aparecer(this, t, 250 + i * 70);
    });

    this.add.text(width - 10, height - 8, 'v0.8 · circuito puzzle · creabot', {
      fontSize: '10px', color: '#fff3d6', fontFamily: FUENTE,
    }).setOrigin(1, 1).setAlpha(0.55);
  }

  // ── logo de plastilina: cada letra de un color, entra saltando y después ondula ──
  _crearLogo(cx, cy) {
    const palabra = 'CIRCUITO';
    const tam = 64;
    const letras = [...palabra].map((ch, i) =>
      this.add.text(0, 0, ch, estiloTexto(tam, hex(COLORES_LOGO[i % COLORES_LOGO.length]), '#ffffff', 10)).setOrigin(0.5));
    // sombra de canto: la misma letra, oscura y corrida hacia abajo
    const anchos = letras.map(l => l.width - 6);
    const total = anchos.reduce((a, b) => a + b, 0);
    let x = cx - total / 2;
    letras.forEach((l, i) => {
      const lx = x + anchos[i] / 2;
      const sombra = this.add.text(lx, cy + 6, l.text, estiloTexto(tam, '#5a3a1a', '#5a3a1a', 10)).setOrigin(0.5).setAlpha(0.35);
      l.setPosition(lx, cy).setDepth(1);
      l.setY(cy - 80).setAlpha(0);
      this.tweens.add({ targets: l, y: cy, alpha: 1, duration: 500, delay: i * 60, ease: 'Bounce.easeOut' });
      this.tweens.add({ targets: [l], y: cy - 6, duration: 900, delay: 900 + i * 110, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      sombra.setAlpha(0);
      this.tweens.add({ targets: sombra, alpha: 0.35, duration: 300, delay: 300 + i * 60 });
      x += anchos[i];
    });

    // la serpiente asomándose y el LED encendido a los costados del logo
    const hk = SpriteConfig.get('serpiente', 'cabeza');
    if (hk && this.textures.exists(hk)) {
      const s = this.add.image(cx - total / 2 - 50, cy + 6, hk).setDisplaySize(80, 96).setFlipX(false);
      this.tweens.add({ targets: s, angle: { from: -8, to: 8 }, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    const lk = SpriteConfig.get('componentes', 'led');
    if (lk && this.textures.exists(lk)) {
      const halo = this.add.circle(cx + total / 2 + 48, cy + 4, 40, 0xffb04a, 0.4);
      this.tweens.add({ targets: halo, scale: { from: 0.85, to: 1.2 }, alpha: { from: 0.5, to: 0.15 }, duration: 800, yoyo: true, repeat: -1 });
      this.add.image(cx + total / 2 + 48, cy + 4, lk).setDisplaySize(68, 68);
    }
    this.add.text(cx, cy + 56, 'puzzle', estiloTexto(26, '#fff6e0', '#8a5a2a', 6)).setOrigin(0.5);
  }

  // ── tarjeta de perfil ──
  // El chico se reconoce por el personaje que eligió y por su color, no por el nombre.
  _crearTarjeta(x, y, w, h, perfil) {
    const datos = this._leerPerfil(perfil.nombre);
    const c = this.add.container(x, y);
    c.add(losa(this, 0, 0, w, h, { fill: CLAY.cremaClaro, borde: oscurecer(perfil.color, 0.75), r: 26, canto: 8, grosor: 4 }));

    // avatar: el personaje del perfil o, si es nuevo, la inicial en un círculo
    const ax = -w / 2 + 52, ay = -6;
    const av = this.add.graphics();
    av.fillStyle(oscurecer(perfil.color, 0.7), 1); av.fillCircle(ax, ay + 3, 38);
    av.fillStyle(perfil.color, 1);                av.fillCircle(ax, ay, 38);
    c.add(av);
    const pose = datos && SpriteConfig.pose(datos.personaje || 'nino', 'abajo');
    if (pose && this.textures.exists(pose.key)) {
      const pj = this.add.image(ax, ay + 32, pose.key).setOrigin(0.5, pose.anclaY);
      pj.setScale(70 / pose.altoFigura);
      c.add(pj);
    } else {
      c.add(this.add.text(ax, ay - 2, perfil.nombre[0].toUpperCase(), estiloTexto(34, '#ffffff', hex(oscurecer(perfil.color, 0.5)), 6)).setOrigin(0.5));
    }

    c.add(this.add.text(-w / 2 + 100, -22, perfil.nombre, {
      fontSize: '17px', color: CLAY.txt, fontFamily: FUENTE, fontStyle: '600',
      wordWrap: { width: w - 110 },
    }).setOrigin(0, 0.5));

    // progreso: estrellas ganadas (o una chispita de "nuevo")
    const est = datos ? Object.values(datos.estrellas || {}).reduce((a, b) => a + b, 0) : 0;
    if (est > 0) {
      c.add(estrella(this, -w / 2 + 116, 12, true, 28));
      c.add(this.add.text(-w / 2 + 134, 12, `${est}`, estiloTexto(20, '#ffd54a', '#8a5a10', 4)).setOrigin(0, 0.5));
    } else {
      c.add(this.add.text(-w / 2 + 104, 12, '✨', { fontSize: '22px' }).setOrigin(0, 0.5));
    }

    c.setSize(w, h).setInteractive({ useHandCursor: true });
    c.on('pointerover', () => this.tweens.add({ targets: c, scale: 1.05, duration: 120 }));
    c.on('pointerout',  () => this.tweens.add({ targets: c, scale: 1, duration: 120 }));
    c.on('pointerdown', () => {
      this.tweens.killTweensOf(c);
      c.setScale(1.06, 0.9);
      this.tweens.add({ targets: c, scaleX: 1, scaleY: 1, duration: 260, ease: 'Back.easeOut' });
      Sonido.pop();
      this.time.delayedCall(120, () => this._entrar(perfil.nombre, !datos));
    });
    return c;
  }

  _entrar(nombre, esNuevo) {
    if (this._saliendo || this._eligiendo) return;
    GameState.login(nombre);
    if (esNuevo) this._elegirPersonaje();
    else irA(this, 'RoomScene');
  }

  // ── primera vez: ¿con quién jugás? ──
  // GameState.personaje ya existía y se guardaba, pero no había pantalla para elegirlo.
  _elegirPersonaje() {
    this._eligiendo = true;
    const { width, height } = this.scale;
    const velo = this.add.rectangle(0, 0, width, height, 0x1a0e06, 0.55).setOrigin(0).setDepth(50).setInteractive();
    velo.setAlpha(0);
    this.tweens.add({ targets: velo, alpha: 1, duration: 200 });

    const panel = this.add.container(width / 2, height / 2).setDepth(51);
    panel.add(losa(this, 0, 0, 480, 340, { fill: CLAY.cremaClaro, borde: CLAY.borde, r: 34, canto: 12, grosor: 5 }));
    aparecer(this, panel);

    ['nino', 'nina'].forEach((pj, i) => {
      const x = (i === 0 ? -1 : 1) * 110;
      const fill = i === 0 ? CLAY.azul : CLAY.rojo;
      const b = boton(this, x, -10, { w: 180, h: 230, r: 36, fill, sonido: 'pop', onTap: () => {
        GameState.elegirPersonaje(pj);
        Sonido.victoria();
        irA(this, 'RoomScene');
      }});
      const pose = SpriteConfig.pose(pj, 'abajo');
      if (pose && this.textures.exists(pose.key)) {
        const img = this.add.image(0, 90, pose.key).setOrigin(0.5, pose.anclaY);
        img.setScale(180 / pose.altoFigura);
        b.add(img);
        this.tweens.add({ targets: img, y: 82, duration: 500 + i * 120, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
      panel.add(b);
      respirar(this, b, 0.03, 800 + i * 150);
    });
  }

  _leerPerfil(nombre) {
    try {
      const raw = localStorage.getItem(`circuito_perfil_${nombre}`);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
}
