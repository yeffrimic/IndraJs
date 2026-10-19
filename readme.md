# IndraJS — Circuito Puzzle

Juego educativo de electrónica para niños de 6 a 8 años. Una serpiente representa la corriente
eléctrica: el jugador la maniobra para conectar los componentes de un circuito en el orden correcto
y encenderlo.

![Phaser](https://img.shields.io/badge/Phaser-3.60-4fc3f7?style=flat-square)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6_modules-f7df1e?style=flat-square)
![Sin build](https://img.shields.io/badge/build-ninguno-4caf50?style=flat-square)
![Licencia](https://img.shields.io/badge/licencia-MIT-ce93d8?style=flat-square)

**Jugar:** https://yeffrimic.github.io/IndraJs/ · **Manual ilustrado:** https://yeffrimic.github.io/IndraJs/manual.html

---

## Qué es

El jugador tiene un cuarto propio. Se acerca al banco de trabajo y entra a un puzzle: un tablero con
componentes electrónicos —batería, resistencia, capacitor, LED, interruptor— y una serpiente que
debe pasar por ellos **en orden** para cerrar el circuito. Cuando la corriente llega al LED, se
enciende.

Las monedas ganadas se gastan en una tienda: tableros más grandes (que traen niveles nuevos),
pistas, energía para jugar más tiempo, y muebles para decorar el cuarto.

### Público objetivo

**Niños de 6 a 8 años que apenas leen o todavía no leen.** Es la restricción de diseño que gobierna
todo lo demás:

> Se tiene que entender **viéndolo**, no leyéndolo.

Si una pantalla necesita que el niño lea para saber qué hacer, esa pantalla está fallando.

---

## Cómo se juega

### En el cuarto

| Control | Acción |
|---|---|
| Flechas | mover al personaje |
| `E` o tocar la burbuja | interactuar con lo que esté cerca |

Sobre el **banco de trabajo** y la **tienda** flota una burbuja chiquita que llama de lejos; al
acercarse crece a un botón (▶ / bolsita) que se puede tocar. En el celular no hay botón `E`: se toca
la burbuja.

### En el puzzle

| Control | Acción |
|---|---|
| Flechas (teclado o pad en pantalla) | mover la serpiente |
| `R` o botón ↻ | reiniciar el nivel |
| Tocar un interruptor | abrirlo o cerrarlo |

La serpiente **entra al tablero por una esquina**: al principio sólo se ve la cabeza y el cuerpo va
saliendo detrás a medida que avanza. La esquina cambia en cada nivel.

El objetivo es que, al terminar, cada componente quede bajo el segmento de cuerpo que le corresponde.
Cuando la serpiente toca la batería, la corriente recorre su cuerpo iluminándolo. Si hay
interruptores, la corriente se detiene en el primero que esté abierto.

### Componentes

| Componente | Color de su hueco |
|---|---|
| Batería | azul |
| Resistencia | lila |
| Capacitor | verde menta |
| LED | rojo |
| Interruptor | amarillo |

En el tablero no hay siglas: cada pieza se reconoce por su dibujo de plastilina y por el platito de
color en el que está apoyada.

Todo nivel tiene **siempre** al menos una batería, una resistencia y un LED. La batería abre la
secuencia y el LED la cierra, sin excepción.

---

## Progresión

**50 niveles** en tres tamaños de tablero. Cada tamaño estrena un componente, y el tablero más
grande es la recompensa que se compra en la tienda.

| Niveles | Tablero | Qué enseña | Acceso |
|---|---|---|---|
| 1–10 | 5×5 | batería → resistencia → LED | libre |
| 11–20 | 6×6 | el **interruptor** | tablero 6×6 (400 monedas) |
| 21–40 | 6×6 | todo combinado | incluido en esa compra |
| 41–50 | 8×8 | el **capacitor** y recorridos largos | tablero 8×8 (700 monedas) |

Todos los circuitos son **en serie**: un solo camino, una sola serpiente. Los circuitos en paralelo
requieren varias serpientes simultáneas y están reservados en la tienda como *próximamente*.

---

## Empezar

El proyecto no tiene dependencias, ni instalación, ni paso de compilación. Sólo hace falta un
servidor estático:

```bash
git clone <repo>
cd IndraJs

npx serve .          # o: python -m http.server
```

Abrir `http://localhost:3000` (o el puerto que informe el servidor).

> **No abrir `index.html` con doble clic.** El navegador bloquea los módulos ES6 desde `file://` y
> el juego no arranca.

---

## Arquitectura

```
index.html               carga Phaser desde CDN y src/main.js
manual.html              libro de instrucciones ilustrado (estilo manual de los 90)
editor.html              editor de niveles          ⚠ ver "Estado de las herramientas"
tester.html              probador de niveles        ⚠ ídem
style-preview.html       mockup de estilo visual

src/
  main.js                configuración de Phaser, define window.isMobile
  levels.js              los 50 niveles + el currículo por conceptos
  tienda.js              catálogo y precios
  SpriteConfig.js        registro central de assets y tipografía
  ClayUI.js              el lenguaje visual de todo el juego: botones, iconos, transiciones, partículas
  Sonido.js              efectos y música sintetizados con WebAudio (sin archivos de audio)
  dev-guard.js           define window.__DEV__ (script clásico, corre primero)
  Dev.js                 API de modo desarrollo para las escenas
  state/
    GameState.js         progreso, monedas, estrellas, tiempos, cupo diario, compras
  scenes/
    BootScene.js         precarga de assets
    LoginScene.js        selección de perfil (y de personaje, la primera vez)
    RoomScene.js         el cuarto: hub con física arcade
    LevelSelectScene.js  mapa de niveles
    PuzzleScene.js       el puzzle completo
    StoreScene.js        la tienda

assets/                  arte de plastilina: fondos, muebles, personajes, componentes, ui
```

**Flujo de datos.** Todo el progreso vive en el singleton `GameState`, que persiste en `localStorage`
bajo la clave `circuito_perfil_<nombre>`. Las escenas no duplican estado: leen y escriben ahí.

**Restricciones del proyecto.** Phaser 3.60 se carga por `<script>` desde CDN y es una **global** —
nunca se importa. Módulos ES6 nativos, sin bundler ni `package.json`. Resolución lógica fija de
800×600 con escalado `FIT`.

---

## Formato de niveles

Los niveles se escriben como se ven, con el helper `G()`:

```js
// serpiente 12 · óptimo 16 · nace no
{ name: 'dos interruptores', diff: 2, optimo: 16, nace: 'no', pack: 'tablero6', grid: G(
  '.  .  .  .  .  .',
  '.  .  .  .  .  .',
  '.  l5 .  .  .  .',
  '.  .  .  b1 .  s2',
  '.  s4 .  .  r3 .',
  '.  .  .  .  .  .',
)},
```

Cada casilla es `.` (vacía) o `<símbolo><orden>`, donde el símbolo es `b`, `r`, `c`, `l` o `s`. El
número indica el orden relativo; `_parseComponents` lo renormaliza poniendo la batería primero y el
LED al final.

| Campo | Significado |
|---|---|
| `optimo` | mínimo de pasos con el que se gana — la meta de 3★ |
| `nace` | esquina de entrada: `ne`, `no`, `se`, `so` (por defecto `ne`) |
| `pack` | tablero que hay que comprar para jugarlo |

### Reglas que no se pueden romper

- **El largo de la serpiente no se fija a mano.** Lo calcula `PuzzleScene` por BFS entre componentes
  consecutivos, más una cabeza y una cola vacías.
- **`optimo` va medido, no estimado.** Se calcula fuera de línea resolviendo el nivel con las reglas
  exactas del juego. Suele coincidir con `distancia_a_la_batería + largo - 2`, y **cuando no
  coincide, el nivel está mal diseñado**: significa que el camino directo deja el cuerpo tapando el
  recorrido posterior y obliga al jugador a dar vueltas sin motivo aparente. Lo primero a probar es
  otra esquina de entrada; suele alcanzar.
- **Con separación mínima de 2 entre componentes, N componentes exigen un largo de al menos
  `2*(N-1)+3`.** Pedir menos es imposible por aritmética, no por diseño.
- Mover un componente o cambiar `nace` invalida el `optimo`: hay que volver a medirlo.

---

## Estrellas, tiempos y economía

### Estrellas

| Estrellas | Condición |
|---|---|
| ★★★ | resuelto en el óptimo |
| ★★ | hasta 25 % por encima del óptimo |
| ★ | completado |

### Monedas

Las monedas dependen **sólo de las estrellas**, no de los movimientos:

| | 1★ | 2★ | 3★ |
|---|---|---|---|
| Monedas por nivel | 25 | 50 | 70 |

Rejugar paga **sólo la mejora**: subir de 2★ a 3★ otorga la diferencia; repetir el mismo resultado no
otorga nada. Así se puede exprimir cada puzzle sin farmeo infinito.

El **puntaje** (`300 − movimientos × 5`) sigue existiendo como récord por nivel, pero no es la
moneda: es una marca personal.

### Precios

Están calculados sobre lo anterior, con tres reglas (documentadas en `src/tienda.js`):

1. **El tablero siguiente se compra con una media de 2★, no con una de 1★.** Los 10 niveles gratis
   dan 500 monedas a 2★ y sólo 250 a 1★; el tablero 6×6 cuesta 400.
2. **Como mucho 1-2 muebles cada 20 niveles.** Con media de 2★, los 50 niveles alcanzan para 5 de
   los 17 muebles.
3. **No se compra medio juego al principio.** Tras pagar el tablero, a 2★ sobran 100 monedas: ni el
   mueble más barato.

También hay un **cupo de 10 niveles nuevos por día** (los replays no lo consumen), ampliable
comprando energía. El contador se reinicia solo al cambiar el día, incluso con el juego abierto.

### Tiempos

Cada nivel mide cuánto tarda el jugador y guarda un resumen por nivel:

```js
tiempos: { 13: { mejor: 31, ultimo: 47, intentos: 3 } }   // segundos
```

Se guarda el resumen y no el historial completo para no inflar el `localStorage`. Es la base para el
análisis de dificultad por nivel.

---

## Guía visual

El juego enseña sin depender de que el niño sepa leer:

- **El próximo componente salta.** La pieza a la que hay que ir ahora rebota y suelta ondas de su
  color. Empieza siempre en la batería y avanza sola cuando la cabeza la pisa. Indica el destino, no
  el camino: rutear la serpiente sigue siendo del jugador.
- **Camino de piedritas.** Bolitas del color del destino marcan la ruta entrada → batería → … → LED.
  Es **gratis en los 5 primeros niveles**; del sexto en adelante lo enciende el botón de pista.
  La ruta es una solución real en el óptimo, calculada simulando la serpiente; si el niño se
  desvía, se recalcula desde donde está, y si ya no hay salida el botón ↻ late.
- **Bandeja de la secuencia.** Debajo del tablero, las piezas en orden; cada una se marca con un
  tilde verde al quedar conectada. Se ve cuando se ve el camino.
- **Estrellas en vivo.** Arriba del tablero hay tres estrellas que se caen si el jugador se pasa del
  óptimo: "más corto es mejor", sin un solo número.
- **Manito guía.** En los 3 primeros niveles, si el niño se queda quieto aparece una mano señalando
  la flecha que conviene tocar.
- **Todo suena.** Paso, choque, pieza encendida (las notas suben con el orden), victoria.
- Los **números de orden** siguen, chiquitos en una esquina, para quien sí sabe leer.

---

## Arte

Todo el arte se registra en `src/SpriteConfig.js`. Las escenas nunca hacen `this.load.image` suelto:
agregar una entrada ahí la precarga sola. Cada asset dibuja su sprite si existe y cae a un dibujo
vectorial si no.

```js
muebles: {
  planta: { key: 'mueble_planta', path: 'assets/muebles/planta.png', escala: 0.2 },
  pelota: { key: 'mueble_pelota', path: 'assets/muebles/pelota.png', escala: 0.14,
            listo: false },   // el arte todavía no existe
},
```

`listo: false` marca lo que aún no está dibujado: no se precarga (evita 404s en consola) y la escena
usa el placeholder. **Esa lista es el checklist de arte pendiente** (hoy: sólo `pelota`).

El tablero del puzzle y la serpiente **no usan sprites**: la tabla de madera, las fichas de masa y el
cuerpo de la serpiente se dibujan en vector con el mismo estilo de plastilina. Sólo la cabeza y los
componentes son PNG.

Los personajes son PNGs sueltos por pose —no un spritesheet— con dos valores medidos sobre el canal
alfa para que la figura no se hunda ni crezca al girar:

```js
nino_izq: { key: 'pj_nino_izq', path: 'assets/personajes/nino_izq.png',
            anclaY: 0.916,      // dónde caen los pies dentro del PNG
            altoFigura: 393 },  // alto real de la figura en px
```

> Reemplazar un PNG de personaje obliga a volver a medir esos dos valores.

---

## Herramientas

### Editor de niveles (`editor.html`)

Grid clickeable para colocar componentes. El orden se asigna según la secuencia de colocación y la
longitud de la serpiente se calcula por BFS. Exporta a `levels.js`.

### Probador (`tester.html`)

Juega un nivel guardado antes de integrarlo.

### Estado de las herramientas

Las dos quedaron **desincronizadas del juego** y hay que ponerlas al día antes de usarlas para
producir contenido:

| Herramienta | Qué le falta |
|---|---|
| `editor.html` | Exporta sin `optimo` ni `nace`, y en formato de array crudo en vez de `G()`. Un nivel creado ahí entra siempre por la esquina `ne` y su meta de 3★ queda estimada, no medida. |
| `tester.html` | Conserva su propia copia de `buildInitialSnake` con la versión antigua (serpiente desplegada sobre el tablero). **Simula un juego distinto al real.** |

Mientras tanto los niveles se generan y verifican con scripts fuera del repo. El verificador
comprueba, para los 50: que se ganen exactamente en su `optimo` y no en menos, que la serpiente nazca
colapsada en una casilla, que haya siempre batería, resistencia y LED, y que los capacitores sólo
aparezcan en el tablero 8×8.

### Modo desarrollo

Los editores y las páginas sueltas **sólo abren en `localhost`** (`127.0.0.1`, `::1`). Publicado, no
existen para el usuario final: los parámetros se ignoran y el juego arranca en el login.

| Atajo | Qué hace |
|---|---|
| `?nivel=N` | entra directo a ese puzzle (perfil `Dev`, todo desbloqueado) |
| `?sel` | selector de niveles |
| `?store` | tienda |
| `?room` | cuarto (sin editor) |
| `?editroom` | editor del cuarto — arrastrar objetos, `[E]` exportar, `[R]` reset |
| `?editstore` | editor de la tienda |

Para probar desde el celular por IP de LAN, habilitarlo una vez en la consola de esa pestaña:

```js
localStorage.circuito_dev = '1'
```

La regla vive en un solo lugar: `src/dev-guard.js` define `window.__DEV__`, y las escenas la
consultan vía `src/Dev.js`.

> Esto **no es seguridad**: el juego corre entero en el cliente y cualquiera con la consola se lo
> saltea. Sirve para que un niño no llegue por accidente. Para el cierre real, no subir
> `editor.html`, `tester.html` ni `style-preview.html` al hosting.

---

## Roadmap

**Hecho**

- [x] 50 niveles con curva de dificultad verificada automáticamente
- [x] Economía atada a las estrellas, con precios calibrados
- [x] Arte de plastilina en fondos, muebles, íconos y personajes
- [x] Guía visual del orden: camino punteado y brillo progresivo
- [x] Registro de tiempos por nivel
- [x] Modo desarrollo aislado del usuario final

- [x] Un solo estilo visual en todo el juego (plastilina), con botones de icono
- [x] Sin siglas en el tablero; sin "mov", "óptimo" ni "pts" en pantalla
- [x] Audio: efectos y música sintetizados, con botón de silencio
- [x] Elegir personaje al crear un perfil
- [x] Transiciones entre pantallas, celebración al ganar, estrellas en vivo
- [x] Onboarding: manito guía en los primeros niveles

**Pendiente**

- [ ] Onboarding completo: una animación que muestre la mecánica antes del nivel 1
- [ ] Voz opcional ("¡muy bien!") para reforzar sin texto
- [ ] Poner al día `editor.html` y `tester.html`
- [ ] Arte pendiente: `pelota`
- [ ] Profundidad en el cuarto: caminar por detrás de los muebles

**Más adelante**

- [ ] Circuitos paralelos (requiere varias serpientes simultáneas)
- [ ] Componentes avanzados: transistores, diodos
- [ ] Backend para guardar progreso y analizar uso

---

## Historial

| Versión | Cambios |
|---|---|
| v0.1 | Cuarto top-down y puzzle de la serpiente, 10 niveles, perfiles y puntaje |
| v0.2 | Tienda: moneda separada, energía, packs, mejoras y muebles |
| v0.3 | Corriente que ilumina el cuerpo, partículas al conectar, pistas bajo demanda |
| v0.4 | Récord por nivel: los replays sólo premian la mejora |
| v0.5 | Arte de plastilina, tipografía redondeada, selector rediseñado, modo desarrollo aislado |
| v0.6 | 50 niveles con progresión por tamaño de tablero. Se corrigieron dos fallas que hacían 44 de 50 niveles irresolubles y volvían inalcanzable la meta de 3★ |
| v0.7 | Economía atada a las estrellas. Guía visual del orden y registro de tiempos |
| v0.8 | Rediseño visual completo: todo el juego en plastilina (el puzzle dejó el tema oscuro), botones de icono, tablero de madera, serpiente continua, mapa de niveles, audio sintetizado, transiciones, celebración, estrellas en vivo, manito guía y elección de personaje |

---

## Stack

- **[Phaser 3.60](https://phaser.io)** — motor HTML5, cargado desde CDN
- **JavaScript ES6** — módulos nativos, sin bundler ni dependencias
- **localStorage** — persistencia sin backend
- **BFS** — cálculo automático de la longitud de la serpiente

---

## Autor

**Yeffri Salazar** — [Creabot](https://creabot.us), Guatemala.

## Licencia

MIT.
