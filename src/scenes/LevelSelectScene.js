import GameState    from '../state/GameState.js';
import SpriteConfig, { FUENTE } from '../SpriteConfig.js';
import { CLAY, tagRedondo, panelClay, botonClay, estrellas } from '../ClayUI.js';
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

    // fondo: el mapa de plastilina
    SpriteConfig.fondo(this, 'select', width, height, 0xc8763f);   // fallback terracota

    this.HUD_H = this.isMobile ? 34 : 44;

    // Sin hoja de fondo: cada tier trae su propio panel, así el mapa se ve entre medio.

    // ── contenido scrolleable ──
    this.contenedor = this.add.container(0, 0);
    this._construirContenido();

    // ── barra fija arriba (por encima del contenido) ──
    this.add.rectangle(0, 0, width, this.HUD_H, CLAY.crema, 0.98).setOrigin(0);
    this.add.rectangle(0, this.HUD_H, width, 2, CLAY.bordeOscuro).setOrigin(0);
    this.add.text(12, this.HUD_H / 2, '🗺️  niveles', {
      fontSize: this.isMobile ? '14px' : '16px', color: CLAY.txt, fontFamily: FUENTE
    }).setOrigin(0, 0.5);

    const volver = () => {
      if (this.desde !== null) this.scene.start('PuzzleScene', { nivelIdx: this.desde });
      else this.scene.start('RoomScene');
    };
    const vb = botonClay(this, width - 52, this.HUD_H / 2, 76, 28, '← salir');
    vb.zone.on('pointerdown', volver);

    // toast de feedback
    this.toastTxt = this.add.text(width / 2, height - 12, '', {
      fontSize: '12px', color: CLAY.txt, fontFamily: FUENTE,
      backgroundColor: '#f5e3b8', padding: { x: 10, y: 5 }
    }).setOrigin(0.5, 1).setAlpha(0).setDepth(50);

    this._initScroll();
  }

  // ── construir tiers + conceptos + tarjetas ──
  // Cada tier es un panel de plastilina que envuelve su contenido; entre panel y
  // panel se ve el mapa del fondo. Las tarjetas van en grilla ocupando todo el ancho.
  _construirContenido() {
    const M = this.isMobile ? 8 : 22;         // margen exterior (lo que deja ver el mapa)
    const P = this.isMobile ? 10 : 16;        // padding interno del panel
    const G = this.isMobile ? 8 : 12;         // separación entre tarjetas

    this.cardH = this.isMobile ? 76 : 72;
    const anchoUtil = this.W - M * 2 - P * 2;

    // Cuántas tarjetas entran por fila, repartiendo el sobrante para llenar el ancho.
    // La resolución lógica es 800x600 siempre: en móvil la pantalla es físicamente más
    // chica, así que ahí las tarjetas van MÁS grandes (manos chiquitas), no más chicas.
    const cardMin = this.isMobile ? 205 : 170;
    this.perRow = Math.max(1, Math.floor((anchoUtil + G) / (cardMin + G)));
    this.cardW  = (anchoUtil - G * (this.perRow - 1)) / this.perRow;

    let y = this.HUD_H + 14;

    TIERS.forEach(tier => {
      const alto = this._altoDeTier(tier, P, G);

      // panel del tier (con sombra) — se dibuja antes que su contenido
      this.contenedor.add(panelClay(this, this.W / 2, y + alto / 2, this.W - M * 2, alto,
        CLAY.cremaClaro, CLAY.borde, 16, 0.92));

      const x0 = M + P;
      let cy = y + P;

      // cinta del tier: color saturado, con el nombre en blanco
      const cintaH = this.isMobile ? 28 : 32;
      this.contenedor.add(tagRedondo(this, this.W / 2, cy + cintaH / 2,
        this.W - M * 2 - P * 2, cintaH, tier.color, tier.color, 10, 0.9));
      this.contenedor.add(this.add.text(this.W / 2, cy + cintaH / 2, tier.nombre.toLowerCase(), {
        fontSize: this.isMobile ? '15px' : '17px', color: '#ffffff', fontFamily: FUENTE,
        stroke: '#00000033', strokeThickness: 2
      }).setOrigin(0.5));
      cy += cintaH + (this.isMobile ? 10 : 14);

      tier.conceptos.forEach(con => {
        this.contenedor.add(this.add.text(x0, cy, con.nombre, {
          fontSize: this.isMobile ? '13px' : '14px', color: CLAY.txt, fontFamily: FUENTE
        }).setOrigin(0, 0));
        this.contenedor.add(this.add.text(x0, cy + (this.isMobile ? 16 : 18), con.aprende, {
          fontSize: this.isMobile ? '9px' : '10px', color: CLAY.txtSuave, fontFamily: FUENTE
        }).setOrigin(0, 0));
        cy += this.isMobile ? 32 : 36;

        if (con.proximamente && con.niveles.length === 0) {
          cy += this._chipProximamente(x0, cy) + G;
        } else {
          con.niveles.forEach((idx, i) => {
            const col = i % this.perRow, fila = Math.floor(i / this.perRow);
            this._crearTarjeta(idx,
              x0 + col * (this.cardW + G),
              cy + fila * (this.cardH + G),
              this.cardW, this.cardH);
          });
          const filas = Math.ceil(con.niveles.length / this.perRow);
          cy += filas * (this.cardH + G) - G + (this.isMobile ? 10 : 14);
        }
      });

      y += alto + (this.isMobile ? 12 : 18);
    });

    this.contentBottom = y;
  }

  // alto exacto que va a ocupar un tier — se necesita ANTES de dibujarlo,
  // porque el panel se dibuja debajo de su propio contenido.
  _altoDeTier(tier, P, G) {
    let h = P * 2 + (this.isMobile ? 28 : 32) + (this.isMobile ? 10 : 14);   // padding + cinta
    tier.conceptos.forEach(con => {
      h += this.isMobile ? 32 : 36;                                          // nombre + "aprendés"
      if (con.proximamente && con.niveles.length === 0) {
        h += (this.isMobile ? 30 : 32) + G;
      } else {
        const filas = Math.ceil(con.niveles.length / this.perRow);
        h += filas * (this.cardH + G) - G + (this.isMobile ? 10 : 14);
      }
    });
    return h;
  }

  // chip "próximamente" con candado. Devuelve su alto.
  _chipProximamente(x, y) {
    const w = 132, h = this.isMobile ? 30 : 32;
    const objs = [tagRedondo(this, x + w / 2, y + h / 2, w, h, CLAY.offFill, CLAY.offBorde, 10)];
    const lk = SpriteConfig.colocar(this, 'ui', 'candado', x + 18, y + h / 2, null);
    if (lk) objs.push(lk.setDisplaySize(16, 16));
    objs.push(this.add.text(x + (lk ? 32 : 14), y + h / 2, 'próximamente', {
      fontSize: '11px', color: CLAY.txtOff, fontFamily: FUENTE
    }).setOrigin(0, 0.5));
    this.contenedor.add(objs);
    return h;
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

    // tarjeta de plastilina: bloqueada (beige), completada (verde) o disponible (crema)
    const fill   = !st.jugable ? CLAY.offFill  : st.completado ? CLAY.okFill  : CLAY.crema;
    const stroke = !st.jugable ? CLAY.offBorde : st.completado ? CLAY.okBorde : CLAY.borde;
    const txtCol = !st.jugable ? CLAY.txtOff   : st.completado ? CLAY.txtOk   : CLAY.txt;

    const cx = x + w / 2, cy = y + h / 2;
    const [sombra, cuerpo] = panelClay(this, cx, cy, w, h, fill, stroke, 12);
    const zona = this.add.rectangle(cx, cy, w, h, 0xffffff, 0)
      .setInteractive({ useHandCursor: true });

    const nombre = this.add.text(x + 12, y + 12, lvl.name, {
      fontSize: this.isMobile ? '12px' : '13px',
      color: txtCol, fontFamily: FUENTE,
      wordWrap: { width: w - 34 }
    }).setOrigin(0, 0);

    // los que se levantan al pasar por encima (la sombra se queda quieta)
    const movibles = [cuerpo, nombre];

    if (!st.jugable) {
      const lk = SpriteConfig.colocar(this, 'ui', 'candado', x + w - 20, y + 20, null);
      movibles.push(lk ? lk.setDisplaySize(22, 22)
                       : this.add.text(x + w - 12, y + 12, '🔒', { fontSize: '15px' }).setOrigin(1, 0));
    } else {
      movibles.push(...estrellas(this, x + 12, y + h - 16, st.estrellas, 17));
    }

    // posición base de cada uno, para que el hover sea absoluto y no acumule
    const baseY = movibles.map(o => o.y);
    const alzar = dy => movibles.forEach((o, i) => o.setY(baseY[i] + dy));

    zona.on('pointerup',   () => { if (!this._dragMoved) this._jugar(idx); });
    zona.on('pointerover', () => alzar(-3));
    zona.on('pointerout',  () => alzar(0));

    this.contenedor.add([sombra, cuerpo, zona, ...movibles.slice(1)]);
  }

  _jugar(idx) {
    const st = this._estadoNivel(idx);
    if (!st.desbloqueado) { this._toast('completá los niveles anteriores', CLAY.txt); return; }
    if (!st.packOk) {
      this._toast('desbloqueá el pack en la tienda 🛒', CLAY.txt);
      this.time.delayedCall(900, () => this.scene.start('StoreScene', { cat: 'niveles' }));
      return;
    }
    if (!st.completado && !GameState.puedeJugarHoy()) {
      this._toast('ya completaste tus niveles de hoy', '#c0492a'); return;
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
