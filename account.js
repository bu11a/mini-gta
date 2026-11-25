// Хранилище прогресса: гостевой режим (localStorage) или аккаунт на сервере.
(function () {
  const LOCAL_KEY = 'nulpol1';
  const SEEN_KEY = 'nulpol_seen';
  const NICK_KEY = 'nulpol_nick';
  const MISSION_IDS = ['prologue', 'courier', 'trap', 'rys', 'final', 'endless'];
  const UPG = ['engine', 'armor', 'nitro', 'tires'];
  const LOGIN_RE = /^[A-Za-zА-Яа-яЁё0-9_-]{3,20}$/;
  const NICK_RE = /^[\p{L}\p{N}_.\- ]{2,24}$/u;
  const $ = s => document.querySelector(s);

  const blank = () => ({ money: 0, up: { engine: 0, armor: 0, nitro: 0, tires: 0 }, done: {}, best: 0 });
  const int = (v, lo, hi) => { v = Math.floor(Number(v)); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo; };
  const cleanNick = s => String(s || '').replace(/\s+/g, ' ').trim();
  function norm(s) {
    const out = blank();
    if (!s || typeof s !== 'object') return out;
    out.money = int(s.money, 0, 10000000);
    out.best = int(s.best, 0, 10000000);
    for (const k of UPG) out.up[k] = int(s.up && s.up[k], 0, 3);
    for (const id of MISSION_IDS) if (s.done && s.done[id]) out.done[id] = true;
    return out;
  }
  function readLocal() { try { return norm(JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null')); } catch (e) { return blank(); } }
  function writeLocal(s) { try { localStorage.setItem(LOCAL_KEY, JSON.stringify(s)); } catch (e) {} }
  function flag(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } return null; }
  const guestNick = () => flag(NICK_KEY) || '';

  let data = readLocal();
  let mode = 'guest';          // 'guest' | 'account'
  let user = null;             // {username, nickname}
  let online = false;          // сервер доступен
  let pushTimer = null, pushing = false, pushAgain = false;
  const listeners = [];

  async function api(method, url, body, opts) {
    const r = await fetch(url, Object.assign({
      method,
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined
    }, opts || {}));
    let j = null;
    try { j = await r.json(); } catch (e) {}
    if (!r.ok) { const err = new Error((j && j.error) || ('Ошибка сервера: ' + r.status)); err.status = r.status; throw err; }
    return j;
  }

  function emit() { for (const f of listeners) f(data); renderAcct(); }
  function setSync(t, bad) { const e = $('#acctSync'); e.textContent = t || ''; e.classList.toggle('bad', !!bad); }

  function schedulePush() {
    clearTimeout(pushTimer);
    setSync('Сохраняю…');
    pushTimer = setTimeout(push, 700);
  }
  async function push(keepalive) {
    pushTimer = null;
    if (mode !== 'account') return;
    if (pushing) { pushAgain = true; return; }
    pushing = true;
    try {
      const j = await api('PUT', '/api/progress', { progress: data }, keepalive ? { keepalive: true } : undefined);
      if (j && j.progress) data.best = Math.max(data.best, j.progress.best);
      setSync('Сохранено на сервере');
    } catch (e) {
      if (e.status === 401) { toGuest(); setSync('Сессия истекла — войди снова', true); }
      else { setSync('Не удалось сохранить, повторю позже', true); clearTimeout(pushTimer); pushTimer = setTimeout(push, 8000); }
    } finally {
      pushing = false;
      if (pushAgain) { pushAgain = false; push(); }
    }
  }

  window.Store = {
    get: () => data,
    set(s) { data = norm(s); if (mode === 'guest') writeLocal(data); else schedulePush(); },
    onChange(f) { listeners.push(f); },
    menuShown() { loadBoard(); },
    mode: () => mode,
    nick: () => (user ? user.nickname : guestNick()) || 'Гость'
  };

  addEventListener('pagehide', () => { if (mode === 'account' && pushTimer) { clearTimeout(pushTimer); push(true); } });

  function toGuest() { mode = 'guest'; user = null; data = readLocal(); emit(); loadBoard(); }
  function toAccount(j) {
    mode = 'account'; user = j.user; data = norm(j.progress);
    setSync('Прогресс загружен с сервера');
    emit(); loadBoard();
  }

  function renderAcct() {
    $('#acctMode').textContent = mode === 'account' ? 'Игрок:' : 'Гость:';
    const name = $('#acctName');
    name.textContent = Store.nick();
    if (user && user.username.toLowerCase() !== user.nickname.toLowerCase()) {
      const sm = document.createElement('small'); sm.textContent = ' (логин ' + user.username + ')'; name.append(sm);
    }
    $('#acctLogin').hidden = !online || mode === 'account';
    $('#acctReg').hidden = !online || mode === 'account';
    $('#acctOut').hidden = mode !== 'account';
    if (!online) setSync('Сервер недоступен: только гостевой режим');
    else if (mode === 'guest') setSync('Прогресс хранится в этом браузере');
    $('#storeNote').textContent = mode === 'account'
      ? 'Прогресс сохраняется на сервере и доступен с любого устройства после входа.'
      : 'Гостевой прогресс хранится только в этом браузере. Создай аккаунт, чтобы не потерять его и попасть в рекорды.';
  }

  async function loadBoard() {
    const sec = $('#lbSec');
    if (!online) { sec.hidden = true; return; }
    try {
      const j = await api('GET', '/api/leaderboard');
      const ol = $('#lb');
      ol.textContent = '';
      if (!j.top.length) { const li = document.createElement('li'); li.className = 'empty'; li.textContent = 'Пока пусто — стань первым в бесконечной погоне.'; ol.append(li); }
      for (const r of j.top) {
        const li = document.createElement('li');
        if (user && r.nickname === user.nickname) li.className = 'me';
        const n = document.createElement('span'); n.textContent = r.nickname;
        const b = document.createElement('b'); b.textContent = r.best.toLocaleString('ru-RU');
        li.append(n, b); ol.append(li);
      }
      sec.hidden = false;
    } catch (e) { sec.hidden = true; }
  }

  /* ---------- окно: вход, регистрация, гость, смена ника ---------- */
  let tab = 'login';
  const TITLES = { login: 'Вход', register: 'Новый аккаунт', guest: 'Игра без аккаунта', nick: 'Никнейм' };
  const SUBMIT = { login: 'Войти', register: 'Создать аккаунт', guest: 'Играть', nick: 'Сохранить' };
  const HINTS = {
    login: '',
    register: 'Логин нужен для входа: 3–20 символов, буквы, цифры, _ и -. Пароль — от 6 символов. Никнейм видят другие игроки: 2–24 символа, можно с пробелами.',
    guest: 'Ник сохранится в этом браузере. Чтобы попасть в рекорды, нужен аккаунт.',
    nick: 'Никнейм видят другие игроки в рекордах: 2–24 символа, буквы, цифры, пробелы, _ . -'
  };
  function setTab(t) {
    tab = t;
    for (const b of document.querySelectorAll('.tab')) b.setAttribute('aria-selected', String(b.dataset.tab === t));
    $('#aTabs').hidden = t === 'nick';
    const tb = document.querySelector('.tab[data-tab="login"]'), tr = document.querySelector('.tab[data-tab="register"]');
    tb.hidden = tr.hidden = !online;
    $('#aUserWrap').hidden = $('#aPassWrap').hidden = t === 'guest' || t === 'nick';
    $('#aNickWrap').hidden = t === 'login';
    $('#aSubmit').textContent = SUBMIT[t];
    $('#aPass').autocomplete = t === 'login' ? 'current-password' : 'new-password';
    $('#aHint').textContent = HINTS[t];
    $('#aHint').hidden = !HINTS[t];
    $('#aGuest').hidden = t === 'guest' || t === 'nick';
    $('#aCancel').hidden = t !== 'nick';
    if (t === 'guest' || t === 'register') $('#aNick').value = $('#aNick').value || guestNick();
    if (t === 'nick') $('#aNick').value = Store.nick() === 'Гость' && mode === 'guest' && !guestNick() ? '' : Store.nick();
    const g = readLocal(), has = g.money > 0 || Object.keys(g.done).length > 0 || g.best > 0;
    $('#aMoveWrap').hidden = t !== 'register' || !has;
    $('#aMoveTxt').textContent = 'Перенести прогресс гостя: $' + g.money.toLocaleString('ru-RU') + ', пройдено миссий: ' + Object.keys(g.done).length;
    $('#aErr').textContent = '';
  }
  function showAuth(t, welcome) {
    setTab(t);
    $('#aTitle').textContent = welcome ? 'Добро пожаловать' : TITLES[t];
    $('#aSub').hidden = !welcome || !online;
    $('#auth').hidden = false;
    setTimeout(() => (t === 'guest' || t === 'nick' ? $('#aNick') : $('#aUser')).focus(), 30);
  }
  function hideAuth() { $('#auth').hidden = true; flag(SEEN_KEY, '1'); }

  for (const b of document.querySelectorAll('.tab')) b.addEventListener('click', () => { setTab(b.dataset.tab); $('#aTitle').textContent = TITLES[b.dataset.tab]; $('#aSub').hidden = true; });
  $('#acctLogin').addEventListener('click', () => showAuth('login'));
  $('#acctReg').addEventListener('click', () => showAuth('register'));
  $('#acctNick').addEventListener('click', () => showAuth('nick'));
  $('#aGuest').addEventListener('click', () => showAuth('guest'));
  $('#aCancel').addEventListener('click', hideAuth);
  $('#auth').addEventListener('keydown', e => { if (e.key === 'Escape') hideAuth(); });
  $('#acctOut').addEventListener('click', async () => {
    if (pushTimer) { clearTimeout(pushTimer); await push(); }
    try { await api('POST', '/api/logout'); } catch (e) {}
    toGuest(); setSync('Ты вышел. Играешь как гость.');
  });

  $('#aForm').addEventListener('submit', async e => {
    e.preventDefault();
    const username = $('#aUser').value.trim(), password = $('#aPass').value, nickname = cleanNick($('#aNick').value);
    const err = $('#aErr'), btn = $('#aSubmit');
    const needNick = tab !== 'login';
    if (tab === 'register') {
      if (!LOGIN_RE.test(username)) { err.textContent = 'Логин: 3–20 символов, только буквы, цифры, _ и -.'; return; }
      if (password.length < 6) { err.textContent = 'Пароль должен быть не короче 6 символов.'; return; }
    } else if (tab === 'login' && (!username || !password)) { err.textContent = 'Введи логин и пароль.'; return; }
    if (needNick && !NICK_RE.test(nickname)) { err.textContent = 'Никнейм: 2–24 символа — буквы, цифры, пробелы, _ . -'; return; }

    if (tab === 'guest' || (tab === 'nick' && mode === 'guest')) {
      flag(NICK_KEY, nickname); hideAuth(); renderAcct();
      setSync('Ник сохранён: ' + nickname);
      return;
    }
    btn.disabled = true; err.textContent = '';
    try {
      if (tab === 'nick') {
        const j = await api('PUT', '/api/profile', { nickname });
        user = j.user; hideAuth(); renderAcct(); loadBoard(); setSync('Ник изменён');
        return;
      }
      const body = { username, password };
      if (tab === 'register') {
        body.nickname = nickname;
        if (!$('#aMoveWrap').hidden && $('#aMove').checked) body.progress = readLocal();
      }
      const j = await api('POST', tab === 'login' ? '/api/login' : '/api/register', body);
      $('#aPass').value = '';
      hideAuth(); toAccount(j);
    } catch (ex) {
      err.textContent = ex.message || 'Не получилось. Попробуй ещё раз.';
    } finally { btn.disabled = false; }
  });

  /* ---------- запуск ---------- */
  async function boot() {
    renderAcct();
    if (location.protocol === 'file:') { if (!flag(SEEN_KEY) && !guestNick()) showAuth('guest', true); return; }
    try {
      const j = await api('GET', '/api/me');
      online = true; toAccount(j);
    } catch (e) {
      if (e.status === 401) { online = true; renderAcct(); loadBoard(); if (!flag(SEEN_KEY)) showAuth('register', true); }
      else { online = false; renderAcct(); if (!flag(SEEN_KEY) && !guestNick()) showAuth('guest', true); }
    }
  }
  boot();
})();
