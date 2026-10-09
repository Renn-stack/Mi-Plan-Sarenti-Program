/* Codec del código de plan Sarenti.
   Formato: "SARENTI1." + base64url( gzip( JSON compacto UTF-8 ) )
   Ver FORMATO-DEL-CODIGO.md. Mismo archivo para navegador y para Node (pruebas). */
(function (root) {
  'use strict';
  var PREFIX = 'SARENTI1.';

  function toCompact(p) {
    return {
      v: 1,
      i: p.id,
      n: p.name,
      u: p.updated,
      g: p.glasses,
      d: p.daily,
      a: p.avoid,
      p: p.prep,
      w: p.days.map(function (day) {
        return day.map(function (m) { return [m.name, m.time, m.items]; });
      })
    };
  }

  function str(x, max) {
    if (typeof x !== 'string') throw new Error('Código inválido');
    return x.slice(0, max);
  }
  function strList(x, maxItems, maxLen) {
    if (x === undefined) return [];
    if (!Array.isArray(x)) throw new Error('Código inválido');
    return x.slice(0, maxItems).map(function (s) { return str(s, maxLen); });
  }

  function fromCompact(c) {
    if (!c || typeof c !== 'object') throw new Error('Código inválido');
    if (c.v !== 1) throw new Error('Versión de código no compatible');
    if (!Array.isArray(c.w) || c.w.length !== 7) throw new Error('Código inválido');
    var g = Number(c.g);
    return {
      id: str(c.i, 40),
      name: str(c.n, 120),
      updated: Number(c.u) || 0,
      glasses: g >= 1 && g <= 30 ? Math.round(g) : 8,
      daily: strList(c.d, 30, 200),
      avoid: strList(c.a, 30, 200),
      prep: strList(c.p, 30, 300),
      days: c.w.map(function (day) {
        if (!Array.isArray(day)) throw new Error('Código inválido');
        return day.slice(0, 12).map(function (m) {
          if (!Array.isArray(m)) throw new Error('Código inválido');
          return { name: str(m[0], 60), time: str(m[1], 5), items: strList(m[2], 40, 200) };
        });
      })
    };
  }

  function bytesToB64url(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i += 0x8000) {
      s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function b64urlToBytes(t) {
    var b = t.replace(/-/g, '+').replace(/_/g, '/');
    while (b.length % 4) b += '=';
    var s = atob(b), out = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }

  async function pipe(bytes, stream) {
    var res = new Response(new Blob([bytes]).stream().pipeThrough(stream));
    return new Uint8Array(await res.arrayBuffer());
  }

  async function encode(plan) {
    var json = JSON.stringify(toCompact(plan));
    var gz = await pipe(new TextEncoder().encode(json), new CompressionStream('gzip'));
    return PREFIX + bytesToB64url(gz);
  }

  async function decode(text) {
    var t = String(text || '').trim().replace(/\s+/g, '');
    var at = t.indexOf(PREFIX);
    if (at < 0) throw new Error('Esto no parece un código de Sarenti');
    t = t.slice(at + PREFIX.length);
    try {
      var raw = await pipe(b64urlToBytes(t), new DecompressionStream('gzip'));
      var obj = JSON.parse(new TextDecoder().decode(raw));
    } catch (e) {
      throw new Error('El código está incompleto o dañado');
    }
    return fromCompact(obj);
  }

  var api = { PREFIX: PREFIX, encode: encode, decode: decode, toCompact: toCompact, fromCompact: fromCompact };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SarentiCodec = api;
})(typeof self !== 'undefined' ? self : this);
