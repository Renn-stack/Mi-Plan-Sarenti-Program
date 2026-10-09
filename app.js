/* Planes Sarenti: herramienta privada de la doctora. Todo se guarda en este dispositivo. */
(function () {
  'use strict';
  var K_PLANS = 'sarenti.plans.v1', K_TPL = 'sarenti.templates.v1', K_PIN = 'sarenti.pin.v1';
  var DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  var DAY_L = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  var app = document.getElementById('app');

  /* ---------- almacenamiento ---------- */
  var mem = {};
  function lsGet(k) { try { var v = localStorage.getItem(k); return v === null ? null : JSON.parse(v); } catch (e) { return mem[k] === undefined ? null : mem[k]; } }
  function lsSet(k, v) { mem[k] = v; try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function lsDel(k) { delete mem[k]; try { localStorage.removeItem(k); } catch (e) {} }

  /* ---------- utilidades ---------- */
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), v);
      else if (v === true) n.setAttribute(k, '');
      else n.setAttribute(k, v);
    }
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  function uid() { var a = new Uint8Array(6); (self.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach(function (_, i) { a[i] = Math.random() * 256; }); return Array.prototype.map.call(a, function (b) { return b.toString(36).padStart(2, '0'); }).join('').slice(0, 9); }
  function nowSec() { return Math.floor(Date.now() / 1000); }
  function fmtDate(s) { if (!s) return ''; return new Date(s * 1000).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }); }
  function toast(msg) { var t = el('div', { class: 'toast', role: 'status', text: msg }); document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2600); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function emptyMeals() {
    return [['Desayuno', '08:00'], ['Colación', '11:00'], ['Comida', '14:00'], ['Colación', '17:00'], ['Cena', '20:00']].map(function (m) { return { name: m[0], time: m[1], items: [] }; });
  }
  function blankPlan(name) {
    var days = []; for (var i = 0; i < 7; i++) days.push(emptyMeals());
    return { id: uid(), name: name || '', updated: nowSec(), glasses: 8, daily: [], avoid: [], prep: [], days: days };
  }
  function samplePlan() {
    var p = blankPlan('Lucía Torres');
    p.daily = ['Probiótico en ayunas', 'Colágeno en la mañana', '2 litros de agua'];
    p.avoid = ['Refrescos y jugos industrializados', 'Pan dulce', 'Frituras'];
    p.prep = ['Hornear o asar, evitar freír', 'Pesar los alimentos en crudo'];
    var desayunos = [['2 huevos', '1/3 de aguacate', '1 tortilla de maíz'], ['Licuado de proteína', '1 manzana'], ['Avena con canela', '1 puñito de nueces'], ['Omelette de espinacas', '1 tostada'], ['Yogurt natural', 'Fruta picada', 'Chía'], ['Huevo con chayote', '1 tortilla'], ['Quesadillas de queso panela', 'Salsa']];
    var comidas = [['Pechuga de pollo', 'Ensalada', 'Arroz integral'], ['Bistec', 'Verduras al vapor'], ['Pescado al horno', 'Ensalada'], ['Caldo de pollo', 'Verduras'], ['Pechuga de pollo', 'Ensalada'], ['Sándwich integral', 'Jícama'], ['Caldo de pollo', 'Fruta']];
    for (var d = 0; d < 7; d++) {
      p.days[d][0].items = desayunos[d].slice();
      p.days[d][1].items = ['1 fruta', '10 almendras'];
      p.days[d][2].items = comidas[d].slice();
      p.days[d][3].items = ['Yogurt natural'];
      p.days[d][4].items = ['Ensalada de atún', '1 tostada'];
    }
    return p;
  }

  /* ---------- estado ---------- */
  var plans = [], templates = [];
  var S = { sel: null, view: 'none', day: 0, tab: 'dias', search: '' };
  var saveTimer = null, saved = true;

  function loadAll() {
    var p = lsGet(K_PLANS), t = lsGet(K_TPL);
    plans = Array.isArray(p) ? p : []; templates = Array.isArray(t) ? t : [];
  }
  function persist() {
    var ok = lsSet(K_PLANS, plans) && lsSet(K_TPL, templates);
    saved = true; setStatus(ok ? 'Guardado' : 'No se pudo guardar en este navegador. Descarga un respaldo.');
  }
  function touch() {
    var p = cur(); if (p) p.updated = nowSec();
    saved = false; setStatus('Guardando…');
    clearTimeout(saveTimer); saveTimer = setTimeout(persist, 300);
  }
  function setStatus(t) { var s = document.getElementById('status'); if (s) s.textContent = t; }
  function cur() { for (var i = 0; i < plans.length; i++) if (plans[i].id === S.sel) return plans[i]; return null; }

  /* ---------- PIN ---------- */
  var unlocked = false, idleTimer = null;
  async function hashPin(pin, salt) {
    var data = salt + ':' + pin;
    if (self.crypto && crypto.subtle) {
      var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
      return Array.prototype.map.call(new Uint8Array(buf), function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    }
    var h = 5381; for (var i = 0; i < data.length; i++) h = ((h << 5) + h + data.charCodeAt(i)) | 0;
    return 'f' + h;
  }
  function resetIdle() {
    clearTimeout(idleTimer);
    if (unlocked) idleTimer = setTimeout(lock, 10 * 60 * 1000);
  }
  function lock() { unlocked = false; S.sel = null; S.view = 'none'; render(); }
  ['pointerdown', 'keydown'].forEach(function (ev) { document.addEventListener(ev, resetIdle, true); });

  function renderLock() {
    var pinData = lsGet(K_PIN), first = !pinData;
    var msg = el('p', { class: 'err', role: 'alert' });
    var pin = el('input', { type: 'password', inputmode: 'numeric', autocomplete: first ? 'new-password' : 'current-password', maxlength: '8', 'aria-label': first ? 'Elige un PIN de 4 a 8 números' : 'PIN' });
    var pin2 = first ? el('input', { type: 'password', inputmode: 'numeric', autocomplete: 'new-password', maxlength: '8', 'aria-label': 'Repite el PIN' }) : null;
    async function go(ev) {
      ev.preventDefault(); msg.textContent = '';
      var v = pin.value;
      if (!/^\d{4,8}$/.test(v)) { msg.textContent = 'El PIN debe tener de 4 a 8 números.'; return; }
      if (first) {
        if (v !== pin2.value) { msg.textContent = 'Los dos PIN no coinciden.'; return; }
        var salt = uid(); lsSet(K_PIN, { salt: salt, hash: await hashPin(v, salt) });
      } else if ((await hashPin(v, pinData.salt)) !== pinData.hash) {
        msg.textContent = 'PIN incorrecto.'; pin.value = ''; pin.focus(); return;
      }
      unlocked = true; resetIdle(); loadAll(); render();
    }
    var forgot = first ? null : el('button', { class: 'btn small', type: 'button', text: 'Olvidé mi PIN', onclick: function () {
      if (confirm('Para entrar de nuevo se borrarán todos los planes de este dispositivo. Si tienes un respaldo podrás importarlo después. ¿Continuar?')) {
        lsDel(K_PLANS); lsDel(K_TPL); lsDel(K_PIN); plans = []; templates = []; render();
      }
    } });
    app.replaceChildren(el('main', { class: 'lock' }, [
      el('img', { src: 'img/logo.png', alt: 'Sarenti Medicina estética' }),
      el('h1', { text: 'Planes Sarenti' }),
      el('p', { class: 'muted', text: first ? 'Elige un PIN para proteger esta herramienta. Se guarda solo en este dispositivo.' : 'Escribe tu PIN para entrar.' }),
      el('form', { onsubmit: go }, [pin, pin2, msg, el('button', { class: 'btn primary', type: 'submit', text: first ? 'Crear PIN y entrar' : 'Entrar' })]),
      el('p', null, [forgot])
    ]));
    pin.focus();
  }

  /* ---------- armazón ---------- */
  function render() {
    stopScan();
    if (!unlocked) { document.body.classList.remove('has-sel'); return renderLock(); }
    document.body.classList.toggle('has-sel', S.view !== 'none');
    var side = el('nav', { class: 'side', 'aria-label': 'Pacientes' });
    var main = el('main', { class: 'main', id: 'main' });
    buildSide(side); buildMain(main);
    app.replaceChildren(
      el('header', { class: 'top noprint' }, [
        el('img', { src: 'img/logo.png', alt: '' }),
        el('div', null, [el('div', { class: 'brand', text: 'Sarenti' }), el('h1', { text: 'Planes de alimentación' })]),
        el('span', { class: 'spacer' }),
        el('button', { class: 'btn small', onclick: lock, text: 'Bloquear' })
      ]),
      el('div', { class: 'layout' }, [side, main])
    );
  }

  function buildSide(side) {
    var list = el('div', { id: 'plist' });
    var search = el('input', { type: 'search', 'aria-label': 'Buscar paciente', placeholder: 'Buscar paciente', value: S.search, oninput: function (e) { S.search = e.target.value; fillList(list); } });
    side.appendChild(el('div', { class: 'row', style: 'margin-bottom:12px' }, [
      el('button', { class: 'btn primary', onclick: function () { S.view = 'new'; S.sel = null; render(); focusMain(); }, text: '+ Nuevo plan' }),
      el('button', { class: 'btn small', onclick: function () { S.view = 'backup'; S.sel = null; render(); focusMain(); }, text: 'Respaldo' })
    ]));
    side.appendChild(el('div', { style: 'margin-bottom:12px' }, [search]));
    side.appendChild(list); fillList(list);
  }
  function fillList(list) {
    var q = S.search.trim().toLowerCase();
    var items = plans.filter(function (p) { return !q || p.name.toLowerCase().indexOf(q) >= 0; }).sort(function (a, b) { return b.updated - a.updated; });
    list.replaceChildren();
    if (!items.length) list.appendChild(el('p', { class: 'muted', text: plans.length ? 'No hay coincidencias.' : 'Aún no hay planes. Crea el primero con “+ Nuevo plan”.' }));
    items.forEach(function (p) {
      list.appendChild(el('div', { class: 'plan-item' + (p.id === S.sel ? ' sel' : '') }, [
        el('button', { class: 'open', 'aria-current': p.id === S.sel ? 'true' : null, onclick: function () { S.sel = p.id; S.view = 'edit'; S.day = 0; S.tab = 'dias'; render(); focusMain(); } }, [
          el('span', { class: 'nm', text: p.name || 'Sin nombre' }),
          el('span', { class: 'dt', text: 'Actualizado ' + fmtDate(p.updated) })
        ])
      ]));
    });
  }
  function focusMain() { var m = document.getElementById('main'); if (m) { m.setAttribute('tabindex', '-1'); m.focus({ preventScroll: true }); window.scrollTo(0, 0); } }
  function backBtn() { return el('button', { class: 'btn small only-narrow noprint', style: 'margin:8px 0', onclick: function () { S.view = 'none'; S.sel = null; render(); }, text: '← Pacientes' }); }

  function buildMain(main) {
    if (S.view === 'none') { main.appendChild(el('div', { class: 'card', style: 'margin-top:16px' }, [el('h2', { text: 'Bienvenida' }), el('p', { class: 'muted', text: 'Elige a un paciente de la lista o crea un plan nuevo. Todo se guarda solo en este dispositivo.' })])); return; }
    main.appendChild(backBtn());
    if (S.view === 'new') return buildNew(main);
    if (S.view === 'backup') return buildBackup(main);
    var p = cur(); if (!p) { S.view = 'none'; return; }
    if (S.view === 'qr') return buildQR(main, p);
    buildEditor(main, p);
  }

  /* ---------- nuevo plan ---------- */
  function addPlan(p) { plans.push(p); S.sel = p.id; S.view = 'edit'; S.day = 0; S.tab = 'dias'; persist(); render(); focusMain(); }
  function buildNew(main) {
    main.appendChild(el('h2', { text: 'Nuevo plan', style: 'margin:12px 0' }));
    var name = el('input', { type: 'text', id: 'nn', placeholder: 'Nombre del paciente', autocomplete: 'off' });
    main.appendChild(el('div', { class: 'field' }, [el('label', { for: 'nn', text: 'Nombre del paciente' }), name]));
    function make(base) { var p = base ? clone(base) : blankPlan(); p.id = uid(); p.name = name.value.trim() || (base && base.name) || 'Paciente nuevo'; p.updated = nowSec(); addPlan(p); }
    main.appendChild(el('p', { class: 'lbl', text: 'Empezar con:' }));
    var row = el('div', { class: 'row' }, [
      el('button', { class: 'btn primary', onclick: function () { make(null); }, text: 'Plan vacío' }),
      el('button', { class: 'btn', onclick: function () { make(samplePlan()); }, text: 'Plan de ejemplo' })
    ]);
    main.appendChild(row);
    if (templates.length) {
      main.appendChild(el('div', { class: 'sub', text: 'Mis plantillas' }));
      templates.forEach(function (t, i) {
        main.appendChild(el('div', { class: 'card row' }, [
          el('strong', { text: t.tplName }), el('span', { class: 'spacer' }),
          el('button', { class: 'btn small primary', onclick: function () { make(t); }, text: 'Usar' }),
          el('button', { class: 'btn small danger', onclick: function () { if (confirm('¿Borrar la plantilla “' + t.tplName + '”?')) { templates.splice(i, 1); persist(); render(); } }, text: 'Borrar' })
        ]));
      });
    }
    var msg = el('p', { class: 'err', role: 'alert' });
    /* Si el plan ya está en este dispositivo, se puede reemplazar con la versión del código. */
    async function loadCode(text) {
      msg.textContent = '';
      try {
        var p = await SarentiCodec.decode(text), ex = plans.filter(function (x) { return x.id === p.id; })[0];
        if (ex) {
          if (confirm('Ya tienes el plan de ' + (ex.name || 'este paciente') + '. ¿Reemplazarlo con el del código?\n\nAceptar: reemplazar. Cancelar: guardarlo como copia.')) plans.splice(plans.indexOf(ex), 1);
          else p.id = uid();
        }
        addPlan(p);
      } catch (e) { msg.textContent = e.message; }
    }
    main.appendChild(el('div', { class: 'sub', text: 'O escanear un QR' }));
    main.appendChild(el('p', { class: 'hint', text: 'Para editar un plan que ya tiene QR (por ejemplo, hecho en otro dispositivo).' }));
    main.appendChild(scanner(loadCode));
    main.appendChild(el('div', { class: 'sub', text: 'O pegar un código' }));
    main.appendChild(el('p', { class: 'hint', text: 'El mensaje de WhatsApp completo o solo el código que empieza con SARENTI1.' }));
    var ta = el('textarea', { 'aria-label': 'Código del plan', placeholder: 'SARENTI1.…' });
    main.appendChild(ta);
    main.appendChild(el('div', { class: 'row', style: 'margin-top:8px' }, [el('button', { class: 'btn', onclick: function () { loadCode(ta.value); }, text: 'Cargar código' })]));
    main.appendChild(msg);
    name.focus();
  }

  /* ---------- escanear QR ---------- */
  var scanStop = null;
  function stopScan() { if (scanStop) { scanStop(); scanStop = null; } }
  function readQR(src, w, h, cv) {
    cv.width = w; cv.height = h;
    var g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(src, 0, 0, w, h);
    var r = jsQR(g.getImageData(0, 0, w, h).data, w, h);
    return r && r.data;
  }
  function fit(w, h, max) { var s = Math.min(1, max / Math.max(w, h)); return [Math.round(w * s), Math.round(h * s)]; }
  function scanner(onCode) {
    var box = el('div'), cv = document.createElement('canvas');
    var msg = el('p', { class: 'hint', role: 'status' });
    var video = el('video', { class: 'scan', playsinline: true, muted: true, 'aria-label': 'Vista de la cámara' });
    var file = el('input', { type: 'file', accept: 'image/*', hidden: true, onchange: function (e) {
      var f = e.target.files[0]; e.target.value = ''; if (!f) return;
      var img = new Image();
      img.onload = function () {
        var d = fit(img.naturalWidth, img.naturalHeight, 1600), t = readQR(img, d[0], d[1], cv);
        URL.revokeObjectURL(img.src);
        if (t) { msg.textContent = ''; onCode(t); } else msg.textContent = 'No se encontró un QR en esa foto. Intenta con una más clara y de cerca.';
      };
      img.onerror = function () { msg.textContent = 'No se pudo abrir esa imagen.'; };
      img.src = URL.createObjectURL(f);
    } });
    var cam = el('button', { class: 'btn primary', type: 'button', text: 'Abrir cámara', onclick: function () {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { msg.textContent = 'Este navegador no puede usar la cámara. Sube una foto del QR.'; return; }
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }).then(function (stream) {
        stopScan();
        var alive = true, timer = null;
        scanStop = function () { alive = false; clearTimeout(timer); stream.getTracks().forEach(function (t) { t.stop(); }); video.remove(); cam.hidden = false; stop.hidden = true; };
        video.srcObject = stream; box.prepend(video); video.play().catch(function () {});
        cam.hidden = true; stop.hidden = false; msg.textContent = 'Apunta la cámara al QR.';
        (function tick() {
          if (!alive) return;
          if (video.readyState >= 2 && video.videoWidth) {
            var d = fit(video.videoWidth, video.videoHeight, 800), t = readQR(video, d[0], d[1], cv);
            if (t) { stopScan(); msg.textContent = ''; onCode(t); return; }
          }
          timer = setTimeout(tick, 150);
        })();
      }, function () { msg.textContent = 'No se pudo abrir la cámara. Revisa el permiso del navegador o sube una foto del QR.'; });
    } });
    var stop = el('button', { class: 'btn', type: 'button', hidden: true, text: 'Cerrar cámara', onclick: function () { stopScan(); msg.textContent = ''; } });
    box.append(el('div', { class: 'row' }, [cam, stop, el('button', { class: 'btn', type: 'button', text: 'Subir foto del QR', onclick: function () { file.click(); } }), file]), msg);
    return box;
  }

  /* ---------- editor ---------- */
  function listEditor(arr, label, placeholder, onChange) {
    var box = el('div');
    function draw(focusIdx) {
      box.replaceChildren();
      arr.forEach(function (txt, i) {
        var inp = el('input', { type: 'text', value: txt, 'aria-label': label + ' ' + (i + 1), placeholder: placeholder, oninput: function (e) { arr[i] = e.target.value; onChange(); },
          onkeydown: function (e) { if (e.key === 'Enter') { e.preventDefault(); arr.splice(i + 1, 0, ''); onChange(); draw(i + 1); } } });
        box.appendChild(el('div', { class: 'item' }, [inp, el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Quitar: ' + (txt || label + ' ' + (i + 1)), onclick: function () { arr.splice(i, 1); onChange(); draw(Math.max(0, i - 1)); }, text: '✕' })]));
        if (i === focusIdx) setTimeout(function () { inp.focus(); }, 0);
      });
      box.appendChild(el('button', { class: 'btn small', type: 'button', style: 'margin-top:4px', onclick: function () { arr.push(''); onChange(); draw(arr.length - 1); }, text: '+ Agregar' }));
    }
    draw(-1); return box;
  }
  function cleanPlan(p) {
    p.daily = p.daily.filter(function (s) { return s.trim(); }); p.avoid = p.avoid.filter(function (s) { return s.trim(); }); p.prep = p.prep.filter(function (s) { return s.trim(); });
    p.days.forEach(function (d) { d.forEach(function (m) { m.items = m.items.map(function (s) { return s.trim(); }).filter(Boolean); m.name = m.name.trim() || 'Comida'; }); });
  }

  function buildEditor(main, p) {
    main.appendChild(el('div', { class: 'field', style: 'margin-top:12px' }, [
      el('label', { for: 'pname', text: 'Nombre del paciente' }),
      el('input', { type: 'text', id: 'pname', value: p.name, autocomplete: 'off', oninput: function (e) { p.name = e.target.value; touch(); } })
    ]));
    main.appendChild(el('div', { class: 'tabs', role: 'group', 'aria-label': 'Sección' }, [
      el('button', { 'aria-pressed': S.tab === 'dias', onclick: function () { S.tab = 'dias'; render(); }, text: 'Comidas por día' }),
      el('button', { 'aria-pressed': S.tab === 'general', onclick: function () { S.tab = 'general'; render(); }, text: 'Indicaciones generales' })
    ]));
    if (S.tab === 'dias') editDays(main, p); else editGeneral(main, p);

    main.appendChild(el('div', { class: 'status noprint', id: 'status', role: 'status', 'aria-live': 'polite', text: saved ? 'Guardado' : '', style: 'margin-top:8px' }));
    main.appendChild(el('div', { class: 'row noprint', style: 'margin:12px 0 24px' }, [
      el('button', { class: 'btn primary', onclick: function () { cleanPlan(p); touch(); persist(); S.view = 'qr'; render(); focusMain(); }, text: 'Generar QR' }),
      el('button', { class: 'btn', onclick: function () { var c = clone(p); c.id = uid(); c.name = p.name + ' (copia)'; c.updated = nowSec(); plans.push(c); S.sel = c.id; persist(); render(); toast('Plan duplicado'); }, text: 'Duplicar' }),
      el('button', { class: 'btn', onclick: function () { var n = prompt('Nombre de la plantilla (sin datos del paciente):', ''); if (!n) return; var c = clone(p); c.tplName = n.trim(); c.name = ''; templates.push(c); persist(); toast('Plantilla guardada'); }, text: 'Guardar como plantilla' }),
      el('button', { class: 'btn danger', onclick: function () { if (confirm('¿Eliminar el plan de ' + (p.name || 'este paciente') + '? No se puede deshacer.')) { plans = plans.filter(function (x) { return x !== p; }); persist(); S.sel = null; S.view = 'none'; render(); } }, text: 'Eliminar' })
    ]));
  }

  function editGeneral(main, p) {
    main.appendChild(el('div', { class: 'field' }, [
      el('label', { for: 'gl', text: 'Vasos de agua al día (de 250 ml)' }),
      el('input', { type: 'number', id: 'gl', min: '1', max: '30', value: String(p.glasses), style: 'max-width:120px', oninput: function (e) { var v = parseInt(e.target.value, 10); if (v >= 1 && v <= 30) { p.glasses = v; touch(); } } })
    ]));
    [['daily', 'Cada día', 'Ej. Probiótico en ayunas', 'Lo que el paciente hace todos los días.'],
     ['avoid', 'Evitar', 'Ej. Refrescos', 'Alimentos o hábitos que debe evitar.'],
     ['prep', 'Preparación', 'Ej. Hornear en vez de freír', 'Cómo preparar los alimentos.']].forEach(function (s) {
      main.appendChild(el('div', { class: 'sub', text: s[1] }));
      main.appendChild(el('p', { class: 'hint', text: s[3] }));
      main.appendChild(listEditor(p[s[0]], s[1], s[2], touch));
    });
  }

  function editDays(main, p) {
    var dayRow = el('div', { class: 'days', role: 'group', 'aria-label': 'Día de la semana' });
    DAYS.forEach(function (n, i) { dayRow.appendChild(el('button', { class: 'day', 'aria-pressed': S.day === i, 'aria-label': n, onclick: function () { S.day = i; render(); }, text: DAY_L[i] })); });
    main.appendChild(dayRow);
    main.appendChild(el('h2', { text: DAYS[S.day], style: 'margin-bottom:10px' }));
    var meals = p.days[S.day];
    meals.forEach(function (m, mi) {
      var items = listEditor(m.items, 'Alimento', 'Ej. 2 huevos', touch);
      main.appendChild(el('section', { class: 'card meal', 'aria-label': m.name }, [
        el('div', { class: 'head' }, [
          el('input', { type: 'text', value: m.name, 'aria-label': 'Nombre de la comida', oninput: function (e) { m.name = e.target.value; touch(); } }),
          el('input', { type: 'time', value: m.time, 'aria-label': 'Hora de ' + m.name, oninput: function (e) { m.time = e.target.value || m.time; touch(); } }),
          el('button', { class: 'icon-btn', 'aria-label': 'Quitar la comida ' + m.name, onclick: function () { if (!m.items.length || confirm('¿Quitar “' + m.name + '” de este día?')) { meals.splice(mi, 1); touch(); render(); } }, text: '✕' })
        ]), items
      ]));
    });
    main.appendChild(el('button', { class: 'btn small', onclick: function () { if (meals.length >= 12) return; meals.push({ name: 'Comida', time: '12:00', items: [] }); touch(); render(); }, text: '+ Agregar comida' }));

    var boxes = DAYS.map(function (n, i) { return i === S.day ? null : el('label', { class: 'row', style: 'min-height:44px;gap:6px' }, [el('input', { type: 'checkbox', value: String(i), style: 'width:22px;height:22px' }), n]); });
    var det = el('details', { class: 'card noprint', style: 'margin-top:14px' }, [
      el('summary', { text: 'Copiar este día a otros días', style: 'min-height:44px;cursor:pointer;font-weight:600;display:flex;align-items:center' }),
      el('div', { class: 'row' }, boxes),
      el('button', { class: 'btn small', style: 'margin-top:8px', onclick: function () {
        var any = false; det.querySelectorAll('input:checked').forEach(function (c) { p.days[+c.value] = clone(meals); any = true; });
        if (any) { touch(); render(); toast('Día copiado'); } else toast('Elige al menos un día');
      }, text: 'Copiar' })
    ]);
    main.appendChild(det);
  }

  /* ---------- QR ---------- */
  function makeQR(text) {
    var last;
    for (var lv of ['M', 'L']) {
      try { var q = qrcode(0, lv); q.addData(text, 'Byte'); q.make(); return { q: q, level: lv }; } catch (e) { last = e; }
    }
    throw new Error('El plan es demasiado largo para un QR. Acorta algunos textos.');
  }
  function qrSvg(q) {
    var n = q.getModuleCount(), m = 4, d = '';
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (q.isDark(r, c)) d += 'M' + (c + m) + ',' + (r + m) + 'h1v1h-1z';
    var s = n + 2 * m;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + s + ' ' + s + '" role="img" aria-label="Código QR del plan" shape-rendering="crispEdges"><rect width="' + s + '" height="' + s + '" fill="#fff"/><path d="' + d + '" fill="#000"/></svg>';
  }
  function qrPng(q, name) {
    var n = q.getModuleCount(), m = 4, px = Math.max(4, Math.floor(900 / (n + 2 * m))), size = px * (n + 2 * m), cap = 90;
    var cv = document.createElement('canvas'); cv.width = size; cv.height = size + cap;
    var g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.fillStyle = '#000';
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (q.isDark(r, c)) g.fillRect((c + m) * px, (r + m) * px, px, px);
    g.fillStyle = '#3A1630'; g.font = '700 44px "Cormorant Garamond", serif'; g.textAlign = 'center'; g.fillText(name, size / 2, size + 56, size - 40);
    return cv;
  }
  function download(blob, fname) { var a = el('a', { href: URL.createObjectURL(blob), download: fname }); document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
  function slug(s) { return (s || 'plan').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'plan'; }

  function buildQR(main, p) {
    main.appendChild(el('div', { class: 'row noprint', style: 'margin:8px 0' }, [el('button', { class: 'btn small', onclick: function () { S.view = 'edit'; render(); focusMain(); }, text: '← Volver al plan' })]));
    var holder = el('div', { class: 'qrbox' }, [el('p', { class: 'muted', text: 'Generando…' })]);
    main.appendChild(holder);
    SarentiCodec.encode(p).then(function (code) {
      var res;
      try { res = makeQR(code); } catch (e) { holder.replaceChildren(el('p', { class: 'err', role: 'alert', text: e.message })); return; }
      var wrap = el('div'); wrap.innerHTML = qrSvg(res.q);
      holder.replaceChildren(wrap.firstChild, el('div', { class: 'who', text: p.name || 'Paciente' }), el('p', { class: 'hint', text: 'Muéstralo en la pantalla o imprímelo. El paciente lo escanea con Mi Plan Sarenti.' }));
      var ta = el('textarea', { readonly: true, 'aria-label': 'Código de texto para WhatsApp', onfocus: function (e) { e.target.select(); } }); ta.value = code;
      var msg = 'Hola, este es tu plan de Mi Plan Sarenti. Copia este mensaje completo y en la app elige “Pegar código de WhatsApp”.\n\n' + code;
      main.appendChild(el('div', { class: 'sub noprint', text: 'Código de texto' }));
      main.appendChild(el('p', { class: 'hint noprint', text: 'Para pacientes que lo reciben por WhatsApp en lugar de escanear.' }));
      main.appendChild(ta);
      main.appendChild(el('div', { class: 'row noprint', style: 'margin:10px 0' }, [
        el('button', { class: 'btn primary', onclick: function () { (navigator.clipboard ? navigator.clipboard.writeText(msg) : Promise.reject()).then(function () { toast('Mensaje copiado'); }, function () { ta.select(); toast('Selecciona y copia el código'); }); }, text: 'Copiar mensaje' }),
        el('a', { class: 'btn', href: 'https://wa.me/?text=' + encodeURIComponent(msg), target: '_blank', rel: 'noopener', text: 'Enviar por WhatsApp' }),
        el('button', { class: 'btn', onclick: function () { qrPng(res.q, p.name || 'Plan').toBlob(function (b) { download(b, 'plan-' + slug(p.name) + '.png'); }); }, text: 'Descargar imagen' }),
        el('button', { class: 'btn', onclick: function () { window.print(); }, text: 'Imprimir' })
      ]));
      main.appendChild(el('p', { class: 'hint noprint', text: 'Tamaño del código: ' + code.length + ' caracteres (nivel de corrección ' + res.level + ').' }));
    }, function () { holder.replaceChildren(el('p', { class: 'err', role: 'alert', text: 'Este navegador no puede generar el código. Usa una versión reciente de Chrome, Edge, Safari o Firefox.' })); });
  }

  /* ---------- respaldo ---------- */
  function buildBackup(main) {
    main.appendChild(el('h2', { text: 'Respaldo', style: 'margin:12px 0' }));
    main.appendChild(el('div', { class: 'card' }, [
      el('h3', { text: 'Guardar un respaldo' }),
      el('p', { class: 'hint', text: 'Descarga un archivo con todos tus planes y plantillas. Sirve para no perder nada y para pasar los planes a otro dispositivo. Contiene datos de pacientes: guárdalo en un lugar seguro.' }),
      el('button', { class: 'btn primary', onclick: function () {
        var data = { app: 'planes-sarenti', v: 1, exported: nowSec(), plans: plans, templates: templates };
        download(new Blob([JSON.stringify(data)], { type: 'application/json' }), 'sarenti-respaldo-' + new Date().toISOString().slice(0, 10) + '.json');
      }, text: 'Descargar respaldo' })
    ]));
    var msg = el('p', { role: 'status' });
    var file = el('input', { type: 'file', accept: '.json,application/json', 'aria-label': 'Archivo de respaldo', onchange: function (e) {
      var f = e.target.files[0]; if (!f) return;
      f.text().then(function (t) {
        var d = JSON.parse(t); if (!d || d.app !== 'planes-sarenti' || !Array.isArray(d.plans)) throw 0;
        var added = 0, updated = 0;
        d.plans.forEach(function (np) {
          var ex = plans.filter(function (x) { return x.id === np.id; })[0];
          if (!ex) { plans.push(np); added++; } else if ((np.updated || 0) > (ex.updated || 0)) { plans[plans.indexOf(ex)] = np; updated++; }
        });
        (d.templates || []).forEach(function (t2) { if (!templates.some(function (x) { return x.tplName === t2.tplName; })) templates.push(t2); });
        persist(); fillList(document.getElementById('plist'));
        msg.className = ''; msg.textContent = 'Listo: ' + added + ' planes nuevos y ' + updated + ' actualizados.';
      }).catch(function () { msg.className = 'err'; msg.textContent = 'Ese archivo no es un respaldo de Planes Sarenti.'; });
    } });
    main.appendChild(el('div', { class: 'card' }, [
      el('h3', { text: 'Cargar un respaldo' }),
      el('p', { class: 'hint', text: 'Une los planes del archivo con los de este dispositivo. Si un plan está en los dos, se queda el más reciente.' }),
      file, msg
    ]));
    main.appendChild(el('div', { class: 'card' }, [
      el('h3', { text: 'PIN y privacidad' }),
      el('p', { class: 'hint', text: 'El PIN evita que alguien abra la herramienta por casualidad. Los datos no están cifrados: protege también el dispositivo con su propio bloqueo de pantalla.' }),
      el('div', { class: 'row' }, [
        el('button', { class: 'btn', onclick: function () { var a = prompt('PIN actual:'); if (a === null) return; var d = lsGet(K_PIN); hashPin(a, d.salt).then(function (h) { if (h !== d.hash) return toast('PIN incorrecto'); lsDel(K_PIN); unlocked = false; render(); }); }, text: 'Cambiar PIN' }),
        el('button', { class: 'btn danger', onclick: function () { if (confirm('Se borrarán TODOS los planes y plantillas de este dispositivo. ¿Seguro?') && confirm('Última confirmación: ¿ya descargaste un respaldo?')) { lsDel(K_PLANS); lsDel(K_TPL); plans = []; templates = []; S.view = 'none'; render(); } }, text: 'Borrar todo' })
      ])
    ]));
  }

  /* ---------- inicio ---------- */
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(function () {});
  window.addEventListener('beforeunload', function () { if (!saved) persist(); });
  if (lsGet(K_PIN)) loadAll();
  render();
})();
