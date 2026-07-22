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

// ── cómo están calculados los precios ──
// Un nivel paga 25 / 50 / 70 monedas según saque 1★ / 2★ / 3★ (GameState).
// Sobre eso se tasó todo, con tres objetivos:
//
//   1. El tablero siguiente se compra con una media de 2★, no con una de 1★.
//      Los 10 niveles gratis dan 500 a 2★ y sólo 250 a 1★; el tablero 6x6 cuesta
//      400. Quien viene jugando flojo tiene que volver y mejorar para avanzar.
//   2. Como mucho 1-2 muebles cada 20 niveles. Con media de 2★ el juego entero
//      (50 niveles) deja unos 5 de los 17 muebles: la casa se decora a lo largo
//      de mucho tiempo, no en una tarde.
//   3. No se compra medio juego en los primeros 10 niveles. Después de pagar el
//      tablero, a 2★ sobran 100 monedas: ni el mueble más barato.
//
// Si tocás estos precios o las monedas por estrella, conviene rehacer la cuenta:
// lo que rompe la progresión no es un precio suelto sino la relación entre lo que
// entra por nivel y lo que cuesta el tablero siguiente.

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
    icono: '⚡', precio: 150, tipo: 'energia', unico: false, cantidad: 3,
  },
  {
    id: 'energia_full', cat: 'energia', nombre: 'recarga completa',
    desc: 'suma 10 niveles extra para hoy',
    icono: '🔋', precio: 450, tipo: 'energia', unico: false, cantidad: 10,
  },
  // ▼ placeholders de prueba (borrar) ▼
  { id: 'energia_1', cat: 'energia', nombre: '+1 nivel hoy',  desc: 'un nivel más', icono: '⚡', precio: 60,  tipo: 'energia', unico: false, cantidad: 1 },
  { id: 'energia_5', cat: 'energia', nombre: '+5 niveles hoy', desc: 'cinco extra',  icono: '🔌', precio: 240, tipo: 'energia', unico: false, cantidad: 5 },
  // ▲ placeholders ▲

  // ── niveles — packs (compra única) ──
  // el pack no vende "niveles sueltos": vende el TABLERO más grande, y con él
  // vienen los 30 niveles que lo usan (interruptores + todo combinado).
  {
    id: 'pack_tablero6', cat: 'niveles', nombre: 'tablero 6x6',
    desc: '30 niveles con interruptores',
    icono: '🎮', precio: 400, tipo: 'pack', unico: true, pack: 'tablero6',
  },
  {
    id: 'pack_expertos', cat: 'niveles', nombre: 'tablero 8x8',
    desc: '10 niveles expertos con capacitores',
    icono: '🏆', precio: 700, tipo: 'pack', unico: true, pack: 'expertos',
  },
  {
    id: 'pack_paralelos', cat: 'niveles', nombre: 'circuitos paralelos',
    desc: 'ramifica la corriente — próximamente',
    icono: '🔀', precio: 1000, tipo: 'pack', unico: true, pack: 'paralelos',
    proximamente: true,
  },

  // ── mejoras — pistas (consumible, repetible) ──
  {
    id: 'mejora_pistas', cat: 'mejoras', nombre: '+3 pistas',
    desc: '3 pistas para revelar el orden del circuito',
    icono: '💡', precio: 120, tipo: 'pista', unico: false, cantidad: 3,
  },
  // ▼ placeholders de prueba (borrar) ▼
  { id: 'mejora_ph1', cat: 'mejoras', nombre: 'mejora A', desc: 'placeholder', icono: '✨', precio: 200, tipo: 'mejora', unico: true, proximamente: true },
  { id: 'mejora_ph2', cat: 'mejoras', nombre: 'mejora B', desc: 'placeholder', icono: '🌟', precio: 250, tipo: 'mejora', unico: true, proximamente: true },
  { id: 'mejora_ph3', cat: 'mejoras', nombre: 'mejora C', desc: 'placeholder', icono: '💫', precio: 300, tipo: 'mejora', unico: true, proximamente: true },
  // ▲ placeholders ▲

  // ── muebles — decoran el cuarto (compra única) ──
  // 'mueble' = key en SpriteConfig.muebles y en assets/muebles/<key>.png
  { id: 'mueble_estante',   cat: 'muebles', nombre: 'estante',  desc: 'repisa para adornos', icono: '🗄️', precio: 400, tipo: 'mueble', unico: true, mueble: 'estante' },
  { id: 'mueble_repisa',    cat: 'muebles', nombre: 'repisa',   desc: 'estante pequeño', icono: '📚', precio: 320, tipo: 'mueble', unico: true, mueble: 'repisa' },
  { id: 'mueble_vitrina',   cat: 'muebles', nombre: 'vitrina',  desc: 'mostrador con repisas', icono: '🪟', precio: 700, tipo: 'mueble', unico: true, mueble: 'vitrina' },
  { id: 'mueble_ropero',    cat: 'muebles', nombre: 'ropero',   desc: 'para guardar la ropa', icono: '🚪', precio: 640, tipo: 'mueble', unico: true, mueble: 'ropero' },
  { id: 'mueble_banquito',  cat: 'muebles', nombre: 'banquito', desc: 'para sentarse un rato', icono: '🪑', precio: 260, tipo: 'mueble', unico: true, mueble: 'banquito' },
  { id: 'mueble_sillon',    cat: 'muebles', nombre: 'sillón',   desc: 'para descansar', icono: '🛋️', precio: 600, tipo: 'mueble', unico: true, mueble: 'sillon' },
  { id: 'mueble_sillon_ind',cat: 'muebles', nombre: 'sillón individual', desc: 'cómodo y mullido', icono: '🪑', precio: 440, tipo: 'mueble', unico: true, mueble: 'sillon_ind' },
  { id: 'mueble_planta',    cat: 'muebles', nombre: 'planta',   desc: 'un toque verde',  icono: '🪴', precio: 300, tipo: 'mueble', unico: true, mueble: 'planta' },
  { id: 'mueble_lampara',   cat: 'muebles', nombre: 'lámpara',  desc: 'ilumina el rincón', icono: '💡', precio: 400, tipo: 'mueble', unico: true, mueble: 'lampara' },
  { id: 'mueble_mesita',    cat: 'muebles', nombre: 'mesita',   desc: 'una mesita redonda', icono: '🪵', precio: 360, tipo: 'mueble', unico: true, mueble: 'mesita' },
  { id: 'mueble_peluche',   cat: 'muebles', nombre: 'peluche',  desc: 'un osito suave',  icono: '🧸', precio: 300, tipo: 'mueble', unico: true, mueble: 'peluche' },
  { id: 'mueble_baul',      cat: 'muebles', nombre: 'baúl',     desc: 'baúl de juguetes', icono: '🧰', precio: 500, tipo: 'mueble', unico: true, mueble: 'baul' },
  { id: 'mueble_pelota',    cat: 'muebles', nombre: 'pelota',   desc: 'para jugar',      icono: '⚽', precio: 240, tipo: 'mueble', unico: true, mueble: 'pelota' },
  { id: 'mueble_poster',    cat: 'muebles', nombre: 'póster',   desc: 'póster de pared', icono: '🖼️', precio: 360, tipo: 'mueble', unico: true, mueble: 'poster' },
  { id: 'mueble_reloj',     cat: 'muebles', nombre: 'reloj',    desc: 'reloj de pared',  icono: '🕐', precio: 320, tipo: 'mueble', unico: true, mueble: 'reloj' },
  { id: 'mueble_cuadro',    cat: 'muebles', nombre: 'cuadro',   desc: 'un cuadrito',     icono: '🌅', precio: 280, tipo: 'mueble', unico: true, mueble: 'cuadro' },
  { id: 'mueble_tapete',    cat: 'muebles', nombre: 'tapete',   desc: 'tapete del piso', icono: '🟦', precio: 440, tipo: 'mueble', unico: true, mueble: 'tapete' },

];

// helper: items de una categoría
export function itemsDe(catId) {
  return TIENDA.filter(it => it.cat === catId);
}
