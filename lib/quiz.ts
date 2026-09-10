import deduplication from "../data/question-deduplication.json" with { type: "json" };

export type Question = {
  id: string;
  category: string;
  text: string;
  options: [string, string, string];
  correctAnswer: number;
  explanation: string;
  image?: { src: string; alt: string };
};
export type Session = {
  questions: Question[];
  instant: boolean;
  index: number;
  selected: number | null;
  confirmed: boolean;
  answers: number[];
  done: boolean;
};
function contentKey(text: string, imageSrc = ""): string {
  // Ignore typography, but keep numbers and Polish letters significant.
  return JSON.stringify([
    text.normalize("NFKC").toLocaleLowerCase("pl").replace(/[^\p{L}\p{N}]+/gu, " ").trim(),
    imageSrc,
  ]);
}
const equivalentContent = new Map(
  deduplication.duplicates.map((q) => [
    contentKey(q.text, q.imageSrc),
    contentKey(q.canonicalText, q.canonicalImageSrc),
  ]),
);
export function questionKey(q: Question): string {
  const key = contentKey(q.text, q.image?.src);
  return equivalentContent.get(key) ?? key;
}

export function validateQuestions(data: unknown): Question[] {
  if (!Array.isArray(data) || data.length < 75)
    throw new Error("Baza musi zawierać co najmniej 75 pytań.");
  const ids = new Set<string>();
  const contents = new Set<string>();
  for (const q of data) {
    if (
      !q ||
      typeof q.id !== "string" ||
      ids.has(q.id) ||
      typeof q.text !== "string" ||
      !q.text ||
      typeof q.category !== "string" ||
      typeof q.explanation !== "string" ||
      !Array.isArray(q.options) ||
      q.options.length !== 3 ||
      q.options.some((v: unknown) => typeof v !== "string" || !v) ||
      new Set(q.options).size !== 3 ||
      !Number.isInteger(q.correctAnswer) ||
      q.correctAnswer < 0 ||
      q.correctAnswer > 2 ||
      (q.image &&
        (typeof q.image.src !== "string" ||
          !q.image.src.startsWith("/questions/") ||
          typeof q.image.alt !== "string"))
    )
      throw new Error("Nieprawidłowe pytanie w bazie.");
    ids.add(q.id);
    const key = questionKey(q);
    if (contents.has(key)) throw new Error("Powtórzona treść pytania w bazie.");
    contents.add(key);
  }
  return data;
}
export function createSession(
  bank: Question[],
  count: number,
  instant: boolean,
  random = Math.random,
): Session {
  // Defend callers that bypass validation, including repeated IDs or aliases.
  const ids = new Set<string>();
  const contents = new Set<string>();
  const pool = bank.filter((q) => {
    const key = questionKey(q);
    const duplicate = ids.has(q.id) || contents.has(key);
    ids.add(q.id);
    contents.add(key);
    return !duplicate;
  });
  if (![15, 30, 45, 60, 75].includes(count) || count > pool.length)
    throw new Error("Nieprawidłowa liczba pytań.");
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return {
    questions: pool.slice(0, count),
    instant,
    index: 0,
    selected: null,
    confirmed: false,
    answers: [],
    done: false,
  };
}
export function chooseAnswer(s: Session, selected: number): Session {
  if (
    s.done ||
    s.confirmed ||
    !Number.isInteger(selected) ||
    selected < 0 ||
    selected > 2
  )
    return s;
  return { ...s, selected };
}
export function confirmAnswer(s: Session): Session {
  if (s.done || s.confirmed || s.selected === null) return s;
  return { ...s, confirmed: true, answers: [...s.answers, s.selected] };
}
export function nextQuestion(s: Session): Session {
  if (s.done || !s.confirmed) return s;
  return s.index === s.questions.length - 1
    ? { ...s, done: true }
    : { ...s, index: s.index + 1, selected: null, confirmed: false };
}
export function scoreSession(s: Session) {
  const correct = s.answers.reduce(
    (n, answer, i) => n + Number(answer === s.questions[i].correctAnswer),
    0,
  );
  return {
    correct,
    total: s.questions.length,
    percentage: Math.round((correct / s.questions.length) * 100),
  };
}
