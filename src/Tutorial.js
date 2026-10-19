// Tutorial.js — el recorrido guiado de la primera vez (sólo perfiles nuevos).
//
// Es una máquina de pasos que vive en GameState.tutorial (por perfil, persistida):
//
//   inicio  → el cuarto muestra a un "fantasma" del personaje caminando al banco de
//             trabajo y la manito sobre el botón ▶. Mapa y tienda ocultos.
//   puzzle  → niveles 1 a 5. El nivel 1 arranca con una demostración: el juego lo
//             resuelve solo, la manito aprieta cada flecha. Sin mapa; al ganar sólo ▶.
//   tienda  → al ganar el 5º: vuelta al cuarto, aparece la tienda con fiesta y la
//             manito la señala. En la tienda sólo hay 3 regalos (gratis, uno).
//   casa    → elegido el regalo: en el cuarto aparece el mueble con confeti y se
//             destapa el resto (mapa, etc.).
//   listo   → juego libre con las reglas de siempre (cupo diario, packs, precios).
//
// Nada de esto usa texto: todo es manito, piedritas, fantasma y animación.

export const PASO = { INICIO: 'inicio', PUZZLE: 'puzzle', TIENDA: 'tienda', CASA: 'casa', LISTO: 'listo' };

export const NIVELES_TUTORIAL = 5;

// El regalo de bienvenida: tres muebles baratos y con arte. Uno, gratis. Así la primera
// visita a la tienda enseña a comprar sin tocar la economía calibrada (ver tienda.js).
export const REGALOS = ['mueble_banquito', 'mueble_planta', 'mueble_peluche'];

// Manito que señala (con un saltito). Devuelve el objeto; .irA(x, y) la mueve.
export function mano(scene, x, y, { depth = 450, dx = 14, dy = 40 } = {}) {
  const m = scene.add.text(x + dx, y + dy, '👆', { fontSize: '46px' }).setOrigin(0.5).setDepth(depth);
  m.setScale(0).setAlpha(0);
  scene.tweens.add({ targets: m, scale: 1, alpha: 1, duration: 320, ease: 'Back.easeOut' });
  let bote = scene.tweens.add({ targets: m, y: m.y - 14, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 320 });
  m.irA = (nx, ny, dur = 260) => {
    bote.stop();
    scene.tweens.add({
      targets: m, x: nx + dx, y: ny + dy, duration: dur, ease: 'Quad.easeInOut',
      onComplete: () => { bote = scene.tweens.add({ targets: m, y: m.y - 14, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); },
    });
  };
  m.apretar = () => {
    scene.tweens.add({ targets: m, scaleX: 0.85, scaleY: 0.85, duration: 90, yoyo: true });
  };
  return m;
}

// Piedritas en L (primero horizontal, después vertical) entre dos puntos: "por acá".
export function piedritas(scene, desde, hasta, color = 0xf6c945, depth = 5) {
  const g = scene.add.graphics().setDepth(depth);
  const puntos = [];
  const paso = 26;
  const dx = hasta.x - desde.x, dy = hasta.y - desde.y;
  for (let d = paso; d < Math.abs(dx); d += paso) puntos.push({ x: desde.x + Math.sign(dx) * d, y: desde.y });
  for (let d = 0; d < Math.abs(dy); d += paso) puntos.push({ x: hasta.x, y: desde.y + Math.sign(dy) * d });
  puntos.forEach(p => {
    g.fillStyle(0x5a3a1a, 0.35); g.fillEllipse(p.x, p.y + 3, 14, 7);
    g.fillStyle(color, 1);       g.fillCircle(p.x, p.y, 6);
    g.fillStyle(0xffffff, 0.55); g.fillCircle(p.x - 2, p.y - 2, 2);
  });
  scene.tweens.add({ targets: g, alpha: { from: 0.45, to: 1 }, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  return g;
}
