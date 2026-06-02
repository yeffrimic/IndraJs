// GameState.js — estado global persistente entre escenas

const GameState = {

  // ── perfil ──
  username: null,

  // ── progreso ──
  puntosTotal: 0,
  nivelesCompletados: [],   // [0,1,2,...] índices completados
  mejorPuntaje: {},         // { nivelIdx: mejorPuntajeLogrado } — para premiar mejoras
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

  // ── progreso ──
  // Otorga puntos/monedas por el MEJOR puntaje logrado en cada nivel:
  //  - primera vez: otorga el puntaje completo y consume un nivel del día.
  //  - replay que mejora el récord: otorga solo la DIFERENCIA (exprimir el óptimo).
  //  - replay igual o peor: no otorga nada.
  // Devuelve los puntos efectivamente otorgados (0 si no hubo mejora).
  completarNivel(nivelIdx, puntos) {
    const primera   = !this.nivelesCompletados.includes(nivelIdx);
    const mejorPrev = this.mejorPuntaje[nivelIdx] || 0;
    let otorgados   = 0;

    if (primera) {
      this.nivelesCompletados.push(nivelIdx);
      this.nivelesHoy += 1;
      this.ultimoNivelDesbloqueado = Math.max(this.ultimoNivelDesbloqueado, nivelIdx + 1);
      otorgados = puntos;
    } else if (puntos > mejorPrev) {
      otorgados = puntos - mejorPrev;   // solo la diferencia sobre el récord anterior
    }

    if (puntos > mejorPrev) this.mejorPuntaje[nivelIdx] = puntos;
    if (otorgados > 0) {
      this.puntosTotal += otorgados;
      this.monedas     += otorgados;    // monedas = puntos (récord no se toca al gastar)
    }
    this._guardar();
    return otorgados;
  },

  nivelDesbloqueado(idx) {
    return idx <= this.ultimoNivelDesbloqueado;
  },

  puedeJugarHoy() {
    return this.nivelesHoy < this.MAX_NIVELES_DIA + this.energiaExtraHoy;
  },

  nivelesRestantesHoy() {
    return Math.max(0, this.MAX_NIVELES_DIA + this.energiaExtraHoy - this.nivelesHoy);
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
      puntosTotal:            this.puntosTotal,
      mejorPuntaje:           this.mejorPuntaje,
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
    const raw = localStorage.getItem(this._clave());
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      this.puntosTotal             = data.puntosTotal             || 0;
      this.mejorPuntaje            = data.mejorPuntaje            || {};
      // retro-compat: perfiles viejos arrancan con monedas = su récord
      this.monedas                 = data.monedas ?? data.puntosTotal ?? 0;
      this.desbloqueos             = data.desbloqueos             || [];
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
