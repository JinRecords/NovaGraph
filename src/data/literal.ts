/**
 * Tolerant parser for JavaScript object/array *literals* found inside the
 * site's minified bundles. MV3 forbids eval, so we parse the subset of JS that
 * data tables use: objects, arrays, strings ('..', "..", `..` without
 * interpolation), numbers, booleans (true/false/!0/!1), null/undefined.
 * Anything else (function calls, identifiers, template interpolations) is
 * skipped and yields `undefined` instead of aborting the whole parse.
 */

const WS = /\s/;

export class LiteralParser {
  private i = 0;
  constructor(private src: string) {}

  static parseAt(src: string, start: number): { value: unknown; end: number } {
    const p = new LiteralParser(src);
    p.i = start;
    const value = p.value();
    return { value, end: p.i };
  }

  private ws() {
    while (this.i < this.src.length && WS.test(this.src[this.i])) this.i++;
  }

  private value(): unknown {
    this.ws();
    const c = this.src[this.i];
    if (c === '{') return this.object();
    if (c === '[') return this.array();
    if (c === '"' || c === "'" || c === '`') return this.string();
    if (c === '-' || c === '.' || (c >= '0' && c <= '9')) {
      const n = this.number();
      if (n !== undefined) return n;
    }
    if (this.src.startsWith('!0', this.i)) { this.i += 2; return true; }
    if (this.src.startsWith('!1', this.i)) { this.i += 2; return false; }
    for (const [kw, v] of [['true', true], ['false', false], ['null', null], ['void 0', undefined], ['undefined', undefined]] as const) {
      if (this.src.startsWith(kw, this.i) && !/[\w$]/.test(this.src[this.i + kw.length] || '')) {
        this.i += kw.length;
        return v;
      }
    }
    this.skipExpression();
    return undefined;
  }

  /** Skip an unsupported expression up to the next , ] } at depth 0. */
  private skipExpression() {
    let depth = 0;
    while (this.i < this.src.length) {
      const c = this.src[this.i];
      if (c === '"' || c === "'" || c === '`') { this.string(); continue; }
      if (c === '(' || c === '[' || c === '{') depth++;
      else if (c === ')' || c === ']' || c === '}') {
        if (depth === 0) return;
        depth--;
      } else if (c === ',' && depth === 0) return;
      this.i++;
    }
  }

  private number(): number | undefined {
    const m = /^-?(?:0x[\da-f]+|\d*\.?\d+(?:e[+-]?\d+)?)/i.exec(this.src.slice(this.i, this.i + 40));
    if (!m) return undefined;
    this.i += m[0].length;
    return Number(m[0]);
  }

  private string(): string {
    const q = this.src[this.i++];
    let out = '';
    while (this.i < this.src.length) {
      const c = this.src[this.i++];
      if (c === q) return out;
      if (c === '\\') {
        const e = this.src[this.i++];
        switch (e) {
          case 'n': out += '\n'; break;
          case 't': out += '\t'; break;
          case 'r': out += '\r'; break;
          case 'b': out += '\b'; break;
          case 'f': out += '\f'; break;
          case 'v': out += '\v'; break;
          case '0': out += '\0'; break;
          case 'u': {
            if (this.src[this.i] === '{') {
              const end = this.src.indexOf('}', this.i);
              out += String.fromCodePoint(parseInt(this.src.slice(this.i + 1, end), 16));
              this.i = end + 1;
            } else {
              out += String.fromCharCode(parseInt(this.src.slice(this.i, this.i + 4), 16));
              this.i += 4;
            }
            break;
          }
          case 'x':
            out += String.fromCharCode(parseInt(this.src.slice(this.i, this.i + 2), 16));
            this.i += 2;
            break;
          case '\n': break;
          default: out += e;
        }
        continue;
      }
      if (q === '`' && c === '$' && this.src[this.i] === '{') {
        // interpolation: skip the expression, keep a marker
        let depth = 1;
        this.i++;
        while (this.i < this.src.length && depth > 0) {
          const d = this.src[this.i++];
          if (d === '{') depth++;
          else if (d === '}') depth--;
        }
        out += '${…}';
        continue;
      }
      out += c;
    }
    return out;
  }

  private key(): string | undefined {
    this.ws();
    const c = this.src[this.i];
    if (c === '"' || c === "'" || c === '`') return this.string();
    if (c === '[') { // computed key – unsupported
      this.skipBalanced('[', ']');
      return undefined;
    }
    const m = /^[\w$]+/.exec(this.src.slice(this.i, this.i + 200));
    if (!m) return undefined;
    this.i += m[0].length;
    return m[0];
  }

  private skipBalanced(open: string, close: string) {
    let depth = 0;
    while (this.i < this.src.length) {
      const c = this.src[this.i];
      if (c === '"' || c === "'" || c === '`') { this.string(); continue; }
      this.i++;
      if (c === open) depth++;
      else if (c === close && --depth === 0) return;
    }
  }

  private object(): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    this.i++; // {
    for (;;) {
      this.ws();
      if (this.src[this.i] === '}') { this.i++; return out; }
      if (this.src.startsWith('...', this.i)) { this.i += 3; this.skipExpression(); }
      else {
        const k = this.key();
        this.ws();
        if (this.src[this.i] === ':') {
          this.i++;
          const v = this.value();
          if (k !== undefined) out[k] = v;
        } else if (this.src[this.i] === '(') {
          // method shorthand – skip params and body
          this.skipBalanced('(', ')');
          this.ws();
          if (this.src[this.i] === '{') this.skipBalanced('{', '}');
        } else if (k !== undefined) {
          out[k] = undefined; // shorthand property referencing a variable
        }
      }
      this.ws();
      if (this.src[this.i] === ',') { this.i++; continue; }
      if (this.src[this.i] === '}') { this.i++; return out; }
      if (this.i >= this.src.length) return out;
      this.skipExpression();
    }
  }

  private array(): unknown[] {
    const out: unknown[] = [];
    this.i++; // [
    for (;;) {
      this.ws();
      if (this.src[this.i] === ']') { this.i++; return out; }
      out.push(this.value());
      this.ws();
      if (this.src[this.i] === ',') { this.i++; continue; }
      if (this.src[this.i] === ']') { this.i++; return out; }
      if (this.i >= this.src.length) return out;
      this.skipExpression();
    }
  }
}

/** Find the end index (exclusive) of a balanced literal starting at `start`. */
export function matchBracket(src: string, start: number): number {
  const open = src[start];
  const close = open === '[' ? ']' : open === '{' ? '}' : ')';
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (c === '"' || c === "'" || c === '`') {
      i++;
      while (i < src.length && src[i] !== c) {
        if (src[i] === '\\') i++;
        i++;
      }
      continue;
    }
    if (c === open) depth++;
    else if (c === close && --depth === 0) return i + 1;
  }
  return -1;
}

/**
 * Locate the innermost literal (array or object, per `open`) that is assigned
 * to a variable (`x=[...]`) and contains `marker`, then parse it.
 */
export function extractAssignedLiteral(src: string, marker: string | number, open: '[' | '{'): unknown {
  const at = typeof marker === 'number' ? marker : src.indexOf(marker);
  if (at < 0) return undefined;
  let pos = at;
  for (let guard = 0; guard < 4000 && pos > 0; guard++) {
    const s = src.lastIndexOf(open, pos - 1);
    if (s < 0) return undefined;
    pos = s;
    const prev = src.slice(Math.max(0, s - 2), s).trimEnd();
    if (!prev.endsWith('=')) continue;
    const end = matchBracket(src, s);
    if (end > at) return LiteralParser.parseAt(src, s).value;
  }
  return undefined;
}

/** All indices of `needle` in `src`. */
export function indicesOf(src: string, needle: string): number[] {
  const out: number[] = [];
  let i = src.indexOf(needle);
  while (i >= 0) {
    out.push(i);
    i = src.indexOf(needle, i + needle.length);
  }
  return out;
}

