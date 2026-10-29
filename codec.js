/* Codec del código de plan Sarenti.
   Formato: "SARENTI1." + base64url( gzip( JSON compacto UTF-8 ) )
   Versión 2, solo cuando el plan no cabe en un QR v1: "SARENTI2." + dígitos( deflate-raw( JSON v2 ) )
   Ver FORMATO-DEL-CODIGO.md. Mismo archivo para navegador y para Node (pruebas). */
(function (root) {
  'use strict';
  var PREFIX = 'SARENTI1.', PREFIX2 = 'SARENTI2.';
  var TAIL = [0, 3, 5, 8, 10, 13, 15];   // dígitos para un último bloque de 0..6 bytes (un bloque de 7 bytes son 17 dígitos)

  /* c: lo que se compra de cada renglón (revisado con IA). Solo van los renglones que siguen en el plan
     y que cambian algo: si la IA devolvió el renglón igual, la app ya lo lee así. */
  function shopCompact(p) {
    var used = {}, out = {}, n = 0;
    p.days.forEach(function (day) { day.forEach(function (m) { m.items.forEach(function (t) { used[t] = true; }); }); });
    Object.keys(p.shop || {}).forEach(function (k) {
      var v = p.shop[k];
      if (!used[k] || !Array.isArray(v) || (v.length === 1 && v[0] === k)) return;
      out[k] = v; n++;
    });
    return n ? out : undefined;
  }

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
      }),
      c: shopCompact(p)
    };
  }

  /* Renglones de w sin repetir, en el orden en que aparecen: en v2 la lista de compras los nombra por su número. */
  function uniqueItems(w) {
    var seen = new Set(), out = [];
    w.forEach(function (day) {
      (Array.isArray(day) ? day : []).forEach(function (m) {
        (Array.isArray(m) && Array.isArray(m[2]) ? m[2] : []).forEach(function (t) { if (!seen.has(t)) { seen.add(t); out.push(t); } });
      });
    });
    return out;
  }
  /* v2 es v1 con c como [[número de renglón, [ingredientes]], ...] en lugar de repetir el texto de cada renglón. */
  function toCompact2(p) {
    var o = toCompact(p);
    o.v = 2;
    if (o.c) {
      var idx = new Map(uniqueItems(o.w).map(function (t, i) { return [t, i]; }));
      o.c = Object.keys(o.c).map(function (k) { return [idx.get(k), o.c[k]]; });
    }
    return o;
  }
  function v2toV1(o) {
    if (!o || o.v !== 2 || !Array.isArray(o.w)) return o;
    var items = uniqueItems(o.w), c = {};
    if (Array.isArray(o.c)) o.c.forEach(function (e) { if (Array.isArray(e) && typeof items[e[0]] === 'string') c[items[e[0]]] = e[1]; });
    return Object.assign({}, o, { v: 1, c: c });
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

  function shopList(x) {   // opcional: si viene mal se ignora
    var out = {};
    if (!x || typeof x !== 'object' || Array.isArray(x)) return out;
    Object.keys(x).slice(0, 400).forEach(function (k) {
      if (Array.isArray(x[k])) out[k] = x[k].filter(function (t) { return typeof t === 'string'; }).slice(0, 10).map(function (t) { return t.slice(0, 120); });
    });
    return out;
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
      shop: shopList(c.c),
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

  /* Bytes a dígitos (bloques de 7 bytes = 17 dígitos): así el QR usa el modo numérico, que guarda casi 30% más que base64. */
  function bytesToDigits(b) {
    var s = '';
    for (var i = 0; i < b.length; i += 7) {
      var k = Math.min(7, b.length - i), n = BigInt(0);
      for (var j = 0; j < k; j++) n = n * BigInt(256) + BigInt(b[i + j]);
      s += n.toString().padStart(k === 7 ? 17 : TAIL[k], '0');
    }
    return s;
  }
  function digitsToBytes(t) {
    var out = [];
    for (var i = 0; i < t.length; i += 17) {
      var part = t.slice(i, i + 17), k = part.length === 17 ? 7 : TAIL.indexOf(part.length), n = BigInt(part), b = [];
      if (k < 1) throw new Error('largo');
      for (var j = 0; j < k; j++) { b.unshift(Number(n % BigInt(256))); n = n / BigInt(256); }
      if (n > BigInt(0)) throw new Error('bloque');
      out.push.apply(out, b);
    }
    return new Uint8Array(out);
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

  async function encode2(plan) {
    var json = JSON.stringify(toCompact2(plan));
    var raw = await pipe(new TextEncoder().encode(json), new CompressionStream('deflate-raw'));
    return PREFIX2 + bytesToDigits(raw);
  }

  async function decode(text) {
    var t = String(text || '').trim().replace(/\s+/g, '');
    var at = t.indexOf(PREFIX), at2 = t.indexOf(PREFIX2), v2 = at2 >= 0 && (at < 0 || at2 < at);
    if (at < 0 && !v2) throw new Error('Esto no parece un código de Sarenti');
    try {
      var raw = v2 ? await pipe(digitsToBytes(/^\d*/.exec(t.slice(at2 + PREFIX2.length))[0]), new DecompressionStream('deflate-raw'))
        : await pipe(b64urlToBytes(t.slice(at + PREFIX.length)), new DecompressionStream('gzip'));
      var obj = JSON.parse(new TextDecoder().decode(raw));
    } catch (e) {
      throw new Error('El código está incompleto o dañado');
    }
    return fromCompact(v2 ? v2toV1(obj) : obj);
  }

  var api = { PREFIX: PREFIX, PREFIX2: PREFIX2, encode: encode, encode2: encode2, decode: decode, toCompact: toCompact, fromCompact: fromCompact };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SarentiCodec = api;
})(typeof self !== 'undefined' ? self : this);
