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
  console.log('codec OK');
})().catch(e => { console.error(e); process.exit(1); });
