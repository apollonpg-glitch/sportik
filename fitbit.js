/* Спортік — імпорт тренувань з Google Health (Fitbit). Працює в браузері й у Node (для тестів). */
(function (root) {
  'use strict';
  const API = 'https://health.googleapis.com/v4/users/me/dataTypes/';
  const MIN = 60000;
  const CARDIO_RE = /TREADMILL|RUNNING|RUN|JOG|ELLIPTICAL|BIK|CYCL|SPIN|WALK|ROW|STAIR|HIIT|INTERVAL/;
  const NAMES = {TREADMILL: 'Доріжка', RUNNING: 'Біг', ELLIPTICAL: 'Еліпс', WALKING: 'Ходьба', STRENGTH_TRAINING: 'Силове'};
  const typeName = t => NAMES[t] || (/BIK|CYCL|SPIN/.test(t) ? 'Вело' : t.toLowerCase().replace(/_/g, ' '));

  class FitbitError extends Error { constructor(code, msg) { super(msg || code); this.code = code; } }

  const pad = n => String(n).padStart(2, '0');
  // Локальна (цивільна) дата пристрою у форматі, який розуміє фільтр Google Health.
  const civil = ms => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T00:00:00`; };
  const dayAfter = ms => { const d = new Date(ms); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + 1); return d.getTime(); };
  const secs = v => parseFloat(String(v || 0)) || 0;

  async function getJson(url, token, fetchFn) {
    let r;
    try { r = await fetchFn(url, {headers: {Authorization: 'Bearer ' + token}}); }
    catch (e) { throw new FitbitError('network'); }
    if (r.status === 401) throw new FitbitError('expired');
    if (r.status === 403) {
      let why = '';
      try { const j = await r.json(), e = j.error || {}; why = ((e.details || []).find(d => d.reason) || {}).reason || e.status || ''; why = [why, e.message].filter(Boolean).join(': '); } catch (e) {}
      throw new FitbitError('forbidden', why);
    }
    if (!r.ok) throw new FitbitError('http', 'HTTP ' + r.status);
    return r.json();
  }
  async function listAll(type, filter, token, fetchFn, pageSize, maxPages) {
    const out = []; let pt = '';
    for (let i = 0; i < (maxPages || 20); i++) {
      const url = `${API}${type}/dataPoints?pageSize=${pageSize}&filter=${encodeURIComponent(filter)}${pt ? '&pageToken=' + encodeURIComponent(pt) : ''}`;
      const j = await getJson(url, token, fetchFn);
      out.push(...(j.dataPoints || []));
      pt = j.nextPageToken; if (!pt) break;
    }
    return out;
  }
  // Усі тренування з дня(ів), що покривають вікно [from, to].
  function fetchExercises(token, from, to, fetchFn) {
    const f = `exercise.interval.civil_start_time >= "${civil(from)}" AND exercise.interval.civil_start_time < "${civil(dayAfter(to))}"`;
    return listAll('exercise', f, token, fetchFn, 25, 20);
  }
  async function fetchMaxHr(token, start, end, fetchFn) {
    const f = `heart_rate.sample_time.physical_time >= "${new Date(start).toISOString()}" AND heart_rate.sample_time.physical_time < "${new Date(end).toISOString()}"`;
    const pts = await listAll('heart-rate', f, token, fetchFn, 1000, 6);
    let m = 0; for (const p of pts) { const v = +(p.heartRate && p.heartRate.beatsPerMinute); if (v > m) m = v; }
    return m || null;
  }

  function norm(p) {
    const e = p.exercise || {}, m = e.metricsSummary || {}, iv = e.interval || {};
    const start = Date.parse(iv.startTime), end = Date.parse(iv.endTime);
    return {id: p.name, type: e.exerciseType || 'OTHER', name: e.displayName || '', start, end,
      active: (p.dataSource || {}).recordingMethod === 'ACTIVELY_MEASURED',
      dur: secs(e.activeDuration) || (end - start) / 1000, hr: +m.averageHeartRateBeatsPerMinute || null,
      kcal: +m.caloriesKcal || 0, m: (+m.distanceMillimeters || 0) / 1000, steps: +m.steps || 0, azm: +m.activeZoneMinutes || 0};
  }
  // Лише увімкнені вручну тренування, що перетинаються з сесією ±30 хв (запасний варіант ±60 хв).
  function pick(points, sStart, sEnd) {
    const xs = points.map(norm).filter(x => x.active && isFinite(x.start) && isFinite(x.end));
    for (const pad of [30, 60]) {
      const a = sStart - pad * MIN, b = sEnd + pad * MIN;
      const hit = xs.filter(x => x.start < b && x.end > a);
      if (hit.length) return hit.sort((p, q) => p.start - q.start);
    }
    return [];
  }
  function agg(list) {
    if (!list.length) return null;
    const dur = list.reduce((a, x) => a + x.dur, 0);
    const hrw = list.filter(x => x.hr), hrDur = hrw.reduce((a, x) => a + x.dur, 0);
    const m = list.reduce((a, x) => a + x.m, 0);
    const r = {min: Math.round(dur / 60), hr: hrDur ? Math.round(hrw.reduce((a, x) => a + x.hr * x.dur, 0) / hrDur) : null,
      kcal: Math.round(list.reduce((a, x) => a + x.kcal, 0)), azm: list.reduce((a, x) => a + x.azm, 0),
      types: [...new Set(list.map(x => typeName(x.type)))], from: list[0].start, to: Math.max(...list.map(x => x.end)), maxHr: null};
    if (m > 0) { r.km = Math.round(m / 10) / 100; r.paceSecKm = Math.round(dur / (m / 1000)); }
    return r;
  }
  function summarize(sel) {
    const cardio = sel.filter(x => CARDIO_RE.test(x.type) && x.type !== 'STRENGTH_TRAINING');
    const strength = sel.filter(x => x.type === 'STRENGTH_TRAINING');
    return {cardio: agg(cardio), strength: agg(strength), cardioList: cardio, strengthList: strength};
  }
  const fmtPace = s => `${Math.floor(s / 60)}:${pad(s % 60)}/км`;
  function cardioNote(c) {
    const p = [c.types.join(' + ')];
    if (c.km) p.push(c.km.toFixed(2) + ' км');
    if (c.kcal) p.push(c.kcal + ' ккал');
    if (c.paceSecKm && c.paceSecKm < 3600) p.push('темп ' + fmtPace(c.paceSecKm));
    if (c.azm) p.push('АЗМ ' + c.azm);
    if (c.maxHr) p.push('макс. пульс ' + c.maxHr);
    return '⌚ з Fitbit: ' + p.join(', ');
  }
  async function maxOver(list, token, fetchFn) {
    let m = 0;
    for (const x of list) { try { const v = await fetchMaxHr(token, x.start, x.end, fetchFn); if (v > m) m = v; } catch (e) { if (e.code === 'expired') throw e; } }
    return m || null;
  }
  // Головна функція: повертає {cardio, strength} або кидає FitbitError('none').
  async function importFor(token, sStart, sEnd, fetchFn, opts) {
    fetchFn = fetchFn || root.fetch.bind(root);
    const pts = await fetchExercises(token, sStart - 60 * MIN, sEnd + 60 * MIN, fetchFn);
    const sum = summarize(pick(pts, sStart, sEnd));
    if (!sum.cardio && !sum.strength) throw new FitbitError('none');
    if (!(opts && opts.noMaxHr)) {
      if (sum.cardio) sum.cardio.maxHr = await maxOver(sum.cardioList, token, fetchFn);
      if (sum.strength) sum.strength.maxHr = await maxOver(sum.strengthList, token, fetchFn);
    }
    return {cardio: sum.cardio, strength: sum.strength, at: Date.now()};
  }
  const api = {importFor, pick, summarize, cardioNote, fetchExercises, fetchMaxHr, civil, FitbitError, fmtPace};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Fitbit = api;
})(typeof self !== 'undefined' ? self : globalThis);
