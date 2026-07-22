// levels.js — 50 niveles, todos en SERIE (un solo camino, una sola serpiente).
// Los circuitos en paralelo van a necesitar dos o más serpientes: quedan para después.
//
// Progresión:
//   1-10   5x5  batería + resistencia + LED           libre
//   11-20  6x6  entra el interruptor                  pack_tablero6
//   21-40  6x6  todo combinado                        pack_tablero6
//   41-50  8x8  entra el capacitor, retos largos      pack_expertos
//
// Regla invariable de todo nivel: siempre hay al menos una batería, una
// resistencia y un LED. La batería abre y el LED cierra (_parseComponents
// renormaliza el orden), así que el número del token es solo el orden relativo.

// G() — escribe el tablero como se ve. Token: '.' = vacío, o <sym><orden>.
// sym: b=batería, r=resistencia, c=capacitor, l=LED, s=interruptor.
function G(...filas) {
  return filas.map(fila => fila.trim().split(/\s+/).map(tok => {
    if (tok === '.') return null;
    return { sym: tok[0], order: parseInt(tok.slice(1), 10) };
  }));
}

// El largo de la serpiente NO se fija a mano: PuzzleScene lo calcula por BFS
// entre componentes consecutivos (+1 cabeza +1 cola). El número que anota cada
// comentario es ese largo ya verificado — sirve para leer la curva de dificultad.
//
// `nace` = esquina por la que la serpiente entra al tablero, para que no arranquen
// todos los niveles igual: 'ne' | 'no' | 'se' | 'so' (default 'ne', por eso a veces
// no aparece). Nace entera colapsada en esa casilla y el cuerpo va saliendo a
// medida que avanza — ver _buildInitialSnake.
//
// `optimo` = mínimo de pasos con el que se gana el nivel (la marca de 3 estrellas).
// Va medido resolviendo el nivel, no estimado. En los 50 de acá coincide con
// `distancia_a_la_bateria + largo - 2` — el camino directo — y eso es a propósito:
// la esquina de entrada se elige justamente para que coincida.
//
// Cuando NO coincide, el nivel está mal: quiere decir que el camino directo deja
// el cuerpo tapando el recorrido que viene después, y el jugador tiene que pasear
// sin motivo aparente antes de tocar la batería. Es un puzzle invisible que a los
// 6-8 años no se descubre. Si al agregar un nivel el óptimo medido sale mayor que
// la fórmula, probá otra esquina antes que otra cosa: suele alcanzar.
//
// Si movés un componente o cambiás `nace`, el `optimo` queda mal y hay que volver
// a medirlo. Y ojo con una regla de la que es fácil olvidarse: con separación
// mínima de 2 entre componentes, N componentes exigen un largo de al menos
// 2*(N-1)+3.

export const LEVELS = [

  // ════════════════════════════════════════════════════════════
  //  PRINCIPIANTE — 5x5, batería + resistencias + LED
  // ════════════════════════════════════════════════════════════

  // serpiente 7 · óptimo 11 · nace no
  { name: 'primer circuito', diff: 1, optimo: 11, nace: 'no', grid: G(
    '.  .  .  .  .',
    '.  .  .  .  .',
    '.  .  l3 .  r2',
    '.  .  .  b1 .',
    '.  .  .  .  .',
  )},

  // serpiente 8 · óptimo 9 · nace ne
  { name: 'la vuelta', diff: 1, optimo: 9, grid: G(
    '.  b1 .  .  .',
    '.  .  .  r2 .',
    '.  .  .  .  .',
    '.  .  .  l3 .',
    '.  .  .  .  .',
  )},

  // serpiente 9 · óptimo 10 · nace se
  { name: 'de punta a punta', diff: 1, optimo: 10, nace: 'se', grid: G(
    '.  .  .  .  .',
    '.  .  .  r2 .',
    '.  l3 .  .  .',
    '.  .  b1 .  .',
    '.  .  .  .  .',
  )},

  // serpiente 9 · óptimo 11 · nace so
  { name: 'dos resistencias', diff: 1, optimo: 11, nace: 'so', grid: G(
    '.  .  r2 .  .',
    '.  .  .  r3 .',
    '.  .  b1 .  .',
    '.  .  .  l4 .',
    '.  .  .  .  .',
  )},

  // serpiente 10 · óptimo 13 · nace ne
  { name: 'el rodeo', diff: 1, optimo: 13, grid: G(
    'l3 .  .  .  .',
    '.  r2 .  .  .',
    '.  .  .  .  .',
    '.  .  .  .  .',
    '.  .  .  b1 .',
  )},

  // serpiente 10 · óptimo 9 · nace no
  { name: 'camino largo', diff: 2, optimo: 9, nace: 'no', grid: G(
    '.  b1 .  .  r2',
    '.  .  .  .  .',
    '.  .  .  .  r3',
    '.  .  .  l4 .',
    '.  .  .  .  .',
  )},

  // serpiente 11 · óptimo 14 · nace ne
  { name: 'zigzag', diff: 2, optimo: 14, grid: G(
    '.  .  .  .  .',
    '.  .  .  .  .',
    '.  .  .  .  .',
    '.  .  b1 .  l4',
    'r2 .  .  r3 .',
  )},

  // serpiente 11 · óptimo 12 · nace so
  { name: 'la ese', diff: 2, optimo: 12, nace: 'so', grid: G(
    '.  .  .  .  .',
    '.  .  l4 .  .',
    '.  .  .  r3 .',
    '.  .  b1 .  .',
    '.  .  .  .  r2',
  )},

  // serpiente 11 · óptimo 14 · nace se
  { name: 'tres resistencias', diff: 2, optimo: 14, nace: 'se', grid: G(
    '.  r3 .  r4 .',
    'r2 .  l5 .  .',
    '.  b1 .  .  .',
    '.  .  .  .  .',
    '.  .  .  .  .',
  )},

  // serpiente 11 · óptimo 14 · nace no
  { name: 'campeon del 5x5', diff: 2, optimo: 14, nace: 'no', grid: G(
    '.  .  .  .  .',
    '.  .  r4 .  r3',
    '.  l5 .  r2 .',
    '.  .  b1 .  .',
    '.  .  .  .  .',
  )},

  // ════════════════════════════════════════════════════════════
  //  TABLERO 6x6 — se compra en la tienda (pack_tablero6)
  //  primero el interruptor solo
  // ════════════════════════════════════════════════════════════

  // serpiente 9 · óptimo 10 · nace se
  { name: 'un interruptor', diff: 2, optimo: 10, nace: 'se', pack: 'tablero6', grid: G(
    '.  .  .  .  .  .',
    '.  .  l4 .  r3 .',
    '.  .  .  s2 .  .',
    '.  .  .  .  b1 .',
    '.  .  .  .  .  .',
    '.  .  .  .  .  .',
  )},

  // serpiente 10 · óptimo 12 · nace ne
  { name: 'apagar y prender', diff: 2, optimo: 12, pack: 'tablero6', grid: G(
    '.  .  .  .  .  .',
    '.  .  .  .  .  .',
    '.  .  s2 .  .  .',
    '.  .  .  .  b1 .',
    '.  .  r3 .  .  .',
    '.  .  .  l4 .  .',
  )},

  // serpiente 11 · óptimo 17 · nace so
  { name: 'switch al final', diff: 2, optimo: 17, nace: 'so', pack: 'tablero6', grid: G(
    '.  .  .  .  .  .',
    '.  .  .  .  b1 .',
    's3 .  .  r2 .  .',
    '.  .  .  .  .  .',
    '.  l4 .  .  .  .',
    '.  .  .  .  .  .',
  )},

  // serpiente 12 · óptimo 16 · nace no
  { name: 'dos interruptores', diff: 2, optimo: 16, nace: 'no', pack: 'tablero6', grid: G(
    '.  .  .  .  .  .',
    '.  .  .  .  .  .',
    '.  l5 .  .  .  .',
    '.  .  .  b1 .  s2',
    '.  s4 .  .  r3 .',
    '.  .  .  .  .  .',
  )},

  // serpiente 12 · óptimo 18 · nace se
  { name: 'el desvio', diff: 2, optimo: 18, nace: 'se', pack: 'tablero6', grid: G(
    '.  .  s2 .  .  .',
    '.  b1 .  .  .  .',
    '.  .  r3 .  s4 .',
    '.  .  .  .  .  .',
    '.  .  .  .  .  .',
    '.  .  .  .  l5 .',
  )},

  // serpiente 13 · óptimo 16 · nace so
  { name: 'ida y vuelta', diff: 3, optimo: 16, nace: 'so', pack: 'tablero6', grid: G(
    '.  .  r3 .  l5 .',
    '.  .  .  s4 .  .',
    's2 .  b1 .  .  .',
    '.  .  .  .  .  .',
    '.  .  .  .  .  .',
    '.  .  .  .  .  .',
  )},

  // serpiente 14 · óptimo 17 · nace no
  { name: 'tres interruptores', diff: 3, optimo: 17, nace: 'no', pack: 'tablero6', grid: G(
    '.  .  s4 .  s5 .',
    '.  .  .  .  .  .',
    '.  .  .  .  l6 .',
    '.  .  r3 .  .  .',
    '.  b1 .  .  .  .',
    '.  .  s2 .  .  .',
  )},

  // serpiente 14 · óptimo 13 · nace se
  { name: 'entre switches', diff: 3, optimo: 13, nace: 'se', pack: 'tablero6', grid: G(
    '.  .  .  .  .  .',
    '.  .  .  .  .  r4',
    '.  .  l6 .  s5 .',
    '.  .  .  r2 .  s3',
    '.  .  .  .  .  .',
    '.  .  .  .  b1 .',
  )},

  // serpiente 15 · óptimo 16 · nace ne
  { name: 'el laberinto', diff: 3, optimo: 16, pack: 'tablero6', grid: G(
    'r5 .  .  .  .  .',
    '.  s4 .  .  .  .',
    'l6 .  .  s2 .  .',
    '.  r3 .  .  .  b1',
    '.  .  .  .  .  .',
    '.  .  .  .  .  .',
  )},

  // serpiente 15 · óptimo 14 · nace so
  { name: 'maestro del 6x6', diff: 3, optimo: 14, nace: 'so', pack: 'tablero6', grid: G(
    '.  .  .  .  .  .',
    '.  .  .  l7 .  .',
    '.  .  s6 .  r5 .',
    '.  .  .  r3 .  .',
    'b1 .  s2 .  s4 .',
    '.  .  .  .  .  .',
  )},

  // ── combinando todo en el 6x6 ──

  // serpiente 11 · óptimo 9 · nace ne
  { name: 'taller abierto', diff: 3, optimo: 9, pack: 'tablero6', grid: G(
    '.  .  .  .  .  b1',
    '.  .  .  .  .  .',
    '.  .  .  l4 .  .',
    '.  .  .  .  .  r2',
    '.  .  .  r3 .  .',
    '.  .  .  .  .  .',
  )},

  // serpiente 11 · óptimo 14 · nace no
  { name: 'llave y resistencia', diff: 3, optimo: 14, nace: 'no', pack: 'tablero6', grid: G(
    '.  .  .  .  .  .',
    '.  .  .  .  s2 .',
    '.  .  .  .  .  .',
    '.  .  b1 .  r3 .',
    '.  .  .  l4 .  .',
    '.  .  .  .  .  .',
  )},

  // serpiente 12 · óptimo 15 · nace se
  { name: 'mezcla simple', diff: 3, optimo: 15, nace: 'se', pack: 'tablero6', grid: G(
    '.  .  .  r2 .  .',
    '.  .  .  .  .  .',
    '.  .  .  b1 s3 .',
    '.  .  .  .  .  l5',
    '.  .  .  .  r4 .',
    '.  .  .  .  .  .',
  )},

  // serpiente 12 · óptimo 15 · nace so
  { name: 'primero el switch', diff: 3, optimo: 15, nace: 'so', pack: 'tablero6', grid: G(
    '.  r4 .  l5 .  .',
    'r3 .  .  .  .  .',
    '.  .  b1 .  .  .',
    's2 .  .  .  .  .',
    '.  .  .  .  .  .',
    '.  .  .  .  .  .',
  )},

  // serpiente 13 · óptimo 19 · nace se
  { name: 'switch al cierre', diff: 3, optimo: 19, nace: 'se', pack: 'tablero6', grid: G(
    'r2 .  .  .  r3 .',
    '.  b1 .  .  .  .',
    '.  .  .  .  s4 .',
    '.  .  .  .  .  l5',
    '.  .  .  .  .  .',
    '.  .  .  .  .  .',
  )},

  // serpiente 13 · óptimo 14 · nace so
  { name: 'alternado', diff: 3, optimo: 14, nace: 'so', pack: 'tablero6', grid: G(
    '.  .  .  .  .  .',
    '.  .  .  .  .  .',
    's2 .  r3 .  .  .',
    '.  b1 .  s4 .  .',
    '.  .  l6 .  .  .',
    '.  .  .  r5 .  .',
  )},

  // serpiente 14 · óptimo 17 · nace ne
  { name: 'contra reloj', diff: 3, optimo: 17, pack: 'tablero6', grid: G(
    '.  .  .  .  .  .',
    '.  .  .  .  .  .',
    '.  .  b1 .  .  .',
    '.  .  .  .  .  .',
    '.  .  r2 .  .  l6',
    's3 .  r4 .  s5 .',
  )},

  // serpiente 14 · óptimo 19 · nace no
  { name: 'dos y dos', diff: 3, optimo: 19, nace: 'no', pack: 'tablero6', grid: G(
    '.  .  .  .  .  .',
    '.  r3 .  .  .  .',
    's4 .  r2 .  .  b1',
    '.  s5 .  .  .  .',
    '.  .  l6 .  .  .',
    '.  .  .  .  .  .',
  )},

  // serpiente 14 · óptimo 17 · nace ne
  { name: 'llaves primero', diff: 3, optimo: 17, pack: 'tablero6', grid: G(
    '.  .  .  .  .  .',
    '.  .  .  .  .  .',
    '.  .  b1 .  .  .',
    'l6 .  s3 .  s2 .',
    '.  r4 .  .  .  .',
    'r5 .  .  .  .  .',
  )},

  // serpiente 16 · óptimo 18 · nace no
  { name: 'el peine', diff: 3, optimo: 18, nace: 'no', pack: 'tablero6', grid: G(
    '.  .  .  .  .  .',
    '.  .  .  b1 .  r2',
    '.  .  .  .  .  .',
    'l7 .  r6 .  s5 s3',
    '.  .  .  .  .  .',
    '.  .  .  .  r4 .',
  )},

  // serpiente 15 · óptimo 20 · nace se
  { name: 'rodeo con llaves', diff: 4, optimo: 20, nace: 'se', pack: 'tablero6', grid: G(
    '.  .  .  .  .  .',
    '.  .  b1 .  .  .',
    '.  .  .  .  .  .',
    '.  .  .  .  s2 .',
    '.  .  .  r3 .  r4',
    '.  .  l6 .  s5 .',
  )},

  // serpiente 16 · óptimo 20 · nace so
  { name: 'la trenza', diff: 4, optimo: 20, nace: 'so', pack: 'tablero6', grid: G(
    '.  b1 .  .  .  .',
    '.  .  r2 .  .  .',
    '.  .  .  .  .  .',
    '.  .  s3 l7 .  .',
    '.  .  .  .  s6 .',
    '.  .  .  s4 .  r5',
  )},

  // serpiente 16 · óptimo 16 · nace ne
  { name: 'paso a paso', diff: 4, optimo: 16, pack: 'tablero6', grid: G(
    '.  .  .  b1 .  .',
    '.  s2 .  .  .  .',
    'r3 .  .  .  .  .',
    '.  s6 .  .  .  .',
    's4 .  l7 .  .  .',
    '.  r5 .  .  .  .',
  )},

  // serpiente 16 · óptimo 17 · nace no
  { name: 'circuito cargado', diff: 4, optimo: 17, nace: 'no', pack: 'tablero6', grid: G(
    '.  .  .  .  .  .',
    '.  .  .  .  .  s6',
    '.  .  .  .  r5 .',
    'b1 .  s4 .  .  l7',
    '.  r3 .  .  .  .',
    'r2 .  .  .  .  .',
  )},

  // serpiente 17 · óptimo 24 · nace se
  { name: 'el nudo', diff: 4, optimo: 24, nace: 'se', pack: 'tablero6', grid: G(
    '.  .  .  .  .  .',
    'b1 .  .  .  .  .',
    '.  s2 .  .  .  .',
    '.  .  s3 .  l7 .',
    '.  .  .  .  .  s6',
    '.  r4 .  .  r5 .',
  )},

  // serpiente 17 · óptimo 19 · nace so
  { name: 'tablero lleno', diff: 4, optimo: 19, nace: 'so', pack: 'tablero6', grid: G(
    '.  .  .  r4 .  .',
    '.  .  .  .  r5 .',
    '.  .  s3 l7 .  s6',
    '.  .  .  .  .  .',
    '.  .  .  r2 .  .',
    '.  .  .  .  b1 .',
  )},

  // serpiente 17 · óptimo 23 · nace se
  { name: 'la escalera', diff: 4, optimo: 23, nace: 'se', pack: 'tablero6', grid: G(
    's2 .  r3 .  .  .',
    '.  .  .  r6 .  .',
    'b1 .  .  .  l7 .',
    '.  s4 .  s5 .  .',
    '.  .  .  .  .  .',
    '.  .  .  .  .  .',
  )},

  // serpiente 17 · óptimo 18 · nace ne
  { name: 'gran recorrido', diff: 4, optimo: 18, pack: 'tablero6', grid: G(
    'l7 .  .  r4 .  .',
    '.  .  s5 .  s3 .',
    '.  r6 .  r2 .  .',
    '.  .  .  .  .  b1',
    '.  .  .  .  .  .',
    '.  .  .  .  .  .',
  )},

  // serpiente 17 · óptimo 20 · nace ne
  { name: 'casi experto', diff: 4, optimo: 20, pack: 'tablero6', grid: G(
    '.  .  s5 .  .  .',
    '.  r4 .  l7 .  .',
    '.  .  r6 .  .  .',
    '.  r3 .  b1 .  .',
    '.  .  .  .  .  .',
    '.  .  .  s2 .  .',
  )},

  // serpiente 17 · óptimo 19 · nace no
  { name: 'maestro del circuito', diff: 4, optimo: 19, nace: 'no', pack: 'tablero6', grid: G(
    '.  .  .  .  .  .',
    '.  s4 .  b1 .  .',
    '.  .  s2 .  .  .',
    '.  r3 .  .  .  .',
    'r5 .  l7 .  .  .',
    '.  s6 .  .  .  .',
  )},

  // ════════════════════════════════════════════════════════════
  //  EXPERTOS — 8x8 con capacitores (pack_expertos)
  // ════════════════════════════════════════════════════════════

  // serpiente 14 · óptimo 21 · nace so
  { name: 'el capacitor', diff: 5, optimo: 21, nace: 'so', pack: 'expertos', grid: G(
    '.  .  .  .  .  .  .  .',
    '.  .  .  .  .  .  .  .',
    '.  c2 .  .  .  .  .  .',
    '.  .  .  r3 .  b1 .  .',
    '.  .  .  .  .  .  .  .',
    '.  .  l4 .  .  .  .  .',
    '.  .  .  .  .  .  .  .',
    '.  .  .  .  .  .  .  .',
  )},

  // serpiente 15 · óptimo 17 · nace no
  { name: 'cargar y encender', diff: 5, optimo: 17, nace: 'no', pack: 'expertos', grid: G(
    '.  .  .  .  .  .  .  .',
    '.  .  .  .  .  .  .  .',
    '.  .  .  .  .  .  .  .',
    '.  r2 .  .  .  .  .  .',
    'b1 .  .  .  .  .  .  .',
    '.  .  .  .  .  .  .  c3',
    '.  .  .  .  .  .  l4 .',
    '.  .  .  .  .  .  .  .',
  )},

  // serpiente 16 · óptimo 26 · nace se
  { name: 'capacitor y llave', diff: 5, optimo: 26, nace: 'se', pack: 'expertos', grid: G(
    '.  .  .  .  .  .  .  .',
    '.  b1 .  .  .  .  .  .',
    '.  .  s4 .  .  l5 .  .',
    '.  .  .  .  .  .  .  .',
    '.  .  r3 .  .  .  .  .',
    '.  .  .  .  .  .  .  .',
    '.  .  c2 .  .  .  .  .',
    '.  .  .  .  .  .  .  .',
  )},

  // serpiente 17 · óptimo 21 · nace so
  { name: 'orden invertido', diff: 5, optimo: 21, nace: 'so', pack: 'expertos', grid: G(
    '.  .  .  r2 .  .  .  .',
    '.  .  .  .  .  .  .  .',
    '.  b1 .  .  .  .  .  .',
    '.  c3 .  .  .  .  .  .',
    '.  .  .  .  .  .  .  .',
    '.  .  l5 .  .  .  .  .',
    '.  s4 .  .  .  .  .  .',
    '.  .  .  .  .  .  .  .',
  )},

  // serpiente 18 · óptimo 20 · nace no
  { name: 'dos capacitores', diff: 5, optimo: 20, nace: 'no', pack: 'expertos', grid: G(
    '.  .  c2 .  .  .  .  .',
    '.  .  .  .  s3 .  .  .',
    '.  .  b1 .  .  .  .  .',
    '.  .  .  r4 .  .  l6 .',
    '.  .  .  .  .  .  .  c5',
    '.  .  .  .  .  .  .  .',
    '.  .  .  .  .  .  .  .',
    '.  .  .  .  .  .  .  .',
  )},

  // serpiente 19 · óptimo 27 · nace ne
  { name: 'la fabrica', diff: 6, optimo: 27, pack: 'expertos', grid: G(
    '.  .  .  .  .  .  .  .',
    '.  .  .  .  .  .  .  .',
    '.  .  .  .  .  .  .  .',
    'b1 .  .  .  c3 .  s4 .',
    '.  .  .  .  .  l6 .  r5',
    '.  .  .  .  .  .  .  .',
    'r2 .  .  .  .  .  .  .',
    '.  .  .  .  .  .  .  .',
  )},

  // serpiente 19 · óptimo 23 · nace se
  { name: 'doble carga', diff: 6, optimo: 23, nace: 'se', pack: 'expertos', grid: G(
    '.  .  .  s4 .  .  .  .',
    'c5 l7 .  .  r3 .  .  .',
    '.  .  .  .  .  .  .  .',
    's6 .  .  c2 .  .  .  .',
    '.  .  .  .  b1 .  .  .',
    '.  .  .  .  .  .  .  .',
    '.  .  .  .  .  .  .  .',
    '.  .  .  .  .  .  .  .',
  )},

  // serpiente 20 · óptimo 22 · nace so
  { name: 'ingeniero', diff: 6, optimo: 22, nace: 'so', pack: 'expertos', grid: G(
    '.  .  .  .  .  .  .  .',
    '.  .  .  .  .  .  .  .',
    '.  .  .  .  .  .  .  .',
    '.  .  .  .  .  .  c5 .',
    'l7 .  r6 .  .  .  .  .',
    '.  .  .  .  .  .  r4 .',
    '.  .  .  .  c3 .  .  .',
    '.  .  .  .  b1 .  s2 .',
  )},

  // serpiente 22 · óptimo 31 · nace ne
  { name: 'gran tablero', diff: 6, optimo: 31, pack: 'expertos', grid: G(
    '.  .  .  l8 .  s7 .  c6',
    '.  .  .  c2 .  s4 .  .',
    '.  .  .  .  r3 .  r5 .',
    '.  .  .  .  .  .  .  .',
    '.  .  .  .  .  .  .  .',
    '.  .  .  .  .  .  .  .',
    '.  .  b1 .  .  .  .  .',
    '.  .  .  .  .  .  .  .',
  )},

  // serpiente 23 · óptimo 31 · nace no
  { name: 'circuito maestro', diff: 6, optimo: 31, nace: 'no', pack: 'expertos', grid: G(
    'r6 .  c5 .  s4 .  .  .',
    '.  s7 .  .  .  .  .  .',
    '.  .  l8 .  .  .  c3 .',
    '.  .  .  .  .  .  .  .',
    '.  .  .  .  .  .  .  .',
    '.  .  .  .  .  .  .  .',
    '.  .  .  .  .  .  r2 .',
    '.  .  .  b1 .  .  .  .',
  )},

];

// id de desbloqueo requerido para jugar un nivel (o null si es libre)
export function packRequerido(idx) {
  const lvl = LEVELS[idx];
  return lvl && lvl.pack ? `pack_${lvl.pack}` : null;
}

// ── currículo: tiers de dificultad con subdivisiones (conceptos a aprender) ──
// agrupa índices de LEVELS; el selector de niveles lo consume.
export const TIERS = [
  { id: 'principiante', nombre: 'Principiante · 5x5', color: 0xa5d6a7, conceptos: [
    { nombre: 'Tu primer circuito', aprende: 'conectar batería → resistencia → LED', niveles: [0, 1, 2] },
    { nombre: 'Dos resistencias',   aprende: 'varios componentes en serie',          niveles: [3, 4] },
    { nombre: 'Caminos con vueltas',aprende: 'trazar rutas largas sin cruzarse',     niveles: [5, 6, 7] },
    { nombre: 'Dominar el 5x5',     aprende: 'tres resistencias seguidas',           niveles: [8, 9] },
  ]},
  { id: 'tablero6', nombre: 'Tablero 6x6', color: 0x4fc3f7, conceptos: [
    { nombre: 'El interruptor',    aprende: 'abrir y cerrar el paso de la corriente', niveles: [10, 11, 12] },
    { nombre: 'Dos interruptores', aprende: 'manejar varias llaves en el camino',     niveles: [13, 14, 15] },
    { nombre: 'Tres interruptores',aprende: 'planear con muchas llaves',              niveles: [16, 17, 18, 19] },
    { nombre: 'Todo combinado',    aprende: 'mezclar resistencias e interruptores',   niveles: [20, 21, 22, 23, 24, 25, 26] },
    { nombre: 'Circuitos largos',  aprende: 'recorridos de tablero completo',         niveles: [27, 28, 29, 30, 31, 32, 33] },
    { nombre: 'Retos del 6x6',     aprende: 'exprimir el camino más corto',           niveles: [34, 35, 36, 37, 38, 39] },
  ]},
  { id: 'expertos', nombre: 'Expertos · 8x8', color: 0xce93d8, conceptos: [
    { nombre: 'El capacitor',         aprende: 'sumar un capacitor al circuito',   niveles: [40, 41, 42] },
    { nombre: 'Capacitores y llaves', aprende: 'combinar capacitor e interruptor', niveles: [43, 44, 45] },
    { nombre: 'Retos expertos',       aprende: 'circuitos largos en tablero 8x8',  niveles: [46, 47, 48, 49] },
    { nombre: 'Circuitos paralelos',  aprende: 'ramificar la corriente',           niveles: [], proximamente: true },
  ]},
];
