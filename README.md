# Apka pod patent

Webowa aplikacja do próbnych egzaminów, po polsku. Działa na telefonie i komputerze; jako PWA może być dodana do ekranu głównego.

## Uruchomienie

- `npm install`
- `npm run dev` — podgląd lokalny.
- `npm run build` — wersja produkcyjna wraz z zasobami offline.

## GitHub Pages

Aplikacja publikuje się jako statyczna strona. Workflow `.github/workflows/deploy-pages.yml` buduje projekt przy każdym pushu na `main` lub `master`.

1. Utwórz repozytorium na GitHubie i wypchnij kod (w tym workflow).
2. W repozytorium: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Po zakończeniu Akcji strona będzie pod `https://<konto>.github.io/<nazwa-repo>/`. Jeśli repo nazywa się `<konto>.github.io`, strona będzie w korzeniu domeny.

Własna domena wymaga pustego `BASE_PATH` — wtedy w workflow ustaw zmienną repozytorium albo zmień krok „Resolve Pages base path”.

Do instalacji PWA na telefonie potrzebny jest adres HTTPS. Service worker jest aktywny tylko w wersji produkcyjnej, żeby podczas pracy nie pokazywać starej wersji aplikacji. Po pierwszym otwarciu i pobraniu zasobów stopka potwierdza gotowość offline. Na iOS: Safari → Udostępnij → Do ekranu początkowego. Na Androidzie: przycisk instalacji lub menu Chrome.

## Pytania z PDF

Obecna baza pochodzi z dostarczonego pliku **„Baza pytań 2026 .pdf”** (23 strony). Zawiera **195 pytań** do patentu motorowodnego oraz **12 oryginalnych ilustracji przy 14 pytaniach**. Klucz odpowiedzi został odczytany z zielonych zaznaczeń w PDF. Treść, kolejność odpowiedzi i powtórzenia zachowano zgodnie ze źródłem; nie przeprowadzano merytorycznej korekty klucza. PDF nie zawiera wyjaśnień, więc pole `explanation` pozostaje puste.

Dane znajdują się w `data/questions.json`, a ilustracje w `public/questions/patent-2026-*.png`. Obrazy wyodrębniono bezpośrednio z zasobów PDF, bez zmiany ich pikseli; dzięki temu schemat lin ze strony 13 jest kompletny, mimo że w dokumencie wystaje poza stronę. Pytania 115–117 korzystają ze wspólnego schematu.

`data/questions-source.json` zawiera sumę SHA-256 źródła i mapowanie każdego pytania na stronę, wydrukowany numer i zaznaczoną odpowiedź. W pozycji 74 PDF powtarza numer 44; identyfikator aplikacji to `patent-2026-074`. W pytaniach 111 i 139 etykiety źródłowe to A/C/D — aplikacja wyświetla A/B/C, zachowując kolejność i poprawną odpowiedź według zaznaczenia. Kategorie są pogrupowaniem tematycznym dodanym podczas importu.

Każde pytanie ma format:

```json
{
  "id": "pytanie-001",
  "category": "Nazwa działu",
  "text": "Treść pytania",
  "options": ["Odpowiedź A", "Odpowiedź B", "Odpowiedź C"],
  "correctAnswer": 1,
  "explanation": "Wyjaśnienie poprawnej odpowiedzi (może być pustym tekstem).",
  "image": {
    "src": "/questions/pytanie-001.png",
    "alt": "Opis ilustracji"
  }
}
```

`correctAnswer` jest indeksem: **0 = A, 1 = B, 2 = C**. Pole `image` pomijamy, jeżeli pytanie nie ma obrazka. ID muszą być unikalne, a baza musi mieć co najmniej 75 pytań. Po zmianie bazy uruchom nowy build.

Ponowny import: `python3 scripts/import-questions-pdf.py "/ścieżka/do/Baza pytań 2026 .pdf"`. Wymagane biblioteki: `pdfplumber`, `pypdf`, `Pillow`. Skrypt sprawdza SHA-256, kompletność pytań, etykiety odpowiedzi i jednoznaczność zielonego klucza przed zapisem. Opcja `--check` porównuje istniejące dane i piksele obrazów ze źródłem bez zapisywania plików.

`node scripts/test-quiz.mjs` sprawdza bazę, pliki obrazów i przebieg egzaminów. Generator `scripts/generate-demo.py` odmawia nadpisania właściwej bazy.

Losowanie korzysta z Fisher–Yates, bez powtórek w obrębie testu. W trybie nauki odpowiedź jest ujawniana dopiero po jej zatwierdzeniu. W trybie egzaminu ujawniana jest na końcu. Ustawienia są zapisywane lokalnie na urządzeniu; trwający test nie jest zapisywany, a aplikacja ostrzega przed jego przerwaniem lub odświeżeniem.
