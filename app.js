/* Planes Sarenti: herramienta privada de la doctora. Todo se guarda en este dispositivo.
   El diseño sigue sarenti-planes-rediseno/ (maquetas, tokens.json y LEEME-PARA-LA-IA.md). */
(function () {
  'use strict';
  var K_PLANS = 'sarenti.plans.v1', K_TPL = 'sarenti.templates.v1', K_PIN = 'sarenti.pin.v1';
  var DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  var DAY_S = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
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
  function fmtDate(s) { if (!s) return ''; return new Date(s * 1000).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', ''); }
  function toast(msg) { var t = el('div', { class: 'toast', role: 'status', text: msg }); document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2600); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function copyText(t, done, fail) {
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { toast(done); },
      fail || function () { toast('Este navegador no dejó copiar. Selecciona el texto y cópialo.'); });
  }

  /* Íconos de línea (trazo 1.8), los mismos de las maquetas. Sin emojis. */
  var ICONS = {
    monitor: [1.8, '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>'],
    download: [1.8, '<path d="M12 3v12M7 10l5 5 5-5M4 19h16"/>'],
    lock: [1.8, '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'],
    sidebar: [1.8, '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M14 10l2 2-2 2"/>'],
    sidebarOff: [1.8, '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M16 10l-2 2 2 2"/>'],
    plus: [2, '<path d="M12 5v14M5 12h14"/>'],
    right: [2, '<path d="M5 12h14M13 6l6 6-6 6"/>'],
    left: [2, '<path d="M19 12H5M11 6l-6 6 6 6"/>'],
    check: [2.4, '<path d="M5 12l5 5 9-10"/>'],
    dots: [0, '<circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/>'],
    spark: [1.8, '<path d="M12 3l1.8 4.6L18 9l-4.2 1.4L12 15l-1.8-4.6L6 9l4.2-1.4zM19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>'],
    copy: [1.8, '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>'],
    info: [1.8, '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>'],
    trash: [1.8, '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'],
    x: [2, '<path d="M6 6l12 12M18 6L6 18"/>'],
    drop: [1.8, '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>'],
    cal: [1.8, '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16M9 15l2 2 4-4"/>'],
    ban: [1.8, '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>'],
    pot: [1.8, '<path d="M4 11h16a8 8 0 0 1-16 0zM8 7c0-1 1-2 1-3M12 7c0-1 1-2 1-3M16 7c0-1 1-2 1-3"/>'],
    expand: [1.8, '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'],
    heart: [1.8, '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>'],
    print: [1.8, '<path d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z"/>'],
    search: [1.8, '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>'],
    chev: [2, '<path d="M9 6l6 6-6 6"/>'],
    alert: [1.8, '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9L2.5 17.5A2 2 0 0 0 4.2 20.5h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>'],
    file: [1.8, '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M12 12v6M9 15h6"/>'],
    clock: [1.8, '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'],
    upload: [1.8, '<path d="M12 21V9M7 14l5-5 5 5M4 5h16"/>']
  };
  function icon(n, size) {
    var d = ICONS[n], s = size || 18, t = document.createElement('span');
    t.innerHTML = '<svg aria-hidden="true" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" ' +
      (d[0] ? 'fill="none" stroke="currentColor" stroke-width="' + d[0] + '" stroke-linecap="round" stroke-linejoin="round"' : 'fill="currentColor"') + '>' + d[1] + '</svg>';
    return t.firstChild;
  }
  /* Iniciales: primer nombre y primer apellido ("Renata Alexanders Ponce Paredes" → RP). */
  function initials(n) {
    var w = String(n || '').trim().split(/\s+/).filter(Boolean);
    if (!w.length) return '?';
    var b = w.length >= 4 ? w[2] : w.length > 1 ? w[1] : '';
    return (w[0][0] + (b ? b[0] : (w[0][1] || ''))).toUpperCase();
  }
  function lowerFirst(s) { return s ? s[0].toLowerCase() + s.slice(1) : s; }
  function numOnly(v) { var m = /^\s*(\d+(?:[.,]\d+)?)\s*(años?|kg|kilos?)?\.?\s*$/i.exec(v || ''); return m ? m[1] : (v || ''); }
  function withUnit(v, u) { v = String(v || '').trim(); return /^\d+([.,]\d+)?$/.test(v) ? v + ' ' + u : v; }

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
  /* view: home | new | backup | plan. En un plan, step 1 a 5; el paso 1 tiene dos partes (datos | ia). */
  var S = { sel: null, view: 'home', step: 1, part: 'datos', day: 0, search: '', side: false };
  function resetUI() { S.side = false; S.copyOpen = false; S.timeEdit = -1; S.paste = false; S.showPrompt = false; S.msg = null; S.editMsg = false; S.shopView = 'cat'; S.shopMore = {}; }
  resetUI();
  var saveTimer = null, saved = true;

  function loadAll() {
    var p = lsGet(K_PLANS), t = lsGet(K_TPL);
    plans = Array.isArray(p) ? p : []; templates = Array.isArray(t) ? t : [];
    // Planes llenados con IA antes de este arreglo: separa los "\n" que quedaron escritos como texto en un mismo renglón.
    var fixed = false;
    plans.concat(templates).forEach(function (pl) {
      (pl && pl.days || []).forEach(function (day) {
        (day || []).forEach(function (m) {
          if (!m || !Array.isArray(m.items) || !m.items.some(function (t) { return typeof t === 'string' && t.indexOf('\\n') >= 0; })) return;
          m.items = [].concat.apply([], m.items.map(function (t) {
            return typeof t === 'string' ? t.split('\\n').map(function (x) { return x.trim(); }).filter(Boolean) : [t];
          }));
          fixed = true;
        });
      });
    });
    if (fixed) persist();
  }
  function persist() {
    var ok = lsSet(K_PLANS, plans) && lsSet(K_TPL, templates);
    saved = true; setStatus(ok ? 'Guardado' : 'No se pudo guardar. Descarga un respaldo.');
  }
  function touch() {
    var p = cur(); if (p) p.updated = nowSec();
    saved = false; setStatus('Guardando…');
    clearTimeout(saveTimer); saveTimer = setTimeout(persist, 300);
  }
  function softSave() { clearTimeout(saveTimer); saveTimer = setTimeout(persist, 300); }   // sin cambiar la fecha del plan
  /* "Guardado" en verde dentro de la ficha del paciente: no hay botón de guardar. */
  function setStatus(t) {
    var s = document.getElementById('status'); if (!s) return;
    s.lastChild.textContent = t;
    s.className = 'saved' + (t === 'Guardado' ? '' : t === 'Guardando…' ? ' busy' : ' bad');
  }
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
  function lock() { unlocked = false; S.sel = null; S.view = 'home'; render(); }
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
    var forgot = first ? null : el('button', { class: 'link', type: 'button', text: 'Olvidé mi PIN', onclick: function () {
      if (confirm('Para entrar de nuevo se borrarán todos los planes de este dispositivo. Si tienes un respaldo podrás importarlo después. ¿Continuar?')) {
        lsDel(K_PLANS); lsDel(K_TPL); lsDel(K_PIN); plans = []; templates = []; render();
      }
    } });
    app.replaceChildren(el('main', { class: 'lock' }, [el('div', { class: 'card' }, [
      el('img', { src: 'img/logo.png', alt: 'Sarenti, medicina estética' }),
      el('span', { class: 'eb', text: 'Sarenti' }),
      el('h1', { text: 'Planes de alimentación' }),
      el('p', { class: 'muted', text: first ? 'Elige un PIN para proteger esta herramienta. Se guarda solo en este dispositivo.' : 'Escribe tu PIN para entrar.' }),
      el('form', { onsubmit: go }, [pin, pin2, msg, el('button', { class: 'btn primary', type: 'submit', style: 'min-height:48px;font-size:16px;font-weight:600', text: first ? 'Crear PIN y entrar' : 'Entrar' })]),
      forgot
    ])]));
    pin.focus();
  }

  /* ---------- armazón ---------- */
  function render() {
    stopScan();
    if (!unlocked) return renderLock();
    var p = S.view === 'plan' ? cur() : null;
    if (S.view === 'plan' && !p) S.view = 'home';
    var main = el('main', { class: 'main', id: 'main' });
    /* En Inicio la barra de pacientes se ve completa; en el plan empieza como riel angosto. */
    var side = S.view !== 'plan' || S.side ? buildPanel() : buildRail(p);
    if (S.view === 'home') buildHome(main);
    else if (S.view === 'new') buildNew(main);
    else if (S.view === 'backup') buildBackup(main);
    else buildPlan(main, p);
    app.replaceChildren(header(), el('div', { class: 'wrap' }, [side, main]));
  }
  function go(view) { S.view = view; if (view !== 'plan') S.sel = null; render(); focusMain(); }
  function focusMain() { var m = document.getElementById('main'); if (m) { m.setAttribute('tabindex', '-1'); m.focus({ preventScroll: true }); window.scrollTo(0, 0); } }

  function header() {
    return el('header', { class: 'hd' }, [el('div', { class: 'hdi' }, [
      el('button', { class: 'brand', type: 'button', 'aria-label': 'Planes de alimentación: ir al inicio', onclick: function () { go('home'); } }, [
        el('img', { src: 'img/logo.png', alt: '' }),
        el('span', { class: 't' }, [el('span', { class: 'eb', text: 'Sarenti' }), el('span', { class: 'serif', text: 'Planes de alimentación' })])
      ]),
      el('div', { class: 'acts' }, [
        el('span', { class: 'chip' }, [icon('monitor', 16), 'Guardado solo en este dispositivo']),
        el('button', { class: 'btn', type: 'button', onclick: function () { go('backup'); } }, [icon('download'), 'Respaldo']),
        el('button', { class: 'btn', type: 'button', onclick: lock }, [icon('lock'), 'Bloquear'])
      ])
    ])]);
  }

  /* ---------- barra lateral ---------- */
  function buildPanel() {
    var list = el('div', { class: 'plist', id: 'plist' }), n = plans.length;
    var panel = el('aside', { class: 'panel card', 'aria-label': 'Pacientes' }, [
      el('div', { class: 'side-h' }, [
        el('h2', { text: 'Pacientes' }),
        el('span', { class: 'row', style: 'gap:6px' }, [
          el('span', { class: 'chip', text: n + (n === 1 ? ' paciente' : ' pacientes') }),
          S.view === 'plan' ? el('button', { class: 'ib', type: 'button', 'aria-label': 'Ocultar barra lateral', title: 'Ocultar barra lateral', 'aria-expanded': 'true', onclick: function () { S.side = false; render(); } }, [icon('sidebarOff', 20)]) : null
        ])
      ]),
      el('button', { class: 'big-new', type: 'button', onclick: function () { go('new'); } }, [icon('plus', 20), 'Nuevo plan']),
      el('div', { class: 'fld', style: 'gap:8px' }, [
        el('label', { for: 'buscar', class: 'lbl', text: 'Buscar paciente' }),
        el('div', { class: 'search' }, [icon('search'), el('input', { id: 'buscar', type: 'search', placeholder: 'Nombre o apellido', value: S.search, autocomplete: 'off', oninput: function (e) { S.search = e.target.value; fillList(list); } })])
      ]),
      el('div', { class: 'fld', style: 'gap:8px' }, [el('span', { class: 'cap', text: 'Recientes' }), list]),
      el('div', { class: 'tip' }, [icon('alert'), el('span', { text: 'Como los planes viven solo en este equipo, descarga un respaldo cada semana para no perderlos.' })])
    ]);
    fillList(list);
    return panel;
  }
  function fillList(list) {
    var q = norm(S.search);
    var items = plans.filter(function (p) { return !q || norm(p.name).indexOf(q) >= 0; }).sort(function (a, b) { return b.updated - a.updated; });
    list.replaceChildren();
    if (!items.length) list.appendChild(el('p', { class: 'hint', text: plans.length ? 'No hay coincidencias.' : 'Aún no hay planes. Crea el primero con “Nuevo plan”.' }));
    items.forEach(function (p) {
      list.appendChild(el('button', { class: 'pitem', type: 'button', 'aria-current': p.id === S.sel ? 'true' : null, onclick: function () { openPlan(p); } }, [
        el('span', { class: 'av', 'aria-hidden': 'true', text: initials(p.name) }),
        el('span', { class: 'tx' }, [el('span', { class: 'nm', text: p.name || 'Sin nombre' }), el('span', { class: 'dt', text: 'Actualizado ' + fmtDate(p.updated) })]),
        icon('chev')
      ]));
    });
  }
  function buildRail(p) {
    return el('nav', { class: 'rail', 'aria-label': 'Barra lateral' }, [
      el('button', { class: 'ib2', type: 'button', 'aria-label': 'Mostrar barra lateral', title: 'Mostrar barra lateral', 'aria-expanded': 'false', onclick: function () { S.side = true; render(); } }, [icon('sidebar', 20)]),
      el('button', { class: 'ib2 primary', type: 'button', 'aria-label': 'Nuevo plan', title: 'Nuevo plan', onclick: function () { go('new'); } }, [icon('plus', 20)]),
      el('span', { class: 'sep', 'aria-hidden': 'true' }),
      el('button', { class: 'av', type: 'button', 'aria-label': 'Datos de ' + (p.name || 'este paciente'), title: p.name || 'Sin nombre', text: initials(p.name),
        onclick: function () { S.step = 1; S.part = 'datos'; render(); focusMain(); } })
    ]);
  }
  function hasMeals(p) { return p.days.some(function (d) { return d.some(function (m) { return m.items.some(function (t) { t = String(t).trim(); return t && !isDish(t); }); }); }); }
  function partOneDone(p) { return !!(p.ai && p.ai.ok) || hasMeals(p); }
  function openPlan(p) {
    S.sel = p.id; S.view = 'plan'; S.day = 0; resetUI();
    S.step = hasMeals(p) ? 2 : 1; S.part = partOneDone(p) ? 'ia' : 'datos';
    render(); focusMain();
  }

  /* ---------- inicio ---------- */
  function tile(ic, title, desc, fn, primary) {
    return el('button', { class: 'tile' + (primary ? ' primary' : ''), type: 'button', onclick: fn }, [
      el('span', { class: 'ic', 'aria-hidden': 'true' }, [icon(ic, 22)]), el('span', { class: 'tt', text: title }), el('span', { class: 'ds', text: desc })]);
  }
  function hero(eb, title, text) {
    return el('div', { class: 'card hero' }, [el('span', { class: 'eb', text: eb }), el('h1', { text: title }), text ? el('p', { text: text }) : null]);
  }
  function buildHome(main) {
    var last = plans.slice().sort(function (a, b) { return b.updated - a.updated; })[0];
    main.append(
      hero('Inicio', 'Bienvenida', '¿Qué quieres hacer hoy? Elige a un paciente de la lista o empieza un plan nuevo.'),
      el('div', { class: 'tiles' }, [
        tile('file', 'Crear plan nuevo', 'Registra a un paciente y arma su plan de 7 días.', function () { go('new'); }, true),
        last ? tile('clock', 'Continuar el último', (last.name || 'Sin nombre') + ' · ' + fmtDate(last.updated), function () { openPlan(last); }) : null,
        tile('download', 'Hacer respaldo', 'Descarga una copia de todos los planes.', downloadBackup)
      ]),
      el('section', { class: 'card stack', style: 'padding:28px 32px' }, [
        el('h2', { text: 'Cómo funciona', style: 'font-size:24px' }),
        el('div', { class: 'how' }, [['Registra al paciente', 'Nombre y datos básicos.'], ['Arma su plan', 'Comidas día por día.'], ['Actualízalo', 'Ajusta el plan en cada consulta.']].map(function (h, i) {
          return el('div', null, [el('span', { class: 'n32', text: String(i + 1) }), el('span', null, [el('strong', { text: h[0] }), el('br'), h[1]])]);
        }))
      ])
    );
  }

  /* ---------- nuevo plan ---------- */
  function addPlan(p, step) {
    plans.push(p); S.sel = p.id; S.view = 'plan'; S.day = 0; resetUI();
    S.step = step || 1; S.part = step ? 'ia' : 'datos';
    persist(); render(); focusMain();
  }
  function buildNew(main) {
    function make(base) {
      var p = base ? clone(base) : blankPlan();
      p.id = uid(); p.name = base && base.tplName ? '' : (p.name || ''); delete p.tplName; p.updated = nowSec();
      addPlan(p);
    }
    main.append(
      hero('Nuevo plan', '¿Cómo quieres empezar?', 'Después capturas los datos del paciente y llenas los 7 días con IA.'),
      el('div', { class: 'tiles' }, [
        tile('file', 'Plan en blanco', 'Empieza desde cero con los datos del paciente.', function () { make(null); }, true),
        tile('spark', 'Plan de ejemplo', 'Con datos inventados, para practicar.', function () { make(samplePlan()); })
      ])
    );
    if (templates.length) {
      var box = el('section', { class: 'card stack', style: 'gap:8px' }, [el('div', { class: 'head-t', style: 'margin-bottom:8px' }, [el('h2', { text: 'Mis plantillas' }), el('p', { class: 'muted', style: 'font-size:15px', text: 'Planes guardados sin datos del paciente.' })])]);
      templates.forEach(function (t, i) {
        box.appendChild(el('div', { class: 'tpl' }, [el('strong', { text: t.tplName }),
          el('button', { class: 'btn small primary', type: 'button', onclick: function () { make(t); }, text: 'Usar' }),
          el('button', { class: 'btn small danger', type: 'button', 'aria-label': 'Borrar la plantilla ' + t.tplName, onclick: function () { if (confirm('¿Borrar la plantilla “' + t.tplName + '”?')) { templates.splice(i, 1); persist(); render(); } }, text: 'Borrar' })]));
      });
      main.appendChild(box);
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
        addPlan(p, 2);
      } catch (e) { msg.textContent = e.message; }
    }
    var ta = el('textarea', { id: 'code-in', class: 'paste', rows: '3', placeholder: 'SARENTI1.…' });
    main.appendChild(el('section', { class: 'card stack' }, [
      el('div', { class: 'head-t' }, [el('h2', { text: 'Abrir un plan que ya tiene QR' }), el('p', { class: 'muted', style: 'font-size:15px', text: 'Por ejemplo, uno hecho en otro dispositivo. Escanea el corazón o pega su código.' })]),
      scanner(loadCode),
      el('div', { class: 'fld' }, [el('label', { for: 'code-in', class: 'lbl', text: 'O pega el código: el mensaje de WhatsApp completo o solo lo que empieza con SARENTI' }), ta]),
      el('div', { class: 'row' }, [el('button', { class: 'btn', type: 'button', onclick: function () { loadCode(ta.value); }, text: 'Cargar código' })]),
      msg
    ]));
  }

  /* ---------- escanear QR ---------- */
  var scanStop = null;
  function stopScan() { if (scanStop) { scanStop(); scanStop = null; } }
  /* crop = [x, y, lado] de la imagen original: solo se lee ese cuadro (sin reducirlo) para que el QR del corazón,
     que es denso (~110 cuadritos por lado), no pierda nitidez. */
  function readQR(src, w, h, cv, crop) {
    cv.width = w; cv.height = h;
    var g = cv.getContext('2d', { willReadFrequently: true });
    if (crop) g.drawImage(src, crop[0], crop[1], crop[2], crop[2], 0, 0, w, h); else g.drawImage(src, 0, 0, w, h);
    var r = jsQR(g.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' });
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
      /* Sin pedir resolución, Safari en iPhone da 640×480 y los cuadritos del QR quedan de ~1.5 px: no se lee. */
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false }).then(function (stream) {
        stopScan();
        var alive = true, timer = null, n = 0;
        scanStop = function () { alive = false; clearTimeout(timer); stream.getTracks().forEach(function (t) { t.stop(); }); video.remove(); cam.hidden = false; stop.hidden = true; };
        video.srcObject = stream; box.prepend(video); video.play().catch(function () {});
        cam.hidden = true; stop.hidden = false; msg.textContent = 'Apunta la cámara al corazón y déjalo en el centro.';
        (function tick() {
          if (!alive) return;
          if (video.readyState >= 2 && video.videoWidth) {
            /* Se alterna: el cuadro del centro a resolución completa (hasta 1200 px) y la imagen entera reducida. */
            var vw = video.videoWidth, vh = video.videoHeight, c = Math.min(vw, vh), e = Math.min(c, 1200), t;
            if (n++ % 2 === 0) t = readQR(video, e, e, cv, [(vw - c) / 2, (vh - c) / 2, c]);
            else { var d = fit(vw, vh, 1200); t = readQR(video, d[0], d[1], cv); }
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

  /* ---------- plan del paciente ---------- */
  var STEPS = ['Datos e IA', 'Comidas por día', 'Indicaciones', 'Lista de compras', 'Compartir'];
  var STEPS_S = ['Datos e IA', 'Comidas', 'Indicaciones', 'Lista de compras', 'Compartir'];
  function buildPlan(main, p) {
    /* La ficha del paciente no aparece mientras se capturan sus datos (parte 1). */
    if (!(S.step === 1 && S.part === 'datos')) main.appendChild(patientCard(p));
    main.appendChild(stepsNav(p));
    [null, step1, step2, step3, step4, step5][S.step](main, p);
  }
  function goStep(p, k) {
    if (k === 5) return goQR(p);
    S.step = k; S.copyOpen = false; S.paste = false; S.timeEdit = -1; S.showPrompt = false;
    if (k === 1) S.part = partOneDone(p) ? 'ia' : 'datos';
    render(); focusMain();
  }
  function patientCard(p) {
    var d = p.ai || {}, chips = [];
    if (String(d.edad || '').trim()) chips.push(withUnit(d.edad, 'años'));
    if (String(d.peso || '').trim()) chips.push(withUnit(d.peso, 'kg'));
    if (String(d.objetivo || '').trim()) chips.push('Objetivo: ' + lowerFirst(d.objetivo.trim()));
    /* Duplicar, Guardar como plantilla y Eliminar van solo dentro de "Más". */
    var more = el('details', { class: 'more' }, [
      el('summary', { class: 'btn', 'aria-label': 'Más opciones: duplicar, guardar como plantilla o eliminar' }, [icon('dots'), 'Más']),
      el('div', { class: 'menu' }, [
        el('button', { type: 'button', onclick: function () { duplicatePlan(p); } }, [icon('copy'), 'Duplicar']),
        el('button', { type: 'button', onclick: function () { more.open = false; saveTemplate(p); } }, [icon('file'), 'Guardar como plantilla']),
        el('button', { type: 'button', class: 'danger', onclick: function () { more.open = false; removePlan(p); } }, [icon('trash'), 'Eliminar'])
      ])
    ]);
    return el('section', { class: 'card pcard', 'aria-label': 'Paciente' }, [
      el('div', { class: 'who' }, [
        el('span', { class: 'av', 'aria-hidden': 'true', text: initials(p.name) }),
        el('div', { style: 'min-width:0' }, [el('h1', { text: p.name || 'Sin nombre' }), chips.length ? el('div', { class: 'chips' }, chips.map(function (c) { return el('span', { class: 'chip', text: c }); })) : null])
      ]),
      el('div', { class: 'acts noprint' }, [
        el('span', { class: 'saved' + (saved ? '' : ' busy'), id: 'status', role: 'status', 'aria-live': 'polite' }, [icon('check', 16), el('span', { text: saved ? 'Guardado' : 'Guardando…' })]),
        more
      ])
    ]);
  }
  function duplicatePlan(p) {
    var c = clone(p); c.id = uid(); c.name = p.name + ' (copia)'; c.updated = nowSec();
    plans.push(c); S.sel = c.id; persist(); render(); toast('Plan duplicado');
  }
  function saveTemplate(p) {
    var n = prompt('Nombre de la plantilla (sin datos del paciente):', ''); if (!n || !n.trim()) return;
    var c = clone(p); c.tplName = n.trim(); c.name = ''; delete c.ai; delete c.shopDone;
    templates.push(c); persist(); toast('Plantilla guardada');
  }
  function removePlan(p) {
    if (!confirm('¿Eliminar el plan de ' + (p.name || 'este paciente') + '? No se puede deshacer.')) return;
    plans = plans.filter(function (x) { return x !== p; }); persist(); go('home');
  }
  /* Línea del tiempo: anteriores rellenos con palomita, el actual con anillo y halo, los siguientes en gris. */
  function stepsNav(p) {
    return el('nav', { class: 'card steps noprint', 'aria-label': 'Pasos del plan' }, [el('ol', { class: 'st' }, STEPS.map(function (n, i) {
      var k = i + 1;
      return el('li', { class: k < S.step ? 'done' : k === S.step ? 'cur' : null }, [
        el('button', { type: 'button', 'aria-current': k === S.step ? 'step' : null, onclick: function () { goStep(p, k); } }, [
          el('span', { class: 'dot' }, [k < S.step ? icon('check', 20) : String(k)]), n])
      ]);
    }))]);
  }
  /* Cada paso termina con "anterior" y "Siguiente". */
  function bottomNav(p, prev, next, o) {
    o = o || {};
    return el('div', { class: 'stepnav noprint' }, [
      prev ? el('button', { class: 'btn', type: 'button', onclick: function () { goStep(p, prev); } }, [icon('left'), STEPS_S[prev - 1]]) : null,
      next ? el('button', { class: 'btn' + (o.plain ? '' : ' primary'), type: 'button', style: 'margin-left:auto', disabled: !!o.disabled, onclick: function () { goStep(p, next); } }, ['Siguiente: ' + STEPS[next - 1], icon('right')]) : null
    ]);
  }
  function vstep(n, title, desc, kids, last, labelFor) {
    return el('li', null, [
      el('div', { class: 'rl' }, [el('span', { class: 'n36' + (last ? ' o' : ''), text: String(n) }), last ? null : el('i', { 'aria-hidden': 'true' })]),
      el('div', { class: 'bd' }, [el('div', { class: 'head-t', style: 'gap:2px' }, [
        el(labelFor ? 'label' : 'span', { class: 'tt', for: labelFor || null, text: title }), el('span', { class: 'muted', style: 'font-size:15px', text: desc })])].concat(kids))
    ]);
  }
  function titleIc(ic, title, sub) {
    return el('div', { class: 'title-ic' }, [el('span', { class: 'ic', 'aria-hidden': 'true' }, [icon(ic, 22)]),
      el('div', { class: 'head-t', style: 'gap:2px' }, [el('h2', { text: title }), el('p', { class: 'muted', style: 'font-size:15px', text: sub })])]);
  }

  /* ---------- paso 1: datos e IA ---------- */
  function isNone(v) { v = norm(v || ''); return !v || /^(NINGUN[OA]?S?|NO|NADA|N\/A|SIN|NA)$/.test(v); }
  function step1(main, p) {
    var d = p.ai || (p.ai = {});
    AI_FIELDS.forEach(function (f) { if (typeof d[f[0]] !== 'string') d[f[0]] = ''; });
    if (S.part === 'datos') step1Data(main, p, d); else step1AI(main, p, d);
  }
  function step1Data(main, p, d) {
    var msg = el('p', { class: 'err', role: 'alert' });
    function fld(id, label, key, o, cls) {
      o = o || {};
      var val = key === 'name' ? p.name : d[key];
      var i = el('input', { id: id, class: 'in', type: 'text', value: o.unit ? numOnly(val) : val, placeholder: o.ph || null, inputmode: o.mode || null, autocomplete: 'off',
        oninput: function (e) { if (key === 'name') p.name = e.target.value; else d[key] = e.target.value; touch(); } });
      return el('div', { class: 'fld' + (cls ? ' ' + cls : '') }, [el('label', { for: id, class: 'lbl', text: label }),
        o.unit ? el('div', { class: 'suf' }, [i, el('span', { 'aria-hidden': 'true', text: o.unit })]) : i]);
    }
    main.appendChild(el('section', { class: 'card focus stack' }, [
      el('div', { class: 'head-t' }, [el('span', { class: 'eb', text: 'Parte 1 de 2' }), el('h2', { text: 'Datos del paciente' }),
        el('p', { class: 'muted', style: 'font-size:15px', text: 'La IA los usa para armar el plan. El nombre no se le manda.' })]),
      fld('f-nom', 'Nombre completo', 'name', { ph: 'Ej. Lucía Torres Ramírez' }),
      el('div', { class: 'grid-a' }, [
        fld('f-edad', 'Edad', 'edad', { unit: 'años', mode: 'numeric', ph: 'Ej. 34' }),
        fld('f-peso', 'Peso', 'peso', { unit: 'kg', mode: 'decimal', ph: 'Ej. 72' }),
        fld('f-obj', 'Objetivo', 'objetivo', { ph: 'Ej. bajar 5 kg de grasa' }, 'span2')
      ]),
      el('div', { class: 'grid-b' }, [
        fld('f-cond', 'Condición o síntomas', 'cond', { ph: 'Ej. resistencia a la insulina' }),
        fld('f-nog', 'No le gusta', 'nogusta', { ph: 'Ninguno' }),
        fld('f-ale', 'Alergias', 'alergia', { ph: 'Ninguna' })
      ]),
      el('div', { class: 'foot' }, [msg, el('span', { class: 'hint', text: 'Revisa que estén completos antes de seguir.' }),
        el('button', { class: 'btn primary', type: 'button', style: 'min-height:48px;font-size:16px;font-weight:600', onclick: function () {
          if (!p.name.trim()) { msg.textContent = 'Escribe el nombre del paciente.'; document.getElementById('f-nom').focus(); return; }
          p.name = p.name.trim(); d.ok = true; touch(); S.part = 'ia'; render(); focusMain();
        } }, ['Continuar a la IA', icon('right')])])
    ]));
    if (!partOneDone(p)) main.appendChild(el('section', { class: 'locked', 'aria-disabled': 'true' }, [
      el('span', { class: 'ic', 'aria-hidden': 'true' }, [icon('lock', 20)]),
      el('div', { class: 'head-t', style: 'gap:2px' }, [el('span', { style: 'font-weight:600;font-size:17px', text: 'Parte 2 · Llenar los 7 días con IA' }),
        el('span', { style: 'font-size:14px', text: 'Se abre cuando termines los datos del paciente.' })])
    ]));
    if (!p.name) setTimeout(function () { var n = document.getElementById('f-nom'); if (n) n.focus(); }, 0);
  }
  function step1AI(main, p, d) {
    var chips = [isNone(d.cond) ? 'Sin condición' : d.cond.trim(),
      isNone(d.nogusta) ? 'Sin alimentos que no le gusten' : 'No le gusta: ' + d.nogusta.trim(),
      isNone(d.alergia) ? 'Sin alergias' : 'Alergias: ' + d.alergia.trim()];
    main.appendChild(el('section', { class: 'card pcard', style: 'padding:18px 24px' }, [
      el('div', { class: 'who', style: 'gap:14px' }, [el('span', { class: 'done-ic', 'aria-hidden': 'true' }, [icon('check', 18)]),
        el('div', { class: 'head-t', style: 'gap:6px;min-width:0' }, [el('span', { style: 'font-weight:600;font-size:17px', text: 'Parte 1 · Datos del paciente listos' }),
          el('div', { class: 'chips', style: 'gap:6px;margin:0' }, chips.map(function (c) { return el('span', { class: 'chip', text: c }); }))])]),
      el('button', { class: 'btn', type: 'button', onclick: function () { S.part = 'datos'; render(); focusMain(); }, text: 'Editar datos' })
    ]));

    main.appendChild(aiCard({
      eyebrow: 'Parte 2 de 2', title: 'Llenar los 7 días con IA', sub: 'Dos pasos y el plan queda listo para revisar.',
      prompt: function () { return aiPrompt(d); }, id: 'resp', applyLabel: 'Poner en el plan', applyNote: 'Reemplaza las comidas de los 7 días.',
      apply: function (text) {
        var days = parseAI(text);
        if (hasMeals(p) && !confirm('Se reemplazarán las comidas de los 7 días de este plan. ¿Continuar?')) return;
        applyAI(p, days); resetShop(p); touch(); persist();
        S.step = 2; S.day = 0; render(); focusMain(); toast('Listo. Revisa y ajusta cada día.');
      }
    }));
    main.appendChild(bottomNav(p, 0, 2, { plain: true }));
  }
  /* El mismo cuadro de IA en "Datos e IA" y en "Lista de compras": copiar instrucciones (o verlas) y pegar la respuesta. */
  function aiCard(o) {
    var shown = el('textarea', { readonly: true, 'aria-label': 'Instrucciones para la IA', hidden: !S.showPrompt, style: 'min-height:220px', onfocus: function (e) { e.target.select(); } });
    if (S.showPrompt) shown.value = o.prompt();
    var view = el('button', { class: 'link', type: 'button', 'aria-expanded': String(!!S.showPrompt), text: S.showPrompt ? 'Ocultar instrucciones' : 'Ver instrucciones', onclick: function () { setShown(!S.showPrompt); } });
    function setShown(on) {
      S.showPrompt = on; shown.hidden = !on; if (on) shown.value = o.prompt();
      view.textContent = on ? 'Ocultar instrucciones' : 'Ver instrucciones'; view.setAttribute('aria-expanded', String(on));
    }
    var ta = el('textarea', { id: o.id, class: 'paste', rows: '5', placeholder: 'Pega aquí la respuesta completa' });
    var msg = el('p', { class: 'err', role: 'alert' });
    function apply() { msg.textContent = ''; try { o.apply(ta.value); } catch (e) { msg.textContent = e.message; } }
    return el('section', { class: 'card focus stack noprint', style: 'gap:24px' }, [
      el('span', { class: 'eb', style: 'margin-bottom:-12px', text: o.eyebrow }),
      titleIc('spark', o.title, o.sub),
      o.warn || null,
      el('ol', { class: 'vsteps' }, [
        vstep(1, 'Copia las instrucciones', 'Pégalas en tu asistente de IA y espera a que termine de responder.', [
          el('div', { class: 'row' }, [el('button', { class: 'btn primary', type: 'button', onclick: function () {
            copyText(o.prompt(), 'Instrucciones copiadas', function () { setShown(true); shown.focus(); toast('Selecciona y copia las instrucciones'); });
          } }, [icon('copy'), 'Copiar instrucciones']), view]),
          shown
        ]),
        vstep(2, 'Pega la respuesta', 'Copia todo lo que respondió y pégalo aquí.', [ta, msg,
          el('div', { class: 'row', style: 'gap:14px' }, [el('button', { class: 'btn primary', type: 'button', onclick: apply, text: o.applyLabel }),
            o.cancel ? el('button', { class: 'btn', type: 'button', onclick: o.cancel, text: 'Cancelar' }) : null,
            el('span', { class: 'hint row', style: 'gap:8px' }, [icon('info'), o.applyNote])])
        ], true, o.id)
      ]),
      el('div', { class: 'note' }, [icon('lock'), 'Las instrucciones no incluyen el nombre del paciente.'])
    ]);
  }

  /* ---------- paso 2: comidas por día ---------- */
  /* Un renglón que empieza con "# " es el nombre del platillo: la app lo muestra como título, sin casilla.
     Aquí va en su propio campo (el primero de la comida). */
  function isDish(t) { return t.slice(0, 2) === '# '; }
  function dishText(t) { return isDish(t) ? t.slice(2) : t; }
  function fmtTime(t) { var m = /^(\d{1,2}):(\d{2})/.exec(t || ''); if (!m) return ['--:--', '']; var h = +m[1]; return [((h % 12) || 12) + ':' + m[2], h < 12 ? 'a. m.' : 'p. m.']; }
  function isSnack(m) { return norm(m.name || '').indexOf('COLACION') >= 0; }
  function byTime(a, b) { return (a.time || '').localeCompare(b.time || ''); }
  function nMeals(c) { return c + (c === 1 ? ' comida' : ' comidas'); }
  function step2(main, p) {
    var meals = p.days[S.day];
    function foodChanged() { resetShop(p); touch(); }
    main.appendChild(el('div', { class: 'days', role: 'group', 'aria-label': 'Día de la semana' }, DAYS.map(function (n, i) {
      var c = p.days[i].length;
      return el('button', { class: 'day', type: 'button', 'aria-pressed': S.day === i, 'aria-label': n + ', ' + nMeals(c), onclick: function () { S.day = i; S.copyOpen = false; S.timeEdit = -1; render(); } },
        [DAY_S[i], el('small', { text: nMeals(c) })]);
    })));

    var sub = !meals.length ? 'Sin comidas' : meals.length === 1 ? '1 comida · ' + fmtTime(meals[0].time).join(' ') :
      nMeals(meals.length) + ' · de ' + fmtTime(meals[0].time).join(' ') + ' a ' + fmtTime(meals[meals.length - 1].time).join(' ');
    function copyPanel() {
      var box = el('div', { class: 'copyto' }, [
        el('div', { class: 'head-t', style: 'gap:2px' }, [el('span', { style: 'font-weight:600', text: 'Copiar el ' + DAYS[S.day].toLowerCase() + ' a:' }), el('span', { class: 'hint', text: 'Reemplaza las comidas de los días que elijas.' })]),
        el('div', { class: 'row', style: 'gap:0 12px' }, DAYS.map(function (n, i) { return i === S.day ? null : el('label', null, [el('input', { type: 'checkbox', value: String(i) }), n]); })),
        el('div', { class: 'row' }, [
          el('button', { class: 'btn primary', type: 'button', onclick: function () {
            var any = false; box.querySelectorAll('input:checked').forEach(function (c) { p.days[+c.value] = clone(meals); any = true; });
            if (any) { S.copyOpen = false; foodChanged(); render(); toast('Día copiado'); } else toast('Elige al menos un día');
          }, text: 'Copiar' }),
          el('button', { class: 'btn', type: 'button', onclick: function () { S.copyOpen = false; render(); }, text: 'Cancelar' })
        ])
      ]);
      return box;
    }
    function mealRow(m, mi, focusIdx) {
      var row = el('div', { class: 'mrow' });
      function redraw(f) { row.replaceWith(mealRow(m, mi, f)); }
      function hasDish() { return m.items.length > 0 && isDish(m.items[0]); }
      function off() { return hasDish() ? 1 : 0; }
      var when = el('div', { class: 'when' + (isSnack(m) ? ' snack' : '') });
      if (S.timeEdit === mi) {
        var fin = false;
        var finish = function () { if (fin) return; fin = true; S.timeEdit = -1; meals.sort(byTime); setTimeout(render, 0); };
        var tin = el('input', { type: 'time', class: 'in tin', value: m.time, 'aria-label': 'Hora de ' + (m.name || 'la comida'),
          onchange: function (e) { if (e.target.value) { m.time = e.target.value; touch(); } }, onblur: finish,
          onkeydown: function (e) { if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); finish(); } } });
        when.appendChild(tin); setTimeout(function () { tin.focus(); }, 0);
      } else {
        var tm = fmtTime(m.time);
        when.appendChild(el('span', { class: 't' }, [tm[0], el('small', { text: tm[1] })]));
      }
      when.appendChild(el('input', { class: 'm', type: 'text', value: m.name, 'aria-label': 'Nombre de la comida', placeholder: 'Comida',
        oninput: function (e) { m.name = e.target.value; when.classList.toggle('snack', isSnack(m)); touch(); } }));
      if (S.timeEdit !== mi) when.appendChild(el('button', { class: 'ch', type: 'button', 'aria-label': 'Cambiar hora de ' + (m.name || 'la comida'), text: 'Cambiar hora', onclick: function () { S.timeEdit = mi; render(); } }));

      var dishIn = el('input', { type: 'text', value: hasDish() ? dishText(m.items[0]) : '', placeholder: 'Nombre del platillo (opcional)', 'aria-label': 'Platillo de ' + (m.name || 'la comida'),
        oninput: function (e) { if (hasDish()) m.items[0] = '# ' + e.target.value; else if (e.target.value) m.items.unshift('# ' + e.target.value); touch(); } });
      var ul = el('ul', { class: 'ing', 'aria-label': 'Ingredientes de ' + (m.name || 'la comida') });
      var ings = m.items.slice(off());
      ings.forEach(function (t, j) {
        var inp = el('input', { type: 'text', value: t, 'aria-label': 'Ingrediente ' + (j + 1), placeholder: 'Ej. 2 huevos',
          oninput: function (e) { m.items[j + off()] = e.target.value; foodChanged(); },
          onkeydown: function (e) { if (e.key === 'Enter') { e.preventDefault(); m.items.splice(j + off() + 1, 0, ''); touch(); redraw(j + 1); } } });
        ul.appendChild(el('li', null, [inp, el('button', { class: 'ib', type: 'button', 'aria-label': 'Quitar ' + (t || 'ingrediente'), onclick: function () {
          var had = !!m.items[j + off()].trim(); m.items.splice(j + off(), 1); if (had) foodChanged(); else touch(); redraw(j > 0 ? j - 1 : ings.length > 1 ? 0 : -1);
        } }, [icon('x', 14)])]));
        if (j === focusIdx) setTimeout(function () { inp.focus(); }, 0);
      });
      row.append(when, el('div', { class: 'mbody' }, [
        el('div', { class: 'dh' }, [dishIn, el('button', { class: 'ib', type: 'button', 'aria-label': 'Quitar ' + (m.name || 'la comida'), title: 'Quitar comida', onclick: function () {
          var had = m.items.some(function (t) { return t.trim() && !isDish(t); });
          if (had && !confirm('¿Quitar “' + (m.name || 'la comida') + '” de este día?')) return;
          meals.splice(mi, 1); if (had) foodChanged(); else touch(); render();
        } }, [icon('trash')])]),
        ul,
        el('button', { class: 'add', type: 'button', onclick: function () { m.items.push(''); touch(); redraw(m.items.length - 1 - off()); } }, [icon('plus', 16), 'Agregar ingrediente'])
      ]));
      return row;
    }
    var tl = el('div');
    meals.forEach(function (m, mi) { tl.appendChild(mealRow(m, mi)); });
    if (!meals.length) tl.appendChild(el('p', { class: 'hint', text: 'Este día no tiene comidas.' }));
    main.appendChild(el('section', { class: 'card dayc', 'aria-label': DAYS[S.day] }, [
      el('div', { class: 'dayh' }, [
        el('div', { class: 'head-t', style: 'gap:2px' }, [el('h2', { text: DAYS[S.day] }), el('span', { class: 'muted', style: 'font-size:15px', text: sub })]),
        el('button', { class: 'btn', type: 'button', 'aria-expanded': String(!!S.copyOpen), onclick: function () { S.copyOpen = !S.copyOpen; render(); } }, [icon('copy'), 'Copiar a otros días'])
      ]),
      S.copyOpen ? copyPanel() : null,
      tl,
      el('button', { class: 'btn dashed', type: 'button', style: 'align-self:flex-start', disabled: meals.length >= 12, onclick: function () {
        meals.push({ name: 'Comida', time: '12:00', items: [] }); meals.sort(byTime); touch(); render();
      } }, [icon('plus'), 'Agregar comida'])
    ]));
    main.appendChild(bottomNav(p, 1, 3));
  }

  /* ---------- paso 3: indicaciones ---------- */
  /* Botones para agregar indicaciones comunes con un toque. Se ocultan las que ya están en la lista. */
  var SUGGEST = {
    daily: ['Probiótico en ayunas', 'Colágeno en la mañana', 'Caminar 30 minutos', 'Dormir de 7 a 8 horas', 'Multivitamínico con el desayuno'],
    avoid: ['Refrescos y jugos industrializados', 'Pan dulce', 'Frituras', 'Alcohol', 'Comida rápida', 'Azúcar añadida', 'Embutidos'],
    prep: ['Hornear o asar, evitar freír', 'Pesar los alimentos en crudo', 'Cocinar con poco aceite', 'Usar aceite de oliva o de aguacate', 'Verduras al vapor', 'No agregar sal en la mesa']
  };
  function sec(ic, title, sub, kids) {
    return el('section', { class: 'card sec' }, [el('div', { class: 'sh' }, [el('span', { class: 'ico', 'aria-hidden': 'true' }, [icon(ic, 20)]),
      el('div', null, [el('h2', { text: title }), el('span', { class: 'muted', style: 'font-size:14px', text: sub })])])].concat(kids));
  }
  function step3(main, p) {
    var out = el('output', { 'aria-live': 'polite' }), liters = el('strong');
    function show() {
      var l = p.glasses * 0.25;
      out.textContent = String(p.glasses);
      liters.textContent = l.toLocaleString('es-MX', { maximumFractionDigits: 2 }) + (l === 1 ? ' litro' : ' litros');
    }
    function chg(dv) { var v = p.glasses + dv; if (v < 1 || v > 30) return; p.glasses = v; touch(); show(); }
    show();
    var box = el('div', { class: 'stack', style: 'gap:16px' }, [
      sec('drop', 'Agua', 'Vasos de 250 ml al día', [el('div', { class: 'row', style: 'gap:20px' }, [
        el('div', { class: 'stepper' }, [el('button', { type: 'button', 'aria-label': 'Un vaso menos', onclick: function () { chg(-1); }, text: '−' }), out,
          el('button', { type: 'button', 'aria-label': 'Un vaso más', onclick: function () { chg(1); }, text: '+' })]),
        el('span', null, ['= ', liters, ' al día'])
      ])])
    ]);
    [['daily', 'cal', 'Cada día', 'Lo que hace todos los días', 'Agregar hábito diario'],
     ['avoid', 'ban', 'Evitar', 'Alimentos o hábitos', 'Agregar algo que evitar'],
     ['prep', 'pot', 'Preparación', 'Cómo cocinar los alimentos', 'Agregar indicación de preparación']].forEach(function (s) { box.appendChild(pillSec(p, s)); });
    main.append(box, bottomNav(p, 2, 4));
  }
  /* Etiquetas que se quitan con una x, un campo para agregar y sugerencias rápidas. */
  function pillSec(p, s) {
    var key = s[0], arr = p[key];
    for (var i = arr.length - 1; i >= 0; i--) if (!String(arr[i]).trim()) arr.splice(i, 1);
    var pills = el('div', { class: 'pills' }), sug = el('div', { class: 'sug' });
    function has(t) { return arr.some(function (x) { return x.trim().toLowerCase() === t.toLowerCase(); }); }
    function add(t) { t = t.trim(); if (!t) return; if (!has(t)) { arr.push(t); touch(); } draw(); }
    var inp = el('input', { class: 'in', type: 'text', 'aria-label': s[4], placeholder: 'Escribe y presiona Enter',
      onkeydown: function (e) { if (e.key === 'Enter') { e.preventDefault(); add(inp.value); inp.value = ''; } } });
    function draw() {
      pills.replaceChildren();
      arr.forEach(function (t, i) {
        pills.appendChild(el('span', { class: 'pill' }, [t, el('button', { type: 'button', 'aria-label': 'Quitar: ' + t, onclick: function () { arr.splice(i, 1); touch(); draw(); inp.focus(); } }, [icon('x', 14)])]));
      });
      if (!arr.length) pills.appendChild(el('span', { class: 'hint', text: 'Nada todavía.' }));
      var left = SUGGEST[key].filter(function (t) { return !has(t); });
      sug.replaceChildren(); sug.hidden = !left.length;
      if (!left.length) return;
      sug.appendChild(el('span', { class: 'muted', style: 'font-size:14px', text: 'Sugerencias:' }));
      left.forEach(function (t) { sug.appendChild(el('button', { type: 'button', 'aria-label': 'Agregar: ' + t, onclick: function () { add(t); }, text: '+ ' + t })); });
    }
    draw();
    return sec(s[1], s[2], s[3], [pills,
      el('div', { class: 'addrow' }, [inp, el('button', { class: 'btn', type: 'button', onclick: function () { add(inp.value); inp.value = ''; inp.focus(); }, text: 'Agregar' })]),
      sug]);
  }
  function cleanPlan(p) {
    p.daily = p.daily.filter(function (s) { return s.trim(); }); p.avoid = p.avoid.filter(function (s) { return s.trim(); }); p.prep = p.prep.filter(function (s) { return s.trim(); });
    p.days.forEach(function (d) { d.forEach(function (m) { m.items = m.items.map(function (s) { s = s.trim(); return s === '#' ? '' : s; }).filter(Boolean); m.name = m.name.trim() || 'Comida'; }); });
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
      return '  "' + m[0] + '": {\n' + AI_DAYS.map(function (n, j) { return '    "' + n + '": []' + (j < 6 ? ',' : ''); }).join('\n') + '\n  }' + (i < 4 ? ',' : '');
    }).join('\n') + '\n}';
    return 'Actúa como nutriólogo/a. Genera un plan de alimentación saludable y variado de 7 días:\n\n' +
      'La o el paciente tiene:\n\nEDAD: ' + d.edad + '\n\nPESO: ' + d.peso + '\n\nCondición: ' + d.cond +
      '\n\nNo le gusta (alimento o ingrediente): ' + d.nogusta + '\n\nEs alérgico: ' + d.alergia + '\n\n\nEl objetivo es: ' + d.objetivo + '\n\n\n' +
      'Comidas (en este orden): DESAYUNO, COLACIÓN MAÑANERA, COMIDA, COLACIÓN VESPERTINA, CENA.\n' +
      'Días: LUNES, MARTES, MIÉRCOLES, JUEVES, VIERNES, SÁBADO, DOMINGO.\n\n' +
      'REGLAS DE FORMATO (muy importantes):\n' +
      '- Responde ÚNICAMENTE con un objeto JSON válido, dentro de UN SOLO bloque de código ```json (para que se pueda copiar con el botón Copiar). Sin texto antes ni después del bloque y sin explicaciones.\n' +
      '- Usa comillas rectas (") y no dejes comas sobrantes.\n' +
      '- Usa EXACTAMENTE las mismas llaves (en MAYÚSCULAS) que el esqueleto de abajo.\n' +
      '- El valor de cada celda es una LISTA de textos, un alimento o cantidad por elemento. Ej. ["2 huevos revueltos", "1/3 de aguacate", "1 tortilla de maíz"].\n' +
      '- Si el platillo tiene nombre (ej. "Pasta boloñesa", "Ensalada César"), ponlo como PRIMER elemento empezando con # (ej. ["# Pasta boloñesa", "80 g de pasta", "100 g de carne molida"]) y después los ingredientes o cantidades. Si no tiene nombre, pon solo los ingredientes.\n' +
      '- Si una comida no aplica para algún día, deja la lista vacía [].\n\n' +
      'Esqueleto a llenar (rellena los valores manteniendo las llaves):\n' + skel;
  }
  /* Lee el JSON que pega la doctora aunque venga como lo copian ChatGPT, Gemini, etc.: con ```json, texto alrededor,
     comillas “curvas”, espacios raros, saltos de línea dentro de los textos o comas sobrantes. */
  function looseJSON(text, what) {
    var t = String(text || '').replace(/[“”„‟″＂]/g, '"').replace(/[   ​﻿]/g, ' ');
    var a = t.indexOf('{'), b = t.lastIndexOf('}');
    if (a < 0 || b < a) throw new Error('No encontré ' + what + ' en lo que pegaste. Copia la respuesta completa de la IA (con el botón Copiar del bloque de código).');
    t = t.slice(a, b + 1);
    try { return JSON.parse(t); } catch (e) {}
    // Arreglos: saltos de línea y tabuladores dentro de los textos, comentarios // y comas antes de } o ].
    var out = '', inStr = false;
    for (var i = 0; i < t.length; i++) {
      var ch = t[i];
      if (inStr) {
        if (ch === '\\') { out += ch + (t[i + 1] || ''); i++; continue; }
        if (ch === '"') inStr = false;
        out += ch === '\n' ? '\\n' : ch === '\r' ? '' : ch === '\t' ? ' ' : ch;
      } else {
        if (ch === '"') inStr = true;
        else if (ch === '/' && t[i + 1] === '/') { while (i < t.length && t[i] !== '\n') i++; continue; }
        out += ch;
      }
    }
    out = out.replace(/,\s*([}\]])/g, '$1');
    try { return JSON.parse(out); } catch (e) {
      throw new Error('La respuesta está incompleta o tiene un error. Pide a la IA: "Escríbelo otra vez solo como JSON en un bloque de código" y cópialo con el botón Copiar.');
    }
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
    var o = looseJSON(text, 'el plan'), found = 0;
    var days = AI_DAYS.map(function () { return [[], [], [], [], []]; }), dayKeys = AI_DAYS.map(norm);
    Object.keys(o || {}).forEach(function (mk) {
      var mi = aiMeal(mk), row = o[mk];
      if (mi < 0 || !row || typeof row !== 'object') return;
      Object.keys(row).forEach(function (dk) {
        var di = dayKeys.indexOf(norm(dk)), v = row[dk];
        if (di < 0) return;
        if (Array.isArray(v)) v = v.join('\n');
        if (typeof v !== 'string') return;
        var lines = v.split(/\r?\n|\\n/).map(function (t) { return t.replace(/^\s*[-•*]\s*/, '').trim(); }).filter(function (t) { return t && t !== '#'; });
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
  /* ---------- lista de compras con IA ---------- */
  /* Al terminar el plan, la IA dice qué se compra de cada renglón ("Limón y chile en polvo" → Limón, Chile en polvo)
     con nombres iguales en todo el plan. Se guarda en p.shop y va en el QR (clave c); la app suma por día con eso. */
  function planLines(p) {   // renglones que se compran (sin nombres de platillo), sin repetir
    var seen = {}, out = [];
    p.days.forEach(function (day) { day.forEach(function (m) { m.items.forEach(function (t) { t = t.trim(); if (t && !isDish(t) && !seen[t]) { seen[t] = true; out.push(t); } }); }); });
    return out;
  }
  function shopPrompt(lines) {
    return 'Eres asistente de una nutrióloga. Abajo están los renglones de un plan de alimentación de 7 días. ' +
      'Para cada renglón, dime qué hay que comprar en el súper, para armar la lista de compras.\n\n' +
      'REGLAS (muy importantes):\n' +
      '- Responde ÚNICAMENTE con un objeto JSON válido, dentro de UN SOLO bloque de código ```json (para que se pueda copiar con el botón Copiar). Sin texto antes ni después del bloque y sin explicaciones.\n' +
      '- Usa comillas rectas (") y no dejes comas sobrantes.\n' +
      '- Las llaves son EXACTAMENTE los renglones de abajo, copiados igual (mismos acentos, mayúsculas y signos). Incluye todos.\n' +
      '- El valor es una lista con un ingrediente por elemento. Ej. "Limón y chile en polvo": ["Limón", "Chile en polvo"].\n' +
      '- Usa SIEMPRE el mismo nombre para el mismo ingrediente en todo el plan, sencillo y en singular: "Limón" (no "jugo de limón", "limones" ni "limón amarillo").\n' +
      '- Cada ingrediente lleva UNA sola unidad en todo el plan, la que se usa para comprarlo en el súper: en piezas solo lo que se compra por pieza: huevo y frutas o verduras grandes o medianas ("2 jitomates", "1 limón", "1 manzana", "1 aguacate"); lo demás en g o ml, incluidas las frutas chicas que se compran por caja o a granel como fresas, uvas, arándanos, frambuesas, zarzamoras y cerezas, y las nueces y semillas ("40 g de almendras", "60 g de fresas", "150 g de pechuga", "250 ml de leche"). Usa solo piezas, g o ml.\n' +
      '- Si un renglón trae el ingrediente en otra unidad, conviértelo a esa unidad de forma aproximada: "10 almendras": ["12 g de almendras"], "4 fresas": ["60 g de fresas"], "100 g de jitomate": ["1 jitomate"], "1 taza de leche": ["240 ml de leche"].\n' +
      '- Pon cantidad aproximada a TODO lo que se compra, aunque el renglón no la diga, pensando en una porción para esa comida: "Huevo cocido": ["1 huevo"], "Limón y hierbas": ["1 limón", "Hierbas finas"], "150 g de salmón con espárragos": ["150 g de salmón", "5 espárragos"].\n' +
      '- Sin cantidad SOLO los condimentos que no se compran por porción: sal, pimienta, especias, hierbas de olor, chile en polvo, vinagre, aceite en aerosol. Ej. "Pimienta", "Hierbas finas".\n' +
      '- Si el renglón ya es un solo ingrediente con cantidad en su unidad de compra, devuélvelo IGUAL, sin cambiarle nada: "2 huevos revueltos": ["2 huevos revueltos"].\n' +
      '- Si no hay nada que comprar (ej. "Agua natural"), usa una lista vacía [].\n\n' +
      'Renglones:\n' + JSON.stringify(lines, null, 1);
  }
  function parseShopAI(text, lines) {
    var o = looseJSON(text, 'la lista');
    var byNorm = {}, out = {}, found = 0;
    lines.forEach(function (t) { byNorm[norm(t)] = t; });
    Object.keys(o || {}).forEach(function (k) {
      var line = byNorm[norm(k)], v = o[k];
      if (!line) return;
      if (typeof v === 'string') v = v ? v.split(/\s*[,;\n]\s*/) : [];
      if (!Array.isArray(v)) return;
      out[line] = v.filter(function (t) { return typeof t === 'string' && t.trim(); }).map(function (t) { return t.trim().slice(0, 120); }).slice(0, 10);
      found++;
    });
    if (!found) throw new Error('No encontré los renglones de este plan en la respuesta. Revisa que pegaste la respuesta de estas instrucciones.');
    return out;
  }
  /* Nunca hay QR sin la lista de compras revisada (el botón está desactivado; esto es por si acaso). */
  function goQR(p) {
    cleanPlan(p); touch(); persist();
    S.copyOpen = false; S.paste = false; S.timeEdit = -1; S.showPrompt = false;
    if (shopPending(p).length) { S.step = 4; render(); focusMain(); toast('Antes de compartir, genera la lista de compras'); return; }
    S.step = 5; render(); focusMain();
  }
  /* Si cambia la comida del plan, la lista revisada se borra completa: la IA la vuelve a hacer con el plan nuevo
     (las unidades de compra dependen de todo el plan). */
  function resetShop(p) {
    if (!p.shop || !Object.keys(p.shop).length) return;
    p.shop = {}; p.shopDone = {}; toast('Cambió la comida: hay que revisar otra vez la lista de compras');
  }
  function shopPending(p) { var s = p.shop || {}; return planLines(p).filter(function (t) { return !s.hasOwnProperty(t); }); }
  /* ---------- QR ---------- */
  /* Un código v2 va en dos partes: el prefijo en modo alfanumérico y los dígitos en modo numérico. */
  function makeQR(text) {
    var last, v2 = text.indexOf(SarentiCodec.PREFIX2) === 0;
    for (var lv of ['M', 'L']) {
      try {
        var q = qrcode(0, lv);
        if (v2) { q.addData(SarentiCodec.PREFIX2, 'Alphanumeric'); q.addData(text.slice(SarentiCodec.PREFIX2.length), 'Numeric'); }
        else q.addData(text, 'Byte');
        q.make(); return { q: q, level: lv };
      } catch (e) { last = e; }
    }
    throw last;
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
  function qrSvg(q, name, id) {   // id: para que cada corazón de la página tenga su propio recorte
    var hc = 'hc' + (id || '');
    var L = heartLayout(q), d = L.cells.map(function (p) { return 'M' + p[0] + ',' + p[1] + 'h1v1h-1z'; }).join('');
    var lb = L.label, z = labelSize(lb, name);
    var label = '<rect x="' + (lb.cx - z.w / 2).toFixed(2) + '" y="' + lb.y.toFixed(2) + '" width="' + z.w.toFixed(2) + '" height="' + lb.h.toFixed(2) + '" rx="' + (lb.h / 2).toFixed(2) + '" fill="#fff"/>' +
      '<text x="' + lb.cx.toFixed(2) + '" y="' + (lb.y + lb.h / 2).toFixed(2) + '" dy="0.34em" text-anchor="middle" fill="' + WINE + '" font-family="\'Cormorant Garamond\', Georgia, serif" font-weight="700" font-size="' + z.fs.toFixed(2) + '"' +
      (z.squeeze ? ' textLength="' + z.tw.toFixed(2) + '" lengthAdjust="spacingAndGlyphs"' : '') + '>' + xmlEsc(name) + '</text>';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + L.w.toFixed(2) + ' ' + L.h.toFixed(2) + '" role="img" aria-label="Código QR del plan en forma de corazón">' +
      '<defs><clipPath id="' + hc + '"><path d="' + L.outer + '"/></clipPath></defs>' +
      '<path d="' + d + '" fill="' + WINE + '" clip-path="url(#' + hc + ')" shape-rendering="crispEdges"/>' + label + '</svg>';
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

  /* ---------- paso 4: lista de compras ---------- */
  /* La IA ya dijo qué se compra de cada renglón (p.shop). Aquí se agrupa por categoría y se suman
     los ingredientes repetidos (avena 40 + 20 + 10 g = 70 g). Nada de esto cambia el código del QR. */
  var CATS = [
    ['Frutas y verduras', 'MANZANA PLATANO FRESA PAPAYA MELON SANDIA PINA MANGO NARANJA MANDARINA TORONJA LIMON UVA PERA KIWI DURAZNO GUAYABA ARANDANO FRAMBUESA ZARZAMORA MORA CEREZA CIRUELA FRUTA JITOMATE TOMATE TOMATILLO CEBOLLA AJO CHILE PIMIENTO CALABACITA CALABAZA BROCOLI COLIFLOR ZANAHORIA PEPINO LECHUGA ESPINACA ACELGA KALE APIO NOPAL CHAYOTE EJOTE CHAMPINON HONGO SETA BETABEL JICAMA RABANO ESPARRAGO BERENJENA ELOTE PAPA CAMOTE VERDURA ENSALADA CILANTRO PEREJIL AGUACATE GERMEN ARUGULA PORO HIERBABUENA MENTA COL CHICHARO|FRUTOS ROJOS|FRUTOS DEL BOSQUE'],
    ['Carnes, pescados y huevo', 'POLLO PECHUGA MUSLO PIERNA PAVO RES BISTEC CARNE CERDO LOMO JAMON PESCADO SALMON ATUN TILAPIA MOJARRA CAMARON HUEVO CLARA SARDINA BACALAO MARISCO PULPO SURIMI ARRACHERA FILETE CHULETA'],
    ['Lácteos', 'LECHE YOGUR YOGURT QUESO PANELA REQUESON CREMA MANTEQUILLA KEFIR JOCOQUE'],
    ['Cereales y tortillas', 'TORTILLA AVENA PAN BOLILLO ARROZ PASTA QUINOA GRANOLA CEREAL TOSTADA GALLETA AMARANTO SALVADO HARINA ESPAGUETI SPAGHETTI FIDEO MAIZ CUSCUS TELERA HOTCAKE'],
    ['Leguminosas y semillas', 'FRIJOL GARBANZO LENTEJA HABA SOYA EDAMAME CACAHUATE ALMENDRA NUEZ PISTACHE CHIA LINAZA SEMILLA AJONJOLI MARANON ALUBIA HUMMUS PEPITA|CREMA DE CACAHUATE|CREMA DE ALMENDRA|MANTEQUILLA DE CACAHUATE'],
    ['Aceites y condimentos', 'ACEITE SAL PIMIENTA ESPECIA OREGANO COMINO CANELA VINAGRE MOSTAZA SALSA CONSOME HIERBA LAUREL TOMILLO PAPRIKA CURCUMA MIEL STEVIA ENDULZANTE VAINILLA CATSUP KETCHUP MAYONESA AZUCAR ADEREZO|CHILE EN POLVO|CHILE QUEBRADO|AJO EN POLVO|HIERBAS FINAS']
  ].map(function (c) { var parts = c[1].split('|'); return { name: c[0], words: parts[0].split(' ').map(stem), phrases: parts.slice(1) }; });
  var CAT_NAMES = CATS.map(function (c) { return c.name; }).concat(['Otros']);
  /* Raíz sencilla para comparar singular y plural: "limones" y "limón" → LIMON, "jitomates" y "jitomate" → JITOMAT. */
  function stem(w) { return w.replace(/S$/, '').replace(/E$/, ''); }
  function nameKey(n) { return norm(n).split(/[^A-Z0-9]+/).filter(Boolean).map(stem).join(' '); }
  /* Primero frases ("chile en polvo"); luego la primera palabra que se reconozca (en español va primero el alimento). */
  function category(name) {
    var n = norm(name), i, j;
    for (i = 0; i < CATS.length; i++) for (j = 0; j < CATS[i].phrases.length; j++) if (n.indexOf(CATS[i].phrases[j]) >= 0) return CATS[i].name;
    var words = n.split(/[^A-Z]+/).filter(Boolean).map(stem);
    for (j = 0; j < words.length; j++) for (i = 0; i < CATS.length; i++) if (CATS[i].words.indexOf(words[j]) >= 0) return CATS[i].name;
    return 'Otros';
  }
  var FRAC = { '½': 0.5, '¼': 0.25, '¾': 0.75 };
  function toNum(t) {
    if (FRAC[t]) return FRAC[t];
    return t.split(/\s+/).reduce(function (s, x) { var f = x.split('/'); return s + (f.length === 2 ? +f[0] / +f[1] : +x.replace(',', '.')); }, 0);
  }
  /* "40 g de almendras" → 40, g, almendras. "2 jitomates" → 2, piezas, jitomates. "Pimienta" → sin cantidad. */
  function parseIng(s) {
    s = String(s).trim();
    var m = /^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?|[½¼¾])\s*(kg|kilos?|g|gr|grs|gramos?|ml|mililitros?|l|lt|litros?)?\.?(?=\s|$)\s*(?:de\s+)?(.*)$/i.exec(s);
    if (!m || !m[3].trim()) return { qty: null, unit: '', name: s };
    var v = toNum(m[1]), u = (m[2] || '').toLowerCase();
    if (/^k/.test(u)) { v *= 1000; u = 'g'; } else if (/^g/.test(u)) u = 'g'; else if (/^m/.test(u)) u = 'ml'; else if (/^l/.test(u)) { v *= 1000; u = 'ml'; }
    return { qty: isFinite(v) ? v : null, unit: u, name: m[3].trim() };
  }
  /* Piezas que dice el plan para un ingrediente que se compra en g o ml: renglón "10 almendras" e ingrediente
     "12 g de almendras" → { n: 10, name: "almendras" }. Sirve para mostrar las dos cosas: cómo se compra y cómo se come. */
  function piecesOf(line, r) {
    if (!r.unit || r.qty === null) return null;
    var key = nameKey(r.name), parts = String(line).split(/\s+(?:y|e|con)\s+|\s*[,;+]\s*/i);
    for (var i = 0; i < parts.length; i++) {
      var o = parseIng(parts[i]);
      if (o.qty !== null && !o.unit && o.name && (nameKey(o.name) === key || nameKey(o.name).split(' ')[0] === key.split(' ')[0])) return { n: o.qty, name: o.name };
    }
    return null;
  }
  function pcsText(n, name) { return '≈ ' + fmtNum(Math.max(1, Math.round(n))) + ' ' + name.toLowerCase(); }
  function capFirst(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
  function fmtNum(v) {
    v = Math.round(v * 100) / 100;
    var w = Math.floor(v), f = Math.round((v - w) * 100) / 100;
    if (!f) return String(w);
    var fr = { 0.25: '1/4', 0.5: '1/2', 0.75: '3/4', 0.33: '1/3', 0.67: '2/3' }[f];
    return fr ? (w ? w + ' ' : '') + fr : v.toLocaleString('es-MX', { maximumFractionDigits: 1 });
  }
  function fmtQty(v, u) {
    if (u === 'g' && v >= 1000) return fmtNum(v / 1000) + ' kg';
    if (u === 'ml' && v >= 1000) return fmtNum(v / 1000) + ' l';
    return fmtNum(v) + (u ? ' ' + u : '');
  }
  function shopList(p) {
    var s = p.shop || {}, map = {}, order = [];
    p.days.forEach(function (day) { day.forEach(function (m) { m.items.forEach(function (t) {
      t = t.trim(); if (!t || isDish(t)) return;
      (s.hasOwnProperty(t) ? s[t] : [t]).forEach(function (ing) {
        var r = parseIng(ing); if (!r.name) return;
        var k = r.unit + '|' + nameKey(r.name), e = map[k];
        if (!e) { e = map[k] = { key: k, name: capFirst(r.name), unit: r.unit, parts: [], cat: category(r.name), pcs: 0, pcsQty: 0, pcsName: '' }; order.push(e); }
        if (r.name.length < e.name.length) e.name = capFirst(r.name);   // el nombre más corto suele ser el singular
        if (r.qty !== null) e.parts.push(r.qty);
        var pc = piecesOf(t, r);
        if (pc) { e.pcs += pc.n; e.pcsQty += r.qty; if (!e.pcsName || pc.n > 1) e.pcsName = pc.name; }
      });
    }); }); });
    order.forEach(function (e) {
      var sum = e.parts.reduce(function (a, b) { return a + b; }, 0);
      e.q = e.parts.length ? fmtQty(sum, e.unit) : '';
      /* Si el plan lo dice en piezas, se muestra cuántas son en total (proporción de las porciones que sí las traen). */
      e.eq = e.pcs && e.pcsQty ? pcsText(sum * e.pcs / e.pcsQty, e.pcsName) : '';
      e.small = e.eq || (e.parts.length > 5 ? e.parts.length + ' porciones' : e.parts.length > 1 ? e.parts.map(fmtNum).join(' + ') + (e.unit ? ' ' + e.unit : '') : '');
    });
    return order;
  }
  function byCat(list) {
    var g = {};
    list.forEach(function (e) { (g[e.cat] = g[e.cat] || []).push(e); });
    Object.keys(g).forEach(function (c) { g[c].sort(function (a, b) { return a.name.localeCompare(b.name, 'es'); }); });
    return g;
  }
  function shopText(p, list) {
    var g = byCat(list), out = ['Lista de compras' + (p.name ? ' · ' + p.name : '')];
    CAT_NAMES.forEach(function (c) {
      if (!g[c]) return;
      out.push('', c.toUpperCase());
      g[c].forEach(function (e) { out.push('- ' + e.name + (e.q ? ': ' + e.q : '') + (e.eq ? ' (' + e.eq + ')' : '')); });
    });
    return out.join('\n');
  }
  function catGrid(p, list) {
    var done = p.shopDone || (p.shopDone = {}), g = byCat(list), grid = el('div', { class: 'cats' });
    CAT_NAMES.forEach(function (c) {
      var items = g[c]; if (!items) return;
      var open = S.shopMore[c] || items.length <= 10, shown = open ? items : items.slice(0, 8);
      var card = el('section', { class: 'card cat' }, [el('h3', null, [c, el('span', { text: open ? String(items.length) : shown.length + ' de ' + items.length })])]);
      shown.forEach(function (e) {
        var lab = el('label', { class: 'it' + (done[e.key] ? ' ok' : '') }, [
          el('input', { type: 'checkbox', checked: !!done[e.key], onchange: function (ev) {
            if (ev.target.checked) done[e.key] = true; else delete done[e.key];
            lab.classList.toggle('ok', ev.target.checked); softSave();
          } }),
          el('span', { class: 'n' }, [e.name, e.small ? el('small', { text: e.small }) : null]),
          el('span', { class: 'q', text: e.q })
        ]);
        card.appendChild(lab);
      });
      if (!open) card.appendChild(el('button', { class: 'btn noprint', type: 'button', style: 'margin-top:10px;align-self:flex-start', onclick: function () { S.shopMore[c] = true; render(); },
        text: items.length === 9 ? 'Ver la restante' : 'Ver las ' + (items.length - 8) + ' restantes' }));
      grid.appendChild(card);
    });
    return grid;
  }
  /* Por platillo: lo que se compra para cada platillo y en qué días va. */
  function dishGrid(p) {
    var s = p.shop || {}, map = {}, order = [], grid = el('div', { class: 'cats' });
    p.days.forEach(function (day, di) { day.forEach(function (m) {
      var first = (m.items[0] || '').trim(), title = isDish(first) && dishText(first).trim() ? dishText(first).trim() : m.name, ings = [];
      /* En la receta va como se come, con los gramos al lado: "10 almendras (≈ 12 g)". */
      m.items.forEach(function (t) { t = t.trim(); if (t && !isDish(t)) ings = ings.concat((s.hasOwnProperty(t) ? s[t] : [t]).map(function (ing) {
        var r = parseIng(ing), pc = piecesOf(t, r);
        return pc ? fmtNum(pc.n) + ' ' + pc.name + ' (≈ ' + fmtQty(r.qty, r.unit) + ')' : ing;
      })); });
      if (!ings.length) return;
      var k = norm(title) + '|' + ings.map(norm).join('|'), e = map[k];
      if (!e) { e = map[k] = { title: title, meal: m.name, ings: ings, days: [] }; order.push(e); }
      if (e.days.indexOf(di) < 0) e.days.push(di);
    }); });
    order.forEach(function (e) {
      grid.appendChild(el('section', { class: 'card cat' }, [
        el('h3', { text: e.title }),
        el('p', { class: 'days-t', text: e.meal + ' · ' + e.days.map(function (d) { return DAY_S[d]; }).join(', ') }),
        el('ul', null, e.ings.map(function (t) { return el('li', { text: t }); }))
      ]));
    });
    return grid;
  }
  function shopCard(p, lines, o) {
    return aiCard(Object.assign({
      eyebrow: 'Lista de compras', title: 'Generar la lista con IA', sub: 'Dos pasos y la lista queda agrupada por categoría, con las cantidades sumadas.',
      prompt: function () { return shopPrompt(lines); }, id: 'shop-resp', applyLabel: 'Poner en la lista', applyNote: 'La IA solo recibe los alimentos del plan.',
      apply: function (text) {
        var r = parseShopAI(text, lines);
        /* Se suma a lo ya revisado: si la IA dejó fuera renglones, siguen pendientes y no se puede compartir todavía. */
        p.shop = Object.assign({}, p.shop, r); touch(); persist(); S.paste = false; S.showPrompt = false;
        var left = shopPending(p).length;
        toast(left ? 'Faltan ' + left + (left === 1 ? ' renglón' : ' renglones') + ' por revisar' : 'Lista de compras lista');
        render();
      }
    }, o));
  }
  function step4(main, p) {
    var lines = planLines(p), pending = shopPending(p), ready = lines.length > 0 && !pending.length;
    if (!lines.length) {
      main.appendChild(el('section', { class: 'card stack' }, [
        el('h2', { text: 'Lista de compras', style: 'font-size:26px' }),
        el('p', { class: 'muted', text: 'Primero llena las comidas del plan.' }),
        el('div', null, [el('button', { class: 'btn primary', type: 'button', onclick: function () { goStep(p, 2); }, text: 'Ir a Comidas por día' })])
      ]));
      main.appendChild(bottomNav(p, 3, 0)); return;
    }
    if (!ready) {
      var partial = pending.length < lines.length;
      main.appendChild(shopCard(p, lines, { warn: partial ? el('div', { class: 'banner warn', role: 'status' }, [el('span', null, [icon('alert', 20),
        pending.length + ' de ' + lines.length + (lines.length === 1 ? ' renglón' : ' renglones') + ' sin revisar (la IA no los incluyó): ' + pending.join(' · ') + '. Repite los dos pasos.'])]) : null }));
    } else {
      var list = shopList(p);
      /* Como "Parte 1 · Datos del paciente listos": tarjeta con palomita y el botón para rehacer. */
      main.appendChild(el('section', { class: 'card pcard noprint', style: 'padding:18px 24px' }, [
        el('div', { class: 'who', style: 'gap:14px' }, [el('span', { class: 'done-ic', 'aria-hidden': 'true' }, [icon('check', 18)]),
          el('div', { class: 'head-t', style: 'gap:6px;min-width:0' }, [el('span', { style: 'font-weight:600;font-size:17px', text: 'Lista de compras generada con IA' }),
            el('span', { class: 'muted', style: 'font-size:14px', text: list.length + (list.length === 1 ? ' ingrediente' : ' ingredientes') + ' para los 7 días' })])]),
        el('button', { class: 'btn', type: 'button', 'aria-expanded': String(!!S.paste), onclick: function () { S.paste = !S.paste; S.showPrompt = false; render(); }, text: S.paste ? 'Cancelar' : 'Rehacer con IA' })
      ]));
      if (S.paste) main.appendChild(shopCard(p, lines, { eyebrow: 'Rehacer la lista', cancel: function () { S.paste = false; S.showPrompt = false; render(); } }));
      main.appendChild(el('div', { class: 'row noprint', style: 'justify-content:space-between;gap:12px' }, [
        el('div', { class: 'seg', role: 'group', 'aria-label': 'Ver lista' }, [['cat', 'Por categoría'], ['dish', 'Por platillo']].map(function (o) {
          return el('button', { type: 'button', 'aria-pressed': S.shopView === o[0], onclick: function () { S.shopView = o[0]; render(); }, text: o[1] });
        })),
        el('div', { class: 'row' }, [
          el('button', { class: 'btn', type: 'button', onclick: function () { copyText(shopText(p, list), 'Lista copiada'); } }, [icon('copy'), 'Copiar lista']),
          el('button', { class: 'btn', type: 'button', onclick: function () { CAT_NAMES.forEach(function (c) { S.shopMore[c] = true; }); render(); window.print(); } }, [icon('print'), 'Imprimir'])
        ])
      ]));
      main.appendChild(el('h2', { class: 'print-only', text: 'Lista de compras' }));
      main.appendChild(S.shopView === 'dish' ? dishGrid(p) : catGrid(p, list));
    }
    main.appendChild(bottomNav(p, 3, 5, { disabled: !ready }));
    if (!ready) main.appendChild(el('p', { class: 'hint noprint', style: 'text-align:right;margin-top:-12px', text: 'Compartir se activa cuando la IA ya revisó la lista de compras.' }));
  }

  /* ---------- paso 5: compartir ---------- */
  var DEFAULT_MSG = 'Hola, te comparto tu plan de alimentación de Mi Plan Sarenti. Guarda esta imagen y en la app elige “Adjuntar corazón digital”.';
  function step5(main, p) {
    if (shopPending(p).length) {   // por si se llega aquí sin pasar por goQR
      main.appendChild(el('section', { class: 'card stack' }, [el('p', { class: 'err', role: 'alert', text: 'Antes de compartir, genera la lista de compras.' }),
        el('div', null, [el('button', { class: 'btn primary', type: 'button', onclick: function () { goStep(p, 4); }, text: 'Ir a la lista de compras' })])]));
      return;
    }
    var pc = main.querySelector('.pcard'); if (pc) pc.classList.add('noprint');
    var share = el('div', { class: 'share' }, [el('section', { class: 'card qrc' }, [el('p', { class: 'muted', text: 'Generando…' })])]);
    main.append(share, bottomNav(p, 4, 0));
    var name = p.name || 'Paciente';
    var fontReady = document.fonts ? document.fonts.load('700 20px "Cormorant Garamond"').catch(function () {}) : null;
    /* Primero el código v1 (lo leen todas las versiones de la app); si no cabe en un QR, el v2, más compacto. */
    function encodeQR() {
      return SarentiCodec.encode(p).then(function (code) {
        try { return [code, makeQR(code)]; } catch (e) {}
        return SarentiCodec.encode2(p).then(function (code2) {
          try { return [code2, makeQR(code2)]; } catch (e) { return [code, null]; }
        });
      });
    }
    Promise.all([encodeQR(), fontReady]).then(function (r) {
      var code = r[0][0], res = r[0][1];
      if (!res) { share.replaceChildren(el('section', { class: 'card' }, [el('p', { class: 'err', role: 'alert', text: 'Este plan es demasiado largo para el corazón. Acorta algunos textos del plan.' })])); return; }
      function svgEl(id) { var w = el('div'); w.innerHTML = qrSvg(res.q, name, id); return w.firstChild; }
      /* Pantalla completa: el QR grande para que el paciente lo escanee del monitor o del celular. */
      function zoom() {
        var dlg = el('dialog', { class: 'zoom', 'aria-label': 'Código QR en grande' }, [
          el('button', { class: 'btn primary', type: 'button', onclick: function () { dlg.close(); } }, [icon('left'), 'Atrás']), el('div', { class: 'zoom-qr' }, [svgEl('z')])]);
        dlg.addEventListener('close', function () { dlg.remove(); });
        document.body.appendChild(dlg); dlg.showModal();
      }
      /* "Copiar corazón": la imagen queda en el portapapeles para pegarla en el chat de WhatsApp. Se prepara antes
         y se le pasa a ClipboardItem como promesa, porque Safari solo deja copiar justo al tocar el botón. */
      var pngBlob = new Promise(function (ok) { qrPng(res.q, name).toBlob(ok, 'image/png'); });
      function copyPng() {
        if (!navigator.clipboard || !navigator.clipboard.write || typeof ClipboardItem === 'undefined') return toast('Este navegador no puede copiar imágenes. Usa “Descargar PNG”.');
        navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]).then(function () { toast('Corazón copiado: pégalo en WhatsApp'); },
          function () { toast('No se pudo copiar. Usa “Descargar PNG”.'); });
      }
      var left = el('section', { class: 'card qrc' }, [
        el('div', { class: 'head-t noprint' }, [el('h2', { text: 'En consulta' }), el('p', { class: 'muted', style: 'font-size:15px', text: 'El paciente lo escanea con la app Mi Plan Sarenti.' })]),
        svgEl('a'),
        el('div', { class: 'row noprint', style: 'justify-content:center' }, [
          el('button', { class: 'btn primary', type: 'button', onclick: zoom }, [icon('expand'), 'Pantalla completa']),
          el('button', { class: 'btn', type: 'button', onclick: function () { window.print(); } }, [icon('print'), 'Imprimir']),
          el('button', { class: 'btn', type: 'button', onclick: function () { qrPng(res.q, name).toBlob(function (b) { download(b, 'plan-' + slug(p.name) + '.png'); }); } }, [icon('download'), 'Descargar PNG'])
        ])
      ]);
      /* WhatsApp en un solo envío: la imagen del corazón con el mensaje como pie de foto. */
      if (S.msg === null) S.msg = DEFAULT_MSG;
      var txt = el('div', { class: 'tx', text: S.msg });
      var ed = el('textarea', { 'aria-label': 'Mensaje para WhatsApp', hidden: !S.editMsg, style: 'min-height:96px', oninput: function (e) { S.msg = e.target.value; txt.textContent = S.msg; } });
      ed.value = S.msg;
      var edBtn = el('button', { class: 'btn small', type: 'button', 'aria-expanded': String(!!S.editMsg), text: S.editMsg ? 'Listo' : 'Editar texto', onclick: function () {
        S.editMsg = !S.editMsg; ed.hidden = !S.editMsg; edBtn.textContent = S.editMsg ? 'Listo' : 'Editar texto'; edBtn.setAttribute('aria-expanded', String(S.editMsg)); if (S.editMsg) ed.focus();
      } });
      var right = el('section', { class: 'card wac noprint' }, [
        el('div', { class: 'head-t', style: 'padding-bottom:6px' }, [el('h2', { text: 'Por WhatsApp' }), el('p', { class: 'muted', style: 'font-size:15px', text: 'El corazón y el mensaje van juntos, en un solo envío.' })]),
        el('div', { class: 'bub' }, [el('div', { class: 'img', 'aria-hidden': 'true' }, [svgEl('b')]), txt]),
        el('div', { class: 'stp' }, [el('span', { class: 'num', text: '1' }), el('div', { class: 'bd' }, [
          el('span', { class: 'tt', text: 'Copia el corazón y pégalo en el chat' }),
          el('div', null, [el('button', { class: 'btn primary', type: 'button', onclick: copyPng }, [icon('heart'), 'Copiar corazón'])])
        ])]),
        el('div', { class: 'stp', style: 'border-bottom:0' }, [el('span', { class: 'num', text: '2' }), el('div', { class: 'bd' }, [
          el('div', { class: 'row', style: 'justify-content:space-between' }, [el('span', { class: 'tt', text: 'Escribe el mensaje como pie de la imagen' }), edBtn]),
          ed,
          el('div', null, [el('button', { class: 'btn primary', type: 'button', onclick: function () { copyText(S.msg, 'Mensaje copiado'); } }, [icon('copy'), 'Copiar mensaje'])])
        ])]),
        el('div', { class: 'planb' }, [
          el('span', { style: 'font-weight:500;font-size:14px;color:var(--muted)', text: '¿No se pudo abrir la imagen? Usa el código manual' }),
          el('div', { class: 'code', title: code, text: code }),
          el('div', { class: 'row', style: 'gap:12px' }, [
            el('button', { class: 'btn small', type: 'button', onclick: function () { copyText(code, 'Código copiado'); }, text: 'Copiar código' }),
            el('span', { class: 'muted', style: 'font-size:13px', text: 'Mándalo solo, sin cambiarlo. En la app: “Código manual”.' })
          ]),
          el('span', { class: 'hint', style: 'font-size:13px', text: 'Tamaño del código: ' + code.length + ' caracteres (nivel de corrección ' + res.level + ').' })
        ])
      ]);
      share.replaceChildren(left, right);
    }, function () { share.replaceChildren(el('section', { class: 'card' }, [el('p', { class: 'err', role: 'alert', text: 'Este navegador no puede generar el código. Usa una versión reciente de Chrome, Edge, Safari o Firefox.' })])); });
  }

  /* ---------- respaldo ---------- */
  function downloadBackup() {
    var data = { app: 'planes-sarenti', v: 1, exported: nowSec(), plans: plans, templates: templates };
    download(new Blob([JSON.stringify(data)], { type: 'application/json' }), 'sarenti-respaldo-' + new Date().toISOString().slice(0, 10) + '.json');
    toast('Respaldo descargado');
  }
  function buildBackup(main) {
    main.appendChild(hero('Respaldo', 'Respaldo y privacidad', 'Los planes viven solo en este dispositivo. Guarda una copia para no perderlos o para pasarlos a otro equipo.'));
    main.appendChild(el('section', { class: 'card stack', style: 'gap:14px' }, [
      el('h2', { text: 'Guardar un respaldo', style: 'font-size:24px' }),
      el('p', { class: 'muted', style: 'font-size:15px', text: 'Descarga un archivo con todos tus planes y plantillas. Contiene datos de pacientes: guárdalo en un lugar seguro.' }),
      el('div', null, [el('button', { class: 'btn primary', type: 'button', onclick: downloadBackup }, [icon('download'), 'Descargar respaldo'])])
    ]));
    var msg = el('p', { role: 'status' });
    var file = el('input', { type: 'file', id: 'bk-file', accept: '.json,application/json', onchange: function (e) {
      var f = e.target.files[0]; if (!f) return;
      f.text().then(function (t) {
        var d = JSON.parse(t); if (!d || d.app !== 'planes-sarenti' || !Array.isArray(d.plans)) throw 0;
        var added = 0, updated = 0;
        d.plans.forEach(function (np) {
          var ex = plans.filter(function (x) { return x.id === np.id; })[0];
          if (!ex) { plans.push(np); added++; } else if ((np.updated || 0) > (ex.updated || 0)) { plans[plans.indexOf(ex)] = np; updated++; }
        });
        (d.templates || []).forEach(function (t2) { if (!templates.some(function (x) { return x.tplName === t2.tplName; })) templates.push(t2); });
        persist(); render(); toast('Listo: ' + added + ' planes nuevos y ' + updated + ' actualizados.');
      }).catch(function () { msg.className = 'err'; msg.textContent = 'Ese archivo no es un respaldo de Planes Sarenti.'; });
    } });
    main.appendChild(el('section', { class: 'card stack', style: 'gap:14px' }, [
      el('h2', { text: 'Cargar un respaldo', style: 'font-size:24px' }),
      el('p', { class: 'muted', style: 'font-size:15px', text: 'Une los planes del archivo con los de este dispositivo. Si un plan está en los dos, se queda el más reciente.' }),
      el('div', { class: 'fld' }, [el('label', { for: 'bk-file', class: 'lbl', text: 'Archivo de respaldo (.json)' }), file]), msg
    ]));
    main.appendChild(el('section', { class: 'card stack', style: 'gap:14px' }, [
      el('h2', { text: 'PIN y privacidad', style: 'font-size:24px' }),
      el('p', { class: 'muted', style: 'font-size:15px', text: 'El PIN evita que alguien abra la herramienta por casualidad. Los datos no están cifrados: protege también el dispositivo con su propio bloqueo de pantalla.' }),
      el('div', { class: 'row' }, [
        el('button', { class: 'btn', type: 'button', onclick: function () { var a = prompt('PIN actual:'); if (a === null) return; var d = lsGet(K_PIN); hashPin(a, d.salt).then(function (h) { if (h !== d.hash) return toast('PIN incorrecto'); lsDel(K_PIN); unlocked = false; render(); }); }, text: 'Cambiar PIN' }),
        el('button', { class: 'btn danger', type: 'button', onclick: function () { if (confirm('Se borrarán TODOS los planes y plantillas de este dispositivo. ¿Seguro?') && confirm('Última confirmación: ¿ya descargaste un respaldo?')) { lsDel(K_PLANS); lsDel(K_TPL); plans = []; templates = []; go('home'); } }, text: 'Borrar todo' })
      ])
    ]));
  }

  /* ---------- inicio ---------- */
  /* El menú "Más" se cierra al tocar fuera o con Escape. */
  function closeMenus(e) { document.querySelectorAll('details.more[open]').forEach(function (d) { if (!e || e.type === 'keydown' || !d.contains(e.target)) d.open = false; }); }
  document.addEventListener('click', closeMenus);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenus(e); });
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(function () {});
  window.addEventListener('beforeunload', function () { if (!saved) persist(); });
  if (lsGet(K_PIN)) loadAll();
  render();
})();
