// GameState.js — estado global persistente entre escenas

const GameState = {

  // ── perfil ──
  username: null,

  // ── progreso ──
  puntosTotal: 0,
  nivelesCompletados: [],   // [0,1,2,...] índices completados
  ultimoNivelDesbloqueado: 0,

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
  completarNivel(nivelIdx, puntos) {
    if (!this.nivelesCompletados.includes(nivelIdx)) {
      this.nivelesCompletados.push(nivelIdx);
    }
    this.puntosTotal += puntos;
    this.nivelesHoy += 1;
    // desbloquear el siguiente
    this.ultimoNivelDesbloqueado = Math.max(
      this.ultimoNivelDesbloqueado,
      nivelIdx + 1
    );
    this._guardar();
  },

  nivelDesbloqueado(idx) {
    return idx <= this.ultimoNivelDesbloqueado;
  },

  puedeJugarHoy() {
    return this.nivelesHoy < this.MAX_NIVELES_DIA;
  },

  nivelesRestantesHoy() {
    return Math.max(0, this.MAX_NIVELES_DIA - this.nivelesHoy);
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
      this.nivelesCompletados      = data.nivelesCompletados      || [];
      this.ultimoNivelDesbloqueado = data.ultimoNivelDesbloqueado || 0;
      this.fechaHoy                = data.fechaHoy                || null;
      this.nivelesHoy              = data.nivelesHoy              || 0;
    } catch(e) { /* perfil nuevo */ }
  },

  _verificarDia() {
    const hoy = new Date().toDateString();
    if (this.fechaHoy !== hoy) {
      // nuevo día — resetear contador diario
      this.fechaHoy   = hoy;
      this.nivelesHoy = 0;
      this._guardar();
    }
  },

};

export default GameState;
