/**
 * POSIX shell word splitting.
 *
 * The splitter walks the input character by character and maintains a small
 * amount of state: whether we are inside single quotes, inside double
 * quotes, and whether the current character was backslash-escaped. A token
 * is emitted whenever we hit unquoted whitespace while a token is in
 * progress.
 *
 * Design decisions worth calling out:
 *
 *  - Quoting is tracked with two independent booleans rather than a single
 *    mode enum. The grammar is small enough that a mode enum invites
 *    impossible states (e.g. "in single quotes and double quotes at once")
 *    and the boolean pair is easier to reason about.
 *
 *  - An unterminated quote is reported as an error instead of being silently
 *    accepted. Real shells reject it too, and silently returning the partial
 *    token would hide a genuine typo in the caller's input.
 *
 *  - A trailing backslash is also an error. POSIX says a backslash at the
 *    end of input continues onto the next line; since we have no next line,
 *    the only honest answers are "error" or "drop it". We error.
 *
 *  - Empty tokens are NOT produced. `a  b` and `a b` both yield ['a', 'b'].
 *    The empty string between two spaces is not a word in shell grammar.
 *
 *  - `''` and `""` DO produce an empty token, because they are explicit
 *    quoted words. This is the one case where an empty string is meaningful.
 */

export class ShellSyntaxError extends Error {
  constructor(message, position) {
    super(message);
    this.name = 'ShellSyntaxError';
    this.position = position;
  }
}

const isWhitespace = (ch) => ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r';

/**
 * Split a shell command string into argument tokens.
 *
 * @param {string} input
 * @returns {string[]}
 * @throws {ShellSyntaxError} on unterminated quotes or a trailing backslash.
 */
export function splitShellTokens(input) {
  if (typeof input !== 'string') {
    throw new TypeError('splitShellTokens expects a string');
  }

  const tokens = [];
  let current = '';
  let inSingle = false;
  let inDouble = false;
  let escaped = false;
  // `hasToken` distinguishes "we have accumulated an empty quoted token"
  // from "we have not started a token at all". Without it, `''` would be
  // dropped because `current` is the empty string.
  let hasToken = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (escaped) {
      // Inside double quotes, backslash only escapes a small set of
      // characters. Outside quotes and inside single quotes the rules
      // differ, but for our purposes the practical rule is: inside double
      // quotes, a backslash before a non-special character is literal.
      if (inDouble && !isDoubleQuoteEscapable(ch)) {
        current += '\\';
      }
      current += ch;
      escaped = false;
      hasToken = true;
      continue;
    }

    if (inSingle) {
      if (ch === "'") {
        inSingle = false;
      } else {
        current += ch;
      }
      hasToken = true;
      continue;
    }

    if (inDouble) {
      if (ch === '"') {
        inDouble = false;
      } else if (ch === '\\') {
        escaped = true;
      } else {
        current += ch;
      }
      hasToken = true;
      continue;
    }

    if (isWhitespace(ch)) {
      if (hasToken) {
        tokens.push(current);
        current = '';
        hasToken = false;
      }
      continue;
    }

    if (ch === '\\') {
      escaped = true;
      hasToken = true;
      continue;
    }

    if (ch === "'") {
      inSingle = true;
      hasToken = true;
      continue;
    }

    if (ch === '"') {
      inDouble = true;
      hasToken = true;
      continue;
    }

    current += ch;
    hasToken = true;
  }

  if (escaped) {
    throw new ShellSyntaxError('trailing backslash at end of input', input.length - 1);
  }
  if (inSingle) {
    throw new ShellSyntaxError('unterminated single quote', input.length - 1);
  }
  if (inDouble) {
    throw new ShellSyntaxError('unterminated double quote', input.length - 1);
  }

  if (hasToken) {
    tokens.push(current);
  }

  return tokens;
}

/**
 * Characters that a backslash escapes inside double quotes, per POSIX.
 * `$`, backtick, `"`, `\\`, and newline. We do not treat newline specially
 * because we do not support line continuation in a single-line input.
 */
function isDoubleQuoteEscapable(ch) {
  return ch === '$' || ch === '`' || ch === '"' || ch === '\\';
}
