// dev-guard.js — define si esta máquina puede abrir las vistas de configuración
// (editores del cuarto/tienda, atajos de nivel, y las páginas sueltas de herramientas).
//
// NO es seguridad: el juego corre entero en el cliente y cualquiera con la consola
// abierta se lo saltea. Es para que un chico de 6-8 años no entre por accidente a un
// editor donde [R] le borra la decoración, ni se saltee la progresión.
//
// Script CLÁSICO a propósito (no módulo): tiene que correr sincrónico y antes que todo,
// y lo usan tanto jugar.html (ES modules) como editor/tester/style-preview (scripts clásicos).
// Es la ÚNICA copia de esta regla en el proyecto — src/Dev.js sólo lee el resultado.
(function () {
  var HOSTS_DEV = ['localhost', '127.0.0.1', '::1'];

  var porHost = HOSTS_DEV.indexOf(location.hostname) !== -1;

  // escape para probar desde el celular por IP de LAN:
  //   consola → localStorage.circuito_dev = '1'
  var porFlag = false;
  try { porFlag = localStorage.getItem('circuito_dev') === '1'; } catch (e) { /* sin storage */ }

  window.__DEV__ = porHost || porFlag;
})();
