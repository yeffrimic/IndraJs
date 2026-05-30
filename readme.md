# ⚡ Circuito Puzzle

> Juego educativo de electrónica para niños y principiantes — aprende conectando circuitos como una serpiente.

![demo](https://img.shields.io/badge/demo-live-4caf50?style=flat-square)
![phaser](https://img.shields.io/badge/Phaser-3.60-4fc3f7?style=flat-square)
![license](https://img.shields.io/badge/licencia-MIT-ce93d8?style=flat-square)
![made in](https://img.shields.io/badge/hecho%20en-Guatemala-4fc3f7?style=flat-square)

---

## 🎮 ¿Qué es?

**Circuito Puzzle** es un videojuego educativo top-down donde el jugador controla una serpiente que representa el flujo de corriente eléctrica. El reto es maniobrar la serpiente para conectar los componentes electrónicos en el orden correcto — batería → resistencia → capacitor → LED — y completar el circuito.

Diseñado para niños y estudiantes sin conocimiento previo de electrónica, con una mecánica intuitiva de 10 niveles diarios que progresa en dificultad.

---

## 🕹️ Cómo jugar

### En el cuarto
- **Flechas** — mover al personaje
- **E** — interactuar con el workbench (cuando estés cerca)
- Acércate al **⚡ WORKBENCH** para iniciar un puzzle

### En el puzzle
- **Flechas** — mover la serpiente
- **R** — reiniciar el nivel
- La serpiente muestra el orden de conexión en su cuerpo
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
│   ├── levels.js       ← niveles del juego
│   ├── SpriteConfig.js ← configuración de sprites
│   ├── state/
│   │   └── GameState.js
│   └── scenes/
│       ├── BootScene.js
│       ├── LoginScene.js
│       ├── RoomScene.js
│       └── PuzzleScene.js
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

## 🧠 Sistema de puntaje

| Acción | Puntos |
|--------|--------|
| Completar nivel | 300 − (movimientos × 5) |
| Mínimo garantizado | 20 pts |
| Máximo posible | 300 pts (solución óptima) |

El puntaje se guarda por perfil de usuario en `localStorage`. Cada jugador tiene un límite de **10 niveles por día** — los niveles se desbloquean uno a uno al completar el anterior.

---

## 📦 Tecnologías

- **[Phaser 3.60](https://phaser.io)** — motor de videojuegos HTML5
- **JavaScript ES6** — módulos nativos, sin bundler
- **localStorage** — persistencia de datos sin backend
- **BFS (Breadth-First Search)** — cálculo automático de longitud de serpiente

---

## 🗺️ Roadmap

- [ ] Sprites y animaciones del personaje
- [ ] Tienda de decoración del cuarto
- [ ] Sonidos y música ambiente
- [ ] Pantalla de progreso y récords
- [ ] Tilemap con Tiled
- [ ] Más niveles con componentes avanzados (transistores, diodos)
- [ ] Backend para guardar progreso en la nube

---

## 👤 Autor

Hecho con ❤️ por **Yeffri Salazar** — Director de [Creabot](https://creabot.us), Guatemala.


---

## 📄 Licencia

MIT — libre para usar, modificar y distribuir con atribución.
