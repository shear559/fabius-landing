/* Preview-only storage stand-in. The generated apps run in a sandboxed frame with an opaque origin, where
   window.localStorage throws. This gives each frame its own in-memory Storage so the artifact's own
   persistence code runs unchanged. It is not part of the artifact; source ZIPs hold the untouched files. */
(function () {
  'use strict';
  function memoryStorage() {
    var map = new Map();
    var api = {
      get length() { return map.size; },
      key: function (i) { return i >= 0 && i < map.size ? Array.from(map.keys())[i] : null; },
      getItem: function (k) { return map.has(String(k)) ? map.get(String(k)) : null; },
      setItem: function (k, v) { map.set(String(k), String(v)); },
      removeItem: function (k) { map.delete(String(k)); },
      clear: function () { map.clear(); }
    };
    return api;
  }
  function usable(name) {
    try { var s = window[name]; s.setItem('__probe__', '1'); s.removeItem('__probe__'); return true; } catch (e) { return false; }
  }
  for (var i = 0; i < 2; i++) {
    var name = ['localStorage', 'sessionStorage'][i];
    if (usable(name)) continue;
    try { Object.defineProperty(window, name, { value: memoryStorage(), configurable: true, writable: false }); } catch (e) {}
  }
})();
