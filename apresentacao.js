const STORAGE_KEYS = {
  workbook: "indicadoresGeneralWorkbookV2",
  workbookName: "indicadoresGeneralWorkbookName",
  importedAt: "indicadoresGeneralImportedAt",
  sharedRows: "indicadoresWorkbookRows",
  sharedSheets: "indicadoresWorkbookSheets",
  collaboratorWorkbook: "indicadoresCollaboratorWorkbookV1"
};

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDORS5NBC9kp2K7JpebALst4FaBYqTV6V0",
  authDomain: "sgp-sistema-suporte.firebaseapp.com",
  projectId: "sgp-sistema-suporte",
  storageBucket: "sgp-sistema-suporte.firebasestorage.app",
  messagingSenderId: "569194527116",
  appId: "1:569194527116:web:dd06e9ffc80b7c6634bea9",
  measurementId: "G-5XG43LT4RV"
};

const GOOGLE_SHEETS_GENERAL_XLSX_URL = "https://docs.google.com/spreadsheets/d/1aZdeCuJreUJm2G-LeyLMDchUec4oMSl3dgX_S8pR_48/export?format=xlsx";
const GOOGLE_SHEETS_GENERAL_NAME = "Google Sheets - Indicadores de Suporte";

const defaultIndicatorGoals = {
  tmaMax: "00:45:00",
  tmrMax: "00:02:00",
  slaMin: 90,
  satisfactionMin: 85,
  qualityScoreMin: 4.5,
  fieldOpenMax: 450,
  solvedTicketsMin: 1400,
  solvedMin: 75,
  totalTicketsMax: 2200
};

const metricGoalConfig = {
  "Tempo Médio de Atendimento - OPA": { key: "tmaMax", direction: "max" },
  "Tempo Médio de Resposta ao Cliente - OPA": { key: "tmrMax", direction: "max" },
  "Qualidade Percebida na Avaliação Geral - OPA": { key: "qualityScoreMin", direction: "min" },
  "Taxa de Cumprimento de SLA em (%) Ativação de Login - N2": { key: "slaMin", direction: "min" },
  "Qualidade Percebida na Satisfação em % - IXC": { key: "satisfactionMin", direction: "min" },
  "Quantidade de Atendimentos que foi a campo - IXC": { key: "fieldOpenMax", direction: "max" },
  "Quantidade de Atendimentos Solucionados - IXC": { key: "solvedTicketsMin", direction: "min" },
  "Resolutividade IXC": { key: "solvedMin", direction: "min" },
  "Quantidade de Atendimentos realizados - IXC": { key: "totalTicketsMax", direction: "max" }
};

const metricDefinitions = [
  { name: "Tempo Médio de Atendimento - OPA", type: "time", aliases: ["tempo medio de atendimento - opa", "tempo medio de atendimento - fluctuS", "tempo medio de atendimento"] },
  { name: "Tempo Médio de Resposta ao Cliente - OPA", type: "time", aliases: ["tempo medio de resposta ao cliente - opa", "tempo medio de resposta ao cliente - fluctuS", "tempo medio de resposta ao cliente"] },
  { name: "Tempo Médio de Resposta do Cliente - OPA", type: "time", aliases: ["tempo medio de resposta do cliente - opa", "tempo medio de resposta do cliente - fluctuS", "tempo medio de resposta do cliente"] },
  { name: "Quantidade de atendimento realizado pela IA - OPA", type: "number", aliases: ["quantidade de atendimento realizado pela ia - opa"] },
  { name: "Qualidade Percebida na Avaliação Geral - OPA", type: "score", aliases: ["qualidade percebida na avaliacao geral - opa", "qualidade percebida na avaliacao geral - fluctuS", "qualidade percebida na avaliacao geral"] },
  { name: "Taxa de Cumprimento de SLA em (%) Ativação de Login - N2", type: "percent", aliases: ["taxa de cumprimento de sla em (%) ativacao de login - n2", "taxa de cumprimento de sla em (%) ativacao de login", "taxa de cumprimento de sla em ( % ) ativacao de login"] },
  { name: "Quantidade de Atendimentos Realizados pela Equipe - N2", type: "number", aliases: ["quantidade de atendimentos realizados pela equipe - n2"] },
  { name: "Quantidade de Atendimentos que foi a campo - IXC", type: "number", aliases: ["quantidade de atendimentos que foi a campo - ixc", "quantidade de atendimentos que foi a campo", "quantidade de atendimentos que foi a campo (suporte externo sem conexao alteracao na rede interna)"] },
  { name: "Quantidade de Atendimentos Solucionados - IXC", type: "number", aliases: ["quantidade de atendimentos solucionados - ixc", "quantidade de atendimentos solucionados - fluctuS", "quantidade de atendimentos solucionados"] },
  { name: "Quantidade de Atendimentos realizados - IXC", type: "number", aliases: ["quantidade de atendimentos realizados - ixc", "quantidade de atendimentos realizados - fluctuS", "quantidade de atendimentos realizados"] },
  { name: "Quantidade de Pesquisa de Satisfação Realizados - IXC", type: "number", aliases: ["quantidade de pesquisa de satisfacao realizados - ixc", "quantidade de pesquisa de satisfacao realizados", "quantidade de pesquisa se satisfacao realizados", "quantidade de pesquisa de satisfacao realizados - ixc"] },
  { name: "Qualidade Percebida na Satisfação em % - IXC", type: "percent", aliases: ["qualidade percebida na satisfacao em % - ixc", "qualidade percebida na satisfacao em %"] },
  { name: "Taxa de Cliente que entrou em contato com o suporte em %", type: "percent", aliases: ["taxa de cliente que entrou em contato com o suporte em %", "taxa de cliente que entrou em c ( % por quanditade de clientes )"] },
  { name: "Quantidade Total de Cliente UNI - IXC", type: "number", aliases: ["quantidade total de cliente uni - ixc", "quantidade total de cliente uni", "quantidade total de cliente por filial"] }
];

const state = {
  months: {},
  monthOrder: [],
  selectedMonth: "",
  selectedPeriod: "",
  goals: { ...defaultIndicatorGoals },
  charts: {}
};

document.addEventListener("DOMContentLoaded", async () => {
  setupTheme();
  document.querySelector("#fileInput").addEventListener("change", handleImport);
  document.querySelector("#clearButton").addEventListener("click", clearImportedData);
  document.querySelector("#monthSelect").addEventListener("change", handleMonthChange);
  document.querySelector("#weekTabs").addEventListener("click", handlePeriodChange);
  state.goals = await loadIndicatorGoals();
  await loadGoogleSheetsWorkbook();
  render();
});

async function handleImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const workbookData = await readWorkbookData(file);
    const parsed = parseWorkbook(workbookData);
    const flatRows = workbookData.flatMap((sheet) => sheet.rows);
    persistWorkbook(parsed, flatRows, workbookData, file.name);
    applyWorkbook(parsed);
    render();
  } catch (error) {
    console.error(error);
    alert("Não foi possível importar a planilha. Confira se o arquivo segue o modelo dos indicadores gerais.");
  }
}

function loadSavedWorkbook() {
  const saved = localStorage.getItem(STORAGE_KEYS.workbook);
  if (!saved) return;
  try {
    applyWorkbook(JSON.parse(saved));
  } catch {
    localStorage.removeItem(STORAGE_KEYS.workbook);
  }
}

async function loadGoogleSheetsWorkbook() {
  const status = document.querySelector("#importStatus");
  status.textContent = "Procurando lançamentos manuais...";
  if (await loadManualWorkbook()) return;

  status.textContent = "Carregando indicadores pelo Google Sheets...";

  try {
    const response = await fetch(GOOGLE_SHEETS_GENERAL_XLSX_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`Google Sheets retornou ${response.status}.`);

    const buffer = await response.arrayBuffer();
    const workbookData = readWorkbookBuffer(buffer);
    const parsed = parseWorkbook(workbookData);
    const flatRows = workbookData.flatMap((sheet) => sheet.rows);
    persistWorkbook(parsed, flatRows, workbookData, GOOGLE_SHEETS_GENERAL_NAME);
    applyWorkbook(parsed);
  } catch (error) {
    console.error(error);
    if (loadLocalSeedWorkbook()) return;
    status.textContent = "Nao foi possivel carregar o Google Sheets. Usando dados salvos/importados, se existirem.";
    loadSavedWorkbook();
  }
}

async function loadManualWorkbook() {
  try {
    for (let attempt = 0; attempt < 80; attempt += 1) {
      if (window.SGPAuth?.loadManualIndicators && document.documentElement.dataset.authReady === "true") break;
      await new Promise((resolve) => window.setTimeout(resolve, 100));
    }

    const saved = await window.SGPAuth?.loadManualIndicators?.();
    const workbook = saved?.generalWorkbook;
    if (!isValidGeneralWorkbook(workbook)) return false;

    applyWorkbook(workbook);
    persistManualWorkbook(workbook, saved?.collaboratorWorkbook);
    document.querySelector("#importStatus").textContent = "Indicadores carregados dos lançamentos manuais do SGP.";
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

function isValidGeneralWorkbook(workbook) {
  if (!workbook?.monthOrder?.length || !workbook?.months) return false;
  return workbook.monthOrder.some((monthKey) => {
    const month = workbook.months[monthKey];
    return month?.periods?.length
      && (month.metrics || []).some((metric) => Object.values(metric.values || {}).some((value) => value !== "" && value !== null && value !== undefined));
  });
}

function loadLocalSeedWorkbook() {
  const workbook = window.SGP_MANUAL_INDICATORS_SEED?.generalWorkbook;
  if (!isValidGeneralWorkbook(workbook)) return false;
  applyWorkbook(workbook);
  persistManualWorkbook(workbook, window.SGP_MANUAL_INDICATORS_SEED?.collaboratorWorkbook);
  document.querySelector("#importStatus").textContent = "Indicadores carregados da base local de Junho 2026.";
  return true;
}

async function loadIndicatorGoals() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const goals = window.SGPAuth?.indicatorGoals?.();
    if (goals && document.documentElement.dataset.authReady === "true") {
      return { ...defaultIndicatorGoals, ...goals };
    }
    await new Promise((resolve) => window.setTimeout(resolve, 100));
  }
  return { ...defaultIndicatorGoals };
}

function parseCsvWorkbookData(csvText) {
  const workbook = XLSX.read(csvText, { type: "string", raw: false });
  const sheetName = workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, raw: false, defval: "" });
  const firstTitle = rows.find((row) => clean(row[0]))?.[0] || "Indicadores Google Sheets";
  return [{
    name: inferSheetNameFromTitle(firstTitle),
    rows
  }];
}

function inferSheetNameFromTitle(title) {
  const cleaned = clean(title).replace(/^M[ÉE]TRICA MATRIZ\s*/i, "");
  return cleaned || "Indicadores Google Sheets";
}

async function readWorkbookData(file) {
  const buffer = await file.arrayBuffer();
  return readWorkbookBuffer(buffer);
}

function readWorkbookBuffer(buffer) {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
  return workbook.SheetNames.map((name) => ({
    name,
    rows: XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, raw: false, defval: "" })
  }));
}

function parseWorkbook(sheets) {
  const parsedMonths = {};

  sheets.forEach((sheet) => {
    const monthData = parseMonthSheet(sheet);
    if (monthData) parsedMonths[monthData.id] = monthData;
  });

  const monthOrder = Object.values(parsedMonths)
    .sort((a, b) => a.sortKey - b.sortKey)
    .map((item) => item.id);

  if (!monthOrder.length) throw new Error("Nenhum mês compatível encontrado na planilha.");

  return { months: parsedMonths, monthOrder };
}

function parseMonthSheet(sheet) {
  const headerRowIndex = findHeaderRowIndex(sheet.rows);
  if (headerRowIndex === -1) return null;

  const headerRow = sheet.rows[headerRowIndex] || [];
  const periods = extractPeriods(headerRow);
  if (!periods.length) return null;

  const metrics = metricDefinitions.map((definition) => parseMetricRow(sheet.rows, definition, periods.length));
  const matchedCount = metrics.filter((metric) => metric.matched).length;
  if (matchedCount < 8) return null;

  const monthMeta = buildMonthMeta(sheet.name, headerRow[0], headerRowIndex);
  return {
    id: monthMeta.id,
    label: monthMeta.label,
    sortKey: monthMeta.sortKey,
    sourceSheet: sheet.name,
    periods,
    metrics
  };
}

function findHeaderRowIndex(rows) {
  return rows.findIndex((row) => {
    const normalized = row.map((cell) => normalizeText(cell));
    return normalized.some((cell) => cell.includes("SEMANA") || cell.includes("QUINZENA") || cell === "MENSAL" || cell.includes("ULTIMA SEMANA"));
  });
}

function extractPeriods(headerRow) {
  const periods = [];
  for (let column = 1; column < headerRow.length; column += 1) {
    const label = clean(headerRow[column]);
    if (!label) continue;
    periods.push({ key: `p${periods.length + 1}`, label });
  }
  return periods;
}

function parseMetricRow(rows, definition, periodCount) {
  const row = rows.find((currentRow) => isMetricRow(currentRow[0], definition.aliases));
  const values = {};
  for (let index = 0; index < periodCount; index += 1) {
    values[`p${index + 1}`] = normalizeImportedValue(row?.[index + 1], definition.type, definition.name);
  }
  return {
    name: definition.name,
    type: definition.type,
    values,
    matched: Boolean(row)
  };
}

function buildMonthMeta(sheetName, titleCell, headerRowIndex) {
  const label = prettifyMonthLabel(sheetName);
  const sortKey = monthSortKey(sheetName, titleCell, headerRowIndex);
  return {
    id: normalizeText(sheetName),
    label,
    sortKey
  };
}

function monthSortKey(sheetName, titleCell, headerRowIndex) {
  const base = `${sheetName} ${titleCell || ""}`;
  const normalized = normalizeText(base);
  const yearMatch = normalized.match(/20(\d{2})/);
  const year = yearMatch ? Number(`20${yearMatch[1]}`) : 2026;
  const monthMap = {
    JANEIRO: 1,
    FEVEREIRO: 2,
    MARCO: 3,
    ABRIL: 4,
    MAIO: 5,
    JUNHO: 6,
    JULHO: 7,
    AGOSTO: 8,
    SETEMBRO: 9,
    OUTUBRO: 10,
    NOVEMBRO: 11,
    DEZEMBRO: 12
  };
  const monthName = Object.keys(monthMap).find((month) => normalized.includes(month)) || "DEZEMBRO";
  return year * 100 + monthMap[monthName] + headerRowIndex / 100;
}

function prettifyMonthLabel(sheetName) {
  const normalized = normalizeText(sheetName);
  const monthMap = {
    JANEIRO: "Janeiro",
    FEVEREIRO: "Fevereiro",
    MARCO: "Março",
    ABRIL: "Abril",
    MAIO: "Maio",
    JUNHO: "Junho",
    JULHO: "Julho",
    AGOSTO: "Agosto",
    SETEMBRO: "Setembro",
    OUTUBRO: "Outubro",
    NOVEMBRO: "Novembro",
    DEZEMBRO: "Dezembro"
  };
  const monthName = Object.keys(monthMap).find((month) => normalized.includes(month));
  const yearMatch = normalized.match(/(?:^|[^0-9])(20\d{2}|25|26)(?:$|[^0-9])/);
  let year = "";
  if (yearMatch) {
    year = yearMatch[1].length === 2 ? `20${yearMatch[1]}` : yearMatch[1];
  }
  return `${monthMap[monthName] || clean(sheetName)}${year ? ` ${year}` : ""}`;
}

function persistWorkbook(parsed, flatRows, workbookData, fileName) {
  const importedAt = new Date().toLocaleString("pt-BR");
  const collaboratorWorkbook = buildCollaboratorWorkbook(workbookData);
  localStorage.setItem(STORAGE_KEYS.workbook, JSON.stringify(parsed));
  localStorage.setItem(STORAGE_KEYS.workbookName, fileName);
  localStorage.setItem(STORAGE_KEYS.importedAt, importedAt);
  if (collaboratorWorkbook.monthOrder.length) {
    localStorage.setItem(STORAGE_KEYS.collaboratorWorkbook, JSON.stringify(collaboratorWorkbook));
    sessionStorage.setItem(STORAGE_KEYS.collaboratorWorkbook, JSON.stringify(collaboratorWorkbook));
  } else {
    localStorage.removeItem(STORAGE_KEYS.collaboratorWorkbook);
    sessionStorage.removeItem(STORAGE_KEYS.collaboratorWorkbook);
  }
  localStorage.setItem("indicadoresWorkbookName", fileName);
  localStorage.setItem("indicadoresImportedAt", importedAt);
  sessionStorage.setItem("indicadoresWorkbookName", fileName);
  sessionStorage.setItem("indicadoresImportedAt", importedAt);
}

function applyWorkbook(parsed) {
  const normalized = normalizeWorkbookScores(parsed);
  state.months = normalized.months || {};
  state.monthOrder = normalized.monthOrder || [];
  if (!state.monthOrder.length) return;

  if (!state.selectedMonth || !state.months[state.selectedMonth]) {
    state.selectedMonth = state.monthOrder[state.monthOrder.length - 1];
  }

  const currentPeriods = getPeriods();
  if (!currentPeriods.find((period) => period.key === state.selectedPeriod)) {
    state.selectedPeriod = currentPeriods[0]?.key || "";
  }

  updateImportStatus();
}

function normalizeWorkbookScores(parsed) {
  const months = parsed?.months || {};
  Object.values(months).forEach((month) => {
    (month.metrics || []).forEach((metric) => {
      if (metric.type !== "score") return;
      Object.keys(metric.values || {}).forEach((periodKey) => {
        const value = metric.values[periodKey];
        if (value === "" || value === null || value === undefined) return;
        metric.values[periodKey] = normalizeScoreNumber(parseLocaleNumber(value));
      });
    });
  });
  return { ...parsed, months };
}

function handleMonthChange(event) {
  state.selectedMonth = event.target.value;
  state.selectedPeriod = getPeriods()[0]?.key || "";
  render();
}

function handlePeriodChange(event) {
  const button = event.target.closest("button[data-period]");
  if (!button) return;
  state.selectedPeriod = button.dataset.period;
  renderPeriodTabs();
  render();
}

function render() {
  renderMonthOptions();
  renderPeriodTabs();
  renderExecutiveSummary();
  renderExecutiveInsights();
  renderValidation();
  renderKpis();
  renderGoals();
  renderSummary();
  renderTable();
  renderMonthlyComparison();
  renderWeeklyComparison();
  renderCharts();
}

function persistManualWorkbook(parsed, collaboratorWorkbook) {
  const importedAt = new Date().toLocaleString("pt-BR");
  localStorage.setItem(STORAGE_KEYS.workbook, JSON.stringify(parsed));
  localStorage.setItem(STORAGE_KEYS.workbookName, "Lançamentos manuais SGP");
  localStorage.setItem(STORAGE_KEYS.importedAt, importedAt);
  if (collaboratorWorkbook?.monthOrder?.length) {
    localStorage.setItem(STORAGE_KEYS.collaboratorWorkbook, JSON.stringify(collaboratorWorkbook));
    sessionStorage.setItem(STORAGE_KEYS.collaboratorWorkbook, JSON.stringify(collaboratorWorkbook));
  }
  localStorage.setItem("indicadoresWorkbookName", "Lançamentos manuais SGP");
  localStorage.setItem("indicadoresImportedAt", importedAt);
  sessionStorage.setItem("indicadoresWorkbookName", "Lançamentos manuais SGP");
  sessionStorage.setItem("indicadoresImportedAt", importedAt);
}

function renderMonthOptions() {
  const select = document.querySelector("#monthSelect");
  if (!select) return;
  const currentValue = state.selectedMonth;
  select.innerHTML = state.monthOrder.length
    ? state.monthOrder.map((id) => `<option value="${id}">${escapeHtml(state.months[id].label)}</option>`).join("")
    : '<option value="">Selecione um mês</option>';
  select.value = state.months[currentValue] ? currentValue : (state.monthOrder[0] || "");
}

function renderPeriodTabs() {
  const container = document.querySelector("#weekTabs");
  const periods = getPeriods();
  container.innerHTML = periods.length
    ? periods.map((period) => `
      <button class="${period.key === state.selectedPeriod ? "active" : ""}" type="button" data-period="${period.key}">
        ${period.label}
      </button>
    `).join("")
    : '<button class="active" type="button" disabled>Sem períodos</button>';
}

function renderExecutiveSummary() {
  const macroNames = [
    "Qualidade Percebida na Avaliação Geral - OPA",
    "Tempo Médio de Resposta ao Cliente - OPA",
    "Tempo Médio de Atendimento - OPA",
    "Quantidade de Atendimentos realizados - IXC",
    "Quantidade de Atendimentos que foi a campo - IXC",
    "Quantidade de Atendimentos Solucionados - IXC",
    "Resolutividade IXC"
  ];
  const basePeriod = comparisonPeriodKey();

  document.querySelector("#executiveSummary").innerHTML = macroNames.map((name) => {
    const metric = dashboardMetric(name);
    const current = valueForPeriod(metric, state.selectedPeriod);
    const comparison = comparisonForMetric(metric, basePeriod);
    const base = comparison.value;
    const delta = deltaValue(current, base, metric.type, metric.name);
    const trendClass = trendStatus(delta, metric);
    const status = goalStatus(metric);

    return `
      <article class="insight-card macro-card status-${status.className}">
        <div class="macro-head">
          <span>${name}</span>
          <div class="macro-status ${status.className}">${status.label}</div>
        </div>
        <strong>${format(current, metric.type)}</strong>
        <small>Anterior: ${format(base, metric.type)}</small>
        <div class="change ${trendClass}">${deltaLabel(delta, metric.type)} vs. ${comparison.label}</div>
      </article>
    `;
  }).join("");
}

function renderExecutiveInsights() {
  const container = document.querySelector("#executiveInsights");
  if (!container) return;
  const projectionRows = buildTimeProjectionRows();
  const rows = comparisonRows([
    "Qualidade Percebida na Avaliação Geral - OPA",
    "Tempo Médio de Resposta ao Cliente - OPA",
    "Tempo Médio de Atendimento - OPA",
    "Taxa de Cliente que entrou em contato com o suporte em %",
    "Quantidade de Atendimentos Solucionados - IXC",
    "Quantidade de Atendimentos realizados - IXC",
    "Quantidade de Atendimentos que foi a campo - IXC",
    "Quantidade de atendimento realizado pela IA - OPA",
    "Quantidade de Atendimentos Realizados pela Equipe - N2",
    "Taxa de Cumprimento de SLA em (%) Ativação de Login - N2",
    "Resolutividade IXC"
  ]);

  if (!rows.length) {
    container.innerHTML = "";
    return;
  }

  const alerts = rows
    .filter((row) => row.trendClass === "trend-bad")
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 3);
  const improvements = rows
    .filter((row) => row.trendClass === "trend-good")
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 3);

  container.innerHTML = `
    <article class="insight-note executive-note projection-note">
      <p class="eyebrow">Resumo executivo</p>
      <h3>Projeção de fechamento</h3>
      ${projectionList(projectionRows)}
      <small>Meta mensal: TMR 00:02:00 e TMA 00:40:00, calculada sobre 4 semanas.</small>
    </article>
    <article class="insight-note alert">
      <p class="eyebrow">Prioridade</p>
      <h3>Top alertas</h3>
      ${insightList(alerts, "Sem alertas relevantes no período.")}
    </article>
    <article class="insight-note success">
      <p class="eyebrow">Evolução</p>
      <h3>Top melhorias</h3>
      ${insightList(improvements, "Sem melhorias comparáveis no período.")}
    </article>
  `;
}

function renderKpis() {
  const metricNames = [
    "Quantidade de atendimento realizado pela IA - OPA",
    "Quantidade de Atendimentos Realizados pela Equipe - N2",
    "Quantidade Total de Cliente UNI - IXC",
    "Taxa de Cumprimento de SLA em (%) Ativação de Login - N2",
    "Taxa de Cliente que entrou em contato com o suporte em %",
    "Registros Operacional + Financeiro - N1"
  ];

  const basePeriod = comparisonPeriodKey();
  document.querySelector("#kpiBoard").innerHTML = metricNames.map((name) => {
    const metric = dashboardMetric(name);
    if (metric.type === "split") return renderSplitKpi(metric, basePeriod);
    const current = valueForPeriod(metric, state.selectedPeriod);
    const comparison = comparisonForMetric(metric, basePeriod);
    const base = comparison.value;
    const delta = deltaValue(current, base, metric.type, metric.name);
    const trendClass = trendStatus(delta, metric);

    return `
      <article class="kpi">
        <div class="label">${name}</div>
        <div class="value">${format(current, metric.type)}</div>
        <div class="previous">Anterior: ${format(base, metric.type)}</div>
        <div class="change ${trendClass}">${deltaLabel(delta, metric.type)} vs. ${comparison.label}</div>
      </article>
    `;
  }).join("");
}

function renderSplitKpi(metric, basePeriod) {
  const currentMonth = getCurrentMonth();
  const previousMonth = getPreviousMonth();
  const useMonthlyBase = isSelectedPeriodMonthly() && previousMonth;
  const current = useMonthlyBase
    ? splitMonthlyTotal(metric, currentMonth?.periods || [])
    : valueForPeriod(metric, state.selectedPeriod) || {};
  const splitBasePeriod = useMonthlyBase ? "" : splitComparisonPeriodKey(metric, basePeriod);
  const basePeriodLabel = useMonthlyBase ? previousMonth.label : periodLabel(splitBasePeriod);
  const previousMetric = useMonthlyBase ? dashboardMetricForMonth(metric.name, previousMonth) : metric;
  const base = useMonthlyBase
    ? splitMonthlyTotal(previousMetric, previousMonth.periods || [])
    : valueForPeriod(metric, splitBasePeriod) || {};
  const operationalDelta = splitDelta(current.operacional, base.operacional);
  const financialDelta = splitDelta(current.financeiro, base.financeiro);

  return `
    <article class="kpi split-kpi">
      <div class="label">${metric.name}</div>
      <div class="split-values">
        <div>
          <span>Operacional</span>
          <strong>${format(current.operacional, "number")}</strong>
          <small class="${trendStatus(operationalDelta, { type: "number", name: "Registros Operacional" })}">
            ${deltaLabel(operationalDelta, "number")} vs. ${basePeriodLabel}
          </small>
        </div>
        <div>
          <span>Financeiro</span>
          <strong>${format(current.financeiro, "number")}</strong>
          <small class="${trendStatus(financialDelta, { type: "number", name: "Registro Financeiro" })}">
            ${deltaLabel(financialDelta, "number")} vs. ${basePeriodLabel}
          </small>
        </div>
      </div>
    </article>
  `;
}

function splitComparisonPeriodKey(metric, fallbackPeriod) {
  const periods = getPeriods();
  const currentIndex = periods.findIndex((period) => period.key === state.selectedPeriod);
  if (currentIndex <= 0) return fallbackPeriod;

  for (let index = currentIndex - 1; index >= 0; index -= 1) {
    const period = periods[index];
    const label = normalizeText(period.label);
    if (label.includes("ULTIMA") || label.includes("MENSAL")) continue;
    const value = metric.values[period.key];
    if (value && (Number.isFinite(Number(value.operacional)) || Number.isFinite(Number(value.financeiro)))) {
      return period.key;
    }
  }

  return fallbackPeriod;
}

function renderGoals() {
  const goalNames = [
    "Tempo Médio de Atendimento - OPA",
    "Quantidade de atendimento realizado pela IA - OPA",
    "Qualidade Percebida na Avaliação Geral - OPA",
    "Taxa de Cumprimento de SLA em (%) Ativação de Login - N2",
    "Qualidade Percebida na Satisfação em % - IXC",
    "Taxa de Cliente que entrou em contato com o suporte em %",
    "Quantidade de Atendimentos realizados - IXC"
  ];

  document.querySelector("#goalList").innerHTML = goalNames.map((name) => {
    const metric = currentMetric(name) || emptyMetric(name, inferMetricType(name));
    const status = goalStatus(metric);
    return `
      <div class="goal">
        <div>
          <strong>${metric.name}</strong>
          <span>${format(valueForPeriod(metric, state.selectedPeriod), metric.type)}</span>
        </div>
        <span class="pill ${status.className}">${status.label}</span>
      </div>
    `;
  }).join("");
}

function renderSummary() {
  const solvedMetric = currentMetric("Quantidade de Atendimentos Solucionados - IXC");
  const totalMetric = currentMetric("Quantidade de Atendimentos realizados - IXC");
  const fieldMetric = currentMetric("Quantidade de Atendimentos que foi a campo - IXC");
  const customersMetric = currentMetric("Quantidade Total de Cliente UNI - IXC");
  const solved = solvedMetric ? valueForPeriod(solvedMetric, state.selectedPeriod) : "";
  const total = totalMetric ? valueForPeriod(totalMetric, state.selectedPeriod) : "";
  const field = fieldMetric ? valueForPeriod(fieldMetric, state.selectedPeriod) : "";
  const customers = customersMetric ? valueForPeriod(customersMetric, state.selectedPeriod) : "";
  const solvedNumber = Number(solved);
  const totalNumber = Number(total);

  const items = [
    ["Mês", getCurrentMonth()?.label || "-"],
    ["Período", currentPeriodLabel()],
    ["Resolutividade IXC", totalNumber ? `${((solvedNumber / totalNumber) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : "-"],
    ["Atendimentos a campo", format(field, "number")],
    ["Clientes UNI", format(customers, "number")]
  ];

  document.querySelector("#summary").innerHTML = items.map(([label, value]) => `
    <div class="summary-item">
      <span>${label}</span>
      <strong>${value}</strong>
    </div>
  `).join("");
}

function renderTable() {
  const periods = getPeriods();
  document.querySelector("#tableHead").innerHTML = `
    <tr>
      <th>Indicador</th>
      ${periods.map((period) => `<th>${period.label}</th>`).join("")}
    </tr>
  `;

  document.querySelector("#tableBody").innerHTML = currentMetrics().map((metric) => `
    <tr>
      <td>${metric.name}</td>
      ${periods.map((period) => `<td>${format(valueForPeriod(metric, period.key), metric.type)}</td>`).join("")}
    </tr>
  `).join("");
}

function renderMonthlyComparison() {
  const container = document.querySelector("#monthlyComparison");
  if (!container) return;

  const currentMonth = getCurrentMonth();
  const previousMonth = getPreviousMonth();
  if (!currentMonth) {
    container.innerHTML = `<div class="empty-state">Importe a planilha para visualizar o comparativo mensal.</div>`;
    return;
  }

  const importantMetrics = [
    "Quantidade de Atendimentos realizados - IXC",
    "Quantidade de Atendimentos Solucionados - IXC",
    "Quantidade de Atendimentos que foi a campo - IXC",
    "Quantidade de atendimento realizado pela IA - OPA",
    "Quantidade de Atendimentos Realizados pela Equipe - N2",
    "Tempo Médio de Atendimento - OPA",
    "Tempo Médio de Resposta ao Cliente - OPA",
    "Qualidade Percebida na Avaliação Geral - OPA",
    "Taxa de Cumprimento de SLA em (%) Ativação de Login - N2",
    "Qualidade Percebida na Satisfação em % - IXC",
    "Taxa de Cliente que entrou em contato com o suporte em %"
  ];

  const rows = importantMetrics.map((name) => {
    const metric = currentMonth.metrics.find((item) => item.name === name) || emptyMetric(name, inferMetricType(name));
    const previousMetric = previousMonth?.metrics.find((item) => item.name === name) || emptyMetric(name, metric.type);
    const currentValue = monthlyMetricValue(metric, currentMonth.periods);
    const previousValue = previousMonth ? monthlyMetricValue(previousMetric, previousMonth.periods) : "";
    const delta = monthlyDelta(currentValue, previousValue, metric.type, metric.name);
    return { metric, currentValue, previousValue, delta };
  });

  container.innerHTML = `
    <div class="monthly-cards">
      ${renderMonthlyCard("Mês atual", currentMonth.label)}
      ${renderMonthlyCard("Mês anterior", previousMonth?.label || "-")}
      ${renderMonthlyCard("Indicadores comparados", rows.length)}
      ${renderMonthlyCard("Sem dados anteriores", rows.filter((row) => row.previousValue === "").length)}
    </div>
    <div class="table-scroll monthly-table">
      <table>
        <thead>
          <tr>
            <th>Indicador</th>
            <th>${previousMonth?.label || "Mês anterior"}</th>
            <th>${currentMonth.label}</th>
            <th>Variação</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              <td>${row.metric.name}</td>
              <td>${format(row.previousValue, row.metric.type)}</td>
              <td>${format(row.currentValue, row.metric.type)}</td>
              <td><span class="monthly-delta ${monthlyTrendClass(row.delta, row.metric)}">${monthlyDeltaLabel(row.delta, row.metric.type)}</span></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderWeeklyComparison() {
  const container = document.querySelector("#weeklyComparison");
  if (!container) return;

  const month = getCurrentMonth();
  const currentPeriod = getPeriods().find((period) => period.key === state.selectedPeriod);
  const previousKey = comparisonPeriodKey();
  const previousPeriod = getPeriods().find((period) => period.key === previousKey);

  if (!month || !currentPeriod || !previousPeriod || currentPeriod.key === previousPeriod.key) {
    container.innerHTML = '<div class="empty-state">Selecione uma semana com período anterior para comparar.</div>';
    return;
  }

  const comparisonNames = [
    "Quantidade de Atendimentos realizados - IXC",
    "Quantidade de Atendimentos Solucionados - IXC",
    "Quantidade de Atendimentos que foi a campo - IXC",
    "Quantidade de atendimento realizado pela IA - OPA",
    "Quantidade de Atendimentos Realizados pela Equipe - N2",
    "Tempo Médio de Atendimento - OPA",
    "Tempo Médio de Resposta ao Cliente - OPA",
    "Qualidade Percebida na Avaliação Geral - OPA",
    "Taxa de Cumprimento de SLA em (%) Ativação de Login - N2",
    "Taxa de Cliente que entrou em contato com o suporte em %"
  ];

  const rows = comparisonNames.map((name) => {
    const metric = currentMetric(name) || emptyMetric(name, inferMetricType(name));
    const previousValue = valueForPeriod(metric, previousPeriod.key);
    const currentValue = valueForPeriod(metric, currentPeriod.key);
    const delta = monthlyDelta(currentValue, previousValue, metric.type, metric.name);
    return { metric, previousValue, currentValue, delta };
  }).filter((row) => row.previousValue !== "" || row.currentValue !== "");

  container.innerHTML = `
    <div class="monthly-cards">
      ${renderMonthlyCard("Mês", month.label)}
      ${renderMonthlyCard("Semana atual", currentPeriod.label)}
      ${renderMonthlyCard("Semana anterior", previousPeriod.label)}
      ${renderMonthlyCard("Indicadores comparados", rows.length)}
    </div>
    <div class="table-scroll monthly-table">
      <table>
        <thead>
          <tr>
            <th>Indicador</th>
            <th>${previousPeriod.label}</th>
            <th>${currentPeriod.label}</th>
            <th>Variação</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              <td>${row.metric.name}</td>
              <td>${format(row.previousValue, row.metric.type)}</td>
              <td>${format(row.currentValue, row.metric.type)}</td>
              <td><span class="monthly-delta ${monthlyTrendClass(row.delta, row.metric)}">${monthlyDeltaLabel(row.delta, row.metric.type)}</span></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderMonthlyCard(label, value) {
  return `
    <article class="monthly-card">
      <span>${label}</span>
      <strong>${value}</strong>
    </article>
  `;
}

function renderCharts() {
  const periods = getPeriods();
  const labels = periods.map((period) => period.label);
  const barColors = [
    { background: "rgba(0, 96, 170, 0.86)", border: "#004b86" },
    { background: "rgba(0, 142, 91, 0.86)", border: "#006f47" },
    { background: "rgba(214, 135, 0, 0.88)", border: "#a86500" }
  ];
  const ixcMetrics = [
    currentMetric("Quantidade de Atendimentos realizados - IXC") || emptyMetric("Quantidade de Atendimentos realizados - IXC", "number"),
    currentMetric("Quantidade de Atendimentos Solucionados - IXC") || emptyMetric("Quantidade de Atendimentos Solucionados - IXC", "number"),
    currentMetric("Quantidade de Atendimentos que foi a campo - IXC") || emptyMetric("Quantidade de Atendimentos que foi a campo - IXC", "number")
  ];

  state.charts.ixc?.destroy();
  state.charts.ixc = new Chart(document.querySelector("#ixcChart"), {
    type: "bar",
    data: {
      labels,
      datasets: ixcMetrics.map((metric, index) => ({
        label: metric.name.replace("Quantidade de ", ""),
        data: periods.map((period) => chartNumber(metric, period.key)),
        backgroundColor: barColors[index].background,
        borderColor: barColors[index].border,
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
        maxBarThickness: 72
      }))
    },
    options: chartOptions()
  });

  state.charts.main?.destroy();
  state.charts.main = new Chart(document.querySelector("#mainChart"), {
    type: "line",
    data: {
      labels,
      datasets: [
        lineDataset("IA - OPA", currentMetric("Quantidade de atendimento realizado pela IA - OPA") || emptyMetric("Quantidade de atendimento realizado pela IA - OPA", "number"), "#006dbe"),
        lineDataset("Equipe N2", currentMetric("Quantidade de Atendimentos Realizados pela Equipe - N2") || emptyMetric("Quantidade de Atendimentos Realizados pela Equipe - N2", "number"), "#6e46d6"),
        lineDataset("Pesquisa IXC", currentMetric("Quantidade de Pesquisa de Satisfação Realizados - IXC") || emptyMetric("Quantidade de Pesquisa de Satisfação Realizados - IXC", "number"), "#c47a00")
      ]
    },
    options: chartOptions()
  });
}

function lineDataset(label, metric, color) {
  return {
    label,
    data: getPeriods().map((period) => chartNumber(metric, period.key)),
    borderColor: color,
    backgroundColor: `${color}2b`,
    pointBackgroundColor: "#ffffff",
    pointBorderColor: color,
    pointBorderWidth: 3,
    pointRadius: 5,
    pointHoverRadius: 7,
    borderWidth: 3,
    tension: 0.32,
    fill: true
  };
}

function goalStatus(metric) {
  const value = valueForPeriod(metric, state.selectedPeriod);
  if (value === "" || value === null || value === undefined || Number.isNaN(value)) return { label: "Sem dados", className: "warn" };
  const configured = configuredGoalStatus(metric, value);
  if (configured) return configured;

  const number = toNumber(value);
  if (metric.type === "time") {
    if (timeToSeconds(value) <= 45 * 60) return { label: "Dentro", className: "good" };
    if (timeToSeconds(value) <= 55 * 60) return { label: "Aten\u00e7\u00e3o", className: "warn" };
    return { label: "Cr\u00edtico", className: "bad" };
  }
  if (metric.name.includes("Taxa de Cliente")) {
    if (number <= 0.03) return { label: "Dentro", className: "good" };
    if (number <= 0.04) return { label: "Aten\u00e7\u00e3o", className: "warn" };
    return { label: "Cr\u00edtico", className: "bad" };
  }
  if (metric.type === "percent") {
    if (number >= 0.99) return { label: "Dentro", className: "good" };
    if (number >= 0.97) return { label: "Aten\u00e7\u00e3o", className: "warn" };
    return { label: "Cr\u00edtico", className: "bad" };
  }
  if (metric.type === "score") {
    if (number >= 4.5) return { label: "Dentro", className: "good" };
    if (number >= 4.3) return { label: "Aten\u00e7\u00e3o", className: "warn" };
    return { label: "Cr\u00edtico", className: "bad" };
  }
  return number > 0 ? { label: "Dentro", className: "good" } : { label: "Aten\u00e7\u00e3o", className: "warn" };
}

function configuredGoalStatus(metric, value) {
  const config = metricGoalConfig[metric.name];
  if (!config) return null;

  const rawGoal = state.goals[config.key] ?? defaultIndicatorGoals[config.key];
  const valueNumber = metric.type === "time" ? timeToSeconds(value) : toNumber(value);
  const goalNumber = metric.type === "time" ? timeToSeconds(rawGoal) : metric.type === "percent" ? Number(rawGoal) / 100 : Number(rawGoal);
  if (!Number.isFinite(valueNumber) || !Number.isFinite(goalNumber)) return null;

  const good = config.direction === "max" ? valueNumber <= goalNumber : valueNumber >= goalNumber;
  if (good) return { label: "Dentro", className: "good" };

  const warnLimit = config.direction === "max" ? goalNumber * 1.12 : goalNumber * 0.92;
  const warn = config.direction === "max" ? valueNumber <= warnLimit : valueNumber >= warnLimit;
  return warn ? { label: "Aten\u00e7\u00e3o", className: "warn" } : { label: "Cr\u00edtico", className: "bad" };
}

function chartOptions() {
  const dark = document.body.dataset.theme === "dark";
  const axisColor = dark ? "#d7e2ee" : "#244a63";
  const gridColor = dark ? "rgba(145,160,178,0.22)" : "rgba(78, 121, 150, 0.18)";
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: axisColor,
          boxWidth: 12,
          boxHeight: 12,
          usePointStyle: true,
          font: { size: 12, weight: "700" },
          padding: 18
        }
      },
      tooltip: {
        backgroundColor: dark ? "#05080d" : "#ffffff",
        borderColor: dark ? "#4a6074" : "#8bbbd4",
        borderWidth: 1,
        titleColor: dark ? "#edf4fb" : "#102033",
        bodyColor: dark ? "#edf4fb" : "#102033",
        titleFont: { weight: "800" },
        bodyFont: { weight: "700" },
        padding: 12,
        displayColors: true
      }
    },
    scales: {
      x: {
        ticks: { color: axisColor, font: { size: 11, weight: "700" } },
        grid: { color: gridColor, drawTicks: false },
        border: { color: dark ? "#405366" : "#a7c9dc" }
      },
      y: {
        beginAtZero: true,
        ticks: { color: axisColor, font: { size: 11, weight: "700" } },
        grid: { color: gridColor, drawTicks: false },
        border: { color: dark ? "#405366" : "#a7c9dc" }
      }
    }
  };
}

function renderValidation() {
  const validation = document.querySelector("#validationList");
  if (!validation) return;
  const month = getCurrentMonth();
  if (!month) {
    validation.innerHTML = "";
    return;
  }
  const warnings = month.metrics.filter((metric) => !metric.matched).map((metric) => `Indicador sem leitura neste mês: ${metric.name}`);
  validation.innerHTML = warnings.map((warning) => `<div>${warning}</div>`).join("");
}

function updateImportStatus() {
  const status = document.querySelector("#importStatus");
  const name = localStorage.getItem(STORAGE_KEYS.workbookName) || "Planilha importada";
  const importedAt = localStorage.getItem(STORAGE_KEYS.importedAt) || "-";
  const monthCount = state.monthOrder.length;
  status.textContent = `${name} salva no navegador em ${importedAt}. ${monthCount} mês(es) compatível(is) carregado(s).`;
}

function setupTheme() {
  const button = document.querySelector("#themeToggle");
  const savedTheme = localStorage.getItem("indicadores-theme") || "light";
  document.body.dataset.theme = savedTheme;
  button.textContent = savedTheme === "dark" ? "☀" : "☾";
  button.addEventListener("click", () => {
    const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
    document.body.dataset.theme = nextTheme;
    localStorage.setItem("indicadores-theme", nextTheme);
    button.textContent = nextTheme === "dark" ? "☀" : "☾";
    renderCharts();
  });
}

function clearImportedData() {
  Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
  Object.values(STORAGE_KEYS).forEach((key) => sessionStorage.removeItem(key));
  localStorage.removeItem("indicadoresGoogleSheetsTabsV1");
  sessionStorage.removeItem("indicadoresGoogleSheetsTabsV1");
  localStorage.removeItem("indicadoresWorkbookName");
  localStorage.removeItem("indicadoresImportedAt");
  sessionStorage.removeItem("indicadoresWorkbookName");
  sessionStorage.removeItem("indicadoresImportedAt");
  sessionStorage.removeItem("indicadoresWorkbookRows");
  state.months = {};
  state.monthOrder = [];
  state.selectedMonth = "";
  state.selectedPeriod = "";
  document.querySelector("#importStatus").textContent = "Nenhuma planilha importada neste navegador.";
  document.querySelector("#validationList").innerHTML = "";
  render();
}

function buildCollaboratorWorkbook(sheets) {
  const months = {};
  const monthOrder = [];

  sheets
    .filter((sheet) => !normalizeText(sheet.name).includes("RASCUNHO"))
    .map((sheet, index) => parseCollaboratorMonth(sheet, index))
    .filter(Boolean)
    .sort((a, b) => a.sortKey - b.sortKey)
    .forEach((month) => {
      months[month.id] = month;
      monthOrder.push(month.id);
    });

  return { version: 5, months, monthOrder };
}

function parseCollaboratorMonth(sheet, index) {
  const parsedTeams = parseCollaboratorSheetRows(sheet.rows);
  if (!parsedTeams.N1.rows.length && !parsedTeams.N2.rows.length) return null;

  const meta = collaboratorMonthMeta(sheet.name, sheet.rows, index);
  return {
    id: meta.id,
    label: meta.label,
    sortKey: meta.sortKey,
    sourceName: sheet.name,
    teams: {
      N1: collaboratorTeamState(defaultCollaboratorGoals("N1"), parsedTeams.N1),
      N2: collaboratorTeamState(defaultCollaboratorGoals("N2"), parsedTeams.N2)
    }
  };
}

function parseCollaboratorSheetRows(rows) {
  const result = {
    N1: createCollaboratorParsedTeam("N1"),
    N2: createCollaboratorParsedTeam("N2")
  };
  const counters = { N1: 0, N2: 0 };

  rows.forEach((row, index) => {
    const label = normalizeText(row[0]);
    if (!label.includes("EQUIPE DE COLABORADORES")) return;
    const teamKey = label.includes("N1") ? "N1" : label.includes("N2") ? "N2" : "";
    if (!teamKey) return;
    const parsed = parseCollaboratorBlock(rows, index, teamKey);
    if (parsed.rows.length) {
      const weekKey = collaboratorWeekKeyBySequence(counters[teamKey]);
      counters[teamKey] += 1;
      result[teamKey].weeks[weekKey] = parsed.rows;
      result[teamKey].goalsByWeek[weekKey] = parsed.goals;
    }
  });

  Object.keys(result).forEach((teamKey) => finalizeCollaboratorParsedTeam(result[teamKey]));
  return result;
}

function collaboratorWeekKeyBySequence(index) {
  return ["s1", "s2", "s3", "s4"][Math.min(index, 3)] || "s4";
}

function createCollaboratorParsedTeam(teamKey) {
  return {
    rows: [],
    goals: defaultCollaboratorGoals(teamKey),
    weeks: { ultima: [], s1: [], s2: [], s3: [], s4: [] },
    goalsByWeek: {
      ultima: defaultCollaboratorGoals(teamKey),
      s1: defaultCollaboratorGoals(teamKey),
      s2: defaultCollaboratorGoals(teamKey),
      s3: defaultCollaboratorGoals(teamKey),
      s4: defaultCollaboratorGoals(teamKey)
    }
  };
}

function finalizeCollaboratorParsedTeam(parsedTeam) {
  const latestWeek = ["s4", "s3", "s2", "s1", "ultima"].find((weekKey) => parsedTeam.weeks[weekKey].length);
  if (!latestWeek) return;
  parsedTeam.rows = parsedTeam.weeks[latestWeek];
  parsedTeam.goals = parsedTeam.goalsByWeek[latestWeek];
  if (!parsedTeam.weeks.ultima.length) {
    parsedTeam.weeks.ultima = parsedTeam.rows;
    parsedTeam.goalsByWeek.ultima = parsedTeam.goals;
  }
}

function parseCollaboratorBlock(rows, startIndex, teamKey) {
  const headerRow = rows[startIndex] || [];
  const columnMap = teamKey === "N1" ? collaboratorN1Map(headerRow) : collaboratorN2Map(headerRow);
  const parsedRows = [];
  let goals = defaultCollaboratorGoals(teamKey);

  for (let index = startIndex + 1; index < rows.length; index += 1) {
    const row = rows[index] || [];
    const firstCell = clean(row[0]);
    const label = normalizeText(firstCell);

    if (!firstCell) break;
    if (label.includes("EQUIPE DE COLABORADORES") || label.includes("METRICA MATRIZ")) break;
    if (label.includes("TOTAL") || label.includes("META COLETIVA")) continue;
    if (label.includes("META INDIVIDUAL")) {
      goals = parseCollaboratorGoals(row, teamKey, columnMap);
      continue;
    }

    if (teamKey === "N1") {
      parsedRows.push([
        firstCell,
        collaboratorValue(row[columnMap.operacional], "number"),
        collaboratorValue(row[columnMap.financeiro], "number"),
        collaboratorValue(row[columnMap.osCampo], "number"),
        collaboratorValue(row[columnMap.opaSuite], "number"),
        collaboratorValue(row[columnMap.avaliacao], "score"),
        collaboratorValue(row[columnMap.tma], "time"),
        collaboratorValue(row[columnMap.tmr], "time")
      ]);
    } else {
      parsedRows.push([
        firstCell,
        collaboratorValue(row[columnMap.login], "number"),
        collaboratorValue(row[columnMap.suporteInterno], "number"),
        collaboratorValue(row[columnMap.osCampo], "number"),
        collaboratorValue(row[columnMap.externo], "number"),
        collaboratorValue(row[columnMap.interno], "number")
      ]);
    }
  }

  return { rows: parsedRows, goals };
}

function collaboratorN1Map(headerRow) {
  const map = { operacional: -1, financeiro: -1, osCampo: -1, opaSuite: -1, avaliacao: -1, tma: -1, tmr: -1 };
  headerRow.forEach((cell, index) => {
    const label = normalizeText(cell);
    if (label.includes("REGISTROS OPERACIONAL")) map.operacional = index;
    if (label.includes("REGISTRO FINANCEIRO")) map.financeiro = index;
    if (label.includes("O.S ABERTA A CAMPO") || label.includes("OS ABERTA A CAMPO")) map.osCampo = index;
    if (label.includes("OPASUITE")) map.opaSuite = index;
    if (label.includes("AVALIACAO INDIVIDUAL")) map.avaliacao = index;
    if (label.includes("TEMPO MEDIO") && label.includes("ATENDIMENTO")) map.tma = index;
    if (label.includes("TEMPO MEDIO") && label.includes("RESPOSTA")) map.tmr = index;
  });
  if (map.operacional === -1) map.operacional = 1;
  if (map.financeiro === -1) map.financeiro = 2;
  if (map.osCampo === -1) map.osCampo = 3;
  if (map.avaliacao === -1) map.avaliacao = map.opaSuite === -1 ? 6 : 7;
  if (map.tma === -1) map.tma = map.opaSuite === -1 ? 7 : 8;
  if (map.tmr === -1) map.tmr = map.opaSuite === -1 ? 8 : 9;
  return map;
}

function collaboratorN2Map(headerRow) {
  const map = { login: -1, suporteInterno: -1, osCampo: -1, externo: -1, interno: -1 };
  headerRow.forEach((cell, index) => {
    const label = normalizeText(cell);
    if (label.includes("ATIVACAO") || label.includes("NOVO LOGIN")) map.login = index;
    if (label.includes("SUPORTE INTERNO")) map.suporteInterno = index;
    if (label.includes("O.S ABERTA A CAMPO") || label.includes("OS ABERTA A CAMPO")) map.osCampo = index;
    if (label.includes("ATENDIMENTO EXTERNO")) map.externo = index;
    if (label.includes("ATENDIMENTO INTERNO")) map.interno = index;
  });
  if (map.login === -1) map.login = 1;
  if (map.osCampo === -1) map.osCampo = map.suporteInterno === -1 ? 2 : 3;
  if (map.externo === -1) map.externo = map.suporteInterno === -1 ? 3 : 4;
  if (map.interno === -1) map.interno = map.suporteInterno === -1 ? 4 : 5;
  return map;
}

function parseCollaboratorGoals(row, teamKey, map) {
  if (teamKey === "N1") {
    return {
      "Registros Operacional": { target: collaboratorValue(row[map.operacional], "number"), direction: "up" },
      "Registro Financeiro": { target: collaboratorValue(row[map.financeiro], "number"), direction: "up" },
      "O.S Aberta a Campo": { target: 25, direction: "down" },
      "Atendimento OPASuite": { target: collaboratorValue(row[map.opaSuite], "number"), direction: "up" },
      "Avaliacao Individual": { target: collaboratorValue(row[map.avaliacao], "score"), direction: "up" },
      "Tempo Medio de Atendimento": { target: collaboratorValue(row[map.tma], "time"), direction: "down" },
      "Tempo Medio de Resposta": { target: collaboratorValue(row[map.tmr], "time"), direction: "down" }
    };
  }

  return {
    "Ativacao de Novo Login": { target: collaboratorValue(row[map.login], "number"), direction: "up" },
    "Suporte Interno": { target: collaboratorValue(row[map.suporteInterno], "number"), direction: "up" },
    "O.S Aberta a Campo": { target: collaboratorValue(row[map.osCampo], "number"), direction: "up" },
    "Atendimento Externo": { target: collaboratorValue(row[map.externo], "number"), direction: "up" },
    "Atendimento Interno": { target: collaboratorValue(row[map.interno], "number"), direction: "up" }
  };
}

function collaboratorTeamState(defaultGoals, parsedTeam) {
  return {
    rowsByWeek: parsedTeam.weeks || { ultima: parsedTeam.rows, s1: [], s2: [], s3: [], s4: [] },
    goalsByWeek: parsedTeam.goalsByWeek || { ultima: parsedTeam.goals, s1: { ...defaultGoals }, s2: { ...defaultGoals }, s3: { ...defaultGoals }, s4: { ...defaultGoals } }
  };
}

function collaboratorMonthMeta(sheetName, rows, index) {
  const baseText = normalizeText(sheetName);
  const titleText = normalizeText(extractCollaboratorTitle(rows));
  const monthEntry = Object.keys({
    JANEIRO: 1, FEVEREIRO: 2, MARCO: 3, ABRIL: 4, MAIO: 5, JUNHO: 6,
    JULHO: 7, AGOSTO: 8, SETEMBRO: 9, OUTUBRO: 10, NOVEMBRO: 11, DEZEMBRO: 12
  }).find((month) => baseText.includes(month));
  const monthNumber = {
    JANEIRO: 1, FEVEREIRO: 2, MARCO: 3, ABRIL: 4, MAIO: 5, JUNHO: 6,
    JULHO: 7, AGOSTO: 8, SETEMBRO: 9, OUTUBRO: 10, NOVEMBRO: 11, DEZEMBRO: 12
  }[monthEntry] || (index + 1);
  const monthLabel = {
    JANEIRO: "Janeiro", FEVEREIRO: "Fevereiro", MARCO: "Marco", ABRIL: "Abril", MAIO: "Maio", JUNHO: "Junho",
    JULHO: "Julho", AGOSTO: "Agosto", SETEMBRO: "Setembro", OUTUBRO: "Outubro", NOVEMBRO: "Novembro", DEZEMBRO: "Dezembro"
  }[monthEntry] || clean(sheetName);
  const yearMatch = baseText.match(/20\d{2}|25|26/) || titleText.match(/20\d{2}|25|26/);
  const year = yearMatch ? (yearMatch[0].length === 2 ? `20${yearMatch[0]}` : yearMatch[0]) : "2026";
  return { id: normalizeText(sheetName), label: `${monthLabel} ${year}`, sortKey: Number(year) * 100 + monthNumber };
}

function extractCollaboratorTitle(rows) {
  const firstFilled = rows.find((row) => clean(row[0]));
  return firstFilled ? firstFilled[0] : "";
}

function defaultCollaboratorGoals(teamKey) {
  return teamKey === "N1"
    ? {
        "Registros Operacional": { target: 38, direction: "up" },
        "Registro Financeiro": { target: 38, direction: "up" },
      "O.S Aberta a Campo": { target: 25, direction: "down" },
      "Atendimento OPASuite": { target: 96, direction: "up" },
      "Avaliacao Individual": { target: 4.3, direction: "up" },
      "Tempo Medio de Atendimento": { target: "01:30:00", direction: "down" },
        "Tempo Medio de Resposta": { target: "00:02:20", direction: "down" }
      }
    : {
        "Ativacao de Novo Login": { target: 20, direction: "up" },
        "Suporte Interno": { target: 0, direction: "up" },
        "O.S Aberta a Campo": { target: 8, direction: "up" },
        "Atendimento Externo": { target: 40, direction: "up" },
        "Atendimento Interno": { target: 5, direction: "up" }
      };
}

function collaboratorValue(value, type) {
  const text = clean(value);
  if (!text || normalizeText(text) === "S R") return type === "time" ? "00:00:00" : 0;
  if (type === "time") {
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(text)) return normalizeTimeLabel(text);
    const numeric = parseLocaleNumber(text);
    return Number.isFinite(numeric) ? excelTimeToLabel(numeric) : "00:00:00";
  }
  const numeric = parseLocaleNumber(text.replace("%", ""));
  if (type === "score") return normalizeScoreNumber(numeric);
  return Number.isFinite(numeric) ? numeric : 0;
}

function currentMetrics() {
  return getCurrentMonth()?.metrics || metricDefinitions.map((definition) => emptyMetric(definition.name, definition.type));
}

function currentMetric(name) {
  return currentMetrics().find((metric) => metric.name === name);
}

function dashboardMetric(name) {
  return dashboardMetricForMonth(name, getCurrentMonth());
}

function dashboardMetricForMonth(name, month) {
  if (name === "Resolutividade IXC") return resolutividadeMetricForMonth(month);
  if (name === "Clientes que entraram em contato com o suporte") return clientContactTotalMetricForMonth(month);
  if (name === "Registros Operacional + Financeiro - N1") return collaboratorRegistryTotalMetricForMonth(month);
  return month?.metrics?.find((metric) => metric.name === name) || emptyMetric(name, inferMetricType(name));
}

function resolutividadeMetric() {
  return resolutividadeMetricForMonth(getCurrentMonth());
}

function resolutividadeMetricForMonth(month) {
  const solvedMetric = month?.metrics?.find((metric) => metric.name === "Quantidade de Atendimentos Solucionados - IXC");
  const totalMetric = month?.metrics?.find((metric) => metric.name === "Quantidade de Atendimentos realizados - IXC");
  const values = {};

  (month?.periods || []).forEach((period) => {
    const solved = normalizeMetricNumber(solvedMetric?.values?.[period.key], solvedMetric?.name || "");
    const total = normalizeMetricNumber(totalMetric?.values?.[period.key], totalMetric?.name || "");
    values[period.key] = Number.isFinite(total) && total > 0 && Number.isFinite(solved)
      ? solved / total
      : "";
  });

  return {
    name: "Resolutividade IXC",
    type: "percent",
    values,
    matched: Boolean(solvedMetric && totalMetric)
  };
}

function clientContactTotalMetric() {
  return clientContactTotalMetricForMonth(getCurrentMonth());
}

function clientContactTotalMetricForMonth(month) {
  const rateMetric = month?.metrics?.find((metric) => metric.name === "Taxa de Cliente que entrou em contato com o suporte em %");
  const totalMetric = month?.metrics?.find((metric) => metric.name === "Quantidade Total de Cliente UNI - IXC");
  const values = {};

  (month?.periods || []).forEach((period) => {
    const rate = normalizeMetricNumber(rateMetric?.values?.[period.key], rateMetric?.name || "");
    const total = normalizeMetricNumber(totalMetric?.values?.[period.key], totalMetric?.name || "");
    values[period.key] = Number.isFinite(rate) && Number.isFinite(total) && total > 0
      ? Math.round(rate * total)
      : "";
  });

  return {
    name: "Clientes que entraram em contato com o suporte",
    type: "number",
    values,
    matched: Boolean(rateMetric && totalMetric)
  };
}

function collaboratorRegistryTotalMetric() {
  return collaboratorRegistryTotalMetricForMonth(getCurrentMonth());
}

function collaboratorRegistryTotalMetricForMonth(month) {
  const values = {};
  const collaboratorMonth = collaboratorMonthForDashboard(month);

  (month?.periods || []).forEach((period) => {
    const weekKey = collaboratorWeekKeyFromPeriod(period.label, collaboratorMonth?.teams?.N1?.rowsByWeek);
    const rows = collaboratorMonth?.teams?.N1?.rowsByWeek?.[weekKey] || [];
    values[period.key] = splitRowsHaveData(rows) ? splitRowsTotal(rows) : "";
  });

  return {
    name: "Registros Operacional + Financeiro - N1",
    type: "split",
    values,
    matched: Boolean(collaboratorMonth)
  };
}

function splitRowsTotal(rows) {
  return rows.reduce((sum, row) => {
    const operational = splitRowNumber(row, "operacional", 1);
    const financial = splitRowNumber(row, "financeiro", 2);
    return {
      operacional: sum.operacional + (Number.isFinite(operational) ? operational : 0),
      financeiro: sum.financeiro + (Number.isFinite(financial) ? financial : 0)
    };
  }, { operacional: 0, financeiro: 0 });
}

function splitRowsHaveData(rows) {
  return rows.some((row) => (
    Number.isFinite(splitRowNumber(row, "operacional", 1))
    || Number.isFinite(splitRowNumber(row, "financeiro", 2))
  ));
}

function splitRowNumber(row, key, index) {
  if (!row) return NaN;
  const value = Array.isArray(row) ? row[index] : row[key];
  if (value === "" || value === null || value === undefined) return NaN;
  const number = Number(value);
  return Number.isFinite(number) ? number : NaN;
}

function splitMonthlyTotal(metric, periods) {
  const total = { operacional: 0, financeiro: 0 };
  let found = false;

  periods.forEach((period) => {
    const label = normalizeText(period.label);
    if (label.includes("ULTIMA") || label.includes("MENSAL")) return;
    const value = metric.values[period.key] || {};
    const operational = Number(value.operacional);
    const financial = Number(value.financeiro);
    if (Number.isFinite(operational)) {
      total.operacional += operational;
      found = true;
    }
    if (Number.isFinite(financial)) {
      total.financeiro += financial;
      found = true;
    }
  });

  return found ? total : metric.values[state.selectedPeriod] || {};
}

function currentCollaboratorMonth() {
  return collaboratorMonthForDashboard(getCurrentMonth());
}

function collaboratorMonthForDashboard(month) {
  const stored = localStorage.getItem(STORAGE_KEYS.collaboratorWorkbook) || sessionStorage.getItem(STORAGE_KEYS.collaboratorWorkbook);
  if (!stored) return null;
  try {
    const workbook = JSON.parse(stored);
    if (month?.id && collaboratorWorkbookHasRows(workbook.months?.[month.id])) return workbook.months[month.id];
    const currentLabel = normalizeText(month?.label || "");
    const sameLabel = Object.values(workbook.months || {}).find((item) =>
      normalizeText(item.label) === currentLabel && collaboratorWorkbookHasRows(item)
    );
    if (sameLabel) return sameLabel;
    return nearestCollaboratorMonth(workbook, month);
  } catch {
    return null;
  }
}

function collaboratorWorkbookHasRows(month) {
  return ["N1", "N2"].some((teamKey) =>
    Object.values(month?.teams?.[teamKey]?.rowsByWeek || {}).some((rows) =>
      Array.isArray(rows) && rows.some((row) => String(Array.isArray(row) ? row[0] : row?.name || "").trim())
    )
  );
}

function nearestCollaboratorMonth(workbook, currentMonth) {
  const months = Object.values(workbook.months || {})
    .filter(collaboratorWorkbookHasRows)
    .sort((a, b) => (a.sortKey || 0) - (b.sortKey || 0));
  if (!months.length) return null;
  const currentSort = currentMonth?.sortKey || 0;
  return [...months].reverse().find((item) => (item.sortKey || 0) <= currentSort) || months[0];
}

function collaboratorWeekKeyFromPeriod(label, rowsByWeek = null) {
  const normalized = normalizeText(label);
  if (normalized.includes("ULTIMA")) return latestFilledCollaboratorWeek(rowsByWeek) || "ultima";
  const weekMatch = normalized.match(/\b([1-4])\s*(?:A|O|ª|º|°)?\s*SEMANA\b/);
  if (weekMatch) return `s${weekMatch[1]}`;
  return "ultima";
}

function latestFilledCollaboratorWeek(rowsByWeek) {
  if (!rowsByWeek) return "";
  return ["s4", "s3", "s2", "s1"].find((weekKey) => splitRowsHaveData(rowsByWeek[weekKey] || [])) || "";
}

function getCurrentMonth() {
  return state.months[state.selectedMonth] || null;
}

function getPeriods() {
  return getCurrentMonth()?.periods || [];
}

function currentPeriodLabel() {
  return periodLabel(state.selectedPeriod);
}

function periodLabel(periodKey) {
  return getPeriods().find((period) => period.key === periodKey)?.label || "-";
}

function isSelectedPeriodMonthly() {
  const period = getPeriods().find((item) => item.key === state.selectedPeriod);
  return normalizeText(period?.label || "").includes("MENSAL");
}

function comparisonPeriodKey() {
  const periods = getPeriods();
  const currentIndex = periods.findIndex((period) => period.key === state.selectedPeriod);
  if (currentIndex === -1) return periods[0]?.key || "";
  if (currentIndex === 0 && normalizeText(periods[0].label).includes("ULTIMA") && periods[1]) return periods[1].key;
  if (currentIndex > 0) return periods[currentIndex - 1].key;
  return periods[currentIndex + 1]?.key || periods[currentIndex]?.key || "";
}

function getPreviousMonth() {
  const currentIndex = state.monthOrder.indexOf(state.selectedMonth);
  if (currentIndex <= 0) return null;
  return state.months[state.monthOrder[currentIndex - 1]] || null;
}

function previousMonthFor(month) {
  if (!month) return null;
  const currentIndex = state.monthOrder.indexOf(month.id);
  if (currentIndex > 0) return state.months[state.monthOrder[currentIndex - 1]] || null;
  const currentSort = month.sortKey || 0;
  const previousId = [...state.monthOrder]
    .reverse()
    .find((monthId) => (state.months[monthId]?.sortKey || 0) < currentSort);
  return previousId ? state.months[previousId] : null;
}

function valueForPeriod(metric, periodKey, month = getCurrentMonth()) {
  const direct = metric?.values?.[periodKey];
  if (!isBlankMetricValue(direct)) return direct;

  const period = (month?.periods || []).find((item) => item.key === periodKey);
  if (!isPreviousMonthCarryPeriod(period)) return direct;

  const previousMonth = previousMonthFor(month);
  if (!previousMonth) return direct;

  const previousMetric = dashboardMetricForMonth(metric.name, previousMonth);
  const previousPeriod = latestFilledPeriodForMetric(previousMetric, previousMonth);
  return previousPeriod ? (previousMetric.values?.[previousPeriod.key] ?? direct) : direct;
}

function isPreviousMonthCarryPeriod(period) {
  const label = normalizeText(period?.label || "");
  return period?.week === "ultima" || label.includes("ULTIMA");
}

function latestFilledPeriodForMetric(metric, month) {
  const weeklyPeriods = (month?.periods || []).filter((period) => {
    const label = normalizeText(period.label);
    return !label.includes("ULTIMA") && !label.includes("MENSAL");
  });

  return [...weeklyPeriods].reverse().find((period) => !isBlankMetricValue(metric?.values?.[period.key]))
    || weeklyPeriods.at(-1)
    || null;
}

function isBlankMetricValue(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === "number") return Number.isNaN(value);
  if (typeof value === "string") return !value.trim();
  if (typeof value === "object") {
    return Object.values(value).every(isBlankMetricValue);
  }
  return false;
}

function comparisonForMetric(metric, fallbackPeriod = comparisonPeriodKey()) {
  if (isSelectedPeriodMonthly()) {
    const previousMonth = getPreviousMonth();
    if (previousMonth) {
      const previousMetric = dashboardMetricForMonth(metric.name, previousMonth);
      return {
        value: monthlyMetricValue(previousMetric, previousMonth.periods || []),
        label: previousMonth.label,
        periodKey: `month:${previousMonth.id || previousMonth.label}`
      };
    }
  }

  return {
    value: valueForPeriod(metric, fallbackPeriod),
    label: periodLabel(fallbackPeriod),
    periodKey: fallbackPeriod
  };
}

function monthlyMetricValue(metric, periods) {
  const explicitMonthly = periods.find((period) => normalizeText(period.label).includes("MENSAL"));
  if (explicitMonthly) {
    const value = metric.values[explicitMonthly.key] ?? "";
    return metric.type === "number" ? normalizeMetricNumber(value, metric.name) : value;
  }

  const usablePeriods = periods.filter((period) => {
    const label = normalizeText(period.label);
    if (periods.length > 1 && label.includes("ULTIMA")) return false;
    return true;
  });

  const values = usablePeriods
    .map((period) => metric.values[period.key])
    .filter((value) => value !== "" && value !== null && value !== undefined && !Number.isNaN(value));

  if (!values.length) return "";
  if (metric.type === "number") {
    const total = values.reduce((sum, value) => sum + Number(value || 0), 0);
    return normalizeMetricNumber(total, metric.name);
  }
  if (metric.type === "time") {
    const totalSeconds = values.reduce((sum, value) => sum + timeToSeconds(value), 0);
    return secondsToTime(Math.round(totalSeconds / values.length));
  }
  const total = values.reduce((sum, value) => sum + Number(value || 0), 0);
  return total / values.length;
}

function monthlyDelta(current, previous, type, metricName = "") {
  if (current === "" || previous === "" || current === null || previous === null || current === undefined || previous === undefined) return null;
  if (type === "time") return timeToSeconds(current) - timeToSeconds(previous);
  const currentNumber = normalizeMetricNumber(current, metricName);
  const previousNumber = normalizeMetricNumber(previous, metricName);
  return Number.isFinite(currentNumber) && Number.isFinite(previousNumber) ? currentNumber - previousNumber : null;
}

function monthlyDeltaLabel(delta, type) {
  if (delta === null || delta === undefined || Number.isNaN(delta)) return "Sem base";
  if (delta === 0) return "Sem variação";
  if (type === "time") return `${delta > 0 ? "+" : "-"}${secondsToTime(Math.abs(delta))}`;
  if (type === "percent") return `${delta > 0 ? "+" : "-"}${(Math.abs(delta) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} p.p.`;
  if (type === "score") return `${delta > 0 ? "+" : "-"}${Math.abs(delta).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `${delta > 0 ? "+" : "-"}${Math.abs(delta).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}

function monthlyTrendClass(delta, metric) {
  if (delta === null || delta === undefined || Number.isNaN(delta) || delta === 0) return "trend-neutral";
  const lowerIsBetter = metric.type === "time"
    || metric.name.includes("Taxa de Cliente")
    || metric.name.includes("foi a campo")
    || metric.name.includes("Clientes que entraram");
  return (lowerIsBetter ? delta < 0 : delta > 0) ? "trend-good" : "trend-bad";
}

function byAlias(text, aliases) {
  const normalized = normalizeText(text);
  return aliases.some((alias) => normalized === normalizeText(alias));
}

function isMetricRow(cell, aliases) {
  return cell && byAlias(cell, aliases);
}

function emptyMetric(name, type) {
  const values = {};
  getPeriods().forEach((period) => { values[period.key] = ""; });
  return { name, type, values, matched: false };
}

function inferMetricType(name) {
  return metricDefinitions.find((item) => item.name === name)?.type || "number";
}

function format(value, type) {
  if (value === "" || value === null || value === undefined || Number.isNaN(value)) return "-";
  if (type === "percent") return `${(value * 100).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`;
  if (type === "score") return Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (type === "number") return Number(value).toLocaleString("pt-BR");
  return value;
}

function deltaLabel(delta, type) {
  if (delta === null || delta === undefined || Number.isNaN(delta)) return "Sem dados";
  if (!delta) return "Sem variação";
  if (type === "time") return `${delta > 0 ? "+" : "-"}${secondsToTime(Math.abs(delta))}`;
  const signal = delta > 0 ? "+" : "-";
  if (type === "percent") {
    return `${signal}${(Math.abs(delta) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} p.p.`;
  }
  return `${signal}${Math.abs(delta).toLocaleString("pt-BR", { maximumFractionDigits: type === "percent" ? 2 : 0 })}`;
}

function deltaValue(current, base, type, metricName = "") {
  if (current === "" || base === "" || current === null || base === null || current === undefined || base === undefined) return null;
  if (type === "time") return timeToSeconds(current) - timeToSeconds(base);
  if (type === "split") return null;
  const currentNumber = normalizeMetricNumber(current, metricName);
  const baseNumber = normalizeMetricNumber(base, metricName);
  return Number.isFinite(currentNumber) && Number.isFinite(baseNumber) ? currentNumber - baseNumber : null;
}

function splitDelta(current, base) {
  if (current === "" || base === "" || current === null || base === null || current === undefined || base === undefined) return null;
  const currentNumber = Number(current);
  const baseNumber = Number(base);
  return Number.isFinite(currentNumber) && Number.isFinite(baseNumber) ? currentNumber - baseNumber : null;
}

function comparisonRows(names) {
  const basePeriod = comparisonPeriodKey();
  return names.map((name) => {
    const metric = dashboardMetric(name);
    const current = valueForPeriod(metric, state.selectedPeriod);
    const comparison = comparisonForMetric(metric, basePeriod);
    const base = comparison.value;
    const delta = deltaValue(current, base, metric.type, metric.name);
    if (delta === null || delta === undefined || Number.isNaN(delta) || delta === 0) return null;
    return {
      metric,
      current,
      base,
      basePeriod: comparison.periodKey,
      baseLabel: comparison.label,
      delta,
      trendClass: trendStatus(delta, metric),
      impact: deltaImpact(delta, metric.type)
    };
  }).filter(Boolean);
}

function deltaImpact(delta, type) {
  const value = Math.abs(delta);
  if (type === "time") return value / 60;
  if (type === "percent") return value * 100;
  return value;
}

function insightList(rows, emptyText) {
  if (!rows.length) return `<p class="muted-line">${emptyText}</p>`;
  return `
    <ol class="insight-list">
      ${rows.map((row) => `
        <li>
          <strong>${escapeHtml(row.metric.name)}</strong>
          <span class="${row.trendClass}">${deltaLabel(row.delta, row.metric.type)} vs. ${row.baseLabel || periodLabel(row.basePeriod)}</span>
        </li>
      `).join("")}
    </ol>
  `;
}

function buildTimeProjectionRows() {
  const targetWeeks = 4;
  const weekPeriods = projectionPeriods().slice(0, targetWeeks);
  const projectionTargets = [
    {
      label: "TMR",
      metricName: "Tempo Médio de Resposta ao Cliente - OPA",
      targetSeconds: 2 * 60
    },
    {
      label: "TMA",
      metricName: "Tempo Médio de Atendimento - OPA",
      targetSeconds: 40 * 60
    }
  ];

  return projectionTargets.map((target) => {
    const metric = currentMetric(target.metricName) || emptyMetric(target.metricName, "time");
    const values = weekPeriods
      .map((period) => metric.values[period.key])
      .filter((value) => value !== "" && value !== null && value !== undefined && !Number.isNaN(value))
      .map(timeToSeconds)
      .filter(Number.isFinite);
    const weeksDone = values.length;

    if (!weeksDone) {
      return {
        ...target,
        status: "neutral",
        currentAverage: "",
        recommendation: "Sem semanas preenchidas para projetar.",
        detail: "Preencha a 1ª semana para iniciar a projeção."
      };
    }

    const knownTotal = values.reduce((sum, value) => sum + value, 0);
    const currentAverage = Math.round(knownTotal / weeksDone);
    const remainingWeeks = Math.max(targetWeeks - weeksDone, 0);

    if (!remainingWeeks) {
      const withinTarget = currentAverage <= target.targetSeconds;
      return {
        ...target,
        status: withinTarget ? "good" : "bad",
        currentAverage: secondsToTime(currentAverage),
        recommendation: withinTarget ? "Mês dentro da meta." : "Mês acima da meta.",
        detail: `${weeksDone}/${targetWeeks} semanas fechadas. Meta ${secondsToTime(target.targetSeconds)}.`
      };
    }

    const remainingBudget = target.targetSeconds * targetWeeks - knownTotal;
    const requiredAverage = Math.floor(remainingBudget / remainingWeeks);
    const status = projectionStatus(requiredAverage, target.targetSeconds);
    const recommendation = requiredAverage > 0
      ? `Próximas ${remainingWeeks} semana(s): até ${secondsToTime(requiredAverage)} em média.`
      : "Mesmo zerando as próximas semanas, a média mensal não recupera.";

    return {
      ...target,
      status,
      currentAverage: secondsToTime(currentAverage),
      recommendation,
      detail: `${weeksDone}/${targetWeeks} semanas usadas. Meta ${secondsToTime(target.targetSeconds)}.`
    };
  });
}

function projectionPeriods() {
  const filtered = getPeriods().filter((period) => {
    const label = normalizeText(period.label);
    return !label.includes("ULTIMA") && !label.includes("MENSAL");
  });
  return filtered.length ? filtered : getPeriods().slice(0, 4);
}

function projectionStatus(requiredAverage, targetSeconds) {
  if (!Number.isFinite(requiredAverage) || requiredAverage <= 0) return "bad";
  if (requiredAverage < targetSeconds) return "warn";
  return "good";
}

function projectionList(rows) {
  if (!rows.length) return `<p class="muted-line">Sem dados suficientes para projetar.</p>`;
  return `
    <div class="projection-list">
      ${rows.map((row) => `
        <div class="projection-row projection-${row.status}">
          <div>
            <strong>${row.label}</strong>
            <span>Média atual ${row.currentAverage || "-"}</span>
          </div>
          <p>${row.recommendation}</p>
          <small>${row.detail}</small>
        </div>
      `).join("")}
    </div>
  `;
}

function normalizeMetricNumber(value, metricName) {
  const number = Number(value);
  if (isLargeCountMetric(metricName) && number > 0 && number < 100) return Math.round(number * 1000);
  return number;
}

function toNumber(value) {
  return typeof value === "number" ? value : Number(value);
}

function timeToSeconds(value) {
  const [hours, minutes, seconds] = String(value).split(":").map(Number);
  return (hours || 0) * 3600 + (minutes || 0) * 60 + (seconds || 0);
}

function secondsToTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

function normalizeImportedValue(value, type, metricName = "") {
  const text = clean(value);
  if (!text || ["S/R", "N/A", "-", "---", "<", ">"].includes(normalizeText(text))) return type === "time" ? "" : "";
  if (type === "time") {
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(text)) return normalizeTimeLabel(text);
    const number = parseLocaleNumber(text);
    return Number.isFinite(number) ? excelTimeToLabel(number) : "";
  }
  if (type === "percent") {
    if (text.includes("%")) return parseLocaleNumber(text.replace(/%/g, "")) / 100;
    const number = parseLocaleNumber(text);
    if (!Number.isFinite(number)) return "";
    return number > 1 ? number / 100 : number;
  }
  const number = parseLocaleNumber(text);
  if (!Number.isFinite(number)) return "";
  if (type === "score") return normalizeScoreNumber(number);
  if (isLargeCountMetric(metricName) && number > 0 && number < 100 && /[.,]/.test(text)) return Math.round(number * 1000);
  return number;
}

function normalizeScoreNumber(number) {
  if (!Number.isFinite(number)) return "";
  let score = number;
  if (score > 10 && score <= 100) score /= 20;
  else if (score > 5) score /= 2;
  return Math.min(Math.max(score, 0), 5);
}

function chartNumber(metric, periodKey) {
  const value = valueForPeriod(metric, periodKey);
  if (value === "" || value === null || value === undefined || Number.isNaN(value)) return null;
  const number = Number(value);
  if (isLargeCountMetric(metric.name) && number > 0 && number < 100) return Math.round(number * 1000);
  return number;
}

function isLargeCountMetric(name) {
  return [
    "Quantidade de Atendimentos realizados - IXC",
    "Quantidade de Atendimentos que foi a campo - IXC",
    "Quantidade de Atendimentos Solucionados - IXC",
    "Quantidade de Pesquisa de Satisfação Realizados - IXC",
    "Quantidade de atendimento realizado pela IA - OPA",
    "Quantidade Total de Cliente UNI - IXC",
    "Quantidade de Atendimentos Realizados pela Equipe - N2"
  ].includes(name);
}

function parseLocaleNumber(value) {
  const text = String(value).trim();
  if (!text) return NaN;
  if (/^-?\d+([.,]\d+)?e[+-]?\d+$/i.test(text)) return Number(text.replace(",", "."));
  const comma = text.lastIndexOf(",");
  const dot = text.lastIndexOf(".");
  let normalized = text;
  if (comma > dot) {
    normalized = text.replace(/\./g, "").replace(",", ".");
  } else if (dot > comma && comma !== -1) {
    normalized = text.slice(dot + 1).length === 3 ? text.replace(/\./g, "") : text.replace(/,/g, "");
  }
  return Number(normalized);
}

function excelTimeToLabel(value) {
  const totalSeconds = Math.round(value * 86400);
  return secondsToTime(totalSeconds);
}

function normalizeTimeLabel(value) {
  const parts = String(value).split(":").map(Number);
  const hours = parts.length === 3 ? parts[0] : 0;
  const minutes = parts.length === 3 ? parts[1] : parts[0];
  const seconds = parts.length === 3 ? parts[2] : parts[1];
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeText(value) {
  return clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function trendStatus(delta, metric) {
  if (delta === null || delta === undefined || Number.isNaN(delta) || delta === 0) return "trend-neutral";
  const lowerIsBetter = metric.type === "time"
    || metric.name.includes("Taxa de Cliente")
    || metric.name.includes("foi a campo")
    || metric.name.includes("Clientes que entraram");
  const improved = lowerIsBetter ? delta < 0 : delta > 0;
  return improved ? "trend-good" : "trend-bad";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
