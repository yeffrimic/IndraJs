# ⚡ IndraJS

> Juego educativo de electrónica para niños y principiantes — aprende conectando circuitos como una serpiente.

![demo](https://img.shields.io/badge/demo-live-4caf50?style=flat-square)
![phaser](https://img.shields.io/badge/Phaser-3.60-4fc3f7?style=flat-square)
![license](https://img.shields.io/badge/licencia-MIT-ce93d8?style=flat-square)
![made in](https://img.shields.io/badge/hecho%20en-Guatemala-4fc3f7?style=flat-square)

---

## 🎮 ¿Qué es?

**Circuito Puzzle** es un videojuego educativo top-down donde el jugador controla una serpiente que representa el flujo de corriente eléctrica. El reto es maniobrar la serpiente para conectar los componentes electrónicos en el orden correcto — batería → resistencia → capacitor → LED — y completar el circuito.

Cuando la serpiente toca la batería, la **corriente recorre su cuerpo iluminándolo** y los componentes se encienden con partículas al conectarse. Hay una **tienda 🛒** para gastar las monedas ganadas en energía, packs de niveles, pistas y muebles para el cuarto.

Diseñado para niños y estudiantes sin conocimiento previo de electrónica, con una mecánica intuitiva de niveles diarios que progresa en dificultad.

---

## 🕹️ Cómo jugar

### En el cuarto
- **Flechas** — mover al personaje
- **E** — interactuar con el objeto cercano (cuando estés cerca)
- Acércate al **⚡ WORKBENCH** para iniciar un puzzle
- Acércate a la **🛒 TIENDA** para gastar tus monedas

### En el puzzle
- **Flechas** — mover la serpiente
- **R** — reiniciar el nivel
- **💡 pista** — revela el orden de los componentes (gastás 1 de tus 3 pistas)
- Maniobrá la serpiente sobre la **batería**: la corriente ilumina su cuerpo
- Cuando todos los componentes estén alineados, ¡el circuito se completa!
- Si hay un **switch**, haz click en él para cerrarlo

### Componentes
| Símbolo | Componente | Color |
|---------|-----------|-------|
| ○ | Batería (BAT) | Azul cian |
| □ | Resistencia (R) | Morado |
| △ | Capacitor (CAP) | Verde agua |
| ○ | LED | Naranja |
| ⊣ | Switch (SW) | Amarillo |

---

## 🗂️ Estructura del proyecto

```
circuito-puzzle/
├── index.html          ← juego principal
├── editor.html         ← editor de niveles
├── tester.html         ← probador de niveles
├── src/
│   ├── main.js         ← configuración de Phaser
│   ├── levels.js       ← niveles del juego (+ packs comprables)
│   ├── tienda.js       ← catálogo de la tienda
│   ├── SpriteConfig.js ← configuración de sprites
│   ├── state/
│   │   └── GameState.js ← progreso, monedas, pistas, compras
│   └── scenes/
│       ├── BootScene.js
│       ├── LoginScene.js
│       ├── RoomScene.js
│       ├── PuzzleScene.js
│       └── StoreScene.js ← la tienda
└── assets/             ← sprites (cuando estén disponibles)
```

---

## 🛠️ Herramientas incluidas

### Editor de niveles (`editor.html`)
Diseña niveles visualmente con un grid clickeable.

1. Seleccioná una herramienta (BAT, R, CAP, LED, SW)
2. Haz click en el grid para colocar componentes
3. El orden se asigna automáticamente según la secuencia de colocación — la batería siempre va primero y el LED siempre al final
4. La longitud de la serpiente se calcula automáticamente con BFS
5. Presioná **guardar nivel** — se guarda en `localStorage`
6. Cuando tengas varios listos, **exportar levels.js** descarga el archivo

### Probador de niveles (`tester.html`)
Prueba cualquier nivel guardado antes de integrarlo al juego.

- Seleccioná el nivel del dropdown
- Jugalo completo con flechas o botones táctiles
- Ve los movimientos y el puntaje obtenido

---

## 🚀 Correr localmente

```bash
# clonar el repo
git clone https://github.com/TU_USUARIO/circuito-puzzle.git
cd circuito-puzzle

# servir con Node.js
npx serve .

# o con Python
python -m http.server

# abrir en el navegador
# http://localhost:3000
```

> ⚠️ No abrir `index.html` directamente con doble click — el navegador bloquea los módulos ES6 desde `file://`. Siempre usar un servidor local.

---

## 🎨 Agregar sprites propios

El juego funciona con gráficos placeholder por defecto. Cuando tengas tus sprites:

1. Copiá los archivos a `assets/`
2. Abrí `src/SpriteConfig.js`
3. Cambiá `USE_SPRITES: false` a `USE_SPRITES: true`
4. Ajustá los paths y tamaños de frame según tus imágenes

```js
// src/SpriteConfig.js
const SpriteConfig = {
  USE_SPRITES: true,  // ← cambiar esto
  personaje: {
    path:   'assets/personaje.png',
    frameW: 32,   // ← ajustar al tamaño de tu spritesheet
    frameH: 48,
  },
  // ...
};
```

---

## 🧠 Sistema de puntaje y economía

| Acción | Puntos |
|--------|--------|
| Completar nivel | 300 − (movimientos × 5) |
| Mínimo garantizado | 20 pts |
| Máximo posible | 300 pts (solución óptima) |

- El puntaje y las **monedas** se guardan por perfil en `localStorage`. Ganás monedas iguales al puntaje, pero **gastarlas en la tienda no baja tu récord**.
- Se registra el **mejor puntaje por nivel**: al rejugar, solo sumás la **diferencia** si superás tu marca anterior — así podés exprimir cada puzzle hasta el óptimo sin farmeo.
- Límite de **10 niveles nuevos por día**; los replays no consumen el cupo. Con **energía** (tienda) podés jugar más niveles ese día.

## 🛒 Tienda

Gastá tus monedas en cuatro categorías:

| Categoría | Qué compra |
|-----------|-----------|
| ⚡ Energía | Más niveles para jugar hoy (supera el límite diario) |
| 🎮 Niveles | Packs de niveles (intermedios; circuitos paralelos *próximamente*) |
| ✨ Mejoras | Recarga de pistas (+3) |
| 🪑 Muebles | Decoración para tu cuarto (planta, lámpara, póster, tapete) |

---

## 📦 Tecnologías

- **[Phaser 3.60](https://phaser.io)** — motor de videojuegos HTML5
- **JavaScript ES6** — módulos nativos, sin bundler
- **localStorage** — persistencia de datos sin backend
- **BFS (Breadth-First Search)** — cálculo automático de longitud de serpiente
- **Partículas + tweens de Phaser** — efectos de corriente, energía y celebración
- **Gráficos vectoriales** generados en runtime — funciona sin assets (placeholders)

---

## 🌱 Cómo ha crecido

- **v0.1 — Base.** Cuarto top-down + puzzle de la serpiente, 10 niveles, perfiles y puntaje.
- **v0.2 — Tienda 🛒.** Moneda separada, energía (más niveles por día), packs de niveles, mejoras y muebles para el cuarto.
- **v0.3 — Serpiente viva ⚡.** La corriente ilumina el cuerpo desde la batería, partículas al conectar cada componente, números de orden más grandes y pistas bajo demanda (3 gratis, recargables en la tienda).
- **v0.4 — Economía pulida.** Récord por nivel: los replays solo premian la mejora, sin farmeo infinito.

---

## 🗺️ Roadmap

- [x] Tienda con monedas, energía, packs, pistas y muebles
- [x] Animaciones de la serpiente (corriente, partículas, energía)
- [x] Récords por nivel y mejora en replays
- [ ] Sprites y animaciones del personaje (pixel art)
- [ ] **Circuitos paralelos** — nueva mecánica (ya reservado en la tienda)
- [ ] Componentes avanzados (transistores, diodos)
- [ ] Sonidos y música ambiente
- [ ] Tilemap con Tiled
- [ ] Backend para guardar progreso en la nube

---

## 👤 Autor

Hecho con ❤️ por **Yeffri Salazar** — Director de [Creabot](https://creabot.us), Guatemala.


---

## 📄 Licencia

MIT — libre para usar, modificar y distribuir con atribución.
