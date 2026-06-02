---
name: indrajs-phaser
description: Usar SIEMPRE al escribir, modificar o depurar código de este juego (IndraJS / Circuito Puzzle). Cubre Phaser 3.60.0 vía CDN con ES6 modules sin bundler, la arquitectura de escenas, GameState, SpriteConfig, el formato de niveles y las convenciones de estilo del proyecto. Disparar ante cualquier tarea sobre .js de src/, escenas, niveles, sprites, controles o mecánica de la serpiente.
---

# IndraJS — Guía de desarrollo (Phaser 3.60 + JS ES6)

Juego educativo top-down: una serpiente = flujo de corriente. El jugador la mueve para
alinear componentes en orden (BAT → R → CAP → LED, y cierra SW si lo hay) y completar el circuito.

## Stack y restricciones DURAS (no romper)

- **Phaser 3.60.0**, cargado por `<script>` desde CDN en `index.html`. `Phaser` es **global** — NO usar `import Phaser`.
- **ES6 modules nativos** (`import`/`export default`). **Sin bundler, sin npm, sin `package.json`, sin build step.** No agregar dependencias ni `node_modules`.
- Cada archivo se sirve tal cual al navegador. Para probar **siempre con servidor local** (`npx serve .` o `python -m http.server`) — nunca `file://` (rompe los módulos).
- Persistencia: **solo `localStorage`**, sin backend. Toda escritura pasa por `GameState`.
- Resolución lógica fija **800×600**, `Scale.FIT` + `CENTER_BOTH`. El código se adapta con `window.isMobile` (definido en `main.js`).

## Versión de Phaser — 3.60 exacto, evitar pitfalls

Asumir **3.60.0** (no 3.7x ni 4.x). Antes de proponer cualquier API, verificar que existe en 3.60:
no inventar métodos de versiones nuevas (p. ej. nada de la API de Phaser 4, ni helpers añadidos
post-3.60). Si dudás de una firma, imitá el uso que ya hay en el código antes que inventar.

Convención de color (se repite en todo el proyecto): en `graphics`/figuras → entero `0xRRGGBB`;
en estilos de `text` → string `'#rrggbb'`. Conversión usada: `` `#${color.toString(16).padStart(6,'0')}` ``.

## Patrones del proyecto que NO son obvios (imitarlos)

- **Render 100% vectorial por defecto** (`USE_SPRITES:false`): todo se dibuja con `this.add.graphics()`
  y formas (`fillRoundedRect`, `strokeCircle`, `strokeTriangle`, `beginPath/lineTo/strokePath`). No metas
  imágenes salvo que se active `SpriteConfig`.
- **Placeholder del personaje (RoomScene)**: cuerpo de física **invisible** `this.physics.add.image(x,y,'__DEFAULT').setVisible(false)` que mueve la posición, + un `Graphics` (`_dibujarPersonajePlaceholder`) **redibujado cada frame** en `update()` siguiendo `player.x/y`. Si tocás el personaje, respetá este doble objeto.
- **Dos modelos de movimiento distintos** (no mezclarlos):
  - *RoomScene* = **continuo** con física arcade: `setVelocity(vx,vy)`, velocidad 160, touch mantiene dirección vía `this._touchDir`.
  - *PuzzleScene* = **discreto por grid lógico**: `_mover(dc,dr)` mueve 1 celda (unshift/pop del array `snake`), sin física. Touch = un tap por paso. Teclado vía `Phaser.Input.Keyboard.JustDown` en `update()`.
- **Interacción de proximidad** (RoomScene): `Phaser.Math.Distance.Between(...)` vs `PROXIMITY_DIST=120`; el workbench se activa con tecla `E` (`addKey(KeyCodes.E)`) o botón touch solo cuando `cercaDelWorkbench`.
- **Feedback animado** con `this.tweens.add({...})` (hints parpadeantes, toasts con `hold`+`yoyo`+`onComplete: destroy`). Usar tweens para animaciones de UI, no setInterval.
- **Escenas**: `super('Key')` en constructor; datos entre escenas con `this.scene.start('PuzzleScene',{nivelIdx})` y reinicio con `this.scene.restart({...})`.

## Arquitectura

```
index.html  → carga Phaser CDN + src/main.js (entry, type=module)
src/main.js → config de Phaser, define window.isMobile y window.game, scene order:
              [BootScene, LoginScene, RoomScene, PuzzleScene]
src/scenes/
  BootScene   → barra de carga; precarga assets SOLO si SpriteConfig.activo()
  LoginScene  → SELECTOR de 6 perfiles fijos (array PERFILES: Yeffri, Estudiante 1-4, Invitado),
                NO hay input de texto; al elegir → GameState.login(nombre) → RoomScene
  RoomScene   → cuarto top-down con física arcade; acercarse al WORKBENCH + E → arranca puzzle
  PuzzleScene → el puzzle completo (grid, serpiente, HUD, hint bar, controles, win)
src/state/GameState.js → singleton: perfil, puntos, niveles, límite diario, localStorage
src/SpriteConfig.js    → registro central de assets; flag USE_SPRITES (false por defecto)
src/levels.js          → export const LEVELS = [...] (10 niveles)
editor.html / tester.html → herramientas standalone para diseñar y probar niveles
```

**Flujo de datos:** todo el progreso vive en `GameState` (singleton importado). No duplicar estado
en escenas; al ganar, llamar `GameState.completarNivel(idx, puntos)`. Puntaje: `Math.max(300 - mov*5, 20)`.
Persistencia por perfil bajo la clave **`circuito_perfil_<nombre>`** (formato fijo: si lees/escribes
ese storage fuera de GameState — como hace `LoginScene._getPuntos` — respetá exactamente esa clave).
Límite de **10 niveles/día** (`MAX_NIVELES_DIA`), reseteado por fecha en `_verificarDia`.

## Formato de niveles (`levels.js`)

`grid` = matriz de filas; cada celda es `null` o `{ sym, order }`.
`sym`: `b`=batería, `r`=resistencia, `c`=capacitor, `l`=led, `s`=switch.
Regla invariable: **BAT siempre order menor (primero), LED siempre al final**; `_parseComponents` re-normaliza el orden. La longitud de la serpiente se calcula sola por BFS entre componentes consecutivos (`_calcularSerpiente`) — no fijarla a mano.

Al agregar niveles: mantené el comentario-cabecera (nombre, dificultad, tiles aprox.) como el resto del archivo, y verificá que exista un camino BFS entre componentes (grid no bloqueado).

## Sprites

Por defecto `USE_SPRITES: false` → todo se dibuja con `graphics`. Para activar imágenes:
poner archivos en `assets/`, ajustar paths/frames en `SpriteConfig.js`, y poner el flag en `true`.
`BootScene` ya precarga automáticamente lo que liste `SpriteConfig.listarParaCargar()`.
**Cualquier asset nuevo se registra en SpriteConfig**, no con `this.load.image` suelto en una escena.

## Convenciones de estilo (imitar el código existente)

- **Idioma español** en nombres de métodos/variables/comentarios: `_dibujarGrid`, `_mover`, `_ganar`, `nivelIdx`, `serpiente`. Métodos privados con prefijo `_`.
- Paleta del juego (reutilizar, no inventar colores nuevos sin razón):
  - fondo `0x0d0d1f` / paneles `0x080814` `0x09091a` / bordes `0x2a2a4a`
  - cian `0x4fc3f7` (BAT, acento principal) · morado `0xce93d8` (R) · verde agua `0xa5d6a7` (CAP)
  - naranja `0xff7043` (LED) · amarillo `0xfff176` (SW/puntos) · verde win `0x4caf50` · rojo `0xef5350`
  - serpiente cuerpo `0x1a9e65`
- Tipografía **siempre `monospace`**; tamaños chicos (9–18px); texto con `stroke:'#000000'` cuando va sobre el grid.
- Layout responsivo: ramificar con `const isMobile = window.isMobile || false` (en móvil no hay columna de controles derecha; el d-pad va abajo). Recalcular tamaños de tile, no hardcodear píxeles absolutos del grid.
- Limpiar objetos antes de redibujar (patrón `this.tileObjects[key].forEach(o => o.destroy())`) para no acumular Game Objects.
- UI en español, minúsculas, estética terminal/retro (`'mover la\nserpiente'`, `'salir'`, `'R — reiniciar'`).

## Probar un cambio

1. Servir: `npx serve .` (o `python -m http.server`) desde la raíz.
2. Abrir `http://localhost:3000` (index) — o `tester.html` para un nivel suelto, `editor.html` para diseñar.
3. Para probar UI móvil: emular touch en DevTools (define `window.isMobile`).
4. No hay tests automáticos; verificar a mano en el navegador. Revisar la consola por errores de módulos/Phaser.

## Checklist antes de dar por hecho un cambio

- [ ] ¿Usé API válida de Phaser **3.60**? (no inventar métodos de versiones nuevas)
- [ ] ¿`Phaser` como global, sin `import Phaser`?
- [ ] ¿Nombres/comentarios en español y colores de la paleta?
- [ ] ¿Estado nuevo pasa por `GameState` y se persiste en `localStorage`?
- [ ] ¿Funciona en desktop **y** móvil (`window.isMobile`)?
- [ ] ¿Destruí los Game Objects viejos al redibujar?
- [ ] ¿Sin npm/bundler/dependencias nuevas?
