// 10 niveles generados — circuito puzzle
// formato: cada celda es { sym, order } o null
// sym: b=bateria, r=resistencia, c=capacitor, l=led, s=switch
// orden: BAT siempre primero, LED siempre al final

export const LEVELS = [

  // ── nivel 1 — línea recta simple ──
  // b . r . l
  // dificultad: 1 | serpiente: 5 tiles
  {
    name: 'primer circuito',
    diff: 1,
    grid: [
      [null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null],
      [null,{sym:'b',order:1},null,{sym:'r',order:2},null,{sym:'l',order:3},null],
      [null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null],
    ]
  },

  // ── nivel 2 — diagonal simple ──
  // b . . . .
  // . . r . .
  // . . . . l
  // dificultad: 1 | serpiente: 9 tiles
  {
    name: 'diagonal',
    diff: 1,
    grid: [
      [null,null,null,null,null,null,null],
      [null,{sym:'b',order:1},null,null,null,null,null],
      [null,null,null,null,null,null,null],
      [null,null,null,{sym:'r',order:2},null,null,null],
      [null,null,null,null,null,null,null],
      [null,null,null,null,null,{sym:'l',order:3},null],
      [null,null,null,null,null,null,null],
    ]
  },

  // ── nivel 3 — dos resistencias ──
  // b . r . r . l
  // dificultad: 1 | serpiente: 7 tiles
  {
    name: 'dos resistencias',
    diff: 1,
    grid: [
      [null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null],
      [{sym:'b',order:1},null,{sym:'r',order:2},null,{sym:'r',order:3},null,{sym:'l',order:4}],
      [null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null],
    ]
  },

  // ── nivel 4 — con capacitor ──
  // b . . . .
  // . . c . .
  // . r . . l
  // dificultad: 1 | serpiente: 11 tiles
  {
    name: 'capacitor en el camino',
    diff: 1,
    grid: [
      [null,null,null,null,null,null,null],
      [{sym:'b',order:1},null,null,null,null,null,null],
      [null,null,null,null,null,null,null],
      [null,null,{sym:'c',order:2},null,null,null,null],
      [null,null,null,null,null,null,null],
      [null,{sym:'r',order:3},null,null,null,{sym:'l',order:4},null],
      [null,null,null,null,null,null,null],
    ]
  },

  // ── nivel 5 — switch simple ──
  // b . s . l
  // el switch interrumpe el circuito
  // dificultad: 2 | serpiente: 5 tiles
  {
    name: 'interruptor',
    diff: 2,
    grid: [
      [null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null],
      [null,{sym:'b',order:1},null,{sym:'s',order:2},null,{sym:'l',order:3},null],
      [null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null],
    ]
  },

  // ── nivel 6 — zigzag ──
  // b . . . .
  // . . . r .
  // . . . . .
  // . c . . .
  // . . . . l
  // dificultad: 2 | serpiente: 13 tiles
  {
    name: 'zigzag',
    diff: 2,
    grid: [
      [{sym:'b',order:1},null,null,null,null,null,null],
      [null,null,null,null,null,null,null],
      [null,null,null,{sym:'r',order:2},null,null,null],
      [null,null,null,null,null,null,null],
      [null,{sym:'c',order:3},null,null,null,null,null],
      [null,null,null,null,null,null,null],
      [null,null,null,null,null,{sym:'l',order:4},null],
    ]
  },

  // ── nivel 7 — esquinas ──
  // b . . . . . .
  // . . . . . . .
  // . . . . . . .
  // . . . r . . .
  // . . . . . . .
  // . . . . . . .
  // . . . . . . l
  // dificultad: 2 | serpiente: 13 tiles
  {
    name: 'esquinas',
    diff: 2,
    grid: [
      [{sym:'b',order:1},null,null,null,null,null,null],
      [null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null],
      [null,null,null,{sym:'r',order:2},null,null,null],
      [null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null],
      [null,null,null,null,null,null,{sym:'l',order:3}],
    ]
  },

  // ── nivel 8 — dos switches ──
  // b . s . r . s . l
  // dificultad: 3 | serpiente: 9 tiles
  {
    name: 'dos interruptores',
    diff: 3,
    grid: [
      [null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null],
      [{sym:'b',order:1},null,{sym:'s',order:2},null,{sym:'r',order:3},null,{sym:'l',order:4}],
      [null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null],
    ]
  },

  // ── nivel 9 — circuito complejo ──
  // b . . . . . .
  // . . . . . . .
  // . . r . c . .
  // . . . . . . .
  // . . . s . . .
  // . . . . . . .
  // . . . . . . l
  // dificultad: 3 | serpiente: 17 tiles
  {
    name: 'circuito complejo',
    diff: 3,
    grid: [
      [{sym:'b',order:1},null,null,null,null,null,null],
      [null,null,null,null,null,null,null],
      [null,null,{sym:'r',order:2},null,{sym:'c',order:3},null,null],
      [null,null,null,null,null,null,null],
      [null,null,null,{sym:'s',order:4},null,null,null],
      [null,null,null,null,null,null,null],
      [null,null,null,null,null,null,{sym:'l',order:5}],
    ]
  },

  // ── nivel 10 — maestro del circuito ──
  // . b . . . . .
  // . . . . . . .
  // . . . r . . .
  // . . . . . c .
  // . s . . . . .
  // . . . . r . .
  // . . . . . . l
  // dificultad: 3 | serpiente: 19 tiles
  {
    name: 'maestro del circuito',
    diff: 3,
    grid: [
      [null,{sym:'b',order:1},null,null,null,null,null],
      [null,null,null,null,null,null,null],
      [null,null,null,{sym:'r',order:2},null,null,null],
      [null,null,null,null,null,{sym:'c',order:3},null],
      [null,{sym:'s',order:4},null,null,null,null,null],
      [null,null,null,null,{sym:'r',order:5},null,null],
      [null,null,null,null,null,null,{sym:'l',order:6}],
    ]
  },

  // ════════════════════════════════════════════════════════════
  //  PACK INTERMEDIOS — se desbloquea comprándolo en la tienda
  //  grids más grandes (9 col) con mecánica existente
  // ════════════════════════════════════════════════════════════

  // ── intermedio 1 — espacio amplio ──
  // dificultad: 3 | pack: intermedios
  {
    name: 'sala de pruebas',
    diff: 3,
    pack: 'intermedios',
    grid: [
      [null,null,null,null,null,null,null,null,null],
      [null,{sym:'b',order:1},null,null,null,null,null,null,null],
      [null,null,null,null,{sym:'r',order:2},null,null,null,null],
      [null,null,null,null,null,null,null,{sym:'c',order:3},null],
      [null,null,null,null,null,null,null,null,null],
      [null,null,{sym:'l',order:4},null,null,null,null,null,null],
      [null,null,null,null,null,null,null,null,null],
    ]
  },

  // ── intermedio 2 — doble switch amplio ──
  // dificultad: 4 | pack: intermedios
  {
    name: 'puente doble',
    diff: 4,
    pack: 'intermedios',
    grid: [
      [null,{sym:'b',order:1},null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null,null,null],
      [null,null,null,{sym:'s',order:2},null,null,null,null,null],
      [null,null,null,null,null,null,{sym:'r',order:3},null,null],
      [null,null,null,null,null,null,null,null,null],
      [null,null,{sym:'s',order:4},null,null,null,null,{sym:'c',order:5},null],
      [null,null,null,null,null,null,null,null,{sym:'l',order:6}],
    ]
  },

  // ── intermedio 3 — recorrido largo ──
  // dificultad: 4 | pack: intermedios
  {
    name: 'gran circuito',
    diff: 4,
    pack: 'intermedios',
    grid: [
      [null,{sym:'b',order:1},null,null,null,null,null,null,null],
      [null,null,null,null,{sym:'r',order:2},null,null,null,null],
      [null,null,null,null,null,null,null,null,null],
      [null,null,null,null,null,null,{sym:'c',order:3},null,null],
      [null,{sym:'s',order:4},null,null,null,null,null,null,null],
      [null,null,null,null,{sym:'r',order:5},null,null,null,null],
      [null,null,null,null,null,null,null,null,{sym:'l',order:6}],
    ]
  },

];

// id de desbloqueo requerido para jugar un nivel (o null si es libre)
export function packRequerido(idx) {
  const lvl = LEVELS[idx];
  return lvl && lvl.pack ? `pack_${lvl.pack}` : null;
}

// ── currículo: tiers de dificultad con subdivisiones (conceptos a aprender) ──
// agrupa índices de LEVELS; el selector de niveles lo consume.
export const TIERS = [
  { id: 'principiante', nombre: 'Principiante', color: 0xa5d6a7, conceptos: [
    { nombre: 'Tu primer circuito', aprende: 'conectar batería → resistencia → LED', niveles: [0] },
    { nombre: 'Caminos en diagonal', aprende: 'guiar la corriente en diagonal',       niveles: [1] },
    { nombre: 'Varias resistencias',  aprende: 'varios componentes en serie',          niveles: [2] },
    { nombre: 'El capacitor',         aprende: 'sumar un capacitor al camino',         niveles: [3] },
  ]},
  { id: 'intermedio', nombre: 'Intermedio', color: 0x4fc3f7, conceptos: [
    { nombre: 'El interruptor',    aprende: 'abrir y cerrar el paso con un switch', niveles: [4] },
    { nombre: 'Rutas en zigzag',   aprende: 'recorridos con vueltas',               niveles: [5] },
    { nombre: 'Recorridos largos', aprende: 'planear caminos extensos',             niveles: [6] },
  ]},
  { id: 'avanzado', nombre: 'Avanzado', color: 0xce93d8, conceptos: [
    { nombre: 'Dos interruptores', aprende: 'manejar varios switches',        niveles: [7] },
    { nombre: 'Circuito completo', aprende: 'combinar todos los componentes', niveles: [8, 9] },
    { nombre: 'Tableros grandes',  aprende: 'circuitos en grids amplios',     niveles: [10, 11, 12] },
    { nombre: 'Circuitos paralelos', aprende: 'ramificar la corriente', niveles: [], proximamente: true },
  ]},
];
