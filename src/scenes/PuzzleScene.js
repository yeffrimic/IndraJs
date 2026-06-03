import GameState    from '../state/GameState.js';
import SpriteConfig from '../SpriteConfig.js';
import { LEVELS, packRequerido } from '../levels.js';

export default class PuzzleScene extends Phaser.Scene {
  constructor() { super('PuzzleScene'); }

  init(data) {
    this.nivelIdx = data.nivelIdx || 0;
  }

  create() {
    const { width, height } = this.scale;
    const levelData = LEVELS[this.nivelIdx];
    if (!levelData) { this.scene.start('RoomScene'); return; }

    this.grid       = levelData.grid;
    this.ROWS       = this.grid.length;
    this.COLS       = this.grid[0].length;
    this.COMPONENTS = this._parseComponents(this.grid);
    this._calcularSerpiente();

    this.snake        = this._buildInitialSnake();
    this.moveCount    = 0;
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

    // óptimo exacto de pasos = (largo-1) + distancia del nacimiento a la batería.
    // (la cabeza debe llegar a la batería y luego trazar todo el cuerpo; validado por BFS)
    const head0  = this.snake[0];           // nacimiento de la serpiente (aún sin moverse)
    const bat    = this.bateriaCells[0];
    const idxBat = this.SNAKE_MAP.findIndex(sm => sm.sym === 'b');  // ahora en len-2 (no el último)
    this.OPTIMO = (bat && idxBat >= 0)
      ? idxBat + Math.abs(head0.c - bat.c) + Math.abs(head0.r - bat.r)
      : this.SNAKE_LENGTH;

    // ── zonas fijas ──
    const isMobile = window.isMobile || false;
    const HUD_H  = 36;
    const CTRL_W = isMobile ? 0   : 200;  // en móvil no hay columna derecha
    const HINT_H = isMobile ? 110 : 70;   // en móvil hint+pad comparten más espacio
    const PAD    = 8;
    const CTRL_X = width - CTRL_W;

    const gridZoneW = CTRL_X - PAD * 2;
    const gridZoneH = height - HUD_H - HINT_H - PAD * 2;

    const GAP     = 3;
    const maxTile = isMobile ? 44 : 64;
    const tileW   = Math.floor((gridZoneW - (this.COLS - 1) * GAP) / this.COLS);
    const tileH   = Math.floor((gridZoneH - (this.ROWS - 1) * GAP) / this.ROWS);
    this.TILE     = Math.min(tileW, tileH, maxTile);
    this.GAP     = GAP;

    const gridW  = this.COLS * this.TILE + (this.COLS - 1) * GAP;
    const gridH  = this.ROWS * this.TILE + (this.ROWS - 1) * GAP;

    // centrar el grid en su zona
    this.originX = PAD + Math.floor((gridZoneW - gridW) / 2);
    this.originY = HUD_H + PAD + Math.floor((gridZoneH - gridH) / 2);

    // ── fondo (placeholder → pixel art) ──
    SpriteConfig.fondo(this, 'puzzle', width, height, 0x0d0d1f);
    // ¿hay sprite de cuadro de grid cargado? (decide tiles imagen vs vectoriales)
    this.usaGridSprite = !!SpriteConfig.get('grid', 'tile') && this.textures.exists('tile');

    // zona controles fondo (solo desktop)
    if (!isMobile) {
      this.add.rectangle(CTRL_X, HUD_H, CTRL_W, height - HUD_H, 0x09091a).setOrigin(0);
      this.add.rectangle(CTRL_X, HUD_H, 1, height - HUD_H, 0x2a2a4a).setOrigin(0);
    }

    // zona hint fondo
    this.add.rectangle(0, height - HINT_H, CTRL_X, HINT_H, 0x080814).setOrigin(0);
    this.add.rectangle(0, height - HINT_H, CTRL_X, 1, 0x2a2a4a).setOrigin(0);

    this._crearHUD(levelData, CTRL_X);
    this.tileGraphics = this.add.graphics();
    this.tileObjects  = {};
    this._dibujarGrid();
    this._crearHintBar(height - HINT_H + 4, CTRL_X);
    this._crearControles(CTRL_X, width, HUD_H, height);

    this._crearParticulas();

    this.cursors = this.input.keyboard.createCursorKeys();
    this.input.keyboard.on('keydown-R', () => this._reiniciar());

    // status text
    const statusX = isMobile ? width / 2 : CTRL_X + CTRL_W / 2;
    const statusY = isMobile ? height - HINT_H + 6 : HUD_H + 14;
    this.statusTxt = this.add.text(statusX, statusY, '', {
      fontSize: isMobile ? '10px' : '12px',
      color: '#888', fontFamily: 'monospace',
      wordWrap: { width: isMobile ? width / 2 : CTRL_W - 16 },
      align: 'center'
    }).setOrigin(0.5, 0);

    this._actualizarStatus();
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

  _compDef(sym) {
    const defs = {
      b: { color: 0x4fc3f7, label: 'BAT', type: 'battery'   },
      r: { color: 0xce93d8, label: 'R',   type: 'resistor'  },
      c: { color: 0xa5d6a7, label: 'CAP', type: 'capacitor' },
      l: { color: 0xff7043, label: 'LED', type: 'led'        },
      s: { color: 0xfff176, label: 'SW',  type: 'switch'    },
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
      comp: null, color: 0x1a9e65, sym: null, label: null, order: null
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
    this.SNAKE_MAP[0] = { comp: null, color: 0x4fc3f7, sym: null, label: null, order: null };
  }

  _buildInitialSnake() {
    const s = [];
    let c = this.COLS - 1, r = 0;
    for (let i = 0; i < this.SNAKE_LENGTH; i++) {
      s.push({ c, r });
      if (r < this.ROWS - 1) r++;
      else c = Math.max(0, c - 1);
    }
    return s;
  }

  // ── HUD ──
  _crearHUD(levelData, ctrlX) {
    const { width } = this.scale;
    this.add.rectangle(0, 0, width, 36, 0x080814).setOrigin(0);
    this.add.rectangle(0, 36, width, 1, 0x2a2a4a).setOrigin(0);

    // botón selector de niveles — izquierda
    const nivBg = this.add.rectangle(10, 18, 26, 22, 0x12122a)
      .setStrokeStyle(1, 0x4fc3f7).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
    const nivTxt = this.add.text(23, 18, '☰', {
      fontSize: '15px', color: '#4fc3f7', fontFamily: 'monospace'
    }).setOrigin(0.5);
    const abrirNiveles = () => this.scene.start('LevelSelectScene', { desde: this.nivelIdx });
    nivBg.on('pointerover', () => nivBg.setFillStyle(0x1a1a3a));
    nivBg.on('pointerout',  () => nivBg.setFillStyle(0x12122a));
    nivBg.on('pointerdown', abrirNiveles);
    nivTxt.setInteractive({ useHandCursor: true }).on('pointerdown', abrirNiveles);

    // nombre nivel — izquierda
    this.add.text(44, 18, levelData.name.toUpperCase(), {
      fontSize: '11px', color: '#4fc3f7', fontFamily: 'monospace'
    }).setOrigin(0, 0.5);

    // puntos — centrado en zona grid
    this.add.text(ctrlX / 2, 18, `★ ${GameState.puntosTotal} pts`, {
      fontSize: '12px', color: '#fff176', fontFamily: 'monospace'
    }).setOrigin(0.5, 0.5);

    // botón salir — extremo derecho de zona grid con margen
    const salirBg = this.add.rectangle(ctrlX - 8, 18, 58, 22, 0x1a0a0a)
      .setStrokeStyle(1, 0xef5350)
      .setOrigin(1, 0.5)
      .setInteractive({ useHandCursor: true });
    const salirTxt = this.add.text(ctrlX - 37, 18, 'salir', {
      fontSize: '11px', color: '#ef5350', fontFamily: 'monospace'
    }).setOrigin(0.5, 0.5);
    salirBg.on('pointerover',  () => salirBg.setFillStyle(0x3a0a0a));
    salirBg.on('pointerout',   () => salirBg.setFillStyle(0x1a0a0a));
    salirBg.on('pointerdown',  () => this.scene.start('RoomScene'));
    salirTxt.setInteractive({ useHandCursor: true });
    salirTxt.on('pointerdown', () => this.scene.start('RoomScene'));

    // movimientos — justo antes del botón salir
    this.moveTxt = this.add.text(ctrlX - 74, 18, 'mov: 0', {
      fontSize: '11px', color: '#a5d6a7', fontFamily: 'monospace'
    }).setOrigin(1, 0.5);
  }

  // ── grid ──
  _dibujarGrid() {
    const g  = this.tileGraphics;
    const T  = this.TILE;
    const ox = this.originX;
    const oy = this.originY;
    g.clear();

    for (let r = 0; r < this.ROWS; r++) {
      for (let c = 0; c < this.COLS; c++) {
        const tx  = ox + c * (T + this.GAP);
        const ty  = oy + r * (T + this.GAP);
        const tcx = tx + T / 2;
        const tcy = ty + T / 2;
        const si    = this.snake.findIndex(s => s.c === c && s.r === r);
        const sm    = si >= 0 ? this.SNAKE_MAP[si] : null;
        const comp  = this.COMPONENTS.find(co => co.c === c && co.r === r);
        const swKey = `${c},${r}`;

        // fondo + borde del cuadro — vectorial (placeholder); se omite si hay sprite de tile
        if (!this.usaGridSprite) {
          let bg = 0x1e1e3a;
          if (si === 0)                                   bg = 0x0d0d1f;
          else if (si > 0 && si < this.snake.length - 1) bg = 0x091e12;
          else if (si === this.snake.length - 1)          bg = 0x071610;
          g.fillStyle(bg);
          g.fillRoundedRect(tx, ty, T, T, 4);

          let borderCol = 0x2a2a4a, borderW = 1;
          if (si > 0 && sm)   { borderCol = sm.color; borderW = 1.5; }
          if (si === 0)       { borderCol = 0x000000; borderW = 0; }
          if (comp && si < 0) { borderCol = this._compDef(comp.sym).color; borderW = 2; }
          if (comp && si >= 0){ borderCol = 0xffffff; borderW = 2; }
          if (comp && comp.sym === 's' && si >= 0 && this.connected && !this.solved) {
            borderCol = 0xfff176; borderW = 2.5;
          }
          if (this.solved) { borderCol = 0x4caf50; borderW = 2; }
          if (borderW > 0) {
            g.lineStyle(borderW, borderCol, 1);
            g.strokeRoundedRect(tx, ty, T, T, 4);
          }
        }

        // limpiar objetos anteriores
        const tkey = `${c},${r}`;
        if (this.tileObjects[tkey]) this.tileObjects[tkey].forEach(o => {
          this.tweens.killTweensOf(o); o.destroy();
        });
        this.tileObjects[tkey] = [];

        // cuadro como sprite (si hay pixel art de tile cargado)
        if (this.usaGridSprite) {
          const tn = si === 0 ? 'tile_head'
                   : si > 0   ? 'tile_body'
                   : comp     ? 'tile_goal' : 'tile';
          const timg = SpriteConfig.colocar(this, 'grid', tn, tcx, tcy,
            () => SpriteConfig.colocar(this, 'grid', 'tile', tcx, tcy, null));
          if (timg) { timg.setDisplaySize(T, T); this.tileObjects[tkey].push(timg); }
        }

        // ── cuerpo / cola de la serpiente (sprite de plastilina) — base del segmento ──
        let cuerpoSprite = false;
        if (si > 0) {
          const esCola = si === this.snake.length - 1;
          const ck = SpriteConfig.get('serpiente', esCola ? 'cola' : 'cuerpo');
          if (ck && this.textures.exists(ck)) {
            const seg = this.add.image(tcx, tcy, ck).setDisplaySize(T, T);
            if (esCola) {                       // cola: orientar hacia afuera (lejos del cuerpo)
              const nb = this.snake[si - 1];
              if (nb) seg.setAngle(Phaser.Math.RadToDeg(Math.atan2(r - nb.r, c - nb.c)));
            } else {                            // cuerpo: rotar el enlace según su orientación
              const prev = this.snake[si - 1];  // vecino hacia la cabeza
              if (prev) seg.setAngle(Phaser.Math.RadToDeg(Math.atan2(prev.r - r, prev.c - c)));
            }
            this.tileObjects[tkey].push(seg);
            cuerpoSprite = true;
          }
        }

        // corriente: se iluminan los segmentos energizados [lowerIdx..contactIdx].
        // un switch abierto sube lowerIdx y corta el flujo antes de la cabeza.
        if (!this.solved && this.contactIdx >= 0 && si >= this.lowerIdx && si <= this.contactIdx) {
          const delay = si * 70;  // cabeza(0) primero → hacia el punto de contacto
          // relleno encendido (queda claramente iluminado, pulsando)
          const flow = this.add.rectangle(tcx, tcy, T * 0.96, T * 0.96, 0x4fc3f7, 1)
            .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.35);
          this.tweens.add({
            targets: flow, alpha: { from: 0.35, to: 0.75 },
            duration: 480, delay, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
          });
          // borde brillante para reforzar el "encendido"
          const ring = this.add.rectangle(tcx, tcy, T * 0.96, T * 0.96)
            .setStrokeStyle(2, 0x9fe6ff, 0.9);
          this.tweens.add({
            targets: ring, alpha: { from: 0.4, to: 1 },
            duration: 480, delay, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
          });
          this.tileObjects[tkey].push(flow, ring);
        }

        // glow pulsante en componentes alineados (encendidos por la corriente)
        if (comp && si >= 0 && sm && sm.comp && this._segmentoAlineado(si)) {
          const glow = this.add.circle(tcx, tcy, T * 0.5, sm.color, 0.35)
            .setBlendMode(Phaser.BlendModes.ADD);
          this.tweens.add({
            targets: glow, alpha: { from: 0.15, to: 0.5 }, scale: { from: 0.85, to: 1.1 },
            duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
          });
          this.tileObjects[tkey].push(glow);
        }

        // ── figura objetivo del componente — visible mientras se juega ──
        // (resuelto: no se dibuja, la serpiente cubre todo limpio)
        if (comp && !this.solved) {
          const cubierto = si >= 0;  // hay un segmento de serpiente sobre la celda
          const def  = this._compDef(comp.sym);
          const objs = this._dibujarSimbolo(comp.sym, tcx, tcy - T * 0.1, T * 0.32, def.color, this.switchStates[swKey]);
          // bajo la serpiente la figura va un poco tenue, pero presente
          objs.forEach(o => o.setAlpha(cubierto ? 0.55 : 1));
          this.tileObjects[tkey].push(...objs);
          const col  = `#${def.color.toString(16).padStart(6,'0')}`;
          const lbl  = this.add.text(tcx, tcy + T * 0.22, def.label, {
            fontSize: `${Math.max(9, Math.floor(T * 0.16))}px`, color: col, fontFamily: 'monospace',
            stroke: '#000000', strokeThickness: 2
          }).setOrigin(0.5).setAlpha(cubierto ? 0.6 : 1);
          // número de orden — SIEMPRE nítido (referencia clave que no debe perderse)
          const numSz  = Math.max(13, Math.floor(T * 0.26));
          const chipR  = numSz * 0.78;
          const chipX  = tx + T - chipR - 2;
          const chipY  = ty + chipR + 2;
          const chip   = this.add.circle(chipX, chipY, chipR, 0x0d0d1f, 0.9)
            .setStrokeStyle(1.5, def.color);
          const num    = this.add.text(chipX, chipY, `${comp.order}`, {
            fontSize: `${numSz}px`, color: '#ffffff', fontFamily: 'monospace',
            stroke: '#000000', strokeThickness: 2
          }).setOrigin(0.5);
          this.tileObjects[tkey].push(lbl, chip, num);
        }

        // ── serpiente encima — translúcida sobre componentes (opaca al resolver) ──
        const snakeAlpha = (comp && !this.solved) ? 0.5 : 1;  // deja ver el objetivo debajo
        if (si === 0) {
          const objs = this._dibujarCabeza(tx, ty, T, this.headDir);
          objs.forEach(o => o.setAlpha(snakeAlpha));
          this.tileObjects[tkey].push(...objs);
        }
        // cuerpo con componente
        else if (si > 0 && sm && sm.sym) {
          const objs = this._dibujarSimbolo(sm.sym, tcx, tcy, T * 0.28, sm.color, this.switchStates[swKey]);
          objs.forEach(o => o.setAlpha(snakeAlpha));
          this.tileObjects[tkey].push(...objs);
        }
        // cuerpo vacío (punto) — solo si NO hay sprite de cuerpo
        else if (si > 0 && sm && !sm.sym && !cuerpoSprite) {
          const dot = this.add.circle(tcx, tcy, T * 0.08, sm.color, 0.35);
          this.tileObjects[tkey].push(dot);
        }

        // zona clickeable switch
        if (comp && comp.sym === 's' && this.connected && !this.solved) {
          const zone = this.add.rectangle(tcx, tcy, T - 4, T - 4, 0xffffff, 0)
            .setInteractive({ useHandCursor: true });
          zone.on('pointerdown', () => this._toggleSwitch(swKey));
          this.tileObjects[tkey].push(zone);
        }
      }
    }
  }

  _dibujarCabeza(tx, ty, T, dir) {
    const cx = tx + T / 2;
    const cy = ty + T / 2;
    const dc = dir.dc, dr = dir.dr;

    // sprite de cabeza (rotado según dirección) si está disponible
    const headKey = SpriteConfig.get('serpiente', 'cabeza');
    if (headKey && this.textures.exists(headKey)) {
      const ang = dc === 1 ? 0 : dc === -1 ? 180 : dr === 1 ? 90 : -90;  // arte mira a la derecha
      const img = this.add.image(cx, cy, headKey).setDisplaySize(T, T).setAngle(ang);
      return [img];
    }

    const objs = [];
    const g  = this.add.graphics();
    const m  = 2;

    let pts;
    if (dc === 1  && dr === 0)  pts = [[tx+m,ty+m],[tx+T*0.7,ty+m],[tx+T-m,cy],[tx+T*0.7,ty+T-m],[tx+m,ty+T-m]];
    else if (dc === -1 && dr === 0) pts = [[tx+T-m,ty+m],[tx+T*0.3,ty+m],[tx+m,cy],[tx+T*0.3,ty+T-m],[tx+T-m,ty+T-m]];
    else if (dc === 0 && dr === -1) pts = [[tx+m,ty+T-m],[tx+m,ty+T*0.3],[cx,ty+m],[tx+T-m,ty+T*0.3],[tx+T-m,ty+T-m]];
    else pts = [[tx+m,ty+m],[tx+T-m,ty+m],[tx+T-m,ty+T*0.7],[cx,ty+T-m],[tx+m,ty+T*0.7]];

    g.fillStyle(0x0a1a2a, 1);
    g.beginPath(); g.moveTo(pts[0][0],pts[0][1]);
    pts.slice(1).forEach(p => g.lineTo(p[0],p[1]));
    g.closePath(); g.fillPath();

    g.fillStyle(0x4fc3f7, 0.07);
    g.beginPath(); g.moveTo(pts[0][0],pts[0][1]);
    pts.slice(1).forEach(p => g.lineTo(p[0],p[1]));
    g.closePath(); g.fillPath();

    g.lineStyle(2, 0x4fc3f7, 1);
    g.beginPath(); g.moveTo(pts[0][0],pts[0][1]);
    pts.slice(1).forEach(p => g.lineTo(p[0],p[1]));
    g.closePath(); g.strokePath();
    objs.push(g);

    // ojos
    const eo = T * 0.28;
    let ex1, ey1, ex2, ey2;
    if (dc === 1  && dr === 0)  { ex1=cx-eo; ey1=cy-eo*0.8; ex2=cx-eo; ey2=cy+eo*0.8; }
    else if (dc === -1 && dr === 0) { ex1=cx+eo; ey1=cy-eo*0.8; ex2=cx+eo; ey2=cy+eo*0.8; }
    else if (dc === 0 && dr === -1) { ex1=cx-eo*0.8; ey1=cy+eo; ex2=cx+eo*0.8; ey2=cy+eo; }
    else { ex1=cx-eo*0.8; ey1=cy-eo; ex2=cx+eo*0.8; ey2=cy-eo; }

    const ge = this.add.graphics();
    ge.fillStyle(0x4fc3f7, 0.9); ge.fillCircle(ex1,ey1,T*0.09); ge.fillCircle(ex2,ey2,T*0.09);
    ge.fillStyle(0x020d16, 1);   ge.fillCircle(ex1,ey1,T*0.045); ge.fillCircle(ex2,ey2,T*0.045);
    ge.fillStyle(0xffffff, 0.85); ge.fillCircle(ex1+1,ey1-1,T*0.025); ge.fillCircle(ex2+1,ey2-1,T*0.025);
    objs.push(ge);

    // lengua bífida
    const lt = T * 0.14, lf = T * 0.1;
    let lx, ly, l2x, l2y, l3x, l3y, l4x, l4y;
    if (dc === 1  && dr === 0)  { lx=tx+T-m; ly=cy; l2x=lx+lt; l2y=cy; l3x=l2x+lf; l3y=cy-lf; l4x=l2x+lf; l4y=cy+lf; }
    else if (dc === -1 && dr === 0) { lx=tx+m; ly=cy; l2x=lx-lt; l2y=cy; l3x=l2x-lf; l3y=cy-lf; l4x=l2x-lf; l4y=cy+lf; }
    else if (dc === 0 && dr === -1) { lx=cx; ly=ty+m; l2x=cx; l2y=ly-lt; l3x=cx-lf; l3y=l2y-lf; l4x=cx+lf; l4y=l2y-lf; }
    else { lx=cx; ly=ty+T-m; l2x=cx; l2y=ly+lt; l3x=cx-lf; l3y=l2y+lf; l4x=cx+lf; l4y=l2y+lf; }
    const gl = this.add.graphics();
    gl.lineStyle(2, 0xff7043, 1);
    gl.beginPath(); gl.moveTo(lx,ly); gl.lineTo(l2x,l2y); gl.strokePath();
    gl.lineStyle(1.5, 0xff7043, 1);
    gl.beginPath(); gl.moveTo(l2x,l2y); gl.lineTo(l3x,l3y); gl.strokePath();
    gl.beginPath(); gl.moveTo(l2x,l2y); gl.lineTo(l4x,l4y); gl.strokePath();
    objs.push(gl);
    return objs;
  }

  _dibujarSimbolo(sym, cx, cy, sz, color, swClosed) {
    // sprite del componente si está disponible (placeholder → pixel art)
    const compName = { b: 'bateria', r: 'resistencia', c: 'capacitor', l: 'led',
                       s: swClosed ? 'switch_on' : 'switch' }[sym];
    const spriteKey = compName && SpriteConfig.get('componentes', compName);
    if (spriteKey && this.textures.exists(spriteKey)) {
      const img = this.add.image(cx, cy, spriteKey).setDisplaySize(sz * 2.4, sz * 2.4);
      return [img];
    }

    const objs = [];
    const g = this.add.graphics();
    g.lineStyle(2, color, 1);
    if (sym === 'b' || sym === 'l') {
      g.strokeCircle(cx, cy, sz);
    } else if (sym === 'r') {
      g.strokeRect(cx - sz, cy - sz * 0.55, sz * 2, sz * 1.1);
    } else if (sym === 'c') {
      g.strokeTriangle(cx, cy - sz, cx - sz, cy + sz * 0.8, cx + sz, cy + sz * 0.8);
    } else if (sym === 's') {
      if (swClosed) {
        g.strokeRect(cx - sz, cy - sz * 0.3, sz * 2, sz * 0.6);
      } else {
        g.beginPath(); g.moveTo(cx - sz, cy); g.lineTo(cx - sz * 0.2, cy); g.strokePath();
        g.beginPath(); g.moveTo(cx + sz * 0.2, cy - sz * 0.6); g.lineTo(cx + sz, cy); g.strokePath();
        g.strokeCircle(cx - sz * 0.2, cy - sz * 0.6, sz * 0.12);
      }
    }
    objs.push(g);
    return objs;
  }

  // ── barra de pista (oculta hasta hacer click) ──
  _crearHintBar(barY, maxX) {
    const isMobile = window.isMobile || false;
    this.hintBarY  = barY;
    this.hintCy    = barY + (isMobile ? 36 : 34);
    this.hintSeqObjs = [];     // objetos de la secuencia revelada
    this.hintTiles   = [];     // fondos de cada componente (para resaltar alineados)

    // botón de pista a la izquierda; la secuencia se dibuja a su derecha
    const zoneLeft = isMobile ? 150 : 10;
    const btnW = isMobile ? 96 : 120, btnH = isMobile ? 30 : 34;
    this.seqStartX = zoneLeft + btnW + (isMobile ? 10 : 20);

    this.pistaBg = this.add.rectangle(zoneLeft, this.hintCy, btnW, btnH, 0x12122a)
      .setOrigin(0, 0.5).setStrokeStyle(1.5, 0xfff176)
      .setInteractive({ useHandCursor: true });
    this.pistaTxt = this.add.text(zoneLeft + btnW / 2, this.hintCy, '', {
      fontSize: isMobile ? '11px' : '12px', color: '#fff176', fontFamily: 'monospace'
    }).setOrigin(0.5);
    this.pistaBg.on('pointerover', () => this.pistaBg.setFillStyle(0x1a1a2a));
    this.pistaBg.on('pointerout',  () => this.pistaBg.setFillStyle(0x12122a));
    this.pistaBg.on('pointerdown', () => this._revelarPista());
    this.pistaTxt.setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._revelarPista());

    this._dibujarBotonPista();
  }

  _dibujarBotonPista() {
    const n = GameState.pistas;
    if (this.pistaRevelada) {
      this.pistaTxt.setText(`pista (${n})`);
      this.pistaTxt.setColor('#4caf50');
      this.pistaBg.setStrokeStyle(1.5, 0x4caf50);
    } else if (n > 0) {
      this.pistaTxt.setText(`💡 pista (${n})`);
      this.pistaTxt.setColor('#fff176');
      this.pistaBg.setStrokeStyle(1.5, 0xfff176);
    } else {
      this.pistaTxt.setText('🔒 conseguir');
      this.pistaTxt.setColor('#4fc3f7');
      this.pistaBg.setStrokeStyle(1.5, 0x4fc3f7);
    }
  }

  _revelarPista() {
    if (this.pistaRevelada) return;
    if (GameState.pistas > 0) {
      GameState.usarPista();
      this.pistaRevelada = true;
      this._dibujarSecuenciaPista();
      this._actualizarHintTiles();
      this._dibujarBotonPista();
    } else {
      // sin pistas → a la tienda a comprar más
      this.scene.start('StoreScene', { cat: 'mejoras' });
    }
  }

  // dibuja SOLO la secuencia de componentes en orden (sin huecos ni cabeza)
  _dibujarSecuenciaPista() {
    this.hintSeqObjs.forEach(o => o.destroy());
    this.hintSeqObjs = [];
    this.hintTiles   = [];

    const isMobile = window.isMobile || false;
    const tileW = isMobile ? 40 : 48, gap = isMobile ? 8 : 12;
    const tileH = isMobile ? 46 : 52;
    const cy    = this.hintCy;
    const comps = this.COMPONENTS;  // ya ordenado por order

    comps.forEach((comp, i) => {
      const def = this._compDef(comp.sym);
      const col = `#${def.color.toString(16).padStart(6,'0')}`;
      const hx  = this.seqStartX + i * (tileW + gap);
      const hcx = hx + tileW / 2;

      const bg = this.add.rectangle(hcx, cy, tileW, tileH, 0x12122a)
        .setStrokeStyle(1.5, def.color);
      this.hintTiles.push(bg);
      this.hintSeqObjs.push(bg);

      // etiqueta arriba (distingue BAT vs LED, ambos círculos)
      const lbl = this.add.text(hcx, cy - tileH / 2 + 8, def.label, {
        fontSize: '8px', color: col, fontFamily: 'monospace'
      }).setOrigin(0.5);
      this.hintSeqObjs.push(lbl);

      // símbolo al centro
      const symObjs = this._dibujarSimbolo(comp.sym, hcx, cy - 1, tileW * 0.18, def.color, false);
      this.hintSeqObjs.push(...symObjs);

      // número de orden — grande
      const num = this.add.text(hcx, cy + tileH / 2 - 9, `${comp.order}`, {
        fontSize: isMobile ? '14px' : '16px', color: '#ffffff', fontFamily: 'monospace',
        stroke: '#000000', strokeThickness: 3
      }).setOrigin(0.5);
      this.hintSeqObjs.push(num);

      // flecha de secuencia
      if (i < comps.length - 1) {
        const arrow = this.add.text(hx + tileW + gap / 2, cy, '›', {
          fontSize: '16px', color: '#555', fontFamily: 'monospace'
        }).setOrigin(0.5);
        this.hintSeqObjs.push(arrow);
      }
    });
  }

  _actualizarHintTiles() {
    if (!this.pistaRevelada || !this.hintTiles.length) return;
    this.COMPONENTS.forEach((comp, i) => {
      const tile = this.hintTiles[i];
      if (!tile) return;
      const segIdx = this.SNAKE_MAP.findIndex(sm => sm.comp && sm.order === comp.order);
      const alineado = segIdx >= 0 && this._segmentoAlineado(segIdx);
      tile.setFillStyle(alineado ? 0x0a1e0a : 0x12122a);
      tile.setStrokeStyle(alineado ? 2.5 : 1.5,
        alineado ? 0x4caf50 : this._compDef(comp.sym).color);
    });
  }

  // ── controles — zona derecha centrada ──
  _crearControles(ctrlX, width, hudH, height) {
    const isMobile = window.isMobile || false;
    const btnSz  = isMobile ? 30 : 46;
    const gap    = isMobile ? 3  : 5;
    const zoneCX = ctrlX + (width - ctrlX) / 2;
    const padCY  = hudH + 40 + (height - hudH - 40 - 20 - btnSz) / 2 + btnSz / 2 + 30;
    // posición del pad
    // pad centrado verticalmente en la zona inferior
    // zona inferior empieza en height-HINT_H = height-110
    // pad height total = btnSz*3 + gap*2
    const padTotalH = btnSz * 3 + gap * 2;
    const zoneStart = isMobile ? height - 110 : 0;
    const padX = isMobile ? btnSz + gap + 6 : zoneCX;
    const padY = isMobile ? zoneStart + (110 - padTotalH) / 2 + padTotalH / 2 : padCY;

    const dirs = [
      { label: '▲', key: 'btn_up',    dc:  0, dr: -1, x: padX,              y: padY - btnSz - gap },
      { label: '▼', key: 'btn_down',  dc:  0, dr:  1, x: padX,              y: padY + btnSz + gap },
      { label: '◀', key: 'btn_left',  dc: -1, dr:  0, x: padX - btnSz - gap, y: padY },
      { label: '▶', key: 'btn_right', dc:  1, dr:  0, x: padX + btnSz + gap, y: padY },
    ];

    dirs.forEach(d => {
      const btn = this.add.rectangle(d.x, d.y, btnSz, btnSz, 0x12122a)
        .setStrokeStyle(1.5, 0x2a2a5a)
        .setInteractive({ useHandCursor: true });
      // flecha: sprite (ui.btn_*) o glifo de texto como fallback
      const arr = SpriteConfig.colocar(this, 'ui', d.key, d.x, d.y, () => this.add.text(d.x, d.y, d.label, {
        fontSize: '22px', color: '#4fc3f7', fontFamily: 'monospace'
      }).setOrigin(0.5));
      if (arr instanceof Phaser.GameObjects.Image) arr.setDisplaySize(btnSz * 1.3, btnSz * 1.3);
      btn.on('pointerdown', () => this._mover(d.dc, d.dr));
      btn.on('pointerover',  () => { btn.setFillStyle(0x1a1a3a); btn.setStrokeStyle(1.5, 0x4fc3f7); });
      btn.on('pointerout',   () => { btn.setFillStyle(0x12122a); btn.setStrokeStyle(1.5, 0x2a2a5a); });
    });

    // reiniciar — en móvil a la derecha del pad, en desktop debajo
    const rstY = isMobile ? padY + btnSz + gap + btnSz + 20 : padCY + btnSz + gap + btnSz + 20;
    const rstX = isMobile ? padX : zoneCX;
    const rstBg = this.add.rectangle(rstX, rstY, 110, 26, 0x12122a)
      .setStrokeStyle(1, 0x333355)
      .setInteractive({ useHandCursor: true });
    const rstTxt = this.add.text(rstX, rstY, 'R — reiniciar', {
      fontSize: '11px', color: '#555', fontFamily: 'monospace'
    }).setOrigin(0.5);
    rstBg.on('pointerover',  () => { rstBg.setFillStyle(0x1a1a2a); rstTxt.setColor('#888'); });
    rstBg.on('pointerout',   () => { rstBg.setFillStyle(0x12122a); rstTxt.setColor('#555'); });
    rstBg.on('pointerdown',  () => this._reiniciar());
    rstTxt.setInteractive({ useHandCursor: true });
    rstTxt.on('pointerdown', () => this._reiniciar());

    // en móvil también mover el status text arriba del pad
    if (isMobile && this.statusTxt) {
      this.statusTxt.setPosition(padX, padY - btnSz * 3);
      this.statusTxt.setOrigin(0.5, 0);
    }
  }

  // ── partículas / energía ──
  _crearParticulas() {
    // textura blanca generada en runtime (sin assets) — se tiñe con `tint`
    if (!this.textures.exists('chispa')) {
      const g = this.make.graphics({ add: false });
      g.fillStyle(0xffffff, 1); g.fillCircle(8, 8, 8);
      g.fillStyle(0xffffff, 0.4); g.fillCircle(8, 8, 5);
      g.generateTexture('chispa', 16, 16);
      g.destroy();
    }
    // emisor de energía persistente (sobrevive a los redibujados por paso)
    this.energyEmitter = this.add.particles(0, 0, 'chispa', {
      speed:     { min: 8, max: 36 },
      angle:     { min: 0, max: 360 },
      scale:     { start: 0.5, end: 0 },
      alpha:     { start: 0.9, end: 0 },
      lifespan:  500,
      frequency: 55,
      quantity:  1,
      tint:      0x4fc3f7,
      blendMode: 'ADD',
      emitting:  false,
    });
    this.energyEmitter.setDepth(100);
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

  // anillo breve en la cabeza al moverse (sensación de paso)
  _popCabeza() {
    const head = this.snake[0];
    const p = this._celdaCentro(head.c, head.r);
    const ring = this.add.circle(p.x, p.y, this.TILE * 0.3, 0x4fc3f7, 0.35)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(98);
    this.tweens.add({
      targets: ring, scale: 1.6, alpha: 0, duration: 220, ease: 'Quad.easeOut',
      onComplete: () => ring.destroy()
    });
  }

  // centro en pixeles de una celda del grid
  _celdaCentro(c, r) {
    const T = this.TILE;
    return {
      x: this.originX + c * (T + this.GAP) + T / 2,
      y: this.originY + r * (T + this.GAP) + T / 2,
    };
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
    const burst = this.add.particles(p.x, p.y, 'chispa', {
      speed:     { min: 30, max: 90 },
      angle:     { min: 0, max: 360 },
      scale:     { start: 0.7, end: 0 },
      alpha:     { start: 1, end: 0 },
      lifespan:  450,
      tint:      color,
      blendMode: 'ADD',
      emitting:  false,
    });
    burst.setDepth(101);
    burst.explode(14);
    this.time.delayedCall(550, () => burst.destroy());

    // flash radial
    const flash = this.add.circle(p.x, p.y, this.TILE * 0.5, color, 0.6).setDepth(99);
    this.tweens.add({
      targets: flash, scale: 1.8, alpha: 0, duration: 400,
      onComplete: () => flash.destroy()
    });
  }

  // ráfaga de celebración a lo largo de toda la serpiente
  _celebrar() {
    this.snake.forEach((seg, i) => {
      const sm = this.SNAKE_MAP[i];
      const color = (sm && sm.color) || 0x4caf50;
      this.time.delayedCall(i * 35, () => {
        if (!this.scene.isActive()) return;
        const p = this._celdaCentro(seg.c, seg.r);
        const burst = this.add.particles(p.x, p.y, 'chispa', {
          speed: { min: 40, max: 110 }, angle: { min: 0, max: 360 },
          scale: { start: 0.7, end: 0 }, alpha: { start: 1, end: 0 },
          lifespan: 600, tint: color, blendMode: 'ADD', emitting: false,
        });
        burst.setDepth(101);
        burst.explode(16);
        this.time.delayedCall(700, () => burst.destroy());
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
    if (seCierra) {
      const [c, r] = key.split(',').map(Number);
      this._chispazo(c, r, 0x4fc3f7);
    }

    this._calcEnergia();  // recalcular la compuerta de energía
    const allClosed = Object.values(this.switchStates).every(v => v === true);
    if (allClosed) this._ganar();
    else { this._dibujarGrid(); this._actualizarEnergia(); this._actualizarStatus(); }
  }

  _mover(dc, dr) {
    if (this.solved) return;
    const head = this.snake[0];
    const nc   = head.c + dc, nr = head.r + dr;
    if (nc < 0 || nc >= this.COLS || nr < 0 || nr >= this.ROWS) return;
    if (this.snake.some(s => s.c === nc && s.r === nr)) return;
    this.snake.unshift({ c: nc, r: nr });
    this.snake.pop();
    this.moveCount++;
    this.headDir = { dc, dr };
    this.moveTxt.setText(`mov: ${this.moveCount}`);
    this.connected = this._checkConectado();

    // energía: corriente desde donde la serpiente toca la celda de la batería
    this._calcEnergia();
    // detectar componentes recién alineados para el chispazo
    this._detectarNuevosAlineados();

    const hasSwitches = this.COMPONENTS.some(c => c.sym === 's');
    if (this.connected && !hasSwitches) this._ganar();
    else {
      this._dibujarGrid();
      this._popCabeza();
      this._actualizarEnergia();
      this._actualizarHintTiles();
      this._actualizarStatus();
    }
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
        }
      }
    });
    this._alineadosPrev = ahora;
  }

  _reiniciar() {
    this.scene.restart({ nivelIdx: this.nivelIdx });
  }

  _ganar() {
    this.solved = true;
    if (this.energyEmitter) this.energyEmitter.emitting = false;
    const puntos     = Math.max(300 - this.moveCount * 5, 20);
    const eraPrimera = !GameState.nivelesCompletados.includes(this.nivelIdx);
    const ganados    = GameState.completarNivel(this.nivelIdx, puntos);  // 0 si no mejoró
    const mejor      = GameState.mejorPuntaje[this.nivelIdx] || puntos;
    // estrellas: 3 = óptimo, 2 = hasta +25%, 1 = completado
    const estrellas  = this.moveCount <= this.OPTIMO ? 3
                     : this.moveCount <= Math.ceil(this.OPTIMO * 1.25) ? 2 : 1;
    const mejorEstr  = GameState.registrarEstrellas(this.nivelIdx, estrellas);
    this._dibujarGrid();
    this._celebrar();

    const { width, height } = this.scale;
    const CTRL_X = width - 200;
    const panelW = Math.min(320, CTRL_X - 40);
    const panelX = (CTRL_X - panelW) / 2 + panelW / 2;

    // todos los objetos del panel se registran para poder cerrarlo con la X
    const panelObjs = [];
    const reg = o => { panelObjs.push(o); return o; };

    reg(this.add.rectangle(panelX, height / 2, panelW, 218, 0x080814, 0.97)
      .setStrokeStyle(2, 0x4caf50));
    reg(this.add.text(panelX, height / 2 - 88, '¡CIRCUITO COMPLETO!', {
      fontSize: '17px', color: '#4caf50', fontFamily: 'monospace'
    }).setOrigin(0.5));

    // ── botón X — cerrar el panel para ver la solución ──
    const cerrar = reg(this.add.text(panelX + panelW / 2 - 16, height / 2 - 109 + 15, '✕', {
      fontSize: '16px', color: '#888', fontFamily: 'monospace'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }));
    cerrar.on('pointerover', () => cerrar.setColor('#ef5350'));
    cerrar.on('pointerout',  () => cerrar.setColor('#888'));
    cerrar.on('pointerdown', () => panelObjs.forEach(o => o.destroy()));

    // ── estrellas (★ ganadas en esta partida) — sprite o glifo ──
    const fillKey = SpriteConfig.get('ui', 'estrella_llena');
    if (fillKey && this.textures.exists(fillKey)) {
      const sz = 28, gap = 8, total = 3 * sz + 2 * gap;
      const sx = panelX - total / 2 + sz / 2;
      for (let i = 0; i < 3; i++) {
        const name = i < estrellas ? 'estrella_llena' : 'estrella_vacia';
        const im = SpriteConfig.colocar(this, 'ui', name, sx + i * (sz + gap), height / 2 - 60, null);
        if (im) {
          reg(im).setDisplaySize(sz, sz).setAlpha(0);
          this.tweens.add({ targets: im, alpha: 1, duration: 300, delay: i * 80, ease: 'Back.easeOut' });
        }
      }
    } else {
      const starStr = '★'.repeat(estrellas) + '☆'.repeat(3 - estrellas);
      const star = reg(this.add.text(panelX, height / 2 - 60, starStr, {
        fontSize: '30px', color: '#fff176', fontFamily: 'monospace'
      }).setOrigin(0.5));
      star.setScale(0.4); star.setAlpha(0);
      this.tweens.add({ targets: star, scale: 1, alpha: 1, duration: 350, ease: 'Back.easeOut' });
    }
    if (mejorEstr > estrellas) {
      reg(this.add.text(panelX, height / 2 - 40, `mejor: ${'★'.repeat(mejorEstr)}`, {
        fontSize: '10px', color: '#888', fontFamily: 'monospace'
      }).setOrigin(0.5));
    }

    reg(this.add.text(panelX, height / 2 - 24, `movimientos: ${this.moveCount}  ·  óptimo: ${this.OPTIMO}`, {
      fontSize: '11px', color: '#888', fontFamily: 'monospace'
    }).setOrigin(0.5));
    // puntaje otorgado — distingue primera vez / récord mejorado / sin mejora
    let scoreTxt, scoreCol, scoreSz;
    if (ganados > 0 && eraPrimera) {
      scoreTxt = `+${ganados} puntos`;            scoreCol = '#fff176'; scoreSz = '18px';
    } else if (ganados > 0) {
      scoreTxt = `+${ganados} pts · ¡nuevo récord!`; scoreCol = '#4caf50'; scoreSz = '15px';
    } else {
      scoreTxt = `sin mejora · tu récord: ${mejor} pts`; scoreCol = '#888'; scoreSz = '12px';
    }
    reg(this.add.text(panelX, height / 2 - 2, scoreTxt, {
      fontSize: scoreSz, color: scoreCol, fontFamily: 'monospace'
    }).setOrigin(0.5));

    const siguienteIdx = this.nivelIdx + 1;
    const sigPack      = packRequerido(siguienteIdx);
    const sigBloqueado = sigPack && !GameState.tieneDesbloqueo(sigPack);
    const hayMas = siguienteIdx < LEVELS.length && GameState.puedeJugarHoy();

    if (hayMas && !sigBloqueado) {
      const btnSig = reg(this.add.text(panelX, height / 2 + 30, '[ siguiente nivel ]', {
        fontSize: '13px', color: '#4fc3f7', fontFamily: 'monospace'
      }).setOrigin(0.5).setInteractive({ useHandCursor: true }));
      btnSig.on('pointerdown', () => this.scene.start('PuzzleScene', { nivelIdx: siguienteIdx }));
    } else if (hayMas && sigBloqueado) {
      const btnTienda = reg(this.add.text(panelX, height / 2 + 30, '[ desbloquear en la tienda 🛒 ]', {
        fontSize: '12px', color: '#fff176', fontFamily: 'monospace'
      }).setOrigin(0.5).setInteractive({ useHandCursor: true }));
      btnTienda.on('pointerdown', () => this.scene.start('StoreScene', { cat: 'niveles' }));
    } else {
      const msg = !GameState.puedeJugarHoy() ? '¡completaste tus niveles de hoy!' : '¡completaste todos los niveles!';
      reg(this.add.text(panelX, height / 2 + 30, msg, {
        fontSize: '11px', color: '#888', fontFamily: 'monospace'
      }).setOrigin(0.5));
    }

    const btnSalir = reg(this.add.text(panelX, height / 2 + 62, '[ volver al cuarto ]', {
      fontSize: '11px', color: '#444', fontFamily: 'monospace'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }));
    btnSalir.on('pointerdown', () => this.scene.start('RoomScene'));

    // pista para reabrir el resumen tras cerrar con la X
    reg(this.add.text(panelX, height / 2 + 84, '(✕ cierra · R reinicia)', {
      fontSize: '9px', color: '#444', fontFamily: 'monospace'
    }).setOrigin(0.5));
  }

  _actualizarStatus() {
    if (!this.statusTxt) return;
    const hasSwitches = this.COMPONENTS.some(c => c.sym === 's');
    if (this.connected && hasSwitches) {
      const pendientes = Object.values(this.switchStates).filter(v => !v).length;
      this.statusTxt.setColor('#fff176');
      this.statusTxt.setText(`click en\nel switch`);
    } else {
      const alineados = this.SNAKE_MAP.filter((sm, i) => sm.comp && this._segmentoAlineado(i)).length;
      const total     = this.SNAKE_MAP.filter(sm => sm.comp).length;
      this.statusTxt.setColor('#555');
      this.statusTxt.setText(alineados > 0 ? `${alineados}/${total} listos` : 'mueve la\nserpiente');
    }
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
