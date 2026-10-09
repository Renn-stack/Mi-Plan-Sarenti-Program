// Ejecutar: node tests/codec.test.js   (Node 18+)
const assert = require('assert');
const C = require('../codec.js');
const qrcode = require('../vendor/qrcode.js');

function plan(items) {
  const meal = (n, t, k) => ({ name: n, time: t, items: Array.from({ length: k }, (_, i) => `${n} alimento número ${i + 1} con cantidad`) });
  return { id: 'abc123xyz', name: 'Lucía Torres Ñandú', updated: 1760000000, glasses: 8,
    daily: ['Probiótico en ayunas', 'Colágeno en la mañana'], avoid: ['Refrescos', 'Pan dulce'], prep: ['Hornear, no freír'],
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
  console.log('codec OK');
})().catch(e => { console.error(e); process.exit(1); });
