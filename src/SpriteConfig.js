// SpriteConfig.js — control central de assets
// Cuando tengas tus sprites:
//   1. Ponés los archivos en assets/
//   2. Cambiás USE_SPRITES a true
//   3. Listo — el juego los usa automáticamente

const SpriteConfig = {

  // ── flag principal ──
  USE_SPRITES: true,

  // ── fondos de cada escena ──
  fondos: {
    login:  { key: 'fondo_login',  path: 'assets/fondos/login.png'  },
    room:   { key: 'fondo_room',   path: 'assets/fondos/room.png'   },
    puzzle: { key: 'fondo_puzzle', path: 'assets/fondos/puzzle.png' },
    store:  { key: 'fondo_store',  path: 'assets/fondos/store.png'  },
    select: { key: 'fondo_select', path: 'assets/fondos/select.png' },
  },

  // ── cuadros del grid del puzzle ──
  grid: {
    tile:      { key: 'tile',      path: 'assets/grid/tile.png'      },
    tile_head: { key: 'tile_head', path: 'assets/grid/tile_head.png' },
    tile_body: { key: 'tile_body', path: 'assets/grid/tile_body.png' },
    tile_goal: { key: 'tile_goal', path: 'assets/grid/tile_goal.png' },
  },

  // ── personaje ──
  personaje: {
    key:     'personaje',
    path:    'assets/personaje.png',
    frameW:  32,
    frameH:  48,
    escala:  1,
    anims: {
      idle:       { start: 0,  end: 3,  fps: 6  },
      walk_down:  { start: 4,  end: 7,  fps: 8  },
      walk_up:    { start: 8,  end: 11, fps: 8  },
      walk_left:  { start: 12, end: 15, fps: 8  },
      walk_right: { start: 16, end: 19, fps: 8  },
    }
  },

  // ── cuarto ──
  cuarto: {
    bg:        { key: 'cuarto_bg',   path: 'assets/cuarto_bg.png'   },
    workbench: { key: 'workbench',   path: 'assets/workbench.png',  escala: 1   },
    tienda:    { key: 'tienda',      path: 'assets/tienda.png',     escala: 1   },
    escritorio:{ key: 'escritorio',  path: 'assets/escritorio.png', escala: 1   },
    alfombra:  { key: 'alfombra',    path: 'assets/alfombra.png',   escala: 1   },
    estante:   { key: 'estante',     path: 'assets/estante.png',    escala: 1   },
  },

  // ── muebles comprables en la tienda (placeholder vectorial hasta tener pixel art) ──
  muebles: {
    planta:  { key: 'mueble_planta',  path: 'assets/muebles/planta.png',  escala: 1 },
    lampara: { key: 'mueble_lampara', path: 'assets/muebles/lampara.png', escala: 1 },
    poster:  { key: 'mueble_poster',  path: 'assets/muebles/poster.png',  escala: 1 },
    tapete:  { key: 'mueble_tapete',  path: 'assets/muebles/tapete.png',  escala: 1 },
  },

  // ── componentes del puzzle ──
  componentes: {
    bateria:    { key: 'comp_bat', path: 'assets/comp_bat.png',    escala: 0.8 },
    resistencia:{ key: 'comp_r',   path: 'assets/comp_r.png',      escala: 0.8 },
    capacitor:  { key: 'comp_c',   path: 'assets/comp_c.png',      escala: 0.8 },
    led:        { key: 'comp_led', path: 'assets/comp_led.png',    escala: 0.8 },
    switch:     { key: 'comp_sw',  path: 'assets/comp_sw.png',     escala: 0.8 },
    switch_on:  { key: 'comp_sw_on', path: 'assets/comp_sw_on.png',escala: 0.8 },
  },

  // ── serpiente ──
  serpiente: {
    cabeza:  { key: 'snake_head', path: 'assets/snake_head.png', escala: 1 },
    cuerpo:  { key: 'snake_body', path: 'assets/snake_body.png', escala: 1 },
    cola:    { key: 'snake_tail', path: 'assets/snake_tail.png', escala: 1 },
  },

  // ── UI ──
  ui: {
    btn_up:    { key: 'btn_up',    path: 'assets/ui/btn_up.png',    escala: 1 },
    btn_down:  { key: 'btn_down',  path: 'assets/ui/btn_down.png',  escala: 1 },
    btn_left:  { key: 'btn_left',  path: 'assets/ui/btn_left.png',  escala: 1 },
    btn_right: { key: 'btn_right', path: 'assets/ui/btn_right.png', escala: 1 },
    estrella_llena: { key: 'estrella_llena', path: 'assets/ui/estrella_llena.png', escala: 1 },
    estrella_vacia: { key: 'estrella_vacia', path: 'assets/ui/estrella_vacia.png', escala: 1 },
    moneda:    { key: 'moneda',    path: 'assets/ui/moneda.png',    escala: 1 },
    energia:   { key: 'energia',   path: 'assets/ui/energia.png',   escala: 1 },
    candado:   { key: 'candado',   path: 'assets/ui/candado.png',   escala: 1 },
    pista:     { key: 'pista',     path: 'assets/ui/pista.png',     escala: 1 },
  },

  // ── helpers ──

  // retorna true si USE_SPRITES está activo
  activo() {
    return this.USE_SPRITES;
  },

  // retorna el key del sprite si está activo, o null
  get(categoria, nombre) {
    if (!this.USE_SPRITES) return null;
    return this[categoria]?.[nombre]?.key || null;
  },

  // escala configurada de un asset (default 1)
  escalaDe(categoria, nombre) {
    return this[categoria]?.[nombre]?.escala ?? 1;
  },

  // categorías que son imágenes simples (para precarga genérica y helper)
  CATS_IMAGEN: ['fondos', 'grid', 'cuarto', 'muebles', 'componentes', 'serpiente', 'ui'],

  // Coloca un sprite si está disponible Y cargado; si no, ejecuta el dibujo vectorial.
  // Centraliza el patrón placeholder→pixel-art. Devuelve lo que se haya creado.
  //   SpriteConfig.colocar(scene, 'fondos', 'puzzle', x, y, () => scene.add.rectangle(...))
  colocar(scene, categoria, nombre, x, y, fallbackFn) {
    const key = this.get(categoria, nombre);
    if (key && scene.textures.exists(key)) {
      return scene.add.image(x, y, key).setScale(this.escalaDe(categoria, nombre));
    }
    return fallbackFn ? fallbackFn() : null;
  },

  // Fondo de pantalla completa: imagen estirada a (width,height) o un rectángulo de color.
  fondo(scene, nombre, width, height, colorFallback) {
    const key = this.get('fondos', nombre);
    if (key && scene.textures.exists(key)) {
      return scene.add.image(0, 0, key).setOrigin(0).setDisplaySize(width, height);
    }
    return scene.add.rectangle(0, 0, width, height, colorFallback).setOrigin(0);
  },

  // lista todos los assets a precargar según USE_SPRITES
  listarParaCargar() {
    if (!this.USE_SPRITES) return { images: [], spritesheets: [], audio: [] };

    const images = [];
    const spritesheets = [];

    // todas las categorías de imágenes simples (genérico: agregar un asset lo precarga solo)
    this.CATS_IMAGEN.forEach(cat => {
      Object.values(this[cat] || {}).forEach(a => {
        if (a && a.key && a.path) images.push({ key: a.key, path: a.path });
      });
    });

    // personaje como spritesheet
    spritesheets.push({
      key:    this.personaje.key,
      path:   this.personaje.path,
      frameW: this.personaje.frameW,
      frameH: this.personaje.frameH,
    });

    return { images, spritesheets };
  },

};

export default SpriteConfig;
