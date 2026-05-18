const occurrenceState = {
  workbook: {},
  monthOrder: [],
  selectedMonth: "",
  selectedCity: "",
  selectedReason: "",
  filteredRows: [],
  charts: {}
};

const STORAGE_KEY = "sgpOccurrenceWorkbookV1";

const els = {
  fileInput: document.querySelector("#fileInput"),
  themeToggle: document.querySelector("#themeToggle"),
  clearButton: document.querySelector("#clearButton"),
  importStatus: document.querySelector("#importStatus"),
  monthSelect: document.querySelector("#monthSelect"),
  searchInput: document.querySelector("#searchInput"),
  activeFilters: document.querySelector("#activeFilters"),
  summaryStrip: document.querySelector("#summaryStrip"),
  occurrenceBody: document.querySelector("#occurrenceBody"),
  exportButton: document.querySelector("#exportButton")
};

document.addEventListener("DOMContentLoaded", () => {
  setupTheme();
  els.fileInput.addEventListener("change", handleImport);
  els.clearButton.addEventListener("click", clearData);
  els.monthSelect.addEventListener("change", () => {
    occurrenceState.selectedMonth = els.monthSelect.value;
    occurrenceState.selectedCity = "";
    occurrenceState.selectedReason = "";
    render();
  });
  els.searchInput.addEventListener("input", render);
  els.exportButton.addEventListener("click", exportFilteredCsv);
  tryAutoLoad();
});

async function tryAutoLoad() {
  const saved = sessionStorage.getItem(STORAGE_KEY);
  if (saved) {
    const parsed = JSON.parse(saved);
    occurrenceState.workbook = parsed.workbook || {};
    occurrenceState.monthOrder = parsed.monthOrder || [];
    occurrenceState.selectedMonth = occurrenceState.monthOrder.at(-1) || "";
    els.importStatus.textContent = "Ocorrências mensais carregadas da sessão atual.";
    render();
    return;
  }

  try {
    const response = await fetch("OCORRENCIAS MENSAIS.xlsx", { cache: "no-store" });
    if (!response.ok) throw new Error("Arquivo não encontrado.");
    const buffer = await response.arrayBuffer();
    applyWorkbook(parseWorkbook(buffer, "array"), "OCORRENCIAS MENSAIS.xlsx carregado automaticamente da pasta do site.");
  } catch {
    els.importStatus.textContent = "Importe a planilha OCORRENCIAS MENSAIS.xlsx para visualizar a dashboard.";
    render();
  }
}

async function handleImport(event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const buffer = await file.arrayBuffer();
    applyWorkbook(parseWorkbook(buffer, "array"), `${file.name} importado com sucesso.`);
  } catch (error) {
    console.error(error);
    els.importStatus.textContent = "Não foi possível ler a planilha de ocorrências.";
  }
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
    const monthKey = normalizeMonthKey(sheetName);
    const label = clean(sheetName).replace(/\s+/g, " ");
    const records = [];

    rows.slice(headerIndex + 1).forEach((row) => {
      if (!row.some((cell) => clean(cell))) return;
      const record = {};
      headers.forEach((header, index) => {
        record[header] = clean(row[index]);
      });

      const occurrence = firstFilled(record.ocorrencias, record.ocorrencia, record.ocorr_ncias);
      const city = normalizeCity(firstFilled(record.cidade));
      const reason = firstFilled(record.motivo);
      if (!occurrence || !city) return;
      if (isTotalRow(occurrence) || isTotalRow(city)) return;

      records.push({
        occurrence,
        date: firstFilled(record.data),
        branch: firstFilled(record.filial) || "-",
        city,
        reason: reason || "-",
        downtime: firstFilled(record.tempo_off, record.tempo) || "-"
      });
    });

    if (!records.length) return;
    parsed[monthKey] = { key: monthKey, label, records };
    monthOrder.push(monthKey);
  });

  return { workbook: parsed, monthOrder };
}

function applyWorkbook(parsed, message) {
  occurrenceState.workbook = parsed.workbook;
  occurrenceState.monthOrder = parsed.monthOrder;
  occurrenceState.selectedMonth = parsed.monthOrder.at(-1) || "";
  occurrenceState.selectedCity = "";
  occurrenceState.selectedReason = "";
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  els.importStatus.textContent = `${message} ${totalRows(parsed.workbook).toLocaleString("pt-BR")} ocorrência(s) lida(s).`;
  render();
}

function render() {
  renderMonthOptions();
  occurrenceState.filteredRows = filterRows();
  renderActiveFilters();
  renderSummary();
  renderCharts();
  renderTable();
}

function renderMonthOptions() {
  els.monthSelect.innerHTML = occurrenceState.monthOrder.length
    ? occurrenceState.monthOrder.map((key) => `<option value="${key}">${occurrenceState.workbook[key].label}</option>`).join("")
    : '<option value="">Selecione o mês</option>';
  els.monthSelect.value = occurrenceState.selectedMonth;
}

function filterRows() {
  const month = occurrenceState.workbook[occurrenceState.selectedMonth];
  const search = normalizeText(els.searchInput.value);
  if (!month) return [];
  return month.records.filter((row) => {
    if (occurrenceState.selectedCity && row.city !== occurrenceState.selectedCity) return false;
    if (occurrenceState.selectedReason && row.reason !== occurrenceState.selectedReason) return false;
    if (!search) return true;
    return [row.occurrence, row.branch, row.city, row.reason, row.downtime].some((value) => normalizeText(value).includes(search));
  });
}

function renderActiveFilters() {
  const filters = [
    occurrenceState.selectedCity ? { key: "city", label: `Cidade: ${occurrenceState.selectedCity}` } : null,
    occurrenceState.selectedReason ? { key: "reason", label: `Motivo: ${occurrenceState.selectedReason}` } : null
  ].filter(Boolean);

  if (!filters.length) {
    els.activeFilters.innerHTML = "";
    return;
  }

  els.activeFilters.innerHTML = `
    <span>Filtros do gráfico</span>
    ${filters.map((filter) => `<button type="button" data-clear-filter="${filter.key}">${filter.label} ×</button>`).join("")}
    <button type="button" class="clear-all" data-clear-filter="all">Limpar filtros</button>
  `;

  els.activeFilters.querySelectorAll("[data-clear-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.clearFilter;
      if (key === "city" || key === "all") occurrenceState.selectedCity = "";
      if (key === "reason" || key === "all") occurrenceState.selectedReason = "";
      render();
    });
  });
}

function renderSummary() {
  const rows = occurrenceState.filteredRows;
  const branchRanking = rankBy(rows, "branch");
  const cityRanking = rankBy(rows, "city");
  const reasonRanking = rankBy(rows, "reason");
  const criticalBranch = branchRanking[0];
  const criticalCity = cityRanking[0];
  const criticalReason = reasonRanking[0];

  els.summaryStrip.innerHTML = [
    ["Ocorrências no mês", rows.length.toLocaleString("pt-BR"), occurrenceState.workbook[occurrenceState.selectedMonth]?.label || "-"],
    ["Filial mais crítica", criticalBranch?.name || "-", criticalBranch ? `${criticalBranch.total} ocorrência(s)` : ""],
    ["Cidade mais crítica", criticalCity?.name || "-", criticalCity ? `${criticalCity.total} ocorrência(s)` : ""],
    ["Motivo mais frequente", criticalReason?.name || "-", criticalReason ? `${criticalReason.total} ocorrência(s)` : ""],
    ["Cidades impactadas", uniqueCount(rows.map((row) => row.city)).toLocaleString("pt-BR"), ""]
  ].map(([label, value, note], index) => `
    <article class="insight-card ${index === 1 ? "critical" : ""}">
      <span>${label}</span>
      <strong>${value}</strong>
      ${note ? `<small>${note}</small>` : ""}
    </article>
  `).join("");
}

function renderCharts() {
  renderCityChart();
  renderReasonChart();
}

function renderCityChart() {
  const rows = rankBy(baseRowsForCharts("city"), "city").slice(0, 12);
  occurrenceState.charts.city?.destroy();
  occurrenceState.charts.city = new Chart(document.querySelector("#cityChart"), {
    type: "bar",
    data: {
      labels: rows.map((item) => shorten(item.name, 24)),
      datasets: [{
        label: "Ocorrências",
        data: rows.map((item) => item.total),
        backgroundColor: rows.map((_, index) => index === 0 ? "rgba(214, 69, 69, 0.78)" : "rgba(0, 156, 103, 0.72)"),
        borderColor: rows.map((_, index) => index === 0 ? "#d64545" : "#009c67"),
        borderWidth: 1,
        borderRadius: 6
      }]
    },
    options: {
      ...chartOptions(false),
      onClick: (_, elements) => {
        const index = elements[0]?.index;
        if (index === undefined) return;
        occurrenceState.selectedCity = occurrenceState.selectedCity === rows[index].name ? "" : rows[index].name;
        render();
      }
    }
  });
}

function renderReasonChart() {
  const rows = rankBy(baseRowsForCharts("reason"), "reason").slice(0, 8);
  occurrenceState.charts.reason?.destroy();
  occurrenceState.charts.reason = new Chart(document.querySelector("#reasonChart"), {
    type: "doughnut",
    data: {
      labels: rows.map((item) => shorten(item.name, 28)),
      datasets: [{
        data: rows.map((item) => item.total),
        backgroundColor: ["#d64545", "#009c67", "#45b7e8", "#f2b84b", "#7a63d8", "#1f7a8c", "#92c56e", "#f27f5d"],
        borderColor: document.body.dataset.theme === "dark" ? "#111821" : "#ffffff",
        borderWidth: 2
      }]
    },
    options: {
      ...chartOptions(true),
      onClick: (_, elements) => {
        const index = elements[0]?.index;
        if (index === undefined) return;
        occurrenceState.selectedReason = occurrenceState.selectedReason === rows[index].name ? "" : rows[index].name;
        render();
      }
    }
  });
}

function baseRowsForCharts(ignoreKey) {
  const month = occurrenceState.workbook[occurrenceState.selectedMonth];
  const search = normalizeText(els.searchInput.value);
  if (!month) return [];
  return month.records.filter((row) => {
    if (ignoreKey !== "city" && occurrenceState.selectedCity && row.city !== occurrenceState.selectedCity) return false;
    if (ignoreKey !== "reason" && occurrenceState.selectedReason && row.reason !== occurrenceState.selectedReason) return false;
    if (!search) return true;
    return [row.occurrence, row.branch, row.city, row.reason, row.downtime].some((value) => normalizeText(value).includes(search));
  });
}

function renderTable() {
  if (!occurrenceState.filteredRows.length) {
    els.occurrenceBody.innerHTML = '<tr><td colspan="6">Nenhuma ocorrência encontrada para os filtros atuais.</td></tr>';
    return;
  }

  els.occurrenceBody.innerHTML = occurrenceState.filteredRows
    .slice()
    .sort((a, b) => (parseDate(a.date) || 0) - (parseDate(b.date) || 0))
    .map((row) => `
      <tr>
        <td>${formatDate(row.date)}</td>
        <td>${row.branch}</td>
        <td>${row.city}</td>
        <td>${row.occurrence}</td>
        <td>${row.reason}</td>
        <td>${row.downtime}</td>
      </tr>
    `).join("");
}

function exportFilteredCsv() {
  const rows = occurrenceState.filteredRows;
  if (!rows.length) return;
  const header = ["Data", "Filial", "Cidade", "Ocorrência", "Motivo", "Tempo off"];
  const csvRows = [header, ...rows.map((row) => [formatDate(row.date), row.branch, row.city, row.occurrence, row.reason, row.downtime])];
  const csv = csvRows.map((row) => row.map(csvCell).join(";")).join("\n");
  const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ocorrencias-${occurrenceState.workbook[occurrenceState.selectedMonth]?.label || "mes"}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function chartOptions(isPie) {
  const color = document.body.dataset.theme === "dark" ? "#dfe8f2" : "#567086";
  const grid = document.body.dataset.theme === "dark" ? "rgba(145,160,178,0.18)" : "rgba(207,226,238,0.8)";
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: isPie, position: "bottom", labels: { color } }
    },
    scales: isPie ? {} : {
      x: { ticks: { color }, grid: { color: grid } },
      y: { beginAtZero: true, ticks: { color, precision: 0 }, grid: { color: grid } }
    }
  };
}

function rankBy(rows, key) {
  const grouped = new Map();
  rows.forEach((row) => {
    const value = clean(row[key]) || "Não informado";
    grouped.set(value, (grouped.get(value) || 0) + 1);
  });
  return [...grouped.entries()]
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}

function normalizeCity(value) {
  return clean(value)
    .replace(/\s*\/\s*/g, " / ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeMonthKey(value) {
  return normalizeText(value).replace(/_/g, "-");
}

function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const text = clean(value);
  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (match) {
    const [, left, right, year] = match;
    let day = Number(left);
    let month = Number(right);
    if (month > 12 && day <= 12) {
      day = Number(right);
      month = Number(left);
    }
    const fullYear = Number(year.length === 2 ? `20${year}` : year);
    return new Date(fullYear, month - 1, day);
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(value) {
  const date = parseDate(value);
  if (!date) return value || "-";
  return date.toLocaleDateString("pt-BR");
}

function setupTheme() {
  const savedTheme = localStorage.getItem("indicadores-theme") || "light";
  document.body.dataset.theme = savedTheme;
  els.themeToggle.textContent = savedTheme === "dark" ? "☀" : "☾";
  els.themeToggle.addEventListener("click", () => {
    const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
    document.body.dataset.theme = nextTheme;
    localStorage.setItem("indicadores-theme", nextTheme);
    els.themeToggle.textContent = nextTheme === "dark" ? "☀" : "☾";
    renderCharts();
  });
}

function clearData() {
  sessionStorage.removeItem(STORAGE_KEY);
  occurrenceState.workbook = {};
  occurrenceState.monthOrder = [];
  occurrenceState.selectedMonth = "";
  occurrenceState.selectedCity = "";
  occurrenceState.selectedReason = "";
  occurrenceState.filteredRows = [];
  els.importStatus.textContent = "Importe a planilha OCORRENCIAS MENSAIS.xlsx para visualizar a dashboard.";
  render();
}

function totalRows(workbook) {
  return Object.values(workbook).reduce((total, month) => total + month.records.length, 0);
}

function uniqueCount(items) {
  return new Set(items.filter(Boolean)).size;
}

function firstFilled(...values) {
  return values.map(clean).find(Boolean) || "";
}

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function isTotalRow(value) {
  return normalizeText(value).includes("total");
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

function shorten(value, size) {
  return value.length > size ? `${value.slice(0, size - 1)}…` : value;
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}
