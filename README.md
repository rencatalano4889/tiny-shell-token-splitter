# tiny-shell-token-splitter

Splits a shell command string into argument tokens following POSIX quoting and escape rules.

```js
import { splitShellTokens, ShellSyntaxError } from 'tiny-shell-token-splitter';

splitShellTokens('cp -r "my dir" /tmp');
// => ['cp', '-r', 'my dir', '/tmp']

splitShellTokens("grep -e 'a b' -e c\\ d file");
// => ['grep', '-e', 'a b', '-e', 'c d', 'file']

try {
  splitShellTokens("echo 'unterminated");
} catch (err) {
  if (err instanceof ShellSyntaxError) {
    // err.position points at the offending character
  }
}
```

## Why this exists

Most tokenizers either go through a full shell parser (heavy, and pulls in a
runtime you may not want) or hand-roll a `split(' ')` that breaks the moment a
path contains a space. This library takes the middle road: it implements the
quoting and escaping rules that actually appear in command strings, and
nothing else. No variable expansion, no command substitution, no globbing, no
redirection parsing. That is a deliberate trade-off — the surface area is
small enough to test exhaustively, and the behaviour is predictable.

## The edge you will hit

An unterminated quote or a trailing backslash is a syntax error, not a silent
partial token. The library throws `ShellSyntaxError` with a `position`
property so you can point at the bad character. This means you cannot feed it
a truncated string and expect a best-effort result; if you need that, catch
the error and decide what to do yourself.

Empty quoted strings (`''` or `""`) produce an empty token, because they are
explicit words in shell grammar. Runs of unquoted whitespace do not produce
empty tokens.

## API

- `splitShellTokens(input: string): string[]` — split `input` into tokens.
  Throws `TypeError` for non-string input, `ShellSyntaxError` for unterminated
  quotes or a trailing backslash.
- `ShellSyntaxError` — `Error` subclass with `name === 'ShellSyntaxError'` and
  a numeric `position` property.
