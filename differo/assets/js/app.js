/* ============================================================================
   Differo — aplikacja (SPA): logowanie, routing, widoki, kalkulatory, historia,
   pętla poprawek. Stan trzymany lokalnie (localStorage) — bez serwera.
   ========================================================================== */
(function () {
  'use strict';

  /* ----------------------------- magazyn ----------------------------- */
  const KEY = {
    session: 'dfr-session', profile: 'dfr-profile', history: 'dfr-history',
    feedback: 'dfr-feedback', corrections: 'dfr-corrections', prefs: 'dfr-prefs', theme: 'dfr-theme',
  };
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  };

  let session = store.get(KEY.session, null);
  let profile = store.get(KEY.profile, null);
  let history = store.get(KEY.history, []);
  let feedback = store.get(KEY.feedback, []);
  let corrections = store.get(KEY.corrections, {});
  let prefs = store.get(KEY.prefs, { reducedMotion: false });

  const D = DFR.data, E = DFR.engine;
  let lastResult = null, lastInput = null; // do zapisu/zgłoszeń

  /* ------------------------------ ikony ------------------------------ */
  const I = {
    pulpit: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
    wywiad: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M12 11v6M9 14h6',
    historia: 'M12 8v4l3 2M3.05 11a9 9 0 1 1 .5 4M3 4v5h5',
    baza: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5V5a2 2 0 0 1 2-2h14v14H6.5A2.5 2.5 0 0 0 4 19.5z',
    zgloszenia: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
    profil: 'M20 21a8 8 0 1 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    ustawienia: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
    prawne: 'M12 3v18M5 7h14M7 7l-3 7a3 3 0 0 0 6 0zM17 7l-3 7a3 3 0 0 0 6 0z',
    heart: 'M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l8.8 8.6 8.8-8.6a5.5 5.5 0 0 0 0-7.8z',
    lungs: 'M9.6 4.6A2 2 0 1 1 11 8H2M12.6 19.4A2 2 0 1 0 14 16H2M17.7 7.7A2.5 2.5 0 1 1 19.5 12H2',
    brain: 'M9.5 2A2.5 2.5 0 0 0 7 4.5v15A2.5 2.5 0 0 0 12 19.5v-15A2.5 2.5 0 0 0 9.5 2zM14.5 2A2.5 2.5 0 0 1 17 4.5v15a2.5 2.5 0 0 1-5 0',
    activity: 'M22 12h-4l-3 9L9 3l-3 9H2',
    thermometer: 'M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z',
    pulse: 'M22 12h-4l-3 9L9 3l-3 9H2',
    plus: 'M12 5v14M5 12h14', x: 'M18 6 6 18M6 6l12 12',
    trash: 'M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6',
    check: 'M20 6 9 17l-5-5', search: 'M21 21l-4.3-4.3M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z',
    shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
    flag: 'M4 22V4M4 4l9 5-9 5', save: 'M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM17 21v-8H7v8M7 3v5h8',
    edit: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z',
    download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
    logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
    info: 'M12 16v-4M12 8h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0z',
  };
  function svg(path, size = 20, cls = '') {
    return `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${
      path.split('|').map(p => `<path d="${p}"/>`).join('')}</svg>`;
  }
  const presIcon = id => ({ chest_pain: I.heart, dyspnea: I.lungs, headache: I.brain, fever: I.thermometer, syncope: I.pulse, abdo_pain: I.activity }[id] || I.activity);

  /* --------------------------- narzędzia UI --------------------------- */
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const root = document.getElementById('root');
  const modalRoot = document.getElementById('modalRoot');

  function toast(msg, type = '') {
    const t = document.createElement('div');
    t.className = 'toast ' + type; t.textContent = msg;
    document.getElementById('toastRoot').appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 300); }, 2800);
  }
  function modal(title, bodyHtml, footHtml) {
    modalRoot.innerHTML = `
      <div class="modal-backdrop" id="mbk">
        <div class="modal" role="dialog" aria-modal="true">
          <div class="modal-head"><h3 class="serif" style="font-size:var(--fs-lg)">${title}</h3>
            <button class="theme-toggle" data-close>${svg(I.x, 18)}</button></div>
          <div class="modal-body">${bodyHtml}</div>
          ${footHtml ? `<div class="modal-foot">${footHtml}</div>` : ''}
        </div>
      </div>`;
    const bk = document.getElementById('mbk');
    bk.addEventListener('click', e => { if (e.target === bk || e.target.closest('[data-close]')) closeModal(); });
  }
  function closeModal() { modalRoot.innerHTML = ''; }

  function setTheme(t) {
    document.documentElement.setAttribute('data-theme', t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light');
    store.set(KEY.theme, t);
  }
  function fmtDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('pl-PL', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  }
  function initials(name) { return (name || 'Dr').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(); }

  /* ---- eksport raportu do druku / PDF (bez bibliotek) ---- */
  function printReport(d) {
    const w = window.open('', '_blank');
    if (!w) { toast('Zezwól na wyskakujące okna, aby wyeksportować raport.', 'warn'); return; }
    const css = `*{box-sizing:border-box;margin:0}body{font:14px/1.6 -apple-system,Segoe UI,Roboto,sans-serif;color:#131A24;padding:40px;max-width:820px;margin:0 auto}
      h1{font:600 26px Georgia,serif;margin-bottom:4px}h2{font:600 15px sans-serif;text-transform:uppercase;letter-spacing:.05em;color:#0E7C86;margin:24px 0 8px;border-bottom:1px solid #E2E8F0;padding-bottom:4px}
      .meta{color:#6B7686;font-size:13px;margin-bottom:20px}.row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #EEF2F7}
      .pct{font-weight:700;font-variant-numeric:tabular-nums}.cm{color:#C0362C}.tag{display:inline-block;background:#EEF2F7;border:1px solid #E2E8F0;border-radius:20px;padding:2px 10px;margin:0 4px 4px 0;font-size:12px}
      .rf{background:#FBEAE8;border:1px solid #F0C7C2;color:#C0362C;border-radius:8px;padding:8px 12px;margin-bottom:6px;font-size:13px}
      .disc{margin-top:30px;background:#FBF1E1;border:1px solid #EDD7AE;color:#8a5a00;border-radius:8px;padding:12px 14px;font-size:12px}
      .box{background:#F6F8FB;border:1px solid #E2E8F0;border-radius:8px;padding:12px;font-size:13px;white-space:pre-wrap}
      @media print{body{padding:0}}`;
    const html = `<!doctype html><html lang="pl"><head><meta charset="utf-8"><title>Raport Differo — ${esc(d.title)}</title><style>${css}</style></head><body>
      <h1>Differo — raport różnicowania</h1>
      <div class="meta">${esc(d.title)} · kontekst: ${esc(d.context)} · ${esc(d.when)}${d.clinician ? ' · ' + esc(d.clinician) : ''}
      ${d.demo ? '<br>' + esc(d.demo) : ''}</div>
      ${d.findings && d.findings.length ? `<h2>Rozpoznane znaleziska</h2><div>${d.findings.map(f => `<span class="tag">${esc(f)}</span>`).join('')}</div>` : ''}
      ${d.redFlags && d.redFlags.length ? `<h2>Czerwone flagi</h2>${d.redFlags.map(f => `<div class="rf">⚑ ${esc(f)}</div>`).join('')}` : ''}
      <h2>Diagnostyka różnicowa (udział względny)</h2>
      ${d.differential.map(x => `<div class="row"><span class="${x.cantMiss ? 'cm' : ''}">${x.cantMiss ? '⚠ ' : ''}${esc(x.name)}</span><span class="pct">${x.share}%</span></div>`).join('')}
      ${d.tests && d.tests.length ? `<h2>Zalecana diagnostyka wstępna</h2><div>${d.tests.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
      ${d.inputText ? `<h2>Opis przypadku</h2><div class="box">${esc(d.inputText)}</div>` : ''}
      <div class="disc"><b>Zastrzeżenie:</b> Differo to prototyp edukacyjny, nie wyrób medyczny. Przedstawione wartości to względny udział w obrębie różnicowania, a nie kalibrowane prawdopodobieństwo kliniczne. Raport nie stanowi rozpoznania — odpowiedzialność za decyzję ponosi profesjonalista medyczny. Nie zawiera danych identyfikujących pacjenta.</div>
      <script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script></body></html>`;
    w.document.write(html); w.document.close();
  }

  /* =================================================================== */
  /*  LOGOWANIE                                                           */
  /* =================================================================== */
  function renderAuth() {
    root.innerHTML = `
      <div class="auth">
        <aside class="auth-aside">
          <a class="brand" href="index.html"><span class="brand-mark">${svg('M16 7v18M9 13l7-6 7 6', 18)}</span>Differo</a>
          <div>
            <h2>Wsparcie decyzji, które szanuje Twój osąd.</h2>
            <p>Od wywiadu do uporządkowanej listy hipotez — z jawnym uzasadnieniem, czerwonymi flagami i walidowanymi skalami.</p>
            <div class="auth-points">
              <div><span class="ck">${svg(I.check, 13)}</span> Przejrzysty silnik różnicowania (nie czarna skrzynka)</div>
              <div><span class="ck">${svg(I.check, 13)}</span> Ochrona przed danymi osobowymi (RODO)</div>
              <div><span class="ck">${svg(I.check, 13)}</span> Historia wywiadów i współtworzenie korekt</div>
            </div>
          </div>
          <p class="small" style="color:rgba(255,255,255,.7)">Prototyp edukacyjny — nie wyrób medyczny.</p>
        </aside>
        <main class="auth-main">
          <div class="auth-card">
            <span class="eyebrow">Dostęp dla profesjonalistów</span>
            <h1 class="mt-2">Zaloguj się do Differo</h1>
            <p class="muted small mt-2">W tej wersji demonstracyjnej dowolne dane logują Cię do aplikacji.</p>
            <form class="auth-form" id="authForm">
              <div class="field"><label class="label">Adres e-mail</label>
                <input class="input" id="authEmail" type="text" placeholder="imie.nazwisko@szpital.pl" value="${esc((session && session.email) || '')}" /></div>
              <div class="field"><label class="label">Hasło</label>
                <input class="input" id="authPass" type="password" placeholder="••••••••" /></div>
              <div class="field"><label class="label">Twoja rola</label>
                <div class="role-toggle" id="roleToggle">
                  <div class="role-opt is-active" data-role="Lekarz">Lekarz / specjalista</div>
                  <div class="role-opt" data-role="Student">Student medycyny</div>
                </div></div>
              <label class="checkbox"><input type="checkbox" id="authTerms" />
                <span>Potwierdzam, że jestem profesjonalistą medycznym, nie wprowadzam danych identyfikujących pacjenta i akceptuję <a href="#" data-legal>regulamin oraz politykę prywatności</a>. Odpowiedzialność za decyzję kliniczną ponoszę ja.</span></label>
              <button class="btn btn-primary btn-lg btn-block" type="submit">Wejdź do aplikacji</button>
              <p class="hint text-center">Wracasz na <a href="index.html">stronę główną</a>.</p>
            </form>
          </div>
        </main>
      </div>`;

    let role = 'Lekarz';
    root.querySelectorAll('.role-opt').forEach(o => o.addEventListener('click', () => {
      root.querySelectorAll('.role-opt').forEach(x => x.classList.remove('is-active'));
      o.classList.add('is-active'); role = o.dataset.role;
    }));
    root.querySelector('[data-legal]').addEventListener('click', e => { e.preventDefault(); session = { preview: true }; renderAuthLegalPreview(); });
    document.getElementById('authForm').addEventListener('submit', e => {
      e.preventDefault();
      if (!document.getElementById('authTerms').checked) { toast('Zaznacz akceptację regulaminu, aby kontynuować.', 'warn'); return; }
      const email = document.getElementById('authEmail').value.trim() || 'demo@differo.app';
      const name = role === 'Student' ? 'Student medycyny' : 'dr ' + (email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
      session = { loggedIn: true, email, role, name, since: new Date().toISOString() };
      store.set(KEY.session, session);
      if (!profile) { profile = { name, role, specialization: '', institution: '' }; store.set(KEY.profile, profile); }
      toast('Witaj w Differo, ' + name + '.', 'ok');
      if (!location.hash || location.hash === '#') location.hash = '#pulpit';
      render();
    });
  }
  function renderAuthLegalPreview() { // szybki podgląd regulaminu z ekranu logowania
    modal('Regulamin i polityka prywatności (skrót)', legalText().slice(0, 2).join(''), `<button class="btn btn-ghost" data-close>Zamknij</button>`);
    session = null;
  }

  /* =================================================================== */
  /*  POWŁOKA                                                             */
  /* =================================================================== */
  const NAV = [
    { id: 'pulpit', label: 'Pulpit', icon: I.pulpit },
    { id: 'wywiad', label: 'Nowy wywiad', icon: I.wywiad },
    { id: 'historia', label: 'Historia wywiadów', icon: I.historia, count: () => history.length },
    { id: 'baza', label: 'Baza wiedzy', icon: I.baza },
    { id: 'zgloszenia', label: 'Zgłoszenia i poprawki', icon: I.zgloszenia, count: () => feedback.length },
    { sec: 'Konto' },
    { id: 'profil', label: 'Profil', icon: I.profil },
    { id: 'ustawienia', label: 'Ustawienia', icon: I.ustawienia },
    { id: 'prawne', label: 'Prawne', icon: I.prawne },
  ];
  const TITLES = { pulpit: 'Pulpit', wywiad: 'Nowy wywiad', historia: 'Historia wywiadów', baza: 'Baza wiedzy', zgloszenia: 'Zgłoszenia i poprawki', profil: 'Profil', ustawienia: 'Ustawienia', prawne: 'Informacje prawne' };

  function renderShell(view) {
    const navHtml = NAV.map(n => {
      if (n.sec) return `<div class="nav-section">${n.sec}</div>`;
      const cnt = n.count ? n.count() : null;
      return `<a class="nav-item ${view === n.id ? 'is-active' : ''}" href="#${n.id}">
        <span class="ico">${svg(n.icon, 19)}</span> ${n.label}
        ${cnt ? `<span class="count">${cnt}</span>` : ''}</a>`;
    }).join('');

    const mobileNav = NAV.filter(n => !n.sec).map(n =>
      `<a class="chip ${view === n.id ? 'is-active' : ''}" href="#${n.id}">${n.label}</a>`).join('');

    root.innerHTML = `
      <div class="app-shell">
        <aside class="sidebar">
          <div class="sidebar-top"><a class="brand" href="index.html"><span class="brand-mark">${svg('M16 7v18M9 13l7-6 7 6', 18)}</span>Differo</a></div>
          <nav class="nav-list">${navHtml}</nav>
          <div class="sidebar-foot">
            <div class="user-chip" id="userChip">
              <span class="avatar">${initials(profile && profile.name)}</span>
              <span class="meta"><b>${esc((profile && profile.name) || 'Użytkownik')}</b><span>${esc((profile && profile.role) || '')}</span></span>
            </div>
          </div>
        </aside>
        <div class="main">
          <div class="topbar">
            <h2 class="serif">${TITLES[view] || 'Differo'}</h2>
            <div class="flex items-center gap-2">
              <button class="theme-toggle" id="themeBtn" title="Tryb jasny/ciemny">${svg('M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z', 18)}</button>
              <a class="btn btn-primary btn-sm" href="#wywiad">${svg(I.plus, 16)} Nowy wywiad</a>
            </div>
          </div>
          <div class="mobile-nav">${mobileNav}</div>
          <div class="view ${view === 'baza' || view === 'historia' ? 'view-wide' : ''}" id="viewRoot"></div>
        </div>
      </div>`;

    document.getElementById('themeBtn').addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      setTheme(cur);
    });
    document.getElementById('userChip').addEventListener('click', () => { location.hash = '#profil'; });

    const vr = document.getElementById('viewRoot');
    ({ pulpit: viewPulpit, wywiad: viewWywiad, historia: viewHistoria, baza: viewBaza, zgloszenia: viewZgloszenia, profil: viewProfil, ustawienia: viewUstawienia, prawne: viewPrawne }[view] || viewPulpit)(vr);
  }

  /* =================================================================== */
  /*  WIDOK: PULPIT                                                       */
  /* =================================================================== */
  function viewPulpit(vr) {
    const accepted = Object.values(corrections).reduce((a, o) => a + Object.keys(o).length, 0);
    const recent = history.slice(0, 3);
    vr.innerHTML = `
      <div class="page-head"><h1 class="serif">Dzień dobry, ${esc((profile && profile.name) || '')}.</h1>
        <p>Wpisz wywiad, a Differo zaproponuje różnicowanie z uzasadnieniem. Pamiętaj: to wsparcie, nie zastępstwo Twojej oceny.</p></div>

      <div class="alert alert-warn mb-6">${svg(I.info, 16, 'alert-icon')}
        <span><b>Nie wprowadzaj danych identyfikujących pacjenta.</b> System wykrywa i pomaga usunąć PESEL, imiona, adresy i daty. Wyniki mają charakter edukacyjny.</span></div>

      <div class="grid-4 mb-6">
        <div class="card stat"><div class="ico">${svg(I.historia, 18)}</div><div class="v tnum">${history.length}</div><div class="k">zapisanych wywiadów</div></div>
        <div class="card stat"><div class="ico">${svg(I.baza, 18)}</div><div class="v tnum">${D.presentations.length}</div><div class="k">ścieżek klinicznych</div></div>
        <div class="card stat"><div class="ico">${svg(I.zgloszenia, 18)}</div><div class="v tnum">${feedback.length}</div><div class="k">Twoich zgłoszeń</div></div>
        <div class="card stat"><div class="ico">${svg(I.check, 18)}</div><div class="v tnum">${accepted}</div><div class="k">zastosowanych korekt</div></div>
      </div>

      <div class="grid-2">
        <div class="card card-pad">
          <div class="flex items-center justify-between mb-4"><h3 class="serif" style="font-size:var(--fs-lg)">Szybki start</h3></div>
          <p class="muted small mb-4">Wybierz ścieżkę kliniczną, aby od razu rozpocząć wywiad.</p>
          <div class="flex wrap gap-2" id="quickPaths">
            ${D.presentations.map(p => `<a class="chip" href="#wywiad" data-path="${p.id}">${svg(presIcon(p.id), 15)} ${p.label}</a>`).join('')}
          </div>
        </div>
        <div class="card card-pad">
          <div class="flex items-center justify-between mb-4"><h3 class="serif" style="font-size:var(--fs-lg)">Ostatnie wywiady</h3><a class="small" href="#historia">Wszystkie →</a></div>
          ${recent.length ? recent.map(h => `
            <div class="list-row" data-hist="${h.id}" style="cursor:pointer;margin-bottom:8px">
              <span class="lead-ico">${svg(presIcon(h.presentationId), 18)}</span>
              <div class="body"><b>${esc(h.presentationLabel)}</b><p>${h.top.map(t => esc(t.name) + ' ' + t.share + '%').join(' · ')}</p></div>
              <span class="when">${new Date(h.date).toLocaleDateString('pl-PL')}</span>
            </div>`).join('') : `<p class="muted small">Brak zapisanych wywiadów. Zacznij od „Nowy wywiad”.</p>`}
        </div>
      </div>`;

    vr.querySelectorAll('[data-path]').forEach(a => a.addEventListener('click', () => { sessionStorage.setItem('dfr-preset', a.dataset.path); }));
    vr.querySelectorAll('[data-hist]').forEach(r => r.addEventListener('click', () => openHistory(r.dataset.hist)));
  }

  /* =================================================================== */
  /*  WIDOK: NOWY WYWIAD                                                  */
  /* =================================================================== */
  const CONTEXTS = ['SOR', 'POZ', 'Interna', 'Chirurgia', 'Pediatria', 'Kardiologia', 'Neurologia'];
  let formFindings = []; // edytowalne znaleziska po ekstrakcji

  function viewWywiad(vr) {
    const preset = sessionStorage.getItem('dfr-preset'); sessionStorage.removeItem('dfr-preset');
    vr.innerHTML = `
      <div class="page-head"><h1 class="serif">Nowy wywiad</h1>
        <p>Opisz przypadek w naturalnym języku. System rozpozna znaleziska — zawsze możesz je poprawić przed analizą.</p></div>

      <div class="card card-pad mb-5">
        <div class="form-grid">
          <div class="field span-2"><label class="label">Główna prezentacja</label>
            <select class="select" id="fPres">
              <option value="auto">Auto-wykryj z opisu</option>
              ${D.presentations.map(p => `<option value="${p.id}" ${preset === p.id ? 'selected' : ''}>${p.label}</option>`).join('')}
            </select></div>
          <div class="field"><label class="label">Kontekst</label>
            <select class="select" id="fCtx">${CONTEXTS.map(c => `<option ${c === 'SOR' ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
          <div class="field"><label class="label">Czas trwania</label>
            <select class="select" id="fDur"><option>< 1 h</option><option>kilka godzin</option><option selected>1 dzień</option><option>kilka dni</option><option>> tydzień</option><option>przewlekle</option></select></div>
          <div class="field"><label class="label">Wiek</label><input class="input" id="fAge" type="number" min="0" max="120" placeholder="lata" /></div>
          <div class="field"><label class="label">Płeć</label><select class="select" id="fSex"><option value="">—</option><option value="M">mężczyzna</option><option value="K">kobieta</option></select></div>
          <div class="field span-2"><label class="label">Choroby współistniejące</label><input class="input" id="fComorb" placeholder="np. nadciśnienie, cukrzyca, choroba wieńcowa, POChP" /></div>

          <div class="field span-4"><label class="label">Wywiad</label>
            <textarea class="textarea" id="fHistory" rows="4" placeholder="np. Ból zamostkowy od 2 godzin, przy wysiłku, promieniujący do lewej ręki, zlewne poty, nudności…">${preset ? '' : ''}</textarea>
            <span class="hint">Nie wpisuj imienia, nazwiska, PESEL ani adresu pacjenta.</span></div>
          <div class="field span-2"><label class="label">Badanie fizykalne</label><textarea class="textarea" id="fExam" rows="3" placeholder="np. tachykardia, ściszenie szmeru, dodatni objaw Blumberga…"></textarea></div>
          <div class="field span-2"><label class="label">Leki</label><textarea class="textarea" id="fMeds" rows="3" placeholder="np. ASA, leki przeciwkrzepliwe, antykoncepcja…"></textarea></div>
        </div>

        <label class="label mt-5" style="display:block">Parametry życiowe</label>
        <div class="vitals mt-2">
          ${vital('vHR', 'HR /min')}${vital('vSBP', 'RR skurcz.')}${vital('vRR', 'Oddechy /min')}
          ${vital('vSpO2', 'SpO₂ %')}${vital('vTemp', 'Temp °C')}${vital('vGCS', 'GCS')}
        </div>

        <div class="flex items-center gap-3 mt-6 wrap">
          <button class="btn btn-primary btn-lg" id="btnAnalyze">${svg(I.shield, 18)} Sprawdź dane i analizuj</button>
          <button class="btn btn-subtle" id="btnExample">Wstaw przykład</button>
        </div>
      </div>

      <div id="resultRoot"></div>`;

    document.getElementById('btnExample').addEventListener('click', () => {
      const ex = { chest_pain: ['64', 'M', 'nadciśnienie, hiperlipidemia', 'Ból zamostkowy od 2 godzin, przy wysiłku, promieniujący do lewej ręki, zlewne poty, nudności. Pali papierosy.'],
        abdo_pain: ['28', 'M', '', 'Ból brzucha zaczął się w okolicy pępka, przemieścił do prawego dołu biodrowego, brak apetytu, nudności, stan podgorączkowy.'],
        dyspnea: ['56', 'K', 'nowotwór', 'Nagła duszność, ból opłucnowy, obrzęk i ból lewej łydki, kołatanie. Niedawny zabieg.'],
      };
      const pres = document.getElementById('fPres').value;
      const e = ex[pres === 'auto' ? 'chest_pain' : pres] || ex.chest_pain;
      document.getElementById('fAge').value = e[0]; document.getElementById('fSex').value = e[1];
      document.getElementById('fComorb').value = e[2]; document.getElementById('fHistory').value = e[3];
      if ((pres === 'auto' ? 'chest_pain' : pres) === 'chest_pain') { document.getElementById('vHR').value = 96; document.getElementById('vSBP').value = 150; }
      if (pres === 'dyspnea') { document.getElementById('vHR').value = 112; document.getElementById('vSpO2').value = 89; }
      toast('Wstawiono przykładowy przypadek.');
    });

    document.getElementById('btnAnalyze').addEventListener('click', runAnalysis);
  }
  function vital(id, label) { return `<div class="field vital-input"><label class="label">${label}</label><input class="input" id="${id}" type="number" placeholder="—" /></div>`; }

  function buildState() {
    const g = id => document.getElementById(id).value.trim();
    const num = id => { const v = parseFloat(document.getElementById(id).value); return isNaN(v) ? null : v; };
    const text = [g('fHistory'), g('fExam'), g('fComorb'), g('fMeds')].join('. ');
    const ext = E.extractFindings(text);
    const present = new Set(ext.present);

    // demografia
    const age = num('fAge'), sex = g('fSex');
    if (age != null) { if (age >= 65) { present.add('age_ge_65'); present.add('age_ge_50'); } else if (age >= 50) present.add('age_ge_50'); else if (age < 40) present.add('age_lt_40'); }
    if (sex === 'M') present.add('male');
    if (sex === 'K') { present.add('female'); if (age != null && age >= 12 && age <= 55) present.add('preg_possible'); }
    // parametry
    const hr = num('vHR'), sbp = num('vSBP'), rr = num('vRR'), spo2 = num('vSpO2'), temp = num('vTemp'), gcs = num('vGCS');
    if (temp != null && temp >= 38) present.add('fever');
    if (temp != null && temp < 36) present.add('hypothermia');
    if (hr != null && hr >= 100) present.add('tachycardia');
    if (hr != null && hr < 50) present.add('bradycardia');
    if (sbp != null && sbp < 100) present.add('hypotension');
    if (sbp != null && sbp < 90) present.add('hypotension_severe');
    if (sbp != null && sbp >= 180) present.add('htn_severe');
    if (rr != null && rr >= 22) present.add('tachypnea');
    if (spo2 != null && spo2 < 92) present.add('hypoxemia');
    if (gcs != null && gcs < 15) present.add('altered_mental');

    return { text, present: [...present], absent: ext.absent, demographics: { age, sex, ctx: g('fCtx'), dur: g('fDur') } };
  }

  function guessPresentation(present) {
    let best = D.presentations[0], score = -1;
    D.presentations.forEach(p => {
      const ids = new Set(); p.diagnoses.forEach(d => Object.keys(d.lr || {}).forEach(k => ids.add(k)));
      const s = present.filter(f => ids.has(f)).length;
      if (s > score) { score = s; best = p; }
    });
    return best;
  }

  function runAnalysis() {
    const st = buildState();
    const piiText = [document.getElementById('fHistory').value, document.getElementById('fExam').value, document.getElementById('fComorb').value, document.getElementById('fMeds').value].join('\n');
    const pii = E.detectPII(piiText);
    if (pii.length && !window.__dfrPiiAck) {
      modal('Wykryto możliwe dane osobowe', `
        <p class="small muted mb-4">Zgodnie z RODO nie wprowadzaj danych identyfikujących pacjenta. Znaleziono ${pii.length} potencjalnych fragmentów:</p>
        <div class="flex col gap-2">${pii.map(h => `<div class="alert alert-warn" style="font-size:var(--fs-xs)">${svg(I.info, 14, 'alert-icon')}<span><b>${esc(h.label)}:</b> „${esc(h.value)}”</span></div>`).join('')}</div>`,
        `<button class="btn btn-ghost" data-close>Poprawię ręcznie</button><button class="btn btn-primary" id="redactGo">${svg(I.shield, 16)} Usuń i analizuj</button>`);
      document.getElementById('redactGo').addEventListener('click', () => {
        ['fHistory', 'fExam', 'fComorb', 'fMeds'].forEach(id => {
          const el = document.getElementById(id); const hits = E.detectPII(el.value); el.value = E.redactPII(el.value, hits);
        });
        window.__dfrPiiAck = true; closeModal(); runAnalysis(); window.__dfrPiiAck = false;
      });
      return;
    }

    const presSel = document.getElementById('fPres').value;
    const pres = presSel === 'auto' ? guessPresentation(st.present) : E.getPresentation(presSel);
    formFindings = st.present.filter(id => D.findings[id]);
    const res = E.analyze({ presentationId: pres.id, findingIds: formFindings, context: st.demographics.ctx, corrections });
    lastResult = res; lastInput = { ...st, presentationId: pres.id };
    renderResult();
  }

  function renderResult() {
    const res = lastResult; if (!res) return;
    const rr = document.getElementById('resultRoot');
    const cb = { ok: 'alert-ok', warn: 'alert-warn', low: 'alert-info' }[res.confidence.level];

    rr.innerHTML = `
      <div class="card card-pad fade-up" id="resCard">
        <div class="flex items-center justify-between wrap gap-3 mb-4">
          <div><span class="badge badge-accent">${svg(presIcon(res.presentation.id), 14)} ${res.presentation.label}</span>
            <span class="badge" style="margin-left:6px">kontekst: ${esc(res.context)}</span></div>
          <div class="flex gap-2 wrap">
            <button class="btn btn-ghost btn-sm" id="btnSave">${svg(I.save, 15)} Zapisz</button>
            <button class="btn btn-ghost btn-sm" id="btnExport">${svg(I.download, 15)} Raport</button>
            <button class="btn btn-ghost btn-sm" id="btnFeedback">${svg(I.flag, 15)} Zgłoś poprawkę</button>
          </div>
        </div>

        <div class="alert ${cb} mb-4">${svg(I.info, 16, 'alert-icon')}<span><b>Siła danych:</b> ${esc(res.confidence.text)} Rozpoznano ${res.matchedCount} znalezisk.</span></div>

        <label class="label">Rozpoznane znaleziska (kliknij ✕, aby usunąć)</label>
        <div class="findings-box mt-2 mb-3" id="findingsBox"></div>
        <div class="flex gap-2 wrap mb-5">
          <select class="select" id="addFinding" style="max-width:280px"><option value="">+ dodaj znalezisko z tej ścieżki…</option></select>
        </div>

        ${res.redFlags.length ? `
          <h4 class="serif mb-3" style="font-size:var(--fs-md);color:var(--crit)">${svg(I.flag, 16)} Czerwone flagi — niezależne od procentów</h4>
          ${res.redFlags.map(f => `<div class="alert alert-crit mb-2">${svg(I.flag, 15, 'alert-icon')}<span><b>${esc(f.label)}.</b> ${esc(f.action)}</span></div>`).join('')}
          <div class="hr"></div>` : ''}

        <h4 class="serif mb-1" style="font-size:var(--fs-md)">Diagnostyka różnicowa</h4>
        <p class="hint mb-4">% = względny udział w obrębie różnicowania (nie kalibrowane prawdopodobieństwo). Kliknij rozpoznanie, by zobaczyć badania, postępowanie i źródła.</p>
        <div id="dxList"></div>

        ${res.cantMiss.length ? `
          <div class="hr"></div>
          <h4 class="serif mb-3" style="font-size:var(--fs-md)">Niebezpieczne do wykluczenia</h4>
          <div class="grid-2">${res.cantMiss.map(c => `
            <div class="card card-pad" style="border-left:3px solid var(--${c.band === 'crit' ? 'crit' : c.band === 'warn' ? 'warn' : 'border-strong'})">
              <div class="flex items-center justify-between"><b>${esc(c.name)}</b>
                <span class="badge ${c.band === 'crit' ? 'badge-crit' : c.band === 'warn' ? 'badge-warn' : ''}">${c.band === 'crit' ? 'wysokie' : c.band === 'warn' ? 'umiarkowane' : 'niskie'}</span></div>
              <p class="hint mt-2">${esc((c.tests || []).slice(0, 2).join(' · '))}</p>
            </div>`).join('')}</div>` : ''}

        <div class="hr"></div>
        <h4 class="serif mb-3" style="font-size:var(--fs-md)">Zalecana diagnostyka wstępna</h4>
        <div class="flex wrap gap-2">${res.tests.map(t => `<span class="chip" style="cursor:default">${esc(t)}</span>`).join('')}</div>

        ${res.suggestedScores.length ? `<div class="hr"></div>
          <h4 class="serif mb-3" style="font-size:var(--fs-md)">Sugerowane skale kliniczne</h4>
          <div id="scoreRoot"></div>` : ''}

        <div class="alert alert-info mt-6">${svg(I.info, 16, 'alert-icon')}<span>Wynik wspiera, ale nie zastępuje oceny klinicznej. Zachowaj czujność wobec hipotez spoza listy i obrazu nietypowego.</span></div>
      </div>`;

    renderFindingsChips();
    renderDxList();
    if (res.suggestedScores.length) renderScores(document.getElementById('scoreRoot'), res.suggestedScores);

    // dropdown dodawania znalezisk
    const addSel = document.getElementById('addFinding');
    const relevant = new Set(); res.presentation.diagnoses.forEach(d => Object.keys(d.lr || {}).forEach(k => relevant.add(k)));
    [...relevant].filter(id => D.findings[id] && !formFindings.includes(id) && !['age_ge_65', 'age_ge_50', 'age_lt_40', 'male', 'female', 'preg_possible'].includes(id))
      .forEach(id => { const o = document.createElement('option'); o.value = id; o.textContent = D.findings[id].label; addSel.appendChild(o); });
    addSel.addEventListener('change', () => { if (addSel.value) { formFindings.push(addSel.value); reRun(); } });

    document.getElementById('btnSave').addEventListener('click', saveCurrent);
    document.getElementById('btnExport').addEventListener('click', () => printReport({
      title: res.presentation.label, context: res.context, when: fmtDate(new Date().toISOString()),
      clinician: (profile && profile.name) || '',
      demo: [lastInput.demographics.age ? lastInput.demographics.age + ' lat' : '', lastInput.demographics.sex === 'M' ? 'mężczyzna' : lastInput.demographics.sex === 'K' ? 'kobieta' : '', 'czas: ' + lastInput.demographics.dur].filter(Boolean).join(', '),
      findings: formFindings.map(f => (D.findings[f] || {}).label || f),
      redFlags: res.redFlags.map(f => f.label),
      differential: res.results.map(r => ({ name: r.dx.name, share: Math.round(r.share), cantMiss: !!r.dx.cantMiss })),
      tests: res.tests, inputText: lastInput.text,
    }));
    document.getElementById('btnFeedback').addEventListener('click', () => openFeedback(res.presentation.id, res.results[0].dx.id));
    document.getElementById('resCard').scrollIntoView({ behavior: prefs.reducedMotion ? 'auto' : 'smooth', block: 'start' });
  }

  function reRun() {
    const res = E.analyze({ presentationId: lastInput.presentationId, findingIds: formFindings, context: lastInput.demographics.ctx, corrections });
    lastResult = res; renderResult();
  }
  function renderFindingsChips() {
    const box = document.getElementById('findingsBox');
    if (!formFindings.length) { box.innerHTML = '<span class="empty">Brak rozpoznanych znalezisk — dodaj poniżej lub uzupełnij opis.</span>'; return; }
    box.innerHTML = formFindings.map(id => `<span class="chip is-active chip-remove" data-f="${id}">${esc(D.findings[id].label)} <span class="x">✕</span></span>`).join('');
    box.querySelectorAll('[data-f]').forEach(c => c.addEventListener('click', () => { formFindings = formFindings.filter(x => x !== c.dataset.f); reRun(); }));
  }
  function renderDxList() {
    const list = document.getElementById('dxList');
    list.innerHTML = lastResult.results.map((r, i) => {
      const t = r.share >= 45 ? '' : '';
      const drv = r.drivers.length ? r.drivers.slice(0, 5).map(d =>
        `<span class="driver ${d.dir}">${d.dir === 'up' ? '↑' : '↓'} ${esc(d.label)} <span class="lr">×${d.lr}</span></span>`).join('') : '<span class="hint">Brak dopasowanych czynników — wynik z prawdopodobieństwa wyjściowego.</span>';
      return `
        <div class="result-dx ${r.dx.cantMiss ? 'is-cantmiss' : ''}" data-dx="${r.dx.id}">
          <div class="result-dx-head" data-toggle>
            <div><span class="result-dx-name">${r.dx.cantMiss ? '⚠ ' : ''}${esc(r.dx.name)}</span>
              <span class="meta"> · ${esc(r.dx.icd)} ${r.corrected ? '· <span style="color:var(--accent-text)">korekta społeczności</span>' : ''}</span></div>
            <span class="dx-pct tnum" style="font-weight:700">${r.share.toFixed(0)}%</span>
          </div>
          <div class="prob-row mt-2"><div class="prob-track"><div class="prob-fill ${t}" style="width:${Math.max(3, r.share)}%"></div></div></div>
          <div class="driver-list">${drv}</div>
          <div class="dx-detail">
            <h5>Zalecane badania</h5><ul>${(r.dx.tests || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
            <h5>Postępowanie</h5><ul>${(r.dx.management || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
            <h5>Źródła</h5><p class="source-tag">${(r.dx.sources || []).map(esc).join(' · ')}</p>
            <p class="hint mt-2">P. wyjściowe (${esc(lastInput.demographics.ctx)}): ${(r.prior * 100).toFixed(1)}% → po uwzględnieniu znalezisk udział ${r.share.toFixed(0)}%.</p>
          </div>
        </div>`;
    }).join('');
    list.querySelectorAll('[data-toggle]').forEach(h => h.addEventListener('click', () => h.closest('.result-dx').classList.toggle('open')));
  }

  /* --------- kalkulatory skal (interaktywne) --------- */
  function renderScores(container, ids) {
    container.innerHTML = ids.map(id => `<div id="score-${id}" class="card card-pad mb-4"></div>`).join('');
    ids.forEach(id => buildScore(document.getElementById('score-' + id), D.scores[id]));
  }
  function buildScore(box, sc) {
    if (!sc) return;
    const sel = {};
    function paint() {
      const total = Object.values(sel).reduce((a, b) => a + b, 0);
      const interp = sc.interpret(total);
      box.querySelector('[data-total]').textContent = (Math.round(total * 10) / 10);
      const ib = box.querySelector('[data-interp]');
      ib.className = 'alert ' + ({ low: 'alert-ok', warn: 'alert-warn', crit: 'alert-crit' }[interp.band]);
      ib.innerHTML = svg(I.info, 15, 'alert-icon') + '<span>' + esc(interp.text) + '</span>';
    }
    box.innerHTML = `
      <div class="flex items-center justify-between mb-3"><b>${esc(sc.name)}</b><span class="hint">${esc(sc.subtitle)}</span></div>
      ${sc.items.map((it, ii) => `
        <div class="score-item"><span class="small">${esc(it.label)}</span>
          <div class="score-opts">${it.options.map((o, oi) => `<button class="score-opt" data-i="${ii}" data-v="${o[1]}" data-oi="${oi}">${esc(o[0])}</button>`).join('')}</div>
        </div>`).join('')}
      <div class="score-total"><div data-interp class="alert alert-info" style="flex:1;margin-right:12px">${svg(I.info, 15, 'alert-icon')}<span>Wybierz wartości, aby zobaczyć interpretację.</span></div>
        <div class="text-center"><div class="num tnum" data-total>0</div><div class="hint">pkt</div></div></div>`;
    box.querySelectorAll('.score-opt').forEach(b => b.addEventListener('click', () => {
      const i = b.dataset.i;
      box.querySelectorAll(`.score-opt[data-i="${i}"]`).forEach(x => x.classList.remove('is-active'));
      b.classList.add('is-active'); sel[i] = parseFloat(b.dataset.v); paint();
    }));
  }

  /* --------- zapis do historii --------- */
  function saveCurrent() {
    if (!lastResult) return;
    const rec = {
      id: 'h' + Date.now(), date: new Date().toISOString(),
      presentationId: lastResult.presentation.id, presentationLabel: lastResult.presentation.label,
      context: lastResult.context, demographics: lastInput.demographics,
      inputText: lastInput.text, findingIds: [...formFindings],
      top: lastResult.results.slice(0, 4).map(r => ({ name: r.dx.name, id: r.dx.id, share: Math.round(r.share), cantMiss: !!r.dx.cantMiss })),
      redFlags: lastResult.redFlags.map(f => f.label),
    };
    history.unshift(rec); store.set(KEY.history, history);
    toast('Zapisano wywiad w historii.', 'ok');
  }

  /* =================================================================== */
  /*  WIDOK: HISTORIA                                                     */
  /* =================================================================== */
  function viewHistoria(vr) {
    vr.innerHTML = `
      <div class="page-head"><h1 class="serif">Historia wywiadów</h1>
        <p>Twój prywatny notatnik klinicysty. Przechowywany lokalnie w tej przeglądarce — bez danych pacjenta.</p></div>
      ${history.length ? `
        <div class="flex justify-between items-center mb-4">
          <input class="input" id="histSearch" placeholder="Szukaj po prezentacji lub rozpoznaniu…" style="max-width:340px" />
          <button class="btn btn-danger btn-sm" id="histClear">${svg(I.trash, 15)} Wyczyść historię</button>
        </div>
        <div id="histList"></div>` : emptyState(I.historia, 'Brak zapisanych wywiadów', 'Wykonaj analizę w „Nowy wywiad” i kliknij „Zapisz”.')}`;

    if (!history.length) return;
    const list = document.getElementById('histList');
    const paint = (q = '') => {
      const items = history.filter(h => (h.presentationLabel + ' ' + h.top.map(t => t.name).join(' ')).toLowerCase().includes(q.toLowerCase()));
      list.innerHTML = items.length ? items.map(h => `
        <div class="list-row" data-hist="${h.id}" style="cursor:pointer">
          <span class="lead-ico">${svg(presIcon(h.presentationId), 18)}</span>
          <div class="body"><b>${esc(h.presentationLabel)}</b>
            <p>${h.demographics.age ? h.demographics.age + ' l. ' : ''}${h.demographics.sex || ''} · ${h.top.slice(0, 3).map(t => esc(t.name) + ' ' + t.share + '%').join(' · ')}</p></div>
          ${h.redFlags.length ? `<span class="badge badge-crit">${svg(I.flag, 12)} ${h.redFlags.length}</span>` : ''}
          <span class="when">${fmtDate(h.date)}</span>
          <button class="btn btn-subtle btn-sm" data-del="${h.id}">${svg(I.trash, 15)}</button>
        </div>`).join('') : `<p class="muted small">Brak wyników dla „${esc(q)}”.</p>`;
      list.querySelectorAll('[data-hist]').forEach(r => r.addEventListener('click', e => { if (!e.target.closest('[data-del]')) openHistory(r.dataset.hist); }));
      list.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => { history = history.filter(x => x.id !== b.dataset.del); store.set(KEY.history, history); paint(document.getElementById('histSearch').value); }));
    };
    paint();
    document.getElementById('histSearch').addEventListener('input', e => paint(e.target.value));
    document.getElementById('histClear').addEventListener('click', () => {
      modal('Wyczyścić całą historię?', '<p class="small muted">Tej operacji nie można cofnąć. Usuniętych zostanie ' + history.length + ' wpisów.</p>',
        `<button class="btn btn-ghost" data-close>Anuluj</button><button class="btn btn-danger" id="confClear">Usuń wszystko</button>`);
      document.getElementById('confClear').addEventListener('click', () => { history = []; store.set(KEY.history, history); closeModal(); renderShell('historia'); toast('Historia wyczyszczona.'); });
    });
  }
  function openHistory(id) {
    const h = history.find(x => x.id === id); if (!h) return;
    modal(h.presentationLabel, `
      <div class="flex gap-2 wrap mb-4"><span class="badge">${fmtDate(h.date)}</span>
        <span class="badge">kontekst: ${esc(h.context)}</span>
        ${h.demographics.age ? `<span class="badge">${h.demographics.age} l.</span>` : ''}${h.demographics.sex ? `<span class="badge">${esc(h.demographics.sex)}</span>` : ''}</div>
      <h5 class="label mb-2">Wprowadzony opis</h5>
      <div class="findings-box mb-4" style="display:block">${esc(h.inputText) || '<span class="empty">—</span>'}</div>
      <h5 class="label mb-2">Znaleziska</h5>
      <div class="flex wrap gap-2 mb-4">${h.findingIds.map(f => `<span class="chip is-active">${esc((D.findings[f] || {}).label || f)}</span>`).join('') || '<span class="hint">—</span>'}</div>
      <h5 class="label mb-2">Różnicowanie</h5>
      ${h.top.map(t => `<div class="flex items-center justify-between mb-2"><span>${t.cantMiss ? '⚠ ' : ''}${esc(t.name)}</span><b class="tnum">${t.share}%</b></div>`).join('')}
      ${h.redFlags.length ? `<div class="alert alert-crit mt-3">${svg(I.flag, 15, 'alert-icon')}<span>${h.redFlags.map(esc).join('; ')}</span></div>` : ''}`,
      `<button class="btn btn-ghost" data-close>Zamknij</button>`);
  }

  /* =================================================================== */
  /*  WIDOK: BAZA WIEDZY                                                  */
  /* =================================================================== */
  function viewBaza(vr) {
    const allDx = [];
    D.presentations.forEach(p => p.diagnoses.forEach(d => { if (!allDx.find(x => x.id === d.id)) allDx.push({ ...d, presLabel: p.label, presId: p.id }); }));
    vr.innerHTML = `
      <div class="page-head"><h1 class="serif">Baza wiedzy</h1>
        <p>Przeglądaj jednostki chorobowe i objawy uwzględnione w prototypie. Strategia: najczęstsze + najgroźniejsze.</p></div>
      <div class="flex gap-2 mb-5 wrap">
        <input class="input" id="kbSearch" placeholder="Szukaj choroby, objawu lub kodu ICD…" style="max-width:360px" />
        <div class="flex gap-2"><button class="chip is-active" data-tab="dx">Choroby (${allDx.length})</button><button class="chip" data-tab="sx">Objawy</button></div>
      </div>
      <div id="kbBody"></div>`;

    const body = document.getElementById('kbBody');
    let tab = 'dx', q = '';
    const symptoms = Object.entries(D.findings).filter(([, f]) => f.type === 'symptom' || f.type === 'sign');

    function paint() {
      if (tab === 'dx') {
        const items = allDx.filter(d => (d.name + ' ' + d.icd + ' ' + d.presLabel).toLowerCase().includes(q.toLowerCase()));
        body.innerHTML = `<div class="kb-grid">${items.map(d => `
          <div class="card kb-card" data-dx="${d.id}">
            <div class="flex items-center justify-between mb-2"><h4>${d.cantMiss ? '⚠ ' : ''}${esc(d.name)}</h4></div>
            <span class="icd">${esc(d.icd)}</span> · <span class="hint">${esc(d.presLabel)}</span>
            <p class="muted small mt-3">${esc((d.tests || []).slice(0, 2).join(' · '))}</p>
          </div>`).join('')}</div>`;
        body.querySelectorAll('[data-dx]').forEach(c => c.addEventListener('click', () => openDx(c.dataset.dx, allDx)));
      } else {
        const items = symptoms.filter(([, f]) => f.label.toLowerCase().includes(q.toLowerCase()));
        body.innerHTML = `<div class="kb-grid">${items.map(([id, f]) => {
          const dz = allDx.filter(d => d.lr && d.lr[id]).map(d => d.name).slice(0, 4);
          return `<div class="card kb-card" style="cursor:default">
            <h4>${esc(f.label)}</h4><span class="hint">${f.type === 'sign' ? 'objaw przedmiotowy' : 'objaw podmiotowy'}</span>
            <p class="muted small mt-3">${dz.length ? 'Różnicowanie: ' + dz.map(esc).join(', ') : 'Powiązania w opracowaniu'}</p></div>`;
        }).join('')}</div>`;
      }
    }
    paint();
    vr.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { vr.querySelectorAll('[data-tab]').forEach(x => x.classList.remove('is-active')); b.classList.add('is-active'); tab = b.dataset.tab; paint(); }));
    document.getElementById('kbSearch').addEventListener('input', e => { q = e.target.value; paint(); });
  }
  function openDx(id, allDx) {
    const d = allDx.find(x => x.id === id); if (!d) return;
    const keyFindings = Object.entries(d.lr || {}).filter(([k]) => D.findings[k] && (D.findings[k].type === 'symptom' || D.findings[k].type === 'sign'))
      .sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `<span class="driver up">${esc(D.findings[k].label)} <span class="lr">×${v}</span></span>`).join('');
    modal((d.cantMiss ? '⚠ ' : '') + d.name, `
      <div class="flex gap-2 wrap mb-4"><span class="badge">${esc(d.icd)}</span><span class="badge badge-accent">${esc(d.presLabel)}</span>${d.cantMiss ? '<span class="badge badge-crit">nie przeocz</span>' : ''}</div>
      <h5 class="label mb-2">Objawy najsilniej wskazujące</h5><div class="driver-list mb-4">${keyFindings || '<span class="hint">—</span>'}</div>
      <h5 class="label mb-2">Prawdopodobieństwo wyjściowe (kontekst)</h5>
      <div class="flex wrap gap-2 mb-4">${Object.entries(d.prior || {}).map(([k, v]) => `<span class="chip" style="cursor:default">${esc(k)}: ${(v * 100).toFixed(1)}%</span>`).join('')}</div>
      <h5 class="label mb-2">Zalecane badania</h5><ul class="small mb-4">${(d.tests || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      <h5 class="label mb-2">Postępowanie</h5><ul class="small mb-4">${(d.management || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      <h5 class="label mb-2">Źródła</h5><p class="source-tag">${(d.sources || []).map(esc).join(' · ')}</p>`,
      `<button class="btn btn-ghost" data-close>Zamknij</button>`);
  }

  /* =================================================================== */
  /*  WIDOK: ZGŁOSZENIA I POPRAWKI                                        */
  /* =================================================================== */
  function viewZgloszenia(vr) {
    vr.innerHTML = `
      <div class="page-head"><h1 class="serif">Zgłoszenia i poprawki</h1>
        <p>Uważasz, że różnicowanie jest błędne? Napisz, dlaczego. Po weryfikacji korekta wpływa na kolejne wyniki — z zachowaniem pochodzenia zmiany.</p></div>

      <div class="alert alert-info mb-5">${svg(I.info, 16, 'alert-icon')}
        <span>W tym prototypie weryfikacja działa lokalnie: system ocenia, czy uzasadnienie jest merytoryczne, i jeśli tak — stosuje korektę wagi dla danej hipotezy w Twojej instancji. W wersji produkcyjnej zgłoszenie trafia do recenzji eksperckiej, a zatwierdzona zmiana jest publikowana dla wszystkich.</span></div>

      <div class="grid-2" style="align-items:start">
        <div class="card card-pad">
          <h3 class="serif mb-4" style="font-size:var(--fs-lg)">Nowe zgłoszenie</h3>
          <div class="field mb-3"><label class="label">Ścieżka kliniczna</label>
            <select class="select" id="fbPres">${D.presentations.map(p => `<option value="${p.id}">${p.label}</option>`).join('')}</select></div>
          <div class="field mb-3"><label class="label">Rozpoznanie, którego dotyczy</label><select class="select" id="fbDx"></select></div>
          <div class="field mb-3"><label class="label">Twoja ocena</label>
            <select class="select" id="fbDir">
              <option value="up">Powinno być wyżej w różnicowaniu</option>
              <option value="down">Powinno być niżej</option>
              <option value="wrong">Nie pasuje do tej prezentacji</option>
            </select></div>
          <div class="field mb-4"><label class="label">Uzasadnienie kliniczne</label>
            <textarea class="textarea" id="fbReason" rows="4" placeholder="Opisz, dlaczego — najlepiej z odwołaniem do objawu, kryterium lub wytycznych. Im bardziej merytorycznie, tym większa szansa na uwzględnienie."></textarea></div>
          <button class="btn btn-primary btn-block" id="fbSubmit">${svg(I.flag, 16)} Wyślij do weryfikacji</button>
        </div>

        <div>
          <h3 class="serif mb-4" style="font-size:var(--fs-lg)">Twoje zgłoszenia</h3>
          <div id="fbList"></div>
        </div>
      </div>`;

    const presSel = document.getElementById('fbPres'), dxSel = document.getElementById('fbDx');
    const fillDx = () => { const p = E.getPresentation(presSel.value); dxSel.innerHTML = p.diagnoses.map(d => `<option value="${d.id}">${d.name}</option>`).join(''); };
    fillDx(); presSel.addEventListener('change', fillDx);

    document.getElementById('fbSubmit').addEventListener('click', () => {
      const reason = document.getElementById('fbReason').value.trim();
      if (reason.length < 12) { toast('Dodaj merytoryczne uzasadnienie (min. kilkanaście znaków).', 'warn'); return; }
      const presId = presSel.value, dxId = dxSel.value, dir = document.getElementById('fbDir').value;
      const accepted = applyFeedback(presId, dxId, dir, reason);
      toast(accepted ? 'Zaakceptowano — korekta zastosowana lokalnie.' : 'Przyjęto do weryfikacji. Dodaj więcej uzasadnienia, by zwiększyć szansę uwzględnienia.', accepted ? 'ok' : 'warn');
      document.getElementById('fbReason').value = '';
      paintFb();
    });

    function paintFb() {
      const list = document.getElementById('fbList');
      if (!feedback.length) { list.innerHTML = emptyState(I.zgloszenia, 'Brak zgłoszeń', 'Twoje uwagi pomagają doskonalić różnicowanie.'); return; }
      list.innerHTML = feedback.map(f => {
        const applied = corrections[f.presId] && corrections[f.presId][f.dxId];
        return `<div class="list-row" style="align-items:flex-start">
          <span class="lead-ico">${svg(presIcon(f.presId), 18)}</span>
          <div class="body">
            <div class="flex items-center gap-2 wrap"><b>${esc(f.dxName)}</b>
              ${f.status === 'accepted' ? `<span class="badge badge-ok">${svg(I.check, 12)} zaakceptowano</span>` : `<span class="badge badge-warn">w weryfikacji</span>`}
              ${applied ? `<span class="badge badge-accent">waga ×${applied}</span>` : ''}</div>
            <p style="white-space:normal">${esc(f.presLabel)} · ${({ up: 'wyżej', down: 'niżej', wrong: 'nie pasuje' }[f.dir])} — „${esc(f.reason)}”</p>
          </div>
          <div class="flex col gap-2"><span class="when">${new Date(f.date).toLocaleDateString('pl-PL')}</span>
            <button class="btn btn-subtle btn-sm" data-fbdel="${f.id}">${svg(I.trash, 14)}</button></div>
        </div>`;
      }).join('');
      list.querySelectorAll('[data-fbdel]').forEach(b => b.addEventListener('click', () => {
        const f = feedback.find(x => x.id === b.dataset.fbdel);
        if (f && corrections[f.presId]) { delete corrections[f.presId][f.dxId]; store.set(KEY.corrections, corrections); }
        feedback = feedback.filter(x => x.id !== b.dataset.fbdel); store.set(KEY.feedback, feedback); paintFb();
      }));
    }
    paintFb();
  }
  function scoreReason(r) {
    let q = 0; const t = r.toLowerCase();
    if (r.length >= 40) q++;
    if (/(ponieważ|gdyż|bo |kryteri|wytyczn|objaw|czuł|swoist|lr|ryzyk|badani|wynik|guideline|score|skal)/.test(t)) q++;
    if (r.length >= 120) q++;
    return q;
  }
  function applyFeedback(presId, dxId, dir, reason) {
    const quality = scoreReason(reason);
    const accepted = quality >= 2;
    const pres = E.getPresentation(presId);
    const rec = { id: 'f' + Date.now(), date: new Date().toISOString(), presId, dxId, dir, reason,
      dxName: pres.diagnoses.find(d => d.id === dxId).name, presLabel: pres.label,
      status: accepted ? 'accepted' : 'review', quality };
    feedback.unshift(rec); store.set(KEY.feedback, feedback);
    if (accepted) {
      const mult = dir === 'up' ? 1.8 : dir === 'down' ? 0.5 : 0.2;
      corrections[presId] = corrections[presId] || {};
      corrections[presId][dxId] = Math.round(((corrections[presId][dxId] || 1) * mult) * 100) / 100;
      store.set(KEY.corrections, corrections);
    }
    return accepted;
  }
  // szybkie zgłoszenie z panelu wyników
  function openFeedback(presId, dxId) {
    const pres = E.getPresentation(presId);
    modal('Zgłoś poprawkę różnicowania', `
      <p class="small muted mb-4">Twoja uwaga pomaga doskonalić wyniki. Po weryfikacji merytorycznej korekta wpłynie na kolejne raporty (lokalnie w tym prototypie).</p>
      <div class="field mb-3"><label class="label">Rozpoznanie</label>
        <select class="select" id="ofDx">${pres.diagnoses.map(d => `<option value="${d.id}" ${d.id === dxId ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</select></div>
      <div class="field mb-3"><label class="label">Twoja ocena</label>
        <select class="select" id="ofDir"><option value="up">Powinno być wyżej</option><option value="down">Powinno być niżej</option><option value="wrong">Nie pasuje do tej prezentacji</option></select></div>
      <div class="field"><label class="label">Uzasadnienie kliniczne</label>
        <textarea class="textarea" id="ofReason" rows="4" placeholder="Np. „W tej prezentacji rozwarstwienie jest niedoszacowane, ponieważ ból rozdzierający i różnica ciśnień to kryteria wysokiego ryzyka wg wytycznych ESC.”"></textarea></div>`,
      `<button class="btn btn-ghost" data-close>Anuluj</button><button class="btn btn-primary" id="ofSend">${svg(I.flag, 16)} Wyślij</button>`);
    document.getElementById('ofSend').addEventListener('click', () => {
      const reason = document.getElementById('ofReason').value.trim();
      if (reason.length < 12) { toast('Dodaj merytoryczne uzasadnienie.', 'warn'); return; }
      const accepted = applyFeedback(presId, document.getElementById('ofDx').value, document.getElementById('ofDir').value, reason);
      closeModal();
      toast(accepted ? 'Zaakceptowano — korekta zastosowana. Analizuję ponownie…' : 'Przyjęto do weryfikacji.', accepted ? 'ok' : 'warn');
      if (accepted && lastResult) reRun();
    });
  }

  /* =================================================================== */
  /*  WIDOK: PROFIL                                                       */
  /* =================================================================== */
  function viewProfil(vr) {
    const accepted = Object.values(corrections).reduce((a, o) => a + Object.keys(o).length, 0);
    vr.innerHTML = `
      <div class="page-head"><h1 class="serif">Profil</h1><p>Dane widoczne tylko dla Ciebie, przechowywane lokalnie.</p></div>
      <div class="grid-2" style="align-items:start">
        <div class="card card-pad">
          <div class="flex items-center gap-4 mb-5">
            <span class="avatar" style="width:64px;height:64px;font-size:var(--fs-lg)">${initials(profile.name)}</span>
            <div><h3 class="serif" style="font-size:var(--fs-lg)">${esc(profile.name)}</h3><p class="muted small">${esc(profile.role)} · konto od ${new Date(session.since).toLocaleDateString('pl-PL')}</p></div>
          </div>
          <div class="field mb-3"><label class="label">Imię i nazwisko / podpis zawodowy</label><input class="input" id="pName" value="${esc(profile.name)}" /></div>
          <div class="field mb-3"><label class="label">Rola</label><select class="select" id="pRole"><option ${profile.role === 'Lekarz' ? 'selected' : ''}>Lekarz</option><option ${profile.role === 'Student' ? 'selected' : ''}>Student</option></select></div>
          <div class="field mb-3"><label class="label">Specjalizacja</label><input class="input" id="pSpec" value="${esc(profile.specialization)}" placeholder="np. medycyna ratunkowa" /></div>
          <div class="field mb-4"><label class="label">Ośrodek / uczelnia</label><input class="input" id="pInst" value="${esc(profile.institution)}" placeholder="np. SOR, Szpital Uniwersytecki" /></div>
          <button class="btn btn-primary" id="pSave">${svg(I.save, 16)} Zapisz profil</button>
        </div>
        <div class="card card-pad">
          <h3 class="serif mb-4" style="font-size:var(--fs-lg)">Twoja aktywność</h3>
          <div class="grid-2">
            <div class="stat" style="padding:0"><div class="v tnum">${history.length}</div><div class="k">wywiadów</div></div>
            <div class="stat" style="padding:0"><div class="v tnum">${feedback.length}</div><div class="k">zgłoszeń</div></div>
            <div class="stat" style="padding:0 0;margin-top:var(--sp-4)"><div class="v tnum">${accepted}</div><div class="k">zastosowanych korekt</div></div>
            <div class="stat" style="padding:0;margin-top:var(--sp-4)"><div class="v tnum">${feedback.filter(f => f.status === 'accepted').length}</div><div class="k">zaakceptowanych uwag</div></div>
          </div>
          <div class="hr"></div>
          <p class="muted small">Differo nie tworzy kartoteki pacjenta. Historia wywiadów to wyłącznie Twój notatnik kliniczny.</p>
        </div>
      </div>`;
    document.getElementById('pSave').addEventListener('click', () => {
      profile = { name: document.getElementById('pName').value.trim() || 'Użytkownik', role: document.getElementById('pRole').value,
        specialization: document.getElementById('pSpec').value.trim(), institution: document.getElementById('pInst').value.trim() };
      store.set(KEY.profile, profile);
      session.name = profile.name; session.role = profile.role; store.set(KEY.session, session);
      toast('Profil zapisany.', 'ok'); renderShell('profil');
    });
  }

  /* =================================================================== */
  /*  WIDOK: USTAWIENIA                                                   */
  /* =================================================================== */
  function viewUstawienia(vr) {
    const theme = store.get(KEY.theme, 'light');
    vr.innerHTML = `
      <div class="page-head"><h1 class="serif">Ustawienia</h1><p>Wygląd, dostępność i dane lokalne.</p></div>
      <div class="card card-pad mb-5">
        <h3 class="serif mb-4" style="font-size:var(--fs-lg)">Motyw</h3>
        <div class="role-toggle" id="themeSel" style="max-width:460px;grid-template-columns:1fr 1fr 1fr">
          ${['light', 'dark', 'auto'].map(t => `<div class="role-opt ${theme === t ? 'is-active' : ''}" data-theme-opt="${t}">${{ light: 'Jasny', dark: 'Ciemny', auto: 'Auto' }[t]}</div>`).join('')}
        </div>
        <label class="checkbox mt-5"><input type="checkbox" id="rmToggle" ${prefs.reducedMotion ? 'checked' : ''} /><span>Ogranicz animacje (mniej ruchu)</span></label>
      </div>
      <div class="card card-pad mb-5">
        <h3 class="serif mb-3" style="font-size:var(--fs-lg)">Dane lokalne</h3>
        <p class="muted small mb-4">Wszystko jest przechowywane w tej przeglądarce. Możesz wyeksportować lub usunąć dane.</p>
        <div class="flex gap-3 wrap">
          <button class="btn btn-ghost" id="btnExport">${svg(I.download, 16)} Eksportuj dane (JSON)</button>
          <button class="btn btn-danger" id="btnWipe">${svg(I.trash, 16)} Usuń dane lokalne</button>
        </div>
      </div>
      <div class="card card-pad">
        <h3 class="serif mb-3" style="font-size:var(--fs-lg)">Sesja</h3>
        <p class="muted small mb-4">Zalogowano jako ${esc(session.email)} (${esc(session.role)}).</p>
        <button class="btn btn-ghost" id="btnLogout">${svg(I.logout, 16)} Wyloguj</button>
      </div>`;

    vr.querySelectorAll('[data-theme-opt]').forEach(o => o.addEventListener('click', () => {
      vr.querySelectorAll('[data-theme-opt]').forEach(x => x.classList.remove('is-active')); o.classList.add('is-active'); setTheme(o.dataset.themeOpt);
    }));
    document.getElementById('rmToggle').addEventListener('change', e => { prefs.reducedMotion = e.target.checked; store.set(KEY.prefs, prefs); });
    document.getElementById('btnExport').addEventListener('click', () => {
      const blob = new Blob([JSON.stringify({ profile, history, feedback, corrections, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'differo-dane.json'; a.click();
      toast('Wyeksportowano dane.', 'ok');
    });
    document.getElementById('btnWipe').addEventListener('click', () => {
      modal('Usunąć wszystkie dane lokalne?', '<p class="small muted">Usunięte zostaną: historia, zgłoszenia i korekty. Profil i sesja pozostaną.</p>',
        `<button class="btn btn-ghost" data-close>Anuluj</button><button class="btn btn-danger" id="confWipe">Usuń</button>`);
      document.getElementById('confWipe').addEventListener('click', () => {
        history = []; feedback = []; corrections = {};
        store.set(KEY.history, []); store.set(KEY.feedback, []); store.set(KEY.corrections, {});
        closeModal(); renderShell('ustawienia'); toast('Dane lokalne usunięte.');
      });
    });
    document.getElementById('btnLogout').addEventListener('click', () => {
      store.del(KEY.session); session = null; location.hash = ''; toast('Wylogowano.'); render();
    });
  }

  /* =================================================================== */
  /*  WIDOK: PRAWNE                                                       */
  /* =================================================================== */
  function viewPrawne(vr) {
    const tabs = ['Regulamin', 'Polityka prywatności', 'Disclaimer i status wyrobu'];
    vr.innerHTML = `
      <div class="page-head"><h1 class="serif">Informacje prawne</h1></div>
      <div class="legal">
        <div class="tabs">${tabs.map((t, i) => `<button class="chip ${i === 0 ? 'is-active' : ''}" data-ltab="${i}">${t}</button>`).join('')}</div>
        <div id="legalBody"></div>
      </div>`;
    const body = document.getElementById('legalBody'); const txt = legalText();
    const paint = i => { body.innerHTML = txt[i]; };
    paint(0);
    vr.querySelectorAll('[data-ltab]').forEach(b => b.addEventListener('click', () => { vr.querySelectorAll('[data-ltab]').forEach(x => x.classList.remove('is-active')); b.classList.add('is-active'); paint(+b.dataset.ltab); }));
  }
  function legalText() {
    return [
      `<h3>Regulamin korzystania z Differo</h3>
       <p><b>1. Charakter narzędzia.</b> Differo jest systemem wsparcia decyzji klinicznych przeznaczonym wyłącznie dla profesjonalistów medycznych (lekarzy, studentów medycyny). Nie służy do samodiagnozy i nie jest przeznaczony dla pacjentów.</p>
       <p><b>2. Brak diagnozy.</b> Wyniki (różnicowanie, procenty, skale) mają charakter pomocniczy i edukacyjny. Nie stanowią rozpoznania ani zalecenia leczniczego. Ostateczna decyzja kliniczna oraz odpowiedzialność za nią należą do użytkownika.</p>
       <p><b>3. Zgodne użycie.</b> Użytkownik zobowiązuje się korzystać z narzędzia zgodnie z przeznaczeniem i aktualną wiedzą medyczną oraz nie polegać bezkrytycznie na wynikach (ryzyko automation bias).</p>
       <p><b>4. Zakaz danych osobowych.</b> Użytkownik nie wprowadza danych identyfikujących pacjenta (imię, nazwisko, PESEL, adres, daty, kontakt). System wspiera wykrywanie takich danych, ale odpowiedzialność za ich niewprowadzanie spoczywa na użytkowniku.</p>
       <p><b>5. Współtworzenie.</b> Zgłaszając poprawki, użytkownik wyraża zgodę na ich wykorzystanie do doskonalenia narzędzia. Zgłoszenia podlegają weryfikacji.</p>
       <p><b>6. Ograniczenie odpowiedzialności.</b> Differo (prototyp) jest dostarczany „tak jak jest”, bez gwarancji co do kompletności ani trafności. Twórcy nie ponoszą odpowiedzialności za skutki decyzji podjętych z użyciem narzędzia.</p>`,
      `<h3>Polityka prywatności</h3>
       <p><b>Co zbieramy.</b> W tej wersji prototypowej dane (profil, historia wywiadów, zgłoszenia, ustawienia) są przechowywane wyłącznie lokalnie w Twojej przeglądarce (localStorage). Nie są wysyłane na serwer.</p>
       <p><b>Czego nie zbieramy.</b> Nie zbieramy i nie przechowujemy danych identyfikujących pacjenta. Nie tworzymy kartoteki pacjenta. Treść wywiadu jest przetwarzana lokalnie na potrzeby analizy.</p>
       <p><b>Anonimizacja.</b> Wbudowany mechanizm wykrywa potencjalne dane osobowe (PESEL, imię i nazwisko, adres, telefon, e-mail, daty) i umożliwia ich usunięcie przed analizą.</p>
       <p><b>Dane szczególnej kategorii.</b> Dane zdrowotne są szczególną kategorią danych w rozumieniu RODO (art. 9). Narzędzie zaprojektowano tak, by nie wiązać żadnych danych klinicznych z tożsamością pacjenta.</p>
       <p><b>Twoja kontrola.</b> W każdej chwili możesz wyeksportować lub trwale usunąć swoje dane lokalne (Ustawienia → Dane lokalne).</p>
       <p><b>Wersja produkcyjna.</b> Wdrożenie kliniczne wymagałoby m.in. DPIA, inspektora ochrony danych, podstawy prawnej przetwarzania, pseudonimizacji, szyfrowania, kontroli dostępu i rejestru operacji na danych.</p>`,
      `<h3>Disclaimer i status wyrobu</h3>
       <div class="alert alert-warn mb-4">${svg(I.info, 16, 'alert-icon')}<span><b>To jest prototyp edukacyjny, nie wyrób medyczny.</b> Nie posiada certyfikacji CE/MDR i nie może być stosowany do rzeczywistych decyzji o opiece nad pacjentem.</span></div>
       <p><b>Przeznaczenie.</b> Demonstracja przejrzystego silnika różnicowania opartego na walidowanych skalach i przybliżonych ilorazach wiarygodności z literatury. Procenty to względny udział w obrębie różnicowania, a nie kalibrowane prawdopodobieństwo kliniczne.</p>
       <p><b>Droga do produktu.</b> System z prawdziwymi prawdopodobieństwami wymaga danych z wielu placówek, potwierdzonych rozpoznań końcowych („gold standard”), kalibracji oraz walidacji zewnętrznej i prospektywnej, a w UE — najpewniej kwalifikacji jako oprogramowanie będące wyrobem medycznym i klasyfikacji jako AI wysokiego ryzyka.</p>
       <p><b>Standardy docelowe.</b> Raportowanie wg TRIPOD+AI, ocena ryzyka błędu wg PROBAST+AI, zasady GMLP oraz stałe monitorowanie modelu po wdrożeniu.</p>
       <p><b>Bezpieczeństwo użycia.</b> Zawsze zachowuj czujność wobec hipotez spoza listy, obrazu nietypowego i czerwonych flag — które prezentujemy niezależnie od wyniku procentowego.</p>`,
    ];
  }

  /* --------------------------- pomocnicze --------------------------- */
  function emptyState(icon, title, sub) {
    return `<div class="empty-state"><div class="ico">${svg(icon, 26)}</div><h3>${esc(title)}</h3><p class="small mt-2">${esc(sub)}</p></div>`;
  }

  /* ------------------------------ router ----------------------------- */
  function render() {
    if (prefs.reducedMotion) document.documentElement.style.setProperty('--dur', '0.001s');
    if (!session || !session.loggedIn) { renderAuth(); return; }
    const view = (location.hash || '#pulpit').replace('#', '');
    renderShell(TITLES[view] ? view : 'pulpit');
  }
  window.addEventListener('hashchange', render);
  render();
})();
