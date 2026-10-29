// Ejecutar: node tests/codec.test.js   (Node 18+)
const assert = require('assert');
const C = require('../codec.js');
const qrcode = require('../vendor/qrcode.js');

function plan(items) {
  const meal = (n, t, k) => ({ name: n, time: t, items: Array.from({ length: k }, (_, i) => `${n} alimento número ${i + 1} con cantidad`) });
  return { id: 'abc123xyz', name: 'Lucía Torres Ñandú', updated: 1760000000, glasses: 8,
    daily: ['Probiótico en ayunas', 'Colágeno en la mañana'], avoid: ['Refrescos', 'Pan dulce'], prep: ['Hornear, no freír'], shop: {},
    days: Array.from({ length: 7 }, () => [meal('Desayuno', '08:00', items), meal('Colación', '11:00', items), meal('Comida', '14:00', items), meal('Colación', '17:00', items), meal('Cena', '20:00', items)]) };
}
(async () => {
  const p = plan(4);
  const code = await C.encode(p);
  assert(code.startsWith('SARENTI1.'));
  assert.deepStrictEqual(await C.decode(code), p);
  // con texto de WhatsApp alrededor y saltos de línea
  const wrapped = 'Hola, tu plan:\n\n' + code.replace(/(.{60})/g, '$1\n');
  assert.deepStrictEqual(await C.decode(wrapped), p);
  for (const bad of ['hola', 'SARENTI1.%%%', 'SARENTI1.' + code.slice(9, 40), '']) await assert.rejects(C.decode(bad));
  // tamaño en QR
  for (const k of [3, 4, 6, 8]) {
    const c = await C.encode(plan(k)); let lvl = null;
    for (const l of ['M', 'L']) { try { const q = qrcode(0, l); q.addData(c, 'Byte'); q.make(); lvl = l + ' v' + q.getModuleCount(); break; } catch (e) {} }
    console.log(`${k * 5 * 7} alimentos: ${c.length} chars, QR ${lvl || 'NO CABE'}`);
  }
  // c: lo que se compra de cada renglón. Solo van renglones del plan que cambian algo.
  const ps = plan(4);
  ps.days[0][0].items = ['Limón y chile en polvo', 'Limón', 'Agua natural'];
  ps.shop = { 'Limón y chile en polvo': ['Limón', 'Chile en polvo'], 'Limón': ['Limón'], 'Agua natural': [], 'Ya no está en el plan': ['X'] };
  assert.deepStrictEqual(C.toCompact(ps).c, { 'Limón y chile en polvo': ['Limón', 'Chile en polvo'], 'Agua natural': [] });
  assert.deepStrictEqual((await C.decode(await C.encode(ps))).shop, { 'Limón y chile en polvo': ['Limón', 'Chile en polvo'], 'Agua natural': [] });
  assert.strictEqual(C.toCompact(plan(4)).c, undefined, 'sin lista revisada no se agrega nada');
  assert.deepStrictEqual(C.fromCompact({ ...C.toCompact(plan(1)), c: 'mal' }).shop, {}, 'una c mala se ignora');
  // Cuánto crece el código si la IA separa todos los renglones del plan de 6 alimentos por comida.
  const big = plan(6); big.shop = {};
  big.days.forEach(d => d.forEach(m => m.items.forEach(t => { big.shop[t] = [t.split(' alimento')[0], 'Sal', 'Limón']; })));
  const sizeA = (await C.encode(plan(6))).length, sizeB = (await C.encode(big)).length;
  console.log(`con lista revisada: ${sizeA} → ${sizeB} chars`);
  // v2: para planes que no caben en un QR v1, como un plan real de 7 días con la lista de compras revisada.
  const real = plan(0); const D = real.days;
  const txt = [
    ['# Huevos a la mexicana con tortillas', '2 huevos revueltos', '1/2 taza de jitomate, cebolla y chile al gusto', '2 tortillas de maíz', '1/4 de aguacate', '1 cucharadita de aceite de oliva', 'Café o té sin azúcar'],
    ['1 manzana pequeña', '10 almendras naturales'],
    ['# Pollo a la plancha con arroz integral', '120–150 g de pechuga de pollo cocida', '1/2 taza de arroz integral cocido', '1 taza de calabacitas y zanahorias al vapor', '2 tazas de ensalada verde', '1 cucharadita de aceite de oliva', 'Agua natural'],
    ['1 yogur griego natural sin azúcar, aproximadamente 125 g', '1 cucharadita de semillas de chía'],
    ['# Ensalada de atún con aguacate', '1 lata de atún en agua escurrido, aproximadamente 120 g', '2 tazas de lechuga, pepino y jitomate', '1/4 de aguacate', '2 tostadas horneadas de maíz', 'Limón y hierbas al gusto']];
  D.forEach((d, i) => d.forEach((m, j) => { m.items = txt[j].map(t => t.startsWith('# ') || i === 0 ? t : t.replace(/^(\d+)/, n => String(+n + i))); }));
  real.shop = {};
  D.forEach(d => d.forEach(m => m.items.forEach(t => { if (!t.startsWith('# ')) real.shop[t] = t.split(/ y |, | de /).slice(0, 3).map(x => '1 ' + x.trim()); })));
  real.shop['Agua natural'] = [];
  const c1 = await C.encode(real), c2 = await C.encode2(real);
  assert(c2.startsWith('SARENTI2.') && /^\d+$/.test(c2.slice(9)));
  assert.deepStrictEqual(await C.decode(c2), await C.decode(c1), 'v2 se lee igual que v1');
  assert.deepStrictEqual((await C.decode(c2)).shop['Agua natural'], []);
  assert.deepStrictEqual(await C.decode('Hola, tu plan:\n' + c2.slice(0, 50) + '\n' + c2.slice(50)), await C.decode(c1));
  for (const bad of ['SARENTI2.', 'SARENTI2.1234', 'SARENTI2.' + c2.slice(9, 60)]) await assert.rejects(C.decode(bad));
  const fits = (code, v2) => { for (const l of ['M', 'L']) { try { const q = qrcode(0, l); if (v2) { q.addData('SARENTI2.', 'Alphanumeric'); q.addData(code.slice(9), 'Numeric'); } else q.addData(code, 'Byte'); q.make(); return l + ' v' + q.getModuleCount(); } catch (e) {} } return null; };
  console.log(`plan real con lista: v1 ${c1.length} chars QR ${fits(c1)} · v2 ${c2.length} chars QR ${fits(c2, true)}`);
  assert(fits(c2, true), 'el v2 cabe en un QR');
  // Bytes ↔ dígitos con todos los largos del último bloque.
  for (let n = 0; n < 30; n++) { const t = 'x'.repeat(n) + 'ñ'; assert.strictEqual((await C.decode(await C.encode2({ ...plan(1), name: t }))).name, t); }
  // Vector para la prueba de la app del paciente (test/codec_test.dart).
  const vp = plan(0); vp.id = 't2'; vp.name = 'Lucía Torres'; vp.daily = []; vp.avoid = []; vp.prep = [];
  vp.days[0] = [{ name: 'Desayuno', time: '08:00', items: ['# Molletes', '1 bolillo integral', 'Agua natural'] }];
  vp.days.slice(1).forEach((d, i) => d.forEach(m => { m.items = []; }));
  vp.shop = { '1 bolillo integral': ['1 bolillo'], 'Agua natural': [] };
  console.log('vector v2: ' + await C.encode2(vp));
  console.log('codec OK');
})().catch(e => { console.error(e); process.exit(1); });
