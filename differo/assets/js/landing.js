/* ============================================================================
   Differo — landing: motyw, żywe demo
   ========================================================================== */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);

  /* ---- rok w stopce ---- */
  const yEl = $('#year'); if (yEl) yEl.textContent = new Date().getFullYear();

  /* ---- przełącznik motywu ---- */
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t === 'dark' ? 'dark' : 'light');
    try { localStorage.setItem('dfr-theme', t); } catch (e) {}
  }
  $('#themeToggle')?.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    applyTheme(cur === 'dark' ? 'light' : 'dark');
  });

  /* ---- żywe demo ---- */
  const examples = [
    { t: 'Ból w klatce', text: 'Mężczyzna 64 lata, ból zamostkowy przy wysiłku promieniujący do lewej ręki, zlewne poty, nudności. Nadciśnienie, pali.' },
    { t: 'Ból brzucha', text: 'Ból brzucha zaczął się w okolicy pępka, przemieścił do prawego dołu biodrowego, brak apetytu, nudności, stan podgorączkowy, dodatni objaw Blumberga.' },
    { t: 'Duszność', text: 'Nagła duszność, ból opłucnowy, obrzęk i ból lewej łydki, tachykardia, niska saturacja. Niedawny zabieg ortopedyczny.' },
    { t: 'Ból głowy', text: 'Nagły, najgorszy ból głowy w życiu, jak grom, sztywność karku, nudności i wymioty.' },
  ];

  const exWrap = $('#demoExamples');
  examples.forEach((ex, i) => {
    const b = document.createElement('button');
    b.className = 'chip'; b.textContent = ex.t;
    b.addEventListener('click', () => { $('#demoInput').value = ex.text; run(); });
    exWrap.appendChild(b);
  });

  function guessPresentation(present) {
    let best = null, bestScore = -1;
    DFR.data.presentations.forEach(p => {
      const ids = new Set();
      p.diagnoses.forEach(d => Object.keys(d.lr || {}).forEach(k => ids.add(k)));
      const score = present.filter(f => ids.has(f)).length;
      if (score > bestScore) { bestScore = score; best = p; }
    });
    return best;
  }

  function band(share) { return share >= 45 ? '' : share >= 25 ? 't-warn' : ''; }

  function run() {
    const text = $('#demoInput').value.trim();
    const out = $('#demoResult');
    if (!text) { out.innerHTML = '<p class="small muted mt-3">Wpisz przypadek lub wybierz przykład powyżej.</p>'; return; }

    // ochrona PII również w demo
    const pii = DFR.engine.detectPII(text);
    const ex = DFR.engine.extractFindings(text);
    const pres = guessPresentation(ex.present);
    if (!pres || ex.present.length === 0) {
      out.innerHTML = '<div class="alert alert-info mt-3"><span>Nie rozpoznano wystarczająco objawów. Spróbuj jednego z przykładów — prototyp obejmuje 11 ścieżek klinicznych.</span></div>';
      return;
    }
    const res = DFR.engine.analyze({ presentationId: pres.id, findingIds: ex.present, context: 'SOR', corrections: {} });
    const top = res.results.slice(0, 3);

    let html = '';
    if (pii.length) {
      html += `<div class="alert alert-warn mt-3" style="font-size:var(--fs-xs)"><svg class="alert-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg><span>Wykryto możliwe dane osobowe (${pii.length}). W aplikacji zostaną oznaczone do usunięcia.</span></div>`;
    }
    html += `<div class="flex items-center justify-between mt-3 mb-2"><span class="badge badge-accent">${pres.label}</span><span class="small muted">kontekst: SOR</span></div>`;

    top.forEach((r, i) => {
      const drv = r.drivers.slice(0, 3).map(d => `<span class="${d.dir === 'up' ? 'up' : ''}">${d.dir === 'up' ? '↑' : '↓'} ${d.label}</span>`).join(' · ');
      html += `
        <div class="dx-item fade-in" style="animation-delay:${i * 0.06}s">
          <div class="dx-head">
            <span class="dx-name">${r.dx.cantMiss ? '⚠ ' : ''}${r.dx.name}</span>
            <span class="dx-pct tnum">${r.share.toFixed(0)}%</span>
          </div>
          <div class="prob-row"><div class="prob-track"><div class="prob-fill ${band(r.share)}" style="width:${Math.max(4, r.share)}%"></div></div></div>
          ${drv ? `<div class="dx-drivers">${drv}</div>` : ''}
        </div>`;
    });

    if (res.redFlags.length) {
      html += `<div class="alert alert-crit mt-3" style="font-size:var(--fs-xs)"><svg class="alert-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 22V4M4 4l9 5-9 5"/></svg><span><b>Czerwona flaga:</b> ${res.redFlags[0].label}</span></div>`;
    }

    html += `<a class="btn btn-ghost btn-block btn-sm mt-3" href="app.html#wywiad">Pełne uzasadnienie, badania i skale →</a>`;
    out.innerHTML = html;
  }

  $('#demoRun')?.addEventListener('click', run);
})();
