/* CONFIGURACIÓ SUPABASE: posa la URL i la clau pública del teu projecte. */
const SUPABASE_URL = "https://magfiztbufddyhutptdd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_yINpI3MnA7jWaLLROmechw_7K0GqwwR";

const isConfigured = SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("POSA_AQUI") && !SUPABASE_ANON_KEY.includes("POSA_AQUI") && !SUPABASE_ANON_KEY.startsWith("sb_secret_");
const db = isConfigured ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const ids = ["employeeCode","entryBtn","exitBtn","resultCard","resultIcon","resultTitle","resultText","connectionDot","connectionText","currentDate","currentTime","adminEmail","adminPassword","adminLoginBtn","adminLogin","adminPanel","adminUser","recordsBody","employeesBody","refreshBtn","exportBtn","exportSummaryBtn","logoutBtn","employeeSearch","employeeFilter","monthFilter","dayFilter","typeFilter","clearFiltersBtn","recordCount","employeeForm","editingEmployeeId","employeeName","employeeAdminCode","employeeActive","saveEmployeeBtn","cancelEditEmployeeBtn","employeeListSearch","employeeSort","employeeCount","employeeMonthSummary","summaryPlaceholder","summaryContent","summaryEmployeeName","summaryMonthLabel","summaryTotalHours","summaryWorkedDays","workCalendar","dailySummaryBody"];
const els = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));

let currentRecords = [];
let filteredRecords = [];
let employees = [];
let employeeStatus = "all";

function updateClock() {
  const now = new Date();
  els.currentTime.textContent = now.toLocaleTimeString("ca-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  els.currentDate.textContent = now.toLocaleDateString("ca-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
function setConnection(ok, text) { els.connectionDot.classList.toggle("online", ok); els.connectionDot.classList.toggle("offline", !ok); els.connectionText.textContent = text; }
function showResult(ok, title, text) { els.resultCard.classList.remove("hidden"); els.resultCard.classList.toggle("error", !ok); els.resultIcon.textContent = ok ? "✓" : "!"; els.resultTitle.textContent = title; els.resultText.textContent = text; clearTimeout(showResult.timer); showResult.timer = setTimeout(() => els.resultCard.classList.add("hidden"), 7000); }
function setBusy(busy) { els.entryBtn.disabled = busy; els.exitBtn.disabled = busy; }

async function verifyConnection() {
  if (!db) return setConnection(false, "Falta configurar Supabase a app.js");
  const { error } = await db.from("empleats").select("id").limit(1);
  setConnection(!error, error ? `Error de connexió: ${error.message}` : "Connectat a Supabase");
}

async function registerPunch(type) {
  const code = els.employeeCode.value.trim();
  if (!code) return showResult(false, "Falta el codi", "Introdueix el codi de treballador abans de fitxar.");
  if (!db) return showResult(false, "Supabase no configurat", "Obre app.js i posa la URL i la clau pública del projecte.");
  setBusy(true);
  try {
    const { data, error } = await db.rpc("registrar_fitxatge", { p_codi: code, p_tipus: type });
    if (error) throw error;
    const record = Array.isArray(data) ? data[0] : data;
    const stamp = new Date(record.data_hora).toLocaleString("ca-ES", { timeZone: "Europe/Madrid", dateStyle: "short", timeStyle: "medium" });
    showResult(true, type === "entrada" ? "Entrada registrada" : "Sortida registrada", `${record.nom} · ${stamp}`);
    els.employeeCode.value = ""; els.employeeCode.focus();
  } catch (error) { showResult(false, "No s'ha pogut registrar", humanizeError(error.message)); }
  finally { setBusy(false); }
}
function humanizeError(message = "") { if (message.includes("CODI_INCORRECTE")) return "El codi no correspon a cap treballador actiu."; if (message.includes("FITXATGE_DUPLICAT")) return "Aquest treballador ja ha registrat aquest mateix tipus consecutivament."; return message || "S'ha produït un error inesperat."; }

async function adminLogin() {
  if (!db) return showResult(false, "Supabase no configurat", "Configura el projecte abans d'entrar.");
  const email = els.adminEmail.value.trim(), password = els.adminPassword.value;
  if (!email || !password) return showResult(false, "Dades incompletes", "Escriu el correu i la contrasenya.");
  els.adminLoginBtn.disabled = true;
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  els.adminLoginBtn.disabled = false;
  if (error) return showResult(false, "Accés denegat", error.message);
  openAdmin(data.user.email); await loadAdminData();
}
function openAdmin(email) { els.adminUser.textContent = email; els.adminLogin.classList.add("hidden"); els.adminPanel.classList.remove("hidden"); }

async function loadAdminData() { await Promise.all([loadEmployees(), loadRecords()]); }
async function loadEmployees() {
  els.employeesBody.innerHTML = '<tr><td colspan="4" class="empty-row">Carregant...</td></tr>';
  const { data, error } = await db.from("empleats").select("id,nom,codi,actiu,created_at").order("nom");
  if (error) { els.employeesBody.innerHTML = `<tr><td colspan="4" class="empty-row">${escapeHtml(error.message)}</td></tr>`; return; }
  employees = data || [];
  els.employeeFilter.innerHTML = '<option value="">Tots els empleats</option>' + employees.map(e => `<option value="${e.id}">${escapeHtml(e.nom)} (${escapeHtml(e.codi)})</option>`).join("");
  renderEmployees();
  applyFilters();
}
function renderEmployees() {
  const search = els.employeeListSearch.value.trim().toLowerCase();
  const list = employees.filter(e => {
    const statusOk = employeeStatus === "all" || (employeeStatus === "active" ? e.actiu : !e.actiu);
    const searchOk = !search || e.nom.toLowerCase().includes(search) || String(e.codi).toLowerCase().includes(search);
    return statusOk && searchOk;
  });

  const sortMode = els.employeeSort.value;
  list.sort((a, b) => {
    if (sortMode === "id-desc") return Number(b.id) - Number(a.id);
    if (sortMode === "name-asc") return a.nom.localeCompare(b.nom, "ca", { sensitivity: "base" });
    if (sortMode === "name-desc") return b.nom.localeCompare(a.nom, "ca", { sensitivity: "base" });
    return Number(a.id) - Number(b.id);
  });
  els.employeeCount.textContent = `${list.length} ${list.length === 1 ? "empleat" : "empleats"}`;
  els.employeesBody.innerHTML = list.length ? list.map(e => `<tr>
    <td>${escapeHtml(e.nom)}</td>
    <td>${escapeHtml(e.codi)}</td>
    <td><span class="badge ${e.actiu ? "active-status" : "inactive-status"}">${e.actiu ? "Actiu" : "Inactiu"}</span></td>
    <td>${new Date(e.created_at).toLocaleDateString("ca-ES", { timeZone: "Europe/Madrid" })}</td>
    <td><div class="row-actions">
      <button type="button" class="mini-btn" data-edit-employee="${e.id}">Editar</button>
      <button type="button" class="mini-btn ${e.actiu ? "danger-text" : "success-text"}" data-toggle-employee="${e.id}">${e.actiu ? "Desactivar" : "Activar"}</button>
    </div></td>
  </tr>`).join("") : '<tr><td colspan="5" class="empty-row">No hi ha empleats amb aquests filtres.</td></tr>';
}

function resetEmployeeForm() {
  els.employeeForm.reset();
  els.editingEmployeeId.value = "";
  els.employeeActive.value = "true";
  els.saveEmployeeBtn.textContent = "Crear empleat";
  els.cancelEditEmployeeBtn.classList.add("hidden");
}

function editEmployee(id) {
  const employee = employees.find(e => String(e.id) === String(id));
  if (!employee) return;
  els.editingEmployeeId.value = employee.id;
  els.employeeName.value = employee.nom;
  els.employeeAdminCode.value = employee.codi;
  els.employeeActive.value = String(employee.actiu);
  els.saveEmployeeBtn.textContent = "Guardar canvis";
  els.cancelEditEmployeeBtn.classList.remove("hidden");
  els.employeeName.focus();
  els.employeeForm.scrollIntoView({ behavior: "smooth", block: "center" });
}

async function saveEmployee(event) {
  event.preventDefault();
  const id = els.editingEmployeeId.value;
  const nom = els.employeeName.value.trim();
  const codi = els.employeeAdminCode.value.trim();
  const actiu = els.employeeActive.value === "true";
  if (!nom || !codi) return showResult(false, "Dades incompletes", "Escriu el nom i el codi del treballador.");
  els.saveEmployeeBtn.disabled = true;
  try {
    let result;
    if (id) {
      result = await db.from("empleats").update({ nom, codi, actiu }).eq("id", id).select().single();
    } else {
      result = await db.from("empleats").insert({ nom, codi, actiu }).select().single();
    }
    if (result.error) throw result.error;
    showResult(true, id ? "Empleat actualitzat" : "Empleat creat", `${nom} · codi ${codi}`);
    resetEmployeeForm();
    await loadEmployees();
    applyFilters();
  } catch (error) {
    const duplicate = error.message?.includes("duplicate key") || error.code === "23505";
    showResult(false, "No s'ha pogut guardar", duplicate ? "Aquest codi ja està assignat a un altre empleat." : error.message);
  } finally {
    els.saveEmployeeBtn.disabled = false;
  }
}

async function toggleEmployee(id) {
  const employee = employees.find(e => String(e.id) === String(id));
  if (!employee) return;
  const action = employee.actiu ? "desactivar" : "activar";
  if (!window.confirm(`Vols ${action} ${employee.nom}?`)) return;
  const { error } = await db.from("empleats").update({ actiu: !employee.actiu }).eq("id", employee.id);
  if (error) return showResult(false, "No s'ha pogut actualitzar", error.message);
  showResult(true, employee.actiu ? "Empleat desactivat" : "Empleat activat", employee.nom);
  await loadEmployees();
  applyFilters();
}

async function loadRecords() {
  els.recordsBody.innerHTML = '<tr><td colspan="5" class="empty-row">Carregant...</td></tr>';
  const { data, error } = await db.from("vista_fitxatges").select("id,data_hora,tipus,nom,codi").order("data_hora", { ascending: false }).limit(10000);
  if (error) { els.recordsBody.innerHTML = `<tr><td colspan="5" class="empty-row">${escapeHtml(error.message)}</td></tr>`; return; }
  currentRecords = data || []; applyFilters();
}
function localParts(iso) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date(iso));
  return Object.fromEntries(parts.map(p => [p.type, p.value]));
}
function applyFilters() {
  const search = els.employeeSearch.value.trim().toLowerCase();
  const employeeId = els.employeeFilter.value;
  const selectedEmployee = employees.find(e => String(e.id) === employeeId);
  const month = els.monthFilter.value, day = els.dayFilter.value, type = els.typeFilter.value;
  filteredRecords = currentRecords.filter(r => {
    const p = localParts(r.data_hora); const recordMonth = `${p.year}-${p.month}`;
    return (!search || r.nom.toLowerCase().includes(search) || String(r.codi).toLowerCase().includes(search)) && (!selectedEmployee || String(r.codi) === String(selectedEmployee.codi)) && (!month || recordMonth === month) && (!day || Number(p.day) === Number(day)) && (!type || r.tipus === type);
  });
  renderRecords();
  renderEmployeeMonthSummary();
}

function getSummaryEmployee() {
  const selectedId = els.employeeFilter.value;
  if (selectedId) return employees.find(e => String(e.id) === String(selectedId)) || null;

  const query = els.employeeSearch.value.trim().toLowerCase();
  if (!query) return null;
  const exact = employees.filter(e => e.nom.toLowerCase() === query || String(e.codi).toLowerCase() === query);
  if (exact.length === 1) return exact[0];
  const matches = employees.filter(e => e.nom.toLowerCase().includes(query) || String(e.codi).toLowerCase().includes(query));
  return matches.length === 1 ? matches[0] : null;
}

function monthInfo() {
  const value = els.monthFilter.value;
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    const [year, month] = value.split("-").map(Number);
    return { year, month };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function calculateDailyWork(records) {
  const sorted = records.slice().sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora));
  const groups = new Map();
  sorted.forEach(record => {
    const p = localParts(record.data_hora);
    const key = `${p.year}-${p.month}-${p.day}`;
    if (!groups.has(key)) groups.set(key, { key, day: Number(p.day), records: [], totalMs: 0, firstEntry: null, lastExit: null });
    groups.get(key).records.push(record);
  });

  for (const group of groups.values()) {
    let openEntry = null;
    for (const record of group.records) {
      const date = new Date(record.data_hora);
      if (record.tipus === "entrada") {
        if (!group.firstEntry) group.firstEntry = date;
        openEntry = date;
      } else if (record.tipus === "sortida") {
        group.lastExit = date;
        if (openEntry && date >= openEntry) {
          group.totalMs += date - openEntry;
          openEntry = null;
        }
      }
    }
  }
  return [...groups.values()].sort((a, b) => a.key.localeCompare(b.key));
}

function renderEmployeeMonthSummary() {
  const employee = getSummaryEmployee();
  if (!employee) {
    els.summaryPlaceholder.classList.remove("hidden");
    els.summaryContent.classList.add("hidden");
    return;
  }

  const { year, month } = monthInfo();
  const monthString = `${year}-${String(month).padStart(2, "0")}`;
  const employeeRecords = currentRecords.filter(record => {
    const p = localParts(record.data_hora);
    return String(record.codi) === String(employee.codi) && `${p.year}-${p.month}` === monthString;
  });
  const daily = calculateDailyWork(employeeRecords);
  const totalMs = daily.reduce((sum, day) => sum + day.totalMs, 0);

  els.summaryPlaceholder.classList.add("hidden");
  els.summaryContent.classList.remove("hidden");
  els.summaryEmployeeName.textContent = `${employee.nom} · ${employee.codi}`;
  els.summaryMonthLabel.textContent = new Intl.DateTimeFormat("ca-ES", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
  els.summaryTotalHours.textContent = formatDurationWords(totalMs);
  els.summaryWorkedDays.textContent = `${daily.length} ${daily.length === 1 ? "dia treballat" : "dies treballats"}`;

  renderWorkCalendar(year, month, daily);
  renderDailySummary(daily);
}

function renderWorkCalendar(year, month, daily) {
  const workedByDay = new Map(daily.map(item => [item.day, item]));
  const daysInMonth = new Date(year, month, 0).getDate();
  const mondayIndex = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const cells = [];
  for (let i = 0; i < mondayIndex; i++) cells.push('<span class="calendar-day empty" aria-hidden="true"></span>');
  for (let day = 1; day <= daysInMonth; day++) {
    const work = workedByDay.get(day);
    const classes = work ? "calendar-day worked" : "calendar-day";
    const title = work ? `${formatDurationWords(work.totalMs)} · ${work.records.length} fitxatges` : "Sense fitxatges";
    cells.push(`<span class="${classes}" title="${escapeHtml(title)}"><b>${day}</b>${work ? `<small>${formatDurationCompact(work.totalMs)}</small>` : ""}</span>`);
  }
  els.workCalendar.innerHTML = cells.join("");
}

function renderDailySummary(daily) {
  if (!daily.length) {
    els.dailySummaryBody.innerHTML = '<tr><td colspan="5" class="empty-row">Aquest treballador no té fitxatges durant el mes seleccionat.</td></tr>';
    return;
  }
  els.dailySummaryBody.innerHTML = daily.map(item => `<tr>
    <td>${item.key.split("-").reverse().join("/")}</td>
    <td>${item.firstEntry ? formatTime(item.firstEntry) : "—"}</td>
    <td>${item.lastExit ? formatTime(item.lastExit) : "—"}</td>
    <td><strong>${formatDurationWords(item.totalMs)}</strong></td>
    <td>${item.records.length}</td>
  </tr>`).join("");
}

function formatDurationWords(ms) {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  return `${hours} h ${String(minutes % 60).padStart(2, "0")} min`;
}

function formatDurationCompact(ms) {
  const minutes = Math.floor(ms / 60000);
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
}

function renderRecords() {
  els.recordCount.textContent = `${filteredRecords.length} ${filteredRecords.length === 1 ? "registre" : "registres"}`;
  if (!filteredRecords.length) { els.recordsBody.innerHTML = '<tr><td colspan="5" class="empty-row">No hi ha fitxatges amb aquests filtres.</td></tr>'; return; }
  els.recordsBody.innerHTML = filteredRecords.map(r => { const p = localParts(r.data_hora); const date = `${p.day}/${p.month}/${p.year}`; const time = `${p.hour}:${p.minute}:${p.second}`; return `<tr><td>${date}</td><td>${time}</td><td>${escapeHtml(r.nom)}</td><td>${escapeHtml(r.codi)}</td><td><span class="badge ${r.tipus === "entrada" ? "entry" : "exit"}">${escapeHtml(r.tipus)}</span></td></tr>`; }).join("");
}

function downloadCsv(rows, filename) {
  const csv = "\uFEFF" + rows.map(row => row.map(csvCell).join(";")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportCsv() {
  if (!filteredRecords.length) return showResult(false, "Sense dades", "No hi ha fitxatges per exportar.");
  const rows = [["Data", "Hora", "Treballador", "Codi", "Tipus"]];
  filteredRecords.slice().reverse().forEach(r => { const p = localParts(r.data_hora); rows.push([`${p.day}/${p.month}/${p.year}`, `${p.hour}:${p.minute}:${p.second}`, r.nom, r.codi, r.tipus]); });
  const employee = els.employeeFilter.options[els.employeeFilter.selectedIndex]?.text || "tots";
  downloadCsv(rows, `fitxatges-${safeFilename(employee)}-${els.monthFilter.value || "totes-dates"}${els.dayFilter.value ? `-dia-${els.dayFilter.value}` : ""}.csv`);
}
function exportDailySummary() {
  const source = filteredRecords.slice().sort((a,b) => new Date(a.data_hora) - new Date(b.data_hora));
  if (!source.length) return showResult(false, "Sense dades", "No hi ha fitxatges per resumir.");
  const groups = new Map();
  source.forEach(r => { const p = localParts(r.data_hora); const date = `${p.year}-${p.month}-${p.day}`; const key = `${r.codi}|${date}`; if (!groups.has(key)) groups.set(key, { nom:r.nom,codi:r.codi,date,records:[] }); groups.get(key).records.push(r); });
  const rows = [["Data", "Treballador", "Codi", "Primera entrada", "Última sortida", "Hores totals", "Núm. fitxatges"]];
  [...groups.values()].sort((a,b) => a.date.localeCompare(b.date) || a.nom.localeCompare(b.nom)).forEach(g => {
    let open = null, totalMs = 0; const entries = [], exits = [];
    g.records.forEach(r => { const d = new Date(r.data_hora); if (r.tipus === "entrada") { entries.push(d); open = d; } else { exits.push(d); if (open) { totalMs += d - open; open = null; } } });
    rows.push([g.date.split("-").reverse().join("/"), g.nom, g.codi, entries.length ? formatTime(entries[0]) : "", exits.length ? formatTime(exits[exits.length-1]) : "", formatDuration(totalMs), g.records.length]);
  });
  downloadCsv(rows, `resum-diari-${els.monthFilter.value || "totes-dates"}.csv`);
}
function formatTime(date) { return date.toLocaleTimeString("ca-ES", { timeZone:"Europe/Madrid", hour:"2-digit", minute:"2-digit", second:"2-digit" }); }
function formatDuration(ms) { const mins = Math.floor(ms / 60000); return `${Math.floor(mins/60)}:${String(mins%60).padStart(2,"0")}`; }
function safeFilename(v) { return String(v).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-|-$/g, "").toLowerCase(); }
function csvCell(value) { return `"${String(value ?? "").replaceAll('"', '""')}"`; }
function escapeHtml(value) { return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }

function clearFilters() { els.employeeSearch.value = ""; els.employeeFilter.value = ""; els.dayFilter.value = ""; els.typeFilter.value = ""; setCurrentMonth(); applyFilters(); }
function setCurrentMonth() { const now = new Date(); els.monthFilter.value = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`; }
async function logout() { await db.auth.signOut(); els.adminPanel.classList.add("hidden"); els.adminLogin.classList.remove("hidden"); els.adminPassword.value = ""; }
async function restoreSession() { if (!db) return; const { data } = await db.auth.getSession(); if (data.session?.user) { openAdmin(data.session.user.email); await loadAdminData(); } }

for (let d=1; d<=31; d++) els.dayFilter.insertAdjacentHTML("beforeend", `<option value="${d}">${d}</option>`);
setCurrentMonth();
els.entryBtn.addEventListener("click", () => registerPunch("entrada")); els.exitBtn.addEventListener("click", () => registerPunch("sortida")); els.adminLoginBtn.addEventListener("click", adminLogin); els.refreshBtn.addEventListener("click", loadAdminData); els.exportBtn.addEventListener("click", exportCsv); els.exportSummaryBtn.addEventListener("click", exportDailySummary); els.logoutBtn.addEventListener("click", logout); els.clearFiltersBtn.addEventListener("click", clearFilters);
[els.employeeSearch, els.employeeFilter, els.monthFilter, els.dayFilter, els.typeFilter].forEach(el => el.addEventListener("input", applyFilters));
document.querySelectorAll("[data-status]").forEach(btn => btn.addEventListener("click", () => { employeeStatus = btn.dataset.status; document.querySelectorAll("[data-status]").forEach(b => b.classList.toggle("active", b === btn)); renderEmployees(); }));
els.employeeForm.addEventListener("submit", saveEmployee);
els.cancelEditEmployeeBtn.addEventListener("click", resetEmployeeForm);
els.employeeListSearch.addEventListener("input", renderEmployees);
els.employeeSort.addEventListener("change", renderEmployees);
els.employeesBody.addEventListener("click", event => {
  const editButton = event.target.closest("[data-edit-employee]");
  const toggleButton = event.target.closest("[data-toggle-employee]");
  if (editButton) editEmployee(editButton.dataset.editEmployee);
  if (toggleButton) toggleEmployee(toggleButton.dataset.toggleEmployee);
});
els.employeeCode.addEventListener("keydown", e => { if (e.key === "Enter") registerPunch("entrada"); }); els.adminPassword.addEventListener("keydown", e => { if (e.key === "Enter") adminLogin(); });
updateClock(); setInterval(updateClock, 1000); verifyConnection(); restoreSession();
