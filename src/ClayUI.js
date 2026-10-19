import SpriteConfig, { FUENTE } from './SpriteConfig.js';
import Sonido from './Sonido.js';

// ClayUI.js — el lenguaje visual de TODO el juego: "plastilina cálida".
//
// Antes convivían tres estilos (plastilina en el cuarto, neón oscuro en el puzzle
// y paneles azul marino tipo web en el login y los HUD) y eso era lo que hacía que
// el juego se viera amateur. Regla desde ahora: toda pieza de interfaz sale de acá.
//
// Principios (público de 6-8 años que casi no lee):
//   - icono antes que texto; el texto, si está, es para el adulto
//   - botones gordos con canto y sombra: se tienen que ver "apretables"
//   - todo responde al toque: se aplasta, rebota y suena

// ── paleta cálida ──
export const CLAY = {
  crema:       0xf7e7bd,
  cremaClaro:  0xfdf3dc,
  borde:       0xcaa05a,
  bordeOscuro: 0x8a5a2a,
  madera:      0xc88a4a,
  maderaOscura:0x8a5a2a,

  // fichas del tablero
  ficha:       0xf6e6c0,
  fichaCanto:  0xd8b67c,

  // colores de botón (cara) — el canto se calcula con oscurecer()
  verde:    0x7cc35a,
  naranja:  0xf08a3c,
  azul:     0x5fb0e8,
  rojo:     0xe8705e,
  amarillo: 0xf6c945,
  lila:     0xb48ad8,

  // estados
  okFill:   0xc9e6a8,
  okBorde:  0x6fa84a,
  offFill:  0xddd2bb,
  offBorde: 0xb0a488,

  // fondo de transiciones (marrón chocolate)
  fundido:  [42, 26, 14],

  // textos (string, para estilos de text)
  txt:      '#5a3a1a',
  txtSuave: '#8a6a3a',
  txtOk:    '#3c6a1e',
  txtOff:   '#8a7a58',
};

// ── color ──
export function oscurecer(color, f = 0.68) {
  const r = (color >> 16) & 0xff, g = (color >> 8) & 0xff, b = color & 0xff;
  return (Math.round(r * f) << 16) | (Math.round(g * f) << 8) | Math.round(b * f);
}
export function aclarar(color, f = 0.35) {
  const r = (color >> 16) & 0xff, g = (color >> 8) & 0xff, b = color & 0xff;
  const m = c => Math.round(c + (255 - c) * f);
  return (m(r) << 16) | (m(g) << 8) | m(b);
}
export function hex(color) {
  return `#${color.toString(16).padStart(6, '0')}`;
}

// estilo de texto de plastilina: redondo, con contorno marrón (se lee sobre cualquier fondo)
export function estiloTexto(tam = 18, color = '#ffffff', contorno = '#5a3a1a', grosor = null) {
  return {
    fontSize: `${tam}px`, color, fontFamily: FUENTE, fontStyle: '600',
    stroke: contorno, strokeThickness: grosor ?? Math.max(3, Math.round(tam * 0.22)),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Piezas básicas (compatibles con el código previo)
// ─────────────────────────────────────────────────────────────────────────────

// Rectángulo redondeado de plastilina. Devuelve el Graphics.
export function tagRedondo(scene, cx, cy, w, h, fill, stroke, r = 8, alpha = 1) {
  const g = scene.add.graphics();
  g.fillStyle(fill, alpha); g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, r);
  g.lineStyle(2, stroke, alpha); g.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, r);
  return g;
}

// Igual pero con sombra suave debajo. Devuelve [sombra, cuerpo].
export function panelClay(scene, cx, cy, w, h, fill, stroke, r = 12, alpha = 1) {
  const sombra = scene.add.graphics();
  sombra.fillStyle(0x6b4a22, 0.18 * alpha);
  sombra.fillRoundedRect(cx - w / 2, cy - h / 2 + 4, w, h, r);
  return [sombra, tagRedondo(scene, cx, cy, w, h, fill, stroke, r, alpha)];
}

// Losa de plastilina con volumen: sombra + canto + cara + brillo + contorno grueso.
// Se dibuja centrada en (0,0) y el Graphics se ubica en (x,y): así se puede escalar
// y rebotar desde el centro.
export function losa(scene, x, y, w, h, { fill = CLAY.crema, borde = null, r = 18, grosor = 4, canto = 6, sombra = 0.22, brillo = 0.3 } = {}) {
  const b = borde ?? oscurecer(fill, 0.62);
  const rr = Math.min(r, (h - canto) / 2, w / 2);
  const g = scene.add.graphics({ x, y });
  if (sombra > 0) {
    g.fillStyle(0x3a2410, sombra);
    g.fillRoundedRect(-w / 2 + 2, -h / 2 + canto + 4, w, h - canto, rr);
  }
  g.fillStyle(b, 1);    g.fillRoundedRect(-w / 2, -h / 2 + canto, w, h - canto, rr);
  g.fillStyle(fill, 1); g.fillRoundedRect(-w / 2, -h / 2, w, h - canto, rr);
  if (brillo > 0) {
    const bh = Math.max(4, (h - canto) * 0.2);
    g.fillStyle(0xffffff, brillo);
    g.fillRoundedRect(-w / 2 + w * 0.12, -h / 2 + (h - canto) * 0.09, w * 0.76, bh, Math.min(bh / 2, rr));
  }
  g.lineStyle(grosor, b, 1);
  g.strokeRoundedRect(-w / 2, -h / 2, w, h - canto, rr);
  return g;
}

// ─────────────────────────────────────────────────────────────────────────────
// Iconos vectoriales — se dibujan centrados en (0,0) dentro de un cuadrado `s`.
// `c` = color del icono, `f` = color de fondo (para "agujeros" como la puerta).
// ─────────────────────────────────────────────────────────────────────────────

// línea gruesa con puntas redondas (Graphics no tiene line caps)
function linea(g, x1, y1, x2, y2, w, c) {
  g.lineStyle(w, c, 1);
  g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.strokePath();
  g.fillStyle(c, 1); g.fillCircle(x1, y1, w / 2); g.fillCircle(x2, y2, w / 2);
}

export const ICONOS = {
  casita(g, s, c, f) {
    g.fillStyle(c, 1);
    g.fillTriangle(-s * 0.5, -s * 0.02, 0, -s * 0.46, s * 0.5, -s * 0.02);
    g.fillRoundedRect(-s * 0.34, -s * 0.1, s * 0.68, s * 0.5, s * 0.06);
    g.fillStyle(f, 1);
    g.fillRoundedRect(-s * 0.1, s * 0.1, s * 0.2, s * 0.3, { tl: s * 0.1, tr: s * 0.1, bl: 0, br: 0 });
  },
  reiniciar(g, s, c) {
    const r = s * 0.32, w = s * 0.15;
    const a0 = Phaser.Math.DegToRad(40), a1 = Phaser.Math.DegToRad(300);
    g.lineStyle(w, c, 1);
    g.beginPath(); g.arc(0, 0, r, a0, a1, false); g.strokePath();
    g.fillStyle(c, 1);
    g.fillCircle(Math.cos(a0) * r, Math.sin(a0) * r, w / 2);
    // punta de flecha tangente al final del arco
    const px = Math.cos(a1) * r, py = Math.sin(a1) * r;
    const tx = -Math.sin(a1), ty = Math.cos(a1);      // tangente (sentido horario)
    const nx = Math.cos(a1),  ny = Math.sin(a1);      // radial
    const L = s * 0.2, A = s * 0.19;
    g.fillTriangle(px + tx * L, py + ty * L, px + nx * A, py + ny * A, px - nx * A, py - ny * A);
  },
  mapa(g, s, c) {
    g.fillStyle(c, 1);
    const q = s * 0.36, sep = s * 0.06;
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([dx, dy]) =>
      g.fillRoundedRect(dx < 0 ? -q - sep / 2 : sep / 2, dy < 0 ? -q - sep / 2 : sep / 2, q, q, q * 0.28));
  },
  play(g, s, c) {
    g.fillStyle(c, 1);
    g.fillTriangle(-s * 0.26, -s * 0.38, s * 0.42, 0, -s * 0.26, s * 0.38);
    g.fillCircle(-s * 0.2, -s * 0.3, s * 0.08); g.fillCircle(-s * 0.2, s * 0.3, s * 0.08);
  },
  tienda(g, s, c, f) {  // bolsa de compras con dos asas (sin agujero: no confundir con un candado)
    g.lineStyle(s * 0.07, c, 1);
    g.beginPath(); g.arc(-s * 0.13, -s * 0.16, s * 0.1, Math.PI, 0, false); g.strokePath();
    g.beginPath(); g.arc(s * 0.13, -s * 0.16, s * 0.1, Math.PI, 0, false); g.strokePath();
    g.fillStyle(c, 1);
    g.fillPoints([{ x: -s * 0.34, y: -s * 0.16 }, { x: s * 0.34, y: -s * 0.16 },
                  { x: s * 0.4, y: s * 0.42 }, { x: -s * 0.4, y: s * 0.42 }], true);
    g.fillStyle(f, 1);
    // estrellita en la bolsa: "cosas lindas"
    const e = [], R = s * 0.12, r = s * 0.05;
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r : R;
      e.push({ x: Math.cos(a) * rr, y: s * 0.13 + Math.sin(a) * rr });
    }
    g.fillPoints(e, true);
  },
  sonido(g, s, c) {
    g.fillStyle(c, 1);
    g.fillRect(-s * 0.4, -s * 0.13, s * 0.18, s * 0.26);
    g.fillTriangle(-s * 0.26, -s * 0.13, s * 0.02, -s * 0.38, s * 0.02, s * 0.38);
    g.fillTriangle(-s * 0.26, s * 0.13, s * 0.02, s * 0.38, -s * 0.26, -s * 0.13);
    g.lineStyle(s * 0.08, c, 1);
    g.beginPath(); g.arc(s * 0.06, 0, s * 0.16, -0.9, 0.9, false); g.strokePath();
    g.beginPath(); g.arc(s * 0.06, 0, s * 0.32, -0.9, 0.9, false); g.strokePath();
  },
  silencio(g, s, c) {
    g.fillStyle(c, 1);
    g.fillRect(-s * 0.4, -s * 0.13, s * 0.18, s * 0.26);
    g.fillTriangle(-s * 0.26, -s * 0.13, s * 0.02, -s * 0.38, s * 0.02, s * 0.38);
    g.fillTriangle(-s * 0.26, s * 0.13, s * 0.02, s * 0.38, -s * 0.26, -s * 0.13);
    linea(g, s * 0.14, -s * 0.14, s * 0.4, s * 0.14, s * 0.09, c);
    linea(g, s * 0.14, s * 0.14, s * 0.4, -s * 0.14, s * 0.09, c);
  },
  cerrar(g, s, c) {
    linea(g, -s * 0.26, -s * 0.26, s * 0.26, s * 0.26, s * 0.16, c);
    linea(g, -s * 0.26, s * 0.26, s * 0.26, -s * 0.26, s * 0.16, c);
  },
  atras(g, s, c) {
    linea(g, s * 0.3, 0, -s * 0.2, 0, s * 0.16, c);
    linea(g, -s * 0.28, 0, -s * 0.04, -s * 0.24, s * 0.16, c);
    linea(g, -s * 0.28, 0, -s * 0.04, s * 0.24, s * 0.16, c);
  },
  check(g, s, c) {
    linea(g, -s * 0.3, 0, -s * 0.08, s * 0.24, s * 0.17, c);
    linea(g, -s * 0.08, s * 0.24, s * 0.32, -s * 0.24, s * 0.17, c);
  },
  puerta(g, s, c, f) {
    g.fillStyle(c, 1);
    g.fillRoundedRect(-s * 0.26, -s * 0.4, s * 0.52, s * 0.8, { tl: s * 0.2, tr: s * 0.2, bl: 0, br: 0 });
    g.fillStyle(f, 1); g.fillCircle(s * 0.12, s * 0.04, s * 0.06);
  },
  regalo(g, s, c, f) {  // paquetito con moño
    g.fillStyle(c, 1);
    g.fillRoundedRect(-s * 0.36, -s * 0.12, s * 0.72, s * 0.5, s * 0.06);
    g.fillRoundedRect(-s * 0.42, -s * 0.24, s * 0.84, s * 0.16, s * 0.05);
    g.fillStyle(f, 1);
    g.fillRect(-s * 0.06, -s * 0.24, s * 0.12, s * 0.62);
    g.lineStyle(s * 0.08, c, 1);
    g.strokeEllipse(-s * 0.13, -s * 0.33, s * 0.24, s * 0.16);
    g.strokeEllipse(s * 0.13, -s * 0.33, s * 0.24, s * 0.16);
  },
  mano(g, s, c) {      // palma abierta = "listo / ok"
    g.fillStyle(c, 1);
    g.fillRoundedRect(-s * 0.26, -s * 0.06, s * 0.52, s * 0.44, s * 0.16);
    [-0.2, -0.07, 0.07, 0.2].forEach((dx, i) =>
      g.fillRoundedRect(s * dx - s * 0.055, -s * (i === 0 || i === 3 ? 0.3 : 0.4), s * 0.11, s * 0.4, s * 0.055));
  },
};

// dibuja un icono en un Graphics nuevo, centrado en (x,y)
export function icono(scene, x, y, nombre, s, color = 0xffffff, fondo = 0x000000) {
  const g = scene.add.graphics({ x, y });
  if (ICONOS[nombre]) ICONOS[nombre](g, s, color, fondo);
  return g;
}

// ─────────────────────────────────────────────────────────────────────────────
// Botón de plastilina
// ─────────────────────────────────────────────────────────────────────────────
//
//   boton(scene, x, y, { w, h, fill, icono: 'casita' | imagen: 'moneda' | texto, onTap })
//
// Devuelve un Container (se puede mover, meter en otro container, escalar).
// Al tocarlo se aplasta y al soltar rebota y suena: es la diferencia más grande
// entre "una web" y "un juego".
//   alPresionar → dispara al bajar el dedo (d-pad: respuesta inmediata)
//   permitir    → función que puede vetar el disparo (p. ej. si fue un arrastre de scroll)
export function boton(scene, x, y, opts = {}) {
  const {
    w = 64, h = w, r = null, fill = CLAY.naranja, borde = null,
    icono: ico = null, imagen = null, texto = null, tamTexto = 18, tamIcono = null,
    colorIcono = 0xffffff, alPresionar = false, sonido = 'click', onTap = null,
    permitir = null, canto = Math.max(4, Math.round(h * 0.08)),
  } = opts;

  const c = scene.add.container(x, y);
  const radio = r ?? Math.min(w, h) / 2;
  const cuerpo = losa(scene, 0, 0, w, h, { fill, borde, r: radio, canto, grosor: Math.max(3, Math.round(h * 0.05)) });
  c.add(cuerpo);

  // contenido centrado sobre la cara (la cara está `canto` más arriba que el total)
  const cy = -canto / 2;
  const s  = tamIcono ?? Math.min(w, h - canto) * 0.56;
  let cx = 0;
  if ((ico || imagen) && texto) cx = -w / 2 + s / 2 + Math.max(12, w * 0.1);

  if (imagen) {
    const key = SpriteConfig.get('ui', imagen) || imagen;
    if (scene.textures.exists(key)) c.add(scene.add.image(cx, cy, key).setDisplaySize(s * 1.15, s * 1.15));
  } else if (ico) {
    c.add(icono(scene, cx, cy, ico, s, colorIcono, fill));
  }
  if (texto) {
    const tx = (ico || imagen) ? cx + s / 2 + 8 : 0;
    c.add(scene.add.text(tx, cy, texto, estiloTexto(tamTexto, '#ffffff', hex(oscurecer(fill, 0.5))))
      .setOrigin((ico || imagen) ? 0 : 0.5, 0.5));
  }

  c.setSize(w, h).setInteractive({ useHandCursor: true });
  c.deshabilitado = false;
  c.setDeshabilitado = (v) => { c.deshabilitado = v; c.setAlpha(v ? 0.5 : 1); return c; };

  let presionado = false;
  const escalar = (sx, sy, dur, ease = 'Quad.easeOut') => {
    scene.tweens.killTweensOf(c);
    scene.tweens.add({ targets: c, scaleX: sx, scaleY: sy, duration: dur, ease });
  };
  const disparar = () => {
    if (permitir && !permitir()) return;
    if (c.deshabilitado) { Sonido.error(); sacudir(scene, c); return; }
    if (sonido && Sonido[sonido]) Sonido[sonido]();
    if (onTap) onTap(c);
  };

  c.on('pointerdown', () => {
    presionado = true;
    escalar(1.08, 0.86, 70);
    if (alPresionar) disparar();
  });
  c.on('pointerup', () => {
    if (!presionado) return;
    presionado = false;
    escalar(1, 1, 260, 'Back.easeOut');
    if (!alPresionar) disparar();
  });
  c.on('pointerover', () => { if (!presionado) escalar(1.06, 1.06, 120); });
  c.on('pointerout',  () => { presionado = false; escalar(1, 1, 160); });
  return c;
}

// numerito en un círculo (contador sobre un botón: pistas, etc.)
export function insignia(scene, x, y, valor, { fill = CLAY.rojo, tam = 13, r = 12 } = {}) {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  g.fillStyle(oscurecer(fill, 0.6), 1); g.fillCircle(0, 2, r);
  g.fillStyle(fill, 1); g.fillCircle(0, 0, r);
  g.lineStyle(2.5, 0xffffff, 1); g.strokeCircle(0, 0, r);
  const t = scene.add.text(0, 0, `${valor}`, estiloTexto(tam, '#ffffff', hex(oscurecer(fill, 0.45)), 3)).setOrigin(0.5);
  c.add([g, t]);
  c.setTexto = v => { t.setText(`${v}`); return c; };
  return c;
}

// ─────────────────────────────────────────────────────────────────────────────
// Movimiento ("juice")
// ─────────────────────────────────────────────────────────────────────────────

// sacudida horizontal corta — "no se puede"
export function sacudir(scene, obj, fuerza = 6) {
  const x0 = obj._xBase ?? obj.x;
  obj._xBase = x0;
  scene.tweens.add({
    targets: obj, x: { from: x0 - fuerza, to: x0 + fuerza }, duration: 45, yoyo: true, repeat: 2,
    onComplete: () => { obj.x = x0; },
  });
}

// aparición con rebote (desde chiquito)
export function aparecer(scene, obj, retardo = 0, escala = 1) {
  obj.setScale(0.2 * escala).setAlpha(0);
  scene.tweens.add({ targets: obj, scale: escala, alpha: 1, duration: 380, delay: retardo, ease: 'Back.easeOut' });
  return obj;
}

// respiración suave y continua (algo que "invita" a tocarlo)
export function respirar(scene, obj, amp = 0.06, dur = 900) {
  const base = obj.scaleX || 1;
  return scene.tweens.add({
    targets: obj, scaleX: base * (1 + amp), scaleY: base * (1 + amp),
    duration: dur, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Transiciones entre escenas
// ─────────────────────────────────────────────────────────────────────────────
//
// Fundido a chocolate y de vuelta. Va en TODA salida de escena: el corte seco era
// otra de las cosas que delataban "prototipo".
//
// `_saliendo` evita doble salida por doble toque. Ojo: Phaser reutiliza la instancia
// de la escena, así que se resetea en entrarEscena() (al principio de cada create).

export function entrarEscena(scene) {
  scene._saliendo = false;
  const [r, g, b] = CLAY.fundido;
  scene.cameras.main.fadeIn(260, r, g, b);
}

export function irA(scene, key, data) {
  if (scene._saliendo) return;
  scene._saliendo = true;
  const [r, g, b] = CLAY.fundido;
  Sonido.whoosh();
  scene.cameras.main.fadeOut(200, r, g, b);
  scene.cameras.main.once('camerafadeoutcomplete', () => scene.scene.start(key, data));
}

// ─────────────────────────────────────────────────────────────────────────────
// Partículas
// ─────────────────────────────────────────────────────────────────────────────

function _texturas(scene) {
  if (!scene.textures.exists('confeti')) {
    const g = scene.make.graphics({ add: false });
    g.fillStyle(0xffffff, 1); g.fillRoundedRect(0, 0, 12, 7, 3);
    g.generateTexture('confeti', 12, 7); g.destroy();
  }
  if (!scene.textures.exists('chispa')) {
    const g = scene.make.graphics({ add: false });
    g.fillStyle(0xffffff, 1); g.fillCircle(8, 8, 8);
    g.fillStyle(0xffffff, 0.4); g.fillCircle(8, 8, 5);
    g.generateTexture('chispa', 16, 16); g.destroy();
  }
}

export const COLORES_FIESTA = [0xf08a3c, 0xf6c945, 0x7cc35a, 0x5fb0e8, 0xe8705e, 0xb48ad8];

// lluvia de confeti hacia arriba desde (x,y)
export function confeti(scene, x, y, { cantidad = 70, colores = COLORES_FIESTA, depth = 400 } = {}) {
  _texturas(scene);
  const em = scene.add.particles(x, y, 'confeti', {
    speed: { min: 260, max: 520 }, angle: { min: 235, max: 305 },
    gravityY: 700, rotate: { start: 0, end: 540 },
    scale: { min: 0.7, max: 1.3 }, lifespan: 2200,
    alpha: { start: 1, end: 0.6 },
    tint: colores, emitting: false,
  }).setDepth(depth);
  em.explode(cantidad);
  scene.time.delayedCall(2400, () => em.destroy());
  return em;
}

// ráfaga redonda (componente que se enciende, compra, etc.)
export function chispas(scene, x, y, color, { cantidad = 14, velocidad = 90, depth = 101 } = {}) {
  _texturas(scene);
  const em = scene.add.particles(x, y, 'chispa', {
    speed: { min: velocidad * 0.35, max: velocidad }, angle: { min: 0, max: 360 },
    scale: { start: 0.7, end: 0 }, alpha: { start: 1, end: 0 },
    lifespan: 480, tint: color, emitting: false,
  }).setDepth(depth);
  em.explode(cantidad);
  scene.time.delayedCall(600, () => em.destroy());
  return em;
}

export { _texturas as asegurarTexturas };

// ─────────────────────────────────────────────────────────────────────────────
// Estrellas
// ─────────────────────────────────────────────────────────────────────────────

// una estrella (sprite si está, si no glifo)
export function estrella(scene, x, y, llena, sz = 24) {
  const nombre = llena ? 'estrella_llena' : 'estrella_vacia';
  const key = SpriteConfig.get('ui', nombre);
  if (key && scene.textures.exists(key)) return scene.add.image(x, y, key).setDisplaySize(sz, sz);
  return scene.add.text(x, y, llena ? '★' : '☆', {
    fontSize: `${sz}px`, color: '#e8a33a', fontFamily: FUENTE,
  }).setOrigin(0.5);
}

// Fila de 3 estrellas desde x (borde izquierdo). Devuelve el array de objetos.
export function estrellas(scene, x, y, ganadas, sz = 13) {
  const objs = [];
  for (let i = 0; i < 3; i++) objs.push(estrella(scene, x + i * (sz + 3) + sz / 2, y, i < ganadas, sz));
  return objs;
}

// Botón de sonido on/off — se redibuja a sí mismo al tocarlo (cambia el icono).
export function botonSonido(scene, x, y, tam = 46, depth = 150) {
  let b = null;
  const crear = () => {
    if (b) b.destroy();
    b = boton(scene, x, y, {
      w: tam, fill: CLAY.cremaClaro, colorIcono: CLAY.bordeOscuro,
      icono: Sonido.silencio ? 'silencio' : 'sonido', sonido: null,
      onTap: () => { Sonido.alternarSilencio(); Sonido.click(); crear(); },
    }).setDepth(depth);
  };
  crear();
  return () => b;
}

// Cartel flotante de plastilina (toast). Reemplaza al texto con backgroundColor.
export function cartel(scene, x, y, texto, { color = CLAY.txt, fill = CLAY.cremaClaro, depth = 500, dur = 1600 } = {}) {
  const t = scene.add.text(0, -3, texto, {
    fontSize: '16px', color, fontFamily: FUENTE, fontStyle: '600', align: 'center',
  }).setOrigin(0.5);
  const w = t.width + 36, h = t.height + 22;
  const c = scene.add.container(x, y, [losa(scene, 0, 0, w, h, { fill, r: 16, canto: 5, grosor: 3 }), t]).setDepth(depth);
  aparecer(scene, c);
  scene.tweens.add({ targets: c, alpha: 0, y: y - 12, delay: dur, duration: 400, onComplete: () => c.destroy() });
  return c;
}
