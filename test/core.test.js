import test from 'node:test';
import assert from 'node:assert/strict';

import { splitShellTokens, ShellSyntaxError } from '../src/index.js';

test('empty input yields no tokens', () => {
  assert.deepEqual(splitShellTokens(''), []);
});

test('whitespace-only input yields no tokens', () => {
  assert.deepEqual(splitShellTokens('   \t\n  '), []);
});

test('plain words split on runs of whitespace', () => {
  assert.deepEqual(splitShellTokens('ls -la /tmp'), ['ls', '-la', '/tmp']);
  assert.deepEqual(splitShellTokens('a   b\tc\n d'), ['a', 'b', 'c', 'd']);
});

test('leading and trailing whitespace are ignored', () => {
  assert.deepEqual(splitShellTokens('   echo hi   '), ['echo', 'hi']);
});

test('single quotes preserve everything literally', () => {
  assert.deepEqual(splitShellTokens("echo 'a b c'"), ['echo', 'a b c']);
  assert.deepEqual(splitShellTokens("echo 'a\\b'"), ['echo', 'a\\b']);
  assert.deepEqual(splitShellTokens("echo 'a" + '"' + "b'"), ['echo', 'a"b']);
});

test('double quotes allow spaces but strip the quotes', () => {
  assert.deepEqual(splitShellTokens('echo "a b c"'), ['echo', 'a b c']);
});

test('double quotes process backslash escapes for special characters', () => {
  assert.deepEqual(splitShellTokens('echo "a\\"b"'), ['echo', 'a"b']);
  assert.deepEqual(splitShellTokens('echo "a\\\\b"'), ['echo', 'a\\b']);
  assert.deepEqual(splitShellTokens('echo "a\\$b"'), ['echo', 'a$b']);
});

test('double quotes keep backslash literal before ordinary characters', () => {
  assert.deepEqual(splitShellTokens('echo "a\\nb"'), ['echo', 'a\\nb']);
});

test('backslash outside quotes escapes the next character', () => {
  assert.deepEqual(splitShellTokens('echo a\\ b'), ['echo', 'a b']);
  assert.deepEqual(splitShellTokens('echo \\"quoted\\"'), ['echo', '"quoted"']);
});

test('adjacent quoted and unquoted segments concatenate into one token', () => {
  assert.deepEqual(splitShellTokens('a"b c"d'), ['ab cd']);
  assert.deepEqual(splitShellTokens("a'b c'd"), ['ab cd']);
});

test('empty quoted strings produce empty tokens', () => {
  assert.deepEqual(splitShellTokens("''"), ['']);
  assert.deepEqual(splitShellTokens('""'), ['']);
  assert.deepEqual(splitShellTokens("a '' b"), ['a', '', 'b']);
});

test('unterminated single quote throws ShellSyntaxError', () => {
  assert.throws(() => splitShellTokens("echo 'oops"), (err) => {
    assert.ok(err instanceof ShellSyntaxError);
    assert.equal(err.name, 'ShellSyntaxError');
    return true;
  });
});

test('unterminated double quote throws ShellSyntaxError', () => {
  assert.throws(() => splitShellTokens('echo "oops'), ShellSyntaxError);
});

test('trailing backslash throws ShellSyntaxError', () => {
  assert.throws(() => splitShellTokens('echo hi\\'), ShellSyntaxError);
});

test('non-string input throws TypeError', () => {
  assert.throws(() => splitShellTokens(null), TypeError);
  assert.throws(() => splitShellTokens(42), TypeError);
});

test('quotes inside the other quote kind are literal', () => {
  assert.deepEqual(splitShellTokens("echo 'a\"b'"), ['echo', 'a"b']);
  assert.deepEqual(splitShellTokens('echo "a\'b"'), ['echo', "a'b"]);
});
