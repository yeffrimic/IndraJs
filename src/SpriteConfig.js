// SpriteConfig.js — control central de assets
// Cuando tengas tus sprites:
//   1. Ponés los archivos en assets/
//   2. Cambiás USE_SPRITES a true
//   3. Listo — el juego los usa automáticamente
//
// `listo: false` = el arte todavía no existe. No se precarga (evita 404s en consola)
// y la escena cae al dibujo vectorial. Cuando llegue el archivo, borrás esa línea.
// Esta lista es, de hecho, el checklist de arte pendiente.

// ── tipografía ──
// Fuente redondeada infantil (se carga en index.html). El stack termina en fuentes
// de sistema para que degrade solo si no hay red.
export const FUENTE = '"Fredoka", "Baloo 2", "Comic Sans MS", "Trebuchet MS", sans-serif';

const SpriteConfig = {

  // ── flag principal ──
  USE_SPRITES: true,

  // ── fondos de cada escena ──
  fondos: {
    login:  { key: 'fondo_login',  path: 'assets/fondos/login.png'  },
    puzzle: { key: 'fondo_puzzle', path: 'assets/fondos/puzzle.png' },
    store:  { key: 'fondo_store',  path: 'assets/fondos/store.png'  },
    select: { key: 'fondo_select', path: 'assets/fondos/select.png' },
  },

  // ── cuadros del grid del puzzle ──
  grid: {
    tile:      { key: 'tile',      path: 'assets/grid/tile.png'      },
    tile_head: { key: 'tile_head', path: 'assets/grid/tile_head.png', listo: false },
    tile_body: { key: 'tile_body', path: 'assets/grid/tile_body.png', listo: false },
    tile_goal: { key: 'tile_goal', path: 'assets/grid/tile_goal.png' },
  },

  // ── personajes jugables ──
  // Dos personajes ('nino' | 'nina') x cuatro direcciones. Imágenes sueltas de 500x500
  // (no spritesheet): cada pose es un PNG y se cambia la textura al girar.
  // Clave plana `<personaje>_<direccion>` para que la precarga genérica las tome sola.
  //
  // `anclaY`     = dónde caen los pies dentro del PNG, como fracción del alto.
  // `altoFigura` = alto real de la figura en px.
  // Los 8 dibujos traen aire transparente distinto abajo (de 42px a 63px) y figuras de
  // alto distinto (368 a 393). Sin estos dos datos el nene se hundiría o crecería al
  // girar. Están medidos sobre el canal alfa: si reemplazás un PNG, hay que remedirlo.
  ALTO_EN_JUEGO: 80,        // cuántos píxeles mide el chico en el cuarto

  personajes: {
    nino_abajo:  { key: 'pj_nino_abajo',  path: 'assets/personajes/nino.png',         anclaY: 0.892, altoFigura: 377 },
    nino_arriba: { key: 'pj_nino_arriba', path: 'assets/personajes/nino_arriba.png',  anclaY: 0.902, altoFigura: 381 },
    nino_izq:    { key: 'pj_nino_izq',    path: 'assets/personajes/nino_izq.png',     anclaY: 0.916, altoFigura: 393 },
    nino_der:    { key: 'pj_nino_der',    path: 'assets/personajes/nino_der.png',     anclaY: 0.900, altoFigura: 381 },

    nina_abajo:  { key: 'pj_nina_abajo',  path: 'assets/personajes/nina.png',         anclaY: 0.874, altoFigura: 368 },
    nina_arriba: { key: 'pj_nina_arriba', path: 'assets/personajes/nina_arriba.png',  anclaY: 0.884, altoFigura: 373 },
    nina_izq:    { key: 'pj_nina_izq',    path: 'assets/personajes/nina_izq.png',     anclaY: 0.888, altoFigura: 375 },
    nina_der:    { key: 'pj_nina_der',    path: 'assets/personajes/nina_der.png',     anclaY: 0.888, altoFigura: 375 },
  },

  DIRECCIONES: ['abajo', 'arriba', 'izq', 'der'],

  // pose de un personaje en una dirección (cae a 'abajo' si no existe)
  pose(nombre, dir) {
    return this.personajes[`${nombre}_${dir}`] || this.personajes[`${nombre}_abajo`] || null;
  },

  // escala para que esa pose mida ALTO_EN_JUEGO, sin importar su recorte
  escalaPose(nombre, dir) {
    const p = this.pose(nombre, dir);
    return p ? this.ALTO_EN_JUEGO / p.altoFigura : 1;
  },

  // ── cuarto ──
  cuarto: {
    bg:        { key: 'cuarto_bg',   path: 'assets/cuarto_bg.png'   },
    workbench: { key: 'workbench',   path: 'assets/workbench.png',  escala: 0.9   },
    tienda:    { key: 'tienda',      path: 'assets/tienda.png',     escala: 0.3   },
  },

  // ── muebles comprables en la tienda ──
  // El arte es de 500x500; `escala` lo baja al tamaño real en el cuarto (800x600).
  // Calibrable a ojo con ?editroom.
  muebles: {
    estante:    { key: 'mueble_estante',    path: 'assets/muebles/estante.png',    escala: 0.24 },
    repisa:     { key: 'mueble_repisa',     path: 'assets/muebles/repisa.png',     escala: 0.19 },  // el PNG es 677x369, no 500x500
    vitrina:    { key: 'mueble_vitrina',    path: 'assets/muebles/vitrina.png',    escala: 0.30 },
    ropero:     { key: 'mueble_ropero',     path: 'assets/muebles/ropero.png',     escala: 0.32 },
    sillon:     { key: 'mueble_sillon',     path: 'assets/muebles/sillon.png',     escala: 0.4 },
    sillon_ind: { key: 'mueble_sillon_ind', path: 'assets/muebles/sillon_ind.png', escala: 0.3 },
    banquito:   { key: 'mueble_banquito',   path: 'assets/muebles/banquito.png',   escala: 0.16 },
    planta:     { key: 'mueble_planta',     path: 'assets/muebles/planta.png',     escala: 0.2 },
    lampara:    { key: 'mueble_lampara',    path: 'assets/muebles/lampara.png',    escala: 0.22 },
    mesita:     { key: 'mueble_mesita',     path: 'assets/muebles/mesita.png',     escala: 0.20 },
    peluche:    { key: 'mueble_peluche',    path: 'assets/muebles/peluche.png',    escala: 0.16 },
    baul:       { key: 'mueble_baul',       path: 'assets/muebles/baul.png',       escala: 0.24 },
    pelota:     { key: 'mueble_pelota',     path: 'assets/muebles/pelota.png',     escala: 0.14, listo: false },
    poster:     { key: 'mueble_poster',     path: 'assets/muebles/poster.png',     escala: 0.18 },
    reloj:      { key: 'mueble_reloj',      path: 'assets/muebles/reloj.png',      escala: 0.14 },
    cuadro:     { key: 'mueble_cuadro',     path: 'assets/muebles/cuadro.png',     escala: 0.16 },
    tapete:     { key: 'mueble_tapete',     path: 'assets/muebles/tapete.png',     escala: 0.34 },
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
    // los iconos se dibujan siempre con setDisplaySize() en cada escena, así que
    // su `escala` no se usa — el tamaño lo fija quien los coloca.
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
  CATS_IMAGEN: ['fondos', 'grid', 'cuarto', 'muebles', 'componentes', 'serpiente', 'ui', 'personajes'],

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

    // todas las categorías de imágenes simples (genérico: agregar un asset lo precarga solo).
    // Se saltean los marcados con `listo: false` — su arte todavía no existe.
    this.CATS_IMAGEN.forEach(cat => {
      Object.values(this[cat] || {}).forEach(a => {
        if (a && a.key && a.path && a.listo !== false) images.push({ key: a.key, path: a.path });
      });
    });

    // (los personajes son imágenes simples: ya entraron por CATS_IMAGEN)

    return { images, spritesheets };
  },

};

export default SpriteConfig;
