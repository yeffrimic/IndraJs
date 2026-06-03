import GameState    from '../state/GameState.js';
import SpriteConfig from '../SpriteConfig.js';
import { LEVELS, TIERS, packRequerido } from '../levels.js';

export default class LevelSelectScene extends Phaser.Scene {
  constructor() { super('LevelSelectScene'); }

  init(data) {
    this.desde = (data && data.desde !== undefined) ? data.desde : null;
  }

  create() {
    const { width, height } = this.scale;
    this.W = width; this.H = height;
    this.isMobile = window.isMobile || false;

    // fondo (placeholder → pixel art)
    SpriteConfig.fondo(this, 'select', width, height, 0x0d0d1f);

    this.HUD_H = this.isMobile ? 34 : 44;

    // ── contenido scrolleable ──
    this.contenedor = this.add.container(0, 0);
    this._construirContenido();

    // ── barra fija arriba (por encima del contenido) ──
    this.add.rectangle(0, 0, width, this.HUD_H, 0x080814, 0.98).setOrigin(0);
    this.add.rectangle(0, this.HUD_H, width, 1, 0x2a2a4a).setOrigin(0);
    this.add.text(12, this.HUD_H / 2, '☰ NIVELES', {
      fontSize: this.isMobile ? '13px' : '15px', color: '#4fc3f7', fontFamily: 'monospace'
    }).setOrigin(0, 0.5);

    const volBg = this.add.rectangle(width - 8, this.HUD_H / 2, 66, 22, 0x12122a)
      .setStrokeStyle(1, 0x4fc3f7).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
    const volTxt = this.add.text(width - 41, this.HUD_H / 2, 'volver', {
      fontSize: '11px', color: '#4fc3f7', fontFamily: 'monospace'
    }).setOrigin(0.5);
    const volver = () => {
      if (this.desde !== null) this.scene.start('PuzzleScene', { nivelIdx: this.desde });
      else this.scene.start('RoomScene');
    };
    volBg.on('pointerdown', volver);
    volTxt.setInteractive({ useHandCursor: true }).on('pointerdown', volver);

    // toast de feedback
    this.toastTxt = this.add.text(width / 2, height - 12, '', {
      fontSize: '11px', color: '#888', fontFamily: 'monospace',
      backgroundColor: '#080814', padding: { x: 10, y: 5 }
    }).setOrigin(0.5, 1).setAlpha(0);

    this._initScroll();
  }

  // ── construir tiers + conceptos + tarjetas ──
  _construirContenido() {
    const m = this.isMobile ? 12 : 40;
    let y = this.HUD_H + 16;

    TIERS.forEach(tier => {
      // encabezado del tier
      const band = this.add.rectangle(0, y, this.W, 28, tier.color, 0.14).setOrigin(0, 0);
      const bar  = this.add.rectangle(0, y, 4, 28, tier.color).setOrigin(0, 0);
      const tcol = `#${tier.color.toString(16).padStart(6, '0')}`;
      const tname = this.add.text(m, y + 14, tier.nombre.toUpperCase(), {
        fontSize: this.isMobile ? '13px' : '15px', color: tcol, fontFamily: 'monospace'
      }).setOrigin(0, 0.5);
      this.contenedor.add([band, bar, tname]);
      y += 38;

      // conceptos (subdivisiones)
      tier.conceptos.forEach(con => {
        const cn = this.add.text(m, y, `• ${con.nombre}`, {
          fontSize: this.isMobile ? '12px' : '13px', color: '#e0e0e0', fontFamily: 'monospace'
        }).setOrigin(0, 0);
        const ca = this.add.text(m + 14, y + (this.isMobile ? 16 : 18), `aprendés: ${con.aprende}`, {
          fontSize: this.isMobile ? '9px' : '10px', color: '#777', fontFamily: 'monospace'
        }).setOrigin(0, 0);
        this.contenedor.add([cn, ca]);
        y += this.isMobile ? 34 : 38;

        // tarjetas de niveles del concepto (o chip "próximamente")
        if (con.proximamente && con.niveles.length === 0) {
          const chip = this.add.text(m + 14, y, '🔒 próximamente', {
            fontSize: '11px', color: '#666', fontFamily: 'monospace',
            backgroundColor: '#12122a', padding: { x: 10, y: 6 }
          }).setOrigin(0, 0);
          this.contenedor.add(chip);
          y += this.isMobile ? 40 : 46;
        } else {
          const cardW = this.isMobile ? 132 : 168;
          const cardH = this.isMobile ? 52 : 58;
          const gap   = this.isMobile ? 8 : 12;
          con.niveles.forEach((idx, i) => {
            this._crearTarjeta(idx, m + 14 + i * (cardW + gap), y, cardW, cardH);
          });
          y += cardH + (this.isMobile ? 12 : 16);
        }
      });
      y += 10;
    });

    this.contentBottom = y;
  }

  _estadoNivel(idx) {
    const desbloqueado = idx <= GameState.ultimoNivelDesbloqueado;
    const pack = packRequerido(idx);
    const packOk = !pack || GameState.tieneDesbloqueo(pack);
    const completado = GameState.nivelesCompletados.includes(idx);
    const estrellas = GameState.estrellas[idx] || 0;
    return { desbloqueado, pack, packOk, completado, estrellas, jugable: desbloqueado && packOk };
  }

  _crearTarjeta(idx, x, y, w, h) {
    const lvl = LEVELS[idx];
    if (!lvl) return;
    const st = this._estadoNivel(idx);

    const borde = !st.jugable ? 0x333355 : st.completado ? 0x4caf50 : 0x4fc3f7;
    const bgCol = st.completado ? 0x0a1e0a : 0x12122a;
    const bg = this.add.rectangle(x, y, w, h, bgCol).setOrigin(0, 0)
      .setStrokeStyle(1.5, borde).setInteractive({ useHandCursor: true });

    const nombre = this.add.text(x + 10, y + 10, lvl.name, {
      fontSize: this.isMobile ? '11px' : '12px',
      color: st.jugable ? '#fff' : '#666', fontFamily: 'monospace',
      wordWrap: { width: w - 20 }
    }).setOrigin(0, 0);

    const items = [bg, nombre];

    if (!st.jugable) {
      const lock = this.add.text(x + w - 10, y + 10, '🔒', { fontSize: '14px' }).setOrigin(1, 0);
      items.push(lock);
    } else {
      const stars = '★'.repeat(st.estrellas) + '☆'.repeat(3 - st.estrellas);
      const stTxt = this.add.text(x + 10, y + h - 9, stars, {
        fontSize: '13px', color: '#fff176', fontFamily: 'monospace'
      }).setOrigin(0, 0.5);
      items.push(stTxt);
    }

    bg.on('pointerup', () => { if (!this._dragMoved) this._jugar(idx); });
    this.contenedor.add(items);
  }

  _jugar(idx) {
    const st = this._estadoNivel(idx);
    if (!st.desbloqueado) { this._toast('completá los niveles anteriores', '#fff176'); return; }
    if (!st.packOk) {
      this._toast('desbloqueá el pack en la tienda 🛒', '#fff176');
      this.time.delayedCall(900, () => this.scene.start('StoreScene', { cat: 'niveles' }));
      return;
    }
    if (!st.completado && !GameState.puedeJugarHoy()) {
      this._toast('ya completaste tus niveles de hoy', '#ef5350'); return;
    }
    this.scene.start('PuzzleScene', { nivelIdx: idx });
  }

  _toast(msg, color) {
    this.toastTxt.setText(msg).setColor(color).setAlpha(1);
    this.tweens.killTweensOf(this.toastTxt);
    this.tweens.add({ targets: this.toastTxt, alpha: 0, delay: 1500, duration: 500 });
  }

  // ── scroll (rueda + arrastre + flechas) ──
  _initScroll() {
    this.maxScroll = Math.max(0, this.contentBottom + 16 - this.H);
    this._dragMoved = false;

    this.input.on('wheel', (p, over, dx, dy) => this._scrollTo(this.contenedor.y - dy));

    let startY = 0, baseY = 0, down = false;
    this.input.on('pointerdown', p => { down = true; startY = p.y; baseY = this.contenedor.y; this._dragMoved = false; });
    this.input.on('pointermove', p => {
      if (!down) return;
      const d = p.y - startY;
      if (Math.abs(d) > 6) this._dragMoved = true;
      this._scrollTo(baseY + d);
    });
    this.input.on('pointerup', () => { down = false; });

    const cursors = this.input.keyboard.createCursorKeys();
    this.input.keyboard.on('keydown-DOWN', () => this._scrollTo(this.contenedor.y - 40));
    this.input.keyboard.on('keydown-UP',   () => this._scrollTo(this.contenedor.y + 40));
    this.cursors = cursors;
  }

  _scrollTo(yy) {
    this.contenedor.y = Phaser.Math.Clamp(yy, -this.maxScroll, 0);
  }
}
