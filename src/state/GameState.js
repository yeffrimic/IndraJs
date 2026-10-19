// GameState.js — estado global persistente entre escenas

const GameState = {

  // ── perfil ──
  username: null,
  personaje: 'nino',        // 'nino' | 'nina' — sprite con el que juega este perfil

  // ── progreso ──
  puntosTotal: 0,
  nivelesCompletados: [],   // [0,1,2,...] índices completados
  mejorPuntaje: {},         // { nivelIdx: mejorPuntajeLogrado } — para premiar mejoras
  estrellas: {},            // { nivelIdx: mejoresEstrellas (1-3) } — maestría por nivel

  // Tiempos por nivel, en segundos: { nivelIdx: { mejor, ultimo, intentos } }.
  // Se guarda un resumen y no el historial completo para no inflar el localStorage;
  // alcanza para sacar el tiempo típico de cada nivel por usuario cuando esto se
  // suba a una base de datos.
  tiempos: {},
  ultimoNivelDesbloqueado: 0,

  // ── tienda ──
  monedas: 0,               // saldo gastable (separado del récord puntosTotal)
  desbloqueos: [],          // ids de compras permanentes (packs, muebles, mejoras)
  energiaExtraHoy: 0,       // niveles extra comprados para hoy (se resetea por día)
  pistas: 3,                // saldo de pistas (revelan el orden en el puzzle)

  // ── sesión diaria ──
  fechaHoy: null,
  nivelesHoy: 0,
  MAX_NIVELES_DIA: 10,

  // ── nivel activo ──
  nivelActual: 0,

  // ── login ──
  login(nombre) {
    this.username = nombre.trim();
    this._cargarPerfil();
    this._verificarDia();
    this._guardar();
  },

  estaLogueado() {
    return !!this.username;
  },

  // la primera vez que entra un perfil, el chico elige con quién juega (LoginScene)
  elegirPersonaje(personaje) {
    this.personaje = personaje === 'nina' ? 'nina' : 'nino';
    this._guardar();
  },

  // ── economía ──
  // Las monedas dependen SOLO de las estrellas, no del puntaje. Antes eran iguales
  // al puntaje (300 - movimientos*5), y con esa fórmula jugar mal rendía el 84% de
  // jugar perfecto: las estrellas no servían para nada y en 10 niveles ya alcanzaba
  // para comprar medio juego. Así, en cambio, mejorar de 1★ a 3★ casi triplica lo
  // que entra, y los precios de la tienda se pueden atar a un nivel de juego
  // concreto (ver tienda.js).
  MONEDAS_POR_ESTRELLA: { 1: 25, 2: 50, 3: 70 },

  monedasDe(estrellas) {
    return this.MONEDAS_POR_ESTRELLA[estrellas] || 0;
  },

  // ── progreso ──
  // Otorga puntos por el MEJOR puntaje y monedas por las MEJORES estrellas:
  //  - primera vez: otorga todo y consume un nivel del día.
  //  - replay que mejora: otorga solo la DIFERENCIA (exprimir el óptimo).
  //  - replay igual o peor: no otorga nada.
  // Registra también las estrellas, porque necesita las anteriores para la
  // diferencia; llamar a registrarEstrellas después es inofensivo (toma el máximo).
  // Devuelve { puntos, monedas } — lo efectivamente otorgado (0 si no hubo mejora).
  completarNivel(nivelIdx, puntos, estrellas = 1) {
    this._verificarDia();   // por si se cruzó la medianoche jugando
    const primera   = !this.nivelesCompletados.includes(nivelIdx);
    const mejorPrev = this.mejorPuntaje[nivelIdx] || 0;
    const estrPrev  = this.estrellas[nivelIdx] || 0;
    let otorgados   = 0;
    let monedas     = 0;

    if (primera) {
      this.nivelesCompletados.push(nivelIdx);
      this.nivelesHoy += 1;
      this.ultimoNivelDesbloqueado = Math.max(this.ultimoNivelDesbloqueado, nivelIdx + 1);
      otorgados = puntos;
      monedas   = this.monedasDe(estrellas);
    } else {
      if (puntos > mejorPrev) otorgados = puntos - mejorPrev;
      // solo paga la mejora de estrellas: rejugar igual no da monedas
      if (estrellas > estrPrev) monedas = this.monedasDe(estrellas) - this.monedasDe(estrPrev);
    }

    if (puntos    > mejorPrev) this.mejorPuntaje[nivelIdx] = puntos;
    if (estrellas > estrPrev)  this.estrellas[nivelIdx]    = estrellas;
    if (otorgados > 0) this.puntosTotal += otorgados;   // récord: no se toca al gastar
    if (monedas   > 0) this.monedas     += monedas;
    this._guardar();
    return { puntos: otorgados, monedas };
  },

  nivelDesbloqueado(idx) {
    return idx <= this.ultimoNivelDesbloqueado;
  },

  // ── estrellas (maestría por nivel) ──
  // guarda el mejor número de estrellas logrado y lo devuelve
  registrarEstrellas(nivelIdx, estrellas) {
    const prev = this.estrellas[nivelIdx] || 0;
    if (estrellas > prev) { this.estrellas[nivelIdx] = estrellas; this._guardar(); }
    return Math.max(prev, estrellas);
  },

  totalEstrellas() {
    return Object.values(this.estrellas).reduce((a, b) => a + b, 0);
  },

  // ── tiempos por nivel ──
  // Registra cuánto tardó esta partida y devuelve el resumen del nivel.
  registrarTiempo(nivelIdx, segundos) {
    const s = Math.max(0, Math.round(segundos));
    const prev = this.tiempos[nivelIdx] || { mejor: null, ultimo: null, intentos: 0 };
    this.tiempos[nivelIdx] = {
      mejor:    prev.mejor === null ? s : Math.min(prev.mejor, s),
      ultimo:   s,
      intentos: prev.intentos + 1,
    };
    this._guardar();
    return this.tiempos[nivelIdx];
  },

  tiempoDe(nivelIdx) {
    return this.tiempos[nivelIdx] || null;
  },

  // mm:ss para mostrar en pantalla
  formatearTiempo(segundos) {
    const s = Math.max(0, Math.round(segundos));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  },

  // Todo lo que consulta el cupo diario verifica primero la fecha. Antes eso sólo
  // pasaba al iniciar sesión, así que si el juego quedaba abierto pasada la
  // medianoche el contador no se reiniciaba nunca: al día siguiente seguía
  // bloqueado hasta recargar la página.
  puedeJugarHoy() {
    this._verificarDia();
    return this.nivelesHoy < this.cupoDelDia();
  },

  nivelesRestantesHoy() {
    this._verificarDia();
    return Math.max(0, this.cupoDelDia() - this.nivelesHoy);
  },

  // niveles jugables hoy: el cupo base más la energía comprada
  cupoDelDia() {
    return this.MAX_NIVELES_DIA + this.energiaExtraHoy;
  },

  // ── tienda ──
  tieneDesbloqueo(id) {
    return this.desbloqueos.includes(id);
  },

  usarPista() {
    if (this.pistas <= 0) return false;
    this.pistas -= 1;
    this._guardar();
    return true;
  },

  puedeComprar(item) {
    if (!item || item.proximamente) return false;
    if (item.unico && this.tieneDesbloqueo(item.id)) return false;
    return this.monedas >= item.precio;
  },

  comprar(item) {
    if (!this.puedeComprar(item)) return false;
    this.monedas -= item.precio;
    switch (item.tipo) {
      case 'energia':
        this.energiaExtraHoy += item.cantidad;
        break;
      case 'pista':
        this.pistas += item.cantidad;
        break;
      case 'pack':
      case 'mueble':
      case 'mejora':
        if (!this.tieneDesbloqueo(item.id)) this.desbloqueos.push(item.id);
        break;
    }
    this._guardar();
    return true;
  },

  // ── persistencia ──
  _clave() {
    return `circuito_perfil_${this.username}`;
  },

  _guardar() {
    if (!this.username) return;
    const data = {
      username:               this.username,
      personaje:              this.personaje,
      puntosTotal:            this.puntosTotal,
      mejorPuntaje:           this.mejorPuntaje,
      estrellas:              this.estrellas,
      tiempos:                this.tiempos,
      monedas:                this.monedas,
      desbloqueos:            this.desbloqueos,
      energiaExtraHoy:        this.energiaExtraHoy,
      pistas:                 this.pistas,
      nivelesCompletados:     this.nivelesCompletados,
      ultimoNivelDesbloqueado: this.ultimoNivelDesbloqueado,
      fechaHoy:               this.fechaHoy,
      nivelesHoy:             this.nivelesHoy,
    };
    localStorage.setItem(this._clave(), JSON.stringify(data));
  },

  _cargarPerfil() {
    // Partir siempre de cero: sin esto, al cerrar sesión y entrar con un perfil NUEVO
    // se heredaba en memoria el progreso del perfil anterior (y se guardaba como propio).
    Object.assign(this, {
      personaje: 'nino', puntosTotal: 0, mejorPuntaje: {}, estrellas: {}, tiempos: {},
      monedas: 0, desbloqueos: [], energiaExtraHoy: 0, pistas: 3,
      nivelesCompletados: [], ultimoNivelDesbloqueado: 0, fechaHoy: null, nivelesHoy: 0,
    });
    const raw = localStorage.getItem(this._clave());
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      this.personaje               = data.personaje               || 'nino';
      this.puntosTotal             = data.puntosTotal             || 0;
      this.mejorPuntaje            = data.mejorPuntaje            || {};
      this.estrellas               = data.estrellas               || {};
      this.tiempos                 = data.tiempos                 || {};
      // retro-compat: perfiles viejos arrancan con monedas = su récord
      this.monedas                 = data.monedas ?? data.puntosTotal ?? 0;
      this.desbloqueos             = data.desbloqueos             || [];
      // retro-compat: el viejo 'pack_intermedios' se reemplazó por 'pack_tablero6'
      // (los 3 niveles sueltos pasaron a ser el tablero 6x6 con sus 30 niveles).
      // Quien ya lo había comprado no tiene que volver a pagarlo.
      if (this.desbloqueos.includes('pack_intermedios') && !this.desbloqueos.includes('pack_tablero6')) {
        this.desbloqueos.push('pack_tablero6');
      }
      this.energiaExtraHoy         = data.energiaExtraHoy         || 0;
      this.pistas                  = data.pistas ?? 3;
      this.nivelesCompletados      = data.nivelesCompletados      || [];
      this.ultimoNivelDesbloqueado = data.ultimoNivelDesbloqueado || 0;
      this.fechaHoy                = data.fechaHoy                || null;
      this.nivelesHoy              = data.nivelesHoy              || 0;
    } catch(e) { /* perfil nuevo */ }
  },

  _verificarDia() {
    const hoy = new Date().toDateString();
    if (this.fechaHoy !== hoy) {
      // nuevo día — resetear contador diario y la energía comprada (es de uso diario)
      this.fechaHoy        = hoy;
      this.nivelesHoy      = 0;
      this.energiaExtraHoy = 0;
      this._guardar();
    }
  },

};

export default GameState;
