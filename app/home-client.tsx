"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCheck,
  ChevronDown,
  Download,
  GraduationCap,
  Home,
  Info,
  Lightbulb,
  ListChecks,
  Smartphone,
  Sparkles,
  Target,
  Trophy,
  X,
} from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import questionsData from "@/data/questions.json";
import {
  createSession,
  chooseAnswer,
  confirmAnswer,
  nextQuestion,
  scoreSession,
  validateQuestions,
  type Session,
} from "@/lib/quiz";
import { publicUrl } from "@/lib/utils";
const questions = validateQuestions(questionsData);
const sizes = [15, 30, 45, 60, 75];
type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
export default function HomePage() {
  const [count, setCount] = useState(15);
  const [instant, setInstant] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [installOpen, setInstallOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(
    null,
  );
  const [installed, setInstalled] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const q = session?.questions[session.index];
  const result = session?.done ? scoreSession(session) : null;
  useEffect(() => {
    try {
      const prefs = JSON.parse(
        localStorage.getItem("patent-preferences") || "null",
      );
      if (prefs && sizes.includes(prefs.count)) setCount(prefs.count);
      if (typeof prefs?.instant === "boolean") setInstant(prefs.instant);
    } catch {
      /* Preferences are optional. */
    }
    setStorageReady(true);
    setInstalled(
      window.matchMedia("(display-mode: standalone)").matches ||
        Boolean((navigator as Navigator & { standalone?: boolean }).standalone),
    );
    const offer = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPrompt);
    };
    const finish = () => {
      setInstalled(true);
      setInstallPrompt(null);
      setInstallOpen(false);
    };
    window.addEventListener("beforeinstallprompt", offer);
    window.addEventListener("appinstalled", finish);
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register(publicUrl("/sw.js"))
        .then(async () => {
          await navigator.serviceWorker.ready;
          setOfflineReady(true);
        })
        .catch(() => setOfflineReady(false));
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", offer);
      window.removeEventListener("appinstalled", finish);
    };
  }, []);
  useEffect(() => {
    if (storageReady) {
      try {
        localStorage.setItem(
          "patent-preferences",
          JSON.stringify({ count, instant }),
        );
      } catch {
        /* Continue without storage. */
      }
    }
  }, [count, instant, storageReady]);
  const active = Boolean(session);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [session?.index, session?.done, active]);
  useEffect(() => {
    if (!session || session.done) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [active, session?.done]);
  async function install() {
    if (!installPrompt) {
      setInstallOpen(true);
      return;
    }
    try {
      await installPrompt.prompt();
      await installPrompt.userChoice;
    } catch {
      setInstallOpen(true);
    }
    setInstallPrompt(null);
  }
  return (
    <div className="app-shell">
      <header className="topbar">
        <button
          className="brand"
          onClick={() =>
            session && !session.done ? setLeaveOpen(true) : setSession(null)
          }
          aria-label="Apka pod patent — strona startowa"
        >
          <span className="brand-icon">
            <GraduationCap size={24} strokeWidth={1.8} />
          </span>
          <span>
            apka<span className="brand-dot">.</span>pod patent
          </span>
        </button>
        {!installed ? (
          <button className="install-button" onClick={install}>
            <Smartphone size={17} />
            <span>Zainstaluj apkę</span>
            <Download size={15} />
          </button>
        ) : (
          <span className="installed-label">
            <Check size={16} /> Twoja apka do nauki
          </span>
        )}
      </header>
      {!session ? (
        <main className="home-layout enter">
          <section className="intro">
            <span className="eyebrow">
              <span className="live-dot" /> TWÓJ MAŁY KROK DO PATENTU
            </span>
            <h1>
              Apka
              <br />
              pod{" "}
              <span>
                patent<span className="title-dot">.</span>
              </span>
            </h1>
            <p className="signature">
              <Sparkles size={18} /> Paweł rządzi
            </p>
            <p className="intro-copy">
              Trochę nauki. Więcej pewności.
              <br />
              Twój kolejny test zaczyna się tutaj.
            </p>
            <div className="intro-facts">
              <span>
                <ListChecks size={18} />
                <b>{questions.length}</b> pytań w bazie
              </span>
              <span>
                <CheckCheck size={18} /> Jedna poprawna odpowiedź
              </span>
            </div>
            <div className="source-note">
              <Info size={18} />
              <p>
                <strong>Baza pytań 2026.</strong> Pytania, ilustracje i klucz
                odpowiedzi pochodzą z dostarczonego materiału do patentu
                motorowodnego.
              </p>
            </div>
          </section>
          <section className="setup-card" aria-labelledby="setup-title">
            <div className="card-heading">
              <span className="small-icon">
                <Target size={22} />
              </span>
              <span className="pill">PO SWOJEMU, W SWOIM TEMPIE</span>
            </div>
            <h2 id="setup-title">Zrób miejsce na wiedzę.</h2>
            <p className="muted">Ustaw test i sprawdź, jak Ci idzie.</p>
            <div className="setup-section">
              <label id="count-label" className="section-label">
                <span className="step-label">01</span>Ile pytań na dziś?
              </label>
              <RadioGroup
                aria-labelledby="count-label"
                value={String(count)}
                onValueChange={(v) => setCount(Number(v))}
                className="count-options"
              >
                {sizes.map((n) => (
                  <label
                    key={n}
                    className={`count-option ${count === n ? "active" : ""}`}
                  >
                    <RadioGroupItem value={String(n)} className="sr-only" />
                    <span>{n}</span>
                    <small>pytań</small>
                    {count === n && <Check className="count-check" size={12} />}
                  </label>
                ))}
              </RadioGroup>
              <p className="helper">
                Losowane z całej bazy. Bez powtórek w jednym teście.
              </p>
            </div>
            <div className="setup-section mode-section">
              <label htmlFor="feedback" className="section-label">
                <span className="step-label">02</span>Kiedy pokazać odpowiedzi?
              </label>
              <div className={`mode-box ${instant ? "learning" : ""}`}>
                <span className="mode-icon">
                  {instant ? (
                    <Lightbulb size={24} />
                  ) : (
                    <GraduationCap size={24} />
                  )}
                </span>
                <div>
                  <label htmlFor="feedback">
                    {instant
                      ? "Uczę się na bieżąco"
                      : "Sprawdzam się na koniec"}
                  </label>
                  <p>
                    {instant
                      ? "Poprawna odpowiedź po każdym pytaniu"
                      : "Odpowiedzi dopiero w podsumowaniu"}
                  </p>
                </div>
                <Switch
                  id="feedback"
                  checked={instant}
                  onCheckedChange={setInstant}
                  aria-label="Pokaż poprawną odpowiedź po każdym pytaniu"
                />
              </div>
            </div>
            <button
              className="primary-button start-button"
              onClick={() =>
                setSession(createSession(questions, count, instant))
              }
            >
              Zaczynam test <ArrowRight size={20} />
            </button>
            <p className="below-button">
              {count} pytań <span>·</span>{" "}
              {instant ? "Tryb nauki" : "Tryb egzaminu"} <span>·</span> Bez
              pośpiechu
            </p>
          </section>
        </main>
      ) : !session.done && q ? (
        <main className="quiz-layout">
          <div className="quiz-top">
            <button className="text-button" onClick={() => setLeaveOpen(true)}>
              <ArrowLeft size={17} />
              Przerwij test
            </button>
            <span className="mode-tag">
              {session.instant ? (
                <Lightbulb size={16} />
              ) : (
                <GraduationCap size={16} />
              )}
              {session.instant ? "Tryb nauki" : "Tryb egzaminu"}
            </span>
          </div>
          <div className="progress-label">
            <span>
              Pytanie <strong>{session.index + 1}</strong> /{" "}
              {session.questions.length}
            </span>
            <span>
              {Math.round(
                (session.answers.length / session.questions.length) * 100,
              )}
              % ukończone
            </span>
          </div>
          <Progress
            value={(session.answers.length / session.questions.length) * 100}
            aria-label="Postęp testu"
            className="test-progress"
          />
          <section className="question-card enter" key={q.id}>
            <div className="question-meta">
              <span className="eyebrow">{q.category}</span>
              <span>Baza 2026</span>
            </div>
            {q.image && (
              <figure className="question-image">
                <img
                  src={publicUrl(q.image.src)}
                  alt={q.image.alt}
                  width={640}
                  height={260}
                />
              </figure>
            )}
            <h1 ref={heading} tabIndex={-1} className="question-title">
              {q.text}
            </h1>
            <p className="muted question-hint">Wybierz jedną odpowiedź.</p>
            <RadioGroup
              aria-label="Odpowiedzi"
              value={session.selected === null ? "" : String(session.selected)}
              onValueChange={(v) =>
                setSession((s) => (s ? chooseAnswer(s, Number(v)) : s))
              }
              disabled={session.confirmed}
              className="answer-options"
            >
              {q.options.map((option, i) => {
                const reveal = session.instant && session.confirmed,
                  correct = reveal && i === q.correctAnswer,
                  wrong = reveal && i === session.selected && !correct;
                return (
                  <label
                    key={i}
                    className={`answer-option ${session.selected === i ? "selected" : ""} ${correct ? "correct" : ""} ${wrong ? "wrong" : ""} ${session.confirmed ? "locked" : ""}`}
                  >
                    <RadioGroupItem value={String(i)} className="sr-only" />
                    <span className="answer-letter">{"ABC"[i]}</span>
                    <span className="answer-copy">
                      {option}
                      {correct && <small>Poprawna odpowiedź</small>}
                      {wrong && <small>Twoja odpowiedź</small>}
                    </span>
                    {correct ? (
                      <Check size={21} />
                    ) : wrong ? (
                      <X size={21} />
                    ) : (
                      <span className="answer-dot" />
                    )}
                  </label>
                );
              })}
            </RadioGroup>
            {session.confirmed && session.instant && (
              <div
                role="status"
                className={`feedback ${session.selected === q.correctAnswer ? "good" : "bad"}`}
              >
                <span>
                  {session.selected === q.correctAnswer ? (
                    <CheckCheck size={22} />
                  ) : (
                    <Lightbulb size={22} />
                  )}
                </span>
                <div>
                  <strong>
                    {session.selected === q.correctAnswer
                      ? "Dokładnie tak!"
                      : "Teraz już wiesz."}
                  </strong>
                  <p>
                    {q.explanation ||
                      `Odpowiedź według klucza: ${q.options[q.correctAnswer]}`}
                  </p>
                </div>
              </div>
            )}
            <div className="question-actions">
              <span className="helper">
                {session.instant
                  ? "Małe kroki też prowadzą do celu."
                  : "Wynik zobaczysz po ostatnim pytaniu."}
              </span>
              <button
                className="primary-button"
                disabled={session.selected === null}
                onClick={() =>
                  setSession((s) => {
                    if (!s) return s;
                    if (s.confirmed) return nextQuestion(s);
                    const confirmed = confirmAnswer(s);
                    return s.instant ? confirmed : nextQuestion(confirmed);
                  })
                }
              >
                {session.confirmed || !session.instant
                  ? session.index === session.questions.length - 1
                    ? "Zobacz wynik"
                    : "Następne pytanie"
                  : "Sprawdź odpowiedź"}
                <ArrowRight size={19} />
              </button>
            </div>
          </section>
        </main>
      ) : result ? (
        <main className="results-layout enter">
          <section className="result-card">
            <span className="trophy-icon">
              <Trophy size={30} />
            </span>
            <p className="eyebrow">TEST ZAKOŃCZONY</p>
            <h1 ref={heading} tabIndex={-1}>
              {result.percentage >= 80
                ? "Świetna robota!"
                : result.percentage >= 50
                  ? "Kolejny krok za Tobą!"
                  : "Każdy test to dobra lekcja."}
            </h1>
            <p className="muted">
              {result.percentage >= 80
                ? "Tak trzymaj. Regularna nauka robi różnicę."
                : "Sprawdź odpowiedzi i spróbuj ponownie, kiedy zechcesz."}
            </p>
            <div
              className="score-ring"
              style={
                { "--score": `${result.percentage}%` } as React.CSSProperties
              }
            >
              <div>
                <strong>
                  {result.percentage}
                  <span>%</span>
                </strong>
                <small>poprawnych odpowiedzi</small>
              </div>
            </div>
            <div className="score-stats">
              <div>
                <span className="stat-correct">
                  <Check size={18} />
                  {result.correct}
                </span>
                <small>poprawnych</small>
              </div>
              <div>
                <span className="stat-wrong">
                  <X size={18} />
                  {result.total - result.correct}
                </span>
                <small>błędnych</small>
              </div>
              <div>
                <span>{result.total}</span>
                <small>wszystkich pytań</small>
              </div>
            </div>
            <button className="primary-button" onClick={() => setSession(null)}>
              <Home size={18} />
              Wróć na stronę startową
            </button>
          </section>
          <section className="review-section">
            <h2>Sprawdź swoje odpowiedzi</h2>
            <p className="muted">Kliknij pytanie, aby zobaczyć szczegóły.</p>
            <div className="review-list">
              {session.questions.map((question, i) => (
                <details className="review-item" key={question.id}>
                  <summary>
                    <span
                      className={`review-status ${session.answers[i] === question.correctAnswer ? "good" : "bad"}`}
                    >
                      {session.answers[i] === question.correctAnswer ? (
                        <Check size={18} />
                      ) : (
                        <X size={18} />
                      )}
                    </span>
                    <span>
                      <small>PYTANIE {i + 1}</small>
                      {question.text}
                    </span>
                    <ChevronDown size={18} />
                  </summary>
                  <div className="review-body">
                    {question.image && (
                      <img
                        src={publicUrl(question.image.src)}
                        alt={question.image.alt}
                        width={640}
                        height={260}
                        loading="lazy"
                      />
                    )}
                    {question.options.map((option, j) => (
                      <p
                        key={j}
                        className={`review-answer ${j === question.correctAnswer ? "correct" : ""} ${j === session.answers[i] && j !== question.correctAnswer ? "wrong" : ""}`}
                      >
                        <b>{"ABC"[j]}.</b> {option}
                        {j === question.correctAnswer && <span>Poprawna</span>}
                        {j === session.answers[i] && <span>Twój wybór</span>}
                      </p>
                    ))}
                    {question.explanation && (
                      <p className="review-explanation">
                        {question.explanation}
                      </p>
                    )}
                  </div>
                </details>
              ))}
            </div>
          </section>
        </main>
      ) : null}
      <footer className="footer">
        <span>Po jednym pytaniu. Coraz bliżej celu.</span>
        <span>
          <span className="live-dot" />
          {offlineReady
            ? "Gotowa do nauki offline"
            : "Twoje tempo. Twój patent."}
        </span>
      </footer>
      <Dialog open={installOpen} onOpenChange={setInstallOpen}>
        <DialogContent className="app-dialog">
          <span className="small-icon">
            <Smartphone size={25} />
          </span>
          <DialogTitle>Apka zawsze pod ręką</DialogTitle>
          <DialogDescription>
            Dodaj ją do ekranu głównego i otwieraj jak zwykłą aplikację.
          </DialogDescription>
          <div className="install-instructions">
            <h3>iPhone / iPad · Safari</h3>
            <p>
              Otwórz tę stronę w Safari, wybierz Udostępnij, a potem „Do ekranu
              początkowego” i „Dodaj”.
            </p>
            <h3>Android · Chrome</h3>
            <p>
              Otwórz menu ⋮ i wybierz „Zainstaluj aplikację” lub „Dodaj do
              ekranu głównego”.
            </p>
            <p className="helper">
              Pierwsze otwarcie wymaga internetu. Tryb offline będzie gotowy,
              gdy na dole strony pojawi się potwierdzenie.
            </p>
          </div>
          <button
            className="primary-button"
            onClick={() => setInstallOpen(false)}
          >
            Rozumiem
            <Check size={18} />
          </button>
        </DialogContent>
      </Dialog>
      <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <DialogContent className="app-dialog">
          <DialogTitle>Przerwać ten test?</DialogTitle>
          <DialogDescription>
            Odpowiedzi z tego podejścia nie zostaną zapisane. Możesz wrócić do
            pytania lub rozpocząć nowy test.
          </DialogDescription>
          <button
            className="primary-button"
            onClick={() => setLeaveOpen(false)}
          >
            Wracam do pytania
            <ArrowRight size={18} />
          </button>
          <button
            className="text-button centered"
            onClick={() => {
              setSession(null);
              setLeaveOpen(false);
            }}
          >
            Przerwij i wróć na start
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
