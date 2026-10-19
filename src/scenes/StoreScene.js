import GameState        from '../state/GameState.js';
import Dev              from '../Dev.js';
import SpriteConfig, { FUENTE } from '../SpriteConfig.js';
import Sonido           from '../Sonido.js';
import {
  CLAY, losa, boton, icono, estiloTexto, entrarEscena, irA,
  respirar, sacudir, chispas, cartel, COLORES_FIESTA,
} from '../ClayUI.js';
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
    entrarEscena(this);

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
    const volver = () => irA(this, 'RoomScene');
    const vb = boton(this, this.layout.volver.x, this.layout.volver.y, {
      w: 58, fill: CLAY.azul, icono: 'casita', onTap: () => { if (!this.editMode) volver(); },
    }).setDepth(20);
    this.editables.push({ nombre: 'volver', x: this.layout.volver.x, y: this.layout.volver.y, objs: [vb] });

    // ── pestañas de categoría ──
    this.tabRefs = [];
    const tabsObjs = this._crearTabs(this.layout.tabs.x, this.layout.tabs.y);
    this.editables.push({ nombre: 'tabs', x: this.layout.tabs.x, y: this.layout.tabs.y, objs: tabsObjs });

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
      saldo:   { x: 100, y: 38 },
      tabs:    { x: Math.round(W / 2) + 20, y: 38 },
      volver:  { x: W - 44, y: 38 },
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

  // ── panel de saldo anclado en (ax,ay) — devuelve sus objetos (para el editor) ──
  _panelSaldo(ax, ay) {
    const c = this.add.container(ax, ay).setDepth(20);
    c.add(losa(this, 0, 0, 170, 54, { fill: CLAY.cremaClaro, r: 24, canto: 5, grosor: 3 }));
    const mk = SpriteConfig.get('ui', 'moneda');
    if (mk && this.textures.exists(mk)) c.add(this.add.image(-60, -3, mk).setDisplaySize(36, 36));
    this.saldoTxt = this.add.text(-38, -3, '', estiloTexto(22, '#ffd54a', '#8a5a10', 5)).setOrigin(0, 0.5);
    c.add(this.saldoTxt);
    const pk = SpriteConfig.get('ui', 'pista');
    if (pk && this.textures.exists(pk)) c.add(this.add.image(36, -3, pk).setDisplaySize(30, 30));
    this.pistasTxt = this.add.text(54, -3, '', estiloTexto(20, '#ffffff', '#5a7a2a', 4)).setOrigin(0, 0.5);
    c.add(this.pistasTxt);
    this.saldoBox = c;
    this._refrescarSaldo();
    return [c];
  }

  _refrescarSaldo() {
    this.saldoTxt.setText(`${GameState.monedas}`);
    if (this.pistasTxt) this.pistasTxt.setText(`${GameState.pistas}`);
  }

  // ── pestañas — sólo iconos; la activa es amarilla y más grande ──
  _crearTabs(cx, y) {
    const iconos = {
      energia: { imagen: 'energia' },
      niveles: { icono: 'mapa' },
      mejoras: { imagen: 'pista' },
      muebles: { imagen: SpriteConfig.get('muebles', 'sillon') || 'sillon' },
    };
    const n = TIENDA_CATS.length, paso = 78;
    const objs = [];
    TIENDA_CATS.forEach((cat, i) => {
      const x = cx + (i - (n - 1) / 2) * paso;
      const activa = cat.id === this.catActiva;
      const b = boton(this, x, y, {
        w: activa ? 68 : 58, fill: activa ? CLAY.amarillo : CLAY.cremaClaro,
        colorIcono: activa ? 0xffffff : CLAY.bordeOscuro, ...iconos[cat.id],
        onTap: () => { if (!this.editMode && cat.id !== this.catActiva) { this.catActiva = cat.id; this._cambiarTab(); } },
      }).setDepth(20);
      if (!activa) b.setAlpha(0.85);
      objs.push(b);
    });
    return objs;
  }

  _cambiarTab() {
    // redibuja la tienda con la categoría nueva (re-ejecuta create)
    this.scene.restart({ cat: this.catActiva });
  }

  // ── items sobre los estantes ──
  _dibujarItems() {
    this.itemObjects.forEach(o => { this.tweens.killTweensOf(o); o.destroy(); });
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
      const slot = Math.min(200, span / k);
      const startX = cxMid - (slot * k) / 2 + slot / 2;
      lista.forEach((it, j) => this._itemEnEstante(it, startX + j * slot, this.shelfY[s], slot));
    });
  }

  _estado(item) {
    const comprado = item.unico && GameState.tieneDesbloqueo(item.id);
    if (comprado)             return { cls: 'comprado' };
    if (item.proximamente)    return { cls: 'proximamente' };
    if (GameState.monedas < item.precio) return { cls: 'sinSaldo' };
    return { cls: 'comprable' };
  }

  // Dibujo del producto, apoyado sobre el estante. Devuelve un Container.
  // Lo que se compra se tiene que entender MIRANDO: un mueble es su dibujo, un
  // tablero es un tablerito con sus fichas, la energía es la pila con "+3".
  _dibujoItem(item, cx, baseY, tam) {
    const c = this.add.container(cx, baseY - tam / 2);
    const img = (key, s = tam) => {
      if (key && this.textures.exists(key)) { c.add(this.add.image(0, 0, key).setDisplaySize(s, s)); return true; }
      return false;
    };
    const mas = (n) => c.add(this.add.text(tam * 0.32, tam * 0.28, `+${n}`, estiloTexto(24, '#ffffff', '#5a3a1a', 6)).setOrigin(0.5));

    if (item.mueble) {
      if (!img(SpriteConfig.get('muebles', item.mueble), tam * 1.15)) c.add(this.add.text(0, 0, item.icono, { fontSize: `${tam * 0.6}px` }).setOrigin(0.5));
    } else if (item.tipo === 'energia') {
      img(SpriteConfig.get('ui', 'energia'), tam * 0.85); mas(item.cantidad);
    } else if (item.tipo === 'pista') {
      img(SpriteConfig.get('ui', 'pista'), tam * 0.85); mas(item.cantidad);
    } else if (item.tipo === 'pack' && (item.pack === 'tablero6' || item.pack === 'expertos')) {
      // tablerito de madera con N×N fichas de masa
      const N = item.pack === 'tablero6' ? 6 : 8;
      const W = tam * 0.95;
      c.add(losa(this, 0, 0, W, W + 6, { fill: CLAY.madera, r: 12, canto: 6, grosor: 3, brillo: 0.15 }));
      const g = this.add.graphics();
      const m = 7, cel = (W - m * 2) / N;
      for (let r = 0; r < N; r++) for (let q = 0; q < N; q++) {
        g.fillStyle(CLAY.ficha, 1);
        g.fillRoundedRect(-W / 2 + m + q * cel + 1, -W / 2 - 3 + m + r * cel + 1, cel - 2, cel - 2, Math.min(3, cel * 0.25));
      }
      c.add(g);
      c.add(this.add.text(0, -3, `${N}`, estiloTexto(30, '#ffffff', '#8a5a2a', 7)).setOrigin(0.5));
    } else {
      c.add(this.add.text(0, 0, item.icono, { fontSize: `${tam * 0.6}px` }).setOrigin(0.5));
    }
    return c;
  }

  _itemEnEstante(item, cx, shelfTopY, slot) {
    const st = this._estado(item);
    const tam = Math.min(104, slot * 0.7);

    const dib = this._dibujoItem(item, cx, shelfTopY - 2, tam);
    if (st.cls === 'proximamente') dib.setAlpha(0.4);
    this.itemObjects.push(dib);

    // etiqueta colgando del frente del estante: moneda + precio (o tilde / candado)
    const tagY = shelfTopY + 24;
    const fill = st.cls === 'comprado' ? CLAY.okFill : st.cls === 'proximamente' ? CLAY.offFill : CLAY.cremaClaro;
    const tagW = Math.min(104, slot - 8);
    const tag = this.add.container(cx, tagY);
    tag.add(losa(this, 0, 0, tagW, 44, { fill, r: 18, canto: 5, grosor: 3 }));
    if (st.cls === 'comprado') {
      tag.add(icono(this, 0, -3, 'check', 28, 0x4a8a34));
    } else if (st.cls === 'proximamente') {
      const lk = SpriteConfig.get('ui', 'candado');
      if (lk && this.textures.exists(lk)) tag.add(this.add.image(0, -3, lk).setDisplaySize(28, 28));
    } else {
      const mk = SpriteConfig.get('ui', 'moneda');
      if (mk && this.textures.exists(mk)) tag.add(this.add.image(-tagW / 2 + 22, -3, mk).setDisplaySize(24, 24));
      tag.add(this.add.text(-tagW / 2 + 38, -3, `${item.precio}`, estiloTexto(tagW < 100 ? 17 : 19,
        st.cls === 'sinSaldo' ? '#f0a090' : '#ffd54a', st.cls === 'sinSaldo' ? '#8a3a2a' : '#8a5a10', 4)).setOrigin(0, 0.5));
      if (st.cls === 'sinSaldo') tag.setAlpha(0.8);
    }
    this.itemObjects.push(tag);

    // nombre chiquito para el adulto
    this.itemObjects.push(this.add.text(cx, tagY + 30, item.nombre, {
      fontSize: '11px', color: '#fff6e0', fontFamily: FUENTE, stroke: '#5a3a1a', strokeThickness: 3,
    }).setOrigin(0.5));

    // lo comprable respira: "¡esto lo podés llevar!"
    if (st.cls === 'comprable') respirar(this, dib, 0.04, 800 + Math.random() * 300);

    // zona clickeable (dibujo + etiqueta)
    if (st.cls === 'comprable' || st.cls === 'sinSaldo') {
      const top = shelfTopY - tam - 8, bot = tagY + 22;
      const zone = this.add.rectangle(cx, (top + bot) / 2, Math.max(110, tam), bot - top, 0xffffff, 0)
        .setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => this._comprar(item, dib, tag));
      this.itemObjects.push(zone);
    }
  }

  _comprar(item, dib, tag) {
    if (this.editMode) return;   // en el editor no se compra
    if (GameState.comprar(item)) {
      Sonido.moneda();
      this.time.delayedCall(140, () => Sonido.victoria());
      // las monedas vuelan del saldo al producto
      const mk = SpriteConfig.get('ui', 'moneda');
      for (let i = 0; i < 6 && mk && this.textures.exists(mk); i++) {
        const m = this.add.image(this.saldoBox.x - 60, this.saldoBox.y, mk).setDisplaySize(26, 26).setDepth(300);
        this.tweens.add({ targets: m, x: dib.x, y: dib.y, duration: 420, delay: i * 50, ease: 'Quad.easeIn',
          onComplete: () => m.destroy() });
      }
      this.time.delayedCall(480, () => {
        if (!this.scene.isActive()) return;
        chispas(this, dib.x, dib.y, COLORES_FIESTA, { cantidad: 26, velocidad: 180, depth: 300 });
        this._refrescarSaldo();
        this._dibujarItems();
      });
    } else {
      Sonido.error();
      sacudir(this, tag);
      sacudir(this, this.saldoBox, 5);
    }
  }

  _feedback(msg, color) {
    cartel(this, this.scale.width / 2, this.scale.height - 40, msg, { color });
  }
}
