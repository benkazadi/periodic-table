// DOM refs
const tableEl = document.getElementById("periodicTable");
const searchInput = document.getElementById("searchInput");
const colorBySelect = document.getElementById("colorBy");
const categoryFilter = document.getElementById("categoryFilter");
const modalOverlay = document.getElementById("modalOverlay");
const modalContent = document.getElementById("modalContent");
const modalCard = document.getElementById("modalCard");
const modalClose = document.getElementById("modalClose");

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

// Render table (we place each element by CSS gridLine using group and period)
function renderTable(){
  // Clear
  tableEl.innerHTML = "";

  // filter elements by search & category
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

  // For UX: show a hint when no results
  if(filtered.length === 0){
    const msg = document.createElement("div");
    msg.style.gridColumn = "1 / -1";
    msg.style.padding = "18px";
    msg.style.color = "#cbd5e1";
    msg.textContent = "No elements match that search / filter.";
    tableEl.appendChild(msg);
    return;
  }

    // ---------- LABELS ----------
  const lanLabel = document.createElement("div");
  lanLabel.className = "row-label";
  lanLabel.textContent = "* Lanthanides (57–71)";
  lanLabel.style.gridColumn = "1 / -1";
  lanLabel.style.gridRowStart = 9;
  lanLabel.style.textAlign = "left";
  tableEl.appendChild(lanLabel);

  const actLabel = document.createElement("div");
  actLabel.className = "row-label";
  actLabel.textContent = "** Actinides (89–103)";
  actLabel.style.gridColumn = "1 / -1";
  actLabel.style.gridRowStart = 10;
  actLabel.style.textAlign = "left";
  tableEl.appendChild(actLabel);

    // ---------- PLACEHOLDER TILES ----------
  const lanPlaceholder = document.createElement("div");
  lanPlaceholder.className = "element-tile placeholder";
  lanPlaceholder.style.gridRowStart = 6; // same as period 6
  lanPlaceholder.style.gridColumnStart = 3;
  lanPlaceholder.innerHTML = `<div class="element-symbol">57–71</div>`;
  tableEl.appendChild(lanPlaceholder);

  const actPlaceholder = document.createElement("div");
  actPlaceholder.className = "element-tile placeholder";
  actPlaceholder.style.gridRowStart = 7; // same as period 7
  actPlaceholder.style.gridColumnStart = 3;
  actPlaceholder.id = "actinide-placeholder";
  actPlaceholder.innerHTML = `<div class="element-symbol">89–103</div>`;
  tableEl.appendChild(actPlaceholder);

    // ---------- CONNECTING LINE ----------
  const actLine = document.createElement("div");
  actLine.className = "connection-line-L";
  tableEl.appendChild(actLine);

  // ---------- ELEMENTS ----------
  const lanOffset = 3;
  const actOffset = 3;

  for(const el of ELEMENTS){
    // Skip if this element isn't in filtered results
    if(!filtered.includes(el)) continue;

    const btn = document.createElement("button");
    btn.className = "element-tile";
    btn.setAttribute("aria-label", `${el.name} (${el.symbol}) atomic number ${el.number}`);
    btn.dataset.number = el.number;

    if(el.number >= 57 && el.number <= 71){ // lanthanides
      btn.style.gridRowStart = 9;
      btn.style.gridColumnStart = (el.number - 56) + lanOffset; // 1..15 + offset
    } else if(el.number >= 89 && el.number <= 103){ // actinides
      btn.style.gridRowStart = 10;
      btn.style.gridColumnStart = (el.number - 88) + actOffset;
    } else { // main table
      btn.style.gridRowStart = el.period;
      btn.style.gridColumnStart = el.group;
    }

    // content
    btn.innerHTML = `
      <div class="element-top">
        <div class="el-num">${el.number}</div>
      <div>
      <div class="element-symbol">${el.symbol}</div>
      <div class="element-name">${el.name}</div>
      <div class="el-mass">${el.atomic_mass}</div>

    `;

    if(colorBy === "category"){
      btn.style.background = hexToRGBA(categoryColors[el.category] || "#cccccc"); // fallback color
    } else {
      btn.style.background = colorForValue(el[colorBy], range);
    }

    // click to open modal
    btn.addEventListener("click", () => openModal(el));

    tableEl.appendChild(btn);
  }
}

// Modal open & close
function openModal(el){
  lastFocused = document.activeElement;
  modalContent.innerHTML = `
    <div class="modal-header">
      <div>
        <h2 id="modalTitle">${el.name} <small style="font-weight:600;color:#475569">(${el.symbol})</small></h2>
        <div style="color:#64748b; margin-top:6px">Atomic number ${el.number} — Atomic mass ${el.atomic_mass}</div>
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
  modalOverlay.classList.remove("hidden");
  modalOverlay.setAttribute("aria-hidden", "false");
  modalClose.focus();

  // Escape to close
  document.addEventListener("keydown", onKeyDown);
  modalOverlay.addEventListener("click", onOverlayClick);
}

// Close modal
function closeModal(){
  modalOverlay.classList.add("hidden");
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

  // Check if line exists, create if not
  let line = document.querySelector(".connection-line-L");
  if (!line) {
    line = document.createElement("div");
    line.className = "connection-line-L";
    table.appendChild(line);
  }

  // Get bounding boxes
  const tableRect = table.getBoundingClientRect();
  const rect = actPlaceholder.getBoundingClientRect();

  // Calculate relative position to the table
  const left = rect.left - tableRect.left + rect.width / 2 - 1.5; // center line under placeholder
  const top = rect.bottom - tableRect.top; // starts just under placeholder
  const verticalLength = rect.height * 2.3; // drop length
  const horizontalLength = rect.width * 0.6; // horizontal run

  // Apply positioning + CSS vars for ::after
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
