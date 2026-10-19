import GameState    from '../state/GameState.js';
import Dev          from '../Dev.js';
import SpriteConfig, { FUENTE } from '../SpriteConfig.js';
import Sonido       from '../Sonido.js';
import {
  CLAY, losa, boton, estrella, estiloTexto, botonSonido,
  irA, entrarEscena, aparecer, cartel,
} from '../ClayUI.js';
import { LEVELS, packRequerido } from '../levels.js';

export default class RoomScene extends Phaser.Scene {
  constructor() { super('RoomScene'); }

  create() {
    const { width, height } = this.scale;
    const S = SpriteConfig;
    entrarEscena(this);

    // ── editor visual del cuarto (?editroom, sólo en desarrollo) ──
    this.editMode  = Dev.flag('editroom');
    this.layout    = this._cargarLayout();
    this.editables = [];

    // ── fondo / background (placeholder → pixel art) ──
    const bgKey = S.get('cuarto', 'bg');
    if (bgKey && this.textures.exists(bgKey)) {
      this.add.image(0, 0, bgKey).setOrigin(0).setDisplaySize(width, height);
    } else {
      this._dibujarCuartoPlaceholder(width, height);
    }

    // ── workbench ──
    const WB_X = this.layout.workbench.x, WB_Y = this.layout.workbench.y;
    const wbObj = S.colocar(this, 'cuarto', 'workbench', WB_X, WB_Y,
      () => this._dibujarWorkbenchPlaceholder(WB_X, WB_Y));
    // Burbuja sobre el workbench: de lejos es chiquita y flota ("vení para acá");
    // de cerca crece a un botón ▶ que se puede tocar. Reemplaza a los carteles
    // "⚡ WORKBENCH" y "[ E ] entrar al workbench", que un chico de 6 no lee.
    this.burbujaWB = this._crearBurbuja(WB_X, WB_Y - 118, 'play', CLAY.verde, () => this._entrarAlWorkbench());
    this.editables.push({ nombre: 'workbench', x: WB_X, y: WB_Y, objs: [wbObj, this.burbujaWB].filter(Boolean) });

    // ── tienda ──
    const TIENDA_X = this.layout.tienda.x, TIENDA_Y = this.layout.tienda.y;
    const tdObj = S.colocar(this, 'cuarto', 'tienda', TIENDA_X, TIENDA_Y,
      () => this._dibujarTiendaPlaceholder(TIENDA_X, TIENDA_Y));
    this.burbujaTD = this._crearBurbuja(TIENDA_X, TIENDA_Y - 92, 'tienda', CLAY.naranja, () => irA(this, 'StoreScene'));
    this.editables.push({ nombre: 'tienda', x: TIENDA_X, y: TIENDA_Y, objs: [tdObj, this.burbujaTD].filter(Boolean) });

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
    // se resetea acá y no en los botones táctiles: si salías a la tienda con el d-pad
    // apretado, al volver el nene arrancaba caminando solo.
    this._touchDir = null;
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyE    = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    // botones táctiles solo en móvil real
    const isMobile = window.isMobile || false;
    if (isMobile) this._crearControlesMobile(width, height);

    // ── HUD ──
    this._crearHUD(width, height);

    // la música arranca en el cuarto (ya hubo un toque en el login, así que el navegador la deja sonar)
    Sonido.arrancarMusica();

    // ── bienvenida ──
    if (!this.editMode) this._mostrarBienvenida(width, height);

    // ── editor visual ──
    if (this.editMode) this._iniciarEditor();
  }

  // ── layout del cuarto (posiciones de cada objeto, persistido) ──
  // Calibrado a mano con ?editroom sobre el fondo actual. Si cambia cuarto_bg
  // (sobre todo la línea pared/piso), hay que recalibrar.
  _layoutDefaults() {
    return {
      // línea donde termina la pared y empieza el piso: el nene no puede subir de acá.
      // Se calibra arrastrándola en ?editroom.
      pisoY: 341,

      workbench:  { x: 413, y: 297 },
      tienda:     { x: 734, y: 512 },
      estante:    { x: 139, y: 211 },
      repisa:     { x: 201, y: 140 },
      vitrina:    { x: 221, y: 296 },
      ropero:     { x: 79,  y: 301 },
      banquito:   { x: 543, y: 401 },
      sillon:     { x: 93,  y: 405 },
      sillon_ind: { x: 688, y: 369 },
      planta:     { x: 594, y: 326 },
      lampara:    { x: 770, y: 310 },
      mesita:     { x: 734, y: 442 },
      peluche:    { x: 619, y: 523 },
      baul:       { x: 172, y: 528 },
      pelota:     { x: 317, y: 544 },
      tapete:     { x: 457, y: 490 },
      poster:     { x: 235, y: 203 },
      reloj:      { x: 493, y: 123 },
      cuadro:     { x: 62,  y: 209 },
    };
  }

  _cargarLayout() {
    const def = this._layoutDefaults();
    try {
      const saved = JSON.parse(localStorage.getItem('room_layout') || '{}');
      Object.keys(saved).forEach(k => { if (def[k] && saved[k]) def[k] = saved[k]; });
    } catch (e) { /* layout por defecto */ }
    return def;
  }

  _guardarLayout() {
    try { localStorage.setItem('room_layout', JSON.stringify(this.layout)); } catch (e) {}
  }

  // ── modo edición: arrastrar objetos ──
  _iniciarEditor() {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, 26, 0x000000, 0.65).setOrigin(0).setDepth(300);
    this.add.text(8, 13, '✏️ EDITOR — arrastrá objetos y la línea del piso · [E] exportar (F12) · [R] reset', {
      fontSize: '11px', color: '#ffffff', fontFamily: FUENTE
    }).setOrigin(0, 0.5).setDepth(301);

    // línea del piso: hasta acá puede subir el nene
    const linea = this.add.rectangle(width / 2, this.layout.pisoY, width, 4, 0xff7043, 0.75)
      .setDepth(250).setInteractive({ useHandCursor: true });
    this.input.setDraggable(linea);
    const lbl = this.add.text(10, this.layout.pisoY - 12, 'piso (tope del nene)', {
      fontSize: '10px', color: '#0d0d1f', fontFamily: FUENTE,
      backgroundColor: '#ff7043', padding: { x: 4, y: 1 }
    }).setOrigin(0, 1).setDepth(251);
    linea.on('drag', (p, dx, dy) => {
      linea.y = dy; lbl.y = dy - 12;
      this.layout.pisoY = Math.round(dy);
      this._limitarAlPiso();
      this._guardarLayout();
    });

    this.editables.forEach(ed => {
      const handle = this.add.rectangle(ed.x, ed.y, 44, 44, 0x4fc3f7, 0.08)
        .setStrokeStyle(2, 0x4fc3f7, 0.9).setDepth(250).setInteractive({ useHandCursor: true });
      this.input.setDraggable(handle);
      const tag = this.add.text(ed.x, ed.y - 30, ed.nombre, {
        fontSize: '9px', color: '#0d0d1f', fontFamily: FUENTE,
        backgroundColor: '#4fc3f7', padding: { x: 3, y: 1 }
      }).setOrigin(0.5).setDepth(251);

      handle.on('drag', (p, dragX, dragY) => {
        const ddx = dragX - handle.x, ddy = dragY - handle.y;
        handle.x = dragX; handle.y = dragY;
        tag.x = dragX; tag.y = dragY - 30;
        ed.objs.forEach(o => { o.x += ddx; o.y += ddy; });
        this.layout[ed.nombre] = { x: Math.round(dragX), y: Math.round(dragY) };
        this._guardarLayout();
      });
    });

    this.input.keyboard.on('keydown-E', () => {
      console.log('room_layout =', JSON.stringify(this.layout, null, 2));
      this._toastEditor('layout exportado a la consola (F12)');
    });
    this.input.keyboard.on('keydown-R', () => {
      localStorage.removeItem('room_layout');
      this.scene.restart();
    });
  }

  _toastEditor(msg) {
    const t = this.add.text(this.scale.width / 2, this.scale.height - 16, msg, {
      fontSize: '12px', color: '#fff', fontFamily: FUENTE,
      backgroundColor: '#000000aa', padding: { x: 8, y: 4 }
    }).setOrigin(0.5).setDepth(301);
    this.time.delayedCall(1800, () => t.destroy());
  }

  // El cuerpo de física es SIEMPRE un rectángulo invisible: es lo que se mueve y
  // choca contra los bordes. Lo visible (sprite o placeholder) lo sigue en update().
  // Así el dibujo puede cambiar de tamaño sin tocar la física ni las distancias.
  _crearPersonaje(x, y, S) {
    this.PIES_OFF = 18;                       // dónde caen los pies respecto del centro del cuerpo

    // La instancia de la escena se reutiliza entre scene.start(): estas referencias
    // apuntarían a objetos ya destruidos de la visita anterior.
    this.playerImg = null;
    this.playerSombra = null;
    this.playerGfx = null;

    this.CUERPO_H = 36;
    this.player = this.physics.add.image(x, y, '__DEFAULT')
      .setVisible(false)
      .setDisplaySize(28, this.CUERPO_H);
    this.player.setCollideWorldBounds(true);

    // El nene camina SOLO sobre el piso, no sobre la pared. En vez de chequearlo a mano
    // en update(), se achica el mundo de física: el tope de arriba queda donde sus pies
    // tocan la línea del piso, y arcade se encarga del resto (también frena en diagonal).
    this._limitarAlPiso();

    this.pjNombre = GameState.personaje || 'nino';
    this.pjDir    = 'abajo';
    const pose0   = S.activo() ? S.pose(this.pjNombre, 'abajo') : null;

    if (pose0 && this.textures.exists(pose0.key)) {
      // sombrita primero (queda detrás), después el nene
      this.playerSombra = this.add.graphics();
      this.playerImg = this.add.image(x, y + this.PIES_OFF, pose0.key);
      this._aplicarPose('abajo', true);   // forzado: la imagen nace en escala 1
    } else {
      this.playerGfx = this.add.graphics();
      this._dibujarPersonajePlaceholder(x, y);
    }
  }

  // Cambia la pose del personaje. Cada PNG tiene su propio recorte, así que al girar
  // hay que reajustar ancla y escala — si no, el nene se hunde o cambia de altura.
  //
  // El "ya está puesta" se decide mirando la textura del objeto, NO una bandera de la
  // escena: Phaser reutiliza la instancia entre scene.start(), así que cualquier flag
  // sobrevive a la vuelta desde la tienda o el puzzle y saltearía el ajuste de escala.
  _aplicarPose(dir, forzar = false) {
    if (!this.playerImg) return;
    const p = SpriteConfig.pose(this.pjNombre, dir);
    if (!p || !this.textures.exists(p.key)) return;
    if (!forzar && this.playerImg.texture.key === p.key) return;
    this.pjDir = dir;
    this.playerImg.setTexture(p.key)
      .setOrigin(0.5, p.anclaY)
      .setScale(SpriteConfig.escalaPose(this.pjNombre, dir));
  }

  // dirección a la que mira según cómo se mueve (horizontal manda sobre vertical)
  _direccionDe(vx, vy) {
    if (vx < 0) return 'izq';
    if (vx > 0) return 'der';
    if (vy < 0) return 'arriba';
    if (vy > 0) return 'abajo';
    return this.pjDir;          // quieto: se queda mirando a donde iba
  }

  // Ajusta los límites del mundo para que los pies nunca pasen de la línea del piso.
  //   pies      = player.y + PIES_OFF
  //   borde sup = player.y - CUERPO_H/2
  // queremos pies >= pisoY, así que el borde superior del mundo va PIES_OFF + medio
  // cuerpo más arriba de esa línea.
  _limitarAlPiso() {
    const { width, height } = this.scale;
    const tope = this.layout.pisoY - this.PIES_OFF - this.CUERPO_H / 2;
    this.physics.world.setBounds(0, tope, width, height - tope);
  }

  // mueve lo visible a donde esté el cuerpo de física
  _seguirAlCuerpo() {
    const px = this.player.x, py = this.player.y;
    if (this.playerImg) {
      this.playerImg.setPosition(px, py + this.PIES_OFF);
      const g = this.playerSombra;
      g.clear();
      g.fillStyle(0x000000, 0.22);
      g.fillEllipse(px, py + this.PIES_OFF, 34, 10);
    } else {
      this._dibujarPersonajePlaceholder(px, py);
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

  // fondo liso: solo piso + pared (los muebles se colocan aparte)
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
  }

  // placeholder del workbench (hasta tener su PNG) — objeto propio, movible
  _dibujarWorkbenchPlaceholder(x, y) {
    const g = this.add.graphics();
    g.fillStyle(0x6b4a2a); g.fillRoundedRect(x - 46, y - 14, 92, 34, 5);          // tablero
    g.fillStyle(0x4a3018); g.fillRect(x - 40, y + 16, 10, 22); g.fillRect(x + 30, y + 16, 10, 22); // patas
    g.fillStyle(0x222a3a); g.fillRoundedRect(x - 20, y - 42, 40, 26, 3);          // monitor
    g.fillStyle(0x4fc3f7, 0.5); g.fillRect(x - 16, y - 38, 32, 18);
    return g;
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
    return g;
  }

  // ── muebles: comprados (normal) o todos (modo edición) ──
  _dibujarMuebles(S) {
    const tipos = this.editMode
      ? Object.keys(SpriteConfig.muebles)   // en el editor se ven todos para acomodarlos
      : GameState.desbloqueos.filter(id => id.startsWith('mueble_')).map(id => id.replace('mueble_', ''));

    tipos.forEach(tipo => {
      const pos = this.layout[tipo];
      if (!pos) return;
      const obj = S.colocar(this, 'muebles', tipo, pos.x, pos.y,
        () => this._dibujarMueblePlaceholder(tipo, pos.x, pos.y));
      if (this.editMode && obj) {
        this.editables.push({ nombre: tipo, x: pos.x, y: pos.y, objs: [obj] });
      }
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
    } else if (tipo === 'estante') {                 // repisa de pared (tabla + soportes)
      g.fillStyle(0x6b4a2a); g.fillRoundedRect(x - 60, y - 6, 120, 12, 3);
      g.fillStyle(0x4a3018); g.fillRect(x - 48, y + 6, 8, 14); g.fillRect(x + 40, y + 6, 8, 14);
    } else if (tipo === 'repisa') {                  // estante chico
      g.fillStyle(0x6b4a2a); g.fillRoundedRect(x - 38, y - 5, 76, 10, 3);
      g.fillStyle(0x4a3018); g.fillRect(x - 30, y + 5, 6, 12); g.fillRect(x + 24, y + 5, 6, 12);
    } else if (tipo === 'vitrina') {                 // mueble con repisas
      g.fillStyle(0x4a3018); g.fillRoundedRect(x - 40, y - 50, 80, 100, 6);
      g.fillStyle(0x6b4a2a); g.fillRect(x - 34, y - 22, 68, 8); g.fillRect(x - 34, y + 6, 68, 8);
      g.fillStyle(0x9fd8f0, 0.25); g.fillRoundedRect(x - 34, y - 44, 68, 88, 4);
    } else {
      // genérico (mueble sin dibujo propio, hasta tener su PNG)
      g.fillStyle(0x3a2f1a, 0.9); g.fillRoundedRect(x - 22, y - 22, 44, 44, 8);
      g.lineStyle(1.5, 0xcaa05a, 0.8); g.strokeRoundedRect(x - 22, y - 22, 44, 44, 8);
    }
    return g;
  }

  // ── HUD de plastilina ──
  // Tres "frasquitos" con icono + número (monedas, estrellas, energía del día) y,
  // a la derecha, mapa de niveles y sonido. Antes era una barra azul marino con
  // "★ 1240 pts · 🪙 300 · ⭐ 12/150 · 📅 te quedan 10 de 10".
  _crearHUD(width, height) {
    const y = 34;
    const frasco = (x, w, icono, valor, colTxt, colBorde) => {
      const c = this.add.container(x, y).setDepth(150);
      c.add(losa(this, 0, 0, w, 50, { fill: CLAY.cremaClaro, r: 22, canto: 5, grosor: 3 }));
      c.add(icono(-w / 2 + 26, -3));
      c.add(this.add.text(-w / 2 + 48, -3, `${valor}`, estiloTexto(22, colTxt, colBorde, 5)).setOrigin(0, 0.5));
      return c;
    };
    const img = key => (x, yy) => {
      const k = SpriteConfig.get('ui', key);
      return (k && this.textures.exists(k)) ? this.add.image(x, yy, k).setDisplaySize(36, 36) : this.add.circle(x, yy, 14, 0xf6c945);
    };
    frasco(78, 132, img('moneda'), GameState.monedas, '#ffd54a', '#8a5a10');
    frasco(214, 120, (x, yy) => estrella(this, x, yy, true, 34), GameState.totalEstrellas(), '#ffd54a', '#8a5a10');
    // energía: niveles que le quedan HOY (incluye la energía comprada)
    frasco(338, 108, img('energia'), GameState.nivelesRestantesHoy(), '#7cc35a', '#2f5a1e');

    boton(this, width - 100, y, { w: 54, fill: CLAY.lila, icono: 'mapa', onTap: () => irA(this, 'LevelSelectScene') }).setDepth(150);
    botonSonido(this, width - 40, y, 46, 150);

    // cerrar sesión: puertita chica abajo a la izquierda (es para el adulto)
    boton(this, 30, height - 30, { w: 40, fill: CLAY.offFill, colorIcono: 0x8a7a58, icono: 'puerta', onTap: () => {
      GameState.username = null; irA(this, 'LoginScene');
    }}).setDepth(150).setAlpha(0.8);
  }

  // ── burbujas de interacción (workbench / tienda) ──
  _crearBurbuja(x, y, ico, fill, onTap) {
    const c = this.add.container(x, y).setDepth(120);
    const b = boton(this, 0, 0, { w: 70, fill, icono: ico, sonido: 'pop', onTap: () => { if (!this.editMode) onTap(); } });
    // colita del globo apuntando al objeto
    const cola = this.add.graphics();
    cola.fillStyle(fill, 1); cola.fillTriangle(-12, 26, 12, 26, 0, 46);
    c.add([cola, b]);
    c.setScale(0.6).setAlpha(0.85);
    if (!this.editMode) this.tweens.add({ targets: c, y: y - 10, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    return c;
  }

  _estadoBurbuja(c, cerca) {
    if (!c) return;
    this.tweens.add({ targets: c, scale: cerca ? 1.05 : 0.6, alpha: cerca ? 1 : 0.85, duration: 260, ease: 'Back.easeOut' });
    if (cerca) Sonido.pop();
  }

  _mostrarBienvenida(width, height) {
    cartel(this, width / 2, height - 46, `👋  ${GameState.username}`, { dur: 2200 });
  }

  // panel de aviso reutilizable: icono grande + botones
  _panelAviso(dibujarIcono, botones) {
    const { width, height } = this.scale;
    const velo = this.add.rectangle(0, 0, width, height, 0x1a0e06, 0.5).setOrigin(0).setDepth(400).setInteractive();
    const panel = this.add.container(width / 2, height / 2).setDepth(401);
    panel.add(losa(this, 0, 0, 340, 260, { fill: CLAY.cremaClaro, borde: CLAY.borde, r: 32, canto: 10, grosor: 5 }));
    dibujarIcono(panel);
    const cerrar = () => { velo.destroy(); panel.destroy(); };
    botones.forEach((bt, i) => {
      const x = (i - (botones.length - 1) / 2) * 110;
      panel.add(boton(this, x, 74, { w: bt.w || 76, fill: bt.fill, icono: bt.icono,
        onTap: () => { cerrar(); if (bt.onTap) bt.onTap(); } }));
    });
    aparecer(this, panel);
  }

  // ya no quedan niveles hoy: luna dormida + energía apagada
  _mostrarMensajeDia() {
    Sonido.error();
    this._panelAviso(p => {
      p.add(this.add.text(-44, -40, '🌙', { fontSize: '76px' }).setOrigin(0.5));
      const ek = SpriteConfig.get('ui', 'energia');
      if (ek && this.textures.exists(ek)) p.add(this.add.image(54, -36, ek).setDisplaySize(70, 70).setAlpha(0.45));
      p.add(this.add.text(0, 18, 'vuelve mañana', { fontSize: '15px', color: CLAY.txtSuave, fontFamily: FUENTE }).setOrigin(0.5));
    }, [
      { icono: 'check', fill: CLAY.verde },
      { icono: 'tienda', fill: CLAY.naranja, onTap: () => irA(this, 'StoreScene', { cat: 'energia' }) },
    ]);
  }

  update() {
    const speed  = 160;
    const { left, right, up, down } = this.cursors;

    // velocidad — teclado o touch
    const td = this._touchDir;
    const vx = left.isDown ? -speed : right.isDown ? speed : td ? td.vx * speed : 0;
    const vy  = up.isDown   ? -speed : down.isDown   ? speed : td ? td.vy * speed : 0;

    this.player.setVelocity(vx, vy);
    this._aplicarPose(this._direccionDe(vx, vy));
    this._seguirAlCuerpo();

    // proximidad a workbench y tienda
    const px = this.player.x, py = this.player.y;

    const distWB = Phaser.Math.Distance.Between(px, py, this.WORKBENCH_POS.x, this.WORKBENCH_POS.y);
    const distTD = Phaser.Math.Distance.Between(px, py, this.TIENDA_POS.x, this.TIENDA_POS.y);
    // si ambos están en rango, gana el más cercano (no mostrar dos hints a la vez)
    const cercaWB = distWB < this.PROXIMITY_DIST && distWB <= distTD;
    const cercaTD = distTD < this.PROXIMITY_DIST && distTD <  distWB;

    if (cercaWB !== this.cercaDelWorkbench) {
      this.cercaDelWorkbench = cercaWB;
      this._estadoBurbuja(this.burbujaWB, cercaWB);
    }
    if (cercaTD !== this.cercaDeTienda) {
      this.cercaDeTienda = cercaTD;
      this._estadoBurbuja(this.burbujaTD, cercaTD);
    }

    // activar con E el objeto cercano
    if (Phaser.Input.Keyboard.JustDown(this.keyE)) this._interactuar();
  }

  // entra a workbench o tienda según cuál esté cerca
  _interactuar() {
    if (this.editMode) return;   // en el editor, E exporta el layout (no entra a nada)
    if (this.cercaDeTienda)        irA(this, 'StoreScene');
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
    irA(this, 'PuzzleScene', { nivelIdx: idx });
  }

  // el próximo nivel es de un tablero sin comprar: candado → tienda
  _mostrarMensajePack() {
    Sonido.error();
    this._panelAviso(p => {
      const lk = SpriteConfig.get('ui', 'candado');
      if (lk && this.textures.exists(lk)) p.add(this.add.image(0, -40, lk).setDisplaySize(96, 96));
    }, [
      { icono: 'cerrar', fill: CLAY.rojo, w: 64 },
      { icono: 'tienda', fill: CLAY.naranja, w: 86, onTap: () => irA(this, 'StoreScene', { cat: 'niveles' }) },
    ]);
  }

  // Flechas de plastilina (mantener = caminar). No hay botón [ E ]: en móvil se
  // toca directamente la burbuja que aparece sobre el workbench o la tienda.
  _crearControlesMobile(width, height) {
    const S = 74, sep = 66;
    const bx = 100, by = height - 100;

    const dirs = [
      { label: '▲', key: 'btn_up',    vx:  0, vy: -1, x: bx,       y: by - sep },
      { label: '▼', key: 'btn_down',  vx:  0, vy:  1, x: bx,       y: by + sep },
      { label: '◀', key: 'btn_left',  vx: -1, vy:  0, x: bx - sep, y: by },
      { label: '▶', key: 'btn_right', vx:  1, vy:  0, x: bx + sep, y: by },
    ];

    dirs.forEach(d => {
      const c = this.add.container(d.x, d.y).setDepth(10);
      const k = SpriteConfig.get('ui', d.key);
      if (k && this.textures.exists(k)) c.add(this.add.image(0, 0, k).setDisplaySize(S, S));
      else {
        c.add(losa(this, 0, 0, S * 0.8, S * 0.8, { fill: CLAY.naranja, r: S * 0.4 }));
        c.add(this.add.text(0, -4, d.label, estiloTexto(26)).setOrigin(0.5));
      }
      c.setSize(S, S).setInteractive({ useHandCursor: true }).setAlpha(0.92);

      // touch — mantener presionado mueve continuamente
      const soltar = () => { this._touchDir = null; c.setScale(1); };
      c.on('pointerdown', () => { this._touchDir = { vx: d.vx, vy: d.vy }; c.setScale(1.08, 0.88); });
      c.on('pointerup',   soltar);
      c.on('pointerout',  soltar);
    });

    this._touchDir = null;
  }
}
