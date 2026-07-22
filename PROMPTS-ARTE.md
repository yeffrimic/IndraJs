# 🎨 Arte pendiente — inventario y prompts para Gemini

Lista derivada de los `listo: false` en [src/SpriteConfig.js](src/SpriteConfig.js).
Son **27 entradas**: 23 assets a crear + **4 a borrar** (código muerto, ver abajo).

Cuando llegue un PNG: lo ponés en la ruta indicada y **borrás el `listo: false`** de esa línea.
No hay que tocar nada más — `BootScene` lo precarga solo.

---

## 0. Primero: borrar 4 entradas muertas

- **`cuarto.escritorio`, `cuarto.alfombra`, `cuarto.estante`** ([SpriteConfig.js:50-52](src/SpriteConfig.js#L50-L52))
  — `RoomScene` sólo usa `cuarto.bg`, `cuarto.workbench` y `cuarto.tienda`; los muebles del cuarto
  salen todos de la categoría `muebles`.
- **`fondos.room`** ([SpriteConfig.js:15](src/SpriteConfig.js#L15)) — ninguna escena lo pide. El
  fondo del cuarto es `cuarto.bg` (`assets/cuarto_bg.png`), que **ya existe y ya se ve en el juego**.

Ninguna de las cuatro la lee el código. No encargues ese arte — borrá las líneas.

---

## 1. Inventario por lote

Las medidas salen de lo que ya existe: los objetos se generan grandes y el juego los baja con `escala`.

### Lote A — Iconos de UI · 6 assets · `256x256` (como los `btn_*.png` que ya tenés)

> **El de mayor impacto.** Hoy la moneda, la energía y las pistas se comunican con texto y números —
> justo lo que un chico de 6 años no puede leer. Estos 6 iconos sacan la mitad del texto de pantalla.

| Archivo | Qué es |
|---|---|
| `assets/ui/moneda.png` | moneda del juego (saldo de la tienda) |
| `assets/ui/energia.png` | energía = niveles que le quedan hoy |
| `assets/ui/estrella_llena.png` | estrella ganada |
| `assets/ui/estrella_vacia.png` | estrella no ganada (misma forma, apagada) |
| `assets/ui/candado.png` | nivel bloqueado |
| `assets/ui/pista.png` | pista disponible |

### Lote B — Muebles de la tienda · 11 assets · `500x500`

Los 15 se venden en [tienda.js:75-89](src/tienda.js#L75-L89); ya tenés 4 (planta, repisa, sillón, sillón individual).

| Archivo | Descripción en la tienda |
|---|---|
| `assets/muebles/estante.png` | repisa para adornos |
| `assets/muebles/vitrina.png` | mostrador con repisas |
| `assets/muebles/lampara.png` | ilumina el rincón |
| `assets/muebles/mesita.png` | mesita redonda |
| `assets/muebles/peluche.png` | un osito suave |
| `assets/muebles/baul.png` | baúl de juguetes |
| `assets/muebles/pelota.png` | pelota para jugar |
| `assets/muebles/poster.png` | póster de pared |
| `assets/muebles/reloj.png` | reloj de pared |
| `assets/muebles/cuadro.png` | un cuadrito |
| `assets/muebles/tapete.png` | tapete del piso |

### Lote C — Fondos · 3 assets · `1200x900` (4:3, como `fondos/store.png`)

| Archivo | Pantalla |
|---|---|
| `assets/fondos/login.png` | elegir perfil |
| `assets/fondos/puzzle.png` | detrás del tablero — **tiene que ser tranquilo**, no competir con el puzzle |
| `assets/fondos/select.png` | selector de niveles |

*(el fondo del cuarto ya existe: `assets/cuarto_bg.png` — ver §0)*

### Lote D — Tiles del tablero · 2 assets · `500x500`

| Archivo | Qué es |
|---|---|
| `assets/grid/tile_head.png` | casilla bajo la cabeza de la serpiente |
| `assets/grid/tile_body.png` | casilla bajo el cuerpo |

### Lote E — Personaje · 1 spritesheet · caso especial (ver §4)

`assets/personaje.png` — `4 columnas × 5 filas`, frame de `32x48` → hoja de `128x240`.
Filas: idle, camina abajo, camina arriba, camina izquierda, camina derecha.

---

## 2. El prompt (plantilla)

**Los prompts van en inglés a propósito.** Gemini entiende español perfectamente, pero el
vocabulario técnico de arte (*claymation*, *matte*, *3/4 view*, *top-down orthographic*,
*seamless*) tiene una forma canónica en inglés que el modelo mapea con mucha más precisión —
los captions con los que se entrenó son casi todos en inglés. La diferencia se nota sobre todo
en las **instrucciones negativas** ("no text", "flat background"), que son las que te ahorran
regenerar. La explicación de alrededor queda en español, para vos.

Gemini rinde **mucho mejor de a un asset por vez**. Usá este preámbulo fijo y cambiá sólo la
línea `SUBJECT`.

> **Clave:** adjuntá 2-3 PNGs tuyos como referencia de estilo (`snake_head.png`, `comp_bat.png`,
> `fondos/store.png`). Una imagen de referencia vale más que tres párrafos de descripción.

```
You are creating a single game asset for a children's video game. Produce ONE image.

STYLE
Handmade PLASTICINE / CLAYMATION, stop-motion look (Wallace & Gromit, Pingu).
- Chunky, rounded, slightly irregular hand-sculpted forms — BUT always respect the
  object's real proportions. If the real object is thin and flat (a rug, a poster,
  a picture frame, a clock), it must stay THIN AND FLAT. Never inflate a flat object
  into a thick padded blob just to make it look chunky.
- Matte clay surface with subtle fingerprints and sculpting marks. Absolutely no gloss.
- Soft rounded edges, no hard black outlines, no ink lines.
- Warm, soft, diffuse light from above-front. Gentle self-shadowing to give volume.
- Saturated, cheerful, high-contrast colors.
NOT flat vector art. NOT a glossy 3D render. NOT pixel art. NOT a photograph.
NOT clay-textured CGI — it must look physically sculpted by hand.

OBJECT TREATMENT — VERY IMPORTANT
The object is an INANIMATE OBJECT, not a character. Do NOT anthropomorphize it.
- NO face of any kind: no eyes, no pupils, no mouth, no smile, no eyebrows, no cheeks,
  no blush, no nose.
- NO arms, no legs, no hands, no feet, no limbs of any kind.
- No facial expression, no personality, no cartoon mascot styling.
It is a plain, cute, well-sculpted OBJECT. Its charm comes from the chunky clay shape
and the color — never from a face.

AUDIENCE
Children aged 6-8 who CANNOT READ YET. The object must be instantly recognizable from
its SILHOUETTE and COLOR alone, at small size, with no words. Keep the shape simple
and bold: it will be displayed very small in-game, so avoid fine detail that would
disappear. Prefer one clear readable form over many small features.

FRAMING AND COMPOSITION
- Exactly ONE object, centered, complete and fully inside the frame, nothing cropped.
- Straight-on view, no dramatic camera angle, no perspective distortion, no tilt.
- Leave roughly 8% empty margin on all four sides.
- No scene, no room, no ground plane, no table, no props, no decorative extras.

BACKGROUND — the object will be cut out, so this section is critical
- COMPLETELY FLAT, uniform NEUTRAL WHITE (#FFFFFF), edge to edge.
- No gradient, no texture, no vignette, no lighting falloff on the background.
- NO cast shadow, NO contact shadow, NO ground shadow, NO shadow blob, NO reflection
  under or around the object. The object must appear to FLOAT, completely isolated,
  touching nothing.

LIGHTING — no environment contamination
The object must be lit as if it were floating alone in neutral empty space.
- NO colored light bouncing off the background onto the object.
- NO colored spill, tint, glow, halo, rim light or fringe on the object's edges.
- NO reflection of the background color anywhere on the object.
- The object's colors must stay pure and true at the edges, exactly the same as at
  its center. The outer silhouette must be a clean, crisp, hard cut against the
  background, with no soft colored haze bleeding outward.

FORBIDDEN
NO text, NO letters, NO numbers, NO words, NO labels, NO logos, NO watermark,
NO signature, NO UI frame, NO border, NO color swatches, NO multiple views,
NO variations grid, NO packaging, NO hands holding the object.

OUTPUT: square image, <SIZE>.

SUBJECT: <línea del lote>
```

> **Sobre el `<SIZE>`:** el modelo no siempre respeta la medida exacta. No importa — generá
> grande y redimensioná después. Lo que sí importa es que salga **cuadrado**.

### Líneas `SUBJECT` — Lote A (iconos, `512x512`, después bajás a 256)

```
A plump round gold coin made of plasticine, with a lightning bolt pressed into its
center in relief. Warm saturated gold. Should read as "game money".

A plasticine battery cell standing upright, seen from the front, with a bright yellow
lightning bolt pressed into its body in relief. Full charge, vivid and energetic.
Should read as "energy to keep playing". No face.

A chunky five-pointed plasticine star, rounded and soft, rich golden yellow, with a warm
glow. Happy and rewarding.

The SAME chunky five-pointed plasticine star, but switched off: pale matte grey, no glow,
no color, like unused grey clay. Identical shape and angle to the golden version.

A closed plasticine padlock, pot-bellied and rounded, soft blue-grey body with a matte
metal shackle. Friendly, not threatening — it should say "not yet", not "forbidden".

A glowing plasticine light bulb, luminous yellow glass with a grey screw base. Should
read as "idea, help, hint".
```

### Líneas `SUBJECT` — Lote B (muebles, `1024x1024`, después bajás a 500)

> ⚠️ **La perspectiva importa más que el objeto.** El cuarto **no** es una vista cenital: es un
> **diorama plano visto de frente** — pared arriba, piso abajo, cámara a la altura de los ojos
> (mirá `assets/cuarto_bg.png`). Un mueble en 3/4 desde arriba **no encaja** y se nota al instante.
> Por eso la repisa va **de frente**.
>
> Los dos muebles que ya funcionan (`workbench.png` y `tienda.png`) son la referencia exacta:
> vista frontal, apenas un guiño del plano superior. **Adjuntalos siempre.**

Cierre fijo para **todos** — es lo que mantiene los 11 coherentes entre sí:

```
Plasticine furniture for a child's bedroom, in a flat 2D storybook diorama style.
Seen STRAIGHT FROM THE FRONT at eye level (front elevation view), with at most a
very slight downward tilt — just enough to hint at the top surface. This is NOT a
3/4 view, NOT isometric, NOT top-down, NOT an angled hero shot. The front face
must read flat and square to the camera.
Warm cheerful colors, consistent with the other furniture pieces in the set.
```

**Colgados en la pared** — planos contra la pared, sin patas ni base:

```
A light-wood wall shelf mounted flat against the wall, with three tiny ornaments
standing on it. Seen from the front.
A framed wall poster showing a simple colorful lightning bolt. Flat against the wall.
A round wall clock with a colorful frame and chunky hands. NO NUMBERS on the dial.
Flat against the wall, seen straight on.
A small framed wall picture of a simple landscape: sun, green hill and sky. Flat
against the wall.
```

**Apoyados en el piso** — se ve la cara frontal, apoyados sobre su base:

```
A display cabinet standing on the floor, with little glass doors and two inner
shelves. Front view, standing upright.
A floor lamp with a round cream-colored shade, switched on with warm light,
standing upright on its base. Front view.
A small round wooden bedside table with short chunky legs, standing on the floor.
Front view.
A light-brown teddy bear sitting upright, plump and very soft, facing forward.
A wooden toy chest resting on the floor with the lid half-open and colorful toys
peeking out. Front view, slightly tilted down so the open lid is readable.
A plump plasticine soccer ball with white and colored patches, resting on the floor.
```

**El tapete es el caso especial:**

```
A woven floor rug lying flat on the ground, with warm-colored concentric rings.

CRITICAL — this object is FLAT, not chunky. Override the "chunky rounded forms"
style note for this item: the rug is a THIN TEXTILE, only a few millimeters thick,
like a real rug lying on a floor. It is NOT a cushion, NOT a pouffe, NOT an ottoman,
NOT a padded disc, NOT a pet bed. It must have NO visible height or volume.

Seen from a fairly HIGH angle looking down, so the patterned TOP SURFACE fills almost
the entire shape and its side edge is at most a barely visible thin lip. Slightly
foreshortened into a wide ellipse (wider than tall) so it reads as lying on the
ground, not standing up.
```

> **Por qué falla:** el preámbulo pide formas *chunky* y redondeadas — perfecto para el osito o la
> pila, pero en un objeto plano el modelo lo obedece igual y te devuelve un **puf**. Hay que
> anular la regla explícitamente y nombrar lo que NO es (cojín, puf, cama de perro): las
> negaciones concretas funcionan mucho mejor que pedir "plano".

### ⚠️ La regla de los objetos planos

Le pasa lo mismo a **póster, cuadro y reloj**: son planos por naturaleza y el estilo *chunky* los
va a inflar como ladrillos de plastilina. A esos tres agregales:

```
This is a FLAT object — override the "chunky rounded forms" style note. It is a thin
panel hanging flush against the wall, with only a shallow frame. NOT a thick block,
NOT a deep box, NOT a chunky slab. Seen straight from the front, so the flat face
fills the shape and the side thickness is barely visible.
```

### Lote C — Fondos · **PREÁMBULO PROPIO, no uses el de arriba**

> 🚨 **No reutilices el preámbulo de objetos, ni siquiera recortándolo.** Ese prompt repite en tres
> secciones distintas *"un solo objeto centrado en el cuadro"*, y el modelo lo obedece: te devuelve
> un objeto lindo y centrado en vez de un fondo. Un fondo es un **escenario vacío**, casi lo
> opuesto. Usá este otro prompt, entero y solo.
>
> 💡 Generá los fondos en una **conversación nueva**. Si venís de generar iconos y muebles, el
> modelo arrastra ese contexto y te mete objetos en el fondo.

```
You are painting a BACKGROUND PLATE for a children's video game. This is a scenic
backdrop, NOT an object and NOT an illustration with a subject.

WHAT THIS IS
A full-bleed environment that fills the entire canvas edge to edge, 4:3 horizontal
(1200x900). Game characters and interface elements will be drawn ON TOP of it later,
so the image must feel EMPTY and unfinished on its own.

FULL BLEED — read this twice
The scene IS the image. The camera is INSIDE the scene, not looking at it from outside.
- The artwork must run off ALL FOUR EDGES of the canvas and be cropped by them.
- Nothing may be inset. There must be NO margin, NO padding, NO empty band anywhere
  along the edges.
- Do NOT depict the scene as a picture, painting, poster, sign, board, plaque, tablet,
  canvas, panel, card, screen or diorama sitting on a surface or hanging on a wall.
- NO frame, NO border, NO outline, NO rounded corners, NO drop shadow around the
  artwork, NO wall or table visible behind or around it.
- If a viewer could point at an edge and say "the picture ends here and something else
  begins", the image is WRONG. There is no "outside".

MOST IMPORTANT RULE — NO SUBJECT
- There is NO main subject, NO hero object, NO focal point, NO centerpiece.
- Do NOT place any single object in the middle of the frame.
- Nothing may be centered. Nothing may draw the eye.
- The CENTER of the image must be the calmest, emptiest, least detailed area of all.
- Keep any visual interest confined to the far edges and corners, and keep it subtle.
- If you feel tempted to add a star, an icon, a character, a plant, a lamp or any
  decorative element — DO NOT. Leave that space empty.

STYLE
Handmade plasticine / claymation world, matte clay surfaces, soft sculpted texture,
soft diffuse lighting, warm and inviting. Painterly and atmospheric, low contrast.
NOT a glossy 3D render, NOT flat vector art, NOT pixel art.

FORBIDDEN
NO text, NO letters, NO numbers, NO logos, NO watermark, NO signature, NO UI elements,
NO buttons, NO frames, NO borders, NO vignette so strong it darkens the corners
heavily, NO characters, NO people, NO animals.
NO sparkle, NO glint, NO twinkle, NO decorative star or shine anywhere in the image
(not even a small one in a corner).

OUTPUT: one image, 1200x900, horizontal 4:3, filling the whole frame.

SCENE: <línea de abajo>
```

⚠️ **Ojo con la paleta: el juego tiene dos mundos.**
- **Cuarto, tienda, login, selector →** plastilina CÁLIDA (cremas `#f5e3b8`, madera `#c88a4a`, marrón `#5a3a1a`)
- **Puzzle →** fondo OSCURO `#0d0d1f` con componentes neón (cian `#4fc3f7`, morado `#ce93d8`, verde agua `#a5d6a7`, naranja `#ff7043`, amarillo `#fff176`)

```
login  → A cozy warm plasticine children's bedroom corner, late afternoon light coming
         through a window. The center must stay EMPTY and uncluttered — profile cards are
         drawn on top of it. No furniture in the middle.

puzzle → An almost completely EMPTY very dark navy-blue surface (#0d0d1f), like a sheet
         of dark clay filling the whole frame, with a barely perceptible plasticine
         texture. This is the hardest one: it must be nearly featureless. The puzzle
         board is drawn on top of the center, so the center must be plain dark clay
         with NOTHING on it — no shape, no glow, no star, no icon, no ornament.
         Only a very faint cool blue light in the four corners. Think "empty dark
         wall", not "illustration".

cuarto → ver el prompt aparte más abajo (§2.b), tiene reglas propias.

select → An adventure-map landscape sculpted in plasticine, seen from directly above:
         warm terracotta ground, green hills and little forests, a blue river, and a
         winding dotted path climbing upward. The terrain fills the WHOLE frame and is
         cropped by all four edges — the map has no edge of its own, no border, and it
         is not resting on anything. Keep the middle open and uncluttered: level icons
         are drawn on top by code. No signs, no flags, no markers.
```

### Lote D — Tiles del tablero

Estos son los más delicados: **tienen que embaldosar sin costuras**. Si salen con sombra
proyectada o perspectiva, se van a ver las juntas en el tablero.

```
A square plasticine floor tile with softly rounded corners, seen in perfect top-down
orthographic view (straight from above, NO perspective), matte clay surface. All four
edges perfectly straight and flush so the tile can be repeated seamlessly with no visible
seams. No cast shadow outside the tile itself.

  tile_head → bright glowing emerald green, freshly energized and luminous.
  tile_body → the same emerald green but dimmer, darker and calm.
```

### §2.b — El fondo del cuarto (`assets/cuarto_bg.png`) · `1200x900`

Es el fondo donde se juega, no una ilustración: **el personaje camina encima y los 14 muebles
se dibujan por código**. Tiene tres restricciones que ninguna otra imagen tiene.

> 🚨 **1. Perspectiva plana, NO la del login.** El login es una habitación en perspectiva, con
> esquina y piso que se aleja. El cuarto **no puede serlo**: los 12 muebles ya generados son de
> vista frontal plana. Si el fondo trae perspectiva, hay que rehacerlos todos.
>
> 🚨 **2. La línea pared/piso va al tercio superior.** Las posiciones de los 14 muebles están
> calibradas contra el fondo actual, que tiene el horizonte ahí. Si se mueve, todo el cuarto
> queda descolocado.
>
> 🚨 **3. Vacío en el centro.** Nada de cama, alfombra, estantes ni juguetes: eso lo pone el
> código. Sólo pared, piso y decoración fija pegada a los bordes.

**Adjuntá `assets/fondos/login.png` como referencia de estilo** — es lo que hace que combinen.
Usá el preámbulo de fondos (§Lote C), con esta escena:

```
An empty children's bedroom sculpted in plasticine, in the SAME art style, SAME warm
terracotta color palette and SAME golden sunset lighting as the reference image.

FLAT STAGE LAYOUT — this is not a perspective room
Build it like a flat theatre backdrop seen straight from the front, with NO depth:
- The upper THIRD of the image is the back WALL, seen face-on as a flat plane.
- The lower TWO THIRDS is the FLOOR, also facing the viewer as a flat plane.
- The horizontal line where the wall meets the floor must sit at roughly 1/3 down
  from the top, running straight across the full width.
- NO corner, NO side walls, NO receding floorboards, NO vanishing point, NO ceiling,
  NO converging lines. The camera does not look into the room — it looks AT it.

WHAT GOES IN IT
- The wall: warm terracotta clay, softly textured, with the same sunlit glow as the
  reference. On the RIGHT side, a clay window with a golden sunset outside and a
  gingham curtain, matching the reference window closely.
- The floor: warm clay in a slightly different tone from the wall, plain and even,
  with a soft sculpted texture. A simple baseboard strip where wall meets floor.

KEEP IT EMPTY
The whole center and the entire floor must stay COMPLETELY BARE. No bed, no rug, no
shelves, no toys, no teddy bear, no plants, no pictures, no lamps, no furniture of
any kind. A character and all the furniture are drawn on top of this later. Only the
window (and its curtain) may sit against the wall, pushed to the right edge.
```

> **Después de generarla:** el fondo se estira a 800x600, así que la línea pared/piso te tiene
> que quedar cerca de `y≈190` en coordenadas del juego. Si te queda corrida, avisame y reajusto
> las 14 posiciones — es un solo bloque en `RoomScene`.

### Lote E — El protagonista · **PREÁMBULO PROPIO, no uses el de objetos**

> 🚨 Tercera vez que aplica la misma lección: el preámbulo de objetos dice literalmente
> *"NOT a character, NO face, NO limbs, do NOT anthropomorphize"*. Para el protagonista es
> **exactamente lo contrario**. Usá este prompt entero y solo, en una conversación nueva.

**El personaje se ve CHIQUITO** — unos 32×48 píxeles en pantalla, más o menos como el pulgar de
un chico. Todo el detalle fino se pierde. Lo único que sobrevive a ese tamaño es la **silueta**
y los **bloques de color**. Por eso el prompt insiste tanto en eso.

```
You are designing the main playable character for a children's video game.

STYLE
Handmade PLASTICINE / CLAYMATION, stop-motion look (Wallace & Gromit, Pingu).
Matte clay surface with subtle fingerprints and sculpting marks. Absolutely no gloss.
Soft rounded edges, no hard black outlines. Soft warm diffuse light from above-front.
NOT flat vector art. NOT a glossy 3D render. NOT pixel art. NOT a photograph.

THE CHARACTER
A cheerful, friendly child, around 7 years old. Cute chibi proportions: a big rounded
head roughly 1/3 of the total height, a small chunky body, short stubby arms and legs.
Simple happy face: two small dark dot eyes and a small friendly smile. Nothing else on
the face — no nose, no eyebrows, no ears detail, no teeth.
Warm, kind and approachable. A child aged 6-8 should instantly want to BE this character.

READABILITY AT TINY SIZE — the most important constraint
This sprite will be displayed at roughly 32x48 pixels, very small on screen.
- Build the character from a few BIG, BOLD, SIMPLE shapes. No fine detail whatsoever.
- No patterns, no stripes, no text on clothing, no tiny accessories, no jewelry,
  no shoelaces, no buttons, no pockets.
- Use FLAT, STRONG, SATURATED color blocks so each body part reads as a separate shape.
- The silhouette alone must be recognizable as a child.
- Clothing must be a bright saturated color that stands out against warm brown wood
  flooring and cream walls. Avoid brown, beige, tan and any muddy earth tone.

POSE AND FRAMING
Standing upright, facing the viewer straight on, arms relaxed at the sides, feet
together on the ground. Full body, head to feet, complete and fully inside the frame,
nothing cropped. Neutral idle stance — not walking, not jumping, not waving, not
posing dynamically. Centered, with a small even margin around the figure.

BACKGROUND
COMPLETELY FLAT uniform neutral WHITE (#FFFFFF), edge to edge. No gradient, no texture,
no vignette. NO cast shadow, NO contact shadow, NO ground shadow under the feet — the
character must appear to float, isolated, touching nothing.

LIGHTING
Lit as if floating alone in neutral empty space. NO colored light bouncing off the
background onto the character. NO colored spill, tint, glow, halo or rim light on the
edges. Colors must stay pure and true right up to the silhouette, which must be a clean
crisp cut.

FORBIDDEN
NO text, NO letters, NO numbers, NO logos, NO watermark, NO signature, NO frame,
NO border, NO multiple views, NO turnaround sheet, NO variations grid, NO props,
NO scenery, NO sparkle, NO glint, NO decorative star.

OUTPUT: one single image, square, 1024x1024.

CHARACTER: <línea de abajo>
```

**Las dos variantes:**

```
niño → A little BOY with short tousled dark hair, wearing a bright cyan-blue t-shirt
       and simple mustard-yellow shorts. Cheerful and curious.

niña → A little GIRL with two short pigtails of dark hair, wearing a bright coral-pink
       t-shirt and simple teal-green shorts. Cheerful and curious.
```

> **Generá los dos en la MISMA conversación, uno después del otro**, y para el segundo pedile
> explícitamente: `Same art style, same proportions, same head size, same height and same
> camera as the previous character — only the hair and clothing colors change.`
> Si los generás por separado te van a salir dos personajes de mundos distintos, y como el chico
> va a poder elegir cuál usar, se tienen que ver como hermanos.

**Si después querés la caminata**, pedí en esa misma conversación 4 poses más por personaje,
siempre con `Same character, same style, same size, same camera distance`:

```
Seen from BEHIND, walking away from the viewer.
Seen from the LEFT side, walking left in profile.
Seen from the RIGHT side, walking right in profile.
Seen from the FRONT, mid-stride walking toward the viewer.
```

Y ojo con el montaje: ver §4.

---

## 3. Después de generar: recortar el fondo

Gemini **no devuelve PNG con transparencia**, así que hay que recortar. Herramientas:
**Canva**, **remove.bg** o **photopea.com** (gratis, en el navegador).

### Por qué el fondo es BLANCO y no magenta

La primera versión de este documento pedía fondo magenta `#FF00FF`. **Era un error** — es una
técnica de *chroma key*, de cuando el recorte se hacía por color. Los recortadores de hoy (Canva,
remove.bg) son de IA: detectan el objeto, no el color de fondo. No necesitan un color chillón.

Y el magenta hace daño activo: el modelo lo trata como **luz de escena** y la rebota sobre la
plastilina, dejando un **halo rosado en los bordes** del objeto. Al recortar, ese halo se queda
pegado y no hay forma limpia de sacarlo. Con blanco neutro, si hay rebote es blanco — invisible.

### Si igual te sale contaminado

1. **Regenerá pidiendo explícitamente lo que falló** — el prompt ya lo trae, pero podés reforzarlo:
   `The bottom edge of the object must have no pink or colored tint. No shadow underneath.`
2. Si es sólo un borde finito: en Photopea, `Selección → Modificar → Contraer 2px` antes de recortar.
3. **Nunca aceptes una pieza con halo.** Sobre el fondo azul noche `#0d0d1f` del puzzle, un borde
   rosado se ve muchísimo más que sobre el cuadriculado del editor. Es más barato regenerar.

Los fondos (Lote C) no necesitan recorte: van opacos.

---

## 4. El personaje: no lo pidas como spritesheet

Gemini **no puede** generar una grilla de 4×5 con el personaje coherente y alineado al píxel en
frames de 32×48. Va a salir mal. Tres caminos, de más simple a más caro:

1. **Dejar el placeholder vectorial.** Ya funciona hoy y `RoomScene` lo dibuja solo. No es urgente.
2. **Un personaje quieto, sin animación.** Pedile a Gemini *un solo* dibujo del nene de frente
   (`512x512`, fondo blanco), lo escalás a 32×48 y cambiás `SpriteConfig.personaje` de spritesheet
   a imagen simple. Se pierde la caminata, se gana un personaje real.
3. **Generar las 5 poses por separado** (4 direcciones + idle) y montarlas a mano en la grilla con
   Photopea. Es el resultado bueno, pero es trabajo manual.

Mi recomendación: **(1) por ahora**. Los 6 iconos del Lote A mueven mucho más la aguja para un chico
que no lee, y cuestan una décima parte del esfuerzo.

---

## 5. Orden sugerido

1. **Lote A (iconos)** — 6 imágenes, máximo impacto: sacan texto y números de la pantalla
2. **Lote D (tiles)** — 2 imágenes, terminan de vestir el tablero
3. **Lote B (muebles)** — 11 imágenes, la tienda deja de vender cosas sin dibujo
4. **Lote C (fondos)** — 3 imágenes, el `puzzle` es el más delicado
5. **Personaje** — al final, con calma
