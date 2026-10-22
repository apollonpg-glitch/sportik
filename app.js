/* Спортік — трекер тренувань. Vanilla JS, дані в localStorage. */
'use strict';
// Дані кожного акаунта окремо: sportik.v1:<email>. sportik.v1 без акаунта — старі дані (до входу через Google).
const LEGACY = 'sportik.v1', USER_KEY = 'sportik.user', DRV = 'sportik.drive:', ACCT = 'sportik.acct:';
let USER = null; try { USER = JSON.parse(localStorage.getItem(USER_KEY)); } catch (e) {}
if (!USER || !USER.email) USER = null;
let KEY = USER ? LEGACY + ':' + USER.email : null;
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const num = v => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : null; };
const fmtDur = s => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
  return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };
const ic = (n, e = '') => `<span class="ms" aria-hidden="true">${n}</span>${e ? `<span class="em" aria-hidden="true">${e}</span>` : ''}`;
const fmtDate = t => new Date(t).toLocaleDateString('uk-UA', {day: '2-digit', month: '2-digit', year: '2-digit'});
const fmtDateLong = t => new Date(t).toLocaleDateString('uk-UA', {weekday: 'short', day: 'numeric', month: 'long'});

// Типи вправ: підписи двох полів підходу. Об'єм рахується лише для 'reps'.
const TYPES = {
  reps: {name: 'кг × повт', a: 'кг', b: 'повт'},
  time: {name: 'Час, с', a: 'кг', b: 'сек'},
  dist: {name: 'Дист., м', a: 'кг', b: 'м'},
  min:  {name: 'Хвилини', a: 'хв', b: 'пульс'},
};

// Гантелі ×2: вводиться вага ОДНІЄЇ гантелі, тоннаж рахується з обох.
const ONE_DB = /(одн(ією|ієї|ій|у|а|ою)\s+(рук|гантел)|однорук|по\s+одн)/i;
const autoPair = n => /гантел/i.test(n || '') && !ONE_DB.test(n || '');
const E = (name, sets, reps, rest, type = 'reps', o = {}) => ({id: uid(), name, sets, reps, rest, type, pair: type === 'reps' && autoPair(name), ...o});
function defaultProgram() {
  return [
    {id: 'd1', wd: 1, short: 'Пн', name: 'Верх тіла, сила', cardio: '35 хв зона 2, доріжка під нахилом 6–10%', exercises: [
      E('Жим штанги лежачи', 4, '5–6', 150), E('Тяга штанги в нахилі', 4, '6–8', 120),
      E('Жим гантелей сидячи над головою', 3, '8', 90), E('Підтягування', 4, '6–8', 120),
      E('Віджимання на брусах', 3, '8–10', 90), E('Тяга канату до обличчя в кросовері', 3, '15', 60)]},
    {id: 'd2', wd: 2, short: 'Вт', name: 'Низ тіла, сила', cardio: '25 хв легко на велотренажері', exercises: [
      E('Станова тяга', 4, '5', 180), E('Жим ногами', 4, '8–10', 120),
      E('Болгарські випади з гантелями', 3, '8/нога', 90), E('Гіперекстензія з вагою', 3, '12', 60),
      E('Підйоми на носки в тренажері жиму ногами', 4, '15', 60), E('Планка', 3, '45–60', 45, 'time')]},
    {id: 'd3', wd: 3, short: 'Ср', name: 'Витривалість, кор', cardio: '', exercises: [
      E('Кардіо зона 2', 1, '60', 0, 'min'), E('Підйоми ніг у висі', 3, '10–12', 60),
      E('Скручування на колінах у кросовері', 3, '15', 60), E('Прогулянка фермера', 4, '40', 60, 'dist'),
      E('Бічна планка', 3, '30–45', 30, 'time'), E('Мобільність', 1, '15', 0, 'min')]},
    {id: 'd4', wd: 4, short: 'Чт', name: "Верх тіла, об'єм", cardio: 'Інтервали 4×4', exercises: [
      E('Жим гантелей на похилій лавці', 4, '8–10', 90), E('Тяга верхнього блоку', 4, '10–12', 90),
      E('Тяга однією рукою в тренажері', 3, '10/рука', 60), E('Жим у тренажері для грудей, нейтральний хват', 3, '10–12', 60),
      E('Жим у тренажері для плечей', 3, '10–12', 60), E('Махи гантелями в сторони', 4, '12–15', 45),
      E('Згинання рук з гантелями на біцепс', 3, '12', 60, 'reps', {ss: 'A'}), E('Розгинання рук на блоці (трицепс)', 3, '12', 60, 'reps', {ss: 'A'})]},
    {id: 'd5', wd: 5, short: 'Пт', name: "Низ тіла, об'єм", cardio: 'Кругове 20 хв (40/20)', exercises: [
      E('Румунська тяга', 4, '8', 120), E('Гоблет-присідання', 4, '10–12', 90),
      E('Жим ногами вузько', 3, '12–15', 90), E('Ягідний міст зі штангою', 3, '10–12', 90),
      E('Розведення ніг', 3, '15', 45), E('Зведення ніг', 3, '15', 45)]},
  ];
}

// ---------- суперсети: вправи з однаковим ss, що стоять поспіль ----------
function newSS(list) { const used = new Set(list.map(x => x.ss).filter(Boolean));
  for (const c of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') if (!used.has(c)) return c; return 'S' + uid().slice(0, 4); }
// Групи — лише суміжні; одиночні знімаються, повторні id перейменовуються.
function normSS(list) {
  const seen = new Set();
  for (let i = 0; i < list.length;) {
    const id = list[i].ss; if (!id) { delete list[i].ss; i++; continue; }
    let j = i; while (j + 1 < list.length && list[j + 1].ss === id) j++;
    if (j === i) delete list[i].ss;
    else { let nid = id; if (seen.has(id)) { nid = newSS(list); for (let k = i; k <= j; k++) list[k].ss = nid; } seen.add(nid); }
    i = j + 1;
  }
  return list;
}
const linkedNext = (list, i) => !!(list[i]?.ss && list[i + 1]?.ss === list[i].ss);
function ssRange(list, i) { let a = i, b = i; if (!list[i]?.ss) return [i, i];
  while (a > 0 && list[a - 1].ss === list[i].ss) a--; while (b + 1 < list.length && list[b + 1].ss === list[i].ss) b++; return [a, b]; }
function ssLink(list, i) {
  const a = list[i], b = list[i + 1]; if (!a || !b) return;
  const id = a.ss || b.ss || newSS(list), old = b.ss;
  a.ss = id; b.ss = id; if (old && old !== id) for (let k = i + 2; k < list.length && list[k].ss === old; k++) list[k].ss = id;
  normSS(list);
}
function ssUnlink(list, i) {
  const id = list[i]?.ss; if (!id) return; const nid = newSS(list);
  for (let k = i + 1; k < list.length && list[k].ss === id; k++) list[k].ss = nid;
  normSS(list);
}
const ssRest = (list, i) => { const [a, b] = ssRange(list, i); return Math.max(0, ...list.slice(a, b + 1).map(x => +x.rest || 0)); };

// ---------- стан і міграції ----------
const SCHEMA = 2;
const cap = t => t ? t[0].toUpperCase() + t.slice(1) : t;
const SS_NAMES = {'біцепс гантелі': 'Згинання рук з гантелями на біцепс', 'біцепс з гантелями': 'Згинання рук з гантелями на біцепс', 'трицепс на блоці': 'Розгинання рук на блоці (трицепс)'};
// v1 -> v2: прапорець ×2 для гантелей; «Суперсет: X + Y» у програмі -> дві пов'язані вправи. Історію не переписуємо.
function migrate(st) {
  if (!st || !Array.isArray(st.program)) return st;
  const v = st.v || 1;
  for (const d of st.program) {
    d.exercises ||= [];
    if (v < 2) {
      const out = [];
      for (const ex of d.exercises) {
        const m = /^\s*суперсет\s*:\s*(.+?)\s*\+\s*(.+?)\s*$/i.exec(ex.name || '');
        if (!m) { out.push(ex); continue; }
        const rp = String(ex.reps ?? '').split('+').map(x => x.trim()), id = newSS(d.exercises.concat(out));
        [m[1], m[2]].forEach((part, k) => {
          const name = SS_NAMES[part.toLowerCase()] || cap(part);
          out.push({id: k ? uid() : ex.id || uid(), name, sets: ex.sets, reps: rp[k] || rp[0] || '', rest: ex.rest, type: ex.type || 'reps', pair: autoPair(name), ss: id});
        });
      }
      d.exercises = out;
    }
    for (const ex of d.exercises) if (ex.pair === undefined) ex.pair = (ex.type || 'reps') === 'reps' && autoPair(ex.name);
    normSS(d.exercises);
  }
  if (st.active && Array.isArray(st.active.exercises))
    for (const e of st.active.exercises) if (e.pair === undefined) e.pair = (e.type || 'reps') === 'reps' && autoPair(e.name);
  st.v = SCHEMA;
  return st;
}
let S;
const blank = () => ({v: SCHEMA, program: [], sessions: [], active: null, rest: null});
function load() {
  S = null;
  if (KEY) try { S = JSON.parse(localStorage.getItem(KEY)); } catch (e) { S = null; }
  if (!S || !Array.isArray(S.program)) S = blank();
  S.sessions ||= []; S.active ??= null; S.rest ??= null;
  if ((S.v || 1) < SCHEMA) {
    try { localStorage.setItem(KEY + '.backup-v' + (S.v || 1), localStorage.getItem(KEY) || ''); } catch (e) {}
    migrate(S); save();
  }
}
function save() { if (KEY) localStorage.setItem(KEY, JSON.stringify(S)); }
load();

let ui = {tab: 'workout', day: null, view: null, progEx: null, editDay: null};

// ---------- допоміжне ----------
const sameEx = (a, b) => (a.exId && b.id && a.exId === b.id) || (a.name || '').trim().toLowerCase() === (b.name || '').trim().toLowerCase();
function lastFor(ex, excludeId) {
  for (let i = S.sessions.length - 1; i >= 0; i--) {
    const s = S.sessions[i]; if (s.id === excludeId) continue;
    const e = s.exercises.find(x => sameEx(x, ex) && x.sets.some(t => t.done));
    if (e) return {date: s.start, sets: e.sets.filter(t => t.done), pair: e.pair};
  }
  return null;
}
const firstNum = t => { const m = String(t).match(/\d+([.,]\d+)?/); return m ? num(m[0]) : null; };
function sessionVolume(s) {
  let v = 0;
  for (const e of s.exercises) if ((e.type || 'reps') === 'reps')
    for (const t of e.sets) if (t.done && t.w && t.r) v += t.w * t.r * (e.pair ? 2 : 1);
  return Math.round(v);
}
const e1rm = (w, r) => r <= 1 ? w : w * (1 + r / 30);
const todayDay = () => { const wd = new Date().getDay(); return (S.program.find(d => d.wd === wd) || S.program[0] || {}).id; };
const dayById = id => S.program.find(d => d.id === id);
function setStr(t, type) { const T = TYPES[type || 'reps']; return type === 'min' ? `${t.w ?? '–'} хв${t.r ? ' @' + t.r : ''}` : (t.w ? t.w + '×' : '') + (t.r ?? '–') + (type === 'reps' ? '' : ' ' + T.b); }

// ---------- звук / вібрація / wake lock ----------
let actx;
function unlockAudio() { try { actx ||= new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); } catch (e) {} }
function beep() {
  try { unlockAudio(); if (!actx) return; const t0 = actx.currentTime;
    [0, .25, .5].forEach((d, i) => { const o = actx.createOscillator(), g = actx.createGain();
      o.frequency.value = i === 2 ? 1320 : 880; o.connect(g); g.connect(actx.destination);
      g.gain.setValueAtTime(.0001, t0 + d); g.gain.exponentialRampToValueAtTime(.4, t0 + d + .02);
      g.gain.exponentialRampToValueAtTime(.0001, t0 + d + .2); o.start(t0 + d); o.stop(t0 + d + .22); });
  } catch (e) {}
}
let wakeLock = null, awakeVid = null;
const awakeOn = () => S.awake !== false;
function vidFallback(on) {
  if (on) {
    if (!awakeVid) { awakeVid = document.createElement('video'); Object.assign(awakeVid, {src: 'awake.mp4', loop: true, muted: true, playsInline: true});
      awakeVid.setAttribute('playsinline', ''); awakeVid.setAttribute('muted', ''); awakeVid.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;bottom:0;left:0';
      document.body.appendChild(awakeVid); }
    awakeVid.play().catch(() => {});
  } else if (awakeVid) awakeVid.pause();
}
async function lockWake() {
  if (!awakeOn() || document.hidden) return;
  if ('wakeLock' in navigator) {
    if (wakeLock) return;
    try { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; awakeBtn(); }); awakeBtn(); return; } catch (e) {}
  }
  vidFallback(true); awakeBtn();
}
function releaseWake() { try { wakeLock && wakeLock.release(); } catch (e) {} wakeLock = null; vidFallback(false); awakeBtn(); }
function awakeBtn() { const b = $('#awakeBtn'); if (!b) return; b.classList.toggle('on', awakeOn()); b.title = awakeOn() ? 'Екран не гасне (натисни, щоб вимкнути)' : 'Екран гасне як зазвичай (натисни, щоб увімкнути)'; b.textContent = awakeOn() ? '🔆' : '🌙'; }
document.addEventListener('pointerdown', () => { if (awakeOn() && !wakeLock) lockWake(); }, {passive: true});

// ---------- таймер відпочинку (на мітках часу, не на тіках) ----------
let restAlerted = false;
function startRest(sec, name) {
  if (!sec) return;
  S.rest = {endAt: Date.now() + sec * 1000, name, dur: sec}; restAlerted = false; save(); tick();
}
function tick() {
  const box = $('#rest');
  if (S.rest) {
    const left = (S.rest.endAt - Date.now()) / 1000;
    box.hidden = false; $('#restName').textContent = 'Відпочинок · ' + S.rest.name;
    $('#restTime').textContent = left > 0 ? fmtDur(Math.ceil(left)) : 'Час!';
    box.classList.toggle('over', left <= 0);
    const tot = Math.max(S.rest.dur || 0, left, 1); $('#restBar').style.transform = `scaleX(${Math.max(0, Math.min(1, left / tot))})`;
    if (left <= 0 && !restAlerted) {
      restAlerted = true;
      if (left > -5) { navigator.vibrate?.([300, 150, 300, 150, 500]); beep(); }
      setTimeout(() => { if (S.rest && S.rest.endAt <= Date.now()) { S.rest = null; save(); tick(); } }, 4000);
    }
  } else box.hidden = true;
  document.body.classList.toggle('resting', !!S.rest);
  const c = $('#sessionClock');
  if (S.active) { c.hidden = false; c.textContent = '⏱ ' + fmtDur((Date.now() - S.active.start) / 1000); } else c.hidden = true;
}
setInterval(tick, 250);
document.addEventListener('visibilitychange', () => { if (!document.hidden) { tick(); lockWake(); } });

// ---------- Вхід через Google (GIS у браузері, без секрету) і токени ----------
const GH_CLIENT_ID = '1011377398999-6nn1j2r0clqsijevqrbkdngi2mv821mq.apps.googleusercontent.com';
let gisP = null;
function loadGis() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  return gisP ||= new Promise((res, rej) => {
    const sc = document.createElement('script'); sc.src = 'https://accounts.google.com/gsi/client'; sc.async = true;
    sc.onload = () => res(); sc.onerror = () => { gisP = null; sc.remove(); rej(new Auth.AuthError('gis')); };
    document.head.appendChild(sc);
  });
}
const AU = Auth.create({clientId: GH_CLIENT_ID, storage: localStorage, oauth2: () => window.google?.accounts?.oauth2 || null, loadGis});
// Токен для потрібних scope. interactive — лише з обробника натискання (може відкрити вікно Google).
const tokenFor = (scopes, interactive) => USER ? AU.token(USER.email, scopes, {interactive}) : Promise.reject(new Auth.AuthError('needauth'));
const hasTok = scopes => !!(USER && AU.cached(USER.email, scopes));
// Налаштування акаунта на цьому пристрої: {health}
let M = {};
const saveM = () => { if (USER) try { localStorage.setItem(ACCT + USER.email, JSON.stringify(M)); } catch (e) {} };

const FB_ERR = {
  popup: 'Браузер заблокував вікно входу Google. Натисни ще раз (або дозволь спливаючі вікна для цього сайту).',
  closed: 'Вікно входу Google закрито. Натисни ще раз і увійди в акаунт, до якого підключений Fitbit.',
  denied: 'Доступ не надано. Щоб підтягувати кардіо, дозволь Спортіку читати дані «Активність і фітнес» у Google.',
  needauth: 'Вхід у Google застарів. Натисни «Оновити з Fitbit».',
  expired: 'Вхід у Google застарів. Натисни «Оновити з Fitbit».',
  none: 'Дані Fitbit ще не синхронізовані — відкрий додаток Fitbit. Спортік підтягне їх сам, щойно вони з’являться.',
  network: "Немає зв'язку з Google. Спробую пізніше.",
  gis: 'Не вдалося завантажити вхід Google. Перевір інтернет і спробуй ще раз.',
  forbidden: 'Google відмовив у доступі (403). Перевір, що вхід виконано в той самий акаунт, де Fitbit, і що він доданий у тестувальники проєкту.',
};
let toastT;
function toast(msg, bad, action) {
  let el = $('#toast'); if (!el) { el = document.createElement('div'); el.id = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.textContent = msg; el.className = (bad ? 'bad' : '') + (action ? ' act' : ''); el.hidden = false; clearTimeout(toastT);
  if (action) { const b = document.createElement('button'); b.className = 'text'; b.dataset.act = action.act; b.textContent = action.label; el.appendChild(b); }
  toastT = setTimeout(() => el.hidden = true, action ? 15000 : bad ? 9000 : 6000);
}
const snack = (msg, label) => toast(msg, false, {act: 'syncLogin', label});
const stripFb = n => String(n || '').replace(/\s*⌚ з Fitbit:[\s\S]*$/, '').trim();
function applyFitbit(s, r) {
  s.fitbit = {at: r.at, cardio: r.cardio || null, strength: r.strength || null};
  if (r.cardio) {
    s.cardio.min = r.cardio.min; s.cardio.hr = r.cardio.hr ?? '';
    s.cardio.note = [stripFb(s.cardio.note), Fitbit.cardioNote(r.cardio)].filter(Boolean).join(' ');
  }
  if (s.end) s.volume = sessionVolume(s);
  save();
}
function fbSummary(s) {
  const p = []; const c = s.fitbit?.cardio, st = s.fitbit?.strength;
  if (st) p.push(`силове ${st.min} хв${st.hr ? ' · пульс ' + st.hr : ''}`);
  if (c) p.push(`кардіо ${c.min} хв`);
  if (!p.length && s.fitbitPending) return '⌚ чекаю дані Fitbit…';
  return p.length ? '⌚ ' + p.join(', ') : '';
}
function strengthLine(st) {
  if (!st) return '';
  const p = [st.min + ' хв']; if (st.hr) p.push('сер. пульс ' + st.hr); if (st.maxHr) p.push('макс. ' + st.maxHr);
  if (st.kcal) p.push(st.kcal + ' ккал'); if (st.azm) p.push('АЗМ ' + st.azm);
  return `<div class="fb">⌚ Силове з Fitbit: ${esc(p.join(' · '))}</div>`;
}
const FB_WINDOW = 48 * 3600e3;
const fbMsg = r => [r.cardio && `кардіо ${r.cardio.min} хв${r.cardio.hr ? ', пульс ' + r.cardio.hr : ''}`, r.strength && `силове ${r.strength.min} хв${r.strength.hr ? ', пульс ' + r.strength.hr : ''}`].filter(Boolean).join('; ');
const fbBusy = new Set();
// Імпорт з Fitbit для сесії. opt: {tokP (вже запитаний токен), interactive, auto (тихий повтор), btn}
// Повертає 'ok' | 'partial' | 'none' | 'error'.
async function fbRun(s, opt = {}) {
  if (fbBusy.has(s.id)) return 'busy'; fbBusy.add(s.id);
  const tokP = opt.tokP || tokenFor(['health'], !!opt.interactive); // синхронно в межах натискання
  const st = opt.btn && opt.btn.parentElement.querySelector('.fbst'), say = m => { if (st) st.textContent = m; };
  if (opt.btn) { opt.btn.disabled = true; say('Вхід у Google…'); }
  try {
    const tok = await tokP; say('Завантажую тренування з Fitbit…');
    const r = await Fitbit.importFor(tok, s.start, s.end || Date.now());
    applyFitbit(s, r);
    // Силове вмикається на браслеті останнім: якщо його ще немає — пізніше спробуємо знову.
    s.fitbitPending = !r.strength && !!s.end && Date.now() - s.end < FB_WINDOW;
    save(); if (ui.tab === 'history' || ui.tab === 'workout') rerender();
    toast('Підтягнуто з Fitbit: ' + fbMsg(r) + (s.fitbitPending ? '. Силове ще не синхронізоване — підтягну, щойно з’явиться.' : r.cardio ? '' : '. Кардіо-тренування не знайдено.'));
    if (s.end) scheduleSync(opt.auto ? 0 : 5000);
    return s.fitbitPending ? 'partial' : 'ok';
  } catch (e) {
    const code = e && e.code;
    if (code === 'expired') AU.drop(USER.email);
    if (s.end && Date.now() - s.end < FB_WINDOW && (code === 'none' || opt.finish || opt.auto)) { if (!s.fitbitPending) { s.fitbitPending = true; save(); } }
    if (code === 'none' && s.end && Date.now() - s.end >= FB_WINDOW) { s.fitbitPending = false; save(); }
    if (!opt.auto) {
      say('');
      toast(FB_ERR[code] || 'Не вдалося отримати дані з Fitbit' + (e && e.message ? ` (${e.message})` : '') + '. Спробуй ще раз.', code !== 'none');
    }
    if (ui.tab === 'history') rerender();
    return code === 'none' ? 'none' : 'error';
  } finally { fbBusy.delete(s.id); if (opt.btn) opt.btn.disabled = false; }
}
// Тихий повтор для сесій за 48 год, що чекають на Fitbit: лише з дійсним токеном, без вікон Google.
let fbLastRetry = 0;
async function retryFitbit(force) {
  if (!USER || !M.health || document.hidden || navigator.onLine === false) return 0;
  if (!force && Date.now() - fbLastRetry < 60000) return 0;
  let changed = false;
  for (const s of S.sessions) if (s.fitbitPending && s.end && Date.now() - s.end >= FB_WINDOW) { s.fitbitPending = false; changed = true; }
  if (changed) save();
  const list = S.sessions.filter(s => s.fitbitPending && s.end);
  if (!list.length || !hasTok(['health'])) return 0;
  fbLastRetry = Date.now();
  let n = 0;
  for (const s of list) { const r = await fbRun(s, {auto: true}); if (r === 'ok' || r === 'partial') n++; }
  return n;
}

// ---------- Google Drive: автосинхронізація у файл sportik-data.json (scope drive.file — лише власний файл) ----------
let D = {};
// D = {on, fileId, last, pending, err}
const saveD = () => { if (USER) try { localStorage.setItem(DRV + USER.email, JSON.stringify(D)); } catch (e) {} };
let drBusy = null, drTimer = null, drAgain = false;
const drSaved = () => hasTok(['drive']);
const DR_ERR = {
  disabled: 'Увімкни Google Drive API у Google Cloud проєкті.',
  denied: 'Доступ до Google Drive не надано. Щоб синхронізувати, дозволь Спортіку створювати власний файл на Диску.',
  scope: 'Немає дозволу на Google Drive. Натисни «Синхронізувати з Google Drive» і постав галочку доступу до Диска.',
  popup: 'Браузер заблокував вікно входу Google. Натисни «Увійти» ще раз.',
  closed: 'Вікно входу Google закрито — синхронізацію відкладено.',
  network: "Немає зв'язку з Google Drive. Синхронізую пізніше.",
  gis: 'Не вдалося завантажити вхід Google. Перевір інтернет.',
  forbidden: 'Google Drive відмовив у доступі (403). Перевір акаунт і що він доданий у тестувальники проєкту.',
};
const drMsg = e => DR_ERR[e && e.code] || 'Не вдалося синхронізувати з Google Drive' + (e && e.message && e.message !== e.code ? ` (${e.message})` : '') + '.';
function exportData() {
  const last = S.sessions.reduce((a, x) => !a || x.start > a.start ? x : a, null), now = new Date().toISOString();
  return {app: 'sportik', version: SCHEMA, exported: now, exportedAt: now, account: USER ? USER.email : undefined, program: S.program, sessions: S.sessions,
    settings: {awake: awakeOn()},
    summary: {sessions: S.sessions.length, lastSession: last ? {id: last.id, date: new Date(last.start).toISOString(), dayName: last.dayName,
      durationMin: Math.round((last.duration || 0) / 60), volumeKg: sessionVolume(last), sets: last.exercises.reduce((a, e) => a + e.sets.filter(t => t.done).length, 0)} : null}};
}
// Синхронізація. interactive — викликано з натискання (можна відкрити вікно Google).
function syncDrive(interactive) {
  if (!USER) return Promise.resolve(false);
  if (drBusy) { drAgain = true; return drBusy; }
  clearTimeout(drTimer); drTimer = null;
  const tokP = tokenFor(['drive'], interactive); // синхронно в межах натискання
  drBusy = (async () => {
    let tok;
    try { tok = await tokP; } catch (e) {
      D.pending = true; D.err = e.code === 'denied' ? DR_ERR.denied : ''; saveD(); syncUi();
      if (e.code === 'needauth' || e.code === 'closed' || e.code === 'popup') snack(e.code === 'needauth' ? 'Зміни ще не на Google Drive: увійди для синхронізації.' : DR_ERR[e.code], 'Увійти');
      else toast(drMsg(e), true);
      return false;
    }
    try {
      D.fileId = await DriveSync.upload(tok, exportData(), D.fresh ? null : D.fileId, undefined, {fresh: !!D.fresh});
      delete D.fresh; D.last = Date.now(); D.pending = false; D.err = ''; D.on = true; saveD(); syncUi();
      const t = $('#toast'); if (t && t.classList.contains('act')) t.hidden = true;
      return true;
    } catch (e) {
      if (e.code === 'expired' || e.code === 'scope') AU.drop(USER.email);
      D.pending = true; D.err = drMsg(e); saveD(); syncUi();
      if (e.code === 'expired') snack('Вхід у Google застарів — увійди для синхронізації.', 'Увійти');
      else toast(D.err, true);
      return false;
    }
  })().finally(() => { drBusy = null; syncUi(); if (drAgain) { drAgain = false; scheduleSync(); } });
  return drBusy;
}
// Після змін: через 5 с тиші (без вікна Google — якщо треба увійти, позначаємо «очікує»).
function scheduleSync(delay = 5000) {
  if (!D.on || !USER) return;
  D.pending = true; saveD(); clearTimeout(drTimer);
  drTimer = setTimeout(() => syncDrive(false), delay);
}
const fmtSync = t => t ? new Date(t).toLocaleString('uk-UA', {day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'}) : '';
function syncStatus() {
  if (drBusy) return 'Синхронізую…';
  if (D.err && D.pending) return D.err;
  if (D.pending && D.on) return 'Є зміни, що чекають синхронізації' + (D.last ? ` · остання ${fmtSync(D.last)}` : '');
  return D.last ? 'Остання синхронізація: ' + fmtSync(D.last) : 'Ще не синхронізовано';
}
const syncLabel = () => D.pending && D.on && !drSaved() ? 'Увійти для синхронізації' : 'Синхронізувати з Google Drive';
function syncUi() { const lb = $('#syncBtn .lbl'); if (lb) lb.textContent = syncLabel(); const bt = $('#syncBtn'); if (bt) bt.disabled = !!drBusy; const el = $('#syncSt'); if (el) { el.textContent = syncStatus(); el.classList.toggle('bad', !!(D.err && D.pending)); }
  const sw = $('#syncOn'); if (sw) sw.setAttribute('aria-checked', String(!!D.on)); }
function syncCard() {
  return `<h2>Google Drive</h2><div class="card">
    <div class="row between" style="flex-wrap:nowrap"><div><b>Резервна копія</b><div class="mut small">Після кожного тренування та змін — у файл ${DriveSync.NAME} на твоєму Диску. Спортік бачить лише цей файл.</div></div>
      <button class="switch" id="syncOn" role="switch" data-act="syncToggle" aria-checked="${!!D.on}" aria-label="Автосинхронізація з Google Drive"><i></i></button></div>
    <div class="row" style="margin-top:10px"><button data-act="sync" id="syncBtn">${ic('cloud_sync', '☁')}<span class="lbl">${syncLabel()}</span></button></div>
    <p class="mut small" id="syncSt">${esc(syncStatus())}</p></div>`;
}
const HEALTH_DISCLOSURE = 'Спортік читає з Google Health лише твої тренування (тип, час, тривалість, пульс, калорії, дистанцію), щоб заповнити кардіо й силове. Дані лишаються на телефоні та в твоєму Google Диску.';
function fitbitCard() {
  return `<h2>Fitbit</h2><div class="card">
    <div class="row between" style="flex-wrap:nowrap"><div><b>Fitbit / Google Health</b><div class="mut small">${M.health ? 'Підключено: після «Завершити тренування» кардіо й силове підтягуються самі.' : 'Не підключено.'}</div></div>
      ${M.health ? '<span class="tag">✓ підключено</span>' : ''}</div>
    <p class="mut small">${esc(HEALTH_DISCLOSURE)}</p>
    <div class="row">${M.health ? `<button class="outlined" data-act="fbDisconnect">${ic('link_off', '⛓')}Відключити</button>` : `<button data-act="fbConnect">${ic('watch', '⌚')}Підключити Fitbit / Google Health</button>`}</div></div>`;
}
function accountCard() {
  if (!USER) return '';
  const ini = esc((USER.name || USER.email).trim()[0]?.toUpperCase() || '?');
  return `<h2>Акаунт</h2><div class="card acct"><div class="row" style="flex-wrap:nowrap">
    <div class="avatar">${USER.picture ? `<img src="${esc(USER.picture)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}<span>${ini}</span></div>
    <div style="min-width:0;flex:1"><b>${esc(USER.name || USER.email)}</b><div class="mut small" style="overflow:hidden;text-overflow:ellipsis">${esc(USER.email)}</div></div>
    <button class="outlined" data-act="signOut">${ic('logout', '⎋')}Вийти</button></div></div>`;
}

// ---------- діалог (M3) ----------
function ask(title, text, buttons) {
  return new Promise(res => {
    const bg = document.createElement('div'); bg.className = 'dlg-bg';
    bg.innerHTML = `<div class="dlg" role="dialog" aria-modal="true" aria-labelledby="dlgT"><h3 id="dlgT">${esc(title)}</h3><p>${esc(text)}</p>
      <div class="dlg-btns">${buttons.map((b, i) => `<button class="${b.primary ? 'primary' : 'text'}" data-dlg="${i}">${esc(b.label)}</button>`).join('')}</div></div>`;
    bg.addEventListener('click', ev => { const b = ev.target.closest('[data-dlg]'); if (!b) return; ev.stopPropagation(); bg.remove(); res(buttons[+b.dataset.dlg].value); });
    document.body.appendChild(bg);
  });
}

// ---------- вхід, міграція даних телефона, відновлення з Диска ----------
const GATE_ERR = {
  denied: 'Google не пустив цей акаунт. Спортік поки в тестовому режимі — увійти можуть лише акаунти зі списку тестувальників. Попроси власника додати твою пошту, або увійди іншим акаунтом.',
  closed: 'Вікно входу Google закрито. Якщо Google написав «Доступ заблоковано» (403 access_denied) — застосунок у тестовому режимі: попроси власника додати твою пошту в тестувальники.',
  popup: 'Браузер заблокував вікно входу Google. Дозволь спливаючі вікна для цього сайту й натисни ще раз.',
  gis: 'Не вдалося завантажити вхід Google. Перевір інтернет і спробуй ще раз.',
  network: "Немає зв'язку з Google. Перевір інтернет і спробуй ще раз.",
  noemail: 'Google не передав адресу пошти. Натисни ще раз і дозволь доступ до адреси email.',
};
const gateMsg = e => GATE_ERR[e && e.code] || 'Не вдалося увійти через Google' + (e && e.message && e.message !== e.code ? ` (${e.message})` : '') + '. Спробуй ще раз.';
let signing = false;
function legacyData() {
  try { const d = JSON.parse(localStorage.getItem(LEGACY)); if (d && Array.isArray(d.program) && (d.sessions?.length || d.program.length || d.active)) return d; } catch (e) {}
  return null;
}
async function signIn(withHealth) {
  if (signing) return; signing = true;
  const scopes = ['openid', 'email', 'profile', 'drive'].concat(withHealth ? ['health'] : []);
  const p = AU.request(scopes, {prompt: 'select_account'}); // синхронно в межах натискання
  const err = $('#gateErr'), btn = $('[data-act=signIn]');
  if (err) err.textContent = ''; if (btn) btn.disabled = true;
  try {
    const r = await p;
    const info = await Auth.userinfo(r.access_token);
    AU.write(info.email, r);
    await enterUser(info, {drive: Auth.has(r.scope, 'drive'), health: Auth.has(r.scope, 'health'), wantHealth: withHealth});
  } catch (e) {
    const el = $('#gateErr'); if (el) el.textContent = gateMsg(e); else toast(gateMsg(e), true);
  } finally { signing = false; const b = $('[data-act=signIn]'); if (b) b.disabled = false; }
}
async function enterUser(info, g) {
  USER = info; KEY = LEGACY + ':' + info.email;
  localStorage.setItem(USER_KEY, JSON.stringify(info));
  try { M = JSON.parse(localStorage.getItem(ACCT + info.email)) || {}; } catch (e) { M = {}; }
  try { D = JSON.parse(localStorage.getItem(DRV + info.email)) || null; } catch (e) { D = null; }
  const fresh = !localStorage.getItem(KEY);
  D ||= {on: g.drive};
  if (g.health) M.health = true;
  let restored = false, adopted = false;
  if (fresh) {
    const legacy = legacyData();
    if (legacy) {
      const n = (legacy.sessions || []).length, lastS = (legacy.sessions || []).reduce((a, x) => Math.max(a, x.start || 0), 0);
      const ok = await ask('У цьому телефоні є збережені тренування — це твої?',
        `${n} тренувань${lastS ? ', останнє ' + fmtDate(lastS) : ''}, програма з ${legacy.program.length} днів. Якщо так — вони перейдуть у твій акаунт ${info.email}.`,
        [{label: 'Ні, не мої', value: false}, {label: 'Так, мої', value: true, primary: true}]);
      if (ok) { adoptLegacy(info.email); adopted = true; }
    }
    if (!adopted && g.drive) restored = await offerRestore();
    if (!adopted && !restored) { S = blank(); save(); }
  }
  load();
  if (adopted && g.drive) await mergeFromDrive();
  saveM(); saveD();
  ui = {tab: 'workout', day: null, view: null, progEx: null, editDay: null};
  document.body.classList.remove('gate'); render(); awakeBtn(); lockWake();
  if (g.wantHealth && !g.health) toast('Доступ до Google Health не надано — Fitbit можна підключити пізніше в «Програма» → Fitbit.', true);
  else if (!g.drive) toast('Без доступу до Google Drive резервна копія вимкнена. Увімкни її в «Програма» → Google Drive.', true);
  else if (adopted) toast('Тренування з цього телефона тепер у твоєму акаунті.');
  else if (restored) toast('Відновлено з Google Drive.');
  if (D.on && g.drive && (fresh || D.pending)) syncDrive(false);
  retryFitbit(true);
}
// Перенести дані без акаунта (sportik.v1) в простір цього акаунта. Сира копія лишається.
function adoptLegacy(email) {
  const raw = localStorage.getItem(LEGACY), rawDrive = localStorage.getItem('sportik.drive');
  localStorage.setItem('sportik.v1.adopted-backup', JSON.stringify({email, at: Date.now(), data: raw, drive: rawDrive}));
  localStorage.setItem(KEY, raw);
  localStorage.removeItem(LEGACY);
  let od = {}; try { od = JSON.parse(rawDrive) || {}; } catch (e) {}
  // fileId міг належати іншому акаунту — файл знайдемо за назвою на Диску цього акаунта.
  D = {on: D.on || !!od.on, last: od.last, pending: true};
  if (localStorage.getItem('sportik.ghOk')) M.health = true;
  ['sportik.drive', 'sportik.ghOk'].forEach(k => localStorage.removeItem(k));
}
// Тренування з Диска, яких немає на телефоні, додаємо (нічого не губимо).
async function mergeFromDrive() {
  try {
    const tok = await tokenFor(['drive'], false), meta = await DriveSync.findMeta(tok);
    if (!meta) return; D.fileId = meta.id;
    const d = await DriveSync.download(tok, meta.id), have = new Set(S.sessions.map(x => x.id));
    const extra = (d.sessions || []).filter(x => x && x.id && !have.has(x.id));
    if (extra.length) { S.sessions = S.sessions.concat(extra).sort((a, b) => a.start - b.start); save(); }
  } catch (e) {}
}
async function offerRestore() {
  let tok, meta, d;
  try { tok = await tokenFor(['drive'], false); meta = await DriveSync.findMeta(tok); if (!meta) return false; d = await DriveSync.download(tok, meta.id); }
  catch (e) { toast('Не вдалося перевірити резервну копію на Google Drive: ' + drMsg(e), true); D.fresh = true; return false; } // нічого не перезапишемо
  if (!d || !Array.isArray(d.program) || !Array.isArray(d.sessions)) return false;
  const when = meta.modifiedTime ? fmtSync(Date.parse(meta.modifiedTime)) : '';
  const ok = await ask('Знайшов резервну копію на Google Drive',
    `${d.sessions.length} тренувань, програма з ${d.program.length} днів${when ? ', збережено ' + when : ''}. Відновити її на цьому телефоні?`,
    [{label: 'Почати з нуля', value: false}, {label: 'Відновити', value: true, primary: true}]);
  if (!ok) { D.fresh = true; return false; } // стару копію не перезаписуємо — створимо новий файл
  const st = {v: d.version || 1, program: d.program, sessions: d.sessions.sort((a, b) => a.start - b.start), active: null, rest: null, setup: true};
  if (d.settings && d.settings.awake === false) st.awake = false;
  migrate(st); localStorage.setItem(KEY, JSON.stringify(st));
  D.fileId = meta.id; D.last = Date.parse(meta.modifiedTime) || Date.now(); D.pending = false;
  return true;
}
async function signOut() {
  if (D.on && D.pending && !confirm('Є зміни, які ще не потрапили на Google Drive. Вони лишаться на цьому телефоні й синхронізуються, коли ти знову увійдеш. Вийти?')) return;
  clearTimeout(drTimer); AU.drop(USER.email);
  localStorage.removeItem(USER_KEY); USER = null; KEY = null; M = {}; D = {};
  releaseWake(); S = blank(); ui = {tab: 'workout'}; render();
}
function vGate() {
  const fb = !!localStorage.getItem('sportik.ghOk');
  return `<div class="gate-wrap"><div class="gate-logo">${ic('fitness_center', '🏋️')}</div>
    <h1 class="gate-h">Спортік</h1>
    <p class="gate-sub">Трекер тренувань: програма, підходи, таймер відпочинку й прогрес.</p>
    <div class="card gate-list">
      <div>${ic('cloud_done', '☁')}<span>Резервна копія на <b>твоєму</b> Google Диску — у файлі ${DriveSync.NAME}. Інших файлів Спортік не бачить.</span></div>
      <div>${ic('lock', '🔒')}<span>Тренування лише на цьому телефоні й у твоєму Диску. Жодних серверів.</span></div>
      <div>${ic('watch', '⌚')}<span>За бажанням — кардіо й пульс з Fitbit.</span></div></div>
    <label class="check"><input type="checkbox" id="gateHealth" ${fb ? 'checked' : ''}><span><b>Підключити Fitbit / Google Health</b><br><span class="mut small">${esc(HEALTH_DISCLOSURE)}</span></span></label>
    <button class="primary big" data-act="signIn"><span class="g-logo" aria-hidden="true">G</span>Увійти через Google</button>
    <p id="gateErr" class="gate-err" role="alert"></p></div>`;
}
function vOnboard() {
  return `<h2>Вітаю${USER && USER.name ? ', ' + esc(USER.name.split(' ')[0]) : ''}!</h2>
    <div class="card ob"><div class="ob-ic">${ic('edit_note', '📝')}</div><h3>Створи свою програму</h3>
      <p class="mut">Додай дні тренувань і вправи — або почни зі зразка й підлаштуй під себе.</p>
      <button class="primary big" data-act="obCreate">${ic('add', '+')}Створити свою програму</button>
      <div style="height:8px"></div><button class="big" data-act="obSample">${ic('content_copy', '⧉')}Взяти зразок 5-денної програми</button></div>
    ${M.health ? `<div class="card"><b>⌚ Fitbit підключено</b><p class="mut small">Після «Завершити тренування» кардіо й силове підтягнуться самі.</p></div>`
      : `<div class="card"><h3>Fitbit / Google Health</h3><p class="mut small">${esc(HEALTH_DISCLOSURE)}</p><button data-act="fbConnect">${ic('watch', '⌚')}Підключити Fitbit / Google Health</button></div>`}`;
}
// ---------- сесія ----------
function newSession(day) {
  return {id: uid(), dayId: day.id, dayName: `${day.short} · ${day.name}`, start: Date.now(), end: null,
    cardioTarget: day.cardio || '', cardio: {min: '', hr: '', note: ''},
    exercises: day.exercises.map(ex => {
      const last = lastFor(ex);
      const sets = Array.from({length: ex.sets || 1}, (_, i) => {
        const p = last && (last.sets[i] || last.sets[last.sets.length - 1]);
        return {w: p ? p.w : null, r: p ? p.r : null, done: false};
      });
      const pair = ex.pair ?? (last ? last.pair : undefined) ?? autoPair(ex.name);
      const o = {exId: ex.id, name: ex.name, type: ex.type || 'reps', target: `${ex.sets}×${ex.reps}`, targetReps: ex.reps, rest: ex.rest, pair: (ex.type || 'reps') === 'reps' && !!pair, notes: '', sets};
      if (ex.ss) o.ss = ex.ss;
      return o;
    })};
}
// Після підходу: у суперсеті — до того ж підходу наступної вправи без відпочинку; відпочинок — коли коло завершене.
function afterSetDone(s, ei, si) {
  const L = s.exercises, e = L[ei]; ui.ssNext = null;
  if (!e.ss) return startRest(e.rest, e.name);
  const [a, b] = ssRange(L, ei), order = [];
  for (let k = ei + 1; k <= b; k++) order.push(k); for (let k = a; k < ei; k++) order.push(k);
  const nxt = order.find(k => L[k].sets[si] && !L[k].sets[si].done);
  if (nxt != null) { ui.ssNext = {sid: s.id, ei: nxt, si, scroll: true}; return; }
  startRest(ssRest(L, ei), 'суперсет · ' + L.slice(a, b + 1).map(x => x.name).join(' + '));
}
function finishSession() {
  const s = S.active; if (!s) return;
  s.end = Date.now(); s.duration = Math.round((s.end - s.start) / 1000);
  s.exercises.forEach(e => e.sets = e.sets.filter(t => t.done || t.w != null || t.r != null));
  s.volume = sessionVolume(s);
  // Один запит на всі потрібні дозволи — синхронно в межах натискання (вікно Google, лише якщо токен сплив).
  const scopes = [...(D.on ? ['drive'] : []), ...(M.health ? ['health'] : [])];
  const tokP = scopes.length ? tokenFor(scopes, true) : null; tokP && tokP.catch(() => {});
  if (M.health) s.fitbitPending = true;
  S.sessions.push(s); S.active = null; S.rest = null; ui.ssNext = null; save();
  ui.tab = 'history'; ui.view = s.id; render();
  if (!scopes.length) return;
  (async () => {
    if (M.health) await fbRun(s, {tokP, finish: true});
    if (D.on) syncDrive(false);
  })();
}

function exCard(e, ei, s, live) {
  const T = TYPES[e.type] || TYPES.reps, L = s.exercises, isReps = (e.type || 'reps') === 'reps';
  const inSS = !!e.ss, [ga, gb] = ssRange(L, ei), first = inSS && ga === ei, lastM = inSS && gb === ei;
  const nx = ui.ssNext && ui.ssNext.sid === s.id && ui.ssNext.ei === ei ? ui.ssNext.si : -1;
  const last = lastFor(e, s.id);
  const hint = last ? `Минулого разу (${fmtDate(last.date)}): ${last.sets.map(t => setStr(t, e.type)).join(', ')}` : 'Ще немає історії';
  const tn = firstNum(e.targetReps) ?? '', isMin = e.type === 'min';
  const phA = isMin ? tn : T.a, phB = isMin ? T.b : tn;
  const restTxt = inSS && !lastM ? ' · → далі' : (inSS ? ssRest(L, ei) : e.rest) ? ' · ' + (inSS ? ssRest(L, ei) : e.rest) + 'с' : '';
  const ssCls = inSS ? ` ss${first ? ' ss-first' : ''}${lastM ? ' ss-last' : ''}` : '';
  return `<div class="card${ssCls}" data-ei="${ei}">
    ${first ? `<div class="sslbl">${ic('link', '🔗')}Суперсет · відпочинок після кола</div>` : ''}
    <div class="row between" style="flex-wrap:nowrap;align-items:flex-start"><h3>${inSS ? `<span class="ssn">${ei - ga + 1}</span>` : ''}${esc(e.name)}</h3><span class="tgt" style="white-space:nowrap">${esc(e.target || '')}${restTxt}</span></div>
    ${isReps ? `<div class="chips"><button class="chip${e.pair ? ' on' : ''}" data-act="pair" aria-pressed="${!!e.pair}" title="Вводь вагу однієї гантелі; тоннаж рахується з двох">${e.pair ? '✓ ' : ''}×2 гантелі</button></div>` : ''}
    <div class="hint">${esc(hint)}</div>
    <div class="lbls"><span>#</span><span>${isReps && e.pair ? 'кг (1 гант.)' : T.a}</span><span>${T.b}</span><span></span></div>
    ${e.sets.map((t, si) => `<div class="set ${t.done ? 'done' : ''}${si === nx && !t.done ? ' next' : ''}" data-si="${si}">
      <span class="n">${si + 1}</span>
      <input type="number" inputmode="decimal" step="any" data-f="w" value="${t.w ?? ''}" placeholder="${phA}">
      <input type="number" inputmode="decimal" step="any" data-f="r" value="${t.r ?? ''}" placeholder="${phB}">
      <button class="chk" data-act="done" aria-label="Підхід виконано" aria-pressed="${t.done}"><svg viewBox="0 0 18 18"><path d="M3 9.5l4 4 8-9"/></svg></button></div>`).join('')}
    <div class="row"><button data-act="addSet">${ic('add', '+')}підхід</button><button class="outlined" data-act="delSet" ${e.sets.length ? '' : 'disabled'}>${ic('remove', '−')}підхід</button>
      <button class="icon danger" data-act="delEx" aria-label="Видалити вправу" title="Видалити вправу">${ic('delete', '✕')}</button></div>
    ${live ? ssBtn(L, ei) : ''}
    <textarea data-f="notes" placeholder="Нотатки до вправи">${esc(e.notes)}</textarea></div>`;
}
function ssBtn(L, i) {
  if (linkedNext(L, i)) return `<button class="text sslink" data-act="ssUnlink">${ic('link_off', '⛓')}Роз'єднати</button>`;
  if (i < L.length - 1) return `<button class="text sslink" data-act="ssLink">${ic('add_link', '🔗')}Об'єднати в суперсет з наступною</button>`;
  return '';
}
function cardioCard(s) {
  const fc = s.fitbit?.cardio, fromFb = fc && +s.cardio.min === fc.min;
  return `<div class="card"><div class="row between"><h3>Кардіо</h3>${fromFb ? '<span class="tag">з Fitbit</span>' : ''}</div>${s.cardioTarget ? `<div class="tgt">Ціль: ${esc(s.cardioTarget)}</div>` : ''}
    <div class="row" style="flex-wrap:nowrap;margin-top:6px">
      <input type="number" inputmode="decimal" data-c="min" value="${s.cardio.min ?? ''}" placeholder="хвилин">
      <input type="number" inputmode="numeric" data-c="hr" value="${s.cardio.hr ?? ''}" placeholder="сер. пульс"></div>
    <input data-c="note" value="${esc(s.cardio.note)}" placeholder="Що робили (доріжка, вело…)" style="margin-top:6px">
    ${strengthLine(s.fitbit?.strength)}
    ${s.end ? `<div class="fbrow">${s.fitbitPending ? `<span class="fbwait mut small">${ic('sync', '⌛')}Чекаю, поки Fitbit синхронізується…</span>` : ''}<button class="text small-btn" data-act="fitbit">${ic('refresh', '↻')}Оновити з Fitbit</button><span class="fbst mut small">${s.fitbit ? 'Оновлено ' + new Date(s.fitbit.at).toLocaleTimeString('uk-UA', {hour: '2-digit', minute: '2-digit'}) : ''}</span></div>`
      : M.health ? `<div class="mut small fbauto">${ic('watch', '⌚')}Кардіо й силове з Fitbit підтягнуться після «Завершити тренування».</div>` : ''}</div>`;
}
function sessionEditor(s, live) {
  return s.exercises.map((e, i) => exCard(e, i, s, live)).join('') +
    `<div class="card"><div class="row" style="flex-wrap:nowrap"><input id="newExName" placeholder="Додати вправу в це тренування"><button class="icon primary" data-act="addEx" aria-label="Додати вправу" style="min-height:56px;width:56px;border-radius:16px">${ic('add', '+')}</button></div></div>` +
    cardioCard(s);
}

// ---------- екрани ----------
function vWorkout() {
  const s = S.active;
  if (s) {
    return `<div class="sess-head"><h2>${esc(s.dayName)}</h2><span class="mut">${fmtDateLong(s.start)}</span></div>
      <div id="sess">${sessionEditor(s, true)}</div>
      <button class="fab inline big" data-act="finish">${ic('flag', '🏁')}Завершити тренування</button>
      <div style="height:8px"></div><button class="big danger" data-act="cancel">${ic('close')}Скасувати без збереження</button>`;
  }
  ui.day ||= todayDay();
  const d = dayById(ui.day) || S.program[0];
  if (!d) return vOnboard();
  return `<div class="days">${S.program.map(x => `<button class="${x.id === d.id ? 'on' : ''}" data-act="pickDay" data-id="${x.id}">${esc(x.short)}</button>`).join('')}</div>
    <h2>${esc(d.short)} · ${esc(d.name)}</h2>
    <div class="card">${d.exercises.map((ex, i) => { const l = lastFor(ex), [ga] = ssRange(d.exercises, i);
      return `${ex.ss && ga === i ? `<div class="sslbl mini">${ic('link', '🔗')}Суперсет</div>` : ''}<div class="preview-row${ex.ss ? ' ssp' : ''}"><span>${esc(ex.name)}${ex.pair ? ' <span class="x2">×2</span>' : ''}</span><span class="tgt">${ex.sets}×${esc(ex.reps)}${l ? ' · ' + esc(setStr(l.sets[0], ex.type)) : ''}</span></div>`; }).join('')}
      ${d.cardio ? `<div class="tgt" style="margin-top:8px">Кардіо: ${esc(d.cardio)}</div>` : ''}</div>
    <button class="fab" data-act="start">${ic('play_arrow', '▶')}Почати тренування</button>`;
}
function vHistory() {
  if (ui.view) {
    const s = S.sessions.find(x => x.id === ui.view);
    if (s) return `<button class="text" data-act="back" style="margin-top:8px;margin-left:-8px">${ic('arrow_back', '←')}Назад</button>
      <h2>${esc(s.dayName)}</h2><div class="mut">${fmtDateLong(s.start)} · ${fmtDur(s.duration || 0)} · ${(sessionVolume(s) / 1000).toFixed(2)} т</div>
      <div class="card row" style="margin-top:12px;flex-wrap:nowrap"><label style="white-space:nowrap">Тривалість, хв</label>
        <input type="number" data-act-input="dur" value="${Math.round((s.duration || 0) / 60)}"></div>
      <div id="sess">${sessionEditor(s, false)}</div>
      <button class="big danger" data-act="delSession">${ic('delete')}Видалити тренування</button>`;
    ui.view = null;
  }
  if (!S.sessions.length) return '<h2>Історія</h2><p class="mut">Тут з’являться завершені тренування.</p>';
  return '<h2>Історія</h2>' + S.sessions.slice().reverse().map(s => {
    const sets = s.exercises.reduce((a, e) => a + e.sets.filter(t => t.done).length, 0);
    return `<button class="list-item" data-act="open" data-id="${s.id}"><div class="row between" style="flex-wrap:nowrap"><b>${esc(s.dayName)}</b><span class="mut" style="white-space:nowrap">${fmtDate(s.start)}</span></div>
      <div class="mut">${fmtDur(s.duration || 0)} · ${sets} підх. · ${(sessionVolume(s) / 1000).toFixed(2)} т${s.cardio && s.cardio.min ? ' · кардіо ' + s.cardio.min + ' хв' : ''}</div>${fbSummary(s) ? `<div class="mut small">${esc(fbSummary(s))}</div>` : ''}</button>`;
  }).join('');
}

function exerciseSeries(name) {
  const pts = [];
  for (const s of S.sessions) for (const e of s.exercises) {
    if (e.name.trim().toLowerCase() !== name) continue;
    let best = null, rm = null;
    for (const t of e.sets) if (t.done && t.w != null) {
      if (best == null || t.w > best.w) best = t;
      if (t.r) { const v = e1rm(t.w, t.r); if (rm == null || v > rm) rm = v; }
    }
    if (best) pts.push({t: s.start, w: best.w, r: best.r, rm: rm != null ? Math.round(rm * 10) / 10 : null, type: e.type});
  }
  return pts;
}
function lineChart(pts) {
  const W = 340, H = 180, P = 28;
  const vals = pts.flatMap(p => [p.w, p.rm]).filter(v => v != null);
  let lo = Math.min(...vals), hi = Math.max(...vals); if (lo === hi) { lo -= 5; hi += 5; }
  const x = i => P + (pts.length === 1 ? (W - 2 * P) / 2 : i * (W - P - 10) / (pts.length - 1));
  const y = v => H - 20 - (v - lo) / (hi - lo) * (H - 40);
  const line = (k, c) => { const p = pts.map((q, i) => q[k] != null ? [x(i), y(q[k])] : null).filter(Boolean);
    return `<polyline fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${p.map(a => a.join(',')).join(' ')}"/>` + p.map(a => `<circle cx="${a[0]}" cy="${a[1]}" r="4.5" fill="${c}" stroke="var(--sc-low)" stroke-width="2"/>`).join(''); };
  const grid = [lo, (lo + hi) / 2, hi].map(v => `<line x1="${P}" x2="${W - 6}" y1="${y(v)}" y2="${y(v)}" stroke="currentColor" opacity=".12"/><text x="2" y="${y(v) + 3}">${Math.round(v)}</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Графік прогресу">${grid}${line('rm', 'var(--tertiary)')}${line('w', 'var(--primary)')}
    <text x="${P}" y="${H - 4}">${fmtDate(pts[0].t)}</text><text x="${W - 6}" y="${H - 4}" text-anchor="end">${fmtDate(pts[pts.length - 1].t)}</text></svg>`;
}
function weekStart(t) { const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d.getTime(); }
function weeklyChart() {
  const now = weekStart(Date.now()), weeks = [];
  for (let i = 7; i >= 0; i--) { const d = new Date(now); d.setDate(d.getDate() - 7 * i); weeks.push({t: d.getTime(), v: 0, n: 0, c: 0}); }
  for (const s of S.sessions) { const w = weeks.find(k => k.t === weekStart(s.start)); if (w) { w.v += sessionVolume(s); w.n++; w.c += num(s.cardio?.min) || 0; } }
  const W = 340, H = 150, max = Math.max(1, ...weeks.map(w => w.v)), bw = (W - 10) / 8;
  const bars = weeks.map((w, i) => { const h = w.v / max * (H - 40);
    return `<rect x="${5 + i * bw + 4}" y="${H - 20 - h}" width="${bw - 8}" height="${h}" rx="10" fill="${i === 7 ? 'var(--primary)' : 'var(--primary-container)'}"/>
      <text x="${5 + i * bw + bw / 2}" y="${H - 24 - h}" text-anchor="middle">${w.v ? (w.v / 1000).toFixed(1) : ''}</text>
      <text x="${5 + i * bw + bw / 2}" y="${H - 6}" text-anchor="middle">${new Date(w.t).toLocaleDateString('uk-UA', {day: '2-digit', month: '2-digit'})}</text>`; }).join('');
  const cur = weeks[7];
  return `<div class="card"><h3>Об'єм по тижнях (тонни)</h3><svg viewBox="0 0 ${W} ${H}">${bars}</svg>
    <div class="stats" style="margin-top:6px"><div><b>${cur.n}</b><span class="mut small">тренувань цього тижня</span></div>
    <div><b>${(cur.v / 1000).toFixed(1)} т</b><span class="mut small">об'єм</span></div><div><b>${Math.round(cur.c)}</b><span class="mut small">хв кардіо</span></div></div></div>`;
}
function vProgress() {
  const names = [...new Set(S.sessions.flatMap(s => s.exercises.filter(e => e.sets.some(t => t.done && t.w != null)).map(e => e.name.trim())))];
  let html = '<h2>Прогрес</h2>' + weeklyChart();
  if (!names.length) return html + '<p class="mut">Завершіть кілька тренувань, щоб побачити графіки по вправах.</p>';
  if (!ui.progEx || !names.some(n => n.toLowerCase() === ui.progEx)) ui.progEx = names[0].toLowerCase();
  const pts = exerciseSeries(ui.progEx), type = pts[0]?.type || 'reps';
  html += `<div class="card"><select data-act-input="progEx">${names.map(n => `<option value="${esc(n.toLowerCase())}" ${n.toLowerCase() === ui.progEx ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>`;
  if (pts.length) {
    const bw = pts.reduce((a, p) => p.w > a.w ? p : a), br = pts.filter(p => p.rm != null).reduce((a, p) => !a || p.rm > a.rm ? p : a, null);
    html += `<div class="legend" style="margin:8px 0"><span><i style="background:var(--primary)"></i>Найкращий підхід, ${TYPES[type].a}</span>${type === 'reps' ? '<span><i style="background:var(--tertiary)"></i>Оцінка 1ПМ (Еплі)</span>' : ''}</div>
      ${lineChart(type === 'reps' ? pts : pts.map(p => ({...p, rm: null})))}
      <h3 style="margin-top:10px">Рекорди</h3><table>
      <tr><td>Макс. вага</td><td><b>${bw.w} ${TYPES[type].a}</b> × ${bw.r ?? '–'}</td><td class="mut">${fmtDate(bw.t)}</td></tr>
      ${br && type === 'reps' ? `<tr><td>Оцінка 1ПМ</td><td><b>${br.rm} кг</b></td><td class="mut">${fmtDate(br.t)}</td></tr>` : ''}
      <tr><td>Тренувань</td><td><b>${pts.length}</b></td><td></td></tr></table>`;
  }
  return html + '</div>' + vRecords();
}
function vRecords() {
  const rows = [];
  for (const s of S.sessions) for (const e of s.exercises) if ((e.type || 'reps') === 'reps') for (const t of e.sets) if (t.done && t.w && t.r) {
    const k = e.name.trim().toLowerCase(), v = e1rm(t.w, t.r), r = rows.find(x => x.k === k);
    if (!r) rows.push({k, n: e.name, v, t, d: s.start}); else if (v > r.v) Object.assign(r, {v, t, d: s.start});
  }
  if (!rows.length) return '';
  return `<div class="card"><h3>Особисті рекорди (за 1ПМ)</h3><table><tr><th>Вправа</th><th>Підхід</th><th>1ПМ</th></tr>
    ${rows.map(r => `<tr><td>${esc(r.n)}</td><td>${r.t.w}×${r.t.r}</td><td><b>${Math.round(r.v)}</b></td></tr>`).join('')}</table></div>`;
}
function vProgram() {
  ui.editDay ||= S.program[0]?.id;
  const d = dayById(ui.editDay);
  let h = `<h2>Програма</h2><div class="days">${S.program.map(x => `<button class="${d && x.id === d.id ? 'on' : ''}" data-act="editDay" data-id="${x.id}">${esc(x.short)}</button>`).join('')}<button data-act="addDay">${ic('add', '+')}день</button></div>`;
  if (d) h += `<div class="card" data-day="${d.id}">
    <div class="pe" style="border:0;margin:0;padding:0"><div class="g" style="grid-template-columns:70px 1fr 90px">
      <div><label>Коротко</label><input data-d="short" value="${esc(d.short)}"></div>
      <div><label>Назва дня</label><input data-d="name" value="${esc(d.name)}"></div>
      <div><label>День тижня</label><select data-d="wd">${['—', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'].map((n, i) => `<option value="${i === 7 ? 0 : i === 0 ? -1 : i}" ${d.wd === (i === 7 ? 0 : i === 0 ? -1 : i) ? 'selected' : ''}>${n}</option>`).join('')}</select></div></div>
      <div><label>Кардіо (ціль)</label><input data-d="cardio" value="${esc(d.cardio)}"></div></div>
    ${d.exercises.map((ex, i) => `<div class="pe${ex.ss ? ' ssp' : ''}${linkedNext(d.exercises, i) ? ' ssj' : ''}" data-xi="${i}">
      ${ex.ss && ssRange(d.exercises, i)[0] === i ? `<div class="sslbl mini">${ic('link', '🔗')}Суперсет · відпочинок після кола ${ssRest(d.exercises, i)}с</div>` : ''}
      <div class="row" style="flex-wrap:nowrap"><input data-x="name" value="${esc(ex.name)}">
        <button class="icon" data-act="exUp" aria-label="Вгору">${ic('arrow_upward', '↑')}</button><button class="icon danger" data-act="exDel" aria-label="Видалити">${ic('close', '✕')}</button></div>
      <div class="g" style="grid-template-columns:1fr 1fr 1fr 1.4fr"><div><label>Підходи</label><input type="number" data-x="sets" value="${ex.sets}"></div>
        <div><label>Повтори</label><input data-x="reps" value="${esc(ex.reps)}"></div>
        <div><label>Відпоч., с</label><input type="number" data-x="rest" value="${ex.rest}"></div>
        <div><label>Тип</label><select data-x="type">${Object.entries(TYPES).map(([k, t]) => `<option value="${k}" ${ex.type === k ? 'selected' : ''}>${t.name}</option>`).join('')}</select></div></div>
      <div class="chips">${(ex.type || 'reps') === 'reps' ? `<button class="chip${ex.pair ? ' on' : ''}" data-act="exPair" aria-pressed="${!!ex.pair}">${ex.pair ? '✓ ' : ''}×2 гантелі</button>` : ''}${ssBtn(d.exercises, i).replace('data-act="ssLink"', 'data-act="exLink"').replace('data-act="ssUnlink"', 'data-act="exUnlink"')}</div></div>`).join('')}
    <div class="row" style="margin-top:10px"><button data-act="exAdd">${ic('add', '+')}вправа</button><button class="danger" data-act="dayDel">${ic('delete')}Видалити день</button></div></div>`;
  return h + accountCard() + syncCard() + fitbitCard() + `<h2>Файл</h2><div class="card"><div class="row"><button data-act="export">${ic('download', '⬇')}Експорт JSON</button><button class="outlined" data-act="import">${ic('upload', '⬆')}Імпорт JSON</button></div>
    <p class="mut small">Дані зберігаються на цьому телефоні (окремо для кожного акаунта) і в резервній копії на твоєму Google Диску.</p>
    <button class="danger" data-act="resetProg" style="padding-left:8px">${ic('restart_alt')}Взяти зразок 5-денної програми</button></div>`;
}

function render() {
  const y = scrollY;
  document.body.classList.toggle('gate', !USER);
  if (!USER) { $('#view').innerHTML = vGate(); tick(); scrollTo(0, 0); if (navigator.onLine !== false) loadGis().catch(() => {}); return; }
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === ui.tab));
  const v = $('#view'); v.innerHTML = ({workout: vWorkout, history: vHistory, progress: vProgress, program: vProgram})[ui.tab]();
  if (!ui.keepScroll) { v.classList.remove('enter'); void v.offsetWidth; v.classList.add('enter'); }
  scrollTo(0, ui.keepScroll ? y : 0); ui.keepScroll = false;
  tick();
  if (navigator.onLine !== false && (D.on || M.health || document.querySelector('[data-act=fitbit],[data-act=sync],[data-act=fbConnect]'))) loadGis().catch(() => {});
}
const rerender = () => { ui.keepScroll = true; render(); };
const curSession = () => ui.tab === 'workout' ? S.active : S.sessions.find(x => x.id === ui.view);

// ---------- події ----------
document.addEventListener('click', ev => {
  const tab = ev.target.closest('[data-tab]');
  if (ev.target.closest('#awakeBtn')) { S.awake = !awakeOn(); save(); awakeBtn(); awakeOn() ? lockWake() : releaseWake(); return; }
  if (!USER && !ev.target.closest('[data-act=signIn]')) return;
  if (tab) { ui.tab = tab.dataset.tab; ui.view = null; render(); return; }
  const b = ev.target.closest('[data-act]'); if (!b || b.tagName === 'SELECT' || b.tagName === 'INPUT') return;
  const act = b.dataset.act, card = b.closest('[data-ei]'), s = curSession();
  const e = card && s ? s.exercises[+card.dataset.ei] : null;
  const A = {
    pickDay() { ui.day = b.dataset.id; render(); },
    start() { const d = dayById(ui.day); if (!d) return; unlockAudio(); S.active = newSession(d); ui.ssNext = null; save(); lockWake(); render(); },
    done() {
      unlockAudio();
      const row = b.closest('[data-si]'), t = e.sets[+row.dataset.si];
      if (!t.done) {
        if (e.type === 'min') { if (t.w == null) t.w = firstNum(e.targetReps); }
        else if (t.r == null) t.r = firstNum(e.targetReps);
        t.done = true; save();
        if (ui.tab === 'workout') afterSetDone(s, +card.dataset.ei, +row.dataset.si);
      } else { t.done = false; save(); }
      rerender();
      if (ui.ssNext && ui.ssNext.scroll) { ui.ssNext.scroll = false;
        const el = document.querySelector(`[data-ei="${ui.ssNext.ei}"] [data-si="${ui.ssNext.si}"]`);
        el && el.scrollIntoView({block: 'center', behavior: reduceMotion.matches ? 'auto' : 'smooth'}); }
    },
    pair() { e.pair = !e.pair; if (s.end) s.volume = sessionVolume(s); save(); rerender(); },
    ssLink() { ssLink(s.exercises, +card.dataset.ei); save(); rerender(); },
    ssUnlink() { ssUnlink(s.exercises, +card.dataset.ei); save(); rerender(); },
    exPair() { const ex = dayById(ui.editDay).exercises[+b.closest('[data-xi]').dataset.xi]; ex.pair = !ex.pair; save(); rerender(); },
    exLink() { ssLink(dayById(ui.editDay).exercises, +b.closest('[data-xi]').dataset.xi); save(); rerender(); },
    exUnlink() { ssUnlink(dayById(ui.editDay).exercises, +b.closest('[data-xi]').dataset.xi); save(); rerender(); },
    addSet() { const p = e.sets[e.sets.length - 1]; e.sets.push({w: p ? p.w : null, r: p ? p.r : null, done: false}); save(); rerender(); },
    delSet() { e.sets.pop(); save(); rerender(); },
    delEx() { if (confirm('Видалити вправу з цього тренування?')) { s.exercises.splice(+card.dataset.ei, 1); normSS(s.exercises); ui.ssNext = null; save(); rerender(); } },
    addEx() { const n = $('#newExName').value.trim(); if (!n) return;
      const x = {exId: null, name: n}, l = lastFor(x, s.id);
      s.exercises.push({exId: null, name: n, type: 'reps', target: '', targetReps: '', rest: 90, pair: l && l.pair !== undefined ? !!l.pair : autoPair(n), notes: '', sets: [{w: null, r: null, done: false}]}); save(); rerender(); },
    finish() {
      const n = S.active.exercises.reduce((a, x) => a + x.sets.filter(t => t.done).length, 0);
      if (!n && !S.active.cardio.min && !confirm('Жодного виконаного підходу. Все одно завершити?')) return;
      finishSession();
    },
    cancel() { if (confirm('Скасувати тренування? Дані цієї сесії буде втрачено.')) { S.active = null; S.rest = null; ui.ssNext = null; save(); render(); } },
    restAdd() { if (S.rest) { S.rest.endAt = Math.max(Date.now(), S.rest.endAt) + (+b.dataset.v) * 1000; S.rest.dur = Math.max(S.rest.dur || 0, (S.rest.endAt - Date.now()) / 1000); restAlerted = false; save(); tick(); } },
    restSkip() { S.rest = null; save(); tick(); },
    open() { ui.view = b.dataset.id; render(); },
    back() { ui.view = null; render(); },
    delSession() { if (confirm('Видалити це тренування назавжди?')) { S.sessions = S.sessions.filter(x => x.id !== ui.view); ui.view = null; save(); render(); } },
    editDay() { ui.editDay = b.dataset.id; render(); },
    addDay() { const d = {id: uid(), wd: -1, short: 'Д' + (S.program.length + 1), name: 'Новий день', cardio: '', exercises: []}; S.program.push(d); ui.editDay = d.id; save(); render(); },
    dayDel() { if (confirm('Видалити цей день з програми? Історія залишиться.')) { S.program = S.program.filter(x => x.id !== ui.editDay); ui.editDay = null; ui.day = null; save(); render(); } },
    exAdd() { dayById(ui.editDay).exercises.push(E('Нова вправа', 3, '10', 60)); save(); rerender(); },
    exDel() { const d = dayById(ui.editDay), i = +b.closest('[data-xi]').dataset.xi; if (confirm(`Видалити «${d.exercises[i].name}»?`)) { d.exercises.splice(i, 1); normSS(d.exercises); save(); rerender(); } },
    exUp() { const d = dayById(ui.editDay), i = +b.closest('[data-xi]').dataset.xi; if (i > 0) { [d.exercises[i - 1], d.exercises[i]] = [d.exercises[i], d.exercises[i - 1]]; normSS(d.exercises); save(); rerender(); } },
    export() {
      const blob = new Blob([JSON.stringify({app: 'sportik', version: SCHEMA, exported: new Date().toISOString(), program: S.program, sessions: S.sessions}, null, 1)], {type: 'application/json'});
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `sportik-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    },
    import() { $('#importFile').click(); },
    fitbit() { if (s && s.end) fbRun(s, {interactive: true, btn: b}); },
    signIn() { signIn(!!$('#gateHealth')?.checked); },
    signOut() { signOut(); },
    obCreate() { const d = {id: uid(), wd: new Date().getDay(), short: 'Д1', name: 'Мій день', cardio: '', exercises: []}; S.program.push(d); S.setup = true; ui.tab = 'program'; ui.editDay = d.id; save(); render(); scheduleSync(); },
    obSample() { S.program = defaultProgram(); S.setup = true; ui.day = null; save(); render(); scheduleSync(); toast('Зразок програми додано — змінюй його у вкладці «Програма».'); },
    fbConnect() { const p = tokenFor(['health'], true); b.disabled = true;
      p.then(() => { M.health = true; saveM(); rerender(); toast('Fitbit підключено. Після «Завершити тренування» кардіо й силове підтягнуться самі.'); retryFitbit(true); },
        e => { b.disabled = false; toast(e.code === 'denied' ? FB_ERR.denied : FB_ERR[e.code] || gateMsg(e), true); }); },
    fbDisconnect() { M.health = false; saveM(); rerender(); },
    sync() { syncDrive(true); syncUi(); },
    syncLogin() { $('#toast').hidden = true; syncDrive(true); },
    syncToggle() { if (D.on) { D.on = false; D.pending = false; D.err = ''; clearTimeout(drTimer); saveD(); rerender(); } else syncDrive(true).then(() => rerender()); syncUi(); },
    resetProg() { if (confirm('Замінити програму на стандартну? Історія залишиться.')) { S.program = defaultProgram(); ui.editDay = null; ui.day = null; save(); render(); } },
  };
  A[act]?.();
  if (A[act] && !NO_SYNC.has(act) && (ui.tab === 'program' || (ui.tab === 'history' && act !== 'open' && act !== 'back'))) scheduleSync();
});
const NO_SYNC = new Set(['open', 'back', 'editDay', 'export', 'import', 'pickDay', 'sync', 'syncLogin', 'syncToggle', 'restAdd', 'restSkip', 'fitbit', 'start', 'finish', 'cancel', 'signIn', 'signOut', 'fbConnect', 'fbDisconnect', 'obCreate']);

// Введення значень: зберігаємо без перерендеру, щоб не збивати фокус.
document.addEventListener('input', ev => {
  const el = ev.target, s = curSession();
  if (el.dataset.f && s) {
    const e = s.exercises[+el.closest('[data-ei]').dataset.ei];
    if (el.dataset.f === 'notes') e.notes = el.value;
    else { e.sets[+el.closest('[data-si]').dataset.si][el.dataset.f] = el.value === '' ? null : num(el.value); }
  } else if (el.dataset.c && s) {
    s.cardio[el.dataset.c] = el.dataset.c === 'note' ? el.value : (el.value === '' ? '' : num(el.value));
  } else if (el.dataset.actInput === 'dur' && s) {
    s.duration = (num(el.value) || 0) * 60;
  } else if (el.dataset.d) {
    const d = dayById(ui.editDay); d[el.dataset.d] = el.dataset.d === 'wd' ? +el.value : el.value;
    if (el.dataset.d === 'short') document.querySelector(`.days [data-id="${d.id}"]`).textContent = el.value;
  } else if (el.dataset.x) {
    const ex = dayById(ui.editDay).exercises[+el.closest('[data-xi]').dataset.xi], k = el.dataset.x;
    ex[k] = (k === 'sets' || k === 'rest') ? Math.max(0, Math.round(num(el.value) || 0)) : el.value;
  } else if (el.dataset.actInput === 'progEx') { ui.progEx = el.value; rerender(); return; }
  else return;
  if (s && s.end) s.volume = sessionVolume(s);
  save();
  if ((s && s.end) || el.dataset.d || el.dataset.x) scheduleSync();
});

$('#importFile').addEventListener('change', async ev => {
  const f = ev.target.files[0]; if (!f) return;
  try {
    const d = JSON.parse(await f.text());
    if (!Array.isArray(d.program) || !Array.isArray(d.sessions)) throw new Error('format');
    if (!confirm(`Імпортувати ${d.sessions.length} тренувань і програму з ${d.program.length} днів? Поточні дані буде замінено.`)) return;
    migrate({v: d.version || 1, program: d.program});
    S.program = d.program; S.sessions = d.sessions.sort((a, b) => a.start - b.start); save(); ui = {tab: 'history'}; render();
    toast('Імпорт виконано'); scheduleSync();
  } catch (e) { toast('Не вдалося прочитати файл: це не резервна копія Спортіка.', true); }
  ev.target.value = '';
});

// ---------- Material: іконки, app bar, ripple ----------
if (document.fonts && document.fonts.load) document.fonts.load('24px "Material Symbols Rounded"', 'home')
  .then(f => { if (f && f.length) document.documentElement.classList.add('msok'); }).catch(() => {});
addEventListener('scroll', () => $('#top').classList.toggle('scrolled', scrollY > 4), {passive: true});
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
document.addEventListener('pointerdown', ev => {
  const b = ev.target.closest('button'); if (!b || reduceMotion.matches || b.closest('#tabs')) return;
  const r = b.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2.2, sp = document.createElement('span');
  sp.className = 'ripple'; sp.style.cssText = `width:${d}px;height:${d}px;left:${ev.clientX - r.left - d / 2}px;top:${ev.clientY - r.top - d / 2}px`;
  b.appendChild(sp); setTimeout(() => sp.remove(), 600);
}, {passive: true});

if (USER) { try { M = JSON.parse(localStorage.getItem(ACCT + USER.email)) || {}; } catch (e) { M = {}; }
  try { D = JSON.parse(localStorage.getItem(DRV + USER.email)) || {on: true}; } catch (e) { D = {on: true}; } }
render(); awakeBtn(); lockWake();
// Відкладена синхронізація: якщо токен ще живий — одразу, інакше пропонуємо увійти (вікно Google — лише після натискання).
if (USER && D.on && D.pending) { if (drSaved()) syncDrive(false); else setTimeout(() => { if (D.pending && !drBusy && !drSaved()) snack('Зміни ще не на Google Drive: увійди для синхронізації.', 'Увійти'); }, 600); }
retryFitbit(true);
addEventListener('online', () => { if (D.on && D.pending && drSaved()) syncDrive(false); retryFitbit(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) retryFitbit(); });
setInterval(() => retryFitbit(), 120000);
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('service-worker.js').catch(() => {});
