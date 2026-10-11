/**
 * A small TypeScript tokenizer for syntax coloring. Sticky regexes scan the
 * source left to right; no parsing, no DOM, no `innerHTML`.
 *
 * @module
 */

export type TokenKind =
  | "comment"
  | "string"
  | "number"
  | "keyword"
  | "type"
  | "call"
  | "punct"
  | "plain";

export interface Token {
  readonly kind: TokenKind;
  readonly text: string;
}

const KEYWORDS =
  "import|export|from|const|let|var|function|return|if|else|for|of|in|await|async|type|interface|readonly|new|try|catch|finally|switch|case|default|true|false|null|undefined|typeof|as|extends|throw|break|continue|while|satisfies|void|keyof";

const SCANNERS: readonly [TokenKind, RegExp][] = [
  ["comment", /\/\/[^\n]*|\/\*[\s\S]*?\*\//y],
  ["string", /"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/y],
  ["number", /\b\d[\d_]*(?:\.\d+)?\b/y],
  ["keyword", new RegExp(`\\b(?:${KEYWORDS})\\b`, "y")],
  ["type", /\b[A-Z][A-Za-z0-9_]*\b/y],
  ["call", /\b[a-z_$][\w$]*(?=\s*\()/y],
  ["plain", /[A-Za-z_$][\w$]*|\s+/y],
  ["punct", /[{}()[\];,.:<>=+\-*/!?&|%^~@#]+/y],
];

/** Split source into colored tokens. */
export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let at = 0;
  while (at < source.length) {
    let matched = false;
    for (const [kind, pattern] of SCANNERS) {
      pattern.lastIndex = at;
      const match = pattern.exec(source);
      if (match === null || match[0] === "") continue;
      tokens.push({ kind, text: match[0] });
      at += match[0].length;
      matched = true;
      break;
    }
    if (!matched) tokens.push({ kind: "plain", text: source[at++] ?? "" });
  }
  return tokens;
}

/** Regroup tokens into lines, splitting any token that spans a newline. */
export function toLines(tokens: readonly Token[]): Token[][] {
  const lines: Token[][] = [[]];
  for (const token of tokens) {
    token.text.split("\n").forEach((piece, i) => {
      if (i > 0) lines.push([]);
      if (piece !== "") {
        lines[lines.length - 1]?.push({ kind: token.kind, text: piece });
      }
    });
  }
  return lines;
}

/** Should this file be colored as code? */
export function isCode(path: string): boolean {
  return /\.(ts|json|jsonc)$/.test(path);
}
