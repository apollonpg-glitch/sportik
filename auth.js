/* Спортік — вхід через Google (GIS token client, без секрету) і кеш токенів доступу.
   Токен живе ~1 год; оновлення без сервера неможливе, тому після спливу просимо новий
   з prompt '' + login_hint — Google віддає його без екрана згоди (вікно лише блимає).
   Працює в браузері й у Node (для тестів). */
(function (root) {
  'use strict';
  const SC = {
    openid: 'openid', email: 'email', profile: 'profile',
    drive: 'https://www.googleapis.com/auth/drive.file',
    health: 'https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly',
  };
  // Як Google повертає базові scope у відповіді.
  const ALIAS = {email: 'https://www.googleapis.com/auth/userinfo.email', profile: 'https://www.googleapis.com/auth/userinfo.profile'};
  const url = s => SC[s] || s;
  class AuthError extends Error { constructor(code, msg) { super(msg || code); this.code = code; } }
  const has = (granted, s) => { const g = ' ' + (granted || '') + ' ', u = url(s); return g.includes(' ' + u + ' ') || (ALIAS[s] && g.includes(' ' + ALIAS[s] + ' ')); };

  // o: {clientId, storage, now, oauth2(): google.accounts.oauth2|null, loadGis(): Promise}
  function create(o) {
    const now = o.now || (() => Date.now());
    const st = o.storage;
    const key = email => 'sportik.tok:' + String(email || '').toLowerCase();
    let client = null, waiter = null;
    function read(email) { if (!email) return null; try { return JSON.parse(st.getItem(key(email))); } catch (e) { return null; } }
    function write(email, r) {
      const t = {tok: r.access_token, exp: now() + (+r.expires_in || 3600) * 1000, scope: r.scope || ''};
      if (email) try { st.setItem(key(email), JSON.stringify(t)); } catch (e) {}
      return t;
    }
    // Дійсний (ще ≥1 хв) токен, що покриває всі потрібні scope.
    function cached(email, scopes) {
      const t = read(email);
      if (t && t.tok && t.exp > now() + 60000 && (scopes || []).every(s => has(t.scope, s))) return t.tok;
      return null;
    }
    const drop = email => { try { st.removeItem(key(email)); } catch (e) {} };
    // Сирий запит до Google. ВИКЛИКАТИ СИНХРОННО з обробника натискання (інакше браузер заблокує вікно).
    function request(scopes, opt) {
      opt = opt || {};
      return new Promise((res, rej) => {
        const go = () => {
          const g = o.oauth2();
          client ||= g.initTokenClient({client_id: o.clientId, scope: 'openid email profile', include_granted_scopes: true, prompt: '',
            callback: r => { const w = waiter; waiter = null; if (!w) return;
              if (!r || r.error) return w.rej(new AuthError(r && r.error === 'access_denied' ? 'denied' : 'auth', r && (r.error_description || r.error)));
              w.res(r); },
            error_callback: e => { const w = waiter; waiter = null;
              w && w.rej(new AuthError(e && e.type === 'popup_failed_to_open' ? 'popup' : e && e.type === 'popup_closed' ? 'closed' : 'auth')); }});
          if (waiter) waiter.rej(new AuthError('closed'));
          waiter = {res, rej};
          const req = {scope: scopes.map(url).join(' '), include_granted_scopes: true, prompt: opt.prompt ?? ''};
          if (opt.email) req.login_hint = opt.email;
          client.requestAccessToken(req);
        };
        if (o.oauth2()) go(); else o.loadGis().then(go, () => rej(new AuthError('gis')));
      });
    }
    // Токен для scopes: з кешу, а якщо немає — тихий запит (prompt '' + login_hint); interactive=false — лише кеш.
    async function token(email, scopes, opt) {
      opt = opt || {};
      const c = cached(email, scopes); if (c) return c;
      if (!opt.interactive) throw new AuthError('needauth');
      const r = await request(scopes, {email, prompt: opt.prompt});
      const t = write(email, r);
      const g = o.oauth2();
      const ok = g && g.hasGrantedAllScopes ? g.hasGrantedAllScopes(r, ...scopes.map(url)) : scopes.every(s => has(t.scope, s));
      if (!ok) throw new AuthError('denied');
      return t.tok;
    }
    return {token, request, write, read, cached, drop, granted: (email, s) => { const t = read(email); return !!(t && has(t.scope, s)); }};
  }
  async function userinfo(tok, fetchFn) {
    fetchFn = fetchFn || root.fetch.bind(root);
    let r; try { r = await fetchFn('https://www.googleapis.com/oauth2/v3/userinfo', {headers: {Authorization: 'Bearer ' + tok}}); }
    catch (e) { throw new AuthError('network'); }
    if (!r.ok) throw new AuthError(r.status === 401 ? 'expired' : 'auth', 'HTTP ' + r.status);
    const j = await r.json();
    if (!j.email) throw new AuthError('noemail');
    return {email: String(j.email).toLowerCase(), name: j.name || j.given_name || '', picture: j.picture || ''};
  }
  const api = {create, userinfo, has, SC, AuthError};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Auth = api;
})(typeof self !== 'undefined' ? self : globalThis);
