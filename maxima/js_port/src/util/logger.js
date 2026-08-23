/* Collects log lines; optionally echoes to console or a sink. */
export class Logger {
  constructor({ echo = false, sink = null } = {}) {
    this.lines = [];
    this.echo = echo;
    this.sink = sink;
  }

  log(...parts) {
    const line = parts.map((p) => (typeof p === 'string' ? p : fmt(p))).join(' ');
    this.lines.push(line);
    if (this.echo) console.log(line);
    if (this.sink) this.sink(line);
    return line;
  }

  rule(char = '-', width = 60) {
    this.log(char.repeat(width));
  }

  header(title) {
    this.rule('=');
    this.log(title);
    this.rule('=');
  }

  table(columns, rows, widths = null) {
    const w = widths || columns.map((c) => Math.max(String(c).length, 10));
    this.log(columns.map((c, i) => pad(String(c), w[i])).join(' | '));
    this.log(w.map((n) => '-'.repeat(n)).join('-+-'));
    for (const r of rows) {
      this.log(r.map((c, i) => pad(fmt(c), w[i])).join(' | '));
    }
  }

  text() {
    return this.lines.join('\n');
  }
}

export function pad(s, n) {
  s = String(s);
  return s.length >= n ? s : s + ' '.repeat(n - s.length);
}

export function fmt(v) {
  if (v === null || v === undefined) return String(v);
  if (typeof v === 'number') {
    if (Number.isInteger(v)) return String(v);
    if (!Number.isFinite(v)) return String(v);
    return v.toPrecision(6).replace(/0+$/, '').replace(/\.$/, '');
  }
  if (Array.isArray(v)) return '[' + v.map(fmt).join(', ') + ']';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
