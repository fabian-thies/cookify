import assert from 'node:assert/strict';
import {remainingSeconds} from '../src/lib/timer.ts';

assert.equal(remainingSeconds(60_000, 0), 60);
assert.equal(remainingSeconds(60_000, 59_001), 1);
assert.equal(remainingSeconds(60_000, 60_000), 0);
assert.equal(remainingSeconds(60_000, 120_000), 0, 'A suspended tab must finish overdue timers');
assert.equal(remainingSeconds(180_000, 120_000), 60, 'A resumed tab must account for elapsed time');
console.log('Timer checks passed');
