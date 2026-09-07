import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateQuestions, createSession, chooseAnswer, confirmAnswer, nextQuestion, scoreSession } from '../lib/quiz.ts';
const bank=validateQuestions(JSON.parse(fs.readFileSync(new URL('../data/questions.json',import.meta.url),'utf8')));
const source=JSON.parse(fs.readFileSync(new URL('../data/questions-source.json',import.meta.url),'utf8'));
assert.equal(bank.length,195);
assert.equal(source.questions.length,bank.length);
assert.equal(bank.filter(q=>q.image).length,14);
assert.equal(new Set(bank.filter(q=>q.image).map(q=>q.image.src)).size,12);
for (const [i,q] of bank.entries()) {
  assert.equal(q.id,`patent-2026-${String(i+1).padStart(3,'0')}`);
  const original=source.questions[i];
  assert.equal(original.id,q.id);
  assert.equal(original.printedOptionLabels[q.correctAnswer],original.highlightedOptionLabel);
}
assert.equal(source.questions[73].printedNumber,44);
assert.equal(bank[110].correctAnswer,1); // Source labels A/C/D: highlighted C is the second option.
assert.equal(bank[138].correctAnswer,0);
for (const i of [115,116]) assert.equal(bank[i].image.src,bank[114].image.src);
assert.equal(bank[190].correctAnswer,1); // Question and highlighted answer span pages 22–23.
for (const count of [15,30,45,60,75]) for (const instant of [true,false]) {
  let state=createSession(bank,count,instant);
  assert.equal(state.questions.length,count);
  assert.equal(new Set(state.questions.map(q=>q.id)).size,count);
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
