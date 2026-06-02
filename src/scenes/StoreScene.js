import GameState        from '../state/GameState.js';
import { TIENDA_CATS, itemsDe } from '../tienda.js';

export default class StoreScene extends Phaser.Scene {
  constructor() { super('StoreScene'); }

  init(data) {
    this.catActiva = (data && data.cat) || TIENDA_CATS[0].id;
  }

  create() {
    const { width, height } = this.scale;
    this.isMobile = window.isMobile || false;

    // ── fondo ──
    this.add.rectangle(0, 0, width, height, 0x0d0d1f).setOrigin(0);

    // ── barra superior (HUD) ──
    const HUD_H = this.isMobile ? 32 : 40;
    this.add.rectangle(0, 0, width, HUD_H, 0x080814).setOrigin(0);
    this.add.rectangle(0, HUD_H, width, 1, 0x2a2a4a).setOrigin(0);

    this.add.text(12, HUD_H / 2, '🛒 TIENDA', {
      fontSize: this.isMobile ? '12px' : '14px', color: '#4fc3f7', fontFamily: 'monospace'
    }).setOrigin(0, 0.5);

    // saldo de monedas (centro)
    this.saldoTxt = this.add.text(width / 2, HUD_H / 2, '', {
      fontSize: this.isMobile ? '13px' : '15px', color: '#fff176', fontFamily: 'monospace'
    }).setOrigin(0.5);

    // botón volver (derecha)
    const volBg = this.add.rectangle(width - 8, HUD_H / 2, 64, 22, 0x12122a)
      .setStrokeStyle(1, 0x4fc3f7).setOrigin(1, 0.5)
      .setInteractive({ useHandCursor: true });
    const volTxt = this.add.text(width - 40, HUD_H / 2, 'volver', {
      fontSize: '11px', color: '#4fc3f7', fontFamily: 'monospace'
    }).setOrigin(0.5);
    const volver = () => this.scene.start('RoomScene');
    volBg.on('pointerover', () => volBg.setFillStyle(0x1a1a3a));
    volBg.on('pointerout',  () => volBg.setFillStyle(0x12122a));
    volBg.on('pointerdown', volver);
    volTxt.setInteractive({ useHandCursor: true }).on('pointerdown', volver);

    // ── tabs de categoría ──
    this.tabsY = HUD_H + (this.isMobile ? 18 : 26);
    this.tabRefs = [];
    this._crearTabs(width);

    // ── zona de items ──
    this.itemsTop = this.tabsY + (this.isMobile ? 22 : 30);
    this.itemObjects = [];

    // mensaje de feedback (compra/sin saldo)
    this.feedbackTxt = this.add.text(width / 2, height - 12, '', {
      fontSize: '11px', color: '#888', fontFamily: 'monospace'
    }).setOrigin(0.5, 1).setAlpha(0);

    this._refrescarSaldo();
    this._dibujarItems();

    // ESC / atrás también vuelve
    this.input.keyboard.on('keydown-ESC', volver);
  }

  _refrescarSaldo() {
    this.saldoTxt.setText(`🪙 ${GameState.monedas}`);
  }

  // ── tabs ──
  _crearTabs(width) {
    const n = TIENDA_CATS.length;
    const gap = this.isMobile ? 6 : 10;
    const tabW = Math.min(this.isMobile ? 96 : 150, (width - 24 - gap * (n - 1)) / n);
    const totalW = n * tabW + (n - 1) * gap;
    const startX = (width - totalW) / 2;

    TIENDA_CATS.forEach((cat, i) => {
      const x = startX + i * (tabW + gap) + tabW / 2;
      const activa = cat.id === this.catActiva;
      const bg = this.add.rectangle(x, this.tabsY, tabW, this.isMobile ? 24 : 30,
        activa ? 0x1a1a3a : 0x12122a)
        .setStrokeStyle(activa ? 1.5 : 1, activa ? 0x4fc3f7 : 0x2a2a4a)
        .setInteractive({ useHandCursor: true });
      const txt = this.add.text(x, this.tabsY, `${cat.icono} ${cat.label}`, {
        fontSize: this.isMobile ? '10px' : '12px',
        color: activa ? '#4fc3f7' : '#888', fontFamily: 'monospace'
      }).setOrigin(0.5);

      const ir = () => { if (cat.id !== this.catActiva) { this.catActiva = cat.id; this._cambiarTab(); } };
      bg.on('pointerdown', ir);
      txt.setInteractive({ useHandCursor: true }).on('pointerdown', ir);
      this.tabRefs.push({ cat, bg, txt });
    });
  }

  _cambiarTab() {
    this.tabRefs.forEach(({ cat, bg, txt }) => {
      const activa = cat.id === this.catActiva;
      bg.setFillStyle(activa ? 0x1a1a3a : 0x12122a);
      bg.setStrokeStyle(activa ? 1.5 : 1, activa ? 0x4fc3f7 : 0x2a2a4a);
      txt.setColor(activa ? '#4fc3f7' : '#888');
    });
    this._dibujarItems();
  }

  // ── items ──
  _dibujarItems() {
    // limpiar tarjetas previas
    this.itemObjects.forEach(o => o.destroy());
    this.itemObjects = [];

    const { width, height } = this.scale;
    const items = itemsDe(this.catActiva);

    const cols    = this.isMobile ? 2 : 2;
    const cardW   = this.isMobile ? (width - 36) / cols : Math.min(300, (width - 60) / cols);
    const cardH   = this.isMobile ? 96 : 120;
    const gapX    = this.isMobile ? 12 : 20;
    const gapY    = this.isMobile ? 10 : 16;
    const totalW  = cols * cardW + (cols - 1) * gapX;
    const startX  = (width - totalW) / 2;

    items.forEach((item, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardW + gapX);
      const y = this.itemsTop + row * (cardH + gapY);
      this._crearTarjeta(item, x, y, cardW, cardH);
    });
  }

  _crearTarjeta(item, x, y, w, h) {
    const comprado = item.unico && GameState.tieneDesbloqueo(item.id);

    // fondo
    const bg = this.add.rectangle(x, y, w, h, 0x12122a).setOrigin(0)
      .setStrokeStyle(1, comprado ? 0x4caf50 : 0x2a2a4a);
    this.itemObjects.push(bg);

    // ícono (placeholder emoji — futuro: SpriteConfig)
    const ico = this.add.text(x + 14, y + 12, item.icono, { fontSize: '22px' }).setOrigin(0, 0);
    this.itemObjects.push(ico);

    // nombre
    const nom = this.add.text(x + 46, y + 14, item.nombre, {
      fontSize: this.isMobile ? '12px' : '13px', color: '#fff', fontFamily: 'monospace'
    }).setOrigin(0, 0);
    this.itemObjects.push(nom);

    // descripción
    const desc = this.add.text(x + 46, y + 32, item.desc, {
      fontSize: '9px', color: '#777', fontFamily: 'monospace',
      wordWrap: { width: w - 56 }
    }).setOrigin(0, 0);
    this.itemObjects.push(desc);

    // precio
    const precio = this.add.text(x + 14, y + h - 16, `🪙 ${item.precio}`, {
      fontSize: '12px', color: '#fff176', fontFamily: 'monospace'
    }).setOrigin(0, 0.5);
    this.itemObjects.push(precio);

    // botón / estado (esquina inferior derecha)
    const btnW = this.isMobile ? 86 : 100, btnH = 24;
    const btnX = x + w - btnW - 10, btnY = y + h - 28;

    let label, col, interactivo = false;
    if (comprado)            { label = '✓ comprado';   col = 0x4caf50; }
    else if (item.proximamente) { label = 'próximamente'; col = 0x555555; }
    else if (GameState.monedas < item.precio) { label = 'sin saldo'; col = 0xef5350; }
    else                     { label = '[ comprar ]';  col = 0x4fc3f7; interactivo = true; }

    const colStr = `#${col.toString(16).padStart(6, '0')}`;
    const btnBg = this.add.rectangle(btnX, btnY, btnW, btnH, 0x0d0d1f).setOrigin(0)
      .setStrokeStyle(1, col);
    const btnTxt = this.add.text(btnX + btnW / 2, btnY + btnH / 2, label, {
      fontSize: '11px', color: colStr, fontFamily: 'monospace'
    }).setOrigin(0.5);
    this.itemObjects.push(btnBg, btnTxt);

    if (interactivo) {
      btnBg.setInteractive({ useHandCursor: true });
      btnBg.on('pointerover', () => btnBg.setFillStyle(0x1a1a3a));
      btnBg.on('pointerout',  () => btnBg.setFillStyle(0x0d0d1f));
      btnBg.on('pointerdown', () => this._comprar(item));
    }
  }

  _comprar(item) {
    const ok = GameState.comprar(item);
    if (ok) {
      this._refrescarSaldo();
      this._dibujarItems();
      let extra = '';
      if (item.tipo === 'energia') extra = ` (+${item.cantidad} niveles hoy)`;
      else if (item.tipo === 'pista') extra = ` (+${item.cantidad} pistas)`;
      this._feedback(`✓ compraste ${item.nombre}${extra}`, '#4caf50');
    } else {
      this._feedback('no tienes monedas suficientes', '#ef5350');
    }
  }

  _feedback(msg, color) {
    this.feedbackTxt.setText(msg).setColor(color).setAlpha(1);
    this.tweens.killTweensOf(this.feedbackTxt);
    this.tweens.add({
      targets: this.feedbackTxt, alpha: 0, delay: 1600, duration: 500
    });
  }
}
