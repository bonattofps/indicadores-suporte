const STORAGE_KEYS = {
  parsedWorkbook: "indicadoresCollaboratorWorkbookV1",
  name: "indicadoresWorkbookName",
  importedAt: "indicadoresImportedAt"
};

const WEEK_ORDER = ["ultima", "s1", "s2", "s3", "s4"];
const WEEK_LABELS = {
  ultima: "Ultima Semana",
  s1: "1a Semana",
  s2: "2a Semana",
  s3: "3a Semana",
  s4: "4a Semana"
};

const MONTH_MAP = {
  JANEIRO: { label: "Janeiro", number: 1 },
  FEVEREIRO: { label: "Fevereiro", number: 2 },
  MARCO: { label: "Marco", number: 3 },
  ABRIL: { label: "Abril", number: 4 },
  MAIO: { label: "Maio", number: 5 },
  JUNHO: { label: "Junho", number: 6 },
  JULHO: { label: "Julho", number: 7 },
  AGOSTO: { label: "Agosto", number: 8 },
  SETEMBRO: { label: "Setembro", number: 9 },
  OUTUBRO: { label: "Outubro", number: 10 },
  NOVEMBRO: { label: "Novembro", number: 11 },
  DEZEMBRO: { label: "Dezembro", number: 12 }
};

const teams = {
  N1: {
    headers: [
      "Colaborador",
      "Registros Operacional",
      "Registro Financeiro",
      "O.S Aberta a Campo",
      "Atendimento OPASuite",
      "Avaliacao Individual",
      "Tempo Medio de Atendimento",
      "Tempo Medio de Resposta"
    ],
    defaultGoals: {
      "Registros Operacional": { target: 38, direction: "up" },
      "Registro Financeiro": { target: 38, direction: "up" },
      "O.S Aberta a Campo": { target: 20, direction: "up" },
      "Atendimento OPASuite": { target: 88, direction: "up" },
      "Avaliacao Individual": { target: 4.0, direction: "up" },
      "Tempo Medio de Atendimento": { target: "00:56:58", direction: "down" },
      "Tempo Medio de Resposta": { target: "00:02:20", direction: "down" }
    },
    rowsByWeek: emptyRowsByWeek(),
    goalsByWeek: {}
  },
  N2: {
    headers: [
      "Colaborador",
      "Ativacao de Novo Login",
      "Suporte Interno",
      "O.S Aberta a Campo",
      "Atendimento Externo",
      "Atendimento Interno"
    ],
    defaultGoals: {
      "Ativacao de Novo Login": { target: 20, direction: "up" },
      "Suporte Interno": { target: 0, direction: "up" },
      "O.S Aberta a Campo": { target: 8, direction: "up" },
      "Atendimento Externo": { target: 40, direction: "up" },
      "Atendimento Interno": { target: 5, direction: "up" }
    },
    rowsByWeek: emptyRowsByWeek(),
    goalsByWeek: {}
  }
};

const state = {
  currentTeam: "N1",
  currentWeek: "ultima",
  currentMonth: "",
  months: {},
  monthOrder: [],
  charts: {}
};

const els = {
  fileInput: document.querySelector("#fileInput"),
  clearButton: document.querySelector("#clearButton"),
  teamTabs: document.querySelector("#teamTabs"),
  monthSelect: document.querySelector("#monthSelect"),
  weekTabs: document.querySelector("#weekTabs"),
  search: document.querySelector("#searchInput"),
  metricSelect: document.querySelector("#metricSelect"),
  importStatus: document.querySelector("#importStatus"),
  executiveSummary: document.querySelector("#executiveSummary"),
  validationList: document.querySelector("#validationList"),
  kpiBoard: document.querySelector("#kpiBoard"),
  improveTitle: document.querySelector("#improveTitle"),
  improveList: document.querySelector("#improveList"),
  tableHead: document.querySelector("#tableHead"),
  tableBody: document.querySelector("#tableBody"),
  topGoodList: document.querySelector("#topGoodList"),
  topCriticalList: document.querySelector("#topCriticalList"),
  actionHead: document.querySelector("#actionHead"),
  actionBody: document.querySelector("#actionBody")
};

document.addEventListener("DOMContentLoaded", () => {
  initializeGoalState();
  setupTheme();
  bindEvents();
  loadStoredWorkbook();
  render();
});

function bindEvents() {
  els.fileInput.addEventListener("change", handleImport);
  els.clearButton.addEventListener("click", clearImportedData);
  els.teamTabs.addEventListener("click", handleTeamChange);
  els.monthSelect.addEventListener("change", handleMonthChange);
  els.weekTabs.addEventListener("click", handleWeekChange);
  els.search.addEventListener("input", () => {
    renderTable();
    renderActionPlan();
  });
  els.metricSelect.addEventListener("change", () => {
    renderExecutiveSummary();
    renderRankingChart();
  });
  window.addEventListener("storage", handleExternalWorkbookSync);
  window.addEventListener("focus", refreshSharedWorkbook);
}

function initializeGoalState() {
  Object.keys(teams).forEach((teamKey) => {
    teams[teamKey].goalsByWeek = cloneGoalsByWeek(teams[teamKey].defaultGoals);
  });
}

async function handleImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const sheets = await readWorkbookSheets(file);
    const parsed = parseWorkbookSheets(sheets);
    persistWorkbook(file.name, sheets);
    applyWorkbook(parsed);
    render();
  } catch (error) {
    console.error(error);
    alert("Nao foi possivel importar os colaboradores. Confira se a planilha segue o modelo do suporte.");
  } finally {
    event.target.value = "";
  }
}

function loadStoredWorkbook() {
  const parsedWorkbook = localStorage.getItem(STORAGE_KEYS.parsedWorkbook) || sessionStorage.getItem(STORAGE_KEYS.parsedWorkbook);
  if (parsedWorkbook) {
    try {
      const parsed = JSON.parse(parsedWorkbook);
      if (parsed.version === 5) {
        applyWorkbook(parsed);
        return;
      }
      localStorage.removeItem(STORAGE_KEYS.parsedWorkbook);
      sessionStorage.removeItem(STORAGE_KEYS.parsedWorkbook);
      els.importStatus.textContent = "Dados antigos removidos. Importe a planilha novamente em Indicadores Gerais.";
      return;
    } catch (error) {
      console.error(error);
      localStorage.removeItem(STORAGE_KEYS.parsedWorkbook);
      sessionStorage.removeItem(STORAGE_KEYS.parsedWorkbook);
    }
  }
  resetState();
  els.importStatus.textContent = "Importe a planilha em Indicadores Gerais para carregar os colaboradores por mes.";
}

function handleExternalWorkbookSync(event) {
  if (![STORAGE_KEYS.parsedWorkbook, STORAGE_KEYS.name, STORAGE_KEYS.importedAt].includes(event.key)) return;
  refreshSharedWorkbook();
}

function refreshSharedWorkbook() {
  const parsedWorkbook = localStorage.getItem(STORAGE_KEYS.parsedWorkbook) || sessionStorage.getItem(STORAGE_KEYS.parsedWorkbook);
  if (parsedWorkbook) {
    try {
      const parsed = JSON.parse(parsedWorkbook);
      if (parsed.version !== 5) {
        localStorage.removeItem(STORAGE_KEYS.parsedWorkbook);
        sessionStorage.removeItem(STORAGE_KEYS.parsedWorkbook);
        return;
      }
      applyWorkbook(parsed);
      render();
      return;
    } catch (error) {
      console.error(error);
      localStorage.removeItem(STORAGE_KEYS.parsedWorkbook);
      sessionStorage.removeItem(STORAGE_KEYS.parsedWorkbook);
    }
  }
}

async function readWorkbookSheets(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
  return workbook.SheetNames.map((name) => ({
    name,
    rows: XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, raw: false, defval: "" })
  }));
}

function parseWorkbookSheets(sheets) {
  const monthEntries = sheets
    .filter((sheet) => !normalize(sheet.name).includes("RASCUNHO"))
    .map((sheet, index) => parseCollaboratorMonth(sheet, index))
    .filter(Boolean)
    .sort((a, b) => a.sortKey - b.sortKey);

  if (!monthEntries.length) {
    throw new Error("Nenhuma aba de colaboradores encontrada.");
  }

  const months = {};
  const monthOrder = [];

  monthEntries.forEach((entry) => {
    months[entry.id] = entry;
    monthOrder.push(entry.id);
  });

  return { version: 5, months, monthOrder };
}

function parseCollaboratorMonth(sheet, index) {
  const parsedTeams = parseCollaboratorSheetRows(sheet.rows);
  if (!parsedTeams.N1.rows.length && !parsedTeams.N2.rows.length) return null;

  const meta = buildMonthMeta(sheet.name, sheet.rows, index);
  return {
    id: meta.id,
    label: meta.label,
    sortKey: meta.sortKey,
    sourceName: sheet.name,
    sourceRows: sheet.rows,
    teams: {
      N1: buildTeamMonthState("N1", parsedTeams.N1),
      N2: buildTeamMonthState("N2", parsedTeams.N2)
    }
  };
}

function parseCollaboratorSheetRows(rows) {
  const result = {
    N1: createParsedTeam("N1"),
    N2: createParsedTeam("N2")
  };
  const counters = { N1: 0, N2: 0 };

  rows.forEach((row, index) => {
    const label = normalize(row[0]);
    if (!label.includes("EQUIPE DE COLABORADORES")) return;
    const teamKey = label.includes("N1") ? "N1" : label.includes("N2") ? "N2" : "";
    if (!teamKey) return;
    const parsed = parseTeamBlock(rows, index, teamKey);
    if (parsed.rows.length) {
      const weekKey = weekKeyBySequence(counters[teamKey]);
      counters[teamKey] += 1;
      result[teamKey].weeks[weekKey] = parsed.rows;
      result[teamKey].goalsByWeek[weekKey] = parsed.goals;
    }
  });

  Object.keys(result).forEach((teamKey) => finalizeParsedTeam(result[teamKey]));
  return result;
}

function weekKeyBySequence(index) {
  return ["s1", "s2", "s3", "s4"][Math.min(index, 3)] || "s4";
}

function createParsedTeam(teamKey) {
  return {
    rows: [],
    goals: { ...teams[teamKey].defaultGoals },
    weeks: emptyRowsByWeek(),
    goalsByWeek: cloneGoalsByWeek(teams[teamKey].defaultGoals)
  };
}

function finalizeParsedTeam(parsedTeam) {
  const latestWeek = ["s4", "s3", "s2", "s1", "ultima"].find((weekKey) => parsedTeam.weeks[weekKey].length);
  if (!latestWeek) return;
  parsedTeam.rows = parsedTeam.weeks[latestWeek];
  parsedTeam.goals = parsedTeam.goalsByWeek[latestWeek];
  if (!parsedTeam.weeks.ultima.length) {
    parsedTeam.weeks.ultima = parsedTeam.rows;
    parsedTeam.goalsByWeek.ultima = parsedTeam.goals;
  }
}

function parseTeamBlock(rows, startIndex, teamKey) {
  const headers = rows[startIndex] || [];
  const columnMap = teamKey === "N1" ? buildN1ColumnMap(headers) : buildN2ColumnMap(headers);
  const parsedRows = [];
  let goals = { ...teams[teamKey].defaultGoals };

  for (let rowIndex = startIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] || [];
    const firstCell = clean(row[0]);
    const label = normalize(firstCell);

    if (!firstCell) break;
    if (label.includes("EQUIPE DE COLABORADORES") || label.includes("METRICA MATRIZ")) break;
    if (label.includes("TOTAL") || label.includes("META COLETIVA")) continue;

    if (label.includes("META INDIVIDUAL")) {
      goals = parseGoalsRow(row, teamKey, columnMap);
      continue;
    }

    if (teamKey === "N1") {
      parsedRows.push([
        firstCell,
        normalizeImportedValue(row[columnMap.operacional], "number"),
        normalizeImportedValue(row[columnMap.financeiro], "number"),
        normalizeImportedValue(row[columnMap.osCampo], "number"),
        normalizeImportedValue(row[columnMap.opaSuite], "number"),
        normalizeImportedValue(row[columnMap.avaliacao], "score"),
        normalizeImportedValue(row[columnMap.tma], "time"),
        normalizeImportedValue(row[columnMap.tmr], "time")
      ]);
    } else {
      parsedRows.push([
        firstCell,
        normalizeImportedValue(row[columnMap.login], "number"),
        normalizeImportedValue(row[columnMap.suporteInterno], "number"),
        normalizeImportedValue(row[columnMap.osCampo], "number"),
        normalizeImportedValue(row[columnMap.externo], "number"),
        normalizeImportedValue(row[columnMap.interno], "number")
      ]);
    }
  }

  return { rows: parsedRows, goals };
}

function buildN1ColumnMap(headerRow) {
  const map = {
    operacional: -1,
    financeiro: -1,
    osCampo: -1,
    opaSuite: -1,
    avaliacao: -1,
    tma: -1,
    tmr: -1
  };

  headerRow.forEach((cell, index) => {
    const label = normalize(cell);
    if (label.includes("REGISTROS OPERACIONAL")) map.operacional = index;
    if (label.includes("REGISTRO FINANCEIRO")) map.financeiro = index;
    if (label.includes("O S ABERTA A CAMPO") || label.includes("OS ABERTA A CAMPO")) map.osCampo = index;
    if (label.includes("ATENDIMENTO OPASUITE") || label.includes("OPASUITE")) map.opaSuite = index;
    if (label.includes("AVALIACAO INDIVIDUAL")) map.avaliacao = index;
    if (label.includes("TEMPO MEDIO DE ATENDIMENTO")) map.tma = index;
    if (label.includes("TEMPO MEDIO DE RESPOSTA")) map.tmr = index;
  });

  if (map.operacional === -1) map.operacional = 1;
  if (map.financeiro === -1) map.financeiro = 2;
  if (map.osCampo === -1) map.osCampo = 3;
  if (map.avaliacao === -1) map.avaliacao = map.opaSuite === -1 ? 6 : 7;
  if (map.tma === -1) map.tma = map.opaSuite === -1 ? 7 : 8;
  if (map.tmr === -1) map.tmr = map.opaSuite === -1 ? 8 : 9;

  return map;
}

function buildN2ColumnMap(headerRow) {
  const map = {
    login: -1,
    suporteInterno: -1,
    osCampo: -1,
    externo: -1,
    interno: -1
  };

  headerRow.forEach((cell, index) => {
    const label = normalize(cell);
    if (label.includes("ATIVACAO") || label.includes("NOVO LOGIN")) map.login = index;
    if (label.includes("SUPORTE INTERNO")) map.suporteInterno = index;
    if (label.includes("O S ABERTA A CAMPO") || label.includes("OS ABERTA A CAMPO")) map.osCampo = index;
    if (label.includes("ATENDIMENTO EXTERNO")) map.externo = index;
    if (label.includes("ATENDIMENTO INTERNO")) map.interno = index;
  });

  if (map.login === -1) map.login = 1;
  if (map.osCampo === -1) map.osCampo = map.suporteInterno === -1 ? 2 : 3;
  if (map.externo === -1) map.externo = map.suporteInterno === -1 ? 3 : 4;
  if (map.interno === -1) map.interno = map.suporteInterno === -1 ? 4 : 5;

  return map;
}

function parseGoalsRow(row, teamKey, map) {
  if (teamKey === "N1") {
    return {
      "Registros Operacional": { target: normalizeImportedValue(row[map.operacional], "number"), direction: "up" },
      "Registro Financeiro": { target: normalizeImportedValue(row[map.financeiro], "number"), direction: "up" },
      "O.S Aberta a Campo": { target: normalizeImportedValue(row[map.osCampo], "number"), direction: "up" },
      "Atendimento OPASuite": { target: normalizeImportedValue(row[map.opaSuite], "number"), direction: "up" },
      "Avaliacao Individual": { target: normalizeImportedValue(row[map.avaliacao], "score"), direction: "up" },
      "Tempo Medio de Atendimento": { target: normalizeImportedValue(row[map.tma], "time"), direction: "down" },
      "Tempo Medio de Resposta": { target: normalizeImportedValue(row[map.tmr], "time"), direction: "down" }
    };
  }

  return {
    "Ativacao de Novo Login": { target: normalizeImportedValue(row[map.login], "number"), direction: "up" },
    "Suporte Interno": { target: normalizeImportedValue(row[map.suporteInterno], "number"), direction: "up" },
    "O.S Aberta a Campo": { target: normalizeImportedValue(row[map.osCampo], "number"), direction: "up" },
    "Atendimento Externo": { target: normalizeImportedValue(row[map.externo], "number"), direction: "up" },
    "Atendimento Interno": { target: normalizeImportedValue(row[map.interno], "number"), direction: "up" }
  };
}

function buildTeamMonthState(teamKey, parsedTeam) {
  return {
    rowsByWeek: parsedTeam.weeks || { ...emptyRowsByWeek(), ultima: parsedTeam.rows },
    goalsByWeek: parsedTeam.goalsByWeek || { ...cloneGoalsByWeek(teams[teamKey].defaultGoals), ultima: parsedTeam.goals }
  };
}

function buildMonthMeta(sheetName, rows, index) {
  const baseText = normalize(sheetName);
  const titleText = normalize(extractSheetTitle(rows));
  const monthEntry = Object.entries(MONTH_MAP).find(([month]) => baseText.includes(month));
  const monthNumber = monthEntry ? monthEntry[1].number : index + 1;
  const monthLabel = monthEntry ? monthEntry[1].label : clean(sheetName);
  const yearMatch = baseText.match(/20\d{2}|25|26/) || titleText.match(/20\d{2}|25|26/);
  const year = yearMatch ? (yearMatch[0].length === 2 ? `20${yearMatch[0]}` : yearMatch[0]) : "2026";

  return {
    id: normalize(sheetName),
    label: `${monthLabel} ${year}`,
    sortKey: Number(year) * 100 + monthNumber
  };
}

function extractSheetTitle(rows) {
  const firstFilled = rows.find((row) => clean(row[0]));
  return firstFilled ? firstFilled[0] : "";
}

function persistWorkbook(fileName, sheets) {
  const importedAt = new Date().toLocaleString("pt-BR");
  const parsedWorkbook = parseWorkbookSheets(sheets);
  localStorage.setItem(STORAGE_KEYS.parsedWorkbook, JSON.stringify(parsedWorkbook));
  sessionStorage.setItem(STORAGE_KEYS.parsedWorkbook, JSON.stringify(parsedWorkbook));
  localStorage.setItem(STORAGE_KEYS.name, fileName);
  localStorage.setItem(STORAGE_KEYS.importedAt, importedAt);
  sessionStorage.setItem(STORAGE_KEYS.name, fileName);
  sessionStorage.setItem(STORAGE_KEYS.importedAt, importedAt);
}

function applyWorkbook(parsed) {
  state.months = parsed.months;
  state.monthOrder = parsed.monthOrder;
  if (!state.currentMonth || !state.months[state.currentMonth]) {
    state.currentMonth = state.monthOrder[state.monthOrder.length - 1] || "";
  }
  syncMonthState();
}

function syncMonthState() {
  const month = state.months[state.currentMonth];
  if (!month) {
    resetTeamData();
    return;
  }

  Object.keys(teams).forEach((teamKey) => {
    teams[teamKey].rowsByWeek = month.teams[teamKey].rowsByWeek;
    teams[teamKey].goalsByWeek = month.teams[teamKey].goalsByWeek;
  });

  const availableWeeks = WEEK_ORDER.filter((weekKey) => hasDataForWeek(weekKey));
  state.currentWeek = availableWeeks.includes(state.currentWeek) ? state.currentWeek : (availableWeeks[0] || "ultima");
  fillMetricSelect();
  updateImportStatus();
  renderValidation();
}

function handleTeamChange(event) {
  const button = event.target.closest("button[data-team]");
  if (!button) return;
  state.currentTeam = button.dataset.team;
  document.querySelectorAll("#teamTabs button").forEach((item) => item.classList.toggle("active", item === button));
  fillMetricSelect();
  render();
}

function handleMonthChange(event) {
  state.currentMonth = event.target.value;
  syncMonthState();
  render();
}

function handleWeekChange(event) {
  const button = event.target.closest("button[data-week]");
  if (!button || button.disabled) return;
  state.currentWeek = button.dataset.week;
  render();
}

function render() {
  renderMonthOptions();
  renderWeekTabs();
  renderExecutiveSummary();
  renderKpis();
  renderImproveList();
  renderTable();
  renderTopLists();
  renderActionPlan();
  renderRankingChart();
}

function renderMonthOptions() {
  if (!state.monthOrder.length) {
    els.monthSelect.innerHTML = '<option value="">Selecione o mes</option>';
    els.monthSelect.value = "";
    return;
  }

  els.monthSelect.innerHTML = state.monthOrder
    .map((monthId) => `<option value="${monthId}">${escapeHtml(state.months[monthId].label)}</option>`)
    .join("");
  els.monthSelect.value = state.months[state.currentMonth] ? state.currentMonth : state.monthOrder[state.monthOrder.length - 1];
}

function renderWeekTabs() {
  els.weekTabs.innerHTML = WEEK_ORDER.map((weekKey) => {
    const active = state.currentWeek === weekKey ? "active" : "";
    const emptyClass = hasDataForWeek(weekKey) ? "" : " is-empty";
    return `<button class="${active}${emptyClass}" type="button" data-week="${weekKey}">${WEEK_LABELS[weekKey]}</button>`;
  }).join("");
}

function renderExecutiveSummary() {
  const currentRows = rowsAsObjects();
  const scored = currentRows.map((row) => ({ row, result: scoreRow(row) }));
  const critical = scored.filter((item) => item.result.misses.length).length;
  const best = [...scored].sort(compareBestRows)[0]?.row.Colaborador || "-";
  const metric = els.metricSelect.value || defaultMetricForTeam();
  const previousTotal = aggregateMetric(comparisonRows(metric), metric);
  const currentTotal = aggregateMetric(currentRows, metric);
  const delta = previousTotal ? (((currentTotal - previousTotal) / previousTotal) * 100).toFixed(1) : "-";

  els.executiveSummary.innerHTML = [
    ["Mes", state.months[state.currentMonth]?.label || "-"],
    ["Periodo", activePeriodLabel()],
    ["Criticos", critical],
    ["Melhor desempenho", best],
    ["Comparativo", delta === "-" ? "-" : `${delta}%`]
  ].map(([label, value]) => `
    <article class="insight-card">
      <span>${label}</span>
      <strong>${escapeHtml(String(value))}</strong>
    </article>
  `).join("");
}

function renderKpis() {
  const scored = rowsAsObjects().map((row) => ({ row, result: scoreRow(row) }));
  const good = scored.filter((item) => item.result.misses.length === 0).length;
  const bad = scored.filter((item) => item.result.misses.length > 0).length;
  const best = [...scored].sort(compareBestRows)[0]?.row.Colaborador || "-";

  els.kpiBoard.innerHTML = [
    [`Colaboradores avaliados - ${activePeriodLabel()}`, scored.length],
    ["Dentro da meta", good],
    ["Criticos", bad],
    ["Melhor desempenho", best]
  ].map(([label, value]) => `
    <article class="kpi">
      <span>${label}</span>
      <strong>${escapeHtml(String(value))}</strong>
    </article>
  `).join("");
}

function renderImproveList() {
  els.improveTitle.textContent = `Precisa melhorar - ${activePeriodLabel()}`;
  const items = rowsAsObjects()
    .map((row) => ({ row, result: scoreRow(row) }))
    .filter((item) => item.result.misses.length)
    .sort((a, b) => b.result.misses.length - a.result.misses.length || compareBestRows(b, a))
    .slice(0, 8);

  if (!items.length) {
    els.improveList.innerHTML = `
      <div class="improve-item">
        <strong>Nenhum colaborador critico neste periodo</strong>
        <span>Os indicadores da equipe estao dentro da meta.</span>
      </div>
    `;
    return;
  }

  els.improveList.innerHTML = items.map((item) => `
    <div class="improve-item">
      <strong>${escapeHtml(item.row.Colaborador)}</strong>
      <span>${escapeHtml(item.result.misses.join(", "))}</span>
    </div>
  `).join("");
}

function renderTable() {
  const headers = teams[state.currentTeam].headers;
  const rows = filteredRows();

  els.tableHead.innerHTML = `
    <tr>
      ${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}
      <th>Status</th>
      <th>Precisa melhorar</th>
    </tr>
  `;

  if (!rows.length) {
    els.tableBody.innerHTML = `<tr><td class="neutral-cell" colspan="${headers.length + 2}">Sem dados para ${activePeriodLabel()} nesta equipe.</td></tr>`;
    return;
  }

  els.tableBody.innerHTML = rows.map((row) => {
    const result = scoreRow(row);
    const status = result.misses.length ? "Critico" : "Bom";
    const statusClass = result.misses.length ? "bad" : "good";
    return `
      <tr>
        ${headers.map((header) => `<td class="${cellClass(row, header)}">${escapeHtml(formatCell(row[header]))}</td>`).join("")}
        <td class="neutral-cell"><span class="badge ${statusClass}">${status}</span></td>
        <td class="neutral-cell">${escapeHtml(result.misses.join(", ") || "Dentro da meta")}</td>
      </tr>
    `;
  }).join("");
}

function renderTopLists() {
  const scored = rowsAsObjects().map((row) => ({ row, result: scoreRow(row) }));
  const best = [...scored].filter((item) => !item.result.misses.length).sort(compareBestRows).slice(0, 5);
  const critical = [...scored].filter((item) => item.result.misses.length).sort(compareWorstRows).slice(0, 5);

  els.topGoodList.innerHTML = renderMiniList(best, "Sem colaboradores 100% dentro da meta neste periodo.");
  els.topCriticalList.innerHTML = renderMiniList(critical, "Sem colaboradores criticos neste periodo.");
}

function renderMiniList(items, emptyText) {
  if (!items.length) {
    return `
      <div class="improve-item">
        <strong>${escapeHtml(emptyText)}</strong>
        <span>${activePeriodLabel()}</span>
      </div>
    `;
  }

  return items.map((item) => `
    <div class="improve-item">
      <strong>${escapeHtml(item.row.Colaborador)}</strong>
      <span>${escapeHtml(item.result.misses.join(", ") || "Dentro da meta")}</span>
    </div>
  `).join("");
}

function renderActionPlan() {
  const rows = filteredRows();
  const actions = rows
    .map((row) => ({ row, result: scoreRow(row) }))
    .filter((item) => item.result.misses.length)
    .map((item) => ({
      colaborador: item.row.Colaborador,
      needs: item.result.misses.map((metric) => {
        const goal = currentGoals()[metric];
        return `${metric}: atual ${formatCell(item.row[metric])} / meta ${formatCell(goal.target)}`;
      }).join(" | "),
      action: [...new Set(item.result.misses.map(actionForMetric))].join(" ")
    }));

  els.actionHead.innerHTML = "<tr><th>Colaborador</th><th>Precisa melhorar</th><th>Acao sugerida</th></tr>";

  if (!actions.length) {
    els.actionBody.innerHTML = `<tr><td class="neutral-cell" colspan="3">Nenhum plano de acao necessario para ${activePeriodLabel()}.</td></tr>`;
    return;
  }

  els.actionBody.innerHTML = actions.map((item) => `
    <tr>
      <td>${escapeHtml(item.colaborador)}</td>
      <td>${escapeHtml(item.needs)}</td>
      <td>${escapeHtml(item.action)}</td>
    </tr>
  `).join("");
}

function renderRankingChart() {
  const metric = els.metricSelect.value || defaultMetricForTeam();
  const rows = rowsAsObjects()
    .map((row) => ({ name: shortName(row.Colaborador), value: metricValue(row[metric]) }))
    .filter((item) => Number.isFinite(item.value))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);

  state.charts.ranking?.destroy();
  state.charts.ranking = new Chart(document.querySelector("#rankingChart"), {
    type: "bar",
    data: {
      labels: rows.map((row) => row.name),
      datasets: [{
        label: metric,
        data: rows.map((row) => row.value),
        backgroundColor: "rgba(33, 192, 122, 0.72)",
        borderColor: "#21c07a",
        borderWidth: 1,
        borderRadius: 6
      }]
    },
    options: chartOptions()
  });
}

function fillMetricSelect() {
  const headers = teams[state.currentTeam].headers.slice(1);
  const previous = els.metricSelect.value;
  els.metricSelect.innerHTML = headers.map((header) => `<option value="${header}">${escapeHtml(header)}</option>`).join("");
  els.metricSelect.value = headers.includes(previous) ? previous : defaultMetricForTeam();
}

function defaultMetricForTeam() {
  return state.currentTeam === "N1" ? "Atendimento OPASuite" : "Atendimento Externo";
}

function rowsAsObjects(weekKey = state.currentWeek) {
  const team = teams[state.currentTeam];
  const rows = team.rowsByWeek[weekKey] || [];
  return rows.map((row) => Object.fromEntries(team.headers.map((header, index) => [header, row[index]])));
}

function filteredRows() {
  const search = normalize(els.search.value);
  return rowsAsObjects().filter((row) => normalize(row.Colaborador).includes(search));
}

function currentGoals() {
  return teams[state.currentTeam].goalsByWeek[state.currentWeek] || teams[state.currentTeam].defaultGoals;
}

function scoreRow(row) {
  const goals = currentGoals();
  let score = 0;
  const misses = [];

  Object.entries(goals).forEach(([metric, goal]) => {
    const status = metricStatus(row[metric], goal);
    if (status === "good") score += 2;
    if (status === "warn") score += 1;
    if (status === "bad") misses.push(metric);
  });

  return { score, misses };
}

function metricStatus(value, goal) {
  const current = metricValue(value);
  const target = metricValue(goal.target);
  if (!Number.isFinite(current) || !Number.isFinite(target)) return "warn";

  if (goal.direction === "down") {
    return current <= target ? "good" : "bad";
  }

  if (current >= target) return "good";
  return current >= target * 0.8 ? "warn" : "bad";
}

function cellClass(row, header) {
  if (header === "Colaborador") return "neutral-cell";
  const goal = currentGoals()[header];
  if (!goal) return "neutral-cell";
  return `${metricStatus(row[header], goal)}-cell`;
}

function metricValue(value) {
  if (typeof value === "number") return value;
  if (isTimeLike(value)) return timeToSeconds(value);
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : NaN;
}

function aggregateMetric(rows, metric) {
  return rows.reduce((sum, row) => {
    const value = metricValue(row[metric]);
    return Number.isFinite(value) ? sum + value : sum;
  }, 0);
}

function previousPeriodKey() {
  if (state.currentWeek !== "ultima") {
    const index = WEEK_ORDER.indexOf(state.currentWeek);
    return index > 0 ? WEEK_ORDER[index - 1] : state.currentWeek;
  }
  return "ultima";
}

function comparisonRows() {
  if (state.currentWeek !== "ultima") {
    return rowsAsObjects(previousPeriodKey());
  }

  const previousMonthId = previousMonthKey();
  if (!previousMonthId) return [];
  const team = state.months[previousMonthId]?.teams?.[state.currentTeam];
  const rows = team?.rowsByWeek?.ultima || [];
  return rows.map((row) => Object.fromEntries(teams[state.currentTeam].headers.map((header, index) => [header, row[index]])));
}

function previousMonthKey() {
  const currentIndex = state.monthOrder.indexOf(state.currentMonth);
  return currentIndex > 0 ? state.monthOrder[currentIndex - 1] : "";
}

function compareBestRows(a, b) {
  return b.result.score - a.result.score || a.result.misses.length - b.result.misses.length || a.row.Colaborador.localeCompare(b.row.Colaborador);
}

function compareWorstRows(a, b) {
  return b.result.misses.length - a.result.misses.length || a.result.score - b.result.score || a.row.Colaborador.localeCompare(b.row.Colaborador);
}

function activePeriodLabel() {
  if (state.currentWeek === "ultima") return WEEK_LABELS.ultima;
  return WEEK_LABELS[state.currentWeek];
}

function hasDataForWeek(weekKey) {
  return Object.keys(teams).some((teamKey) => (teams[teamKey].rowsByWeek[weekKey] || []).length);
}

function updateImportStatus() {
  const workbookName = localStorage.getItem(STORAGE_KEYS.name) || sessionStorage.getItem(STORAGE_KEYS.name) || "Planilha importada";
  const importedAt = localStorage.getItem(STORAGE_KEYS.importedAt) || sessionStorage.getItem(STORAGE_KEYS.importedAt) || "-";
  const monthCount = state.monthOrder.length;
  const monthLabel = state.months[state.currentMonth]?.label || "-";
  els.importStatus.textContent = `${workbookName} importada em ${importedAt}. ${monthCount} mes(es) de colaboradores carregado(s). Mes ativo: ${monthLabel}.`;
}

function renderValidation() {
  if (!state.monthOrder.length) {
    els.validationList.innerHTML = "";
    return;
  }

  const warnings = [];
  const month = state.months[state.currentMonth];
  if (!month.teams.N1.rowsByWeek.ultima.length) warnings.push("Equipe N1 sem dados nesta aba.");
  if (!month.teams.N2.rowsByWeek.ultima.length) warnings.push("Equipe N2 sem dados nesta aba.");

  const hasAvaliacao = !month.sourceRows || month.sourceRows.some((row) => normalize(row.join(" ")).includes("AVALIACAO INDIVIDUAL"));
  if (!hasAvaliacao) warnings.push("Coluna de avaliacao individual nao foi encontrada.");

  els.validationList.innerHTML = warnings.map((warning) => `<div>${escapeHtml(warning)}</div>`).join("");
}

function normalizeImportedValue(value, type) {
  const text = clean(value);
  if (!text || normalize(text) === "S R") return type === "time" ? "00:00:00" : 0;

  if (type === "time") {
    if (isTimeLike(text)) return normalizeTimeLabel(text);
    const numeric = parseLocaleNumber(text);
    return Number.isFinite(numeric) ? excelTimeToLabel(numeric) : "00:00:00";
  }

  const numeric = parseLocaleNumber(text.replace("%", ""));
  if (!Number.isFinite(numeric)) return 0;
  return numeric;
}

function parseLocaleNumber(value) {
  const text = String(value).trim();
  if (!text) return NaN;
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
  return secondsToTime(Math.round(value * 86400));
}

function normalizeTimeLabel(value) {
  const parts = String(value).split(":").map(Number);
  const hours = parts.length === 3 ? parts[0] : 0;
  const minutes = parts.length === 3 ? parts[1] : parts[0];
  const seconds = parts.length === 3 ? parts[2] : parts[1];
  return [hours, minutes, seconds].map((item) => String(item).padStart(2, "0")).join(":");
}

function isTimeLike(value) {
  return /^\d{1,2}:\d{2}(:\d{2})?$/.test(String(value));
}

function timeToSeconds(value) {
  const [hours, minutes, seconds] = normalizeTimeLabel(value).split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}

function secondsToTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((item) => String(item).padStart(2, "0")).join(":");
}

function formatCell(value) {
  if (typeof value === "number") {
    const digits = Number.isInteger(value) ? 0 : 2;
    return value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }
  return String(value ?? "-");
}

function chartOptions() {
  const dark = document.body.dataset.theme === "dark";
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: dark ? "#dfe8f2" : "#26516d", boxWidth: 12 }
      },
      tooltip: {
        backgroundColor: dark ? "#111821" : "#ffffff",
        borderColor: dark ? "#2b3947" : "#cfe2ee",
        borderWidth: 1,
        titleColor: dark ? "#edf4fb" : "#102033",
        bodyColor: dark ? "#edf4fb" : "#102033"
      }
    },
    scales: {
      x: {
        ticks: { color: dark ? "#91a0b2" : "#567086", maxRotation: 35 },
        grid: { color: dark ? "rgba(43,57,71,0.8)" : "rgba(207,226,238,0.8)" }
      },
      y: {
        beginAtZero: true,
        ticks: { color: dark ? "#91a0b2" : "#567086" },
        grid: { color: dark ? "rgba(43,57,71,0.8)" : "rgba(207,226,238,0.8)" }
      }
    }
  };
}

function actionForMetric(metric) {
  if (metric.includes("Tempo Medio")) return "Revisar fila, priorizacao e tempo de resposta individual.";
  if (metric.includes("Avaliacao")) return "Analisar atendimentos mal avaliados e reforcar padrao de qualidade.";
  if (metric.includes("O.S")) return "Acompanhar abertura de campo e aderencia ao processo.";
  if (metric.includes("OPASuite")) return "Revisar produtividade no OPASuite e distribuicao de demandas.";
  if (metric.includes("Financeiro") || metric.includes("Operacional")) return "Checar volume de registros e meta diaria.";
  return "Acompanhar indicador com feedback semanal.";
}

function clearImportedData() {
  localStorage.removeItem(STORAGE_KEYS.parsedWorkbook);
  localStorage.removeItem(STORAGE_KEYS.name);
  localStorage.removeItem(STORAGE_KEYS.importedAt);
  sessionStorage.removeItem(STORAGE_KEYS.parsedWorkbook);
  sessionStorage.removeItem(STORAGE_KEYS.name);
  sessionStorage.removeItem(STORAGE_KEYS.importedAt);
  resetState();
  els.importStatus.textContent = "Nenhuma planilha importada neste navegador.";
  els.validationList.innerHTML = "";
  render();
}

function resetState() {
  state.currentMonth = "";
  state.currentWeek = "ultima";
  state.months = {};
  state.monthOrder = [];
  resetTeamData();
}

function resetTeamData() {
  Object.keys(teams).forEach((teamKey) => {
    teams[teamKey].rowsByWeek = emptyRowsByWeek();
    teams[teamKey].goalsByWeek = cloneGoalsByWeek(teams[teamKey].defaultGoals);
  });
}

function cloneGoalsByWeek(baseGoals) {
  return {
    ultima: { ...baseGoals },
    s1: { ...baseGoals },
    s2: { ...baseGoals },
    s3: { ...baseGoals },
    s4: { ...baseGoals }
  };
}

function emptyRowsByWeek() {
  return { ultima: [], s1: [], s2: [], s3: [], s4: [] };
}

function shortName(name) {
  const parts = String(name || "").split(" ").filter(Boolean);
  if (parts.length <= 2) return parts.join(" ");
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/gi, " ")
    .toUpperCase()
    .trim();
}

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
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
    renderRankingChart();
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
