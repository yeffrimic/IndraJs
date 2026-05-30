import GameState from '../state/GameState.js';
import { LEVELS } from '../levels.js';

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

    // ── zonas fijas ──
    // HUD:       36px top
    // CTRL:      200px right
    // HINT:      70px bottom
    // GRID:      el resto centrado
    const HUD_H  = 36;
    const CTRL_W = 200;
    const HINT_H = 70;
    const PAD    = 8;
    const CTRL_X = width - CTRL_W; // x donde empieza la zona de controles = 600

    const gridZoneW = CTRL_X - PAD * 2;
    const gridZoneH = height - HUD_H - HINT_H - PAD * 2;

    const GAP    = 3;
    const tileW  = Math.floor((gridZoneW - (this.COLS - 1) * GAP) / this.COLS);
    const tileH  = Math.floor((gridZoneH - (this.ROWS - 1) * GAP) / this.ROWS);
    this.TILE    = Math.min(tileW, tileH, 64);
    this.GAP     = GAP;

    const gridW  = this.COLS * this.TILE + (this.COLS - 1) * GAP;
    const gridH  = this.ROWS * this.TILE + (this.ROWS - 1) * GAP;

    // centrar el grid en su zona
    this.originX = PAD + Math.floor((gridZoneW - gridW) / 2);
    this.originY = HUD_H + PAD + Math.floor((gridZoneH - gridH) / 2);

    // ── fondo ──
    this.add.rectangle(0, 0, width, height, 0x0d0d1f).setOrigin(0);

    // zona controles fondo
    this.add.rectangle(CTRL_X, HUD_H, CTRL_W, height - HUD_H, 0x09091a).setOrigin(0);
    this.add.rectangle(CTRL_X, HUD_H, 1, height - HUD_H, 0x2a2a4a).setOrigin(0);

    // zona hint fondo
    this.add.rectangle(0, height - HINT_H, CTRL_X, HINT_H, 0x080814).setOrigin(0);
    this.add.rectangle(0, height - HINT_H, CTRL_X, 1, 0x2a2a4a).setOrigin(0);

    this._crearHUD(levelData, CTRL_X);
    this.tileGraphics = this.add.graphics();
    this.tileObjects  = {};
    this._dibujarGrid();
    this._crearHintBar(height - HINT_H + 4, CTRL_X);
    this._crearControles(CTRL_X, width, HUD_H, height);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.input.keyboard.on('keydown-R', () => this._reiniciar());

    // status en zona controles
    this.statusTxt = this.add.text(CTRL_X + CTRL_W / 2, HUD_H + 14, '', {
      fontSize: '12px', color: '#888', fontFamily: 'monospace',
      wordWrap: { width: CTRL_W - 16 },
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
    // +1 segmento extra al inicio: cabeza vacía después del LED
    len += 1;
    this.SNAKE_LENGTH = len;
    this.SNAKE_MAP = Array(len).fill(null).map(() => ({
      comp: null, color: 0x1a9e65, sym: null, label: null, order: null
    }));
    let cursor = len - 1;
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

    // nombre nivel — izquierda
    this.add.text(12, 18, levelData.name.toUpperCase(), {
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

        // fondo
        let bg = 0x1e1e3a;
        if (si === 0)                                   bg = 0x0d0d1f;
        else if (si > 0 && si < this.snake.length - 1) bg = 0x091e12;
        else if (si === this.snake.length - 1)          bg = 0x071610;
        g.fillStyle(bg);
        g.fillRoundedRect(tx, ty, T, T, 4);

        // borde
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

        // limpiar objetos anteriores
        const tkey = `${c},${r}`;
        if (this.tileObjects[tkey]) this.tileObjects[tkey].forEach(o => o.destroy());
        this.tileObjects[tkey] = [];

        // cabeza
        if (si === 0) {
          const objs = this._dibujarCabeza(tx, ty, T, this.headDir);
          this.tileObjects[tkey].push(...objs);
        }
        // cuerpo con componente
        else if (si > 0 && sm && sm.sym) {
          const objs = this._dibujarSimbolo(sm.sym, tcx, tcy, T * 0.28, sm.color, this.switchStates[swKey]);
          this.tileObjects[tkey].push(...objs);
        }
        // cuerpo vacío
        else if (si > 0 && sm && !sm.sym) {
          const dot = this.add.circle(tcx, tcy, T * 0.08, sm.color, 0.35);
          this.tileObjects[tkey].push(dot);
        }

        // componente sin serpiente
        if (comp && si < 0) {
          const def  = this._compDef(comp.sym);
          const objs = this._dibujarSimbolo(comp.sym, tcx, tcy - T * 0.1, T * 0.32, def.color, this.switchStates[swKey]);
          this.tileObjects[tkey].push(...objs);
          const col  = `#${def.color.toString(16).padStart(6,'0')}`;
          const lbl  = this.add.text(tcx, tcy + T * 0.22, def.label, {
            fontSize: `${Math.max(9, Math.floor(T * 0.16))}px`, color: col, fontFamily: 'monospace',
            stroke: '#000000', strokeThickness: 2
          }).setOrigin(0.5);
          const num  = this.add.text(tx + T - 3, ty + 3, `${comp.order}`, {
            fontSize: '9px', color: '#ffffff', fontFamily: 'monospace',
            stroke: '#000000', strokeThickness: 2
          }).setOrigin(1, 0);
          this.tileObjects[tkey].push(lbl, num);
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
    const objs = [];
    const g  = this.add.graphics();
    const cx = tx + T / 2;
    const cy = ty + T / 2;
    const m  = 2;
    const dc = dir.dc, dr = dir.dr;

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

  // ── hint bar ──
  _crearHintBar(barY, maxX) {
    const tileW = 44, gap = 4;
    const total = this.SNAKE_MAP.length;
    const totalW = total * tileW + (total - 1) * gap;
    const startX = Math.max(8, (maxX - totalW) / 2);
    this.hintTiles = [];

    this.add.text(startX, barY + 2, 'orden:', {
      fontSize: '9px', color: '#333', fontFamily: 'monospace'
    });

    [...this.SNAKE_MAP].reverse().forEach((sm, i) => {
      const hx  = startX + i * (tileW + gap);
      const hcx = hx + tileW / 2;
      const hcy = barY + 14 + 22;

      const bg = this.add.rectangle(hcx, hcy, tileW, 44, 0x12122a)
        .setStrokeStyle(1, sm.color || 0x2a2a4a);
      this.hintTiles.push(bg);

      if (sm.sym) {
        const hg = this.add.graphics();
        hg.lineStyle(1.5, sm.color, 1);
        const iy = hcy - 8;
        if (sm.sym === 'b' || sm.sym === 'l') hg.strokeCircle(hcx, iy, 8);
        else if (sm.sym === 'r') hg.strokeRect(hcx-9, iy-5, 18, 10);
        else if (sm.sym === 'c') hg.strokeTriangle(hcx, iy-8, hcx-8, iy+6, hcx+8, iy+6);
        else if (sm.sym === 's') {
          hg.beginPath(); hg.moveTo(hcx-8, iy); hg.lineTo(hcx-2, iy); hg.strokePath();
          hg.beginPath(); hg.moveTo(hcx+2, iy-5); hg.lineTo(hcx+8, iy); hg.strokePath();
        }
        const col = `#${sm.color.toString(16).padStart(6,'0')}`;
        // label más brillante para mejor legibilidad
        this.add.text(hcx, hcy + 13, sm.label, {
          fontSize: '10px', color: col, fontFamily: 'monospace',
          stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5, 0);
        if (sm.order) {
          this.add.text(hx + tileW - 2, hcy - 22, `${sm.order}`, {
            fontSize: '9px', color: '#ffffff', fontFamily: 'monospace',
            stroke: '#000000', strokeThickness: 2
          }).setOrigin(1, 0);
        }
      } else {
        const isHead = i === total - 1;
        if (isHead) {
          const hg = this.add.graphics();
          hg.lineStyle(1.5, 0x4fc3f7, 0.7);
          hg.strokeTriangle(hcx+9, hcy, hcx-5, hcy-9, hcx-5, hcy+9);
          this.add.text(hcx, hcy + 13, 'HEAD', {
            fontSize: '9px', color: '#4fc3f7', fontFamily: 'monospace'
          }).setOrigin(0.5, 0);
        } else {
          this.add.circle(hcx, hcy - 4, 3, 0x1a9e65, 0.3);
          this.add.text(hcx, hcy + 13, '·  ·', {
            fontSize: '9px', color: '#1a3a2a', fontFamily: 'monospace'
          }).setOrigin(0.5, 0);
        }
      }
    });
  }

  _actualizarHintTiles() {
    if (!this.hintTiles) return;
    [...this.SNAKE_MAP].reverse().forEach((sm, i) => {
      if (!this.hintTiles[i]) return;
      const segIdx   = this.SNAKE_MAP.length - 1 - i;
      const alineado = sm.comp && this._segmentoAlineado(segIdx);
      this.hintTiles[i].setFillStyle(alineado ? 0x0a1e0a : 0x12122a);
      this.hintTiles[i].setStrokeStyle(
        alineado ? 2 : 1,
        alineado ? 0x4caf50 : (sm.color || 0x2a2a4a)
      );
    });
  }

  // ── controles — zona derecha centrada ──
  _crearControles(ctrlX, width, hudH, height) {
    const btnSz  = 46;
    const gap    = 5;
    const padCX  = ctrlX + (width - ctrlX) / 2; // centro zona = 600 + 100 = 700... wait
    // centro zona controles: ctrlX + (width-ctrlX)/2
    const zoneCX = ctrlX + (width - ctrlX) / 2;  // 600 + 100 = 700? no: 600 + 200/2 = 700
    // pad centrado verticalmente en zona: entre status(hudH+40) y fondo(height-20)
    const padCY  = hudH + 40 + (height - hudH - 40 - 20 - btnSz) / 2 + btnSz / 2 + 30;

    const dirs = [
      { label: '▲', dc:  0, dr: -1, x: zoneCX,            y: padCY - btnSz - gap },
      { label: '▼', dc:  0, dr:  1, x: zoneCX,            y: padCY + btnSz + gap },
      { label: '◀', dc: -1, dr:  0, x: zoneCX - btnSz - gap, y: padCY },
      { label: '▶', dc:  1, dr:  0, x: zoneCX + btnSz + gap, y: padCY },
    ];

    dirs.forEach(d => {
      const btn = this.add.rectangle(d.x, d.y, btnSz, btnSz, 0x12122a)
        .setStrokeStyle(1.5, 0x2a2a5a)
        .setInteractive({ useHandCursor: true });
      this.add.text(d.x, d.y, d.label, {
        fontSize: '22px', color: '#4fc3f7', fontFamily: 'monospace'
      }).setOrigin(0.5);
      btn.on('pointerdown', () => this._mover(d.dc, d.dr));
      btn.on('pointerover',  () => { btn.setFillStyle(0x1a1a3a); btn.setStrokeStyle(1.5, 0x4fc3f7); });
      btn.on('pointerout',   () => { btn.setFillStyle(0x12122a); btn.setStrokeStyle(1.5, 0x2a2a5a); });
    });

    // reiniciar debajo del pad
    const rstY = padCY + btnSz + gap + btnSz + 20;
    const rstBg = this.add.rectangle(zoneCX, rstY, 110, 26, 0x12122a)
      .setStrokeStyle(1, 0x333355)
      .setInteractive({ useHandCursor: true });
    const rstTxt = this.add.text(zoneCX, rstY, 'R — reiniciar', {
      fontSize: '11px', color: '#555', fontFamily: 'monospace'
    }).setOrigin(0.5);
    rstBg.on('pointerover',  () => { rstBg.setFillStyle(0x1a1a2a); rstTxt.setColor('#888'); });
    rstBg.on('pointerout',   () => { rstBg.setFillStyle(0x12122a); rstTxt.setColor('#555'); });
    rstBg.on('pointerdown',  () => this._reiniciar());
    rstTxt.setInteractive({ useHandCursor: true });
    rstTxt.on('pointerdown', () => this._reiniciar());
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
    this.switchStates[key] = !this.switchStates[key];
    const allClosed = Object.values(this.switchStates).every(v => v === true);
    if (allClosed) this._ganar();
    else { this._dibujarGrid(); this._actualizarStatus(); }
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
    const hasSwitches = this.COMPONENTS.some(c => c.sym === 's');
    if (this.connected && !hasSwitches) this._ganar();
    else { this._dibujarGrid(); this._actualizarHintTiles(); this._actualizarStatus(); }
  }

  _reiniciar() {
    this.scene.restart({ nivelIdx: this.nivelIdx });
  }

  _ganar() {
    this.solved = true;
    const puntos = Math.max(300 - this.moveCount * 5, 20);
    GameState.completarNivel(this.nivelIdx, puntos);
    this._dibujarGrid();

    const { width, height } = this.scale;
    const CTRL_X = width - 200;
    const panelW = Math.min(320, CTRL_X - 40);
    const panelX = (CTRL_X - panelW) / 2 + panelW / 2;

    this.add.rectangle(panelX, height / 2, panelW, 200, 0x080814, 0.97)
      .setStrokeStyle(2, 0x4caf50);
    this.add.text(panelX, height / 2 - 70, '¡CIRCUITO COMPLETO!', {
      fontSize: '17px', color: '#4caf50', fontFamily: 'monospace'
    }).setOrigin(0.5);
    this.add.text(panelX, height / 2 - 40, `movimientos: ${this.moveCount}`, {
      fontSize: '12px', color: '#888', fontFamily: 'monospace'
    }).setOrigin(0.5);
    this.add.text(panelX, height / 2 - 16, `+${puntos} puntos`, {
      fontSize: '18px', color: '#fff176', fontFamily: 'monospace'
    }).setOrigin(0.5);

    const siguienteIdx = this.nivelIdx + 1;
    const hayMas = siguienteIdx < LEVELS.length && GameState.puedeJugarHoy();

    if (hayMas) {
      const btnSig = this.add.text(panelX, height / 2 + 30, '[ siguiente nivel ]', {
        fontSize: '13px', color: '#4fc3f7', fontFamily: 'monospace'
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      btnSig.on('pointerdown', () => this.scene.start('PuzzleScene', { nivelIdx: siguienteIdx }));
    } else {
      const msg = !GameState.puedeJugarHoy() ? '¡completaste tus 10 niveles de hoy!' : '¡completaste todos los niveles!';
      this.add.text(panelX, height / 2 + 30, msg, {
        fontSize: '11px', color: '#888', fontFamily: 'monospace'
      }).setOrigin(0.5);
    }

    const btnSalir = this.add.text(panelX, height / 2 + 62, '[ volver al cuarto ]', {
      fontSize: '11px', color: '#444', fontFamily: 'monospace'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    btnSalir.on('pointerdown', () => this.scene.start('RoomScene'));
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
