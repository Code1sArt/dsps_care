import assert from 'node:assert/strict';
import test from 'node:test';
import { currentAdvisingClasses } from '../src/lib/advisingClasses.ts';

const room = (id, isActive, year = 2569, term = 1) => ({
  id, name: 'ม.4/1', termId: id,
  term: { id, isActive, year, term },
});

test('attendance uses the new room even when the old room has the same name and comes first', () => {
  assert.deepEqual(currentAdvisingClasses([
    room(1, false), room(2, true, 2569, 2), room(3, false, 2570),
  ]).map(c => c.id), [2]);
});

test('attendance never falls back to a historical or future term', () => {
  assert.deepEqual(currentAdvisingClasses([room(1, false), room(3, false, 2570)]), []);
  assert.deepEqual(currentAdvisingClasses(), []);
});

test('all current advisory rooms are preserved', () => {
  assert.deepEqual(currentAdvisingClasses([room(1, true), room(2, true)]).map(c => c.id), [1, 2]);
});
