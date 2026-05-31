import GameState    from '../state/GameState.js';
import SpriteConfig from '../SpriteConfig.js';

export default class RoomScene extends Phaser.Scene {
  constructor() { super('RoomScene'); }

  create() {
    const { width, height } = this.scale;
    const S = SpriteConfig;

    // ── fondo / background ──
    if (S.get('cuarto', 'bg')) {
      this.add.image(0, 0, S.get('cuarto', 'bg')).setOrigin(0).setDisplaySize(width, height);
    } else {
      this._dibujarCuartoPlaceholder(width, height);
    }

    // ── workbench ──
    const WB_X = 600, WB_Y = 100;
    if (S.get('cuarto', 'workbench')) {
      const cfg = S.cuarto.workbench;
      this.add.image(WB_X, WB_Y, cfg.key).setOrigin(0.5).setScale(cfg.escala);
    }
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

    // ── escritorio ──
    if (S.get('cuarto', 'escritorio')) {
      const cfg = S.cuarto.escritorio;
      this.add.image(160, 120, cfg.key).setOrigin(0.5).setScale(cfg.escala);
    }

    // ── personaje ──
    this._crearPersonaje(200, 400, S);

    // ── zona de proximidad al workbench ──
    this.WORKBENCH_POS = { x: WB_X, y: WB_Y };
    this.PROXIMITY_DIST = 120;
    this.cercaDelWorkbench = false;

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

  _crearHUD(width, height) {
    // barra superior
    this.add.rectangle(0, 0, width, 30, 0x080814, 0.95).setOrigin(0);
    this.add.rectangle(0, 30, width, 1, 0x2a2a4a).setOrigin(0);

    this.add.text(10, 15, `👤 ${GameState.username}`, {
      fontSize: '12px', color: '#4fc3f7', fontFamily: 'monospace'
    }).setOrigin(0, 0.5);

    this.txtPuntos = this.add.text(width / 2, 15, `★ ${GameState.puntosTotal} pts`, {
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

    // proximidad al workbench
    const px = usingSprite ? this.playerSprite.x : this.player.x;
    const py = usingSprite ? this.playerSprite.y : this.player.y;
    const dist = Phaser.Math.Distance.Between(px, py, this.WORKBENCH_POS.x, this.WORKBENCH_POS.y);
    const cerca = dist < this.PROXIMITY_DIST;

    if (cerca !== this.cercaDelWorkbench) {
      this.cercaDelWorkbench = cerca;
      this.interactHint.setText(cerca ? '[ E ] entrar al workbench' : '[ acércate ]');
      this.interactHint.setAlpha(cerca ? 1 : 0);
    }

    // activar workbench con E o click cuando está cerca
    if (cerca && Phaser.Input.Keyboard.JustDown(this.keyE)) {
      this._entrarAlWorkbench();
    }
  }

  _entrarAlWorkbench() {
    if (!GameState.puedeJugarHoy()) {
      this._mostrarMensajeDia();
      return;
    }
    this.scene.start('PuzzleScene', { nivelIdx: GameState.ultimoNivelDesbloqueado });
  }

  _crearControlesMobile(width, height) {
    const btnSz = 48, gap = 5;
    // pad izquierdo — esquina inferior izquierda
    const bx = 80, by = height - 80;

    const dirs = [
      { label: '▲', vx:  0,  vy: -1, x: bx,           y: by - btnSz - gap },
      { label: '▼', vx:  0,  vy:  1, x: bx,           y: by + btnSz + gap },
      { label: '◀', vx: -1,  vy:  0, x: bx - btnSz - gap, y: by },
      { label: '▶', vx:  1,  vy:  0, x: bx + btnSz + gap, y: by },
    ];

    dirs.forEach(d => {
      const btn = this.add.rectangle(d.x, d.y, btnSz, btnSz, 0x12122a)
        .setStrokeStyle(1.5, 0x2a2a5a)
        .setInteractive({ useHandCursor: true })
        .setDepth(10);
      this.add.text(d.x, d.y, d.label, {
        fontSize: '22px', color: '#4fc3f7', fontFamily: 'monospace'
      }).setOrigin(0.5).setDepth(11);

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

    eBg.on('pointerdown', () => {
      if (this.cercaDelWorkbench) this._entrarAlWorkbench();
    });
    eBg.on('pointerover',  () => eBg.setFillStyle(0x0d2a3e));
    eBg.on('pointerout',   () => eBg.setFillStyle(0x0a1a2a));

    this._touchDir = null;
  }
}
