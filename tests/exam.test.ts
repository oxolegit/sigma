import { describe, expect, it } from 'vitest';
import { $answers, recordAnswer, score } from '../src/lib/exam';

describe('счёт контрольной', () => {
  it('считает отвеченные и верные', () => {
    expect(score({})).toEqual({ answered: 0, correct: 0 });
    expect(score({ А1: true, А2: false, А3: true })).toEqual({ answered: 3, correct: 2 });
  });
  it('ответ записывается по номеру вопроса', () => {
    recordAnswer('А7', false);
    recordAnswer('А8', true);
    expect(score($answers.get())).toEqual({ answered: 2, correct: 1 });
  });
});
