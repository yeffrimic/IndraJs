import GameState    from '../state/GameState.js';
import SpriteConfig from '../SpriteConfig.js';
import { LEVELS, packRequerido } from '../levels.js';

export default class RoomScene extends Phaser.Scene {
  constructor() { super('RoomScene'); }

  create() {
    const { width, height } = this.scale;
    const S = SpriteConfig;

    // ── fondo / background (placeholder → pixel art) ──
    const bgKey = S.get('cuarto', 'bg');
    if (bgKey && this.textures.exists(bgKey)) {
      this.add.image(0, 0, bgKey).setOrigin(0).setDisplaySize(width, height);
    } else {
      this._dibujarCuartoPlaceholder(width, height);
    }

    // ── workbench ──
    const WB_X = 600, WB_Y = 100;
    S.colocar(this, 'cuarto', 'workbench', WB_X, WB_Y, null);
    // label y hint siempre visibles
    this.add.text(WB_X, WB_Y + 55, '⚡ WORKBENCH', {
      fontSize: '11px', color: '#a5d6a7', fontFamily: 'monospace'
    }).setOrigin(0.5);

    this.interactHint = this.add.text(WB_X, WB_Y + 72, '[ acércate ]', {
      fontSize: '10px', color: '#4fc3f7', fontFamily: 'monospace'
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: this.interactHint,
      alpha: { from: 0, to: 1 },
      duration: 600, yoyo: true, repeat: -1
    });

    // ── tienda ──
    const TIENDA_X = 380, TIENDA_Y = 120;
    S.colocar(this, 'cuarto', 'tienda', TIENDA_X, TIENDA_Y,
      () => this._dibujarTiendaPlaceholder(TIENDA_X, TIENDA_Y));
    this.add.text(TIENDA_X, TIENDA_Y + 55, '🛒 TIENDA', {
      fontSize: '11px', color: '#fff176', fontFamily: 'monospace'
    }).setOrigin(0.5);
    this.tiendaHint = this.add.text(TIENDA_X, TIENDA_Y + 72, '[ acércate ]', {
      fontSize: '10px', color: '#fff176', fontFamily: 'monospace'
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({
      targets: this.tiendaHint,
      alpha: { from: 0, to: 1 },
      duration: 600, yoyo: true, repeat: -1
    });

    // ── escritorio ──
    S.colocar(this, 'cuarto', 'escritorio', 160, 120, null);

    // ── muebles comprados ──
    this._dibujarMuebles(S);

    // ── personaje ──
    this._crearPersonaje(200, 400, S);

    // ── zonas de proximidad (workbench + tienda) ──
    this.WORKBENCH_POS = { x: WB_X, y: WB_Y };
    this.TIENDA_POS    = { x: TIENDA_X, y: TIENDA_Y };
    this.PROXIMITY_DIST = 120;
    this.cercaDelWorkbench = false;
    this.cercaDeTienda     = false;

    // ── controles ──
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyE    = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    // botones táctiles solo en móvil real
    const isMobile = window.isMobile || false;
    if (isMobile) this._crearControlesMobile(width, height);

    // ── HUD ──
    this._crearHUD(width, height);

    // ── bienvenida ──
    this._mostrarBienvenida(width, height);
  }

  _crearPersonaje(x, y, S) {
    if (S.activo() && S.get('personaje', 'key') !== null) {
      // sprite real con animaciones
      this.playerSprite = this.physics.add.sprite(x, y, SpriteConfig.personaje.key)
        .setScale(SpriteConfig.personaje.escala)
        .setCollideWorldBounds(true);
      this.playerSprite.play('idle');
      this.player = this.playerSprite;
    } else {
      // placeholder con Graphics
      this.playerGfx = this.add.graphics();
      this._dibujarPersonajePlaceholder(x, y);
      this.player = this.physics.add.image(x, y, '__DEFAULT')
        .setVisible(false)
        .setDisplaySize(28, 36);
      this.player.setCollideWorldBounds(true);
    }
  }

  _dibujarPersonajePlaceholder(x, y) {
    const g = this.playerGfx;
    g.clear();
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(x, y + 20, 28, 8);
    g.fillStyle(0xf9a825);
    g.fillRect(x - 14, y - 18, 28, 36);
    g.fillStyle(0xffcc80);
    g.fillCircle(x, y - 28, 14);
    g.fillStyle(0x333333);
    g.fillCircle(x - 5, y - 30, 2);
    g.fillCircle(x + 5, y - 30, 2);
  }

  _dibujarCuartoPlaceholder(width, height) {
    const g = this.add.graphics();

    // piso con tiles
    g.fillStyle(0x1a1a2e); g.fillRect(0, 0, width, height);
    g.lineStyle(1, 0x1e1e36, 1);
    for (let x = 0; x <= width; x += 80)  { g.beginPath(); g.moveTo(x, 200); g.lineTo(x, height); g.strokePath(); }
    for (let y = 200; y <= height; y += 80) { g.beginPath(); g.moveTo(0, y); g.lineTo(width, y); g.strokePath(); }

    // pared
    g.fillStyle(0x12122a); g.fillRect(0, 0, width, 200);
    g.fillStyle(0x0a0a1a); g.fillRect(0, 196, width, 6);
    g.fillStyle(0x4fc3f7); g.fillRect(0, 195, width, 2);

    // workbench
    g.fillStyle(0x2a1e0e); g.fillRect(460, 60, 280, 20);
    g.fillStyle(0x1e1408); g.fillRect(460, 78, 280, 80);
    g.fillStyle(0xef9f27, 0.5); g.fillRect(460, 58, 280, 3);
    g.fillStyle(0x1a1008); g.fillRect(470, 156, 12, 35); g.fillRect(716, 156, 12, 35);

    // monitor
    g.fillStyle(0x080814); g.fillRoundedRect(570, 20, 130, 72, 4);
    g.fillStyle(0x091e12); g.fillRect(576, 26, 118, 60);
    g.fillStyle(0x1a1408); g.fillRect(626, 90, 18, 10);

    // estante
    g.fillStyle(0x2a2a4a); g.fillRect(20, 40, 200, 12);
    const bookColors = [0x4fc3f7, 0xce93d8, 0xa5d6a7, 0xff7043, 0xfff176, 0x4fc3f7];
    bookColors.forEach((col, i) => {
      g.fillStyle(col, 0.7);
      g.fillRect(28 + i * 20, 8, 16, 34);
    });

    // escritorio
    g.fillStyle(0x3d2810); g.fillRect(20, 80, 200, 16);
    g.fillStyle(0x2a1e08); g.fillRect(20, 94, 200, 80);
    g.fillStyle(0x1e1408); g.fillRect(28, 172, 12, 36); g.fillRect(196, 172, 12, 36);
    g.fillStyle(0x0a1a2a); g.fillRoundedRect(36, 106, 56, 40, 2);

    // alfombra
    g.fillStyle(0x1e1e3a); g.fillRoundedRect(80, 310, 560, 230, 8);
    g.lineStyle(1.5, 0x252548, 1);
    g.strokeRoundedRect(96, 324, 528, 202, 5);
  }

  // ── placeholder tienda (hasta tener pixel art en SpriteConfig) ──
  _dibujarTiendaPlaceholder(x, y) {
    const g = this.add.graphics();
    // toldo
    g.fillStyle(0xfff176, 0.9); g.fillRect(x - 40, y - 36, 80, 14);
    g.fillStyle(0x0d0d1f, 1);
    for (let i = 0; i < 5; i++) g.fillRect(x - 40 + i * 16 + 4, y - 36, 8, 14);
    // mostrador
    g.fillStyle(0x2a1e0e); g.fillRect(x - 42, y - 22, 84, 44);
    g.fillStyle(0x1e1408); g.fillRect(x - 42, y + 8, 84, 14);
    // marco
    g.lineStyle(2, 0xfff176, 0.7); g.strokeRect(x - 42, y - 22, 84, 44);
    // carrito
    g.lineStyle(2, 0xfff176, 1);
    g.strokeRect(x - 12, y - 14, 24, 16);
    g.strokeCircle(x - 6, y + 8, 3);
    g.strokeCircle(x + 6, y + 8, 3);
  }

  // ── muebles comprados ──
  _dibujarMuebles(S) {
    const posMueble = {
      planta:  { x: 740, y: 430 },
      lampara: { x: 60,  y: 250 },
      poster:  { x: 300, y: 70  },
      tapete:  { x: 360, y: 470 },
    };
    GameState.desbloqueos
      .filter(id => id.startsWith('mueble_'))
      .forEach(id => {
        const tipo = id.replace('mueble_', '');
        const pos  = posMueble[tipo];
        if (!pos) return;
        S.colocar(this, 'muebles', tipo, pos.x, pos.y,
          () => this._dibujarMueblePlaceholder(tipo, pos.x, pos.y));
      });
  }

  _dibujarMueblePlaceholder(tipo, x, y) {
    const g = this.add.graphics();
    if (tipo === 'planta') {
      g.fillStyle(0x3d2810); g.fillRect(x - 10, y, 20, 16);          // maceta
      g.fillStyle(0x2a1e08); g.fillRect(x - 11, y, 22, 4);
      g.fillStyle(0xa5d6a7); g.fillCircle(x, y - 8, 12);             // follaje
      g.fillStyle(0x1a9e65); g.fillCircle(x - 6, y - 4, 7); g.fillCircle(x + 6, y - 4, 7);
    } else if (tipo === 'lampara') {
      g.fillStyle(0x2a2a4a); g.fillRect(x - 2, y - 30, 4, 40);       // poste
      g.fillStyle(0x1e1408); g.fillRect(x - 10, y + 8, 20, 4);       // base
      g.fillStyle(0xfff176, 0.9); g.fillTriangle(x - 16, y - 30, x + 16, y - 30, x, y - 50); // pantalla
      g.fillStyle(0xfff176, 0.25); g.fillCircle(x, y - 24, 18);      // halo
    } else if (tipo === 'poster') {
      g.fillStyle(0x12122a); g.fillRect(x - 26, y - 18, 52, 36);
      g.lineStyle(2, 0xce93d8, 1); g.strokeRect(x - 26, y - 18, 52, 36);
      g.lineStyle(1.5, 0x4fc3f7, 1);
      g.strokeCircle(x - 10, y, 6); g.strokeRect(x + 2, y - 5, 12, 10); // mini circuito
      g.beginPath(); g.moveTo(x - 4, y); g.lineTo(x + 2, y); g.strokePath();
    } else if (tipo === 'tapete') {
      g.fillStyle(0x1e1e3a); g.fillRoundedRect(x - 60, y - 36, 120, 72, 8);
      g.lineStyle(1.5, 0x4fc3f7, 0.4); g.strokeRoundedRect(x - 52, y - 28, 104, 56, 5);
    }
  }

  _crearHUD(width, height) {
    // barra superior
    this.add.rectangle(0, 0, width, 30, 0x080814, 0.95).setOrigin(0);
    this.add.rectangle(0, 30, width, 1, 0x2a2a4a).setOrigin(0);

    this.add.text(10, 15, `👤 ${GameState.username}`, {
      fontSize: '12px', color: '#4fc3f7', fontFamily: 'monospace'
    }).setOrigin(0, 0.5);

    this.txtPuntos = this.add.text(width / 2 - 110, 15, `★ ${GameState.puntosTotal} pts`, {
      fontSize: '12px', color: '#fff176', fontFamily: 'monospace'
    }).setOrigin(0.5, 0.5);

    this.txtMonedas = this.add.text(width / 2, 15, `🪙 ${GameState.monedas}`, {
      fontSize: '12px', color: '#ffd54f', fontFamily: 'monospace'
    }).setOrigin(0.5, 0.5);

    this.add.text(width / 2 + 110, 15, `⭐ ${GameState.totalEstrellas()}/${LEVELS.length * 3}`, {
      fontSize: '12px', color: '#fff176', fontFamily: 'monospace'
    }).setOrigin(0.5, 0.5);

    const restantes = GameState.nivelesRestantesHoy();
    this.add.text(width - 10, 15, `📅 ${restantes}/10 hoy`, {
      fontSize: '12px', color: '#a5d6a7', fontFamily: 'monospace'
    }).setOrigin(1, 0.5);

    // cerrar sesión
    const logout = this.add.text(10, height - 10, 'cerrar sesión', {
      fontSize: '10px', color: '#333', fontFamily: 'monospace'
    }).setOrigin(0, 1).setInteractive({ useHandCursor: true });
    logout.on('pointerover',  () => logout.setColor('#ef5350'));
    logout.on('pointerout',   () => logout.setColor('#333'));
    logout.on('pointerdown',  () => { GameState.username = null; this.scene.start('LoginScene'); });
  }

  _mostrarBienvenida(width, height) {
    const completados = GameState.nivelesCompletados.length;
    const msg = completados === 0
      ? `¡bienvenido, ${GameState.username}! acércate al workbench`
      : `¡hola de nuevo, ${GameState.username}! nivel ${completados + 1} te espera`;

    const toast = this.add.text(width / 2, height - 20, msg, {
      fontSize: '12px', color: '#ccc', fontFamily: 'monospace',
      backgroundColor: '#12122a', padding: { x: 14, y: 7 }
    }).setOrigin(0.5, 1).setAlpha(0);

    this.tweens.add({
      targets: toast, alpha: 1, duration: 400,
      hold: 3000, yoyo: true,
      onComplete: () => toast.destroy()
    });
  }

  _mostrarMensajeDia() {
    const { width, height } = this.scale;
    const panel = this.add.rectangle(width/2, height/2, 360, 140, 0x12122a)
      .setStrokeStyle(1, 0x2a2a4a);
    const t1 = this.add.text(width/2, height/2 - 28, '¡ya completaste tus 10 niveles de hoy!', {
      fontSize: '12px', color: '#fff176', fontFamily: 'monospace'
    }).setOrigin(0.5);
    const t2 = this.add.text(width/2, height/2 + 2, 'vuelve mañana para continuar', {
      fontSize: '11px', color: '#666', fontFamily: 'monospace'
    }).setOrigin(0.5);
    const btn = this.add.text(width/2, height/2 + 36, '[ ok ]', {
      fontSize: '13px', color: '#4fc3f7', fontFamily: 'monospace'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    btn.on('pointerdown', () => { [panel,t1,t2,btn].forEach(o=>o.destroy()); });
  }

  update() {
    const speed  = 160;
    const { left, right, up, down } = this.cursors;
    const usingSprite = SpriteConfig.activo() && this.playerSprite;

    // velocidad — teclado o touch
    const td = this._touchDir;
    const vx = left.isDown ? -speed : right.isDown ? speed : td ? td.vx * speed : 0;
    const vy  = up.isDown   ? -speed : down.isDown   ? speed : td ? td.vy * speed : 0;

    if (usingSprite) {
      this.playerSprite.setVelocity(vx, vy);
      // animaciones
      if (vx < 0)       this.playerSprite.play('walk_left',  true);
      else if (vx > 0)  this.playerSprite.play('walk_right', true);
      else if (vy < 0)  this.playerSprite.play('walk_up',    true);
      else if (vy > 0)  this.playerSprite.play('walk_down',  true);
      else              this.playerSprite.play('idle',        true);
    } else {
      this.player.setVelocity(vx, vy);
      this._dibujarPersonajePlaceholder(this.player.x, this.player.y);
    }

    // proximidad a workbench y tienda
    const px = usingSprite ? this.playerSprite.x : this.player.x;
    const py = usingSprite ? this.playerSprite.y : this.player.y;

    const distWB = Phaser.Math.Distance.Between(px, py, this.WORKBENCH_POS.x, this.WORKBENCH_POS.y);
    const distTD = Phaser.Math.Distance.Between(px, py, this.TIENDA_POS.x, this.TIENDA_POS.y);
    // si ambos están en rango, gana el más cercano (no mostrar dos hints a la vez)
    const cercaWB = distWB < this.PROXIMITY_DIST && distWB <= distTD;
    const cercaTD = distTD < this.PROXIMITY_DIST && distTD <  distWB;

    if (cercaWB !== this.cercaDelWorkbench) {
      this.cercaDelWorkbench = cercaWB;
      this.interactHint.setText(cercaWB ? '[ E ] entrar al workbench' : '[ acércate ]');
      this.interactHint.setAlpha(cercaWB ? 1 : 0);
    }
    if (cercaTD !== this.cercaDeTienda) {
      this.cercaDeTienda = cercaTD;
      this.tiendaHint.setText(cercaTD ? '[ E ] abrir la tienda' : '[ acércate ]');
      this.tiendaHint.setAlpha(cercaTD ? 1 : 0);
    }

    // activar con E el objeto cercano
    if (Phaser.Input.Keyboard.JustDown(this.keyE)) this._interactuar();
  }

  // entra a workbench o tienda según cuál esté cerca
  _interactuar() {
    if (this.cercaDeTienda)        this.scene.start('StoreScene');
    else if (this.cercaDelWorkbench) this._entrarAlWorkbench();
  }

  _entrarAlWorkbench() {
    if (!GameState.puedeJugarHoy()) {
      this._mostrarMensajeDia();
      return;
    }
    const idx = GameState.ultimoNivelDesbloqueado;
    const pack = packRequerido(idx);
    if (pack && !GameState.tieneDesbloqueo(pack)) {
      this._mostrarMensajePack();
      return;
    }
    this.scene.start('PuzzleScene', { nivelIdx: idx });
  }

  _mostrarMensajePack() {
    const { width, height } = this.scale;
    const panel = this.add.rectangle(width/2, height/2, 380, 140, 0x12122a)
      .setStrokeStyle(1, 0xfff176);
    const t1 = this.add.text(width/2, height/2 - 28, 'este nivel es de un pack bloqueado', {
      fontSize: '12px', color: '#fff176', fontFamily: 'monospace'
    }).setOrigin(0.5);
    const t2 = this.add.text(width/2, height/2 + 2, 'desbloquéalo en la 🛒 tienda', {
      fontSize: '11px', color: '#666', fontFamily: 'monospace'
    }).setOrigin(0.5);
    const btn = this.add.text(width/2, height/2 + 36, '[ ir a la tienda ]', {
      fontSize: '13px', color: '#4fc3f7', fontFamily: 'monospace'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    btn.on('pointerdown', () => this.scene.start('StoreScene', { cat: 'niveles' }));
    const cerrar = this.add.text(width/2, height/2 + 58, '[ cerrar ]', {
      fontSize: '10px', color: '#444', fontFamily: 'monospace'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    cerrar.on('pointerdown', () => [panel,t1,t2,btn,cerrar].forEach(o=>o.destroy()));
  }

  _crearControlesMobile(width, height) {
    const btnSz = 48, gap = 5;
    // pad izquierdo — esquina inferior izquierda
    const bx = 80, by = height - 80;

    const dirs = [
      { label: '▲', key: 'btn_up',    vx:  0,  vy: -1, x: bx,           y: by - btnSz - gap },
      { label: '▼', key: 'btn_down',  vx:  0,  vy:  1, x: bx,           y: by + btnSz + gap },
      { label: '◀', key: 'btn_left',  vx: -1,  vy:  0, x: bx - btnSz - gap, y: by },
      { label: '▶', key: 'btn_right', vx:  1,  vy:  0, x: bx + btnSz + gap, y: by },
    ];

    dirs.forEach(d => {
      const btn = this.add.rectangle(d.x, d.y, btnSz, btnSz, 0x12122a)
        .setStrokeStyle(1.5, 0x2a2a5a)
        .setInteractive({ useHandCursor: true })
        .setDepth(10);
      // flecha: sprite (ui.btn_*) o glifo de texto como fallback
      const arr = SpriteConfig.colocar(this, 'ui', d.key, d.x, d.y, () => this.add.text(d.x, d.y, d.label, {
        fontSize: '22px', color: '#4fc3f7', fontFamily: 'monospace'
      }).setOrigin(0.5)).setDepth(11);
      if (arr instanceof Phaser.GameObjects.Image) arr.setDisplaySize(btnSz * 0.7, btnSz * 0.7);

      // touch — mantener presionado mueve continuamente
      btn.on('pointerdown', () => {
        this._touchDir = { vx: d.vx, vy: d.vy };
        btn.setFillStyle(0x1a1a3a);
        btn.setStrokeStyle(1.5, 0x4fc3f7);
      });
      btn.on('pointerup',   () => {
        this._touchDir = null;
        btn.setFillStyle(0x12122a);
        btn.setStrokeStyle(1.5, 0x2a2a5a);
      });
      btn.on('pointerout',  () => {
        this._touchDir = null;
        btn.setFillStyle(0x12122a);
        btn.setStrokeStyle(1.5, 0x2a2a5a);
      });
    });

    // botón E — esquina inferior derecha
    const eBg = this.add.rectangle(width - 60, height - 80, 80, 48, 0x0a1a2a)
      .setStrokeStyle(1.5, 0x4fc3f7)
      .setInteractive({ useHandCursor: true })
      .setDepth(10);
    this.add.text(width - 60, height - 80, '[ E ]', {
      fontSize: '14px', color: '#4fc3f7', fontFamily: 'monospace'
    }).setOrigin(0.5).setDepth(11);

    eBg.on('pointerdown', () => this._interactuar());
    eBg.on('pointerover',  () => eBg.setFillStyle(0x0d2a3e));
    eBg.on('pointerout',   () => eBg.setFillStyle(0x0a1a2a));

    this._touchDir = null;
  }
}
