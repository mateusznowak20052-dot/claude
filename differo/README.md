# Differo — kliniczny system wsparcia decyzji (prototyp)

Narzędzie dla **lekarzy i studentów medycyny**: wpisujesz wywiad w naturalnym
języku, a aplikacja proponuje **diagnostykę różnicową** z jawnym uzasadnieniem,
**czerwonymi flagami**, **zalecaną diagnostyką** i **walidowanymi skalami
klinicznymi**. Inspiracje: UpToDate, Isabel, VisualDx, DXplain — ale z naciskiem
na *wyjaśnialność* i *uczciwość metodologiczną*.

> ⚠️ **To jest prototyp edukacyjny, nie wyrób medyczny.** Nie posiada
> certyfikacji CE/MDR i nie może służyć do rzeczywistych decyzji klinicznych.
> Procenty to **względny udział w obrębie różnicowania** liczony z przybliżonych
> ilorazów wiarygodności (LR) z literatury — **nie** kalibrowane prawdopodobieństwo
> kliniczne. Prawdziwe prawdopodobieństwa wymagają danych z wielu placówek,
> potwierdzonych rozpoznań końcowych, kalibracji oraz walidacji zewnętrznej i
> prospektywnej.

## Jak uruchomić

Nie wymaga budowania ani zależności. Wystarczy serwer plików statycznych:

```bash
cd differo
python3 -m http.server 8000
# otwórz http://localhost:8000/index.html
```

Można też otworzyć `index.html` bezpośrednio w przeglądarce (dane zapisują się
lokalnie w `localStorage`).

## Co jest w środku

- **`index.html`** — strona sprzedażowa z **żywym demo** (wpisz przypadek →
  natychmiastowe różnicowanie), narracją przewijania, sekcją dowodów/metodyki,
  bezpieczeństwa (RODO) i cennikiem (osobna taryfa studencka).
- **`app.html`** — aplikacja SPA z logowaniem (w demo: *dowolne dane logują*) i
  zakładkami:
  - **Pulpit** — przegląd, szybki start, ostatnie wywiady.
  - **Nowy wywiad** — formularz (wiek, płeć, kontekst, parametry życiowe,
    wywiad, badanie, leki) → analiza → różnicowanie + skale + uzasadnienie.
  - **Historia wywiadów** — prywatny notatnik klinicysty (lokalnie, bez danych pacjenta).
  - **Baza wiedzy** — przegląd chorób i objawów ze źródłami.
  - **Zgłoszenia i poprawki** — zgłaszasz, że różnicowanie jest błędne i
    dlaczego; po weryfikacji korekta wpływa na kolejne wyniki.
  - **Profil / Ustawienia / Prawne** — konto, motyw (jasny/ciemny/auto),
    eksport i usuwanie danych, regulamin, polityka prywatności, disclaimer.

## Dwa poziomy dostępu (student vs lekarz)

Przy logowaniu wybierasz typ konta — zakres funkcji jest różny:

| Funkcja | Student | Lekarz |
|---|:--:|:--:|
| Tryb nauki (quiz, fiszki, postęp) | ✓ | ✓ |
| Baza wiedzy | ✓ | ✓ |
| Wywiad: różnicowanie, czerwone flagi, zalecane badania | ✓ | ✓ |
| Zgłaszanie i współtworzenie korekt | ✓ | ✓ |
| Szczegóły postępowania i dawkowanie | — | ✓ |
| Eksport raportu klinicznego (PDF) | — | ✓ |

Konto studenckie chroni przed nadmiernym zaufaniem do treści decyzyjnych i
kładzie nacisk na naukę. W wersji demo można przełączyć się na konto klinicysty,
aby zobaczyć pełny zakres (w produkcji wymagałoby to weryfikacji statusu).

## Architektura (3 warstwy)

1. **Interpretacja wywiadu** (`engine.js` → `extractFindings`): regułowe NLP po
   polsku ze słownikiem synonimów i rozpoznawaniem negacji („bez gorączki”).
   Wynik jest **edytowalny** — klinicysta potwierdza, co system wychwycił.
2. **Silnik różnicowania** (`engine.js` → `analyze`): przejrzysty scoring
   bayesowski — *prawdopodobieństwo a priori* (zależne od kontekstu i wieku)
   modyfikowane *ilorazami wiarygodności*; normalizacja w obrębie różnicowania.
   To **nie** jest LLM.
3. **Warstwa kliniczna** (`knowledge.js`): zalecane badania, czerwone flagi
   (niezależne od %), sugerowane skale (HEART, Wells, CURB-65, Alvarado, qSOFA,
   NEWS2) i źródła.

## Bezpieczeństwo i RODO

- Wbudowane **wykrywanie danych osobowych** (PESEL, imię i nazwisko, adres,
  telefon, e-mail, daty) z możliwością automatycznego usunięcia przed analizą.
- **Brak kartoteki pacjenta** — historia to wyłącznie notatnik klinicysty.
- Dane przechowywane **lokalnie**; można je wyeksportować lub usunąć.

## Mitygacja automation bias

Aplikacja celowo pokazuje **niepewność** („siła danych”), **alternatywy** i
**czerwone flagi** niezależnie od wyniku procentowego — by przeciwdziałać
bezkrytycznemu zaufaniu do AI.

## Struktura plików

```
differo/
├── index.html              # landing + żywe demo
├── app.html                # aplikacja (SPA)
└── assets/
    ├── css/{base,landing,app}.css
    └── js/
        ├── data/knowledge.js   # objawy, choroby, LR, skale
        ├── engine/engine.js    # NLP + PII + scoring bayesowski
        ├── landing.js
        └── app.js              # routing, widoki, logika
```

## Zakres prototypu

11 ścieżek klinicznych (ból w klatce, ból brzucha, ból pleców, duszność,
gorączka/sepsa, ból głowy, omdlenie, ogniskowe objawy neurologiczne/udar,
krwawienie z przewodu pokarmowego, zawroty głowy, gorączka u dziecka), 130+
rozpoznawanych znalezisk, 8 interaktywnych skal (HEART, Wells, CURB-65, Alvarado,
qSOFA, NEWS2, ROSIER, Glasgow-Blatchford). Można generować **raport do druku/PDF**.
Strategia zgodna z praktyką: *najczęstsze + najgroźniejsze*, nie „cała medycyna”.
