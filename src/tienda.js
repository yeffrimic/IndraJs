// tienda.js — catálogo de la tienda (datos, estilo levels.js)
// El jugador gasta MONEDAS (separadas del récord puntosTotal).
//
// item: {
//   id          identificador único (también clave en GameState.desbloqueos)
//   cat         categoría: 'energia' | 'niveles' | 'mejoras' | 'muebles'
//   nombre      texto corto
//   desc        descripción de una línea
//   icono       emoji placeholder (se reemplaza por pixel art vía SpriteConfig)
//   precio      en monedas
//   tipo        efecto: 'energia' | 'pack' | 'mejora' | 'mueble'
//   unico       true = se compra una sola vez (queda en desbloqueos)
//   cantidad    (energia) niveles extra que otorga hoy
//   pack        (pack) nombre del pack que desbloquea en levels.js
//   mueble      (mueble) key del mueble para SpriteConfig / placeholder
//   proximamente true = visible pero aún no comprable
// }

export const TIENDA_CATS = [
  { id: 'energia',  label: 'energía',  icono: '⚡' },
  { id: 'niveles',  label: 'niveles',  icono: '🎮' },
  { id: 'mejoras',  label: 'mejoras',  icono: '✨' },
  { id: 'muebles',  label: 'muebles',  icono: '🪑' },
];

export const TIENDA = [

  // ── energía — repetible, de uso diario ──
  {
    id: 'energia_3', cat: 'energia', nombre: '+3 niveles hoy',
    desc: 'sigue jugando 3 niveles más por hoy',
    icono: '⚡', precio: 120, tipo: 'energia', unico: false, cantidad: 3,
  },
  {
    id: 'energia_full', cat: 'energia', nombre: 'recarga completa',
    desc: 'suma 10 niveles extra para hoy',
    icono: '🔋', precio: 350, tipo: 'energia', unico: false, cantidad: 10,
  },

  // ── niveles — packs (compra única) ──
  {
    id: 'pack_intermedios', cat: 'niveles', nombre: 'pack intermedios',
    desc: 'niveles más grandes con switches',
    icono: '🎮', precio: 400, tipo: 'pack', unico: true, pack: 'intermedios',
  },
  {
    id: 'pack_paralelos', cat: 'niveles', nombre: 'circuitos paralelos',
    desc: 'ramifica la corriente — próximamente',
    icono: '🔀', precio: 800, tipo: 'pack', unico: true, pack: 'paralelos',
    proximamente: true,
  },

  // ── mejoras — pistas (consumible, repetible) ──
  {
    id: 'mejora_pistas', cat: 'mejoras', nombre: '+3 pistas',
    desc: '3 pistas para revelar el orden del circuito',
    icono: '💡', precio: 150, tipo: 'pista', unico: false, cantidad: 3,
  },

  // ── muebles — decoran el cuarto (compra única) ──
  {
    id: 'mueble_planta', cat: 'muebles', nombre: 'planta',
    desc: 'un toque verde para el cuarto',
    icono: '🪴', precio: 150, tipo: 'mueble', unico: true, mueble: 'planta',
  },
  {
    id: 'mueble_lampara', cat: 'muebles', nombre: 'lámpara',
    desc: 'ilumina tu rincón de trabajo',
    icono: '💡', precio: 200, tipo: 'mueble', unico: true, mueble: 'lampara',
  },
  {
    id: 'mueble_poster', cat: 'muebles', nombre: 'póster',
    desc: 'un póster de circuitos en la pared',
    icono: '🖼️', precio: 180, tipo: 'mueble', unico: true, mueble: 'poster',
  },
  {
    id: 'mueble_tapete', cat: 'muebles', nombre: 'tapete',
    desc: 'un tapete acogedor en el piso',
    icono: '🟦', precio: 220, tipo: 'mueble', unico: true, mueble: 'tapete',
  },

];

// helper: items de una categoría
export function itemsDe(catId) {
  return TIENDA.filter(it => it.cat === catId);
}
