// Dev.js — puerta única a las vistas de configuración desde las escenas.
// La regla de "esta máquina es de desarrollo" vive en src/dev-guard.js (cargado
// como script clásico en jugar.html); acá sólo se lee el resultado.

const Dev = {

  // true sólo en la máquina de desarrollo
  activo() {
    return window.__DEV__ === true;
  },

  // ¿el modo está pedido por URL Y permitido en esta máquina?
  //   Dev.flag('editroom')  →  ?editroom en localhost
  flag(nombre) {
    if (!this.activo()) return false;
    return new URLSearchParams(location.search).has(nombre);
  },

  // valor de un parámetro de dev, o null si no estamos en dev
  param(nombre) {
    if (!this.activo()) return null;
    return new URLSearchParams(location.search).get(nombre);
  },

};

export default Dev;
