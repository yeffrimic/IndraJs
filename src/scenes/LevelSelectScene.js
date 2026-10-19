import GameState    from '../state/GameState.js';
import SpriteConfig, { FUENTE } from '../SpriteConfig.js';
import Sonido       from '../Sonido.js';
import {
  CLAY, losa, boton, estrella, estiloTexto, hex, oscurecer, aclarar,
  entrarEscena, irA, respirar, sacudir, cartel,
} from '../ClayUI.js';
import { LEVELS, TIERS, packRequerido } from '../levels.js';

// Selector de niveles como MAPA: cada nivel es una piedra redonda con su número,
// unidas por un caminito que serpentea (una fila va a la derecha, la siguiente
// vuelve). Antes era una lista de tarjetas con títulos y subtítulos ("conectar
// batería → resistencia → LED"): un temario, no un juego.
//
// Estados de cada piedra, leídos por color y no por texto:
//   verde + estrellas  = hecho
//   naranja latiendo   = el que toca (con el personaje parado arriba)
//   naranja            = disponible
//   gris + candado     = todavía no

export default class LevelSelectScene extends Phaser.Scene {
  constructor() { super('LevelSelectScene'); }

  init(data) {
    this.desde = (data && data.desde !== undefined) ? data.desde : null;
  }

  create() {
    const { width, height } = this.scale;
    this.W = width; this.H = height;
    this.isMobile = window.isMobile || false;
    entrarEscena(this);

    // fondo: el mapa de plastilina
    SpriteConfig.fondo(this, 'select', width, height, 0xc8763f);   // fallback terracota

    this.HUD_H = 76;

    // ── contenido scrolleable ──
    this.contenedor = this.add.container(0, 0);
    this._construirContenido();

    // ── barra fija arriba (por encima del contenido) ──
    const barra = this.add.graphics().setDepth(40);
    barra.fillStyle(0x3a2410, 0.25); barra.fillRect(0, this.HUD_H - 2, width, 6);
    barra.fillStyle(CLAY.crema, 0.97); barra.fillRect(0, 0, width, this.HUD_H - 4);
    barra.fillStyle(CLAY.borde, 1);    barra.fillRect(0, this.HUD_H - 6, width, 4);

    const volver = () => {
      if (this.desde !== null) irA(this, 'PuzzleScene', { nivelIdx: this.desde });
      else irA(this, 'RoomScene');
    };
    boton(this, 42, 36, { w: 58, fill: CLAY.azul, icono: this.desde !== null ? 'atras' : 'casita', onTap: volver }).setDepth(41);

    // total de estrellas: lo único "numérico" del mapa, y va con su icono
    const tot = this.add.container(width / 2, 34).setDepth(41);
    tot.add(losa(this, 0, 0, 150, 52, { fill: CLAY.cremaClaro, r: 22, canto: 5, grosor: 3 }));
    tot.add(estrella(this, -44, -3, true, 38));
    tot.add(this.add.text(-18, -3, `${GameState.totalEstrellas()}`, estiloTexto(24, '#ffffff', '#8a5a10', 5)).setOrigin(0, 0.5));

    this.input.keyboard.on('keydown-ESC', volver);
    this._initScroll();
    this._scrollAlActual();
  }

  // ── construir tiers con su caminito de piedras ──
  _construirContenido() {
    const M = 22;                 // margen exterior (lo que deja ver el mapa)
    const P = 18;                 // padding interno del panel
    this.NODO   = 74;             // diámetro de cada piedra
    this.FILA_H = 128;            // alto de cada fila (piedra + estrellas + aire)
    const anchoUtil = this.W - M * 2 - P * 2;
    this.porFila = Math.max(3, Math.floor(anchoUtil / 118));
    this.pasoX   = anchoUtil / this.porFila;

    let y = this.HUD_H + 18;
    this.nodoActualY = null;

    TIERS.forEach(tier => {
      const niveles = tier.conceptos.flatMap(c => c.niveles);
      const proximamente = tier.conceptos.some(c => c.proximamente && c.niveles.length === 0);
      const n = niveles.length + (proximamente ? 1 : 0);
      const filas = Math.ceil(n / this.porFila);
      const cintaH = 40;
      const alto = P + cintaH + 14 + filas * this.FILA_H + P - 18;

      // panel del tier
      this.contenedor.add(losa(this, this.W / 2, y + alto / 2, this.W - M * 2, alto,
        { fill: CLAY.cremaClaro, borde: CLAY.borde, r: 28, canto: 8, grosor: 4, brillo: 0.12 }));

      // cinta con el color del tier (el nombre queda para el adulto)
      const cinta = losa(this, this.W / 2, y + P + cintaH / 2, this.W - M * 2 - P * 2, cintaH,
        { fill: tier.color, r: 18, canto: 5, grosor: 3, sombra: 0 });
      this.contenedor.add(cinta);
      this.contenedor.add(this.add.text(this.W / 2, y + P + cintaH / 2 - 3, tier.nombre.toLowerCase(),
        estiloTexto(18, '#ffffff', hex(oscurecer(tier.color, 0.45)), 4)).setOrigin(0.5));

      // posiciones en zigzag: fila par →, fila impar ←
      const x0 = M + P;
      const yFilas = y + P + cintaH + 14;
      const pos = [];
      for (let i = 0; i < n; i++) {
        const fila = Math.floor(i / this.porFila);
        let col = i % this.porFila;
        if (fila % 2 === 1) col = this.porFila - 1 - col;
        pos.push({ x: x0 + this.pasoX * col + this.pasoX / 2, y: yFilas + fila * this.FILA_H + this.NODO / 2 + 4 });
      }

      // caminito de piedritas entre nodos (debajo de todo)
      const camino = this.add.graphics();
      for (let i = 0; i < n - 1; i++) {
        const a = pos[i], b = pos[i + 1];
        const L = Math.hypot(b.x - a.x, b.y - a.y);
        const pasos = Math.max(2, Math.floor(L / 16));
        for (let k = 1; k < pasos; k++) {
          const t = k / pasos;
          // la vuelta entre filas se curva un poco hacia afuera
          const curva = (a.y !== b.y) ? Math.sin(t * Math.PI) * 26 * (a.x > this.W / 2 ? 1 : -1) : 0;
          const px = a.x + (b.x - a.x) * t + curva, py = a.y + (b.y - a.y) * t;
          camino.fillStyle(oscurecer(CLAY.borde, 0.8), 1); camino.fillCircle(px, py + 2, 4.5);
          camino.fillStyle(CLAY.crema, 1);                 camino.fillCircle(px, py, 4.5);
        }
      }
      this.contenedor.add(camino);

      niveles.forEach((idx, i) => this._crearNodo(idx, pos[i].x, pos[i].y));
      if (proximamente) this._nodoProximamente(pos[n - 1].x, pos[n - 1].y);

      y += alto + 22;
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

  _crearNodo(idx, x, y) {
    const lvl = LEVELS[idx];
    if (!lvl) return;
    const st = this._estadoNivel(idx);
    const esActual = st.jugable && !st.completado && idx === GameState.ultimoNivelDesbloqueado;
    const D = this.NODO;

    const fill = !st.jugable ? CLAY.offFill : st.completado ? CLAY.verde : CLAY.naranja;
    const b = boton(this, x, y, {
      w: D, fill, texto: st.jugable ? `${idx + 1}` : null, tamTexto: 28,
      icono: null, sonido: st.jugable ? 'pop' : null,
      permitir: () => !this._dragMoved,
      onTap: () => this._jugar(idx, b),
    });
    this.contenedor.add(b);

    if (!st.jugable) {
      const lk = SpriteConfig.get('ui', 'candado');
      if (lk && this.textures.exists(lk)) b.add(this.add.image(0, -4, lk).setDisplaySize(D * 0.5, D * 0.5));
      else b.add(this.add.text(0, -4, '🔒', { fontSize: '26px' }).setOrigin(0.5));
    } else if (st.completado) {
      // estrellas en arco debajo de la piedra
      for (let i = 0; i < 3; i++) {
        const sx = x + (i - 1) * 24, sy = y + D / 2 + 10 - (i === 1 ? 4 : 0);
        this.contenedor.add(estrella(this, sx, sy, i < st.estrellas, 24));
      }
    }

    if (esActual) {
      this.nodoActualY = y;
      respirar(this, b, 0.07, 650);
      // el personaje del chico parado sobre "su" nivel
      const pose = SpriteConfig.pose(GameState.personaje || 'nino', 'abajo');
      if (pose && this.textures.exists(pose.key)) {
        const pj = this.add.image(x + D * 0.42, y - D * 0.32, pose.key).setOrigin(0.5, pose.anclaY);
        pj.setScale(62 / pose.altoFigura);
        this.contenedor.add(pj);
        this.tweens.add({ targets: pj, y: pj.y - 8, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    }
  }

  _nodoProximamente(x, y) {
    const D = this.NODO;
    const g = losa(this, x, y, D, D, { fill: CLAY.offFill, r: D / 2, canto: 6, grosor: 3 }).setAlpha(0.7);
    this.contenedor.add(g);
    this.contenedor.add(this.add.text(x, y - 4, '?', estiloTexto(30, '#ffffff', hex(CLAY.offBorde), 4)).setOrigin(0.5));
  }

  _jugar(idx, nodo) {
    const st = this._estadoNivel(idx);
    if (!st.desbloqueado) {
      Sonido.error(); sacudir(this, nodo);
      return;
    }
    if (!st.packOk) {
      // tablero sin comprar: a la tienda, a la pestaña de tableros
      Sonido.error(); sacudir(this, nodo);
      cartel(this, this.W / 2, this.H - 50, '🔒 → 🛒');
      this.time.delayedCall(800, () => irA(this, 'StoreScene', { cat: 'niveles' }));
      return;
    }
    if (!st.completado && !GameState.puedeJugarHoy()) {
      Sonido.error(); sacudir(this, nodo);
      cartel(this, this.W / 2, this.H - 50, '🌙  ¡mañana más!');
      return;
    }
    irA(this, 'PuzzleScene', { nivelIdx: idx });
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
      if (Math.abs(d) > 8) this._dragMoved = true;
      if (this._dragMoved) this._scrollTo(baseY + d);
    });
    this.input.on('pointerup', () => { down = false; });

    this.input.keyboard.on('keydown-DOWN', () => this._scrollTo(this.contenedor.y - 60));
    this.input.keyboard.on('keydown-UP',   () => this._scrollTo(this.contenedor.y + 60));
  }

  _scrollTo(yy) {
    this.contenedor.y = Phaser.Math.Clamp(yy, -this.maxScroll, 0);
  }

  // arrancar mostrando el nivel que toca, no siempre el principio
  _scrollAlActual() {
    if (this.nodoActualY === null) return;
    this._scrollTo(-(this.nodoActualY - this.H / 2));
  }
}
