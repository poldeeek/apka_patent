import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateQuestions, questionKey, createSession, chooseAnswer, confirmAnswer, nextQuestion, scoreSession } from '../lib/quiz.ts';
const bank=validateQuestions(JSON.parse(fs.readFileSync(new URL('../data/questions.json',import.meta.url),'utf8')));
const source=JSON.parse(fs.readFileSync(new URL('../data/questions-source.json',import.meta.url),'utf8'));
const rules=JSON.parse(fs.readFileSync(new URL('../data/question-deduplication.json',import.meta.url),'utf8'));
const byId=new Map(bank.map(q=>[q.id,q]));
const question=n=>byId.get(`patent-2026-${String(n).padStart(3,'0')}`);
assert.equal(bank.length,140);
assert.equal(source.questions.length,bank.length+rules.duplicates.length);
assert.equal(new Set(bank.map(questionKey)).size,bank.length);
for (const rule of rules.duplicates) {
  assert(!byId.has(rule.id));
  assert(byId.has(rule.duplicateOf));
  assert.equal(questionKey({...byId.get(rule.duplicateOf),text:rule.text}),questionKey(byId.get(rule.duplicateOf)));
}
assert.equal(bank.filter(q=>q.image).length,14);
assert.equal(new Set(bank.filter(q=>q.image).map(q=>q.image.src)).size,12);
for (const q of bank) {
  const original=source.questions.find(original=>original.id===q.id);
  assert.equal(original.id,q.id);
  assert.equal(original.printedOptionLabels[q.correctAnswer],original.highlightedOptionLabel);
}
assert.equal(source.questions[73].printedNumber,44);
assert.equal(question(111).correctAnswer,1); // Source labels A/C/D: highlighted C is the second option.
assert.equal(question(139).correctAnswer,0);
for (const i of [116,117]) assert.equal(question(i).image.src,question(115).image.src);
assert.equal(question(191).correctAnswer,1); // Question and highlighted answer span pages 22–23.
for (const count of [15,30,45,60,75]) for (const instant of [true,false]) {
  let state=createSession(bank,count,instant);
  assert.equal(state.questions.length,count);
  assert.equal(new Set(state.questions.map(q=>q.id)).size,count);
  assert.equal(new Set(state.questions.map(questionKey)).size,count);
  assert.equal(confirmAnswer(state),state);
  assert.equal(nextQuestion(state),state);
  for(let i=0;i<count;i++) {
    const answer=i%2===0?state.questions[i].correctAnswer:(state.questions[i].correctAnswer+1)%3;
    state=confirmAnswer(chooseAnswer(state,answer));
    assert.equal(confirmAnswer(state),state);
    assert.equal(chooseAnswer(state,(answer+1)%3),state);
    state=nextQuestion(state);
  }
  assert.equal(state.done,true);
  assert.equal(state.answers.length,count);
  assert.equal(scoreSession(state).correct,Math.ceil(count/2));
  assert.equal(nextQuestion(state),state);
}
const ids=bank.map(q=>q.id);
assert.notDeepEqual(createSession(bank,75,true,()=>0).questions.map(q=>q.id),createSession(bank,75,true,()=>.99999).questions.map(q=>q.id));
assert.deepEqual(bank.map(q=>q.id),ids);
for (const q of bank) if(q.image) assert(fs.existsSync(new URL('../public'+q.image.src,import.meta.url)));
assert.throws(()=>createSession(bank,200,true));
assert.throws(()=>validateQuestions(bank.map((q,i)=>i===1?bank[0]:q)));
console.log('PASS: 5 test sizes × 2 modes, randomness, scoring, answer guards, bank integrity and image files.');

// Regression: typography, different IDs and reviewed paraphrases cannot repeat.
const repeated={...bank[0],id:'copy',text:`  ${bank[0].text.toUpperCase()} !!! `};
assert.throws(()=>validateQuestions([...bank,repeated]),/Powtórzona treść/);
const paraphrase={...question(11),id:'paraphrase',text:'Główne parametry charakteryzujące śrubę to:'};
assert.throws(()=>validateQuestions([...bank,paraphrase]),/Powtórzona treść/);
const dirty=[...bank,repeated,paraphrase,{...bank[0],text:'Inny tekst przy tym samym ID'}];
let seed=123456;
const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
for (const count of [15,30,45,60,75]) for(let run=0;run<100;run++) {
  const session=createSession(dirty,count,true,random);
  assert.equal(session.questions.length,count);
  assert.equal(new Set(session.questions.map(q=>q.id)).size,count);
  assert.equal(new Set(session.questions.map(questionKey)).size,count);
}
assert.throws(()=>createSession(Array(75).fill(bank[0]),75,true));
assert.throws(()=>createSession([...bank.slice(0,14),repeated],15,true));
// Similar prompts with different diagrams or tested values remain distinct.
assert.notEqual(questionKey(question(190)),questionKey(question(192)));
assert.notEqual(questionKey(question(191)),questionKey(question(193)));
assert.notEqual(questionKey(question(115)),questionKey(question(116)));
assert.notEqual(questionKey(question(28)),questionKey(question(73)));
assert.notEqual(questionKey(question(97)),questionKey(question(102)));
console.log('PASS: duplicate rejection, reviewed paraphrases, 500 draws with a dirty bank, unique-count limits and distinct images/values.');
