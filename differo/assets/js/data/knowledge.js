/* ============================================================================
   Differo — baza wiedzy klinicznej (PROTOTYP EDUKACYJNY)
   ----------------------------------------------------------------------------
   WAŻNE: ilorazy wiarygodności (LR), priory i wagi są przybliżone i ilustracyjne,
   zebrane z ogólnodostępnej wiedzy EBM (m.in. JAMA Rational Clinical Examination,
   wytyczne ESC/WHO/NICE, klasyczne skale kliniczne). NIE są to wartości
   kalibrowane na danych szpitalnych ani walidowane prospektywnie. Służą do
   demonstracji przejrzystego silnika bayesowskiego, nie do decyzji klinicznych.
   ========================================================================== */
window.DFR = window.DFR || {};

DFR.data = (function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* 1) KATALOG ZNALEZISK (findings) — wspólny słownik dla NLP i silnika */
  /*    type: symptom | sign | history | vital | demo                    */
  /*    syn: polskie synonimy/wyrażenia do ekstrakcji z tekstu wywiadu    */
  /* ------------------------------------------------------------------ */
  const F = {
    // demografia / wirtualne (ustawiane z formularza)
    age_ge_65:   { label: 'Wiek ≥ 65 lat', type: 'demo' },
    age_ge_50:   { label: 'Wiek ≥ 50 lat', type: 'demo' },
    age_lt_40:   { label: 'Wiek < 40 lat', type: 'demo' },
    male:        { label: 'Płeć męska', type: 'demo' },
    female:      { label: 'Płeć żeńska', type: 'demo' },
    preg_possible:{ label: 'Możliwa ciąża (kobieta w wieku rozrodczym)', type: 'demo' },

    // parametry życiowe (z formularza)
    fever:       { label: 'Gorączka (≥ 38°C)', type: 'vital', syn: ['gorączk', 'gorączka', 'stan podgorączk', 'temperatura 38', 'temp 38', 'temp. 38', 'temp 39', 'temp 40'] },
    hypothermia: { label: 'Hipotermia (< 36°C)', type: 'vital' },
    tachycardia: { label: 'Tachykardia (HR ≥ 100/min)', type: 'vital', syn: ['tachykardia', 'kołatani', 'szybkie tętno', 'przyspieszone tętno'] },
    bradycardia: { label: 'Bradykardia (HR < 50/min)', type: 'vital', syn: ['bradykardia', 'wolne tętno'] },
    hypotension: { label: 'Hipotensja (SBP < 100 mmHg)', type: 'vital', syn: ['hipotensja', 'niskie ciśnienie', 'spadek ciśnienia'] },
    hypotension_severe: { label: 'Hipotensja krytyczna (SBP < 90)', type: 'vital' },
    htn_severe:  { label: 'Ciężkie nadciśnienie (SBP ≥ 180)', type: 'vital' },
    tachypnea:   { label: 'Tachypnoë (RR ≥ 22/min)', type: 'vital', syn: ['tachypno', 'przyspieszony oddech', 'szybki oddech'] },
    hypoxemia:   { label: 'Hipoksemia (SpO₂ < 92%)', type: 'vital', syn: ['hipoksemia', 'desaturacja', 'niska saturacja', 'spo2 9', 'sat 9'] },
    altered_mental: { label: 'Zaburzenia świadomości (GCS < 15)', type: 'vital', syn: ['splątani', 'zaburzenia świadomości', 'dezorientacja', 'gcs', 'senność patologiczna', 'zaburzenia przytomności'] },

    // obciążenia / wywiad (z formularza lub tekstu)
    smoker:      { label: 'Palenie tytoniu', type: 'history', syn: ['pali papierosy', 'palacz', 'nikotynizm', 'palenie tytoniu', 'pali'] },
    diabetes:    { label: 'Cukrzyca', type: 'history', syn: ['cukrzyca', 'dm typ', 'dm2', 'dm1', 'cukrzyc'] },
    htn:         { label: 'Nadciśnienie tętnicze', type: 'history', syn: ['nadciśnieni', 'nt ', 'ha '] },
    hyperlipid:  { label: 'Hiperlipidemia', type: 'history', syn: ['hiperlipidemia', 'dyslipidemia', 'wysoki cholesterol'] },
    prior_cad:   { label: 'Choroba wieńcowa / przebyty zawał', type: 'history', syn: ['choroba wieńcowa', 'przebyty zawał', 'po zawale', 'stan po pci', 'cabg', 'stenty'] },
    prior_vte:   { label: 'Przebyta ZŻG / zatorowość', type: 'history', syn: ['zakrzepica', 'zżg', 'zatorowość w wywiadzie', 'przebyta zatorowość'] },
    cancer:      { label: 'Czynna choroba nowotworowa', type: 'history', syn: ['nowotwór', 'choroba nowotworowa', 'rak ', 'onkolog', 'chemioterap', 'przerzut'] },
    immunosupp:  { label: 'Immunosupresja', type: 'history', syn: ['immunosupresja', 'sterydoterapia', 'leki immunosupres', 'po przeszczep'] },
    copd:        { label: 'POChP', type: 'history', syn: ['pochp', 'przewlekła obturacyjna'] },
    asthma_hx:   { label: 'Astma', type: 'history', syn: ['astma', 'astmatyk'] },
    ckd:         { label: 'Przewlekła choroba nerek', type: 'history', syn: ['pchn', 'niewydolność nerek', 'choroba nerek'] },
    anticoag:    { label: 'Leczenie przeciwkrzepliwe', type: 'history', syn: ['przeciwkrzepliw', 'noac', 'warfaryna', 'acenokumarol', 'rywaroksaban', 'apiksaban'] },
    recent_surgery: { label: 'Niedawny zabieg / unieruchomienie', type: 'history', syn: ['po operacji', 'niedawny zabieg', 'unieruchomien', 'gips', 'długi lot'] },
    estrogen:    { label: 'Estrogeny / antykoncepcja', type: 'history', syn: ['antykoncepcj', 'tabletki antykoncepcyjne', 'estrogen', 'htz'] },

    // ----- objawy: ból w klatce -----
    chest_pain:  { label: 'Ból w klatce piersiowej', type: 'symptom', syn: ['ból w klatce', 'ból w kl. piersiowej', 'ból zamostkowy', 'ból w klp', 'bóle w klatce', 'dyskomfort w klatce'] },
    cp_exertional:{ label: 'Ból wysiłkowy', type: 'symptom', syn: ['przy wysiłku', 'po wysiłku', 'wysiłkowy', 'podczas chodzenia', 'przy wchodzeniu po schodach'] },
    cp_pleuritic:{ label: 'Ból opłucnowy (nasilany oddechem)', type: 'symptom', syn: ['nasila się przy oddychaniu', 'opłucnowy', 'przy głębokim wdechu', 'przy kaszlu boli'] },
    cp_tearing:  { label: 'Ból rozdzierający / migrujący do pleców', type: 'symptom', syn: ['rozdzierając', 'rozrywając', 'przeszywając do pleców', 'migrujący do pleców'] },
    radiation_arm:{ label: 'Promieniowanie do ramienia/ramion', type: 'symptom', syn: ['promieniuje do ręki', 'promieniuje do ramienia', 'do lewej ręki', 'do obu rąk', 'drętwienie ręki'] },
    radiation_jaw:{ label: 'Promieniowanie do żuchwy/szyi', type: 'symptom', syn: ['promieniuje do żuchwy', 'do szczęki', 'do szyi'] },
    diaphoresis: { label: 'Zlewne poty', type: 'symptom', syn: ['zlewne poty', 'poci się', 'spocony', 'zimny pot'] },
    palpitations:{ label: 'Kołatanie serca', type: 'symptom', syn: ['kołatani', 'uczucie szybkiego bicia', 'arytmia odczuwana'] },
    relieved_nitro:{ label: 'Ustępuje po nitroglicerynie', type: 'symptom', syn: ['po nitroglicerynie', 'po nitratach', 'po nitrendypinie'] },
    worse_lying: { label: 'Nasila się w pozycji leżącej, ulga przy pochyleniu', type: 'symptom', syn: ['nasila się leżąc', 'ulga przy pochyleniu', 'lepiej siedząc pochylony'] },
    cp_positional:{ label: 'Ból zależny od pozycji/ucisku', type: 'symptom', syn: ['zależny od pozycji', 'przy ucisku', 'przy dotyku boli'] },

    // ----- ból brzucha -----
    abdo_pain:   { label: 'Ból brzucha', type: 'symptom', syn: ['ból brzucha', 'bóle brzucha', 'ból w jamie brzusznej', 'boli brzuch'] },
    rlq_pain:    { label: 'Ból w prawym dole biodrowym', type: 'symptom', syn: ['prawy dół biodrowy', 'prawym dole', 'pdb', 'prawym podbrzuszu'] },
    ruq_pain:    { label: 'Ból w prawym podżebrzu', type: 'symptom', syn: ['prawe podżebrze', 'prawym podżebrzu', 'pod prawym łukiem żebrowym'] },
    llq_pain:    { label: 'Ból w lewym dole biodrowym', type: 'symptom', syn: ['lewy dół biodrowy', 'lewym dole biodrowym', 'lewym podbrzuszu'] },
    epigastric:  { label: 'Ból w nadbrzuszu', type: 'symptom', syn: ['nadbrzusz', 'w dołku', 'pod żołądkiem'] },
    flank_pain:  { label: 'Ból w okolicy lędźwiowej / boku', type: 'symptom', syn: ['ból w boku', 'okolica lędźwiowa', 'ból nerki', 'w okolicy nerki', 'lędźwiowo'] },
    migratory:   { label: 'Ból wędrujący (okolica pępka → prawy dół)', type: 'symptom', syn: ['ból zaczął się w okolicy pępka', 'wędrujący', 'najpierw w okolicy pępka', 'przemieścił się'] },
    colicky:     { label: 'Ból kolkowy / falujący', type: 'symptom', syn: ['kolkowy', 'falujący', 'kolka', 'napadowy ból'] },
    anorexia:    { label: 'Brak łaknienia', type: 'symptom', syn: ['brak apetytu', 'brak łaknienia', 'nie chce jeść'] },
    nausea_vom:  { label: 'Nudności / wymioty', type: 'symptom', syn: ['nudności', 'wymiot', 'mdłości', 'wymioty'] },
    diarrhea:    { label: 'Biegunka', type: 'symptom', syn: ['biegunk', 'luźne stolce', 'rozwolnienie'] },
    constipation:{ label: 'Zaparcie / zatrzymanie gazów', type: 'symptom', syn: ['zaparcie', 'zatrzymanie gazów', 'nie oddaje gazów', 'brak stolca'] },
    hematochezia:{ label: 'Świeża krew w stolcu', type: 'symptom', syn: ['krew w stolcu', 'świeża krew', 'krwawienie z odbytu'] },
    melena:      { label: 'Smoliste stolce', type: 'symptom', syn: ['smoliste stolce', 'czarne stolce', 'smolisty stolec'] },
    dysuria:     { label: 'Dyzuria / pieczenie przy oddawaniu moczu', type: 'symptom', syn: ['pieczenie przy oddawaniu moczu', 'dyzuria', 'ból przy oddawaniu moczu', 'częstomocz'] },
    hematuria:   { label: 'Krwiomocz', type: 'symptom', syn: ['krwiomocz', 'krew w moczu', 'różowy mocz'] },
    jaundice:    { label: 'Żółtaczka', type: 'symptom', syn: ['żółtaczka', 'zażółcenie', 'żółte białkówki'] },
    distension:  { label: 'Wzdęcie / powiększenie obwodu brzucha', type: 'symptom', syn: ['wzdęty brzuch', 'wzdęcie', 'powiększony obwód brzucha'] },
    testicular:  { label: 'Ból jądra / moszny', type: 'symptom', syn: ['ból jądra', 'ból moszny', 'obrzęk jądra'] },
    vaginal_bleed:{ label: 'Krwawienie z dróg rodnych', type: 'symptom', syn: ['krwawienie z dróg rodnych', 'plamienie', 'krwawienie z pochwy'] },
    amenorrhea:  { label: 'Zatrzymanie miesiączki', type: 'symptom', syn: ['brak miesiączki', 'zatrzymanie miesiączki', 'spóźniająca się miesiączka'] },
    // znaki badania brzucha (sign)
    rebound:     { label: 'Objaw Blumberga (otrzewnowy)', type: 'sign', syn: ['blumberg', 'objaw otrzewnowy', 'objaw blumberga dodatni', 'bólowy przy zwolnieniu ucisku'] },
    guarding:    { label: 'Obrona mięśniowa', type: 'sign', syn: ['obrona mięśniowa', 'napięcie powłok', 'deskowaty brzuch'] },
    mcburney:    { label: 'Tkliwość punktu McBurneya', type: 'sign', syn: ['mcburney', 'punkt mcburneya', 'tkliwość w prawym dole'] },
    psoas:       { label: 'Objaw mięśnia biodrowo-lędźwiowego', type: 'sign', syn: ['objaw psoas', 'objaw mięśnia biodrowo-lędźwiowego'] },
    murphy:      { label: 'Objaw Murphy’ego', type: 'sign', syn: ['objaw murphy', 'murphy dodatni'] },
    pulsatile_mass:{ label: 'Tętniący opór w jamie brzusznej', type: 'sign', syn: ['tętniący opór', 'pulsujący guz', 'tętniący guz'] },
    absent_bowel:{ label: 'Brak/ciche perystaltyki', type: 'sign', syn: ['brak perystaltyki', 'cisza w brzuchu', 'zniesiona perystaltyka'] },

    // ----- duszność -----
    dyspnea:     { label: 'Duszność', type: 'symptom', syn: ['duszność', 'brak tchu', 'trudności w oddychaniu', 'zadyszka', 'krótki oddech'] },
    sudden_dyspnea:{ label: 'Nagła duszność', type: 'symptom', syn: ['nagła duszność', 'duszność nagle', 'nagle dostała duszności'] },
    orthopnea:   { label: 'Orthopnoë (duszność leżąc)', type: 'symptom', syn: ['orthopno', 'duszność leżąc', 'śpi na kilku poduszkach', 'na siedząco oddycha'] },
    pnd:         { label: 'Napadowa duszność nocna', type: 'symptom', syn: ['napadowa duszność nocna', 'budzi się z dusznością', 'pnd'] },
    leg_edema:   { label: 'Obrzęki kończyn dolnych', type: 'symptom', syn: ['obrzęki nóg', 'obrzęki kończyn', 'opuchnięte nogi', 'obrzęki podudzi'] },
    wheeze:      { label: 'Świsty / furczenia', type: 'sign', syn: ['świsty', 'świszczący oddech', 'furczenia', 'świst wydechowy'] },
    cough:       { label: 'Kaszel', type: 'symptom', syn: ['kaszel', 'kaszle', 'pokasłuje'] },
    productive_cough:{ label: 'Kaszel produktywny / ropna plwocina', type: 'symptom', syn: ['odkrztusza', 'ropna plwocina', 'kaszel z wydzieliną', 'flegma'] },
    hemoptysis:  { label: 'Krwioplucie', type: 'symptom', syn: ['krwioplucie', 'krew w plwocinie', 'odkrztusza krew'] },
    crackles:    { label: 'Trzeszczenia nad polami płucnymi', type: 'sign', syn: ['trzeszczeni', 'rzężenia', 'rzężenia drobnobańkowe'] },
    reduced_breath:{ label: 'Ściszenie szmeru pęcherzykowego', type: 'sign', syn: ['ściszenie szmeru', 'zniesiony szmer', 'ściszony szmer pęcherzykowy'] },
    jvd:         { label: 'Poszerzenie żył szyjnych', type: 'sign', syn: ['poszerzone żyły szyjne', 'jvd', 'nadmiernie wypełnione żyły szyjne'] },
    calf_swelling:{ label: 'Jednostronny obrzęk/ból łydki', type: 'symptom', syn: ['obrzęk łydki', 'ból łydki', 'jednostronnie opuchnięta noga', 'bolesna łydka'] },

    // ----- gorączka / infekcja -----
    rigors:      { label: 'Dreszcze', type: 'symptom', syn: ['dreszcze', 'trzęsie z zimna', 'zimne dreszcze'] },
    neck_stiff:  { label: 'Sztywność karku', type: 'sign', syn: ['sztywność karku', 'sztywny kark', 'objaw kerniga', 'objaw brudzińskiego'] },
    photophobia: { label: 'Światłowstręt', type: 'symptom', syn: ['światłowstręt', 'razi światło', 'fotofobia'] },
    petechiae:   { label: 'Wybroczyny / wysypka krwotoczna', type: 'sign', syn: ['wybroczyny', 'wysypka krwotoczna', 'petocje', 'plamica'] },
    sore_throat: { label: 'Ból gardła', type: 'symptom', syn: ['ból gardła', 'drapanie w gardle'] },
    cellulitis:  { label: 'Zaczerwienienie/ocieplenie skóry (zapalenie tkanki)', type: 'sign', syn: ['zaczerwienienie skóry', 'róża', 'cellulitis', 'ocieplenie i zaczerwienienie'] },

    // ----- ból głowy -----
    headache:    { label: 'Ból głowy', type: 'symptom', syn: ['ból głowy', 'bóle głowy', 'boli głowa'] },
    thunderclap: { label: 'Ból piorunujący (sek.) / „najgorszy w życiu”', type: 'symptom', syn: ['piorunujący', 'najgorszy ból głowy w życiu', 'nagły najgorszy', 'jak grom', 'eksplozyjny ból głowy'] },
    headache_unilateral:{ label: 'Jednostronny pulsujący ból głowy', type: 'symptom', syn: ['jednostronny ból głowy', 'pulsujący ból głowy', 'połowa głowy'] },
    aura:        { label: 'Aura wzrokowa', type: 'symptom', syn: ['aura', 'mroczki', 'migoczące zygzaki', 'aura wzrokowa'] },
    focal_neuro: { label: 'Ogniskowy deficyt neurologiczny', type: 'sign', syn: ['niedowład', 'zaburzenia mowy', 'opadnięcie kącika ust', 'afazja', 'asymetria twarzy', 'parestezje połowicze'] },
    jaw_claud:   { label: 'Chromanie żuchwy / tkliwość skroni', type: 'symptom', syn: ['chromanie żuchwy', 'ból przy żuciu', 'tkliwość skroni', 'bolesna tętnica skroniowa'] },
    vision_loss: { label: 'Nagłe pogorszenie widzenia', type: 'symptom', syn: ['utrata wzroku', 'pogorszenie widzenia', 'zaniewidzenie'] },
    worse_valsalva:{ label: 'Nasilenie przy kaszlu/parciu, rano', type: 'symptom', syn: ['nasila się rano', 'przy kaszlu', 'przy parciu', 'budzi w nocy ból głowy'] },

    // ----- omdlenie -----
    syncope:     { label: 'Omdlenie / utrata przytomności', type: 'symptom', syn: ['omdlenie', 'utrata przytomności', 'zasłabnięcie', 'zemdlał'] },
    exertional_syncope:{ label: 'Omdlenie wysiłkowe', type: 'symptom', syn: ['omdlenie przy wysiłku', 'zasłabł podczas wysiłku', 'wysiłkowe omdlenie'] },
    no_prodrome: { label: 'Brak objawów zwiastunowych', type: 'symptom', syn: ['bez zwiastunów', 'nagle bez ostrzeżenia', 'brak prodromów'] },
    prolonged_standing:{ label: 'Po długim staniu / sytuacyjne', type: 'symptom', syn: ['po długim staniu', 'w gorącu', 'na widok krwi', 'przy oddawaniu moczu'] },
    postural:    { label: 'Po pionizacji (ortostatyczne)', type: 'symptom', syn: ['po wstaniu', 'przy pionizacji', 'ortostatyczne', 'po zmianie pozycji'] },
    tongue_bite: { label: 'Przygryzienie języka / drgawki', type: 'sign', syn: ['przygryzienie języka', 'drgawki', 'oddanie moczu', 'prężenia'] },
    post_confusion:{ label: 'Splątanie ponapadowe', type: 'symptom', syn: ['splątanie po', 'dezorientacja po', 'senność po napadzie'] },
    family_scd:  { label: 'Nagły zgon sercowy w rodzinie', type: 'history', syn: ['nagły zgon w rodzinie', 'nagła śmierć sercowa w rodzinie'] },
  };

  /* ------------------------------------------------------------------ */
  /* 2) PREZENTACJE KLINICZNE                                            */
  /*    Każda: priory wg kontekstu, diagnozy z LR per znalezisko,        */
  /*    czerwone flagi (niezależne), sugerowana skala.                   */
  /* ------------------------------------------------------------------ */
  const presentations = [
    /* ===================== BÓL W KLATCE ============================== */
    {
      id: 'chest_pain',
      label: 'Ból w klatce piersiowej',
      icon: 'heart',
      contexts: ['SOR', 'POZ', 'Interna'],
      suggestedScores: ['HEART', 'WELLS_PE'],
      redFlags: [
        { test: s => s.has('hypotension') || s.has('hypotension_severe'), label: 'Hipotensja przy bólu w klatce', action: 'Pilnie: EKG, monitorowanie, dostęp i.v., rozważ wstrząs kardiogenny/zator/rozwarstwienie.' },
        { test: s => s.has('cp_tearing'), label: 'Ból rozdzierający promieniujący do pleców', action: 'Podejrzenie rozwarstwienia aorty — pomiar RR na obu kończynach, pilne angio-TK.' },
        { test: s => s.has('syncope'), label: 'Omdlenie towarzyszące bólowi w klatce', action: 'Rozważ masywną zatorowość, rozwarstwienie, groźną arytmię.' },
        { test: s => s.has('hypoxemia'), label: 'Hipoksemia', action: 'Tlenoterapia; rozważ zatorowość płucną / obrzęk płuc.' },
      ],
      diagnoses: [
        {
          id: 'acs', name: 'Ostry zespół wieńcowy (ACS / zawał)', icd: 'I21–I24', cantMiss: true,
          prior: { SOR: 0.16, POZ: 0.03, Interna: 0.12 },
          lr: { cp_exertional: 2.4, radiation_arm: 2.3, radiation_jaw: 2.2, diaphoresis: 2.0, nausea_vom: 1.9, relieved_nitro: 1.3, age_ge_65: 1.7, age_ge_50: 1.3, male: 1.3, diabetes: 1.5, smoker: 1.4, prior_cad: 3.0, htn: 1.2, hyperlipid: 1.3, hypotension: 1.6, cp_pleuritic: 0.35, cp_positional: 0.3, age_lt_40: 0.4 },
          tests: ['EKG 12-odprowadzeniowe (≤10 min)', 'Troponina hs (0 h / 1–3 h)', 'RTG klatki', 'Echo przyłóżkowe'],
          management: ['Tlen tylko przy SpO₂ < 90%', 'ASA 150–300 mg p.o.', 'Stratyfikacja wg EKG (STEMI → pilna reperfuzja)', 'Konsultacja kardiologiczna'],
          sources: ['ESC Guidelines for ACS 2023', 'JAMA Rational Clinical Examination: chest pain'],
        },
        {
          id: 'pe', name: 'Zatorowość płucna', icd: 'I26', cantMiss: true,
          prior: { SOR: 0.08, POZ: 0.01, Interna: 0.06 },
          lr: { cp_pleuritic: 1.8, sudden_dyspnea: 2.3, dyspnea: 1.6, calf_swelling: 2.5, hemoptysis: 1.8, tachycardia: 1.8, hypoxemia: 2.2, prior_vte: 3.0, cancer: 2.0, recent_surgery: 2.0, estrogen: 1.5, syncope: 1.7, cp_exertional: 0.7 },
          tests: ['Skala Wells/Geneva + reguła PERC', 'D-dimer (przy niskim PTP)', 'Angio-TK tętnic płucnych', 'Gazometria, EKG (S1Q3T3)'],
          management: ['Ocena stabilności hemodynamicznej', 'Antykoagulacja wg ryzyka i protokołu', 'Masywna ZP → rozważ trombolizę'],
          sources: ['ESC Guidelines on PE 2019', 'Wells score (NEJM)'],
        },
        {
          id: 'aortic', name: 'Rozwarstwienie aorty', icd: 'I71', cantMiss: true,
          prior: { SOR: 0.01, POZ: 0.002, Interna: 0.01 },
          lr: { cp_tearing: 7.0, radiation_arm: 1.4, htn: 1.8, age_ge_65: 1.6, syncope: 2.0, hypotension: 2.0, cp_exertional: 0.6 },
          tests: ['RR na obu kończynach górnych', 'Angio-TK aorty', 'RTG (poszerzenie śródpiersia)', 'Echo (TEE)'],
          management: ['Kontrola ciśnienia i częstości (β-bloker i.v.)', 'Pilna konsultacja kardiochirurgiczna', 'Typ A → leczenie operacyjne'],
          sources: ['ESC Guidelines on aortic diseases 2014'],
        },
        {
          id: 'pericarditis', name: 'Zapalenie osierdzia', icd: 'I30',
          prior: { SOR: 0.05, POZ: 0.03, Interna: 0.05 },
          lr: { worse_lying: 4.0, cp_pleuritic: 2.0, age_lt_40: 1.5, fever: 1.4, cp_exertional: 0.6 },
          tests: ['EKG (uniesienie ST wklęsłe, obniżenie PR)', 'Echo (płyn)', 'CRP, troponina'],
          management: ['NLPZ + kolchicyna', 'Ograniczenie wysiłku', 'Ocena tamponady'],
          sources: ['ESC Guidelines on pericardial diseases 2015'],
        },
        {
          id: 'gerd', name: 'Choroba refluksowa / przyczyna przełykowa', icd: 'K21',
          prior: { SOR: 0.12, POZ: 0.20, Interna: 0.12 },
          lr: { epigastric: 1.8, worse_lying: 1.5, cp_exertional: 0.5, diaphoresis: 0.6, radiation_arm: 0.6 },
          tests: ['Próba leczenia IPP', 'Wykluczyć przyczyny sercowe w pierwszej kolejności'],
          management: ['IPP', 'Modyfikacja diety i stylu życia'],
          sources: ['ACG GERD guidelines'],
        },
        {
          id: 'msk', name: 'Ból mięśniowo-szkieletowy / ściany klatki', icd: 'M79',
          prior: { SOR: 0.20, POZ: 0.35, Interna: 0.18 },
          lr: { cp_positional: 4.0, cp_pleuritic: 1.4, age_lt_40: 1.5, diaphoresis: 0.4, radiation_arm: 0.5, cp_exertional: 0.6 },
          tests: ['Badanie palpacyjne ściany klatki', 'Rozpoznanie z wykluczenia przyczyn groźnych'],
          management: ['NLPZ', 'Edukacja, obserwacja'],
          sources: ['JAMA Rational Clinical Examination'],
        },
        {
          id: 'panic', name: 'Lęk / napad paniki', icd: 'F41',
          prior: { SOR: 0.08, POZ: 0.12, Interna: 0.07 },
          lr: { palpitations: 1.6, age_lt_40: 1.6, dyspnea: 1.3, diaphoresis: 1.1, radiation_arm: 0.6, cp_exertional: 0.5 },
          tests: ['Rozpoznanie z wykluczenia', 'Ocena psychiatryczna w razie nawrotów'],
          management: ['Techniki uspokajające', 'Skierowanie/psychoterapia'],
          sources: ['DSM-5 / ICD-11'],
        },
      ],
    },

    /* ===================== BÓL BRZUCHA =============================== */
    {
      id: 'abdo_pain',
      label: 'Ból brzucha',
      icon: 'abdomen',
      contexts: ['SOR', 'POZ', 'Interna', 'Chirurgia'],
      suggestedScores: ['ALVARADO'],
      redFlags: [
        { test: s => s.has('pulsatile_mass'), label: 'Tętniący opór w jamie brzusznej', action: 'Podejrzenie tętniaka aorty (AAA) — pilne USG/angio-TK, nie zwlekać.' },
        { test: s => s.has('rigidity') || s.has('guarding') && s.has('absent_bowel'), label: 'Objawy otrzewnowe / „deskowaty brzuch”', action: 'Podejrzenie perforacji / zapalenia otrzewnej — pilna konsultacja chirurgiczna.' },
        { test: s => s.has('male') && s.has('testicular'), label: 'Ostry ból jądra', action: 'Wyklucz skręt jądra — okno ratunkowe ~6 h, pilne USG Doppler / konsultacja urologiczna.' },
        { test: s => s.has('preg_possible') && s.has('vaginal_bleed'), label: 'Ból + krwawienie u kobiety w wieku rozrodczym', action: 'Wyklucz ciążę pozamaciczną — β-hCG, USG, konsultacja ginekologiczna.' },
        { test: s => s.has('hypotension') || s.has('hypotension_severe'), label: 'Hipotensja', action: 'Rozważ krwotok wewnętrzny / wstrząs septyczny.' },
      ],
      diagnoses: [
        {
          id: 'appendicitis', name: 'Ostre zapalenie wyrostka robaczkowego', icd: 'K35', cantMiss: true,
          prior: { SOR: 0.18, POZ: 0.05, Interna: 0.06, Chirurgia: 0.25 },
          lr: { rlq_pain: 3.5, migratory: 3.2, mcburney: 3.4, rebound: 2.3, guarding: 2.0, anorexia: 1.6, fever: 1.5, psoas: 2.0, nausea_vom: 1.3, age_lt_40: 1.2 },
          tests: ['Skala Alvarado / AIR', 'Morfologia + CRP', 'USG / TK jamy brzusznej', 'β-hCG u kobiet'],
          management: ['Konsultacja chirurgiczna', 'Nic doustnie, płyny i.v.', 'Antybiotykoterapia okołozabiegowa'],
          sources: ['Alvarado score', 'WSES appendicitis guidelines'],
        },
        {
          id: 'renal_colic', name: 'Kolka nerkowa / kamica moczowodu', icd: 'N23',
          prior: { SOR: 0.14, POZ: 0.06, Interna: 0.08, Chirurgia: 0.08 },
          lr: { flank_pain: 3.0, colicky: 2.5, hematuria: 2.8, nausea_vom: 1.4, rlq_pain: 0.8, fever: 0.7 },
          tests: ['Badanie ogólne moczu (erytrocyty)', 'TK bez kontrastu (low-dose)', 'USG nerek'],
          management: ['NLPZ (lek z wyboru)', 'Nawodnienie', 'Filtrowanie moczu; urologia przy powikłaniach'],
          sources: ['EAU Urolithiasis guidelines'],
        },
        {
          id: 'cholecystitis', name: 'Kamica / zapalenie pęcherzyka żółciowego', icd: 'K80–K81',
          prior: { SOR: 0.08, POZ: 0.05, Interna: 0.08, Chirurgia: 0.10 },
          lr: { ruq_pain: 3.2, murphy: 2.8, fever: 1.6, nausea_vom: 1.3, jaundice: 1.5, female: 1.3 },
          tests: ['USG jamy brzusznej', 'Próby wątrobowe, lipaza', 'CRP, morfologia'],
          management: ['Antybiotykoterapia', 'Konsultacja chirurgiczna (cholecystektomia)'],
          sources: ['Tokyo Guidelines (TG18)'],
        },
        {
          id: 'diverticulitis', name: 'Zapalenie uchyłków', icd: 'K57',
          prior: { SOR: 0.06, POZ: 0.03, Interna: 0.06, Chirurgia: 0.07 },
          lr: { llq_pain: 3.5, fever: 1.6, age_ge_50: 1.8, constipation: 1.3, rebound: 1.4 },
          tests: ['TK jamy brzusznej z kontrastem', 'CRP, morfologia'],
          management: ['Antybiotyk wg ciężkości', 'Dieta płynna; chirurgia przy powikłaniach'],
          sources: ['ASCRS diverticulitis guidelines'],
        },
        {
          id: 'bowel_obstruction', name: 'Niedrożność jelit', icd: 'K56', cantMiss: true,
          prior: { SOR: 0.05, POZ: 0.01, Interna: 0.04, Chirurgia: 0.10 },
          lr: { distension: 3.0, constipation: 2.5, absent_bowel: 3.5, nausea_vom: 1.8, colicky: 1.6, recent_surgery: 2.2 },
          tests: ['RTG przeglądowe / TK jamy brzusznej', 'Elektrolity, gazometria'],
          management: ['Sonda żołądkowa, nic doustnie', 'Płynoterapia', 'Konsultacja chirurgiczna'],
          sources: ['WSES bowel obstruction guidelines'],
        },
        {
          id: 'gastroenteritis', name: 'Nieżyt żołądkowo-jelitowy', icd: 'A09',
          prior: { SOR: 0.16, POZ: 0.28, Interna: 0.12, Chirurgia: 0.05 },
          lr: { diarrhea: 3.0, nausea_vom: 1.6, abdo_pain: 1.1, fever: 1.2, rebound: 0.4, guarding: 0.4 },
          tests: ['Zwykle kliniczne', 'Nawodnienie; bad. mikrobiologiczne przy ciężkim przebiegu'],
          management: ['Nawodnienie doustne/i.v.', 'Leczenie objawowe'],
          sources: ['WHO/IDSA gastroenteritis'],
        },
        {
          id: 'uti', name: 'Zakażenie układu moczowego', icd: 'N39',
          prior: { SOR: 0.08, POZ: 0.14, Interna: 0.10, Chirurgia: 0.03 },
          lr: { dysuria: 3.0, flank_pain: 1.6, fever: 1.3, female: 1.5, hematuria: 1.4 },
          tests: ['Badanie ogólne moczu + posiew', 'CRP przy podejrzeniu odmiedniczkowego'],
          management: ['Antybiotykoterapia wg lokalnej oporności'],
          sources: ['EAU urological infections'],
        },
        {
          id: 'aaa', name: 'Tętniak aorty brzusznej (pęknięcie/objawowy)', icd: 'I71.3', cantMiss: true,
          prior: { SOR: 0.01, POZ: 0.002, Interna: 0.01, Chirurgia: 0.02 },
          lr: { pulsatile_mass: 8.0, flank_pain: 1.4, hypotension: 3.0, age_ge_65: 2.0, male: 1.6, syncope: 2.0 },
          tests: ['USG przyłóżkowe (FAST/aorta)', 'Angio-TK', 'Grupa krwi, krzyżówka'],
          management: ['Pilna konsultacja chirurgii naczyniowej', 'Resuscytacja kontrolowana'],
          sources: ['ESVS AAA guidelines'],
        },
      ],
    },

    /* ===================== DUSZNOŚĆ ================================= */
    {
      id: 'dyspnea',
      label: 'Duszność',
      icon: 'lungs',
      contexts: ['SOR', 'POZ', 'Interna'],
      suggestedScores: ['CURB65', 'WELLS_PE'],
      redFlags: [
        { test: s => s.has('hypoxemia'), label: 'Hipoksemia (SpO₂ < 92%)', action: 'Tlenoterapia, monitorowanie; ustal przyczynę niewydolności oddechowej.' },
        { test: s => s.has('hypotension'), label: 'Duszność + hipotensja', action: 'Rozważ wstrząs, masywną zatorowość, odmę prężną, tamponadę.' },
        { test: s => s.has('altered_mental'), label: 'Zaburzenia świadomości', action: 'Ocena gazometrii (hiperkapnia/hipoksja), zabezpieczenie drożności dróg oddechowych.' },
      ],
      diagnoses: [
        {
          id: 'hf', name: 'Niewydolność serca / obrzęk płuc', icd: 'I50',
          prior: { SOR: 0.18, POZ: 0.10, Interna: 0.20 },
          lr: { orthopnea: 2.2, pnd: 2.6, leg_edema: 2.0, jvd: 3.5, crackles: 2.0, age_ge_65: 1.6, prior_cad: 1.8, htn: 1.3 },
          tests: ['NT-proBNP/BNP', 'RTG klatki', 'Echo serca', 'EKG'],
          management: ['Tlen, pozycja siedząca', 'Diuretyk pętlowy i.v.', 'Azotany przy nadciśnieniu', 'Leczenie przyczyny'],
          sources: ['ESC Heart Failure Guidelines 2021'],
        },
        {
          id: 'copd_exac', name: 'Zaostrzenie POChP', icd: 'J44',
          prior: { SOR: 0.14, POZ: 0.10, Interna: 0.14 },
          lr: { wheeze: 2.2, productive_cough: 2.0, copd: 5.0, smoker: 1.6, age_ge_65: 1.3, fever: 1.1 },
          tests: ['Gazometria', 'RTG klatki', 'Morfologia, CRP'],
          management: ['Tlen kontrolowany (SpO₂ 88–92%)', 'SABA/SAMA wziewnie', 'Glikokortykosteroid', 'Antybiotyk wg wskazań'],
          sources: ['GOLD report'],
        },
        {
          id: 'asthma', name: 'Zaostrzenie astmy', icd: 'J45',
          prior: { SOR: 0.10, POZ: 0.10, Interna: 0.07 },
          lr: { wheeze: 2.2, asthma_hx: 5.0, cough: 1.4, age_lt_40: 1.4, productive_cough: 0.7 },
          tests: ['PEF/spirometria', 'SpO₂', 'Ocena ciężkości napadu'],
          management: ['SABA wziewnie', 'Glikokortykosteroid systemowy', 'Tlen do SpO₂ ≥ 94%'],
          sources: ['GINA report'],
        },
        {
          id: 'pneumonia', name: 'Zapalenie płuc', icd: 'J18',
          prior: { SOR: 0.16, POZ: 0.12, Interna: 0.18 },
          lr: { fever: 2.0, productive_cough: 2.2, crackles: 2.4, cough: 1.4, tachypnea: 1.8, pleuritic_pain: 1.5, age_ge_65: 1.4 },
          tests: ['RTG klatki', 'Skala CURB-65', 'Morfologia, CRP/PCT', 'Posiewy przy ciężkim przebiegu'],
          management: ['Antybiotykoterapia wg CURB-65', 'Tlen, nawodnienie'],
          sources: ['NICE/BTS pneumonia (CAP)'],
        },
        {
          id: 'pe2', name: 'Zatorowość płucna', icd: 'I26', cantMiss: true,
          prior: { SOR: 0.08, POZ: 0.01, Interna: 0.07 },
          lr: { sudden_dyspnea: 2.4, calf_swelling: 2.5, hemoptysis: 1.8, tachycardia: 1.8, hypoxemia: 2.2, prior_vte: 3.0, cancer: 2.0, recent_surgery: 2.0, pleuritic_pain: 1.4, wheeze: 0.6 },
          tests: ['Skala Wells + PERC', 'D-dimer (niskie PTP)', 'Angio-TK tętnic płucnych'],
          management: ['Antykoagulacja wg ryzyka', 'Stabilizacja; masywna ZP → tromboliza'],
          sources: ['ESC PE Guidelines 2019'],
        },
        {
          id: 'pneumothorax', name: 'Odma opłucnowa', icd: 'J93', cantMiss: true,
          prior: { SOR: 0.04, POZ: 0.005, Interna: 0.02 },
          lr: { sudden_dyspnea: 2.0, reduced_breath: 4.0, pleuritic_pain: 1.8, age_lt_40: 1.3, male: 1.4 },
          tests: ['RTG/USG klatki', 'Ocena odmy prężnej (klinicznie!)'],
          management: ['Odma prężna → natychmiastowa dekompresja igłowa', 'Drenaż wg wielkości i objawów'],
          sources: ['BTS pleural disease guidelines'],
        },
      ],
    },

    /* ===================== GORĄCZKA / SEPSA ========================= */
    {
      id: 'fever',
      label: 'Gorączka / podejrzenie zakażenia',
      icon: 'thermometer',
      contexts: ['SOR', 'POZ', 'Interna', 'Pediatria'],
      suggestedScores: ['QSOFA', 'NEWS2', 'CURB65'],
      redFlags: [
        { test: s => s.has('petechiae') && (s.has('fever') || s.has('neck_stiff')), label: 'Gorączka + wysypka krwotoczna', action: 'Podejrzenie sepsy meningokokowej — antybiotyk natychmiast, nie czekać na badania.' },
        { test: s => s.has('neck_stiff') && (s.has('fever') || s.has('headache')), label: 'Sztywność karku + gorączka/ból głowy', action: 'Podejrzenie zapalenia opon — posiewy, antybiotyk empiryczny, rozważ TK przed PL.' },
        { test: s => s.has('hypotension') || s.has('altered_mental') || s.has('tachypnea'), label: 'Cechy dysfunkcji narządowej (qSOFA)', action: 'Pakiet sepsy: posiewy, mleczany, antybiotyk ≤1 h, płynoterapia.' },
      ],
      diagnoses: [
        {
          id: 'sepsis', name: 'Sepsa / uogólnione zakażenie', icd: 'A41', cantMiss: true,
          prior: { SOR: 0.10, POZ: 0.02, Interna: 0.12, Pediatria: 0.06 },
          lr: { hypotension: 3.0, altered_mental: 2.5, tachypnea: 2.0, tachycardia: 1.8, rigors: 1.6, age_ge_65: 1.5, immunosupp: 1.8 },
          tests: ['qSOFA / NEWS2', 'Mleczany, posiewy krwi', 'Morfologia, CRP/PCT', 'Poszukiwanie ogniska'],
          management: ['Pakiet sepsy „Hour-1”', 'Antybiotyk empiryczny szerokospektralny', 'Płynoterapia, kontrola ogniska'],
          sources: ['Surviving Sepsis Campaign 2021'],
        },
        {
          id: 'pneumonia2', name: 'Zapalenie płuc', icd: 'J18',
          prior: { SOR: 0.16, POZ: 0.14, Interna: 0.18, Pediatria: 0.18 },
          lr: { cough: 1.6, productive_cough: 2.2, crackles: 2.4, dyspnea: 1.5, tachypnea: 1.8, pleuritic_pain: 1.5 },
          tests: ['RTG klatki', 'CURB-65', 'CRP/PCT'],
          management: ['Antybiotykoterapia wg CURB-65'],
          sources: ['NICE/BTS CAP'],
        },
        {
          id: 'pyelo', name: 'Odmiedniczkowe zapalenie nerek / ZUM', icd: 'N10',
          prior: { SOR: 0.10, POZ: 0.12, Interna: 0.12, Pediatria: 0.08 },
          lr: { dysuria: 2.4, flank_pain: 2.6, female: 1.4, rigors: 1.4, nausea_vom: 1.2 },
          tests: ['Badanie ogólne moczu + posiew', 'Morfologia, CRP', 'USG przy powikłaniach'],
          management: ['Antybiotykoterapia', 'Nawodnienie'],
          sources: ['EAU urological infections'],
        },
        {
          id: 'meningitis', name: 'Zapalenie opon mózgowo-rdzeniowych', icd: 'G00–G03', cantMiss: true,
          prior: { SOR: 0.02, POZ: 0.003, Interna: 0.02, Pediatria: 0.04 },
          lr: { neck_stiff: 5.0, photophobia: 2.5, headache: 1.6, altered_mental: 2.2, petechiae: 4.0, fever: 1.4 },
          tests: ['Posiewy krwi', 'Punkcja lędźwiowa (PMR)', 'TK głowy przy wskazaniach przed PL'],
          management: ['Antybiotyk empiryczny natychmiast (± deksametazon)', 'Izolacja kropelkowa'],
          sources: ['ESCMID bacterial meningitis'],
        },
        {
          id: 'cellulitis_dx', name: 'Zapalenie tkanki łącznej / róża', icd: 'L03',
          prior: { SOR: 0.06, POZ: 0.10, Interna: 0.06, Pediatria: 0.04 },
          lr: { cellulitis: 6.0, fever: 1.3, rigors: 1.3 },
          tests: ['Ocena kliniczna, oznaczenie granic', 'CRP, morfologia przy ciężkim przebiegu'],
          management: ['Antybiotyk obejmujący paciorkowce/gronkowce', 'Uniesienie kończyny'],
          sources: ['IDSA SSTI guidelines'],
        },
        {
          id: 'viral', name: 'Zakażenie wirusowe (grypopodobne)', icd: 'J11',
          prior: { SOR: 0.18, POZ: 0.30, Interna: 0.12, Pediatria: 0.30 },
          lr: { sore_throat: 1.6, cough: 1.3, headache: 1.2, hypotension: 0.4, altered_mental: 0.4 },
          tests: ['Zwykle kliniczne', 'Testy w kierunku grypy/COVID wg sytuacji'],
          management: ['Leczenie objawowe', 'Izolacja wg wskazań'],
          sources: ['WHO influenza'],
        },
      ],
    },

    /* ===================== BÓL GŁOWY ================================ */
    {
      id: 'headache',
      label: 'Ból głowy',
      icon: 'brain',
      contexts: ['SOR', 'POZ', 'Neurologia'],
      suggestedScores: [],
      redFlags: [
        { test: s => s.has('thunderclap'), label: 'Ból piorunujący („najgorszy w życiu”)', action: 'Wyklucz krwotok podpajęczynówkowy — pilna TK głowy, przy ujemnej rozważ PL.' },
        { test: s => s.has('focal_neuro'), label: 'Ogniskowy deficyt neurologiczny', action: 'Pilne obrazowanie (TK/MR) — wyklucz udar/guz/krwawienie.' },
        { test: s => s.has('neck_stiff') && s.has('fever'), label: 'Ból głowy + gorączka + sztywność karku', action: 'Podejrzenie neuroinfekcji — patrz ścieżka zapalenia opon.' },
        { test: s => s.has('age_ge_50') && s.has('jaw_claud'), label: 'Wiek ≥ 50 + objawy skroniowe', action: 'Podejrzenie olbrzymiokomórkowego zapalenia tętnic — OB/CRP, steroidy pilnie, ryzyko utraty wzroku.' },
      ],
      diagnoses: [
        {
          id: 'migraine', name: 'Migrena', icd: 'G43',
          prior: { SOR: 0.20, POZ: 0.30, Neurologia: 0.30 },
          lr: { headache_unilateral: 2.4, aura: 3.0, nausea_vom: 1.8, photophobia: 2.0, age_lt_40: 1.3, thunderclap: 0.3, focal_neuro: 0.5 },
          tests: ['Rozpoznanie kliniczne (kryteria ICHD-3)', 'Obrazowanie tylko przy „flagach”'],
          management: ['Tryptan / NLPZ', 'Leki przeciwwymiotne', 'Profilaktyka przy nawrotach'],
          sources: ['ICHD-3', 'IHS guidelines'],
        },
        {
          id: 'tension', name: 'Ból głowy typu napięciowego', icd: 'G44.2',
          prior: { SOR: 0.18, POZ: 0.34, Neurologia: 0.22 },
          lr: { headache: 1.2, photophobia: 0.6, nausea_vom: 0.5, thunderclap: 0.2, focal_neuro: 0.3 },
          tests: ['Rozpoznanie kliniczne'],
          management: ['Proste leki przeciwbólowe', 'Higiena snu, redukcja stresu'],
          sources: ['ICHD-3'],
        },
        {
          id: 'sah', name: 'Krwotok podpajęczynówkowy (SAH)', icd: 'I60', cantMiss: true,
          prior: { SOR: 0.02, POZ: 0.001, Neurologia: 0.02 },
          lr: { thunderclap: 7.0, neck_stiff: 2.5, altered_mental: 2.0, syncope: 1.8, nausea_vom: 1.3 },
          tests: ['TK głowy bez kontrastu (≤6 h czułość wysoka)', 'PL (ksantochromia) przy ujemnej TK', 'Angio-TK/MR'],
          management: ['Pilna konsultacja neurochirurgiczna', 'Kontrola RR, nimodypina'],
          sources: ['AHA/ASA SAH guidelines', 'Ottawa SAH rule'],
        },
        {
          id: 'meningitis2', name: 'Zapalenie opon mózgowo-rdzeniowych', icd: 'G00–G03', cantMiss: true,
          prior: { SOR: 0.02, POZ: 0.002, Neurologia: 0.02 },
          lr: { neck_stiff: 5.0, fever: 2.5, photophobia: 2.0, altered_mental: 2.0, petechiae: 4.0 },
          tests: ['Posiewy, PMR', 'TK przed PL przy wskazaniach'],
          management: ['Antybiotyk empiryczny natychmiast ± deksametazon'],
          sources: ['ESCMID meningitis'],
        },
        {
          id: 'gca', name: 'Olbrzymiokomórkowe zapalenie tętnic', icd: 'M31.6', cantMiss: true,
          prior: { SOR: 0.01, POZ: 0.01, Neurologia: 0.02 },
          lr: { jaw_claud: 4.0, age_ge_50: 3.0, vision_loss: 3.0, headache: 1.3 },
          tests: ['OB i CRP (zwykle wysokie)', 'USG/biopsja tętnicy skroniowej'],
          management: ['Glikokortykosteroid pilnie (nie czekać na biopsję)', 'Konsultacja reumatologiczna/okulistyczna'],
          sources: ['EULAR GCA recommendations'],
        },
        {
          id: 'tumor', name: 'Guz OUN / wzmożone ciśnienie śródczaszkowe', icd: 'C71', cantMiss: true,
          prior: { SOR: 0.01, POZ: 0.005, Neurologia: 0.03 },
          lr: { worse_valsalva: 3.0, focal_neuro: 3.0, nausea_vom: 1.4, age_ge_50: 1.3 },
          tests: ['MR głowy (preferowane)', 'TK przy braku dostępności'],
          management: ['Konsultacja neurologiczna/neurochirurgiczna', 'Leczenie obrzęku przy wskazaniach'],
          sources: ['NICE brain tumour referral'],
        },
      ],
    },

    /* ===================== OMDLENIE ================================= */
    {
      id: 'syncope',
      label: 'Omdlenie / utrata przytomności',
      icon: 'pulse',
      contexts: ['SOR', 'POZ', 'Kardiologia'],
      suggestedScores: [],
      redFlags: [
        { test: s => s.has('exertional_syncope'), label: 'Omdlenie podczas wysiłku', action: 'Wysokie ryzyko sercowe — EKG, echo, hospitalizacja/monitorowanie.' },
        { test: s => s.has('family_scd'), label: 'Nagły zgon sercowy w rodzinie', action: 'Podejrzenie kanałopatii/kardiomiopatii — pilna diagnostyka kardiologiczna.' },
        { test: s => s.has('chest_pain') || s.has('palpitations'), label: 'Omdlenie z bólem w klatce / kołataniem', action: 'Rozważ arytmię, ACS, zatorowość.' },
        { test: s => s.has('hypotension') || s.has('tachycardia'), label: 'Niestabilne parametry po omdleniu', action: 'Monitorowanie; szukaj przyczyny groźnej (krwawienie, arytmia, ZP).' },
      ],
      diagnoses: [
        {
          id: 'vasovagal', name: 'Omdlenie wazowagalne (odruchowe)', icd: 'R55',
          prior: { SOR: 0.35, POZ: 0.45, Kardiologia: 0.25 },
          lr: { prolonged_standing: 3.0, no_prodrome: 0.4, age_lt_40: 1.4, exertional_syncope: 0.3 },
          tests: ['Wywiad sytuacyjny', 'EKG (wykluczenie kardiogennego)', 'Próba ortostatyczna'],
          management: ['Edukacja, manewry przeciwomdleniowe', 'Nawodnienie, unikanie wyzwalaczy'],
          sources: ['ESC Syncope Guidelines 2018'],
        },
        {
          id: 'orthostatic', name: 'Hipotonia ortostatyczna', icd: 'I95.1',
          prior: { SOR: 0.18, POZ: 0.20, Kardiologia: 0.12 },
          lr: { postural: 3.5, age_ge_65: 1.6, anticoag: 1.0 },
          tests: ['Pomiar RR leżąc/stojąc', 'Przegląd leków', 'Ocena odwodnienia/krwawienia'],
          management: ['Modyfikacja leków, nawodnienie', 'Wolna pionizacja'],
          sources: ['ESC Syncope Guidelines 2018'],
        },
        {
          id: 'cardiac_syncope', name: 'Omdlenie kardiogenne (arytmia / strukturalne)', icd: 'I49', cantMiss: true,
          prior: { SOR: 0.15, POZ: 0.05, Kardiologia: 0.30 },
          lr: { exertional_syncope: 4.0, no_prodrome: 2.5, palpitations: 2.0, chest_pain: 1.8, family_scd: 3.0, age_ge_65: 1.6, prior_cad: 2.0 },
          tests: ['EKG (12-odpr.) + monitorowanie', 'Echo serca', 'Troponina wg kontekstu'],
          management: ['Hospitalizacja/telemetria', 'Leczenie przyczyny (arytmia, wada)'],
          sources: ['ESC Syncope Guidelines 2018'],
        },
        {
          id: 'seizure', name: 'Napad padaczkowy', icd: 'G40',
          prior: { SOR: 0.10, POZ: 0.06, Kardiologia: 0.03 },
          lr: { tongue_bite: 4.0, post_confusion: 3.0, no_prodrome: 1.2, postural: 0.5 },
          tests: ['Wywiad od świadków', 'EEG, obrazowanie głowy', 'Glikemia, elektrolity'],
          management: ['Bezpieczeństwo, ocena neurologiczna', 'Diagnostyka pierwszego napadu'],
          sources: ['ILAE / NICE epilepsy'],
        },
        {
          id: 'hypoglycemia', name: 'Hipoglikemia', icd: 'E16',
          prior: { SOR: 0.06, POZ: 0.05, Kardiologia: 0.02 },
          lr: { diabetes: 3.0, post_confusion: 1.6, diaphoresis: 1.6, palpitations: 1.3 },
          tests: ['Szybki pomiar glikemii', 'Przegląd leków hipoglikemizujących'],
          management: ['Podaż glukozy (p.o./i.v.)', 'Korekta leczenia cukrzycy'],
          sources: ['ADA standards of care'],
        },
        {
          id: 'pe_syncope', name: 'Zatorowość płucna (jako przyczyna omdlenia)', icd: 'I26', cantMiss: true,
          prior: { SOR: 0.04, POZ: 0.005, Kardiologia: 0.04 },
          lr: { sudden_dyspnea: 2.0, calf_swelling: 2.5, tachycardia: 1.8, hypoxemia: 2.2, cancer: 2.0, prior_vte: 3.0 },
          tests: ['Wells + D-dimer/angio-TK', 'EKG, troponina'],
          management: ['Antykoagulacja wg ryzyka'],
          sources: ['ESC PE Guidelines 2019'],
        },
      ],
    },
  ];

  /* ------------------------------------------------------------------ */
  /* 3) SKALE KLINICZNE (interaktywne kalkulatory)                       */
  /* ------------------------------------------------------------------ */
  const scores = {
    HEART: {
      name: 'HEART Score', subtitle: 'Ryzyko MACE w bólu w klatce (SOR)',
      items: [
        { id: 'history', label: 'Wywiad (typowość bólu)', options: [['Mało podejrzany', 0], ['Umiarkowanie', 1], ['Wysoce podejrzany', 2]] },
        { id: 'ekg', label: 'EKG', options: [['Prawidłowe', 0], ['Niespecyficzne zmiany repolaryzacji', 1], ['Istotne obniżenia ST', 2]] },
        { id: 'age', label: 'Wiek', options: [['< 45', 0], ['45–64', 1], ['≥ 65', 2]] },
        { id: 'risk', label: 'Czynniki ryzyka', options: [['Brak', 0], ['1–2', 1], ['≥ 3 lub miażdżyca', 2]] },
        { id: 'trop', label: 'Troponina', options: [['Norma', 0], ['1–3× norma', 1], ['> 3× norma', 2]] },
      ],
      interpret: t => t <= 3
        ? { band: 'low', text: `0–3 pkt: niskie ryzyko MACE (~1–2%). Rozważ wczesny wypis wg protokołu.` }
        : t <= 6
        ? { band: 'warn', text: `4–6 pkt: pośrednie ryzyko (~12–17%). Obserwacja, seryjne troponiny.` }
        : { band: 'crit', text: `7–10 pkt: wysokie ryzyko (~50–65%). Wczesna strategia inwazyjna/kardiolog.` },
    },
    WELLS_PE: {
      name: 'Wells (zatorowość płucna)', subtitle: 'Prawdopodobieństwo kliniczne ZP',
      items: [
        { id: 'dvt', label: 'Objawy ZŻG', options: [['Nie', 0], ['Tak', 3]] },
        { id: 'alt', label: 'ZP najbardziej prawdopodobna', options: [['Nie', 0], ['Tak', 3]] },
        { id: 'hr', label: 'HR > 100/min', options: [['Nie', 0], ['Tak', 1.5]] },
        { id: 'immob', label: 'Unieruchomienie/operacja (4 tyg.)', options: [['Nie', 0], ['Tak', 1.5]] },
        { id: 'prev', label: 'Przebyta ZŻG/ZP', options: [['Nie', 0], ['Tak', 1.5]] },
        { id: 'hemo', label: 'Krwioplucie', options: [['Nie', 0], ['Tak', 1]] },
        { id: 'ca', label: 'Nowotwór', options: [['Nie', 0], ['Tak', 1]] },
      ],
      interpret: t => t <= 1
        ? { band: 'low', text: `≤1 pkt: niskie PTP. Rozważ regułę PERC; D-dimer.` }
        : t <= 4
        ? { band: 'warn', text: `2–4 pkt: pośrednie PTP. D-dimer; przy dodatnim → angio-TK.` }
        : { band: 'crit', text: `≥5 pkt: wysokie PTP. Angio-TK tętnic płucnych.` },
    },
    CURB65: {
      name: 'CURB-65', subtitle: 'Ciężkość pozaszpitalnego zapalenia płuc',
      items: [
        { id: 'conf', label: 'Splątanie', options: [['Nie', 0], ['Tak', 1]] },
        { id: 'urea', label: 'Mocznik > 7 mmol/l', options: [['Nie', 0], ['Tak', 1]] },
        { id: 'rr', label: 'RR ≥ 30/min', options: [['Nie', 0], ['Tak', 1]] },
        { id: 'bp', label: 'RR skurcz. < 90 lub rozk. ≤ 60', options: [['Nie', 0], ['Tak', 1]] },
        { id: 'age', label: 'Wiek ≥ 65', options: [['Nie', 0], ['Tak', 1]] },
      ],
      interpret: t => t <= 1
        ? { band: 'low', text: `0–1 pkt: niskie ryzyko — leczenie ambulatoryjne możliwe.` }
        : t === 2
        ? { band: 'warn', text: `2 pkt: rozważ hospitalizację/krótki nadzór.` }
        : { band: 'crit', text: `≥3 pkt: ciężkie — hospitalizacja, rozważ OIT.` },
    },
    ALVARADO: {
      name: 'Skala Alvarado', subtitle: 'Prawdopodobieństwo zapalenia wyrostka',
      items: [
        { id: 'migr', label: 'Migracja bólu do PDB', options: [['Nie', 0], ['Tak', 1]] },
        { id: 'anor', label: 'Brak łaknienia', options: [['Nie', 0], ['Tak', 1]] },
        { id: 'naus', label: 'Nudności/wymioty', options: [['Nie', 0], ['Tak', 1]] },
        { id: 'tend', label: 'Tkliwość w PDB', options: [['Nie', 0], ['Tak', 2]] },
        { id: 'reb', label: 'Objaw z odbicia', options: [['Nie', 0], ['Tak', 1]] },
        { id: 'temp', label: 'Temperatura ≥ 37,3°C', options: [['Nie', 0], ['Tak', 1]] },
        { id: 'leuk', label: 'Leukocytoza > 10 G/l', options: [['Nie', 0], ['Tak', 2]] },
        { id: 'shift', label: 'Przesunięcie w lewo', options: [['Nie', 0], ['Tak', 1]] },
      ],
      interpret: t => t <= 4
        ? { band: 'low', text: `≤4 pkt: niskie prawdopodobieństwo — obserwacja.` }
        : t <= 6
        ? { band: 'warn', text: `5–6 pkt: możliwe — obrazowanie (USG/TK).` }
        : { band: 'crit', text: `≥7 pkt: prawdopodobne — konsultacja chirurgiczna.` },
    },
    QSOFA: {
      name: 'qSOFA', subtitle: 'Szybki przesiew ryzyka sepsy',
      items: [
        { id: 'rr', label: 'RR ≥ 22/min', options: [['Nie', 0], ['Tak', 1]] },
        { id: 'ams', label: 'Zaburzenia świadomości (GCS < 15)', options: [['Nie', 0], ['Tak', 1]] },
        { id: 'sbp', label: 'RR skurczowe ≤ 100 mmHg', options: [['Nie', 0], ['Tak', 1]] },
      ],
      interpret: t => t >= 2
        ? { band: 'crit', text: `≥2 pkt: wyższe ryzyko zgonu — pilna ocena sepsy, pakiet „Hour-1”.` }
        : { band: 'low', text: `0–1 pkt: niższe ryzyko, ale nie wyklucza sepsy — oceniaj klinicznie.` },
    },
    NEWS2: {
      name: 'NEWS2 (uproszczony)', subtitle: 'Wczesne ostrzeganie o pogorszeniu',
      items: [
        { id: 'rr', label: 'Częstość oddechów', options: [['12–20', 0], ['9–11 lub 21–24', 2], ['≤8 lub ≥25', 3]] },
        { id: 'spo2', label: 'SpO₂', options: [['≥96%', 0], ['94–95%', 1], ['92–93%', 2], ['≤91%', 3]] },
        { id: 'sbp', label: 'RR skurczowe', options: [['111–219', 0], ['101–110', 1], ['91–100', 2], ['≤90 lub ≥220', 3]] },
        { id: 'hr', label: 'Tętno', options: [['51–90', 0], ['41–50 lub 91–110', 1], ['111–130', 2], ['≤40 lub ≥131', 3]] },
        { id: 'temp', label: 'Temperatura', options: [['36,1–38,0', 0], ['35,1–36,0 lub 38,1–39,0', 1], ['≥39,1 lub ≤35,0', 3]] },
        { id: 'avpu', label: 'Świadomość', options: [['Przytomny', 0], ['Zaburzona (V/P/U)', 3]] },
      ],
      interpret: t => t <= 4
        ? { band: 'low', text: `0–4 pkt: niskie ryzyko — rutynowe monitorowanie.` }
        : t <= 6
        ? { band: 'warn', text: `5–6 pkt: średnie — pilna ocena lekarska, częstsze pomiary.` }
        : { band: 'crit', text: `≥7 pkt: wysokie — natychmiastowa ocena, rozważ OIT.` },
    },
  };

  /* expose */
  return { findings: F, presentations, scores };
})();
