import GameState from '../state/GameState.js';

const PERFILES = [
  { nombre: 'Yeffri',       color: 0x4fc3f7 },
  { nombre: 'Estudiante 1', color: 0xce93d8 },
  { nombre: 'Estudiante 2', color: 0xa5d6a7 },
  { nombre: 'Estudiante 3', color: 0xff7043 },
  { nombre: 'Estudiante 4', color: 0xfff176 },
  { nombre: 'Invitado',     color: 0x888780 },
];

export default class LoginScene extends Phaser.Scene {
  constructor() { super('LoginScene'); }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;
    const isMobile = window.isMobile || false;

    // fondo
    this.add.rectangle(0, 0, width, height, 0x0d0d1f).setOrigin(0);

    if (isMobile) {
      this._crearLayoutMobile(width, height, cx);
    } else {
      this._crearLayoutDesktop(width, height, cx);
    }

    // versión
    this.add.text(cx, height - 10, 'v0.1 — circuito puzzle · creabot', {
      fontSize: '10px', color: '#2a2a4a', fontFamily: 'monospace'
    }).setOrigin(0.5, 1);
  }

  // ── layout desktop — vertical centrado ──
  _crearLayoutDesktop(width, height, cx) {
    const cy = height / 2;

    this.add.text(cx, 80, 'CIRCUITO PUZZLE', {
      fontSize: '28px', color: '#4fc3f7', fontFamily: 'monospace'
    }).setOrigin(0.5);

    this.add.text(cx, 118, '¿quién está jugando?', {
      fontSize: '13px', color: '#555', fontFamily: 'monospace'
    }).setOrigin(0.5);

    const cols = 3, btnW = 180, btnH = 70, gapX = 20, gapY = 16;
    const totalW = cols * btnW + (cols - 1) * gapX;
    const startX = cx - totalW / 2;
    const startY = 170;

    PERFILES.forEach((perfil, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x   = startX + col * (btnW + gapX) + btnW / 2;
      const y   = startY + row * (btnH + gapY) + btnH / 2;
      this._crearTarjeta(x, y, btnW, btnH, perfil);
    });
  }

  // ── layout mobile landscape — horizontal compacto ──
  _crearLayoutMobile(width, height, cx) {
    // título arriba centrado pequeño
    this.add.text(cx, 28, 'CIRCUITO PUZZLE', {
      fontSize: '16px', color: '#4fc3f7', fontFamily: 'monospace'
    }).setOrigin(0.5, 0.5);

    this.add.text(cx, 50, '¿quién está jugando?', {
      fontSize: '11px', color: '#555', fontFamily: 'monospace'
    }).setOrigin(0.5, 0.5);

    // 3 columnas x 2 filas compactas
    const cols  = 3;
    const btnW  = Math.floor((width - 40) / cols) - 8;
    const btnH  = Math.floor((height - 80) / 2) - 8;
    const gapX  = 8, gapY = 8;
    const totalW = cols * btnW + (cols - 1) * gapX;
    const startX = cx - totalW / 2;
    const startY = 66;

    PERFILES.forEach((perfil, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x   = startX + col * (btnW + gapX) + btnW / 2;
      const y   = startY + row * (btnH + gapY) + btnH / 2;
      this._crearTarjetaMobile(x, y, btnW, btnH, perfil);
    });
  }

  // ── tarjeta desktop ──
  _crearTarjeta(x, y, btnW, btnH, perfil) {
    const col = `#${perfil.color.toString(16).padStart(6,'0')}`;

    const bg = this.add.rectangle(x, y, btnW, btnH, 0x12122a)
      .setStrokeStyle(1, 0x2a2a4a)
      .setInteractive({ useHandCursor: true });

    const circle = this.add.circle(x - btnW * 0.28, y, 20, perfil.color, 0.2)
      .setStrokeStyle(2, perfil.color);

    this.add.text(x - btnW * 0.28, y, perfil.nombre[0].toUpperCase(), {
      fontSize: '16px', color: col, fontFamily: 'monospace'
    }).setOrigin(0.5);

    this.add.text(x + btnW * 0.08, y - 9, perfil.nombre, {
      fontSize: '13px', color: '#ccc', fontFamily: 'monospace'
    }).setOrigin(0, 0.5);

    const pts = this._getPuntos(perfil.nombre);
    this.add.text(x + btnW * 0.08, y + 10, pts > 0 ? `★ ${pts} pts` : 'nuevo', {
      fontSize: '10px', color: pts > 0 ? '#fff176' : '#444', fontFamily: 'monospace'
    }).setOrigin(0, 0.5);

    bg.on('pointerover',  () => { bg.setFillStyle(0x1a1a3a); bg.setStrokeStyle(1.5, perfil.color); });
    bg.on('pointerout',   () => { bg.setFillStyle(0x12122a); bg.setStrokeStyle(1, 0x2a2a4a); });
    bg.on('pointerdown',  () => this._entrar(perfil.nombre));
  }

  // ── tarjeta mobile — más compacta, icono + nombre apilados ──
  _crearTarjetaMobile(x, y, btnW, btnH, perfil) {
    const col = `#${perfil.color.toString(16).padStart(6,'0')}`;

    const bg = this.add.rectangle(x, y, btnW, btnH, 0x12122a)
      .setStrokeStyle(1, 0x2a2a4a)
      .setInteractive({ useHandCursor: true });

    // círculo avatar
    const r = Math.min(btnH * 0.28, 22);
    this.add.circle(x, y - btnH * 0.18, r, perfil.color, 0.15)
      .setStrokeStyle(2, perfil.color);
    this.add.text(x, y - btnH * 0.18, perfil.nombre[0].toUpperCase(), {
      fontSize: `${Math.floor(r * 0.9)}px`, color: col, fontFamily: 'monospace'
    }).setOrigin(0.5);

    // nombre
    this.add.text(x, y + btnH * 0.1, perfil.nombre, {
      fontSize: '11px', color: '#ccc', fontFamily: 'monospace'
    }).setOrigin(0.5);

    // puntos
    const pts = this._getPuntos(perfil.nombre);
    this.add.text(x, y + btnH * 0.32, pts > 0 ? `★ ${pts} pts` : 'nuevo', {
      fontSize: '10px', color: pts > 0 ? '#fff176' : '#444', fontFamily: 'monospace'
    }).setOrigin(0.5);

    bg.on('pointerover',  () => { bg.setFillStyle(0x1a1a3a); bg.setStrokeStyle(1.5, perfil.color); });
    bg.on('pointerout',   () => { bg.setFillStyle(0x12122a); bg.setStrokeStyle(1, 0x2a2a4a); });
    bg.on('pointerdown',  () => this._entrar(perfil.nombre));
  }

  _entrar(nombre) {
    GameState.login(nombre);
    this.scene.start('RoomScene');
  }

  _getPuntos(nombre) {
    try {
      const raw = localStorage.getItem(`circuito_perfil_${nombre}`);
      if (!raw) return 0;
      return JSON.parse(raw).puntosTotal || 0;
    } catch(e) { return 0; }
  }
}
