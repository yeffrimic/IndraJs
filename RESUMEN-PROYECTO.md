# IndraJS — contexto del proyecto

> **Para qué es este archivo:** retomar el proyecto sin releer todo el código. Prioriza lo que
> **no se deduce** leyendo los archivos: por qué las cosas son como son, y las trampas que ya
> costaron trabajo una vez.
>
> Última revisión: 22 jul 2026.

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

- **Phaser 3.60 es una global.** Se carga por `<script>` desde CDN en `index.html`. **Nunca**
  `import Phaser`.
- **Sin bundler, sin npm, sin `package.json`, sin paso de compilación.** Cada archivo se sirve tal
  cual al navegador. Módulos ES6 nativos.
- **Sólo `localStorage`**, sin backend. Toda escritura pasa por `GameState`.
- **Resolución lógica fija 800×600**, `Scale.FIT` + `CENTER_BOTH`. Se adapta con `window.isMobile`.
- **Probar siempre con servidor local.** `file://` bloquea los módulos.
- Nombres y comentarios **en español**, métodos privados con prefijo `_`.

---

## 3. Mapa de archivos

| Archivo | De qué es dueño |
|---|---|
| `src/main.js` | config de Phaser, `window.isMobile`, espera a que cargue la fuente |
| `src/levels.js` | los 50 niveles, el helper `G()`, `packRequerido()` y `TIERS` (currículo) |
| `src/tienda.js` | catálogo y precios; el comentario de cabecera explica cómo se calcularon |
| `src/SpriteConfig.js` | **registro central de assets** + la constante `FUENTE` |
| `src/ClayUI.js` | paleta cálida y widgets del estilo plastilina |
| `src/dev-guard.js` | define `window.__DEV__` según hostname (script clásico, corre primero) |
| `src/Dev.js` | `activo()` / `flag()` / `param()` para las escenas |
| `src/state/GameState.js` | **todo el estado persistente**: progreso, monedas, estrellas, tiempos, cupo diario, compras |
| `scenes/BootScene.js` | precarga lo que liste `SpriteConfig.listarParaCargar()` |
| `scenes/LoginScene.js` | 6 perfiles fijos (array `PERFILES`), no hay alta de usuarios |
| `scenes/RoomScene.js` | el cuarto: física arcade, muebles, proximidad al workbench |
| `scenes/LevelSelectScene.js` | selector por concepto, con scroll |
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
ilustrador. Hoy quedan tres: `tile_head`, `tile_body`, `pelota`.

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

### Pendiente, por impacto en el niño

| Prioridad | Qué | Nota |
|---|---|---|
| 🔴 Alta | Quitar las siglas `BAT / R / CAP / LED` del tablero | Las piezas ya se reconocen por su forma; lo que sobra es el texto |
| 🔴 Alta | Onboarding sin texto | Hoy no puede empezar sin un adulto al lado |
| 🟡 Media | Audio | Refuerza cada acción; no bloquea jugar |
| 🟡 Media | Pantalla para elegir personaje | `GameState.personaje` ya existe y persiste: falta sólo la UI |
| 🟡 Media | Botones con ícono, esconder "mov / óptimo" | El arte ya está, falta cablearlo |
| 🟢 Pulido | Transiciones y celebración | |
| 🟢 Deuda | Poner al día editor y tester | Ver abajo |
| 🟢 Pulido | 3 piezas de arte | `tile_head`, `tile_body`, `pelota` |
| 🟢 Pulido | Profundidad en el cuarto | Caminar por detrás de los muebles |

**Recomendación:** las dos de prioridad alta van juntas y en ese orden. Son el mismo problema visto
desde dos lados —enseñar sin texto— y resolverlas convierte "un juego que hay que explicar" en "un
juego que un niño de 6 abre solo".

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

---

## 8. Paralizado

**Telemetría con xAPI y sistema de alumnos.** Hay un diseño completo en el archivo de plan
(`~/.claude/plans/`), aparcado a pedido. Decisiones ya tomadas si se retoma: xAPI 1.0.3 como formato
canónico, Supabase como almacén, 100 % frontend con RLS, datos seudonimizados (el nombre del alumno
nunca sale del dispositivo), y alta de alumnos a cargo del maestro.
