import SpriteConfig, { FUENTE } from './SpriteConfig.js';

// ClayUI.js — piezas de interfaz en el estilo "plastilina cálida".
// Es el lenguaje visual del cuarto, la tienda y el selector de niveles: crema,
// madera y marrón, con esquinas redondeadas. (El puzzle usa la paleta oscura
// con componentes neón — ahí NO va esto.)
//
// StoreScene tiene copias privadas casi idénticas de _tagRedondo y _botonClay;
// se pueden migrar acá cuando se toque esa escena.

// ── paleta cálida ──
export const CLAY = {
  crema:       0xf7e7bd,
  cremaClaro:  0xfdf3dc,
  borde:       0xcaa05a,
  bordeOscuro: 0x8a5a2a,
  madera:      0xc88a4a,

  // estados
  okFill:   0xc9e6a8,
  okBorde:  0x6fa84a,
  offFill:  0xddd2bb,
  offBorde: 0xb0a488,

  // textos (string, para estilos de text)
  txt:      '#5a3a1a',
  txtSuave: '#8a6a3a',
  txtOk:    '#3c6a1e',
  txtOff:   '#8a7a58',
};

// Rectángulo redondeado de plastilina. Devuelve el Graphics.
export function tagRedondo(scene, cx, cy, w, h, fill, stroke, r = 8, alpha = 1) {
  const g = scene.add.graphics();
  g.fillStyle(fill, alpha); g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, r);
  g.lineStyle(2, stroke, alpha); g.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, r);
  return g;
}

// Igual pero con sombra suave debajo: le da el volumen de "plastilina apoyada".
// Devuelve [sombra, cuerpo] — ambos Graphics, en orden de dibujo.
export function panelClay(scene, cx, cy, w, h, fill, stroke, r = 12, alpha = 1) {
  const sombra = scene.add.graphics();
  sombra.fillStyle(0x6b4a22, 0.18 * alpha);
  sombra.fillRoundedRect(cx - w / 2, cy - h / 2 + 4, w, h, r);
  return [sombra, tagRedondo(scene, cx, cy, w, h, fill, stroke, r, alpha)];
}

// Botón de plastilina: fondo + texto + zona clickeable. Devuelve {g, txt, zone}.
export function botonClay(scene, cx, cy, w, h, label, fill = CLAY.madera, fontSize = '12px') {
  const g = tagRedondo(scene, cx, cy, w, h, fill, CLAY.bordeOscuro, 10);
  const txt = scene.add.text(cx, cy, label, {
    fontSize, color: '#4a2e10', fontFamily: FUENTE
  }).setOrigin(0.5);
  const zone = scene.add.rectangle(cx, cy, w, h, 0xffffff, 0).setInteractive({ useHandCursor: true });
  zone.on('pointerover', () => g.setAlpha(0.85));
  zone.on('pointerout',  () => g.setAlpha(1));
  return { g, txt, zone };
}

// Fila de 3 estrellas: usa el arte de ui.estrella_* si está, si no cae al glifo ★.
// Devuelve el array de objetos creados (para meterlos en un container).
export function estrellas(scene, x, y, ganadas, sz = 13) {
  const objs = [];
  const key = SpriteConfig.get('ui', 'estrella_llena');
  if (key && scene.textures.exists(key)) {
    for (let i = 0; i < 3; i++) {
      const nombre = i < ganadas ? 'estrella_llena' : 'estrella_vacia';
      const im = SpriteConfig.colocar(scene, 'ui', nombre, x + i * (sz + 3) + sz / 2, y, null);
      if (im) objs.push(im.setDisplaySize(sz, sz));
    }
  } else {
    objs.push(scene.add.text(x, y, '★'.repeat(ganadas) + '☆'.repeat(3 - ganadas), {
      fontSize: `${sz}px`, color: '#e8a33a', fontFamily: FUENTE
    }).setOrigin(0, 0.5));
  }
  return objs;
}
