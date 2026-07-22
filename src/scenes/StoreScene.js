import GameState        from '../state/GameState.js';
import Dev              from '../Dev.js';
import SpriteConfig, { FUENTE } from '../SpriteConfig.js';
import { TIENDA_CATS, itemsDe } from '../tienda.js';

export default class StoreScene extends Phaser.Scene {
  constructor() { super('StoreScene'); }

  init(data) {
    this.catActiva = (data && data.cat) || TIENDA_CATS[0].id;
  }

  create() {
    const { width, height } = this.scale;
    const W = width, H = height;
    this.isMobile = window.isMobile || false;

    // ── editor visual de la tienda (?editstore, sólo en desarrollo) ──
    this.editMode  = Dev.flag('editstore');
    this.layout    = this._cargarLayout();
    this.editables = [];

    // ── fondo: pared + estantes de plastilina ──
    SpriteConfig.fondo(this, 'store', W, H, 0x0d0d1f);

    // posiciones (calibrables con el editor): tope de cada estante + bordes útiles
    this.shelfY  = this.layout.shelfY.slice();
    this.shelfX0 = this.layout.shelfX0;
    this.shelfX1 = this.layout.shelfX1;

    // ── panel de saldo (arriba izquierda) ──
    const saldoObjs = this._panelSaldo(this.layout.saldo.x, this.layout.saldo.y);
    this.editables.push({ nombre: 'saldo', x: this.layout.saldo.x, y: this.layout.saldo.y, objs: saldoObjs });

    // ── botón volver ──
    const volver = () => this.scene.start('RoomScene');
    const vb = this._botonClay(this.layout.volver.x, this.layout.volver.y, 76, 34, '← salir', 0xc88a4a);
    vb.zone.on('pointerdown', () => { if (!this.editMode) volver(); });
    this.editables.push({ nombre: 'volver', x: this.layout.volver.x, y: this.layout.volver.y, objs: [vb.g, vb.txt, vb.zone] });

    // ── pestañas de categoría ──
    this.tabRefs = [];
    const tabsObjs = this._crearTabs(this.layout.tabs.x, this.layout.tabs.y);
    this.editables.push({ nombre: 'tabs', x: this.layout.tabs.x, y: this.layout.tabs.y, objs: tabsObjs });

    // ── feedback de compra ──
    this.feedbackTxt = this.add.text(W / 2, H - 14, '', {
      fontSize: '13px', color: '#5a3a1a', fontFamily: FUENTE,
      backgroundColor: '#f5e3b8', padding: { x: 10, y: 5 }
    }).setOrigin(0.5, 1).setAlpha(0).setDepth(310);

    this.itemObjects = [];
    this._dibujarItems();

    if (!this.editMode) this.input.keyboard.on('keydown-ESC', volver);
    if (this.editMode) this._iniciarEditorTienda();
  }

  // ── layout de la tienda (posiciones, persistido) ──
  _layoutDefaultsTienda() {
    const { width: W, height: H } = this.scale;
    return {
      shelfY:  [Math.round(0.245 * H), Math.round(0.515 * H), Math.round(0.785 * H)],
      shelfX0: Math.round(0.16 * W),
      shelfX1: Math.round(0.84 * W),
      saldo:   { x: 78, y: 34 },
      tabs:    { x: Math.round(W / 2), y: 34 },
      volver:  { x: W - 52, y: 30 },
    };
  }

  _cargarLayout() {
    const def = this._layoutDefaultsTienda();
    try {
      const saved = JSON.parse(localStorage.getItem('store_layout') || '{}');
      Object.keys(saved).forEach(k => { if (def[k] !== undefined && saved[k] !== undefined) def[k] = saved[k]; });
    } catch (e) { /* default */ }
    return def;
  }

  _guardarLayout() {
    try { localStorage.setItem('store_layout', JSON.stringify(this.layout)); } catch (e) {}
  }

  // ── modo edición ──
  _iniciarEditorTienda() {
    const { width: W, height: H } = this.scale;
    this.add.rectangle(0, 0, W, 24, 0x000000, 0.6).setOrigin(0).setDepth(300);
    this.add.text(8, 12, '✏️ EDITOR — arrastrá estantes (líneas) y paneles · [E] exportar (F12) · [R] reset', {
      fontSize: '10px', color: '#ffffff', fontFamily: FUENTE
    }).setOrigin(0, 0.5).setDepth(301);

    // líneas de estante (Y) — arrastrar arriba/abajo
    this.shelfY.forEach((sy, i) => {
      const line = this.add.rectangle(W / 2, sy, W * 0.72, 4, 0x4fc3f7, 0.55).setDepth(250).setInteractive({ useHandCursor: true });
      this.input.setDraggable(line);
      const lbl = this.add.text(18, sy, `estante ${i + 1}`, {
        fontSize: '9px', color: '#0d0d1f', fontFamily: FUENTE, backgroundColor: '#4fc3f7', padding: { x: 3, y: 1 }
      }).setOrigin(0, 0.5).setDepth(251);
      line.on('drag', (p, dx, dy) => {
        line.y = dy; lbl.y = dy;
        this.shelfY[i] = dy; this.layout.shelfY[i] = Math.round(dy);
        this._guardarLayout(); this._dibujarItems();
      });
    });

    // bordes X (izq/der) — arrastrar a los lados
    [['shelfX0', 0xff7043], ['shelfX1', 0xff7043]].forEach(([k, col]) => {
      const line = this.add.rectangle(this[k], H / 2, 4, H * 0.7, col, 0.5).setDepth(250).setInteractive({ useHandCursor: true });
      this.input.setDraggable(line);
      line.on('drag', (p, dx) => {
        line.x = dx; this[k] = dx; this.layout[k] = Math.round(dx);
        this._guardarLayout(); this._dibujarItems();
      });
    });

    // paneles (saldo, tabs, volver) — arrastrar como grupo
    this.editables.forEach(ed => {
      const handle = this.add.rectangle(ed.x, ed.y, 60, 30, 0x4caf50, 0.12)
        .setStrokeStyle(2, 0x4caf50, 0.9).setDepth(260).setInteractive({ useHandCursor: true });
      this.input.setDraggable(handle);
      handle.on('drag', (p, dx, dy) => {
        const ddx = dx - handle.x, ddy = dy - handle.y;
        handle.x = dx; handle.y = dy;
        ed.objs.forEach(o => { o.x += ddx; o.y += ddy; });
        this.layout[ed.nombre] = { x: Math.round(dx), y: Math.round(dy) };
        this._guardarLayout();
      });
    });

    this.input.keyboard.on('keydown-E', () => {
      console.log('store_layout =', JSON.stringify(this.layout, null, 2));
      this._feedback('layout exportado a la consola (F12)', '#3c6a1e');
    });
    this.input.keyboard.on('keydown-R', () => {
      localStorage.removeItem('store_layout'); this.scene.restart();
    });
  }

  // ── helpers de estilo cálido ──
  _tagRedondo(cx, cy, w, h, fill, stroke, r = 8) {
    const g = this.add.graphics();
    g.fillStyle(fill, 1); g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, r);
    g.lineStyle(2, stroke, 1); g.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, r);
    return g;
  }

  // botón de plastilina: fondo redondo + texto + zona clickeable. devuelve {g, txt, zone}
  _botonClay(cx, cy, w, h, label, fill) {
    const g = this._tagRedondo(cx, cy, w, h, fill, 0x8a5a2a, 10);
    const txt = this.add.text(cx, cy, label, {
      fontSize: '12px', color: '#4a2e10', fontFamily: FUENTE
    }).setOrigin(0.5);
    const zone = this.add.rectangle(cx, cy, w, h, 0xffffff, 0).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => g.setAlpha(0.85));
    zone.on('pointerout',  () => g.setAlpha(1));
    return { g, txt, zone };
  }

  // panel de saldo anclado en (ax,ay) — devuelve sus objetos (para el editor)
  _panelSaldo(ax, ay) {
    const objs = [];
    objs.push(this._tagRedondo(ax, ay, 140, 44, 0xf7e7bd, 0xcaa05a, 12));
    const mk = SpriteConfig.get('ui', 'moneda');
    if (mk && this.textures.exists(mk)) objs.push(this.add.image(ax - 50, ay, mk).setDisplaySize(26, 26));
    else objs.push(this.add.text(ax - 58, ay, '🪙', { fontSize: '18px' }).setOrigin(0.5));
    this.saldoTxt = this.add.text(ax - 32, ay - 6, '', {
      fontSize: '15px', color: '#5a3a1a', fontFamily: FUENTE
    }).setOrigin(0, 0.5);
    objs.push(this.saldoTxt);
    objs.push(this.add.text(ax + 18, ay - 6, '💡', { fontSize: '13px' }).setOrigin(0, 0.5));
    this.pistasTxt = this.add.text(ax + 38, ay - 6, '', {
      fontSize: '13px', color: '#7a5a2a', fontFamily: FUENTE
    }).setOrigin(0, 0.5);
    objs.push(this.pistasTxt);
    this._refrescarSaldo();
    return objs;
  }

  _refrescarSaldo() {
    this.saldoTxt.setText(`${GameState.monedas}`);
    if (this.pistasTxt) this.pistasTxt.setText(`${GameState.pistas}`);
  }

  // ── pestañas — fila centrada en (cx, y); devuelve sus objetos ──
  _crearTabs(cx, y) {
    const n = TIENDA_CATS.length;
    const tabW = 78, gap = 8;
    const totalW = n * tabW + (n - 1) * gap;
    const startX = cx - totalW / 2 + tabW / 2;
    const objs = [];

    TIENDA_CATS.forEach((cat, i) => {
      const x = startX + i * (tabW + gap);
      const activa = cat.id === this.catActiva;
      const g = this._tagRedondo(x, y, tabW, 30, activa ? 0xffe9a8 : 0xead8a8,
        activa ? 0xc88a3a : 0xbfa878, 9);
      const txt = this.add.text(x, y, `${cat.icono} ${cat.label}`, {
        fontSize: '11px', color: activa ? '#6a4010' : '#9a8458', fontFamily: FUENTE
      }).setOrigin(0.5);
      const zone = this.add.rectangle(x, y, tabW, 30, 0xffffff, 0).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => { if (!this.editMode && cat.id !== this.catActiva) { this.catActiva = cat.id; this._cambiarTab(); } });
      this.tabRefs.push({ cat, g, txt });
      objs.push(g, txt, zone);
    });
    return objs;
  }

  _cambiarTab() {
    // redibuja la tienda con la categoría nueva (re-ejecuta create)
    this.scene.restart({ cat: this.catActiva });
  }

  // ── items sobre los estantes ──
  _dibujarItems() {
    this.itemObjects.forEach(o => o.destroy());
    this.itemObjects = [];

    const items = itemsDe(this.catActiva);
    const span = this.shelfX1 - this.shelfX0;
    const cxMid = (this.shelfX0 + this.shelfX1) / 2;

    // repartir items en los 3 estantes (round-robin) y centrar cada fila
    const estantes = [[], [], []];
    items.forEach((it, i) => estantes[i % 3].push(it));

    estantes.forEach((lista, s) => {
      const k = lista.length;
      if (!k) return;
      const slot = Math.min(190, span / k);
      const startX = cxMid - (slot * k) / 2 + slot / 2;
      lista.forEach((it, j) => this._itemEnEstante(it, startX + j * slot, this.shelfY[s]));
    });
  }

  _estado(item) {
    const comprado = item.unico && GameState.tieneDesbloqueo(item.id);
    if (comprado)             return { cls: 'comprado' };
    if (item.proximamente)    return { cls: 'proximamente' };
    if (GameState.monedas < item.precio) return { cls: 'sinSaldo' };
    return { cls: 'comprable' };
  }

  _itemEnEstante(item, cx, shelfTopY) {
    const st = this._estado(item);

    // ícono apoyado sobre el estante
    const icoY = shelfTopY - 30;
    const ico = SpriteConfig.colocar(this, 'muebles', item.mueble, cx, icoY,
      () => this.add.text(cx, icoY, item.icono, { fontSize: '36px' }).setOrigin(0.5));
    if (ico) {
      if (item.mueble && ico.setDisplaySize) ico.setDisplaySize(54, 54);
      if (st.cls === 'proximamente') ico.setAlpha(0.45);
      this.itemObjects.push(ico);
    }

    // cartelito de plastilina sobre el frente del estante
    const tagW = 124, tagH = 36, tagY = shelfTopY + 18;
    let fill = 0xf3e0ad, stroke = 0xb98a4a, infoTxt, infoCol = '#5a3a1a';
    if (st.cls === 'comprado')      { fill = 0xc9e6a8; stroke = 0x6fa84a; infoTxt = '✓ tuyo'; infoCol = '#3c6a1e'; }
    else if (st.cls === 'proximamente') { fill = 0xddd2bb; stroke = 0xb0a488; infoTxt = '🔒 pronto'; infoCol = '#8a7a58'; }
    else if (st.cls === 'sinSaldo') { infoTxt = `🪙 ${item.precio}`; infoCol = '#c0492a'; }
    else                            { infoTxt = `🪙 ${item.precio}`; infoCol = '#7a5a10'; }

    this.itemObjects.push(this._tagRedondo(cx, tagY, tagW, tagH, fill, stroke, 9));
    this.itemObjects.push(this.add.text(cx, tagY - 8, item.nombre, {
      fontSize: '10px', color: '#4a2e10', fontFamily: FUENTE
    }).setOrigin(0.5));

    // info: precio con moneda-imagen (plastilina), o estado (✓ tuyo / 🔒 pronto)
    if (st.cls === 'comprable' || st.cls === 'sinSaldo') {
      const mk = SpriteConfig.get('ui', 'moneda');
      if (mk && this.textures.exists(mk)) {
        this.itemObjects.push(this.add.image(cx - 14, tagY + 8, mk).setDisplaySize(16, 16));
      } else {
        this.itemObjects.push(this.add.text(cx - 14, tagY + 8, '🪙', { fontSize: '13px' }).setOrigin(0.5));
      }
      this.itemObjects.push(this.add.text(cx - 2, tagY + 8, `${item.precio}`, {
        fontSize: '12px', color: infoCol, fontFamily: FUENTE
      }).setOrigin(0, 0.5));
    } else {
      this.itemObjects.push(this.add.text(cx, tagY + 8, infoTxt, {
        fontSize: '11px', color: infoCol, fontFamily: FUENTE
      }).setOrigin(0.5));
    }

    // zona clickeable (ícono + cartel) solo si se puede comprar
    if (st.cls === 'comprable') {
      const top = icoY - 30, bot = tagY + tagH / 2;
      const zone = this.add.rectangle(cx, (top + bot) / 2, tagW, bot - top, 0xffffff, 0)
        .setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => this._comprar(item));
      zone.on('pointerover', () => ico && ico.setScale && ico.setScale(ico.scaleX * 1.08));
      this.itemObjects.push(zone);
    }
  }

  _comprar(item) {
    if (this.editMode) return;   // en el editor no se compra
    if (GameState.comprar(item)) {
      this._refrescarSaldo();
      this._dibujarItems();
      let extra = '';
      if (item.tipo === 'energia') extra = ` (+${item.cantidad} niveles hoy)`;
      else if (item.tipo === 'pista') extra = ` (+${item.cantidad} pistas)`;
      this._feedback(`✓ compraste ${item.nombre}${extra}`, '#3c6a1e');
    } else {
      this._feedback('no tienes monedas suficientes', '#c0492a');
    }
  }

  _feedback(msg, color) {
    this.feedbackTxt.setText(msg).setColor(color).setAlpha(1);
    this.tweens.killTweensOf(this.feedbackTxt);
    this.tweens.add({ targets: this.feedbackTxt, alpha: 0, delay: 1600, duration: 500 });
  }
}
