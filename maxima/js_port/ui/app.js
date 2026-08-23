/* Simple, data-oriented harness for the ported experiments. */

import { EXPERIMENTS, getExperiment, defaultParams } from '../src/experiments/registry.js';
import { Logger } from '../src/util/logger.js';

const $ = (id) => document.getElementById(id);
const els = {
  experiment: $('experiment'),
  description: $('description'),
  params: $('params'),
  run: $('run'),
  reset: $('reset'),
  status: $('status'),
  log: $('log'),
  json: $('json'),
  tables: $('tables'),
  dlJson: $('dl-json'),
  dlCsv: $('dl-csv'),
  dlLog: $('dl-log'),
};

let current = EXPERIMENTS[0].id;
let lastResult = null;

/* ---------- experiment select ---------- */
for (const e of EXPERIMENTS) {
  const o = document.createElement('option');
  o.value = e.id;
  o.textContent = e.title;
  els.experiment.appendChild(o);
}

els.experiment.addEventListener('change', () => {
  current = els.experiment.value;
  renderParams();
});

els.reset.addEventListener('click', () => renderParams());

function renderParams(values = null) {
  const exp = getExperiment(current);
  els.description.textContent = exp.description;
  els.params.innerHTML = '';
  const vals = values || defaultParams(current);
  for (const p of exp.schema) {
    const label = document.createElement('label');
    label.className = 'field';
    const span = document.createElement('span');
    span.textContent = p.label || p.key;
    let input;
    if (p.type === 'select') {
      input = document.createElement('select');
      for (const opt of p.options) {
        const o = document.createElement('option');
        o.value = opt;
        o.textContent = opt;
        input.appendChild(o);
      }
      input.value = vals[p.key];
    } else if (p.type === 'boolean') {
      input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = Boolean(vals[p.key]);
    } else if (p.type === 'text') {
      input = document.createElement('input');
      input.type = 'text';
      input.value = vals[p.key];
    } else {
      input = document.createElement('input');
      input.type = 'number';
      if (p.min !== undefined) input.min = p.min;
      if (p.max !== undefined) input.max = p.max;
      if (p.step !== undefined) input.step = p.step;
      input.value = vals[p.key];
    }
    input.dataset.key = p.key;
    input.dataset.ptype = p.type;
    if (p.type === 'boolean') {
      label.appendChild(input);
      label.appendChild(span);
      span.style.display = 'inline';
    } else {
      label.appendChild(span);
      label.appendChild(input);
    }
    els.params.appendChild(label);
  }
}

function collectParams() {
  const out = {};
  for (const el of els.params.querySelectorAll('[data-key]')) {
    const k = el.dataset.key;
    const t = el.dataset.ptype;
    if (t === 'boolean') out[k] = el.checked;
    else if (t === 'number') out[k] = Number(el.value);
    else out[k] = el.value;
  }
  return out;
}

/* ---------- tabs ---------- */
for (const tab of document.querySelectorAll('.tab')) {
  tab.addEventListener('click', () => {
    for (const t of document.querySelectorAll('.tab')) t.classList.remove('active');
    for (const p of document.querySelectorAll('.pane')) p.classList.remove('active');
    tab.classList.add('active');
    $(`tab-${tab.dataset.tab}`).classList.add('active');
  });
}

/* ---------- run ---------- */
els.run.addEventListener('click', async () => {
  const exp = getExperiment(current);
  const params = collectParams();
  setStatus(`running ${exp.id} ...`, '');
  els.run.disabled = true;
  els.log.textContent = '';
  lastResult = null;
  setDownloads(false);

  // yield a frame so the status paints before the (synchronous) run
  await new Promise((r) => setTimeout(r, 20));

  const t0 = performance.now();
  try {
    const logger = new Logger({
      sink: (line) => {
        els.log.textContent += line + '\n';
      },
    });
    const result = exp.run({ ...defaultParams(current), ...params }, logger);
    lastResult = result;
    els.log.textContent = result.log || logger.text();
    els.json.textContent = JSON.stringify(stripLog(result), replacer, 2);
    renderTables(result.tables || []);
    const dt = (performance.now() - t0).toFixed(0);
    const failed = result.passed === false || (result.failures && result.failures.length);
    setStatus(
      `${exp.id} finished in ${dt} ms` + (failed ? ' — FAILURES present' : ''),
      failed ? 'err' : 'ok'
    );
    setDownloads(true);
  } catch (err) {
    console.error(err);
    els.log.textContent += `\nERROR: ${err.stack || err}`;
    setStatus(`error: ${err.message || err}`, 'err');
  } finally {
    els.run.disabled = false;
  }
});

function stripLog(res) {
  const { log, ...rest } = res;
  return rest;
}

function replacer(key, value) {
  if (value instanceof Float64Array || value instanceof Int32Array || value instanceof Uint8Array)
    return Array.from(value);
  if (key === 'ring' || key === 'adjacency' || key === 'coeffs') return undefined;
  if (typeof value === 'number' && !Number.isFinite(value)) return String(value);
  return value;
}

function renderTables(tables) {
  els.tables.innerHTML = '';
  if (!tables.length) {
    els.tables.textContent = '(no tables)';
    return;
  }
  for (const t of tables) {
    const tbl = document.createElement('table');
    const cap = document.createElement('caption');
    cap.textContent = t.title;
    tbl.appendChild(cap);
    const thead = document.createElement('thead');
    const hr = document.createElement('tr');
    for (const c of t.columns) {
      const th = document.createElement('th');
      th.textContent = c;
      hr.appendChild(th);
    }
    thead.appendChild(hr);
    tbl.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const row of t.rows.slice(0, 500)) {
      const tr = document.createElement('tr');
      for (const cell of row) {
        const td = document.createElement('td');
        td.textContent = fmtCell(cell);
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    tbl.appendChild(tbody);
    els.tables.appendChild(tbl);
    if (t.rows.length > 500) {
      const note = document.createElement('div');
      note.textContent = `(${t.rows.length - 500} further rows omitted; use CSV export)`;
      note.style.color = 'var(--muted)';
      note.style.marginBottom = '16px';
      els.tables.appendChild(note);
    }
  }
}

const fmtCell = (v) => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toPrecision(6);
  if (typeof v === 'boolean') return v ? 'yes' : '';
  if (Array.isArray(v)) return `[${v.join(' ')}]`;
  return String(v);
};

function setStatus(msg, cls) {
  els.status.textContent = msg;
  els.status.className = `status ${cls}`;
}

function setDownloads(on) {
  els.dlJson.disabled = !on;
  els.dlCsv.disabled = !on;
  els.dlLog.disabled = !on;
}

els.dlJson.addEventListener('click', () =>
  download(`${current}.json`, JSON.stringify(stripLog(lastResult), replacer, 2), 'application/json')
);

els.dlLog.addEventListener('click', () =>
  download(`${current}.log.txt`, lastResult.log || '', 'text/plain')
);

els.dlCsv.addEventListener('click', () => {
  const csv = lastResult.csv || tablesToCsv(lastResult.tables || []);
  download(`${current}.csv`, csv, 'text/csv');
});

function tablesToCsv(tables) {
  return tables
    .map((t) =>
      [`# ${t.title}`, t.columns.join(','), ...t.rows.map((r) => r.map(csvCell).join(','))].join(
        '\n'
      )
    )
    .join('\n\n');
}

const csvCell = (v) => {
  const s = fmtCell(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function download(name, text, mime) {
  const blob = new Blob([text], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

renderParams();
