# IndraJS — contexto del proyecto

> **Para qué es este archivo:** retomar el proyecto sin releer todo el código. Prioriza lo que
> **no se deduce** leyendo los archivos: por qué las cosas son como son, y las trampas que ya
> costaron trabajo una vez.
>
> Última revisión: 19 oct 2026 (v0.8, rediseño visual).

---

## 1. Qué es y para quién

Juego educativo de electrónica. Una serpiente representa la corriente: el jugador la maniobra para
que su cuerpo cubra los componentes de un circuito **en orden** (batería → … → LED) y lo encienda.
Hay un cuarto que funciona de hub, una tienda, y 50 niveles.

**El público son niños de 6 a 8 años que apenas leen o no leen.** Esto no es un detalle de
marketing: es la restricción que gobierna cada decisión de interfaz.

> Se tiene que entender **viéndolo**, no leyéndolo.

Cuando haya que elegir entre una solución elegante y una que se entienda sin texto, gana la segunda.

---

## 2. Restricciones duras

No romper ninguna de estas:

- **Phaser 3.60 es una global.** Se carga por `<script>` desde CDN en `jugar.html` (el juego; `index.html` es la portada). **Nunca**
  `import Phaser`.
- **Sin bundler, sin npm, sin `package.json`, sin paso de compilación.** Cada archivo se sirve tal
  cual al navegador. Módulos ES6 nativos.
- **Sólo `localStorage`**, sin backend. Toda escritura pasa por `GameState`.
- **Alto lógico fijo de 600; el ancho acompaña la pantalla** (de 4:3 a 2,2:1, calculado en `main.js`),
  `Scale.FIT` + `CENTER_BOTH`. Mobile first: se juega sobre todo en teléfonos y tabletas apaisados.
  El cuarto y la tienda están calibrados sobre su dibujo de 800×600 y se centran con
  `centrarEscenario()` (ClayUI); el puzzle tiene un layout "ancho" de tres columnas. Nunca asumir
  `width === 800`. Todo lo tocable pasa por `toque()` (30 % más grande en táctil).
- **Probar siempre con servidor local.** `file://` bloquea los módulos.
- Nombres y comentarios **en español**, métodos privados con prefijo `_`.

---

## 3. Mapa de archivos

| Archivo | De qué es dueño |
|---|---|
| `index.html` | **portada** (landing): botones a Jugar y Manual, por qué electricidad + rompecabezas, créditos |
| `jugar.html` | el juego (carga Phaser y `src/main.js`); los atajos de dev (`?nivel=N`…) van acá |
| `manual.html` | libro de instrucciones ilustrado, con giro de página |
| `src/main.js` | config de Phaser, `window.isMobile`, espera a que cargue la fuente |
| `src/levels.js` | los 50 niveles, el helper `G()`, `packRequerido()` y `TIERS` (currículo) |
| `src/tienda.js` | catálogo y precios; el comentario de cabecera explica cómo se calcularon |
| `src/SpriteConfig.js` | **registro central de assets** + la constante `FUENTE` |
| `src/ClayUI.js` | **el lenguaje visual de todo el juego**: paleta, `losa`, `boton`, iconos vectoriales, `irA`/`entrarEscena`, confeti, estrellas, `cartel` |
| `src/Tutorial.js` | pasos del recorrido guiado de la primera vez, regalos de bienvenida, manito y piedritas |
| `src/Sonido.js` | efectos y música sintetizados con WebAudio; preferencia de silencio por dispositivo |
| `src/dev-guard.js` | define `window.__DEV__` según hostname (script clásico, corre primero) |
| `src/Dev.js` | `activo()` / `flag()` / `param()` para las escenas |
| `src/state/GameState.js` | **todo el estado persistente**: progreso, monedas, estrellas, tiempos, cupo diario, compras |
| `scenes/BootScene.js` | precarga lo que liste `SpriteConfig.listarParaCargar()` |
| `scenes/LoginScene.js` | 6 perfiles fijos (array `PERFILES`), no hay alta de usuarios; elige personaje la primera vez |
| `scenes/RoomScene.js` | el cuarto: física arcade, muebles, proximidad al workbench |
| `scenes/LevelSelectScene.js` | mapa de niveles en zigzag, con scroll |
| `scenes/PuzzleScene.js` | el puzzle entero — el archivo más grande y el más delicado |
| `scenes/StoreScene.js` | la tienda |

---

## 4. Invariantes y trampas

**Esta es la sección importante.** Cada punto ya causó un error real.

### Phaser reutiliza las instancias de escena

Entre `scene.start()`, Phaser **no crea una escena nueva**: reutiliza la misma instancia. Cualquier
`this.*` sobrevive al cambio de escena.

Causó el bug del personaje gigante al volver al cuarto: una bandera `this._poseAplicada` quedaba en
`true` y la escala nunca se reaplicaba. Si algo se comporta raro al volver a una escena, sospechar
de esto primero.

### `optimo` va medido, no calculado

Cada nivel guarda en `levels.js` el mínimo de pasos con el que se gana. **Se calcula fuera de línea
resolviendo el nivel**, no con una fórmula.

Suele coincidir con `distancia_a_la_batería + largo - 2`. **Cuando no coincide, el nivel está mal
diseñado**: significa que ir derecho a la batería deja el cuerpo tapando el recorrido posterior, y
el jugador tiene que dar vueltas sin motivo aparente antes de empezar. Es un puzzle invisible que a
los 6 años no se descubre.

Si al agregar un nivel el óptimo medido sale mayor que la fórmula, **probar otra esquina de
entrada**: en los 50 actuales eso bastó para llevar los 13 casos problemáticos a desvío cero.

### Aritmética de los niveles

- **N componentes con separación mínima 2 exigen un largo de al menos `2*(N-1)+3`.** Pedir menos es
  imposible por aritmética. Nueve componentes no entran en un largo de 17.
- El largo de la serpiente **no se fija a mano**: sale del BFS entre componentes consecutivos, más
  cabeza y cola vacías.
- Todo nivel tiene **siempre** batería, resistencia y LED. La batería abre y el LED cierra;
  `_parseComponents` renormaliza el orden, así que el número del token es sólo relativo.

### La serpiente nace colapsada en una casilla

Toda la serpiente arranca en una sola celda de una esquina y el cuerpo va saliendo a medida que
avanza. Cualquier código que asuma que nace desplegada está mal — **es exactamente lo que le pasa a
`tester.html` hoy**.

Historia, porque explica por qué es así: antes nacía plegada sobre el tablero y eso causaba tres
males a la vez. Se tapaba su propio camino (44 de 50 niveles quedaban sin solución), obligaba a un
rodeo que rompía el cálculo del óptimo (hasta 14 pasos de diferencia), y limitaba el largo a un
tercio del tablero. Naciendo colapsada, el camino mínimo vuelve a ser el camino.

### Monedas ≠ puntos

Dos números distintos, y es fácil confundirlos:

- **Monedas** — dependen **sólo de las estrellas** (25 / 50 / 70). Es lo que se gasta.
- **Puntos** — `300 − movimientos × 5`. Récord interno, no se gasta.

Rejugar paga sólo la mejora. Antes las monedas eran iguales a los puntos, y con esa fórmula jugar
mal rendía el 84 % de jugar perfecto: las estrellas no servían para nada.

### `listo: false` es el checklist de arte

En `SpriteConfig`, marca lo que todavía no está dibujado: no se precarga (evita 404s) y la escena
cae al placeholder. **No es una bandera muerta** — es la lista de lo que falta pedirle al
ilustrador. Hoy queda una: `pelota`. (`tile_head` y `tile_body` dejaron de hacer falta en v0.8: el
tablero y el cuerpo de la serpiente se dibujan en vector. La categoría `grid` y `fondos/puzzle.png`
ya no se cargan.)

### El camino sugerido es una solución, no un dibujo

Hasta v0.8 la ruta de piedritas se armaba con tramos en L entre componentes, sin simular el cuerpo:
en los 50 niveles llevaba a chocar con la serpiente o no conectaba. Ahora la calcula
PuzzleScene._resolver (IDA* con la misma regla de choque que _mover) usando _cotaRestante, una cota
exacta: cada componente k termina en el índice de cuerpo P[k], así que con la cadena tendida hasta k
faltan P[k] - t pasos. Encuentra la ruta en el óptimo en los 50 niveles en menos de 5 ms. Si el chico
se desvía, se recalcula desde ahí (presupuesto de nodos acotado); si no hay salida, late el ↻ y la
manito lo señala. Cambiar las reglas de movimiento obliga a cambiar el solver igual.

### El recorrido guiado es una máquina de pasos por perfil

`GameState.tutorial` vale `inicio → puzzle → tienda → casa → listo` y se guarda con el perfil.
Cada escena mira el paso al crearse y oculta o guía lo que corresponde (cuarto: fantasma + manito,
tienda y mapa ocultos; nivel 1: demostración automática; tienda: sólo 3 regalos). **Los perfiles que
ya tenían niveles hechos cargan como `listo`** (retro-compatibilidad), y los atajos de dev también lo
fuerzan; para probarlo desde cero está `?nuevo` (perfil "Prueba" vacío). El regalo no cobra monedas:
`GameState.regalarMueble` sólo funciona en el paso `tienda`, así la economía calibrada no cambia.

### Mobile first: el teléfono apaisado es el caso principal

Un teléfono muestra el juego al ~65 % (el alto manda: 390 px reales para 600 lógicos). Por eso:
el ancho lógico crece con la pantalla en vez de dejar bandas negras; el puzzle en modo ancho libera
el alto para el tablero (fichas de hasta 100); `toque()` agranda lo tocable; los textos para adultos
de menos de ~13 px se ocultan en táctil. Además: arrastrar el dedo por el tablero mueve la serpiente
(`_activarArrastre`), tocar el piso del cuarto hace caminar al personaje, el primer toque pide
pantalla completa y traba en horizontal (no existe en iPhone Safari: ahí es "Agregar a inicio", con
`manifest.webmanifest`), `viewport-fit=cover` + `env(safe-area-inset-*)` para el notch, aviso de
girar en cualquier táctil vertical, y un cargador HTML que se ve antes de que baje Phaser.
**Probar en teléfono emulado** (Edge/Chrome DevTools, 844×390 y 667×375, con touch) antes de dar
algo por terminado. Limitación conocida: Phaser 3.60 no tiene `resolution`, así que en pantallas 3x
el lienzo se ve algo suave.

### Las afirmaciones de la portada tienen que poder sostenerse

La portada habla de rompecabezas y desarrollo. Se escribió con lo que la investigación respalda
(rompecabezas en la primera infancia → habilidades espaciales → desempeño en matemática y ciencias;
fuentes citadas al pie de la sección) y dice explícitamente que el juego **no** promete más
inteligencia. Si se agrega material de difusión, mantener ese criterio: el público son padres y
maestros.

### Toda salida de escena pasa por `irA()`

`irA(scene, key, data)` hace el fundido y recién después `scene.start`. Usa la bandera
`scene._saliendo` para no salir dos veces por doble toque, y **`entrarEscena(scene)` la resetea**:
tiene que ser lo primero de cada `create()`, por lo de la instancia reutilizada. Una escena nueva que
se olvide de llamarla queda trabada después de la primera salida.

### Los layouts guardados pisan los nuevos defaults

`store_layout` y `room_layout` (localStorage, del editor) ganan sobre `_layoutDefaults*()`. En v0.8
el saldo, las pestañas y el botón de volver de la tienda cambiaron de tamaño: si en una máquina
quedan corridos, es un layout viejo guardado → `[R]` dentro de `?editstore`.

### Login sin herencia de perfil

`GameState._cargarPerfil()` resetea todos los campos antes de leer. Antes, cerrar sesión y entrar
con un perfil **nuevo** heredaba en memoria el progreso del anterior y lo guardaba como propio.

### Excepciones de assets

- **`repisa` es 677×369**, no 500×500 como el resto de los muebles. De ahí su escala `0.19`, que
  parece un error y no lo es.
- **Los personajes necesitan `anclaY` y `altoFigura`**, medidos sobre el canal alfa. Los 8 PNGs
  traen distinto aire transparente abajo (42 a 63 px) y distinto alto de figura (368 a 393). Sin
  esos valores el chico se hunde o crece al girar. **Reemplazar un PNG obliga a remedirlos.**
- Los íconos de UI se dibujan con `setDisplaySize()` en cada punto de uso, así que su `escala` del
  config **no se usa**.

### El cuarto

`localStorage.room_layout` **pisa las posiciones por defecto**. Para ver los defaults hay que
resetear con `[R]` dentro de `?editroom`. Si algo "no cambia" tras editar `_layoutDefaults()`, es
esto.

El personaje se dibuja **siempre encima de todos los muebles**: no hay ordenamiento por profundidad.

---

## 5. Decisiones tomadas y por qué

Para no volver a discutirlas:

| Decisión | Razón |
|---|---|
| La tienda vende **tableros**, no "packs de niveles" | Un tablero que crece es una recompensa que un niño entiende mirando; "pack intermedios" no le dice nada |
| Monedas atadas a estrellas | Permite exigir una media de 2★ para avanzar; con la fórmula por movimientos era imposible calibrarlo |
| El camino punteado es gratis en los niveles 1-5 | Ahí el niño todavía no sabe que existe un orden. Después se paga con una pista |
| Se conservan números y siglas | Sirven a quien ya lee y no estorban a quien no. Sacarlos es trabajo aparte (ver §6) |
| La esquina de entrada varía por nivel | Frescura, y además permite elegir la que no obliga a dar vueltas |
| El óptimo se hornea en los datos | Calcularlo en runtime exigiría un solver dentro del juego |
| Modo desarrollo por hostname | Imposible olvidarse un flag prendido antes de publicar |
| Un solo estilo (plastilina) en todo el juego | La mezcla de tres estilos —plastilina, neón oscuro y paneles web— era lo que hacía ver el juego amateur |
| El puzzle usa el cuarto oscurecido de fondo | El puzzle "pasa en el cuarto"; un fondo propio de otro estilo rompía la continuidad |
| Mismo layout del puzzle en escritorio y móvil | La resolución lógica es fija; el pad grande a la derecha queda bajo el pulgar en un celu apaisado |
| Audio sintetizado, no grabado | Nada que precargar ni licenciar; tono coherente. Si llegan sonidos grabados, se cambia el cuerpo de cada método de `Sonido` |
| El silencio se guarda por dispositivo | Si el aula pide silencio, es para todos los perfiles; por eso no va en `GameState` |
| Estrellas en vivo en el HUD | Enseñan "más corto es mejor" sin mostrar "mov" ni "óptimo" |

---

## 6. Estado

### Hecho

- **50 niveles** con curva verificada: 10 en 5×5, 30 en 6×6, 10 en 8×8. Óptimos de 9 a 31 pasos.
- **Economía calibrada.** Con media de 2★ se avanza y se consiguen 5 de 17 muebles en todo el juego;
  con media de 1★ no alcanza para el tablero siguiente.
- **Arte de plastilina** en fondos, muebles, íconos y personajes (52 assets precargados).
- **Guía visual del orden**: brillo progresivo desde la batería y camino punteado.
- **Tiempos por nivel** (`{mejor, ultimo, intentos}`), base para analizar dificultad.
- **Modo desarrollo** aislado del usuario final.

- **v0.8 — rediseño visual.** Todo el juego en plastilina (antes el puzzle era neón oscuro y los
  HUD paneles azul marino); botones de icono con volumen que se aplastan y suenan; tablero de madera
  con fichas de masa; serpiente como tubo continuo con cabeza que se desliza; sin siglas, sin "mov",
  "óptimo" ni "pts"; estrellas en vivo; mapa de niveles; tienda con dibujos grandes y precio en
  moneda; audio sintetizado; fundidos entre escenas; celebración con confeti; manito guía en los 3
  primeros niveles; elección de personaje en el primer login; marca de agua ✦ borrada de los fondos.

- **Recorrido guiado de la primera vez** (perfiles nuevos): fantasma que camina al banco, demostración
  automática del nivel 1, niveles 1-5 sin distracciones, la tienda aparece como premio, regalo de
  bienvenida (1 mueble gratis de 3) y recién ahí juego libre.

### Pendiente, por impacto en el niño

| Prioridad | Qué | Nota |
|---|---|---|
| 🟡 Media | Voz opcional | "¡muy bien!", "¡otra vez!": refuerzo sin texto |
| 🟢 Deuda | Poner al día editor y tester | Ver abajo |
| 🟢 Pulido | 1 pieza de arte | `pelota` |
| 🟢 Pulido | Profundidad en el cuarto | Caminar por detrás de los muebles |

### Deuda conocida

Las dos herramientas internas están **desincronizadas del juego**:

- **`editor.html`** exporta sin `optimo` ni `nace`, en formato de array crudo en vez de `G()`.
- **`tester.html`** conserva la `buildInitialSnake` antigua: **simula un juego distinto al real**.

No bloquea nada porque los niveles se generan con scripts, pero impide que otra persona cree
contenido.

---

## 7. Cómo verificar los cambios

No hay tests automáticos en el repo. El patrón que funcionó, y que conviene repetir:

**Scripts de validación desechables en el scratchpad.** `levels.js`, `tienda.js` y `GameState.js` se
pueden importar en Node directamente (sólo hace falta un `localStorage` falso para `GameState`).
Sobre eso se escribe un verificador que replique las reglas del juego y compruebe invariantes.

El verificador de niveles comprueba, para los 50:

- que se ganen **exactamente** en su `optimo`, y **no en menos**;
- que la serpiente nazca colapsada en una sola casilla;
- que haya siempre batería, resistencia y LED, sin orders repetidos;
- que los capacitores sólo aparezcan en el tablero 8×8 y los interruptores nunca en el tramo libre;
- que `TIERS` cubra los 50 índices sin repetir ni faltar ninguno.

Dos aprendizajes de este método, los dos por haberlos sufrido:

- **Verificar contra el archivo real, no contra los datos intermedios.** Una vez los óptimos se
  midieron con un nacimiento que nunca llegó a escribirse en `levels.js`. El juego habría quedado
  con metas imposibles y sin ningún síntoma visible.
- **Los scripts que generan código deben contar lo que escriben y reventar si no cuadra.** Un parche
  falló en silencio y omitió un campo en 37 niveles.

Para lo demás: verificación a mano en el navegador con la consola abierta (F12), y `window.isMobile`
emulando touch en DevTools para el layout móvil.

**Capturas automáticas.** El `--screenshot` de Edge/Chrome headless no sirve para este juego: con
`--virtual-time-budget` los tweens y fundidos no avanzan (todo sale oscuro y a medio animar), y con
`--timeout` captura antes de que cargue. Lo que funcionó en v0.8: un driver mínimo de DevTools
Protocol en Node (trae `WebSocket` nativo) que lanza Edge con `--remote-debugging-port`, espera en
tiempo real, manda teclas y clics, evalúa JS (`game.scene.getScene('PuzzleScene')`) y llama a
`Page.captureScreenshot`. Para llegar a la pantalla de victoria, un DFS de pocas líneas evaluado en
la página encuentra la solución en `optimo` pasos y la ejecuta con `_mover`.

---

## 8. Paralizado

**Telemetría con xAPI y sistema de alumnos.** Hay un diseño completo en el archivo de plan
(`~/.claude/plans/`), aparcado a pedido. Decisiones ya tomadas si se retoma: xAPI 1.0.3 como formato
canónico, Supabase como almacén, 100 % frontend con RLS, datos seudonimizados (el nombre del alumno
nunca sale del dispositivo), y alta de alumnos a cargo del maestro.
