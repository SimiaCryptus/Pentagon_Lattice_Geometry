// ui.js
  // Side-panel rendering of selected tile info and walk history.
  
  import { toAlg, toFloat } from "./field.js";
  import { vAlg, vFloat } from "./geometry.js";
  
  export function renderTileInfo(el, tile, lattice) {
    if (!tile) {
      el.innerHTML = "<em>No tile selected.</em>";
      return;
    }
    const [cxF, cyF] = tile.centroidF;
    const html = [];
  
    // --- Summary section ---
    html.push(`<div class="section">Identity</div>`);
    html.push(kv("Index", `<code>#${tile.index}</code>`));
    html.push(kv("Depth", `${tile.depth} hop${tile.depth === 1 ? "" : "s"} from origin`));
    html.push(kv("Sheet",
      `<span class="pill sheet">s${tile.sheet}</span>
       <span style="color:var(--muted);font-size:11px">mod ${lattice.groupOrder}</span>`));
     html.push(kv("Orientation σ",
       `<span class="pill">${tile.sigma === 0 ? "↑" : "↓"}</span>
        <span style="color:var(--muted);font-size:11px">Z₂ bipartition (odd n-gon)</span>`));
     html.push(kv("Edge frame",
       `<span class="pill">f${tile.orient}</span>
        <span style="color:var(--muted);font-size:11px">vertex-labeling ∈ Z₅, not a physical rotation</span>`));
  
    // --- Centroid ---
    html.push(`<div class="section">Centroid</div>`);
    html.push(algBlock(tile.centroid, cxF, cyF));
  
    // --- Vertices ---
    html.push(`<div class="section">Vertices</div>`);
    for (let i = 0; i < tile.verts.length; i++) {
      const v = tile.verts[i];
      const [fx, fy] = tile.vertsF[i];
      html.push(`<div class="vertex-row">
        <span class="pill">v${i}</span>
        ${algBlock(v, fx, fy)}
      </div>`);
    }
  
    // --- Neighbors ---
    html.push(`<div class="section">Neighbors</div>`);
    for (let k = 0; k < 5; k++) {
      const nIdx = tile.neighbors[k];
      if (nIdx === null) {
        html.push(`<div class="neighbor-row missing">
          <span class="pill edge">edge ${k + 1}</span>
          <span>out of lattice</span>
          <span></span>
        </div>`);
        continue;
      }
      const n = lattice.tiles[nIdx];
      html.push(`<div class="neighbor-row">
        <span class="pill edge">edge ${k + 1}</span>
        <span>→ #${n.index} · <span style="color:var(--accent3)">s${n.sheet}</span> · <span style="color:var(--accent2)">o${n.orient}</span></span>
        <span class="delta">Δs = +${tile.neighborSheetDeltas[k]}</span>
      </div>`);
    }
  
    el.innerHTML = html.join("");
  }
  
  function kv(label, content) {
    return `<div class="kv">
      <span class="k">${label}</span>
      <span class="v">${content}</span>
    </div>`;
  }
  
  function algBlock(point, fx, fy) {
    const xStr = toAlg(point.x);
    const yStr = toAlg(point.y);
    return `<div class="alg-block">
      <div><span class="axis">x</span>= ${escapeHtml(xStr)}</div>
      <div><span class="axis">y</span>= ${escapeHtml(yStr)}</div>
      <div class="float">≈ (${fx.toFixed(6)}, ${fy.toFixed(6)})</div>
    </div>`;
  }
  
  function escapeHtml(s) {
    return s.replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  }
  
  export function appendWalkStep(listEl, tile, edgeK, reason) {
    const li = document.createElement("li");
    const r = reason ? ` <span style="color:var(--muted)">(${reason})</span>` : "";
    li.innerHTML = edgeK !== null
      ? `<span class="pill edge">e${edgeK + 1}</span> → #${tile.index}
         <span class="pill sheet">s${tile.sheet}</span>
         <span class="pill">o${tile.orient}</span>${r}`
      : `<span style="color:var(--accent)">●</span> start #${tile.index}
         <span class="pill sheet">s${tile.sheet}</span>${r}`;
    listEl.appendChild(li);
    listEl.scrollTop = listEl.scrollHeight;
  }
  
  export function clearWalk(listEl) {
    listEl.innerHTML = "";
  }