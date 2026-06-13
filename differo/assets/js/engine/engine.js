/* ============================================================================
   Differo — silnik: NLP (PL), wykrywanie PII (RODO), scoring bayesowski.
   Przejrzysty i regułowy — każdy wynik da się prześledzić i wyjaśnić.
   ========================================================================== */
window.DFR = window.DFR || {};

DFR.engine = (function () {
  'use strict';
  const F = DFR.data.findings;
  const PRES = DFR.data.presentations;

  /* ---- normalizacja: lowercase + usunięcie diakrytyków do dopasowań ---- */
  function norm(s) {
    return (s || '')
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/ł/g, 'l'); // ł → l (NFD nie rozkłada ł)
  }

  /* ====================== 1) NLP — ekstrakcja znalezisk ================= */
  const NEG = ['bez', 'nie', 'neguje', 'zaprzecza', 'brak', 'nieobecn', 'wyklucz'];

  function extractFindings(text) {
    const t = norm(text);
    const present = new Map();   // id -> matched phrase
    const absent = new Map();
    for (const id in F) {
      const def = F[id];
      if (!def.syn) continue;
      for (const phrase of def.syn) {
        const p = norm(phrase);
        const idx = t.indexOf(p);
        if (idx === -1) continue;
        // sprawdź negację w oknie ~22 znaków przed frazą (bez przekraczania zdania)
        const windowStart = Math.max(0, idx - 22);
        const before = t.slice(windowStart, idx);
        const sentenceCut = Math.max(before.lastIndexOf('.'), before.lastIndexOf(','), before.lastIndexOf(';'));
        const scope = sentenceCut >= 0 ? before.slice(sentenceCut) : before;
        const negated = NEG.some(n => scope.includes(n));
        if (negated) { if (!present.has(id)) absent.set(id, phrase); }
        else { present.set(id, phrase); absent.delete(id); }
        break;
      }
    }
    return {
      present: [...present.keys()],
      absent: [...absent.keys()],
      matched: present,
    };
  }

  /* ====================== 2) PII — ochrona danych ===================== */
  function detectPII(text) {
    if (!text) return [];
    const hits = [];
    const push = (type, label, m) => hits.push({ type, label, value: m[0], index: m.index });

    const patterns = [
      { type: 'pesel', label: 'PESEL', re: /\b\d{11}\b/g },
      { type: 'email', label: 'adres e-mail', re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },
      { type: 'phone', label: 'numer telefonu', re: /\b(?:\+48[\s-]?)?\d{3}[\s-]?\d{3}[\s-]?\d{3}\b/g },
      { type: 'dob', label: 'data (możliwa data urodzenia)', re: /\b\d{1,2}[.\-/]\d{1,2}[.\-/](?:19|20)\d{2}\b/g },
      { type: 'street', label: 'adres', re: /\b(?:ul\.|ulica|al\.|aleja|os\.|osiedle|pl\.)\s+[A-ZŁŚŻŹĆŃÓĄĘ][\wąćęłńóśźż]+/g },
      // klasyczny przypadek „Jan K.” oraz pełne imię i nazwisko
      { type: 'name', label: 'imię i nazwisko', re: /\b[A-ZŁŚŻŹĆŃÓĄĘ][a-ząćęłńóśźż]{2,}\s+[A-ZŁŚŻŹĆŃÓĄĘ](?:[a-ząćęłńóśźż]{2,}|\.)/g },
      { type: 'name', label: 'dane po słowie „pacjent/Pan/Pani”', re: /\b(?:pacjent(?:ka)?|pan|pani|p\.)\s+[A-ZŁŚŻŹĆŃÓĄĘ][\wąćęłńóśźż.]+/gi },
    ];

    // białe listy: częste słowa, które nie są nazwiskiem (skróty, jednostki)
    const WHITE = /^(USG|TK|MR|EKG|RTG|CRP|OB|SOR|POZ|OIT|PMR|ZP|AAA|ACS|GCS|SpO|NLPZ|IPP|ASA)/;

    for (const { type, label, re } of patterns) {
      let m;
      while ((m = re.exec(text)) !== null) {
        if (type === 'name' && WHITE.test(m[0])) continue;
        push(type, label, m);
      }
    }
    // deduplikacja po pozycji
    const seen = new Set();
    return hits.filter(h => { const k = h.index + ':' + h.value; if (seen.has(k)) return false; seen.add(k); return true; })
               .sort((a, b) => a.index - b.index);
  }

  function redactPII(text, hits) {
    if (!hits || !hits.length) return text;
    let out = text;
    // od końca, by nie psuć indeksów
    [...hits].sort((a, b) => b.index - a.index).forEach(h => {
      out = out.slice(0, h.index) + '[USUNIĘTO: ' + h.label + ']' + out.slice(h.index + h.value.length);
    });
    return out;
  }

  /* ====================== 3) Scoring bayesowski ======================= */
  function getPresentation(id) { return PRES.find(p => p.id === id); }

  function defaultPrior(d) {
    const vals = Object.values(d.prior || {});
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0.05;
  }

  function analyze(opts) {
    const { presentationId, findingIds, context, corrections } = opts;
    const pres = getPresentation(presentationId);
    if (!pres) return null;
    const stateSet = new Set(findingIds);
    const has = id => stateSet.has(id);
    const corr = (corrections && corrections[presentationId]) || {};

    const results = pres.diagnoses.map(d => {
      const prior = (d.prior && d.prior[context] != null) ? d.prior[context] : defaultPrior(d);
      let odds = prior / (1 - prior);
      const drivers = [];
      for (const fid in (d.lr || {})) {
        if (has(fid)) {
          const lr = d.lr[fid];
          odds *= lr;
          drivers.push({ id: fid, label: (F[fid] && F[fid].label) || fid, lr, dir: lr >= 1 ? 'up' : 'down' });
        }
      }
      // lokalna korekta społeczności (z zakładki Zgłoszenia)
      let corrected = false;
      if (corr[d.id]) { odds *= corr[d.id]; corrected = true; }

      const posterior = odds / (1 + odds);
      drivers.sort((a, b) => Math.abs(Math.log(b.lr)) - Math.abs(Math.log(a.lr)));
      return { dx: d, prior, posterior, drivers, corrected };
    });

    const sum = results.reduce((a, r) => a + r.posterior, 0) || 1;
    results.forEach(r => { r.share = (r.posterior / sum) * 100; });
    results.sort((a, b) => b.share - a.share);

    // czerwone flagi (niezależne od %)
    const redFlags = (pres.redFlags || [])
      .filter(rf => { try { return rf.test({ has }); } catch (e) { return false; } })
      .map(rf => ({ label: rf.label, action: rf.action }));

    // can't-miss — zawsze pokazywane, z pasmem ryzyka bezwzględnego
    const band = p => p >= 0.20 ? 'crit' : p >= 0.07 ? 'warn' : 'low';
    const cantMiss = results.filter(r => r.dx.cantMiss).map(r => ({
      name: r.dx.name, posterior: r.posterior, band: band(r.posterior),
      share: r.share, tests: r.dx.tests,
    }));

    // zalecane badania (top 4 + can't-miss), bez duplikatów
    const testSet = [];
    [...results.slice(0, 4), ...results.filter(r => r.dx.cantMiss)].forEach(r => {
      (r.dx.tests || []).forEach(t => { if (!testSet.includes(t)) testSet.push(t); });
    });

    // ocena „siły danych” (mitygacja automation bias)
    const informative = results.reduce((a, r) => a + r.drivers.length, 0);
    const matchedCount = findingIds.filter(id => F[id]).length;
    const top = results[0];
    const gap = results.length > 1 ? top.share - results[1].share : top.share;
    let confidence;
    if (matchedCount < 3) confidence = { level: 'low', text: 'Mało danych wejściowych — wynik orientacyjny. Uzupełnij wywiad i badanie.' };
    else if (gap < 8) confidence = { level: 'warn', text: 'Hipotezy zbliżone — różnicowanie wymaga dalszych badań.' };
    else confidence = { level: 'ok', text: 'Wyraźna dominacja wiodącej hipotezy w obrębie różnicowania.' };

    return {
      presentation: pres, context,
      results, redFlags, cantMiss,
      tests: testSet,
      suggestedScores: pres.suggestedScores || [],
      confidence, informative, matchedCount,
      generatedAt: new Date().toISOString(),
    };
  }

  return { norm, extractFindings, detectPII, redactPII, analyze, getPresentation };
})();
