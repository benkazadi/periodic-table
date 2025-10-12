// DOM refs 
const tableEl = document.getElementById("periodicTable");
const searchInput = document.getElementById("searchInput");
const colorBySelect = document.getElementById("colorBy");
const categoryFilter = document.getElementById("categoryFilter");
const modalOverlay = document.getElementById("modalOverlay");
const modalContent = document.getElementById("modalContent");
const modalCard = document.getElementById("modalCard");
const modalClose = document.getElementById("modalClose");
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');

const categoryColors = {
  "diatomic nonmetal": "#9af1eaff",
  "polyatomic nonmetal": "#ffd700",
  "noble gas": "#0099ffff",
  "alkali metal": "#ff0000ff",
  "alkaline earth metal": "#ac8954ff",
  "metalloid": "#1bd10bff",
  "post-transition metal": "#00f7ffff",
  "transition metal": "#ff5e00ff",
  "lanthanide": "#e100ffff",
  "actinide": "#b41163ff"
};



function hexToRGBA(hex, alpha = 0.2){
  hex = hex.replace("#", "");
  const r = parseInt(hex.substring(0,2),16);
  const g = parseInt(hex.substring(2,4),16);
  const b = parseInt(hex.substring(4,6),16);
  return `rgba(${r},${g},${b},${alpha})`;
}


let colorBy = colorBySelect.value || "electronegativity";
let query = "";
let category = "all";
let lastFocused = null;

// Utility: compute min & max for a numeric field among elements
function computeRange(field, list){
  const vals = list.map(e => e[field]).filter(v => typeof v === "number" && !isNaN(v));
  if(vals.length === 0) return null;
  return { min: Math.min(...vals), max: Math.max(...vals) };
}

// Utility: linear color interpolation (from blue -> red)
function colorForValue(v, range){
  if(range === null || typeof v !== "number" || isNaN(v)) return "rgba(255,255,255,0.04)";
  const t = (v - range.min) / (range.max - range.min || 1); // 0..1
  const r = Math.round(60 + 195 * t);
  const g = Math.round(140 - 100 * t);
  const b = Math.round(220 - 180 * t);
  return `rgba(${r},${g},${b},0.18)`;
}

// Render table
function renderTable() {
  tableEl.innerHTML = "";

  const q = query.trim().toLowerCase();
  const filtered = ELEMENTS.filter(el => {
    const matchesQuery = !q ||
      el.name.toLowerCase().includes(q) ||
      el.symbol.toLowerCase().includes(q) ||
      String(el.number) === q;
    const matchesCategory = category === "all" || (el.category && el.category.toLowerCase() === category.toLowerCase());
    return matchesQuery && matchesCategory;
  });

  const range = computeRange(colorBy, filtered.length ? filtered : ELEMENTS);

  if (filtered.length === 0) {
    const msg = document.createElement("div");
    msg.style.gridColumn = "1 / -1";
    msg.style.padding = "18px";
    msg.style.color = "#cbd5e1";
    msg.textContent = "No elements match that search / filter.";
    tableEl.appendChild(msg);
    return updateConnectionLine();
  }

  // Determine if lanthanides/actinides exist in filtered results
  const hasLan = filtered.some(e => e.number >= 57 && e.number <= 71);
  const hasAct = filtered.some(e => e.number >= 89 && e.number <= 103);

  // ---------- LABELS ----------
  if (hasLan) {
    const lanLabel = document.createElement("div");
    lanLabel.className = "row-label";
    lanLabel.textContent = "* Lanthanides (57–71)";
    lanLabel.style.gridColumn = "1 / -1";
    lanLabel.style.gridRowStart = 9;
    lanLabel.style.textAlign = "left";
    tableEl.appendChild(lanLabel);
  }

  if (hasAct) {
    const actLabel = document.createElement("div");
    actLabel.className = "row-label";
    actLabel.textContent = "** Actinides (89–103)";
    actLabel.style.gridColumn = "1 / -1";
    actLabel.style.gridRowStart = 10;
    actLabel.style.textAlign = "left";
    tableEl.appendChild(actLabel);
  }

  // ---------- PLACEHOLDER TILES ----------
  if (hasLan) {
    const lanPlaceholder = document.createElement("div");
    lanPlaceholder.className = "element-tile placeholder";
    lanPlaceholder.style.gridRowStart = 6;
    lanPlaceholder.style.gridColumnStart = 3;
    lanPlaceholder.innerHTML = `<div class="element-symbol">57–71</div>`;
    tableEl.appendChild(lanPlaceholder);
  }

  if (hasAct) {
    const actPlaceholder = document.createElement("div");
    actPlaceholder.className = "element-tile placeholder";
    actPlaceholder.style.gridRowStart = 7;
    actPlaceholder.style.gridColumnStart = 3;
    actPlaceholder.id = "actinide-placeholder";
    actPlaceholder.innerHTML = `<div class="element-symbol">89–103</div>`;
    tableEl.appendChild(actPlaceholder);

    const actLine = document.createElement("div");
    actLine.className = "connection-line-L";
    tableEl.appendChild(actLine);
  }

  // ---------- ELEMENTS ----------
  const lanOffset = 3;
  const actOffset = 3;

  for (const el of ELEMENTS) {
    if (!filtered.includes(el)) continue;

    const btn = document.createElement("button");
    btn.className = "element-tile";
    btn.setAttribute("aria-label", `${el.name} (${el.symbol}) atomic number ${el.number}`);
    btn.dataset.number = el.number;

    if (el.number >= 57 && el.number <= 71) {
      btn.style.gridRowStart = 9;
      btn.style.gridColumnStart = (el.number - 56) + lanOffset;
    } else if (el.number >= 89 && el.number <= 103) {
      btn.style.gridRowStart = 10;
      btn.style.gridColumnStart = (el.number - 88) + actOffset;
    } else {
      btn.style.gridRowStart = el.period;
      btn.style.gridColumnStart = el.group;
    }

    btn.innerHTML = `
      <div class="element-top">
        <div class="el-num">${el.number}</div>
      </div>
      <div class="element-symbol">${el.symbol}</div>
      <div class="element-name">${el.name}</div>
      <div class="el-mass">${el.atomic_mass}</div>
    `;

    btn.style.background = colorBy === "category"
      ? hexToRGBA(categoryColors[el.category] || "#cccccc")
      : colorForValue(el[colorBy], range);

    btn.addEventListener("click", () => openModal(el));
    tableEl.appendChild(btn);
  }

  updateConnectionLine(); // recalc line after render
}


// Modal open & close
function openModal(el){
  lastFocused = document.activeElement;
  modalContent.innerHTML = `
    <div class="modal-header">
      <div>
        <h2 id="modalTitle">${el.name} <small style="font-weight:600;color:#475569">(${el.symbol})</small></h2>
        <div style="color:#64748b; margin-top:6px" class="modal-sub">Atomic number ${el.number} — Atomic mass ${el.atomic_mass}</div>
      </div>
      <div style="margin-left:auto; text-align:righ">
        <div style="font-weight:700; font-size:18px" class="category">${el.category ?? ""}</div>
        <div style="color:#94a3b8; font-size:13px">${el.stateAtSTP ?? ""}</div>
      </div>
    </div>

    <div class="modal-row">${el.summary ?? "No summary available."}</div>

    <div class="modal-row" style="margin-top:12px">
      <strong>Electron configuration:</strong> ${el.electron_configuration}<br/>
      <strong>Electronegativity:</strong> ${el.electronegativity_pauling}<br/>
      <strong>Appearance:</strong> ${el.appearance}
    </div>
  `;

  modalCard.style.background = hexToRGBA(categoryColors[el.category], 0.5);
  modalCard.style.boxShadow = `0 0 25px ${hexToRGBA(categoryColors[el.category], 0.8)}`;

  // ✅ Show modal
  modalOverlay.classList.add("active");
  modalOverlay.setAttribute("aria-hidden", "false");

  document.addEventListener("keydown", onKeyDown);
  modalOverlay.addEventListener("click", onOverlayClick);
}

// ✅ Close modal properly
function closeModal(){
  modalOverlay.classList.remove("active");
  modalOverlay.setAttribute("aria-hidden", "true");
  document.removeEventListener("keydown", onKeyDown);
  modalOverlay.removeEventListener("click", onOverlayClick);
  if(lastFocused) lastFocused.focus();
}

function onKeyDown(e){
  if(e.key === "Escape") closeModal();
}

function onOverlayClick(e){
  if(e.target === modalOverlay) closeModal();
}

function updateConnectionLine() {
  const table = document.getElementById("periodicTable");
  const actPlaceholder = document.getElementById("actinide-placeholder");
  if (!table || !actPlaceholder) return;

  let line = document.querySelector(".connection-line-L");
  if (!line) {
    line = document.createElement("div");
    line.className = "connection-line-L";
    table.appendChild(line);
  }

  const tableRect = table.getBoundingClientRect();
  const rect = actPlaceholder.getBoundingClientRect();

  const left = rect.left - tableRect.left + rect.width / 2 - 1.5;
  const top = rect.bottom - tableRect.top;
  const verticalLength = rect.height * 2.3;
  const horizontalLength = rect.width * 0.6;

  line.style.left = `${left}px`;
  line.style.top = `${top}px`;
  line.style.height = `${verticalLength}px`;
  line.style.setProperty("--vertical-length", `${verticalLength}px`);
  line.style.setProperty("--horizontal-length", `${horizontalLength}px`);
}

// Wire up controls
searchInput.addEventListener("input", (e) => { query = e.target.value; renderTable(); });
colorBySelect.addEventListener("change", (e) => { colorBy = e.target.value; renderTable(); });
categoryFilter.addEventListener("change", (e) => { category = e.target.value; renderTable(); });
modalClose.addEventListener("click", closeModal);

// Initial render
renderTable();
updateConnectionLine();
window.addEventListener("resize", updateConnectionLine);
