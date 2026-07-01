const state = {
  workbook: {},
  monthOrder: [],
  selectedMonth: "",
  branches: [],
  cities: [],
  reasonBase: [],
  reasons: []
};

const STORAGE_KEY = "sgpOccurrenceWorkbookV1";

const RONDONIA_CITIES = [
  "Alta Floresta d'Oeste",
  "Alto Alegre dos Parecis",
  "Alto Paraíso",
  "Alvorada d'Oeste",
  "Ariquemes",
  "Buritis",
  "Cabixi",
  "Cacaulândia",
  "Cacoal",
  "Campo Novo de Rondônia",
  "Candeias do Jamari",
  "Castanheiras",
  "Cerejeiras",
  "Chupinguaia",
  "Colorado do Oeste",
  "Corumbiara",
  "Costa Marques",
  "Cujubim",
  "Espigão d'Oeste",
  "Governador Jorge Teixeira",
  "Guajará-Mirim",
  "Itapuã do Oeste",
  "Jaru",
  "Ji-Paraná",
  "Machadinho d'Oeste",
  "Ministro Andreazza",
  "Mirante da Serra",
  "Monte Negro",
  "Nova Brasilândia d'Oeste",
  "Nova Mamoré",
  "Nova União",
  "Novo Horizonte do Oeste",
  "Ouro Preto do Oeste",
  "Parecis",
  "Pimenta Bueno",
  "Pimenteiras do Oeste",
  "Porto Velho",
  "Presidente Médici",
  "Primavera de Rondônia",
  "Rio Crespo",
  "Rolim de Moura",
  "Santa Luzia d'Oeste",
  "São Felipe d'Oeste",
  "São Francisco do Guaporé",
  "São Miguel do Guaporé",
  "Seringueiras",
  "Teixeirópolis",
  "Theobroma",
  "Urupá",
  "Vale do Anari",
  "Vale do Paraíso",
  "Vilhena"
];

const DEFAULT_REASONS = [
  "CTO OFF",
  "Pop's Offline",
  "Manutenção",
  "Instabilidade",
  "OPA Off",
  "IXC Off",
  "Migração"
];

const els = {
  status: document.querySelector("#occurrenceLaunchStatus"),
  fileInput: document.querySelector("#fileInput"),
  monthSelect: document.querySelector("#monthSelect"),
  monthLabel: document.querySelector("#monthLabel"),
  monthKey: document.querySelector("#monthKey"),
  newMonthButton: document.querySelector("#newMonthButton"),
  deleteMonthButton: document.querySelector("#deleteMonthButton"),
  saveButton: document.querySelector("#saveButton"),
  addRowButton: document.querySelector("#addRowButton"),
  clearRowsButton: document.querySelector("#clearRowsButton"),
  rows: document.querySelector("#occurrenceRows")
};

document.addEventListener("DOMContentLoaded", async () => {
  bindEvents();
  await loadInitialData();
  render();
});

function bindEvents() {
  els.monthSelect.addEventListener("change", () => {
    state.selectedMonth = els.monthSelect.value;
    render();
  });

  els.monthLabel.addEventListener("input", () => updateMonthMeta());
  els.monthKey.addEventListener("input", () => updateMonthMeta());
  els.newMonthButton.addEventListener("click", () => createMonth(true));
  els.deleteMonthButton.addEventListener("click", deleteCurrentMonth);
  els.addRowButton.addEventListener("click", () => {
    currentMonth().records.push(emptyRecord());
    renderRows();
  });
  els.clearRowsButton.addEventListener("click", clearCurrentRows);
  els.saveButton.addEventListener("click", saveManualOccurrences);
  els.fileInput.addEventListener("change", importWorkbook);
  els.rows.addEventListener("input", handleRowEdit);
  els.rows.addEventListener("change", handleRowEdit);

  els.rows.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-row]");
    if (!button) return;
    currentMonth().records.splice(Number(button.dataset.removeRow), 1);
    renderRows();
  });
}

function handleRowEdit(event) {
  const timeInput = event.target.closest("[data-time-field]");
  if (timeInput) {
    updateDowntimeFromTimeInput(timeInput);
    return;
  }

  const input = event.target.closest("[data-field]");
  if (!input) return;

  const row = currentMonth().records[Number(input.dataset.index)];
  if (!row) return;
  row[input.dataset.field] = input.value;
}

async function loadInitialData() {
  try {
    await waitForAuth();
    await loadOccurrenceOptions();
    const saved = await window.SGPAuth.loadManualOccurrences();
    if (saved?.workbook && saved?.monthOrder?.length) {
      state.workbook = saved.workbook;
      state.monthOrder = saved.monthOrder.filter((key) => state.workbook[key]);
      state.selectedMonth = state.monthOrder.at(-1) || "";
      refreshReasonOptions();
      setStatus("Ocorrências manuais carregadas do Firebase.", "success");
      return;
    }

    createMonth(false);
    refreshReasonOptions();
    setStatus("Pronto para lançar ocorrências manualmente.", "success");
  } catch (error) {
    console.error(error);
    createMonth(false);
    applyOccurrenceOptions();
    refreshReasonOptions();
    setStatus("Não foi possível carregar do Firebase. Você ainda pode preencher e tentar salvar.", "error");
  }
}

async function loadOccurrenceOptions() {
  try {
    const options = await window.SGPAuth.loadOccurrenceOptions?.();
    applyOccurrenceOptions(options);
  } catch (error) {
    console.error(error);
    applyOccurrenceOptions();
  }
}

function applyOccurrenceOptions(options = {}) {
  state.cities = mergeOptionList(options.cities, RONDONIA_CITIES);
  state.branches = mergeOptionList(options.branches, state.cities.length ? state.cities : RONDONIA_CITIES);
  state.reasonBase = mergeOptionList(options.reasons, DEFAULT_REASONS);
}

function mergeOptionList(customItems, fallbackItems) {
  const source = Array.isArray(customItems) && customItems.length ? customItems : fallbackItems;
  const seen = new Set();
  return source
    .map((item) => clean(item))
    .filter(Boolean)
    .filter((item) => {
      const key = normalizeText(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function waitForAuth() {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const tick = () => {
      if (window.SGPAuth?.loadManualOccurrences && document.documentElement.dataset.authReady === "true") {
        resolve();
        return;
      }
      attempts += 1;
      if (attempts > 90) {
        reject(new Error("Autenticação não carregou a tempo."));
        return;
      }
      window.setTimeout(tick, 100);
    };
    tick();
  });
}

function createMonth(shouldRender) {
  const now = new Date();
  const label = canonicalMonthLabel(now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }));
  const key = uniqueMonthKey(canonicalMonthKey(label) || slug(label));
  state.workbook[key] = {
    key,
    label,
    records: [emptyRecord()]
  };
  state.monthOrder.push(key);
  state.selectedMonth = key;
  if (shouldRender) render();
}

function deleteCurrentMonth() {
  if (!state.selectedMonth) return;
  const month = currentMonth();
  const confirmed = window.confirm(`Excluir o mês "${month.label}" dos lançamentos manuais?`);
  if (!confirmed) return;

  delete state.workbook[state.selectedMonth];
  state.monthOrder = state.monthOrder.filter((key) => key !== state.selectedMonth);
  state.selectedMonth = state.monthOrder.at(-1) || "";
  if (!state.selectedMonth) createMonth(false);
  render();
}

function clearCurrentRows() {
  const confirmed = window.confirm("Limpar todas as ocorrências deste mês?");
  if (!confirmed) return;
  currentMonth().records = [emptyRecord()];
  renderRows();
}

async function importWorkbook(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const buffer = await file.arrayBuffer();
    const parsed = parseWorkbook(buffer, "array");
    if (!parsed.monthOrder.length) {
      setStatus("Nenhuma aba de ocorrências foi encontrada na planilha importada.", "error");
      return;
    }

    state.workbook = parsed.workbook;
    state.monthOrder = parsed.monthOrder;
    state.selectedMonth = state.monthOrder.at(-1) || "";
    refreshReasonOptions();
    setStatus(`${file.name} carregado para edição manual. Revise e salve para sincronizar.`, "success");
    render();
  } catch (error) {
    console.error(error);
    setStatus("Não foi possível importar a planilha de ocorrências.", "error");
  } finally {
    event.target.value = "";
  }
}

async function saveManualOccurrences() {
  updateMonthMeta(false);
  removeEmptyRows();

  try {
    setBusy(true);
    const workbook = normalizedWorkbook();
    const monthOrder = normalizedMonthOrder(workbook);

    await window.SGPAuth.saveManualOccurrences({
      workbook,
      monthOrder,
      sourceName: "Lançamentos manuais de ocorrências SGP"
    });

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ workbook, monthOrder }));
    localStorage.setItem("ocorrenciasWorkbookName", "Lançamentos manuais de ocorrências SGP");
    localStorage.setItem("ocorrenciasImportedAt", new Date().toLocaleString("pt-BR"));
    setStatus("Ocorrências salvas. A dashboard de Ocorrências já pode usar estes dados.", "success");
  } catch (error) {
    console.error(error);
    setStatus(error.message || "Não foi possível salvar as ocorrências.", "error");
  } finally {
    setBusy(false);
    render();
  }
}

function render() {
  refreshReasonOptions();
  renderMonthOptions();
  renderSetup();
  renderRows();
}

function renderMonthOptions() {
  els.monthSelect.innerHTML = state.monthOrder
    .map((key) => `<option value="${escapeHtml(key)}">${escapeHtml(state.workbook[key]?.label || key)}</option>`)
    .join("");
  els.monthSelect.value = state.selectedMonth;
}

function renderSetup() {
  const month = currentMonth();
  els.monthLabel.value = month.label || "";
  els.monthKey.value = state.selectedMonth || "";
}

function renderRows() {
  const rows = currentMonth().records;
  els.rows.innerHTML = rows.map((row, index) => `
    <tr>
      <td><input type="date" value="${escapeHtml(inputDateValue(row.date))}" data-index="${index}" data-field="date" /></td>
      <td>
        <select data-index="${index}" data-field="branch">
          ${optionListMarkup(state.branches, row.branch, "Selecionar filial")}
        </select>
      </td>
      <td>
        <select data-index="${index}" data-field="city">
          ${optionListMarkup(state.cities, row.city, "Selecionar cidade")}
        </select>
      </td>
      <td><input type="text" value="${escapeHtml(row.occurrence)}" data-index="${index}" data-field="occurrence" placeholder="Ocorrência" /></td>
      <td>
        <select data-index="${index}" data-field="reason">
          ${reasonOptions(row.reason)}
        </select>
      </td>
      ${timeCells(row, index)}
      <td><input type="text" value="${offlineDurationLabel(downtimeTextFromRow(row))}" readonly /></td>
      <td>
        <div class="row-actions">
          <button class="danger" type="button" data-remove-row="${index}">Remover</button>
        </div>
      </td>
    </tr>
  `).join("");
}

function timeCells(row, index) {
  const [parsedStart, parsedEnd] = downtimeTimeParts(row.downtime);
  const start = clean(row.downtimeStart) || parsedStart;
  const end = clean(row.downtimeEnd) || parsedEnd;
  return `
    <td>
      <input class="time-input" type="time" step="1" value="${escapeHtml(start)}" data-index="${index}" data-time-field="start" aria-label="Início off" />
    </td>
    <td>
      <input class="time-input" type="time" step="1" value="${escapeHtml(end)}" data-index="${index}" data-time-field="end" aria-label="Retorno" />
    </td>
  `;
}

function updateDowntimeFromTimeInput(input) {
  const row = currentMonth().records[Number(input.dataset.index)];
  if (!row) return;

  const [parsedStart, parsedEnd] = downtimeTimeParts(row.downtime);
  row.downtimeStart = clean(row.downtimeStart) || parsedStart;
  row.downtimeEnd = clean(row.downtimeEnd) || parsedEnd;
  if (input.dataset.timeField === "start") row.downtimeStart = input.value;
  if (input.dataset.timeField === "end") row.downtimeEnd = input.value;
  row.downtime = downtimeTextFromRow(row);
  renderRows();
}

function downtimeTimeParts(value) {
  const matches = [...clean(value).matchAll(/(\d{1,2})[:h](\d{2})?(?::(\d{2}))?/gi)].slice(0, 2);
  return [0, 1].map((index) => {
    const match = matches[index];
    if (!match) return "";
    const hours = Number(match[1]);
    const minutes = Number(match[2] || 0);
    const seconds = Number(match[3] || 0);
    if (!Number.isFinite(hours) || hours > 23 || minutes > 59 || seconds > 59) return "";
    const base = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    return seconds ? `${base}:${String(seconds).padStart(2, "0")}` : base;
  });
}

function downtimeTextFromRow(row) {
  const [parsedStart, parsedEnd] = downtimeTimeParts(row.downtime);
  const start = clean(row.downtimeStart) || parsedStart;
  const end = clean(row.downtimeEnd) || parsedEnd;
  if (!start && !end) return clean(row.downtime);
  if (!start || !end) return "";
  return `${start} - ${end}`;
}

function optionListMarkup(options, selectedValue, placeholder) {
  const selected = clean(selectedValue);
  const source = options?.length ? options : RONDONIA_CITIES;
  const hasSelected = source.some((item) => item === selected);
  const extraOption = selected && !hasSelected
    ? `<option value="${escapeHtml(selected)}" selected>${escapeHtml(selected)} - revisar</option>`
    : "";

  return `
    <option value="">${escapeHtml(placeholder)}</option>
    ${extraOption}
    ${source.map((item) => `<option value="${escapeHtml(item)}" ${item === selected ? "selected" : ""}>${escapeHtml(item)}</option>`).join("")}
  `;
}

function reasonOptions(selectedValue) {
  const selected = clean(selectedValue);
  const hasSelected = state.reasons.some((reason) => reason === selected);
  const extraOption = selected && !hasSelected && selected !== "-"
    ? `<option value="${escapeHtml(selected)}" selected>${escapeHtml(selected)} - revisar</option>`
    : "";

  return `
    <option value="">Selecionar motivo</option>
    ${extraOption}
    ${state.reasons.map((reason) => `<option value="${escapeHtml(reason)}" ${reason === selected ? "selected" : ""}>${escapeHtml(reason)}</option>`).join("")}
  `;
}

function refreshReasonOptions() {
  const reasons = new Map();
  (state.reasonBase.length ? state.reasonBase : DEFAULT_REASONS).forEach((reason) => reasons.set(normalizeText(reason), reason));

  Object.values(state.workbook).forEach((month) => {
    (month.records || []).forEach((row) => {
      const reason = clean(row.reason);
      if (!reason || reason === "-") return;
      reasons.set(normalizeText(reason), reason);
    });
  });

  state.reasons = [...reasons.values()].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function updateMonthMeta(shouldRender = true) {
  if (!state.selectedMonth) return;
  const month = currentMonth();
  const nextLabel = clean(els.monthLabel.value) || month.label || "Mês manual";
  const nextKey = uniqueMonthKey(slug(els.monthKey.value || nextLabel), state.selectedMonth);
  const previousKey = state.selectedMonth;

  month.label = nextLabel;
  month.key = nextKey;

  if (nextKey !== previousKey) {
    state.workbook[nextKey] = month;
    delete state.workbook[previousKey];
    state.monthOrder = state.monthOrder.map((key) => key === previousKey ? nextKey : key);
    state.selectedMonth = nextKey;
  }

  if (shouldRender) renderMonthOptions();
}

function currentMonth() {
  if (!state.selectedMonth || !state.workbook[state.selectedMonth]) {
    createMonth(false);
  }
  return state.workbook[state.selectedMonth];
}

function emptyRecord() {
  return {
    id: randomId(),
    date: "",
    branch: "",
    city: "",
    occurrence: "",
    reason: "",
    downtime: "",
    downtimeStart: "",
    downtimeEnd: ""
  };
}

function removeEmptyRows() {
  Object.values(state.workbook).forEach((month) => {
    month.records = (month.records || []).filter((row) =>
      [row.date, row.branch, row.city, row.occurrence, row.reason, row.downtime, row.downtimeStart, row.downtimeEnd].some((value) => clean(value))
    );
    if (!month.records.length) month.records = [emptyRecord()];
  });
}

function normalizedWorkbook() {
  const workbook = {};
  state.monthOrder.forEach((key) => {
    const month = state.workbook[key];
    if (!month) return;
    const canonicalKey = canonicalMonthKey(month.label || key) || canonicalMonthKey(key) || key;
    const records = (month.records || [])
      .map(normalizeRecord)
      .filter((row) => row.occurrence && row.city);
    if (!records.length) return;
    if (!workbook[canonicalKey]) {
      workbook[canonicalKey] = {
        key: canonicalKey,
        label: canonicalMonthLabel(month.label || key),
        sourceName: "Lancamento manual",
        records: []
      };
    }
    workbook[canonicalKey].records.push(...records);
  });
  return workbook;
}

function normalizedMonthOrder(workbook) {
  return state.monthOrder
    .map((key) => {
      const month = state.workbook[key];
      return canonicalMonthKey(month?.label || key) || canonicalMonthKey(key) || key;
    })
    .filter((key, index, items) => workbook[key] && items.indexOf(key) === index);
}

function canonicalMonthKey(value) {
  const parsed = parseMonthYear(value);
  return parsed ? `${parsed.monthSlug}-${parsed.year}` : "";
}

function canonicalMonthLabel(value) {
  const parsed = parseMonthYear(value);
  return parsed ? `${parsed.monthLabel} ${parsed.year}` : clean(value);
}

function parseMonthYear(value) {
  const text = normalizeText(value).replace(/_/g, " ");
  const monthAliases = [
    ["janeiro", "janeiro", "Janeiro"],
    ["fevereiro", "fevereiro", "Fevereiro"],
    ["marco", "marco", "Mar?o"],
    ["abril", "abril", "Abril"],
    ["maio", "maio", "Maio"],
    ["junho", "junho", "Junho"],
    ["junnho", "junho", "Junho"],
    ["julho", "julho", "Julho"],
    ["agosto", "agosto", "Agosto"],
    ["setembro", "setembro", "Setembro"],
    ["outubro", "outubro", "Outubro"],
    ["novembro", "novembro", "Novembro"],
    ["dezembro", "dezembro", "Dezembro"]
  ];
  const month = monthAliases.find(([alias]) => text.includes(alias));
  const yearMatch = text.match(/20\d{2}|25|26/);
  if (!month || !yearMatch) return null;
  const year = yearMatch[0].length === 2 ? `20${yearMatch[0]}` : yearMatch[0];
  return { monthSlug: month[1], monthLabel: month[2], year };
}

function normalizeRecord(row) {
  const downtime = downtimeTextFromRow(row) || "-";
  return {
    occurrence: clean(row.occurrence),
    date: clean(row.date),
    branch: clean(row.branch) || "-",
    city: normalizeCity(row.city),
    reason: clean(row.reason) || "-",
    downtime,
    downtimeDuration: offlineDurationLabel(downtime)
  };
}

function parseWorkbook(content, type) {
  const workbook = XLSX.read(content, { type, cellDates: true });
  const parsed = {};
  const monthOrder = [];

  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" });
    const headerIndex = rows.findIndex((row) => row.map(normalizeHeader).includes("ocorrencias"));
    if (headerIndex === -1) return;

    const headers = rows[headerIndex].map(normalizeHeader);
    const key = uniqueMonthKey(normalizeMonthKey(sheetName));
    const records = [];

    rows.slice(headerIndex + 1).forEach((row) => {
      if (!row.some((cell) => clean(cell))) return;
      const record = {};
      headers.forEach((header, index) => {
        record[header] = clean(row[index]);
      });

      const occurrence = firstFilled(record.ocorrencias, record.ocorrencia, record.ocorr_ncias);
      const city = normalizeCity(firstFilled(record.cidade));
      if (!occurrence || !city || isTotalRow(occurrence) || isTotalRow(city)) return;

      const downtime = firstFilled(record.tempo_off, record.tempo) || "-";
      const [downtimeStart, downtimeEnd] = downtimeTimeParts(downtime);
      records.push({
        id: randomId(),
        occurrence,
        date: inputDateValue(firstFilled(record.data)),
        branch: firstFilled(record.filial) || "-",
        city,
        reason: firstFilled(record.motivo) || "-",
        downtime,
        downtimeStart,
        downtimeEnd
      });
    });

    if (!records.length) return;
    parsed[key] = {
      key,
      label: clean(sheetName).replace(/\s+/g, " "),
      records
    };
    monthOrder.push(key);
  });

  return { workbook: parsed, monthOrder };
}

function inputDateValue(value) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value);
  const date = parseDate(value);
  if (!date) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const text = clean(value);
  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (match) {
    const [, left, right, year] = match;
    const fullYear = Number(year.length === 2 ? `20${year}` : year);
    return new Date(fullYear, Number(right) - 1, Number(left));
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function offlineDurationLabel(value) {
  const duration = offlineDurationSeconds(value);
  return Number.isFinite(duration) ? secondsToDurationLabel(duration) : "-";
}

function offlineDurationMinutes(value) {
  const seconds = offlineDurationSeconds(value);
  return Number.isFinite(seconds) ? seconds / 60 : NaN;
}

function offlineDurationSeconds(value) {
  const text = clean(value);
  if (!text || text === "-") return NaN;
  const matches = [...text.matchAll(/(\d{1,2})[:h](\d{2})?(?::(\d{2}))?/gi)];
  if (matches.length < 2) return NaN;

  const [start, end] = matches.slice(0, 2).map((match) => {
    const hours = Number(match[1]);
    const minutes = Number(match[2] || 0);
    const seconds = Number(match[3] || 0);
    return (hours * 3600) + (minutes * 60) + seconds;
  });
  let diff = end - start;
  if (diff < 0) diff += 24 * 3600;
  return diff;
}

function secondsToDurationLabel(totalSeconds) {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return "00:00:00:00";
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return [days, hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

function setStatus(message, type = "") {
  els.status.textContent = message;
  els.status.className = `notice ${type ? `is-${type}` : ""}`.trim();
}

function setBusy(isBusy) {
  els.saveButton.disabled = isBusy;
  els.saveButton.textContent = isBusy ? "Salvando..." : "Salvar e sincronizar";
}

function randomId() {
  return window.crypto?.randomUUID?.() || `row-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function uniqueMonthKey(base, current = "") {
  const fallback = base || "mes-manual";
  if (fallback === current || !state.workbook[fallback]) return fallback;
  let index = 2;
  while (state.workbook[`${fallback}-${index}`]) index += 1;
  return `${fallback}-${index}`;
}

function normalizeCity(value) {
  return clean(value).replace(/\s*\/\s*/g, " / ").replace(/\s+/g, " ").trim();
}

function normalizeMonthKey(value) {
  return slug(value).replace(/_/g, "-");
}

function slug(value) {
  return normalizeText(value).replace(/_/g, "-").replace(/^-+|-+$/g, "");
}

function normalizeHeader(value) {
  return normalizeText(value);
}

function normalizeText(value) {
  return clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function firstFilled(...values) {
  return values.find((value) => clean(value)) || "";
}

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function isTotalRow(value) {
  return normalizeText(value).includes("total");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}


