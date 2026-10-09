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
      if (v === null || v === undefined) continue;
      if (k.slice(0, 5) === 'aria-') { n.setAttribute(k, String(v)); continue; }
      if (v === false) continue;
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
  /* Un renglón que empieza con "# " es el nombre del platillo: la app lo muestra como título, sin casilla. */
  function isDish(t) { return t.slice(0, 2) === '# '; }
  function dishText(t) { return isDish(t) ? t.slice(2) : t; }
  function listEditor(arr, label, placeholder, onChange, dishes) {
    var box = el('div');
    function draw(focusIdx) {
      box.replaceChildren();
      arr.forEach(function (txt, i) {
        var dish = dishes && isDish(txt);
        var inp = el('input', { type: 'text', class: dish ? 'dish' : null, value: dishes ? dishText(txt) : txt, 'aria-label': (dish ? 'Platillo ' : label + ' ') + (i + 1), placeholder: dish ? 'Ej. Chilaquiles' : placeholder,
          oninput: function (e) { arr[i] = (dishes && isDish(arr[i]) ? '# ' : '') + e.target.value; onChange(); },
          onkeydown: function (e) { if (e.key === 'Enter') { e.preventDefault(); arr.splice(i + 1, 0, ''); onChange(); draw(i + 1); } } });
        var mark = dishes ? el('button', { class: 'dish-btn', type: 'button', 'aria-pressed': dish, title: 'Nombre del platillo (sin casilla en la app)', text: 'Platillo',
          onclick: function () { arr[i] = isDish(arr[i]) ? dishText(arr[i]) : '# ' + arr[i]; onChange(); draw(i); } }) : null;
        box.appendChild(el('div', { class: 'item' }, [inp, mark, el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Quitar: ' + (dishText(txt) || label + ' ' + (i + 1)), onclick: function () { arr.splice(i, 1); onChange(); draw(Math.max(0, i - 1)); }, text: '✕' })]));
        if (i === focusIdx) setTimeout(function () { inp.focus(); }, 0);
      });
      box.appendChild(el('button', { class: 'btn small', type: 'button', style: 'margin-top:4px', onclick: function () { arr.push(''); onChange(); draw(arr.length - 1); }, text: '+ Agregar' }));
    }
    draw(-1); box.draw = draw; return box;
  }
  /* Botones para agregar indicaciones comunes con un toque. Se ocultan las que ya están en la lista. */
  var SUGGEST = {
    daily: ['Probiótico en ayunas', 'Colágeno en la mañana', '2 litros de agua', 'Caminar 30 minutos', 'Dormir de 7 a 8 horas', 'Multivitamínico con el desayuno'],
    avoid: ['Refrescos y jugos industrializados', 'Pan dulce', 'Frituras', 'Alcohol', 'Comida rápida', 'Azúcar añadida', 'Embutidos'],
    prep: ['Hornear o asar, evitar freír', 'Pesar los alimentos en crudo', 'Cocinar con poco aceite', 'Usar aceite de oliva o de aguacate', 'Verduras al vapor', 'No agregar sal en la mesa']
  };
  function suggestions(arr, list, editor, onChange) {
    var row = el('div', { class: 'chips noprint' });
    function draw() {
      var have = arr.map(function (t) { return t.trim().toLowerCase(); });
      var left = list.filter(function (t) { return have.indexOf(t.toLowerCase()) < 0; });
      row.replaceChildren();
      if (!left.length) return;
      row.appendChild(el('span', { class: 'hint', text: 'Agregar rápido:' }));
      left.forEach(function (t) {
        row.appendChild(el('button', { class: 'chip', type: 'button', 'aria-label': 'Agregar: ' + t, onclick: function () {
          var i = arr.indexOf(''); if (i >= 0) arr[i] = t; else arr.push(t);
          onChange(); editor.draw(-1); draw();
        }, text: '+ ' + t }));
      });
    }
    draw(); row.draw = draw; return row;
  }
  function cleanPlan(p) {
    p.daily = p.daily.filter(function (s) { return s.trim(); }); p.avoid = p.avoid.filter(function (s) { return s.trim(); }); p.prep = p.prep.filter(function (s) { return s.trim(); });
    p.days.forEach(function (d) { d.forEach(function (m) { m.items = m.items.map(function (s) { s = s.trim(); return s === '#' ? '' : s; }).filter(Boolean); m.name = m.name.trim() || 'Comida'; }); });
  }

  function buildEditor(main, p) {
    main.appendChild(el('div', { class: 'field', style: 'margin-top:12px' }, [
      el('label', { for: 'pname', text: 'Nombre del paciente' }),
      el('input', { type: 'text', id: 'pname', value: p.name, autocomplete: 'off', oninput: function (e) { p.name = e.target.value; touch(); } })
    ]));
    main.appendChild(el('div', { class: 'tabs', role: 'group', 'aria-label': 'Sección' }, [
      el('button', { 'aria-pressed': S.tab === 'dias', onclick: function () { S.tab = 'dias'; render(); }, text: 'Comidas por día' }),
      el('button', { 'aria-pressed': S.tab === 'general', onclick: function () { S.tab = 'general'; render(); }, text: 'Indicaciones generales' }),
      el('button', { 'aria-pressed': S.tab === 'ia', onclick: function () { S.tab = 'ia'; render(); }, text: 'Llenar con IA' })
    ]));
    if (S.tab === 'dias') editDays(main, p); else if (S.tab === 'ia') buildAI(main, p); else editGeneral(main, p);

    main.appendChild(el('div', { class: 'status noprint', id: 'status', role: 'status', 'aria-live': 'polite', text: saved ? 'Guardado' : '', style: 'margin-top:8px' }));
    main.appendChild(el('div', { class: 'row noprint', style: 'margin:12px 0 24px' }, [
      el('button', { class: 'btn primary', onclick: function () { cleanPlan(p); touch(); persist(); S.view = 'qr'; render(); focusMain(); }, text: 'Generar QR' }),
      el('button', { class: 'btn', onclick: function () { var c = clone(p); c.id = uid(); c.name = p.name + ' (copia)'; c.updated = nowSec(); plans.push(c); S.sel = c.id; persist(); render(); toast('Plan duplicado'); }, text: 'Duplicar' }),
      el('button', { class: 'btn', onclick: function () { var n = prompt('Nombre de la plantilla (sin datos del paciente):', ''); if (!n) return; var c = clone(p); c.tplName = n.trim(); c.name = ''; delete c.ai; templates.push(c); persist(); toast('Plantilla guardada'); }, text: 'Guardar como plantilla' }),
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
      var chips, editor = listEditor(p[s[0]], s[1], s[2], function () { touch(); if (chips) chips.draw(); });
      chips = suggestions(p[s[0]], SUGGEST[s[0]], editor, touch);
      main.appendChild(editor); main.appendChild(chips);
    });
  }

  function editDays(main, p) {
    var dayRow = el('div', { class: 'days', role: 'group', 'aria-label': 'Día de la semana' });
    DAYS.forEach(function (n, i) { dayRow.appendChild(el('button', { class: 'day', 'aria-pressed': S.day === i, 'aria-label': n, onclick: function () { S.day = i; render(); }, text: DAY_L[i] })); });
    main.appendChild(dayRow);
    main.appendChild(el('h2', { text: DAYS[S.day], style: 'margin-bottom:10px' }));
    var meals = p.days[S.day];
    meals.forEach(function (m, mi) {
      var items = listEditor(m.items, 'Alimento', 'Ej. 2 huevos', touch, true);
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

  /* ---------- llenar con IA ---------- */
  /* La doctora copia las instrucciones a una IA (ChatGPT, Gemini…) y pega la respuesta JSON.
     Los datos del paciente se guardan en p.ai solo en este dispositivo: no van en el QR. */
  var AI_MEALS = [['DESAYUNO', 'Desayuno', '08:00'], ['COLACIÓN MAÑANERA', 'Colación', '11:00'], ['COMIDA', 'Comida', '14:00'], ['COLACIÓN VESPERTINA', 'Colación', '17:00'], ['CENA', 'Cena', '20:00']];
  var AI_DAYS = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO'];
  var AI_FIELDS = [['edad', 'Edad', 'Ej. 34 años'], ['peso', 'Peso', 'Ej. 72 kg'], ['cond', 'Condición', 'Ej. resistencia a la insulina'],
    ['nogusta', 'No le gusta (alimento o ingrediente)', 'Ej. hígado, brócoli'], ['alergia', 'Es alérgico', 'Ej. nuez, o "ninguna"'], ['objetivo', 'El objetivo es', 'Ej. bajar 5 kg de grasa']];
  function norm(t) { return String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/\s+/g, ' ').trim(); }
  function aiPrompt(d) {
    var skel = '{\n' + AI_MEALS.map(function (m, i) {
      return '  "' + m[0] + '": {\n' + AI_DAYS.map(function (n, j) { return '    "' + n + '": ""' + (j < 6 ? ',' : ''); }).join('\n') + '\n  }' + (i < 4 ? ',' : '');
    }).join('\n') + '\n}';
    return 'Actúa como nutriólogo/a. Genera un plan de alimentación saludable y variado de 7 días:\n\n' +
      'La o el paciente tiene:\n\nEDAD: ' + d.edad + '\n\nPESO: ' + d.peso + '\n\nCondición: ' + d.cond +
      '\n\nNo le gusta (alimento o ingrediente): ' + d.nogusta + '\n\nEs alérgico: ' + d.alergia + '\n\n\nEl objetivo es: ' + d.objetivo + '\n\n\n' +
      'Comidas (en este orden): DESAYUNO, COLACIÓN MAÑANERA, COMIDA, COLACIÓN VESPERTINA, CENA.\n' +
      'Días: LUNES, MARTES, MIÉRCOLES, JUEVES, VIERNES, SÁBADO, DOMINGO.\n\n' +
      'REGLAS DE FORMATO (muy importantes):\n' +
      '- Responde ÚNICAMENTE con un objeto JSON válido. Sin texto antes ni después, sin explicaciones y sin ``` .\n' +
      '- Usa EXACTAMENTE las mismas llaves (en MAYÚSCULAS) que el esqueleto de abajo.\n' +
      '- El valor de cada celda es un texto; escribe cada alimento o cantidad en su propia línea separada con \\n.\n' +
      '- Si el platillo tiene nombre (ej. "Pasta boloñesa", "Ensalada César"), ponlo en la PRIMERA línea de la celda empezando con # (ej. "# Pasta boloñesa") y debajo los ingredientes o cantidades. Si no tiene nombre, deja solo los ingredientes.\n' +
      '- Si una comida no aplica para algún día, deja la celda como cadena vacía "".\n\n' +
      'Esqueleto a llenar (rellena los valores manteniendo las llaves):\n' + skel;
  }
  function aiMeal(key) {
    var k = norm(key);
    if (k.indexOf('COLACION') >= 0) return /VESPER|TARDE/.test(k) ? 3 : 1;
    if (k.indexOf('DESAYUNO') >= 0) return 0;
    if (k.indexOf('CENA') >= 0) return 4;
    if (k.indexOf('COMIDA') >= 0) return 2;
    return -1;
  }
  /* Devuelve 7 días × 5 comidas con la lista de alimentos de cada una. Tolera texto alrededor y acentos distintos. */
  function parseAI(text) {
    var a = text.indexOf('{'), b = text.lastIndexOf('}'), o, found = 0;
    if (a < 0 || b < a) throw new Error('No encontré el plan en lo que pegaste. Copia la respuesta completa de la IA.');
    try { o = JSON.parse(text.slice(a, b + 1)); } catch (e) { throw new Error('La respuesta está incompleta o tiene un error. Pide a la IA que la vuelva a escribir solo como JSON.'); }
    var days = AI_DAYS.map(function () { return [[], [], [], [], []]; }), dayKeys = AI_DAYS.map(norm);
    Object.keys(o || {}).forEach(function (mk) {
      var mi = aiMeal(mk), row = o[mk];
      if (mi < 0 || !row || typeof row !== 'object') return;
      Object.keys(row).forEach(function (dk) {
        var di = dayKeys.indexOf(norm(dk)), v = row[dk];
        if (di < 0) return;
        if (Array.isArray(v)) v = v.join('\n');
        if (typeof v !== 'string') return;
        var lines = v.split(/\r?\n/).map(function (t) { return t.replace(/^\s*[-•*]\s*/, '').trim(); }).filter(function (t) { return t && t !== '#'; });
        // El nombre del platillo viene con "#". Si la IA no lo puso, la primera línea es nombre cuando no empieza con cantidad y las demás sí.
        var marked = lines.some(function (t) { return t[0] === '#'; }), qty = /^[\d½¼¾]/;
        if (!marked && lines.length > 1 && !qty.test(lines[0]) && lines.slice(1).some(function (t) { return qty.test(t); })) lines[0] = '# ' + lines[0];
        days[di][mi] = lines.map(function (t) { return (t[0] === '#' ? '# ' + t.replace(/^#+\s*/, '') : t).slice(0, 200); }).slice(0, 40);
        found++;
      });
    });
    if (!found) throw new Error('No encontré las comidas y los días esperados. Revisa que pegaste la respuesta de estas instrucciones.');
    return days;
  }
  function applyAI(p, days) {
    p.days = days.map(function (day, di) {
      var old = p.days[di] || [];
      return AI_MEALS.map(function (m, mi) {
        var prev = old[mi] && norm(old[mi].name) === norm(m[1]) ? old[mi].time : null;
        return { name: m[1], time: prev || m[2], items: day[mi] };
      }).filter(function (m) { return m.items.length; });
    });
  }
  function buildAI(main, p) {
    var d = p.ai || (p.ai = {});
    AI_FIELDS.forEach(function (f) { if (typeof d[f[0]] !== 'string') d[f[0]] = ''; });
    main.appendChild(el('p', { class: 'hint', text: 'Genera los 7 días con ChatGPT u otra IA. Las instrucciones no incluyen el nombre del paciente.' }));

    main.appendChild(el('div', { class: 'sub', text: '1. Datos del paciente' }));
    AI_FIELDS.forEach(function (f) {
      main.appendChild(el('div', { class: 'field' }, [
        el('label', { for: 'ai-' + f[0], text: f[1] }),
        el('input', { type: 'text', id: 'ai-' + f[0], value: d[f[0]], placeholder: f[2], autocomplete: 'off', oninput: function (e) { d[f[0]] = e.target.value; touch(); } })
      ]));
    });

    main.appendChild(el('div', { class: 'sub', text: '2. Copiar las instrucciones' }));
    main.appendChild(el('p', { class: 'hint', text: 'Pégalas en ChatGPT, Gemini, Claude u otra IA y espera la respuesta.' }));
    var shown = el('textarea', { readonly: true, 'aria-label': 'Instrucciones para la IA', style: 'min-height:220px', onfocus: function (e) { e.target.select(); } });
    var det = el('details', { class: 'card', ontoggle: function () { shown.value = aiPrompt(d); } }, [el('summary', { text: 'Ver las instrucciones', style: 'min-height:44px;cursor:pointer;font-weight:600;display:flex;align-items:center' }), shown]);
    main.appendChild(el('div', { class: 'row', style: 'margin-bottom:10px' }, [el('button', { class: 'btn primary', onclick: function () {
      var t = aiPrompt(d);
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { toast('Instrucciones copiadas'); },
        function () { det.open = true; shown.value = t; shown.focus(); toast('Selecciona y copia las instrucciones'); });
    }, text: 'Copiar instrucciones' })]));
    main.appendChild(det);

    main.appendChild(el('div', { class: 'sub', text: '3. Pegar la respuesta' }));
    main.appendChild(el('p', { class: 'hint', text: 'Copia la respuesta completa de la IA y pégala aquí. Se reemplazan las comidas de los 7 días; después puedes ajustarlas.' }));
    var ta = el('textarea', { 'aria-label': 'Respuesta de la IA', placeholder: '{ "DESAYUNO": { "LUNES": "…" } … }', style: 'min-height:160px' });
    var msg = el('p', { class: 'err', role: 'alert' });
    main.appendChild(ta);
    main.appendChild(el('div', { class: 'row', style: 'margin-top:8px' }, [el('button', { class: 'btn primary', onclick: function () {
      msg.textContent = '';
      var days; try { days = parseAI(ta.value); } catch (e) { msg.textContent = e.message; return; }
      var has = p.days.some(function (day) { return day.some(function (m) { return m.items.length; }); });
      if (has && !confirm('Se reemplazarán las comidas de los 7 días de este plan. ¿Continuar?')) return;
      applyAI(p, days); touch(); persist();
      S.tab = 'dias'; S.day = 0; render(); focusMain(); toast('Listo. Revisa y ajusta cada día.');
    }, text: 'Poner en el plan' })]));
    main.appendChild(msg);
  }

  /* ---------- QR ---------- */
  function makeQR(text) {
    var last;
    for (var lv of ['M', 'L']) {
      try { var q = qrcode(0, lv); q.addData(text, 'Byte'); q.make(); return { q: q, level: lv }; } catch (e) { last = e; }
    }
    throw new Error('El plan es demasiado largo para un QR. Acorta algunos textos.');
  }
  /* QR en forma de corazón, como un mosaico de cuadritos color vino del logo.
     El QR real va en el centro y el resto del corazón
     se llena con cuadritos de relleno que no son parte del código. El corazón es un rombo (centro C, media
     diagonal h) más dos semicírculos en sus lados de arriba; el cuadro del QR (lado 0.62·2h, subido 0.32·h)
     queda dentro con margen. El relleno sale de una semilla del propio QR: el mismo plan da la misma imagen. */
  var WINE = '#8E2373';
  function heartPath(cx, cy, h) {
    var r = h / Math.SQRT2;
    return 'M' + cx + ',' + (cy + h) + 'L' + (cx - h) + ',' + cy + 'A' + r + ',' + r + ' 0 1 1 ' + cx + ',' + (cy - h) +
      'A' + r + ',' + r + ' 0 1 1 ' + (cx + h) + ',' + cy + 'Z';
  }
  function inHeart(x, y, cx, cy, h) {
    var r = h / Math.SQRT2, dl = Math.hypot(x - cx + h / 2, y - cy + h / 2), dr = Math.hypot(x - cx - h / 2, y - cy + h / 2);
    return Math.abs(x - cx) + Math.abs(y - cy) <= h || dl <= r || dr <= r;
  }
  function heartLayout(q) {
    var n = q.getModuleCount(), gap = 1, side = n + 2 * gap, pad = 1, k = 1.2072;
    var h = side / 0.62 / 2, qc = n / 2, cx = qc, cy = qc + 0.32 * h;   // coordenadas en cuadritos, QR en [0, n)
    var ox = pad - (cx - k * h), oy = pad - (cy - k * h);                  // desplazamiento al lienzo
    var seed = n;
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) seed = (Math.imul(seed, 31) + (q.isDark(r, c) ? 1 : 0)) | 0;
    function rnd() { seed = (seed + 0x6D2B79F5) | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; }
    /* Solo junto a los 3 cuadros de las esquinas queda un margen claro (para que el celular los encuentre);
       en el resto de la orilla el relleno toca el QR y no se nota dónde empieza. */
    function nearFinder(x, y) {
      function near(a, lo) { return a >= lo - gap && a < lo + 7 + gap; }
      return (near(x, 0) && near(y, 0)) || (near(x, n - 7) && near(y, 0)) || (near(x, 0) && near(y, n - 7));
    }
    var cells = [];
    for (var y = Math.floor(cy - k * h); y < Math.ceil(cy + h); y++) for (var x = Math.floor(cx - k * h); x < Math.ceil(cx + k * h); x++) {
      var dark;
      if (x >= 0 && x < n && y >= 0 && y < n) dark = q.isDark(y, x);
      else if (nearFinder(x, y)) dark = false;
      else dark = rnd() < 0.5 && inHeart(x + 0.5, y + 0.5, cx, cy, h + 0.7);
      if (dark) cells.push([x + ox, y + oy]);
    }
    /* Etiqueta blanca para el nombre, en la punta del corazón debajo del QR (no tapa nada del código).
       Su ancho máximo es el del corazón a la altura de su orilla de abajo. */
    var fs = Math.max(6, n * 0.09), lh = fs * 1.55, ly = n + 1.5, maxW = 2 * (h - (ly + lh - cy)) - 3;
    return { w: 2 * k * h + 2 * pad, h: (k + 1) * h + 2 * pad, outer: heartPath(cx + ox, cy + oy, h), cells: cells, box: [ox - gap, oy - gap, side],
      label: { cx: cx + ox, y: ly + oy, h: lh, fs: fs, maxW: maxW } };
  }
  var NAME_FONT = '700 {fs}px "Cormorant Garamond", Georgia, serif';
  function labelSize(lb, name) {   // ancho del texto medido con la tipografía real; se encoge si no cabe
    var g = document.createElement('canvas').getContext('2d'); g.font = NAME_FONT.replace('{fs}', 100);
    var tw = g.measureText(name).width / 100 * lb.fs, padX = lb.fs * 0.8, fit = Math.min(1, (lb.maxW - 2 * padX) / tw);
    return { tw: tw * fit, fs: lb.fs * Math.max(fit, 0.55), squeeze: fit < 0.55, w: Math.min(lb.maxW, tw * fit + 2 * padX) };
  }
  function xmlEsc(t) { return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function qrSvg(q, name) {
    var L = heartLayout(q), d = L.cells.map(function (p) { return 'M' + p[0] + ',' + p[1] + 'h1v1h-1z'; }).join('');
    var lb = L.label, z = labelSize(lb, name);
    var label = '<rect x="' + (lb.cx - z.w / 2).toFixed(2) + '" y="' + lb.y.toFixed(2) + '" width="' + z.w.toFixed(2) + '" height="' + lb.h.toFixed(2) + '" rx="' + (lb.h / 2).toFixed(2) + '" fill="#fff"/>' +
      '<text x="' + lb.cx.toFixed(2) + '" y="' + (lb.y + lb.h / 2).toFixed(2) + '" dy="0.34em" text-anchor="middle" fill="' + WINE + '" font-family="\'Cormorant Garamond\', Georgia, serif" font-weight="700" font-size="' + z.fs.toFixed(2) + '"' +
      (z.squeeze ? ' textLength="' + z.tw.toFixed(2) + '" lengthAdjust="spacingAndGlyphs"' : '') + '>' + xmlEsc(name) + '</text>';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + L.w.toFixed(2) + ' ' + L.h.toFixed(2) + '" role="img" aria-label="Código QR del plan en forma de corazón">' +
      '<defs><clipPath id="hc"><path d="' + L.outer + '"/></clipPath></defs>' +
      '<path d="' + d + '" fill="' + WINE + '" clip-path="url(#hc)" shape-rendering="crispEdges"/>' + label + '</svg>';
  }
  function qrPng(q, name) {
    var L = heartLayout(q), px = Math.max(6, Math.floor(1200 / L.w)), lb = L.label, z = labelSize(lb, name);
    var cv = document.createElement('canvas'); cv.width = Math.ceil(L.w * px); cv.height = Math.ceil(L.h * px);
    var g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height);
    g.save(); g.scale(px, px); g.clip(new Path2D(L.outer)); g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = WINE;
    L.cells.forEach(function (p) { var x = Math.round(p[0] * px), y = Math.round(p[1] * px); g.fillRect(x, y, Math.round((p[0] + 1) * px) - x, Math.round((p[1] + 1) * px) - y); });
    g.restore();
    g.save(); g.scale(px, px);
    g.fillStyle = '#fff'; g.beginPath(); g.roundRect(lb.cx - z.w / 2, lb.y, z.w, lb.h, lb.h / 2); g.fill();
    g.fillStyle = WINE; g.font = NAME_FONT.replace('{fs}', z.fs); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(name, lb.cx, lb.y + lb.h / 2 + z.fs * 0.06, z.w - lb.fs);
    g.restore();
    return cv;
  }
  function download(blob, fname) { var a = el('a', { href: URL.createObjectURL(blob), download: fname }); document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
  function slug(s) { return (s || 'plan').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'plan'; }

  function buildQR(main, p) {
    main.appendChild(el('div', { class: 'row noprint', style: 'margin:8px 0' }, [el('button', { class: 'btn small', onclick: function () { S.view = 'edit'; render(); focusMain(); }, text: '← Volver al plan' })]));
    var holder = el('div', { class: 'qrbox' }, [el('p', { class: 'muted', text: 'Generando…' })]);
    main.appendChild(holder);
    var fontReady = document.fonts ? document.fonts.load('700 20px "Cormorant Garamond"').catch(function () {}) : null;
    Promise.all([SarentiCodec.encode(p), fontReady]).then(function (r) {
      var code = r[0], res;
      try { res = makeQR(code); } catch (e) { holder.replaceChildren(el('p', { class: 'err', role: 'alert', text: e.message })); return; }
      var wrap = el('div'); wrap.innerHTML = qrSvg(res.q, p.name || 'Paciente');
      holder.replaceChildren(wrap.firstChild, el('p', { class: 'hint', text: 'Muéstralo en la pantalla o imprímelo. El paciente lo escanea con Mi Plan Sarenti.' }));
      /* Mensaje y código van separados para mandarlos en dos mensajes de WhatsApp. */
      function copy(box, done) {
        (navigator.clipboard ? navigator.clipboard.writeText(box.value) : Promise.reject()).then(function () { toast(done); }, function () { box.focus(); box.select(); toast('Selecciona y copia el texto'); });
      }
      var mbox = el('textarea', { 'aria-label': 'Mensaje para WhatsApp', style: 'min-height:80px' });
      mbox.value = 'Hola, te comparto tu plan de alimentación de Mi Plan Sarenti. En el siguiente mensaje va tu código: cópialo completo y en la app elige “Código manual”.';
      var ta = el('textarea', { readonly: true, 'aria-label': 'Código del plan', onfocus: function (e) { e.target.select(); } }); ta.value = code;
      main.appendChild(el('div', { class: 'sub noprint', text: 'Mensaje' }));
      main.appendChild(el('p', { class: 'hint noprint', text: 'Para pacientes que lo reciben por WhatsApp en lugar de escanear. Mándalo primero; puedes cambiar el texto.' }));
      main.appendChild(mbox);
      main.appendChild(el('div', { class: 'row noprint', style: 'margin:10px 0' }, [el('button', { class: 'btn primary', onclick: function () { copy(mbox, 'Mensaje copiado'); }, text: 'Copiar mensaje' })]));
      main.appendChild(el('div', { class: 'sub noprint', text: 'Código manual' }));
      main.appendChild(el('p', { class: 'hint noprint', text: 'Mándalo en un mensaje aparte, sin cambiarlo.' }));
      main.appendChild(ta);
      main.appendChild(el('div', { class: 'row noprint', style: 'margin:10px 0' }, [el('button', { class: 'btn primary', onclick: function () { copy(ta, 'Código copiado'); }, text: 'Copiar código' })]));
      main.appendChild(el('div', { class: 'row noprint', style: 'margin:10px 0' }, [
        el('a', { class: 'btn', href: '#', onclick: function (e) { e.preventDefault(); window.open('https://wa.me/?text=' + encodeURIComponent(mbox.value + '\n\n' + code), '_blank', 'noopener'); }, text: 'Enviar todo junto por WhatsApp' }),
        el('button', { class: 'btn', onclick: function () { qrPng(res.q, p.name || 'Paciente').toBlob(function (b) { download(b, 'plan-' + slug(p.name) + '.png'); }); }, text: 'Descargar imagen' }),
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
