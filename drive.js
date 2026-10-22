/* Спортік — синхронізація з Google Drive (файл sportik-data.json). Працює в браузері й у Node (для тестів). */
(function (root) {
  'use strict';
  const NAME = 'sportik-data.json';
  const API = 'https://www.googleapis.com/drive/v3/files';
  const UP = 'https://www.googleapis.com/upload/drive/v3/files';
  class DriveError extends Error { constructor(code, msg) { super(msg || code); this.code = code; } }

  async function call(fetchFn, url, token, opt) {
    let r;
    try { r = await fetchFn(url, Object.assign({}, opt, {headers: Object.assign({Authorization: 'Bearer ' + token}, (opt && opt.headers) || {})})); }
    catch (e) { throw new DriveError('network'); }
    if (r.ok) return r.json();
    let body = ''; try { body = await r.text(); } catch (e) {}
    if (r.status === 401) throw new DriveError('expired');
    if (r.status === 404) throw new DriveError('notfound');
    if (r.status === 403) {
      if (/accessNotConfigured|SERVICE_DISABLED|has not been used|is disabled/i.test(body)) {
        const m = /project[= ](\d+)/i.exec(body);
        throw new DriveError('disabled', m ? m[1] : '');
      }
      if (/insufficient|SCOPE/i.test(body)) throw new DriveError('scope');
      throw new DriveError('forbidden');
    }
    throw new DriveError('http', 'HTTP ' + r.status);
  }
  async function find(token, fetchFn) {
    const q = `name='${NAME}' and trashed=false`;
    const j = await call(fetchFn, `${API}?spaces=drive&orderBy=modifiedTime desc&pageSize=10&fields=files(id,name,modifiedTime)&q=${encodeURIComponent(q)}`, token);
    return (j.files && j.files[0] && j.files[0].id) || null;
  }
  // Остання копія користувача: {id, modifiedTime} або null.
  async function findMeta(token, fetchFn) {
    fetchFn = fetchFn || root.fetch.bind(root);
    const q = `name='${NAME}' and trashed=false`;
    const j = await call(fetchFn, `${API}?spaces=drive&orderBy=modifiedTime desc&pageSize=10&fields=files(id,name,modifiedTime)&q=${encodeURIComponent(q)}`, token);
    return (j.files && j.files[0]) || null;
  }
  async function download(token, id, fetchFn) {
    fetchFn = fetchFn || root.fetch.bind(root);
    return call(fetchFn, `${API}/${encodeURIComponent(id)}?alt=media`, token);
  }
  async function create(token, text, fetchFn) {
    const b = 'sportik' + Math.random().toString(36).slice(2);
    const meta = JSON.stringify({name: NAME, mimeType: 'application/json', description: 'Спортік: програма та тренування (автосинхронізація)'});
    const body = `--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${text}\r\n--${b}--`;
    const j = await call(fetchFn, `${UP}?uploadType=multipart&fields=id`, token, {method: 'POST', headers: {'Content-Type': 'multipart/related; boundary=' + b}, body});
    return j.id;
  }
  async function update(token, id, text, fetchFn) {
    const j = await call(fetchFn, `${UP}/${encodeURIComponent(id)}?uploadType=media&fields=id,trashed`, token, {method: 'PATCH', headers: {'Content-Type': 'application/json; charset=UTF-8'}, body: text});
    if (j.trashed) throw new DriveError('notfound'); // файл у кошику — створимо новий
    return j.id || id;
  }
  // Записує payload у sportik-data.json. Повертає fileId (зберегти й передавати наступного разу).
  // opts.fresh — завжди новий файл (стару копію на Диску не чіпаємо).
  async function upload(token, payload, fileId, fetchFn, opts) {
    fetchFn = fetchFn || root.fetch.bind(root);
    const text = JSON.stringify(payload, null, 1);
    if (opts && opts.fresh) return create(token, text, fetchFn);
    if (fileId) {
      try { return await update(token, fileId, text, fetchFn); }
      catch (e) { if (e.code !== 'notfound') throw e; }
    }
    const found = await find(token, fetchFn);
    if (found && found !== fileId) return update(token, found, text, fetchFn);
    return create(token, text, fetchFn);
  }
  const api = {upload, find, findMeta, download, NAME, DriveError};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.DriveSync = api;
})(typeof self !== 'undefined' ? self : globalThis);
