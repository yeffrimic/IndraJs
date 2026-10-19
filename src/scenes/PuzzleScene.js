import GameState    from '../state/GameState.js';
import SpriteConfig, { FUENTE } from '../SpriteConfig.js';
import Sonido       from '../Sonido.js';
import { LEVELS, packRequerido } from '../levels.js';
import { PASO, NIVELES_TUTORIAL, mano } from '../Tutorial.js';
import {
  CLAY, losa, boton, insignia, botonSonido, estrella, estiloTexto, hex, oscurecer, aclarar,
  entrarEscena, irA, confeti, chispas, asegurarTexturas, aparecer, respirar, sacudir, COLORES_FIESTA, toque,
} from '../ClayUI.js';

// Colores de la serpiente de plastilina (combinan con assets/snake_head.png)
const SERP = { cuerpo: 0x6cbf54, contorno: 0x3d7a33, energia: 0xffe45c };

// Profundidades de dibujo — de abajo hacia arriba
const Z = {
  fondo: 0, tablero: 1, camino: 5, serpiente: 10, energia: 11,
  aura: 21, comp: 22, carga: 25, compArriba: 26, chip: 27, cabeza: 30, zona: 40,
  particulas: 100, hud: 150, manito: 200, panel: 300,
};

export default class PuzzleScene extends Phaser.Scene {
  constructor() { super('PuzzleScene'); }

  init(data) {
    this.nivelIdx = data.nivelIdx || 0;
    this.demoVisto = !!data.demoVisto;   // el nivel 1 del tutorial se demuestra una sola vez
  }

  create() {
    const { width, height } = this.scale;
    const levelData = LEVELS[this.nivelIdx];
    if (!levelData) { this.scene.start('RoomScene'); return; }
    entrarEscena(this);

    this.grid       = levelData.grid;
    this.ROWS       = this.grid.length;
    this.COLS       = this.grid[0].length;
    this.COMPONENTS = this._parseComponents(this.grid);
    this._calcularSerpiente();

    // esquina por la que entra la serpiente (ver _buildInitialSnake) — varía por nivel
    this.NACE = levelData.nace || 'ne';

    this.snake        = this._buildInitialSnake();
    this.moveCount    = 0;

    // ── reloj del nivel ──
    // Date.now() y no this.time: hay que medir tiempo real del chico, y el reloj
    // de la escena se pausa si el navegador manda la pestaña a segundo plano.
    // Ya no se muestra en pantalla (al chico no le dice nada), pero se sigue
    // registrando para analizar la dificultad de cada nivel.
    this.tiempoInicio   = Date.now();
    this.tiempoFin      = null;

    // ── guía visual del orden ──
    // proximoComp = el componente al que la cabeza tiene que ir AHORA. Arranca en
    // la batería (siempre la primera) y avanza sola cuando la cabeza la pisa, así
    // el chico aprende la secuencia recorriéndola en vez de leyendo números.
    this.proximoComp  = 0;
    this.celdaEntrada = { ...this.snake[0] };   // por dónde entró (para el camino)

    // Los primeros niveles muestran el camino gratis: ahí el chico todavía no sabe
    // que los componentes van en un orden. Después se paga con una pista.
    this.NIVELES_CON_CAMINO = 5;
    this.caminoGratis  = this.nivelIdx < this.NIVELES_CON_CAMINO;
    this.mostrarCamino = this.caminoGratis;
    // La manito que señala el botón a tocar: sólo en los primeros niveles, y sólo
    // si el chico se queda quieto. Es el onboarding sin texto.
    this.NIVELES_CON_MANITO = 3;
    this.connected    = false;
    this.solved       = false;
    this.headDir      = { dc: 1, dr: 0 };
    this.switchStates = {};
    this.COMPONENTS.filter(c => c.sym === 's')
      .forEach(sw => { this.switchStates[`${sw.c},${sw.r}`] = false; });

    // ── energía / pistas ──
    // la corriente entra donde la serpiente TOCA la celda de la batería en el grid;
    // se energizan los segmentos de la cabeza (0) hasta el que toca la batería (contactIdx).
    this.energized      = false;
    this.contactIdx     = -1;               // segmento que toca la batería (-1 = ninguno)
    this.lowerIdx       = 0;                // compuerta: switch abierto que corta la corriente
    this.bateriaCells   = this.COMPONENTS.filter(c => c.sym === 'b');  // celdas de batería en el grid
    this.pistaRevelada  = false;            // si el jugador ya gastó una pista en este nivel
    this._alineadosPrev = new Set();        // componentes ya alineados (para detectar nuevos)
    this._calcEnergia();

    // Óptimo de pasos (la marca de las 3 estrellas):
    //   pasos para que la cabeza llegue a la batería + los que tarda el cuerpo en
    //   terminar de trazarse detrás (la batería va en el índice len-2).
    // Naciendo la serpiente colapsada en una casilla no hay cuerpo que estorbe, así
    // que ese primer tramo es la distancia en línea recta y la cuenta cierra.
    //
    // Igual cada nivel trae su `optimo` ya medido resolviéndolo fuera de línea: la
    // cuenta puede quedarse corta si el recorrido entre componentes se cruza consigo
    // mismo y obliga a un desvío. La fórmula queda de respaldo para niveles nuevos
    // (p. ej. recién dibujados en el editor): como es una cota inferior, a lo sumo
    // regala estrellas, nunca las vuelve imposibles.
    const head0  = this.snake[0];
    const bat    = this.bateriaCells[0];
    const idxBat = this.SNAKE_MAP.findIndex(sm => sm.sym === 'b');  // en len-2 (no el último)
    this.OPTIMO = levelData.optimo
      || ((bat && idxBat >= 0)
        ? idxBat + Math.abs(head0.c - bat.c) + Math.abs(head0.r - bat.r)
        : this.SNAKE_LENGTH);

    // ── layout: dos modos según el ancho lógico (ver main.js) ──
    this.LY = this._calcularLayout(width, height);
    const LY = this.LY;
    const GAP     = 5;
    const tileW   = Math.floor((LY.zona.w - (this.COLS - 1) * GAP) / this.COLS);
    const tileH   = Math.floor((LY.zona.h - (this.ROWS - 1) * GAP) / this.ROWS);
    this.TILE     = Math.min(tileW, tileH, LY.maxTile);
    this.GAP      = GAP;

    const gridW  = this.COLS * this.TILE + (this.COLS - 1) * GAP;
    const gridH  = this.ROWS * this.TILE + (this.ROWS - 1) * GAP;
    this.gridW = gridW; this.gridH = gridH;

    // centrar el grid en su zona
    this.originX = LY.zona.x + Math.floor((LY.zona.w - gridW) / 2);
    this.originY = LY.zona.y + Math.floor((LY.zona.h - gridH) / 2);

    asegurarTexturas(this);
    this._dibujarFondo(width, height);
    this._dibujarTablero();

    // capas dinámicas de la serpiente (se redibujan en cada paso)
    this.serpGfx    = this.add.graphics().setDepth(Z.serpiente);
    this.energiaGfx = this.add.graphics().setDepth(Z.energia);
    this.tweens.add({
      targets: this.energiaGfx, alpha: { from: 0.55, to: 1 },
      duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    this.cabeza = null;
    this.tileObjects = {};
    this.caminoGfx = null;
    this.btnReiniciar = null;
    this._latidoReinicio = null;

    this._crearHUD();
    this._calcularRuta();
    this._dibujarCamino();
    this._crearBandeja();
    this._crearControles();
    this._crearParticulas();
    this._activarArrastre();

    this.cursors = this.input.keyboard.createCursorKeys();
    this.input.keyboard.on('keydown-R', () => this._reiniciar());

    this._dibujarGrid();
    this._actualizarEnergia();

    // ── recorrido guiado (ver src/Tutorial.js) ──
    // Niveles 1 a 5 de un perfil nuevo: sin mapa, y el nivel 1 empieza con una
    // demostración en la que el juego se resuelve solo.
    if (GameState.tutorial === PASO.INICIO) GameState.avanzarTutorial(PASO.PUZZLE);
    this.enTutorial = GameState.tutorial === PASO.PUZZLE;
    this.finTutorialPuzzle = false;
    this.enDemo = false;
    this.manoDemo = null;
    if (this.enTutorial && this.btnMapa) this.btnMapa.setVisible(false);
    if (this.enTutorial && this.nivelIdx === 0 && !this.demoVisto &&
        !GameState.nivelesCompletados.includes(0)) this._reproducirDemo();

    // (la instancia de la escena se reutiliza: no arrastrar el timer del intento anterior)
    this.manito = null;
    this._timerManito = null;
    this._programarManito(this.nivelIdx === 0 ? 1200 : 2600);

    Sonido.arrancarMusica();
  }

  // ── parsear: BAT primero, LED al final ──
  _parseComponents(grid) {
    const raw = [];
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const cell = grid[r][c];
        if (!cell) continue;
        let sym, order;
        if (typeof cell === 'object') { sym = cell.sym; order = cell.order; }
        else if (typeof cell === 'string' && cell !== '0') { sym = cell[0]; order = parseInt(cell.slice(1)) || 1; }
        else continue;
        if (!this._compDef(sym)) continue;
        raw.push({ sym, order, c, r });
      }
    }
    const batteries = raw.filter(c => c.sym === 'b').sort((a, b) => a.order - b.order);
    const leds      = raw.filter(c => c.sym === 'l').sort((a, b) => a.order - b.order);
    const middle    = raw.filter(c => c.sym !== 'b' && c.sym !== 'l').sort((a, b) => a.order - b.order);
    const sorted    = [...batteries, ...middle, ...leds];
    sorted.forEach((c, i) => { c.order = i + 1; });
    return sorted;
  }

  // color = el del arte de plastilina de cada pieza (antes eran los neón del tema oscuro)
  _compDef(sym) {
    const defs = {
      b: { color: 0x4aa8e0, label: 'BAT', type: 'battery',   sprite: 'bateria'     },
      r: { color: 0xa77bd0, label: 'R',   type: 'resistor',  sprite: 'resistencia' },
      c: { color: 0x5cc9a0, label: 'CAP', type: 'capacitor', sprite: 'capacitor'   },
      l: { color: 0xe8483a, label: 'LED', type: 'led',       sprite: 'led'         },
      s: { color: 0xe8b830, label: 'SW',  type: 'switch',    sprite: 'switch'      },
    };
    return defs[sym] || null;
  }

  _bfs(sc, sr, ec, er) {
    const vis = new Set([`${sc},${sr}`]);
    const q   = [{ c: sc, r: sr, d: 0 }];
    while (q.length) {
      const { c, r, d } = q.shift();
      if (c === ec && r === er) return d;
      for (const [dc, dr] of [[0,-1],[0,1],[-1,0],[1,0]]) {
        const nc = c + dc, nr = r + dr, k = `${nc},${nr}`;
        if (nc >= 0 && nc < this.COLS && nr >= 0 && nr < this.ROWS && !vis.has(k)) {
          vis.add(k); q.push({ c: nc, r: nr, d: d + 1 });
        }
      }
    }
    return 99;
  }

  _calcularSerpiente() {
    const comps = this.COMPONENTS;
    let len = 1;
    const dists = [];
    for (let i = 0; i < comps.length - 1; i++) {
      const d = this._bfs(comps[i].c, comps[i].r, comps[i+1].c, comps[i+1].r);
      dists.push(d); len += d;
    }
    // +1 cabeza vacía (al frente) y +1 cola vacía (detrás de la batería, siempre última)
    len += 2;
    this.SNAKE_LENGTH = len;
    this.SNAKE_MAP = Array(len).fill(null).map(() => ({
      comp: null, color: SERP.cuerpo, sym: null, label: null, order: null
    }));
    let cursor = len - 2;   // batería en len-2; el índice len-1 queda como cola vacía
    for (let i = 0; i < comps.length; i++) {
      const def = this._compDef(comps[i].sym);
      this.SNAKE_MAP[cursor] = {
        comp: def.type, color: def.color,
        sym: comps[i].sym, label: def.label, order: comps[i].order
      };
      if (i < comps.length - 1) cursor -= dists[i];
    }
    this.SNAKE_MAP[0] = { comp: null, color: SERP.cuerpo, sym: null, label: null, order: null };
  }

  // La serpiente nace ENTERA en una sola casilla: al principio sólo se ve la
  // cabeza, y el cuerpo va saliendo de ahí a medida que avanza, como si entrara
  // al tablero por ese punto.
  //
  // No es sólo estético, resuelve el problema de raíz. Antes nacía desplegada y
  // plegada sobre el tablero, y eso traía tres males:
  //   - se tapaba a sí misma el camino (con el cuerpo ocupando medio tablero,
  //     muchos niveles quedaban sin solución posible)
  //   - obligaba a la cabeza a dar un rodeo para desplegarse, así que el mínimo
  //     de pasos ya no era la distancia en línea recta
  //   - limitaba el largo de la serpiente a ~1/3 del tablero
  // Naciendo colapsada no hay cuerpo que estorbe: el camino mínimo es el camino.
  //
  // De qué esquina entra lo elige cada nivel con `nace` ('ne' | 'no' | 'se' | 'so',
  // default 'ne'), para que no arranquen todos igual. Cambiarlo cambia el óptimo.
  //
  // Los segmentos son objetos distintos aunque compartan casilla: el resto del
  // código los recorre de a uno y conviene que nadie comparta referencia.
  _buildInitialSnake() {
    const c = (this.NACE === 'no' || this.NACE === 'so') ? 0 : this.COLS - 1;
    const r = (this.NACE === 'so' || this.NACE === 'se') ? this.ROWS - 1 : 0;
    return Array.from({ length: this.SNAKE_LENGTH }, () => ({ c, r }));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Escenario estático: fondo + tablero de madera con fichas de masa
  // ─────────────────────────────────────────────────────────────────────────

  // El puzzle pasa "en el cuarto": el fondo es el mismo cuarto de plastilina,
  // oscurecido para que el tablero sea protagonista. Antes era un fondo azul
  // noche de ciencia ficción que no tenía nada que ver con el resto del juego.
  _dibujarFondo(width, height) {
    const bgKey = SpriteConfig.get('cuarto', 'bg');
    if (bgKey && this.textures.exists(bgKey)) {
      const bg = this.add.image(width / 2, height / 2, bgKey).setDepth(Z.fondo);
      bg.setScale(Math.max(width / bg.width, height / bg.height));
    }
    this.add.rectangle(0, 0, width, height, 0x2a1a0e, 0.58).setOrigin(0).setDepth(Z.fondo);
    // viñeta suave: oscurece bordes, concentra la mirada en el centro
    const v = this.add.graphics().setDepth(Z.fondo);
    for (let i = 0; i < 6; i++) {
      v.lineStyle(40, 0x1a0e06, 0.07);
      v.strokeRect(-20 + i * 14, -20 + i * 14, width + 40 - i * 28, height + 40 - i * 28);
    }
  }

  _dibujarTablero() {
    const T = this.TILE, G = this.GAP;
    const M = 16, canto = 12;
    const bw = this.gridW + M * 2, bh = this.gridH + M * 2;
    const bx = this.originX - M, by = this.originY - M;

    // tabla de madera de plastilina
    losa(this, bx + bw / 2, by + (bh + canto) / 2, bw, bh + canto,
      { fill: CLAY.madera, r: 24, canto, grosor: 5, sombra: 0.35, brillo: 0.18 }).setDepth(Z.tablero);

    const g = this.add.graphics().setDepth(Z.tablero);
    // vetas
    g.lineStyle(2, oscurecer(CLAY.madera, 0.85), 0.5);
    for (let i = 1; i < 5; i++) {
      const yy = by + (bh / 5) * i + Math.sin(i * 1.7) * 6;
      g.beginPath(); g.moveTo(bx + 18, yy); g.lineTo(bx + bw * 0.45, yy + 3); g.lineTo(bx + bw - 18, yy - 2); g.strokePath();
    }

    const R = Math.max(6, T * 0.2);
    const ocupadas = new Map(this.COMPONENTS.map(c => [`${c.c},${c.r}`, c]));

    for (let r = 0; r < this.ROWS; r++) {
      for (let c = 0; c < this.COLS; c++) {
        const tx = this.originX + c * (T + G);
        const ty = this.originY + r * (T + G);
        // ficha de masa: canto, cara y brillo
        g.fillStyle(0x5a3a1a, 0.25); g.fillRoundedRect(tx + 1, ty + 4, T, T - 1, R);
        g.fillStyle(CLAY.fichaCanto, 1); g.fillRoundedRect(tx, ty + 2, T, T - 2, R);
        g.fillStyle(CLAY.ficha, 1);      g.fillRoundedRect(tx, ty, T, T - 4, R);
        g.fillStyle(0xffffff, 0.35);     g.fillRoundedRect(tx + T * 0.16, ty + T * 0.08, T * 0.68, T * 0.14, T * 0.07);

        // hueco del componente: un platito del color de la pieza
        const comp = ocupadas.get(`${c},${r}`);
        if (comp) {
          const col = this._compDef(comp.sym).color;
          g.fillStyle(aclarar(col, 0.55), 1);  g.fillCircle(tx + T / 2, ty + T / 2 - 1, T * 0.4);
          g.lineStyle(3, aclarar(col, 0.25), 1); g.strokeCircle(tx + T / 2, ty + T / 2 - 1, T * 0.4);
          g.fillStyle(0xffffff, 0.35);         g.fillEllipse(tx + T / 2, ty + T * 0.73, T * 0.42, T * 0.1);
        }
      }
    }

    // la cueva por donde entra la serpiente
    const e = this._celdaCentro(this.celdaEntrada.c, this.celdaEntrada.r);
    g.fillStyle(0x3a2410, 0.85); g.fillEllipse(e.x, e.y + T * 0.08, T * 0.7, T * 0.5);
    g.fillStyle(0x1a0e06, 0.9);  g.fillEllipse(e.x, e.y + T * 0.12, T * 0.5, T * 0.32);
  }

  // ── camino de piedritas = la solución real ──
  // Piedritas que marcan por dónde ir: entrada → batería → … → LED. En los primeros
  // niveles sale gratis (el chico todavía no sabe que hay un orden); después hay
  // que pedirlo con el botón de pista. La usa también la manito.
  //
  // Antes la ruta se armaba con tramos en L entre componentes, sin simular el
  // cuerpo: en los 50 niveles llevaba a chocar con la propia serpiente o a un
  // recorrido que no conectaba. Ahora es una solución de verdad, calculada con
  // _resolver() simulando la serpiente paso a paso. Si el chico se desvía, se
  // recalcula desde donde está; si ya no hay salida, se avisa con el ↻.
  _calcularRuta() {
    // índice de cuerpo en el que tiene que terminar cada componente (bat = len-2 … LED = 1)
    this._pIdx = this.COMPONENTS.map(c => this.SNAKE_MAP.findIndex(sm => sm.comp && sm.order === c.order));
    this._tipoEn = new Map(this.COMPONENTS.map(c => [`${c.c},${c.r}`, this._compDef(c.sym).type]));
    this._fijarRuta(this._resolver(this.snake, 8, 200000));
  }

  _fijarRuta(sol) {
    const h = this.snake[0];
    this.ruta     = sol ? [{ c: h.c, r: h.r }, ...sol] : null;
    this.rutaPos  = 0;
    this.atascado = !sol;
    // color de cada piedrita = el del próximo componente que esa ruta va a pisar
    this.rutaColor = [];
    if (this.ruta) {
      let col = this._compDef(this.COMPONENTS[this.COMPONENTS.length - 1].sym).color;
      for (let i = this.ruta.length - 1; i >= 0; i--) {
        const comp = this.COMPONENTS.find(c => c.c === this.ruta[i].c && c.r === this.ruta[i].r);
        if (comp) col = this._compDef(comp.sym).color;
        this.rutaColor[i] = col;
      }
    }
    this._marcarAtasco();
  }

  // después de cada paso: ¿sigue por la ruta? si no, buscar otra desde acá
  _avanzarRuta() {
    const h = this.snake[0];
    const sig = this.ruta && this.ruta[this.rutaPos + 1];
    if (sig && sig.c === h.c && sig.r === h.r) this.rutaPos++;
    else this._fijarRuta(this._resolver(this.snake, 12, 80000));
    this._dibujarCamino();
  }

  // ¿el cuerpo `sn` deja cada pieza en su hueco?
  _conectadoEn(sn) {
    return this.SNAKE_MAP.every((sm, i) => !sm.comp || this._tipoEn.get(`${sn[i].c},${sn[i].r}`) === sm.comp);
  }

  // Cota inferior de pasos que faltan para conectar desde `sn` (nunca se pasa).
  // Al ganar, cada componente k queda en el índice de cuerpo P[k]; como cada paso empuja
  // el cuerpo un índice, si la cadena batería…k ya está tendida con k en el índice t,
  // faltan exactamente P[k] - t pasos (si el siguiente componente sigue alcanzable a
  // tiempo). Si no hay cadena, hay que ir a la batería y tender todo: dist + P[0].
  _cotaRestante(sn) {
    const C = this.COMPONENTS, P = this._pIdx, n = C.length, h = sn[0];
    const en = (i, cel) => sn[i] && sn[i].c === cel.c && sn[i].r === cel.r;
    let mejor = Math.abs(h.c - C[0].c) + Math.abs(h.r - C[0].r) + P[0];
    for (let k = 0; k < n; k++) {
      const tramo = k < n - 1 ? P[k] - P[k + 1] : 1;
      for (let t = 0; t <= tramo; t++) {
        if (!en(t, C[k])) continue;
        let ok = true;
        for (let i = 0; i < k && ok; i++) ok = en(t + P[i] - P[k], C[i]);
        if (!ok) continue;
        if (k < n - 1 && Math.abs(h.c - C[k + 1].c) + Math.abs(h.r - C[k + 1].r) > tramo - t) continue;
        mejor = Math.min(mejor, P[k] - t);
      }
    }
    return mejor;
  }

  // IDA*: devuelve la lista de casillas que tiene que pisar la cabeza, o null.
  // Mismas reglas que _mover: no salir del tablero ni pisar ninguna parte del cuerpo.
  _resolver(snake0, extra, presupuesto) {
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const camino = [];
    let nodos = 0;
    const buscar = (sn, g, cota) => {
      if (this._conectadoEn(sn)) return true;
      if (++nodos > presupuesto) return false;
      const h = sn[0], hijos = [];
      for (const [dc, dr] of dirs) {
        const c = h.c + dc, r = h.r + dr;
        if (c < 0 || c >= this.COLS || r < 0 || r >= this.ROWS) continue;
        if (sn.some(q => q.c === c && q.r === r)) continue;
        const n2 = [{ c, r }, ...sn.slice(0, -1)];
        const f = g + 1 + this._cotaRestante(n2);
        if (f <= cota) hijos.push({ n2, f, c, r });
      }
      hijos.sort((a, b) => a.f - b.f);
      for (const x of hijos) {
        camino.push({ c: x.c, r: x.r });
        if (buscar(x.n2, g + 1, cota)) return true;
        camino.pop();
        if (nodos > presupuesto) return false;
      }
      return false;
    };
    const inicio = snake0.map(q => ({ c: q.c, r: q.r }));
    const h0 = this._cotaRestante(inicio);
    for (let cota = h0; cota <= h0 + extra; cota++) {
      camino.length = 0;
      if (buscar(inicio, 0, cota)) return camino.slice();
      if (nodos > presupuesto) break;
    }
    return null;
  }

  // sin salida posible: el ↻ late para decir "empezá de nuevo"
  _marcarAtasco() {
    if (!this.btnReiniciar) return;
    if (this._latidoReinicio) { this._latidoReinicio.stop(); this._latidoReinicio = null; this.btnReiniciar.setScale(1); }
    if (this.atascado && !this.solved) this._latidoReinicio = respirar(this, this.btnReiniciar, 0.14, 380);
  }

  // Se redibuja en cada paso y sólo hacia adelante: las piedritas que la serpiente
  // ya pisó no reaparecen cuando la cola se va.
  _dibujarCamino() {
    if (!this.caminoGfx) {
      this.caminoGfx = this.add.graphics().setDepth(Z.camino);
      // late suave para que se lea como "seguime" y no como decoración
      this.tweens.add({
        targets: this.caminoGfx, alpha: { from: 0.5, to: 1 },
        duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
      });
    }
    const g = this.caminoGfx;
    g.clear();
    if (!this.mostrarCamino || this.solved || !this.ruta) return;

    const rr = Math.max(4, this.TILE * 0.11);
    for (let i = this.rutaPos + 1; i < this.ruta.length; i++) {
      const cl = this.ruta[i];
      if (this._tipoEn.has(`${cl.c},${cl.r}`)) continue;   // nunca una piedrita sobre una pieza
      const color = this.rutaColor[i];
      const p = this._celdaCentro(cl.c, cl.r);
      g.fillStyle(oscurecer(color, 0.7), 1); g.fillCircle(p.x, p.y + 2, rr);
      g.fillStyle(color, 1);                 g.fillCircle(p.x, p.y, rr);
      g.fillStyle(0xffffff, 0.5);            g.fillCircle(p.x - rr * 0.3, p.y - rr * 0.35, rr * 0.35);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HUD — sólo iconos
  // ─────────────────────────────────────────────────────────────────────────
  // Antes: "★ 1240 pts", "mov: 6", "⏱ 0:05", "salir" en rojo, "R — reiniciar".
  // Nada de eso le servía a un chico que no lee. Ahora: casita (volver), mapa
  // (niveles), número de nivel, tres estrellas EN VIVO (se caen si se pasa del
  // óptimo: "más corto = mejor" sin una sola palabra), reiniciar, pista y sonido.
  // Dónde va cada cosa. Dos modos:
  //   clásico (4:3 a 16:10, tabletas): HUD arriba, tablero, bandeja abajo, pad a la derecha.
  //   ancho (teléfonos apaisados, monitores 16:9): tres columnas — botones, estrellas y
  //     bandeja a la izquierda; el tablero a todo el alto en el medio; arriba a la derecha
  //     reiniciar/pista/sonido y debajo un pad grande. En un teléfono el alto es lo que
  //     manda (el juego se ve al ~65 %), así que liberar el alto es lo que agranda fichas.
  _calcularLayout(width, height) {
    const MARCO = 16;
    if (width < 1000) {
      const HUD_H = 70, CTRL_W = 230, TRAY_H = 66, PAD = 10;
      const ctrlX = width - CTRL_W, y = 38, cx = ctrlX / 2 + 50;
      return {
        modo: 'clasico', maxTile: 72, B: 54,
        zona: { x: PAD + MARCO, y: HUD_H + PAD + MARCO, w: ctrlX - 2 * (PAD + MARCO), h: height - HUD_H - TRAY_H - 2 * (PAD + MARCO) },
        casita: { x: 40, y }, mapa: { x: 102, y },
        pill: { x: cx - 92, y }, estrellas: { x: cx - 30, y: y - 2, paso: 46 },
        reiniciar: { x: ctrlX + 46, y }, pista: { x: ctrlX + 110, y }, sonido: { x: ctrlX + 172, y, w: 46 },
        bandeja: { vertical: false, cx: ctrlX / 2, cy: height - TRAY_H / 2 - 6, largo: ctrlX - 60 },
        pad: { cx: ctrlX + CTRL_W / 2, cy: HUD_H + (height - HUD_H) / 2 + 10, S: 76 },
      };
    }
    const PAD = 12;
    const lado = height - 2 * (PAD + MARCO);              // tablero cuadrado a todo el alto
    const resto = width - (lado + 2 * (PAD + MARCO));
    const L = Math.round(resto * 0.42), R = resto - L;
    const B = window.isMobile ? 76 : 60;
    const cxL = L / 2, cxR = width - R / 2, y = 18 + B / 2;
    const dos = L >= 2 * B + 34;                            // ¿entran casita y mapa lado a lado?
    const yPill = dos ? y + B / 2 + 50 : y + B + 60;
    const yEst = yPill + 56;
    const yBand = yEst + 40;
    const S = Math.max(70, Math.min(120, (R - 24) / 2.8));
    return {
      modo: 'ancho', maxTile: 100, B,
      zona: { x: L + PAD + MARCO, y: PAD + MARCO, w: lado, h: lado },
      casita: dos ? { x: cxL - B / 2 - 8, y } : { x: cxL, y },
      mapa:   dos ? { x: cxL + B / 2 + 8, y } : { x: cxL, y: y + B + 12 },
      pill: { x: cxL, y: yPill }, estrellas: { x: cxL - 46, y: yEst, paso: 46 },
      reiniciar: { x: cxR - B - 12, y }, pista: { x: cxR, y }, sonido: { x: cxR + B + 12, y, w: Math.round(B * 0.85) },
      bandeja: { vertical: true, cx: cxL, y0: yBand, largo: height - yBand - 14 },
      pad: { cx: cxR, cy: (y + B / 2 + 12 + height) / 2, S },
    };
  }

  _crearHUD() {
    const LY = this.LY, B = LY.B;
    boton(this, LY.casita.x, LY.casita.y, { w: B, fill: CLAY.azul, icono: 'casita', onTap: () => irA(this, 'RoomScene') }).setDepth(Z.hud);
    this.btnMapa = boton(this, LY.mapa.x, LY.mapa.y, { w: B, fill: CLAY.lila, icono: 'mapa',
      onTap: () => irA(this, 'LevelSelectScene', { desde: this.nivelIdx }) }).setDepth(Z.hud);

    // número de nivel + estrellas en vivo
    const pill = this.add.container(LY.pill.x, LY.pill.y).setDepth(Z.hud);
    pill.add(losa(this, 0, 0, 58, 54, { fill: CLAY.cremaClaro, r: 18, canto: 6, grosor: 3 }));
    pill.add(this.add.text(0, -3, `${this.nivelIdx + 1}`, estiloTexto(26, hex(CLAY.bordeOscuro), '#fff6e0', 2)).setOrigin(0.5));

    this.estrellasVivas = 3;
    this.estrellasHUD = [];
    for (let i = 0; i < 3; i++) {
      const st = estrella(this, LY.estrellas.x + i * LY.estrellas.paso, LY.estrellas.y, true, 40).setDepth(Z.hud);
      this.estrellasHUD.push(st);
    }

    // reiniciar · pista · sonido
    this.btnReiniciar = boton(this, LY.reiniciar.x, LY.reiniciar.y, { w: B, fill: CLAY.amarillo, icono: 'reiniciar', onTap: () => this._reiniciar() }).setDepth(Z.hud);

    this.pistaBtn = boton(this, LY.pista.x, LY.pista.y, {
      w: B, fill: CLAY.verde, imagen: 'pista', sonido: null, onTap: () => this._revelarPista(),
    }).setDepth(Z.hud);
    this.pistaBadge = insignia(this, LY.pista.x + B * 0.37, LY.pista.y - B * 0.37, GameState.pistas).setDepth(Z.hud + 1);

    botonSonido(this, LY.sonido.x, LY.sonido.y, LY.sonido.w, Z.hud);
    this._dibujarBotonPista();
  }

  // estrellas que ganaría si terminara AHORA con estos movimientos
  _estrellasPara(mov) {
    return mov <= this.OPTIMO ? 3 : mov <= Math.ceil(this.OPTIMO * 1.25) ? 2 : 1;
  }

  _actualizarEstrellasHUD() {
    const ahora = this._estrellasPara(this.moveCount);
    if (ahora >= this.estrellasVivas) return;
    // se cae la estrella: rueda hacia abajo, se apaga y queda la vacía en su lugar
    for (let i = ahora; i < this.estrellasVivas; i++) {
      const vieja = this.estrellasHUD[i];
      const vacia = estrella(this, vieja.x, vieja.y, false, 40).setDepth(Z.hud).setAlpha(0);
      this.tweens.add({ targets: vacia, alpha: 1, duration: 300, delay: 200 });
      this.tweens.add({
        targets: vieja, y: vieja.y + 40, angle: 120, alpha: 0, duration: 500, ease: 'Quad.easeIn',
        onComplete: () => vieja.destroy(),
      });
      this.estrellasHUD[i] = vacia;
    }
    this.estrellasVivas = ahora;
    Sonido.estrellaPerdida();
  }

  _dibujarBotonPista() {
    const n = GameState.pistas;
    // en los niveles iniciales el camino ya está a la vista: no hay nada que pedir
    this.pistaBtn.setVisible(!this.caminoGratis);
    this.pistaBadge.setVisible(!this.caminoGratis && !this.pistaRevelada);
    this.pistaBtn.setDeshabilitado(this.pistaRevelada);
    this.pistaBadge.setTexto(n > 0 ? n : '+');
  }

  _revelarPista() {
    if (this.pistaRevelada || this.caminoGratis || this.solved) return;
    if (GameState.pistas > 0) {
      GameState.usarPista();
      Sonido.ding(4);
      this.pistaRevelada = true;
      this.mostrarCamino = true;      // la pista enciende también el camino en el tablero
      this._dibujarCamino();
      this._crearBandeja();
      this._dibujarBotonPista();
    } else {
      // sin pistas → a la tienda a comprar más
      Sonido.click();
      irA(this, 'StoreScene', { cat: 'mejoras' });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Bandeja: la secuencia de piezas en orden (abajo del tablero)
  // ─────────────────────────────────────────────────────────────────────────
  // Se ve cuando el camino se ve (gratis o con pista). Cada pieza se marca con un
  // tilde verde cuando queda conectada: progreso sin números.
  _crearBandeja() {
    if (this.bandejaObjs) this.bandejaObjs.forEach(o => o.destroy());
    this.bandejaObjs  = [];
    this.bandejaAros  = [];
    if (!this.mostrarCamino) return;

    // horizontal debajo del tablero (clásico) o vertical en la columna izquierda (ancho)
    const BJ    = this.LY.bandeja;
    const comps = this.COMPONENTS;
    const n     = comps.length;
    const paso  = Math.min(64, BJ.largo / n);
    const largo = paso * n + 24;
    this.bandejaR = Math.min(24, paso * 0.42);
    const pos = i => BJ.vertical
      ? { x: BJ.cx, y: BJ.y0 + 12 + paso * i + paso / 2 }
      : { x: BJ.cx - largo / 2 + 12 + paso * i + paso / 2, y: BJ.cy };

    const fondo = BJ.vertical
      ? losa(this, BJ.cx, BJ.y0 + largo / 2 + 3, 62, largo, { fill: CLAY.madera, r: 26, canto: 6, grosor: 3, brillo: 0.15 })
      : losa(this, BJ.cx, BJ.cy + 3, largo, 62, { fill: CLAY.madera, r: 22, canto: 6, grosor: 3, brillo: 0.15 });
    this.bandejaObjs.push(fondo.setDepth(Z.hud));

    comps.forEach((comp, i) => {
      const { x, y } = pos(i);
      if (i < n - 1) {
        const f = this.add.graphics().setDepth(Z.hud);
        f.fillStyle(0xfff3d6, 0.9);
        if (BJ.vertical) { const ay = y + paso / 2; f.fillTriangle(x - 6, ay - 4, x + 6, ay - 4, x, ay + 5); }
        else             { const ax = x + paso / 2; f.fillTriangle(ax - 4, y - 6, ax + 5, y, ax - 4, y + 6); }
        this.bandejaObjs.push(f);
      }
      const aro = this.add.graphics({ x, y }).setDepth(Z.hud);
      this.bandejaAros.push(aro);
      const img = this._spriteComp(comp.sym, x, y, Math.min(40, paso * 0.66), false);
      if (img) this.bandejaObjs.push(img.setDepth(Z.hud + 1));
      this.bandejaObjs.push(aro);
    });
    this._actualizarBandeja();
  }

  _actualizarBandeja() {
    if (!this.bandejaAros || !this.bandejaAros.length) return;
    const r = this.bandejaR;
    this.COMPONENTS.forEach((comp, i) => {
      const aro = this.bandejaAros[i];
      if (!aro) return;
      const segIdx = this.SNAKE_MAP.findIndex(sm => sm.comp && sm.order === comp.order);
      const ok = segIdx >= 0 && this._segmentoAlineado(segIdx);
      aro.clear();
      aro.fillStyle(ok ? 0xd8f0c0 : CLAY.cremaClaro, 1); aro.fillCircle(0, 0, r);
      aro.lineStyle(3, ok ? 0x5a9a3a : CLAY.bordeOscuro, 1); aro.strokeCircle(0, 0, r);
      if (ok) {
        aro.fillStyle(0x5a9a3a, 1); aro.fillCircle(r * 0.7, -r * 0.7, 8);
        aro.lineStyle(2.5, 0xffffff, 1);
        aro.beginPath(); aro.moveTo(r * 0.7 - 4, -r * 0.7); aro.lineTo(r * 0.7 - 1, -r * 0.7 + 3); aro.lineTo(r * 0.7 + 4, -r * 0.7 - 3); aro.strokePath();
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Controles — pad de flechas de plastilina
  // ─────────────────────────────────────────────────────────────────────────
  _crearControles() {
    const S    = this.LY.pad.S;            // tamaño de cada flecha (manos chiquitas)
    const sep  = S * 0.9;
    const cx   = this.LY.pad.cx;
    const cy   = this.LY.pad.cy;

    // base del pad: un platito de madera
    losa(this, cx, cy + 6, (sep + S / 2) * 2 + 12, (sep + S / 2) * 2 + 12, { fill: CLAY.madera, r: sep + S / 2 + 6, canto: 10, grosor: 4, brillo: 0.12 })
      .setDepth(Z.hud - 1).setAlpha(0.9);

    const dirs = [
      { label: '▲', key: 'btn_up',    dc:  0, dr: -1, x: cx,       y: cy - sep },
      { label: '▼', key: 'btn_down',  dc:  0, dr:  1, x: cx,       y: cy + sep },
      { label: '◀', key: 'btn_left',  dc: -1, dr:  0, x: cx - sep, y: cy },
      { label: '▶', key: 'btn_right', dc:  1, dr:  0, x: cx + sep, y: cy },
    ];

    this.flechas = {};
    dirs.forEach(d => {
      const c = this.add.container(d.x, d.y).setDepth(Z.hud);
      const sombra = this.add.ellipse(0, S * 0.42, S * 0.8, S * 0.22, 0x1a0e06, 0.35);
      c.add(sombra);
      const k = SpriteConfig.get('ui', d.key);
      if (k && this.textures.exists(k)) {
        c.add(this.add.image(0, 0, k).setDisplaySize(S, S));
      } else {
        c.add(losa(this, 0, 0, S * 0.8, S * 0.8, { fill: CLAY.naranja, r: S * 0.4 }));
        c.add(this.add.text(0, -4, d.label, estiloTexto(30)).setOrigin(0.5));
      }
      c.setSize(S, S).setInteractive({ useHandCursor: true });
      c.on('pointerdown', () => {
        this.tweens.killTweensOf(c);
        c.setScale(1.1, 0.84);
        this.tweens.add({ targets: c, scaleX: 1, scaleY: 1, duration: 220, ease: 'Back.easeOut' });
        this._mover(d.dc, d.dr);
      });
      this.flechas[`${d.dc},${d.dr}`] = c;
    });
  }

  // ── arrastrar el dedo (o el mouse) por el tablero ──
  // En una pantalla táctil lo natural es "dibujar" el camino: cada casilla vecina a la
  // cabeza por la que pasa el dedo es un paso. También vale tocar la casilla de al lado.
  // Si el dedo pasa por una casilla que no se puede pisar, simplemente no pasa nada
  // (sin "bonk": arrastrando es fácil rozar el propio cuerpo sin querer).
  _activarArrastre() {
    this._arrastrando = false;
    this.input.on('pointerdown', (p, sobre) => {
      if (sobre && sobre.length) return;           // botón, flecha o interruptor: lo maneja él
      this._arrastrando = !!this._celdaEn(p.worldX, p.worldY);
      if (this._arrastrando) this._pasoArrastre(p);
    });
    this.input.on('pointermove', p => { if (this._arrastrando && p.isDown) this._pasoArrastre(p); });
    this.input.on('pointerup', () => { this._arrastrando = false; });
  }

  // casilla bajo un punto de pantalla (o null si cae fuera del tablero)
  _celdaEn(x, y) {
    const paso = this.TILE + this.GAP;
    const c = Math.floor((x - this.originX + this.GAP / 2) / paso);
    const r = Math.floor((y - this.originY + this.GAP / 2) / paso);
    return (c >= 0 && c < this.COLS && r >= 0 && r < this.ROWS) ? { c, r } : null;
  }

  _pasoArrastre(p) {
    if (this.solved || this.enDemo) return;
    const cel = this._celdaEn(p.worldX, p.worldY);
    if (!cel) return;
    const h = this.snake[0];
    const dc = cel.c - h.c, dr = cel.r - h.r;
    if (Math.abs(dc) + Math.abs(dr) !== 1) return;
    if (this.snake.some(s => s.c === cel.c && s.r === cel.r)) return;
    this._mover(dc, dr);
  }

  // ── partículas / energía ──
  _crearParticulas() {
    // emisor de energía persistente en la cabeza (sobrevive a los redibujados por paso)
    this.energyEmitter = this.add.particles(0, 0, 'chispa', {
      speed:     { min: 10, max: 40 },
      angle:     { min: 0, max: 360 },
      scale:     { start: 0.55, end: 0 },
      alpha:     { start: 1, end: 0 },
      lifespan:  520,
      frequency: 50,
      quantity:  1,
      tint:      [SERP.energia, 0xffffff, 0xffb84a],
      emitting:  false,
    });
    this.energyEmitter.setDepth(Z.particulas);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Dibujo dinámico: serpiente + componentes (se redibuja en cada paso)
  // ─────────────────────────────────────────────────────────────────────────

  // centro en pixeles de una celda del grid
  _celdaCentro(c, r) {
    const T = this.TILE;
    return {
      x: this.originX + c * (T + this.GAP) + T / 2,
      y: this.originY + r * (T + this.GAP) + T / 2 - 2,
    };
  }

  // sprite de un componente (o figura de respaldo) de tamaño `sz` centrado en (x,y)
  _spriteComp(sym, x, y, sz, swCerrado) {
    const def = this._compDef(sym);
    const nombre = sym === 's' && swCerrado ? 'switch_on' : def.sprite;
    const key = SpriteConfig.get('componentes', nombre);
    if (key && this.textures.exists(key)) return this.add.image(x, y, key).setDisplaySize(sz, sz);
    const g = this.add.graphics({ x, y });
    g.fillStyle(def.color, 1); g.fillCircle(0, 0, sz * 0.36);
    g.lineStyle(3, oscurecer(def.color), 1); g.strokeCircle(0, 0, sz * 0.36);
    return g;
  }

  // Puntos de la serpiente sin repetir casilla (al nacer está toda apilada en una).
  // Cada punto guarda el primer índice de segmento que cae ahí.
  _puntosSerpiente(desde = 0, hasta = this.snake.length - 1) {
    const pts = [];
    for (let i = desde; i <= hasta; i++) {
      const s = this.snake[i];
      const ult = pts[pts.length - 1];
      if (!ult || ult.c !== s.c || ult.r !== s.r) {
        const p = this._celdaCentro(s.c, s.r);
        pts.push({ c: s.c, r: s.r, i, x: p.x, y: p.y });
      }
    }
    return pts;
  }

  // Tubo de plastilina por una lista de puntos: líneas gruesas + círculos en las
  // juntas (Graphics no tiene uniones redondeadas). Si `cola`, el último tramo se
  // afina hasta una punta.
  _tubo(g, pts, ancho, color, alpha = 1, cola = false) {
    if (!pts.length) return;
    g.fillStyle(color, alpha);
    g.lineStyle(ancho, color, alpha);
    const n = pts.length;
    const hastaFull = cola && n >= 2 ? n - 2 : n - 1;
    for (let k = 0; k < hastaFull; k++) {
      g.beginPath(); g.moveTo(pts[k].x, pts[k].y); g.lineTo(pts[k + 1].x, pts[k + 1].y); g.strokePath();
    }
    for (let k = 0; k <= hastaFull; k++) g.fillCircle(pts[k].x, pts[k].y, ancho / 2);
    if (cola && n >= 2) {
      const a = pts[n - 2], b = pts[n - 1];
      const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
      const ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
      const tipX = b.x + ux * this.TILE * 0.18, tipY = b.y + uy * this.TILE * 0.18;
      const w0 = ancho / 2;
      g.fillPoints([
        { x: a.x + nx * w0, y: a.y + ny * w0 },
        { x: b.x + nx * w0 * 0.45, y: b.y + ny * w0 * 0.45 },
        { x: tipX, y: tipY },
        { x: b.x - nx * w0 * 0.45, y: b.y - ny * w0 * 0.45 },
        { x: a.x - nx * w0, y: a.y - ny * w0 },
      ], true);
    }
  }

  _dibujarSerpiente() {
    const T = this.TILE;
    const g = this.serpGfx;
    g.clear();
    const pts = this._puntosSerpiente();

    // sombra, contorno, cuerpo y brillo — cuatro pasadas del mismo tubo
    this._tubo(g, pts.map(p => ({ x: p.x + 2, y: p.y + 5 })), T * 0.62, 0x1a0e06, 0.22, true);
    this._tubo(g, pts, T * 0.64, SERP.contorno, 1, true);
    this._tubo(g, pts, T * 0.5,  SERP.cuerpo,   1, true);
    g.lineStyle(T * 0.1, 0xffffff, 0.28);
    for (let k = 0; k < pts.length - 1; k++) {
      g.beginPath(); g.moveTo(pts[k].x, pts[k].y - T * 0.1); g.lineTo(pts[k + 1].x, pts[k + 1].y - T * 0.1); g.strokePath();
    }

    // corriente: el tramo energizado [lowerIdx..contactIdx] brilla amarillo
    const e = this.energiaGfx;
    e.clear();
    const todoEncendido = this.solved;
    if (todoEncendido || (this.contactIdx >= 0)) {
      const desde = todoEncendido ? 0 : this.lowerIdx;
      const hasta = todoEncendido ? this.snake.length - 1 : this.contactIdx;
      const ep = this._puntosSerpiente(desde, hasta);
      this._tubo(e, ep, T * 0.3, SERP.energia, 0.9);
      this._tubo(e, ep, T * 0.12, 0xffffff, 0.8);
    }

    // cabeza: un sprite persistente que se desliza de casilla en casilla
    const h = this.snake[0];
    const p = this._celdaCentro(h.c, h.r);
    if (!this.cabeza) {
      this.cabeza = this._crearCabeza(p.x, p.y);
    } else if (this.cabeza.x !== p.x || this.cabeza.y !== p.y) {
      this.tweens.killTweensOf(this.cabeza);
      this.tweens.add({ targets: this.cabeza, x: p.x, y: p.y, duration: 90, ease: 'Quad.easeOut' });
      // "estirón" en la dirección del paso
      const horizontal = this.headDir.dr === 0;
      const sx = this.cabeza._escala, sy = this.cabeza._escala;
      this.cabeza.setScale(sx * (horizontal ? 1.18 : 0.88), sy * (horizontal ? 0.88 : 1.18));
      this.tweens.add({ targets: this.cabeza, scaleX: sx, scaleY: sy, duration: 200, ease: 'Back.easeOut' });
    }
    this._orientarCabeza();
  }

  _crearCabeza(x, y) {
    const T = this.TILE;
    let key = SpriteConfig.get('serpiente', 'cabeza');
    if (!key || !this.textures.exists(key)) {
      // respaldo: carita de plastilina mirando a la derecha
      key = 'cabeza_respaldo';
      if (!this.textures.exists(key)) {
        const g = this.make.graphics({ add: false });
        g.fillStyle(SERP.contorno, 1); g.fillEllipse(50, 50, 96, 80);
        g.fillStyle(SERP.cuerpo, 1);   g.fillEllipse(50, 48, 86, 70);
        g.fillStyle(0xffffff, 1); g.fillCircle(62, 34, 11); g.fillCircle(62, 62, 11);
        g.fillStyle(0x1a0e06, 1); g.fillCircle(66, 34, 5);  g.fillCircle(66, 62, 5);
        g.generateTexture(key, 100, 100); g.destroy();
      }
    }
    const img = this.add.image(x, y, key).setDepth(Z.cabeza);
    img._escala = (T * 1.12) / Math.max(img.width, img.height);
    img.setScale(img._escala);
    return img;
  }

  // el arte mira a la derecha: izquierda se espeja (no se rota, si no queda panza arriba)
  _orientarCabeza() {
    const { dc, dr } = this.headDir;
    const c = this.cabeza;
    if (!c) return;
    c.setFlipX(dc === -1);
    c.setAngle(dr === 1 ? 90 : dr === -1 ? -90 : 0);
  }

  _dibujarGrid() {
    this._dibujarSerpiente();

    const T = this.TILE;
    // limpiar lo del paso anterior
    Object.values(this.tileObjects).forEach(arr => arr.forEach(o => { this.tweens.killTweensOf(o); o.destroy(); }));
    this.tileObjects = {};
    const reg = (key, ...objs) => { (this.tileObjects[key] ||= []).push(...objs); };

    // ── piezas que lleva la serpiente en el cuerpo (bolitas con la pieza encima) ──
    // Son la otra mitad del puzzle: QUÉ parte del cuerpo tiene que caer en cada hueco.
    const pts = this._puntosSerpiente();
    pts.forEach(pt => {
      if (pt.i === 0) return;                               // la cabeza no lleva nada
      const sm = this.SNAKE_MAP[pt.i];
      if (!sm || !sm.sym || this._segmentoAlineado(pt.i)) return;  // alineada → la dibuja el tablero
      const k = `${pt.c},${pt.r}`;
      const bola = this.add.circle(pt.x, pt.y, T * 0.24, 0xffffff, 0.85).setDepth(Z.carga).setStrokeStyle(2.5, sm.color);
      const img  = this._spriteComp(sm.sym, pt.x, pt.y, T * 0.42, false).setDepth(Z.carga);
      reg(k, bola, img);
    });

    // ── componentes del tablero ──
    this.COMPONENTS.forEach(comp => {
      const k   = `${comp.c},${comp.r}`;
      const p   = this._celdaCentro(comp.c, comp.r);
      const def = this._compDef(comp.sym);
      const si  = this.snake.findIndex(s => s.c === comp.c && s.r === comp.r);
      const alineado = si >= 0 && this._segmentoAlineado(si);
      const tapado   = si >= 0 && !alineado;
      const cerrado  = this.switchStates[k];

      if (alineado || this.solved) {
        // encendido: aura del color de la pieza latiendo debajo
        const aura = this.add.circle(p.x, p.y, T * 0.5, def.color, 0.45).setDepth(Z.aura);
        this.tweens.add({
          targets: aura, scale: { from: 0.85, to: 1.12 }, alpha: { from: 0.55, to: 0.2 },
          duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });
        const img = this._spriteComp(comp.sym, p.x, p.y, T * 0.84, cerrado).setDepth(Z.compArriba);
        reg(k, aura, img);
      } else {
        const img = this._spriteComp(comp.sym, p.x, p.y, tapado ? T * 0.6 : T * 0.8, cerrado)
          .setDepth(tapado ? Z.compArriba : Z.comp).setAlpha(tapado ? 0.75 : 1);
        reg(k, img);

        // ── el próximo componente salta: "andá acá ahora" ──
        // Es la guía que enseña el orden sin números. Empieza en la batería (siempre
        // primera) y va saltando sola. No dice el camino, sólo el destino: rutear la
        // serpiente sigue siendo del chico.
        const esProximo = !this.solved && this.COMPONENTS[this.proximoComp] === comp;
        if (esProximo && !tapado) {
          const aro = this.add.circle(p.x, p.y, T * 0.46).setStrokeStyle(4, def.color, 1).setDepth(Z.aura);
          this.tweens.add({
            targets: aro, scale: { from: 0.9, to: 1.25 }, alpha: { from: 1, to: 0 },
            duration: 900, repeat: -1, ease: 'Quad.easeOut',
          });
          const yBase = img.y;
          this.tweens.add({
            targets: img, y: yBase - T * 0.12, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
          });
          reg(k, aro);
        }
      }

      // número de orden: chiquito en la esquina (al que ya lee le sirve; al que no, no estorba)
      if (!this.solved) {
        const tx = this.originX + comp.c * (T + this.GAP);
        const ty = this.originY + comp.r * (T + this.GAP);
        const cr = Math.max(9, T * 0.15);
        const chip = this.add.circle(tx + T - cr * 0.7, ty + cr * 0.7, cr, CLAY.cremaClaro).setStrokeStyle(2, def.color).setDepth(Z.chip);
        const num  = this.add.text(chip.x, chip.y, `${comp.order}`, {
          fontSize: `${Math.round(cr * 1.25)}px`, color: hex(oscurecer(def.color, 0.6)), fontFamily: FUENTE, fontStyle: '600',
        }).setOrigin(0.5).setDepth(Z.chip);
        reg(k, chip, num);
      }

      // switch listo para tocar: ondas que dicen "tocame"
      if (comp.sym === 's' && this.connected && !this.solved) {
        if (!cerrado) {
          const onda = this.add.circle(p.x, p.y, T * 0.4).setStrokeStyle(5, 0xffffff, 1).setDepth(Z.chip);
          this.tweens.add({ targets: onda, scale: { from: 0.8, to: 1.5 }, alpha: { from: 1, to: 0 }, duration: 800, repeat: -1 });
          reg(k, onda);
        }
        const zone = this.add.rectangle(p.x, p.y, T, T, 0xffffff, 0).setDepth(Z.zona)
          .setInteractive({ useHandCursor: true });
        zone.on('pointerdown', () => this._toggleSwitch(k));
        reg(k, zone);
      }
    });
  }

  // calcula qué parte de la serpiente tiene corriente.
  // contactIdx = índice más alto que toca la batería (fuente).
  // lowerIdx   = compuerta: un SWITCH ABIERTO bajo la corriente corta el flujo en su
  //              posición; la energía llega de la batería (contact) hasta ahí, no a la cabeza.
  //              Al cerrarlo, la energía se libera y sigue hacia la cabeza (lowerIdx = 0).
  _calcEnergia() {
    let contact = -1;
    for (let i = 0; i < this.snake.length; i++) {
      const seg = this.snake[i];
      if (this.bateriaCells.some(b => b.c === seg.c && b.r === seg.r) && i > contact) {
        contact = i;
      }
    }
    this.contactIdx = contact;

    // buscar el switch abierto más cercano a la batería (índice más alto < contact)
    let lower = 0;
    if (contact >= 0) {
      for (let i = contact - 1; i >= 0; i--) {
        const seg = this.snake[i];
        const esSwitch = this.COMPONENTS.some(co => co.sym === 's' && co.c === seg.c && co.r === seg.r);
        if (esSwitch && !this.switchStates[`${seg.c},${seg.r}`]) { lower = i; break; }
      }
    }
    this.lowerIdx = lower;
    this.energized = contact >= 0;
  }

  // reubica el emisor de energía en la cabeza y lo enciende/apaga según `energized`
  _actualizarEnergia() {
    if (!this.energyEmitter) return;
    // partículas en la cabeza SOLO si la energía llega hasta ahí (ningún switch la corta)
    if (this.energized && this.lowerIdx === 0 && !this.solved) {
      const head = this.snake[0];
      const p = this._celdaCentro(head.c, head.r);
      this.energyEmitter.setPosition(p.x, p.y);
      this.energyEmitter.emitting = true;
    } else {
      this.energyEmitter.emitting = false;
    }
  }

  // ráfaga corta de partículas + flash cuando un componente se alinea ("se enciende")
  _chispazo(c, r, color) {
    const p = this._celdaCentro(c, r);
    chispas(this, p.x, p.y, [color, 0xffffff, SERP.energia], { cantidad: 16, velocidad: 110, depth: Z.particulas });
    const flash = this.add.circle(p.x, p.y, this.TILE * 0.5, 0xffffff, 0.8).setDepth(Z.particulas - 1);
    this.tweens.add({
      targets: flash, scale: 1.7, alpha: 0, duration: 380,
      onComplete: () => flash.destroy()
    });
  }

  // ráfaga de celebración a lo largo de toda la serpiente, de la cola a la cabeza
  _celebrar() {
    const pts = this._puntosSerpiente().reverse();
    pts.forEach((pt, k) => {
      this.time.delayedCall(k * 45, () => {
        if (!this.scene.isActive()) return;
        chispas(this, pt.x, pt.y, COLORES_FIESTA, { cantidad: 10, velocidad: 120, depth: Z.particulas });
        if (k % 2 === 0) Sonido._tono(400 + k * 30, 0.08, { tipo: 'triangle', vol: 0.12 });
      });
    });
  }

  // ── mecánica ──
  _segmentoAlineado(segIdx) {
    const seg = this.snake[segIdx];
    const sm  = this.SNAKE_MAP[segIdx];
    if (!seg || !sm || !sm.comp) return false;
    const comp = this.COMPONENTS.find(co => co.c === seg.c && co.r === seg.r);
    return comp && this._compDef(comp.sym).type === sm.comp;
  }

  _checkConectado() {
    return this.SNAKE_MAP.every((sm, i) => !sm.comp || this._segmentoAlineado(i));
  }

  _toggleSwitch(key) {
    if (!this.connected || this.solved) return;
    const seCierra = !this.switchStates[key];
    this.switchStates[key] = !this.switchStates[key];

    // al cerrar, la energía se libera y fluye más allá del switch → chispazo
    const [c, r] = key.split(',').map(Number);
    if (seCierra) { this._chispazo(c, r, SERP.energia); Sonido.chispa(); }
    else Sonido.click();

    this._calcEnergia();  // recalcular la compuerta de energía
    const allClosed = Object.values(this.switchStates).every(v => v === true);
    if (allClosed) this._ganar();
    else { this._dibujarGrid(); this._actualizarEnergia(); }
  }

  _mover(dc, dr, desdeDemo = false) {
    if (this.solved || this._saliendo) return;
    if (this.enDemo && !desdeDemo) return;      // durante la demostración se mira, no se toca
    const head = this.snake[0];
    const nc   = head.c + dc, nr = head.r + dr;
    if (nc < 0 || nc >= this.COLS || nr < 0 || nr >= this.ROWS) { this._chocar(dc, dr); return; }
    if (this.snake.some(s => s.c === nc && s.r === nr))         { this._chocar(dc, dr); return; }
    this.snake.unshift({ c: nc, r: nr });
    this.snake.pop();
    this.moveCount++;
    this.headDir = { dc, dr };
    this.connected = this._checkConectado();
    Sonido.paso();
    this._ocultarManito();
    this._avanzarRuta();

    // ¿la cabeza pisó el componente que tocaba? entonces se ilumina el siguiente.
    // Sólo avanza, nunca retrocede: la guía acompaña, no castiga.
    const meta = this.COMPONENTS[this.proximoComp];
    if (meta && meta.c === nc && meta.r === nr) {
      this.proximoComp++;
      Sonido.pop();
    }

    // energía: corriente desde donde la serpiente toca la celda de la batería
    this._calcEnergia();
    // detectar componentes recién alineados para el chispazo
    this._detectarNuevosAlineados();
    this._actualizarEstrellasHUD();

    const hasSwitches = this.COMPONENTS.some(c => c.sym === 's');
    if (this.connected && this.enDemo) { this._finDemo(); return; }
    if (this.connected && !hasSwitches) this._ganar();
    else {
      this._dibujarGrid();
      this._actualizarEnergia();
      this._actualizarBandeja();
      if (this.connected && hasSwitches) Sonido.ding(6);
      this._programarManito();
    }
  }

  // la cabeza se asoma y vuelve: "por ahí no se puede"
  _chocar(dc, dr) {
    Sonido.golpe();
    const c = this.cabeza;
    if (c) {
      const h = this._celdaCentro(this.snake[0].c, this.snake[0].r);
      this.tweens.killTweensOf(c);
      c.setPosition(h.x, h.y).setScale(c._escala);
      this.tweens.add({
        targets: c, x: h.x + dc * this.TILE * 0.18, y: h.y + dr * this.TILE * 0.18,
        duration: 60, yoyo: true, ease: 'Quad.easeOut',
      });
    }
    const f = this.flechas && this.flechas[`${dc},${dr}`];
    if (f) sacudir(this, f, 4);
  }

  // dispara chispazo en los componentes que pasaron a estar alineados en este paso
  _detectarNuevosAlineados() {
    const ahora = new Set();
    this.SNAKE_MAP.forEach((sm, i) => {
      if (sm.comp && this._segmentoAlineado(i)) {
        const seg = this.snake[i];
        const key = `${seg.c},${seg.r}`;
        ahora.add(key);
        if (!this._alineadosPrev.has(key)) {
          this._chispazo(seg.c, seg.r, sm.color);
          Sonido.ding(sm.order || 0);
        }
      }
    });
    this._alineadosPrev = ahora;
  }

  _reiniciar() {
    // reiniciar durante la demo = "ya entendí": se salta la demostración
    irA(this, 'PuzzleScene', { nivelIdx: this.nivelIdx, demoVisto: this.demoVisto || this.enDemo });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Demostración del nivel 1 (tutorial)
  // ─────────────────────────────────────────────────────────────────────────
  // El juego se resuelve solo siguiendo la ruta: la manito va a cada flecha y la
  // aprieta, la serpiente avanza por las piedritas, las piezas se encienden y se
  // prende el LED. Después un ▶ grande: "ahora tú". Así se entiende la mecánica
  // entera mirando, antes de tocar nada.
  _reproducirDemo() {
    this.enDemo = true;
    if (!this.ruta) { this.enDemo = false; return; }
    const pasos = this.ruta.slice(1);
    // ojos que miran: "esto es para mirar"
    const arriba = this.flechas['0,-1'];
    const ojos = this.add.text(arriba.x, arriba.y - this.LY.pad.S * 1.05, '👀', { fontSize: '44px' }).setOrigin(0.5).setDepth(Z.manito);
    this.tweens.add({ targets: ojos, scale: 1.15, duration: 500, yoyo: true, repeat: -1 });
    this.demoObjs = [ojos];

    let i = 0;
    const paso = () => {
      if (!this.scene.isActive() || !this.enDemo || i >= pasos.length) return;
      const h = this.snake[0], q = pasos[i++];
      const dc = q.c - h.c, dr = q.r - h.r;
      const f = this.flechas[`${dc},${dr}`];
      if (!f) return;
      if (!this.manoDemo) this.manoDemo = mano(this, f.x, f.y, { depth: Z.manito });
      else this.manoDemo.irA(f.x, f.y, 200);
      this.time.delayedCall(260, () => {
        if (!this.scene.isActive() || !this.enDemo) return;
        this.manoDemo.apretar();
        this.tweens.killTweensOf(f);
        f.setScale(1.1, 0.84);
        this.tweens.add({ targets: f, scaleX: 1, scaleY: 1, duration: 220, ease: 'Back.easeOut' });
        this._mover(dc, dr, true);
        this.time.delayedCall(380, paso);
      });
    };
    this.time.delayedCall(1200, paso);
  }

  _finDemo() {
    this.solved = true;
    if (this.manoDemo) { this.manoDemo.destroy(); this.manoDemo = null; }
    if (this.caminoGfx) this.caminoGfx.clear();
    if (this.energyEmitter) this.energyEmitter.emitting = false;
    this._dibujarGrid();
    this._actualizarBandeja();
    this._celebrar();
    this._encenderLed();
    Sonido.victoria();

    // "¡ahora tú!": un ▶ grande en el centro del tablero
    this.time.delayedCall(1400, () => {
      if (!this.scene.isActive()) return;
      (this.demoObjs || []).forEach(o => o.destroy());
      const { width, height } = this.scale;
      const velo = this.add.rectangle(0, 0, width, height, 0x1a0e06, 0.35).setOrigin(0).setDepth(Z.panel).setInteractive();
      velo.setAlpha(0);
      this.tweens.add({ targets: velo, alpha: 1, duration: 250 });
      const cx = this.originX + this.gridW / 2, cy = this.originY + this.gridH / 2;
      const b = boton(this, cx, cy, { w: 170, h: 120, r: 44, fill: CLAY.verde, icono: 'play', tamIcono: 64, sonido: 'pop',
        onTap: () => irA(this, 'PuzzleScene', { nivelIdx: this.nivelIdx, demoVisto: true }) }).setDepth(Z.panel + 1);
      aparecer(this, b);
      this.time.delayedCall(450, () => { if (b.active) respirar(this, b, 0.07, 520); });
      mano(this, cx, cy + 10, { depth: Z.manito });
    });
  }

  // el LED se enciende de verdad: un sol rojo-anaranjado que crece
  _encenderLed() {
    const led = this.COMPONENTS[this.COMPONENTS.length - 1];
    if (!led) return;
    const p = this._celdaCentro(led.c, led.r);
    const luz = this.add.circle(p.x, p.y, this.TILE * 0.6, 0xff6a3c, 0.6).setDepth(Z.aura).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: luz, scale: { from: 0.4, to: 2.2 }, alpha: { from: 0.9, to: 0.25 }, duration: 700, ease: 'Quad.easeOut' });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Manito guía (onboarding sin texto)
  // ─────────────────────────────────────────────────────────────────────────
  // Si el chico se queda quieto en los primeros niveles, aparece una mano que
  // señala la flecha que conviene tocar, siguiendo la ruta de piedritas.
  _programarManito(espera = 3200) {
    if (this.nivelIdx >= this.NIVELES_CON_MANITO || this.solved || this.enDemo) return;
    if (this._timerManito) this._timerManito.remove();
    this._timerManito = this.time.delayedCall(espera, () => this._mostrarManito());
  }

  _ocultarManito() {
    if (this._timerManito) { this._timerManito.remove(); this._timerManito = null; }
    if (this.manito) { this.tweens.killTweensOf(this.manito); this.manito.destroy(); this.manito = null; }
  }

  // dirección sugerida: la siguiente casilla de la ruta (null si no hay salida)
  _direccionSugerida() {
    const h = this.snake[0];
    const sig = this.ruta && this.ruta[this.rutaPos + 1];
    if (!sig) return null;
    return { dc: sig.c - h.c, dr: sig.r - h.r };
  }

  _mostrarManito() {
    this._ocultarManito();
    if (this.solved) return;
    const d = this._direccionSugerida();
    // sin salida → la mano señala el ↻
    const f = this.atascado ? this.btnReiniciar : (d && this.flechas[`${d.dc},${d.dr}`]);
    if (!f) return;
    const m = this.add.text(f.x + 18, f.y + 46, '👆', { fontSize: '44px' }).setOrigin(0.5).setDepth(Z.manito);
    this.manito = m;
    aparecer(this, m);
    this.tweens.add({ targets: m, y: m.y - 14, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 380 });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Victoria
  // ─────────────────────────────────────────────────────────────────────────
  _ganar() {
    this.solved = true;
    this._ocultarManito();
    if (this.caminoGfx) this.caminoGfx.clear();
    this._marcarAtasco();
    this.tiempoFin = Date.now();
    const segundos = this._segundos();
    GameState.registrarTiempo(this.nivelIdx, segundos);
    if (this.energyEmitter) this.energyEmitter.emitting = false;
    const puntos     = Math.max(300 - this.moveCount * 5, 20);
    // estrellas: 3 = óptimo, 2 = hasta +25%, 1 = completado.
    // Se calculan ANTES de completarNivel porque de ellas dependen las monedas.
    const estrellas  = this._estrellasPara(this.moveCount);
    const premio     = GameState.completarNivel(this.nivelIdx, puntos, estrellas);  // 0 si no mejoró
    const monedas    = premio.monedas;
    const mejorEstr  = GameState.registrarEstrellas(this.nivelIdx, estrellas);
    if (this.enTutorial && GameState.nivelesCompletados.length >= NIVELES_TUTORIAL) {
      GameState.avanzarTutorial(PASO.TIENDA);
      this.finTutorialPuzzle = true;
    }

    this._dibujarGrid();
    this._actualizarBandeja();
    this._celebrar();
    Sonido.victoria();

    this._encenderLed();
    this.time.delayedCall(450, () => { if (this.scene.isActive()) confeti(this, this.originX + this.gridW / 2, this.scale.height + 10); });
    this.time.delayedCall(850, () => {
      if (this.scene.isActive()) this._panelVictoria(estrellas, monedas, mejorEstr);
    });
  }

  _panelVictoria(estrellas, monedas, mejorEstr) {
    const { width, height } = this.scale;
    const cx = width / 2, cy = height / 2 + 10;
    const W = 400, H = 330;

    const objs = [];
    const velo = this.add.rectangle(0, 0, width, height, 0x1a0e06, 0.5).setOrigin(0).setDepth(Z.panel)
      .setInteractive();   // bloquea toques al tablero mientras está el panel
    velo.setAlpha(0);
    this.tweens.add({ targets: velo, alpha: 1, duration: 250 });
    objs.push(velo);

    const panel = this.add.container(cx, cy).setDepth(Z.panel + 1);
    objs.push(panel);
    panel.add(losa(this, 0, 0, W, H, { fill: CLAY.cremaClaro, borde: CLAY.borde, r: 34, canto: 12, grosor: 5 }));
    aparecer(this, panel);

    // el LED encendido corona el panel: "¡prendiste la luz!"
    const ledK = SpriteConfig.get('componentes', 'led');
    if (ledK && this.textures.exists(ledK)) {
      const halo = this.add.circle(0, -H / 2 + 4, 52, 0xffb04a, 0.55);
      panel.add(halo);
      this.tweens.add({ targets: halo, scale: { from: 0.9, to: 1.2 }, alpha: { from: 0.6, to: 0.25 }, duration: 600, yoyo: true, repeat: -1 });
      const led = this.add.image(0, -H / 2 + 4, ledK).setDisplaySize(96, 96);
      panel.add(led);
      this.tweens.add({ targets: led, angle: { from: -6, to: 6 }, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    // ── estrellas: caen de a una con su nota ──
    const yE = -H / 2 + 104;
    for (let i = 0; i < 3; i++) {
      const x = (i - 1) * 92;
      const tam = i === 1 ? 84 : 70;
      const yy = yE + (i === 1 ? -10 : 0);
      const vacia = estrella(this, x, yy, false, tam);
      panel.add(vacia);
      if (i < estrellas) {
        const llena = estrella(this, x, yy, true, tam).setScale(0).setAngle(-90);
        panel.add(llena);
        this.time.delayedCall(250 + i * 300, () => {
          if (!this.scene.isActive()) return;
          const sx = (tam / llena.width) || 1;
          this.tweens.add({ targets: llena, scale: sx, angle: 0, duration: 420, ease: 'Back.easeOut' });
          Sonido.estrella(i);
          chispas(this, cx + x, cy + yy, [0xffd54a, 0xffffff, 0xffa63a], { cantidad: 18, velocidad: 160, depth: Z.panel + 5 });
        });
      }
    }

    // ── monedas ganadas (con su "tin tin" contando) ──
    const yM = yE + 90;
    if (monedas > 0) {
      const m = this.add.container(0, yM);
      const mk = SpriteConfig.get('ui', 'moneda');
      if (mk && this.textures.exists(mk)) m.add(this.add.image(-38, 0, mk).setDisplaySize(46, 46));
      const t = this.add.text(-8, 0, '+0', estiloTexto(34, '#ffd54a', '#8a5a10', 6)).setOrigin(0, 0.5);
      m.add(t);
      panel.add(m);
      m.setAlpha(0);
      const arranque = 250 + estrellas * 300 + 100;
      this.tweens.add({ targets: m, alpha: 1, duration: 200, delay: arranque });
      const cont = { v: 0 };
      this.tweens.add({
        targets: cont, v: monedas, duration: 700, delay: arranque, ease: 'Quad.easeOut',
        onUpdate: () => {
          const v = Math.round(cont.v);
          if (v !== this._ultMoneda && v % 10 === 0) Sonido.moneda();
          this._ultMoneda = v;
          t.setText(`+${v}`);
        },
      });
    } else if (mejorEstr > estrellas) {
      // ya lo había hecho mejor: se lo recordamos con estrellitas chicas
      for (let i = 0; i < 3; i++) panel.add(estrella(this, -26 + i * 26, yM, i < mejorEstr, 22).setAlpha(0.8));
    }

    // ── botones: casita · reiniciar · siguiente ──
    const yB = H / 2 - 62;
    const siguienteIdx = this.nivelIdx + 1;
    const sigPack      = packRequerido(siguienteIdx);
    const sigBloqueado = sigPack && !GameState.tieneDesbloqueo(sigPack);
    const hayMas = siguienteIdx < LEVELS.length && GameState.puedeJugarHoy();

    // Tutorial: en los niveles 1-4 sólo ↻ y ▶ (con la manito señalando el ▶); al ganar
    // el 5º, el botón grande es la casita: vuelta al cuarto, donde espera la tienda.
    const bChico = toque(66);
    if (!this.enTutorial) panel.add(boton(this, -132, yB, { w: bChico, fill: CLAY.azul, icono: 'casita', onTap: () => irA(this, 'RoomScene') }));
    panel.add(boton(this, this.enTutorial ? -90 : -44, yB, { w: bChico, fill: CLAY.amarillo, icono: 'reiniciar', onTap: () => this._reiniciar() }));
    const guiar = (bx) => this.time.delayedCall(1700, () => {
      if (this.scene.isActive() && panel.active) mano(this, cx + bx, cy + yB + 6, { depth: Z.manito });
    });
    if (this.finTutorialPuzzle) {
      const casa = boton(this, 90, yB, { w: 132, h: 80, r: 34, fill: CLAY.azul, icono: 'casita', tamIcono: 44, sonido: 'pop',
        onTap: () => irA(this, 'RoomScene') });
      panel.add(casa);
      this.time.delayedCall(1600, () => { if (casa.active) respirar(this, casa, 0.06, 600); });
      guiar(90);
    } else if (hayMas && !sigBloqueado) {
      if (this.enTutorial) guiar(90);
      const sig = boton(this, 90, yB, { w: 132, h: 80, r: 34, fill: CLAY.verde, icono: 'play', tamIcono: 44, sonido: 'pop',
        onTap: () => irA(this, 'PuzzleScene', { nivelIdx: siguienteIdx }) });
      panel.add(sig);
      this.time.delayedCall(1600, () => { if (sig.active) respirar(this, sig, 0.06, 600); });
    } else if (hayMas && sigBloqueado) {
      // el próximo tablero se compra: candado + bolsita de la tienda
      const t = boton(this, 90, yB, { w: 132, h: 80, r: 34, fill: CLAY.naranja, icono: 'tienda', tamIcono: 40,
        onTap: () => irA(this, 'StoreScene', { cat: 'niveles' }) });
      panel.add(t);
      const lk = SpriteConfig.get('ui', 'candado');
      if (lk && this.textures.exists(lk)) panel.add(this.add.image(140, yB - 34, lk).setDisplaySize(40, 40));
    } else {
      // sin más niveles hoy: luna dormida (vuelve mañana)
      panel.add(this.add.text(90, yB - 4, '🌙', { fontSize: '54px' }).setOrigin(0.5));
    }

    // X chiquita: cerrar para mirar el circuito resuelto
    const x = boton(this, W / 2 - 16, -H / 2 + 16, { w: 40, fill: CLAY.rojo, icono: 'cerrar',
      onTap: () => objs.forEach(o => o.destroy()) });
    panel.add(x);
  }

  // segundos transcurridos desde que arrancó el nivel (congelado al resolverlo)
  _segundos() {
    const fin = this.tiempoFin ?? Date.now();
    return (fin - this.tiempoInicio) / 1000;
  }

  update() {
    if (this.solved) return;
    const { left, right, up, down } = this.cursors;
    if (Phaser.Input.Keyboard.JustDown(left))  this._mover(-1,  0);
    if (Phaser.Input.Keyboard.JustDown(right)) this._mover( 1,  0);
    if (Phaser.Input.Keyboard.JustDown(up))    this._mover( 0, -1);
    if (Phaser.Input.Keyboard.JustDown(down))  this._mover( 0,  1);
  }
}
