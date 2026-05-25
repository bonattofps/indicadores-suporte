const STORAGE_KEYS = {
  workbook: "indicadoresGeneralWorkbookV2",
  workbookName: "indicadoresGeneralWorkbookName",
  importedAt: "indicadoresGeneralImportedAt",
  sharedRows: "indicadoresWorkbookRows",
  sharedSheets: "indicadoresWorkbookSheets",
  collaboratorWorkbook: "indicadoresCollaboratorWorkbookV1"
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
  charts: {}
};

document.addEventListener("DOMContentLoaded", () => {
  setupTheme();
  document.querySelector("#fileInput").addEventListener("change", handleImport);
  document.querySelector("#clearButton").addEventListener("click", clearImportedData);
  document.querySelector("#monthSelect").addEventListener("change", handleMonthChange);
  document.querySelector("#weekTabs").addEventListener("click", handlePeriodChange);
  loadSavedWorkbook();
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

async function readWorkbookData(file) {
  const buffer = await file.arrayBuffer();
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
  state.months = parsed.months || {};
  state.monthOrder = parsed.monthOrder || [];
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
    const current = metric.values[state.selectedPeriod];
    const base = metric.values[basePeriod];
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
        <div class="change ${trendClass}">${deltaLabel(delta, metric.type)} vs. ${periodLabel(basePeriod)}</div>
      </article>
    `;
  }).join("");
}

function renderExecutiveInsights() {
  const container = document.querySelector("#executiveInsights");
  if (!container) return;
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
  const critical = alerts[0];
  const best = improvements[0];

  container.innerHTML = `
    <article class="insight-note executive-note">
      <p class="eyebrow">Resumo executivo</p>
      <h3>${critical ? "Ponto de atenção" : "Cenário estável"}</h3>
      <p>${critical
        ? `${escapeHtml(critical.metric.name)} variou ${deltaLabel(critical.delta, critical.metric.type)} vs. ${periodLabel(critical.basePeriod)}.`
        : `Não há piora relevante contra ${periodLabel(comparisonPeriodKey())}.`}</p>
      ${best ? `<small>Melhor evolução: ${escapeHtml(best.metric.name)} (${deltaLabel(best.delta, best.metric.type)}).</small>` : ""}
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
    const current = metric.values[state.selectedPeriod];
    const base = metric.values[basePeriod];
    const delta = deltaValue(current, base, metric.type, metric.name);
    const trendClass = trendStatus(delta, metric);

    return `
      <article class="kpi">
        <div class="label">${name}</div>
        <div class="value">${format(current, metric.type)}</div>
        <div class="previous">Anterior: ${format(base, metric.type)}</div>
        <div class="change ${trendClass}">${deltaLabel(delta, metric.type)} vs. ${periodLabel(basePeriod)}</div>
      </article>
    `;
  }).join("");
}

function renderSplitKpi(metric, basePeriod) {
  const current = metric.values[state.selectedPeriod] || {};
  const base = metric.values[basePeriod] || {};
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
            ${deltaLabel(operationalDelta, "number")} vs. ${periodLabel(basePeriod)}
          </small>
        </div>
        <div>
          <span>Financeiro</span>
          <strong>${format(current.financeiro, "number")}</strong>
          <small class="${trendStatus(financialDelta, { type: "number", name: "Registro Financeiro" })}">
            ${deltaLabel(financialDelta, "number")} vs. ${periodLabel(basePeriod)}
          </small>
        </div>
      </div>
    </article>
  `;
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
          <span>${format(metric.values[state.selectedPeriod], metric.type)}</span>
        </div>
        <span class="pill ${status.className}">${status.label}</span>
      </div>
    `;
  }).join("");
}

function renderSummary() {
  const solved = currentMetric("Quantidade de Atendimentos Solucionados - IXC")?.values?.[state.selectedPeriod];
  const total = currentMetric("Quantidade de Atendimentos realizados - IXC")?.values?.[state.selectedPeriod];
  const field = currentMetric("Quantidade de Atendimentos que foi a campo - IXC")?.values?.[state.selectedPeriod];
  const customers = currentMetric("Quantidade Total de Cliente UNI - IXC")?.values?.[state.selectedPeriod];
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
      ${periods.map((period) => `<td>${format(metric.values[period.key], metric.type)}</td>`).join("")}
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
    const previousValue = metric.values[previousPeriod.key];
    const currentValue = metric.values[currentPeriod.key];
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
        lineDataset("Pesquisa IXC", currentMetric("Quantidade de Pesquisa de Satisfa??o Realizados - IXC") || emptyMetric("Quantidade de Pesquisa de Satisfa??o Realizados - IXC", "number"), "#c47a00")
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
  const value = metric.values[state.selectedPeriod];
  if (value === "" || value === null || value === undefined || Number.isNaN(value)) return { label: "Sem dados", className: "warn" };
  const number = toNumber(value);
  if (metric.type === "time") {
    if (timeToSeconds(value) <= 45 * 60) return { label: "Dentro", className: "good" };
    if (timeToSeconds(value) <= 55 * 60) return { label: "Atenção", className: "warn" };
    return { label: "Crítico", className: "bad" };
  }
  if (metric.name.includes("Taxa de Cliente")) {
    if (number <= 0.03) return { label: "Dentro", className: "good" };
    if (number <= 0.04) return { label: "Atenção", className: "warn" };
    return { label: "Crítico", className: "bad" };
  }
  if (metric.type === "percent") {
    if (number >= 0.99) return { label: "Dentro", className: "good" };
    if (number >= 0.97) return { label: "Atenção", className: "warn" };
    return { label: "Crítico", className: "bad" };
  }
  if (metric.type === "score") {
    if (number >= 4.5) return { label: "Dentro", className: "good" };
    if (number >= 4.3) return { label: "Atenção", className: "warn" };
    return { label: "Crítico", className: "bad" };
  }
  return number > 0 ? { label: "Dentro", className: "good" } : { label: "Atenção", className: "warn" };
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
      "O.S Aberta a Campo": { target: collaboratorValue(row[map.osCampo], "number"), direction: "up" },
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
        "O.S Aberta a Campo": { target: 20, direction: "up" },
        "Atendimento OPASuite": { target: 88, direction: "up" },
        "Avaliacao Individual": { target: 4.0, direction: "up" },
        "Tempo Medio de Atendimento": { target: "00:56:58", direction: "down" },
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
  return Number.isFinite(numeric) ? numeric : 0;
}

function currentMetrics() {
  return getCurrentMonth()?.metrics || metricDefinitions.map((definition) => emptyMetric(definition.name, definition.type));
}

function currentMetric(name) {
  return currentMetrics().find((metric) => metric.name === name);
}

function dashboardMetric(name) {
  if (name === "Resolutividade IXC") return resolutividadeMetric();
  if (name === "Clientes que entraram em contato com o suporte") return clientContactTotalMetric();
  if (name === "Registros Operacional + Financeiro - N1") return collaboratorRegistryTotalMetric();
  return currentMetric(name) || emptyMetric(name, inferMetricType(name));
}

function resolutividadeMetric() {
  const solvedMetric = currentMetric("Quantidade de Atendimentos Solucionados - IXC");
  const totalMetric = currentMetric("Quantidade de Atendimentos realizados - IXC");
  const values = {};

  getPeriods().forEach((period) => {
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
  const rateMetric = currentMetric("Taxa de Cliente que entrou em contato com o suporte em %");
  const totalMetric = currentMetric("Quantidade Total de Cliente UNI - IXC");
  const values = {};

  getPeriods().forEach((period) => {
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
  const values = {};
  const collaboratorMonth = currentCollaboratorMonth();

  getPeriods().forEach((period) => {
    const weekKey = collaboratorWeekKeyFromPeriod(period.label);
    const rows = collaboratorMonth?.teams?.N1?.rowsByWeek?.[weekKey] || [];
    const totals = rows.reduce((sum, row) => {
      const operational = Number(row[1]);
      const financial = Number(row[2]);
      return {
        operacional: sum.operacional + (Number.isFinite(operational) ? operational : 0),
        financeiro: sum.financeiro + (Number.isFinite(financial) ? financial : 0)
      };
    }, { operacional: 0, financeiro: 0 });
    values[period.key] = rows.length ? totals : "";
  });

  return {
    name: "Registros Operacional + Financeiro - N1",
    type: "split",
    values,
    matched: Boolean(collaboratorMonth)
  };
}

function currentCollaboratorMonth() {
  const stored = localStorage.getItem(STORAGE_KEYS.collaboratorWorkbook) || sessionStorage.getItem(STORAGE_KEYS.collaboratorWorkbook);
  if (!stored) return null;
  try {
    const workbook = JSON.parse(stored);
    if (workbook.months?.[state.selectedMonth]) return workbook.months[state.selectedMonth];
    const currentLabel = normalizeText(getCurrentMonth()?.label || "");
    return Object.values(workbook.months || {}).find((month) => normalizeText(month.label) === currentLabel) || null;
  } catch {
    return null;
  }
}

function collaboratorWeekKeyFromPeriod(label) {
  const normalized = normalizeText(label);
  if (normalized.includes("ULTIMA")) return "ultima";
  if (normalized.includes("1")) return "s1";
  if (normalized.includes("2")) return "s2";
  if (normalized.includes("3")) return "s3";
  if (normalized.includes("4")) return "s4";
  return "ultima";
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
    const current = metric.values[state.selectedPeriod];
    const base = metric.values[basePeriod];
    const delta = deltaValue(current, base, metric.type, metric.name);
    if (delta === null || delta === undefined || Number.isNaN(delta) || delta === 0) return null;
    return {
      metric,
      current,
      base,
      basePeriod,
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
          <span class="${row.trendClass}">${deltaLabel(row.delta, row.metric.type)} vs. ${periodLabel(row.basePeriod)}</span>
        </li>
      `).join("")}
    </ol>
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
  if (isLargeCountMetric(metricName) && number > 0 && number < 100 && /[.,]/.test(text)) return Math.round(number * 1000);
  return number;
}

function chartNumber(metric, periodKey) {
  const value = metric.values[periodKey];
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
