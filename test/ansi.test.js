import test from 'node:test';
import assert from 'node:assert/strict';
import { green, yellow, red, dim, stripAnsi } from '../dist/ansi.js';

test('green wraps text in ANSI codes', () => {
  assert.equal(green('hi'), '\x1b[32mhi\x1b[0m');
});

test('yellow, red, dim use their codes', () => {
  assert.equal(yellow('x'), '\x1b[33mx\x1b[0m');
  assert.equal(red('x'), '\x1b[31mx\x1b[0m');
  assert.equal(dim('x'), '\x1b[2mx\x1b[0m');
});

test('stripAnsi removes color codes', () => {
  assert.equal(stripAnsi(green('hi') + ' ' + red('yo')), 'hi yo');
});
