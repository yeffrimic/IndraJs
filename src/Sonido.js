// Sonido.js — efectos y música sintetizados con WebAudio.
//
// No hay archivos de audio: cada sonido se arma con osciladores en el momento.
// Así no hay nada que precargar ni licencias que revisar, y el tono es coherente
// en todo el juego (suaves, redondos, "de juguete"). Si algún día llegan sonidos
// grabados, se reemplaza el cuerpo de cada método y las escenas no se enteran.
//
// El AudioContext se crea recién en el primer sonido: los navegadores no dejan
// arrancar audio sin un gesto del usuario, y los sonidos siempre salen de un toque.
//
// La preferencia de silencio es del DISPOSITIVO, no del perfil (si el aula pide
// silencio, es para todos los chicos), por eso va suelta en localStorage como
// store_layout / room_layout y no dentro de GameState.

const CLAVE_SILENCIO = 'circuito_silencio';

// escala pentatónica de Do: cualquier combinación suena bien, ideal para melodías al azar
const PENTA = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00];

const Sonido = {

  ctx: null,
  master: null,
  silencio: false,
  _musicaTimer: null,
  _musicaBus: null,

  init() {
    try { this.silencio = localStorage.getItem(CLAVE_SILENCIO) === '1'; } catch (e) { /* sin storage */ }
  },

  _ctx() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.silencio ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  },

  alternarSilencio() {
    this.silencio = !this.silencio;
    try { localStorage.setItem(CLAVE_SILENCIO, this.silencio ? '1' : '0'); } catch (e) {}
    if (this.master) this.master.gain.setTargetAtTime(this.silencio ? 0 : 0.5, this.ctx.currentTime, 0.05);
    if (!this.silencio) this.arrancarMusica();
    return this.silencio;
  },

  // ── primitiva: una nota con envolvente de "golpecito" ──
  //   desliz = frecuencia final (glissando), retardo en segundos
  _tono(freq, dur, { tipo = 'sine', vol = 0.3, desliz = null, retardo = 0, destino = null } = {}) {
    const ctx = this._ctx();
    if (!ctx || this.silencio) return;
    const t0  = ctx.currentTime + retardo;
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.type = tipo;
    osc.frequency.setValueAtTime(freq, t0);
    if (desliz) osc.frequency.exponentialRampToValueAtTime(desliz, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(destino || this.master);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  },

  // ruido corto filtrado (para "fsss" de transición y chispazos)
  _ruido(dur, { vol = 0.15, filtro = 1800, retardo = 0 } = {}) {
    const ctx = this._ctx();
    if (!ctx || this.silencio) return;
    const n   = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ctx.createBufferSource();
    const bp  = ctx.createBiquadFilter();
    const g   = ctx.createGain();
    src.buffer = buf;
    bp.type = 'bandpass'; bp.frequency.value = filtro; bp.Q.value = 0.8;
    g.gain.value = vol;
    src.connect(bp); bp.connect(g); g.connect(this.master);
    src.start(ctx.currentTime + retardo);
  },

  // ── efectos ──
  click()   { this._tono(660, 0.08, { tipo: 'triangle', vol: 0.25, desliz: 520 }); },
  pop()     { this._tono(420, 0.10, { tipo: 'sine', vol: 0.35, desliz: 780 }); },
  // un paso de la serpiente: "plop" grave con un poquito de variación para que no canse
  paso()    { const f = 190 + Math.random() * 40; this._tono(f, 0.09, { tipo: 'sine', vol: 0.32, desliz: f * 1.6 }); },
  golpe()   { this._tono(140, 0.16, { tipo: 'square', vol: 0.12, desliz: 70 }); },
  whoosh()  { this._ruido(0.25, { vol: 0.10, filtro: 900 }); },

  // componente encendido: la altura sube con el orden → la secuencia "canta" escalera arriba
  ding(n = 0) {
    const f = PENTA[Math.min(n + 2, PENTA.length - 1)];
    this._tono(f, 0.35, { tipo: 'triangle', vol: 0.28 });
    this._tono(f * 2, 0.25, { tipo: 'sine', vol: 0.10, retardo: 0.02 });
  },

  chispa()  { this._ruido(0.12, { vol: 0.12, filtro: 4200 }); this._tono(1200, 0.08, { tipo: 'square', vol: 0.05, desliz: 2400 }); },
  estrella(i = 0) { const f = [659.25, 783.99, 1046.5][i] || 1046.5; this._tono(f, 0.4, { tipo: 'triangle', vol: 0.3 }); this._tono(f * 1.5, 0.3, { vol: 0.08, retardo: 0.04 }); },
  estrellaPerdida() { this._tono(520, 0.25, { tipo: 'triangle', vol: 0.18, desliz: 300 }); },
  moneda()  { this._tono(988, 0.07, { tipo: 'square', vol: 0.08 }); this._tono(1319, 0.25, { tipo: 'square', vol: 0.08, retardo: 0.07 }); },
  error()   { this._tono(220, 0.14, { tipo: 'triangle', vol: 0.25 }); this._tono(185, 0.22, { tipo: 'triangle', vol: 0.25, retardo: 0.13 }); },

  victoria() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      this._tono(f, 0.35, { tipo: 'triangle', vol: 0.28, retardo: i * 0.11 }));
    this._tono(1046.5, 0.9, { tipo: 'sine', vol: 0.18, retardo: 0.46 });
    this._tono(1318.5, 0.9, { tipo: 'sine', vol: 0.12, retardo: 0.46 });
  },

  // ── música: cajita de música procedural ──
  // Acordes lentos + una melodía pentatónica al azar, muy bajito. Se programa un
  // compás por vez con el reloj de WebAudio (preciso) y un timer JS sólo para
  // pedir el siguiente compás.
  arrancarMusica() {
    const ctx = this._ctx();
    if (!ctx || this._musicaTimer || this.silencio) return;
    this._musicaBus = ctx.createGain();
    this._musicaBus.gain.value = 0.22;
    this._musicaBus.connect(this.master);

    const ACORDES = [[130.81, 196.00, 261.63], [110.00, 164.81, 220.00],
                     [87.31, 130.81, 174.61], [98.00, 146.83, 196.00]];   // C Am F G
    const PULSO = 0.5;            // segundos por tiempo
    let compas = 0;
    let proximo = ctx.currentTime + 0.1;

    const programar = () => {
      if (this.silencio) return;
      // al volver del silencio (o de una pestaña dormida) no recuperar compases viejos de golpe
      if (proximo < ctx.currentTime) proximo = ctx.currentTime + 0.1;
      while (proximo < ctx.currentTime + 2.2) {
        const ac = ACORDES[compas % ACORDES.length];
        const dest = { destino: this._musicaBus };
        ac.forEach(f => this._notaEn(f, proximo, PULSO * 3.6, 0.10, 'sine', dest.destino));
        for (let t = 0; t < 4; t++) {
          if (Math.random() < 0.65) {
            const f = PENTA[Math.floor(Math.random() * 7) + 3];
            this._notaEn(f, proximo + t * PULSO, PULSO * 1.4, 0.13, 'triangle', dest.destino);
          }
        }
        proximo += PULSO * 4;
        compas++;
      }
    };
    programar();
    this._musicaTimer = setInterval(programar, 700);
  },

  _notaEn(freq, t0, dur, vol, tipo, destino) {
    if (this.silencio) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.type = tipo; osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(destino);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  },

};

Sonido.init();

export default Sonido;
