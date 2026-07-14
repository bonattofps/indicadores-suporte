const PERIODS = [
  { key: "p1", label: "ULTIMA SEMANA", week: "ultima" },
  { key: "p2", label: "1° SEMANA", week: "s1" },
  { key: "p3", label: "2° SEMANA", week: "s2" },
  { key: "p4", label: "3° SEMANA", week: "s3" },
  { key: "p5", label: "4° SEMANA", week: "s4" }
];

const GOOGLE_SHEETS_GENERAL_XLSX_URL = "https://docs.google.com/spreadsheets/d/1aZdeCuJreUJm2G-LeyLMDchUec4oMSl3dgX_S8pR_48/export?format=xlsx";

const WEEK_OPTIONS = [
  { key: "ultima", label: "Última Semana" },
  { key: "s1", label: "1° Semana" },
  { key: "s2", label: "2° Semana" },
  { key: "s3", label: "3° Semana" },
  { key: "s4", label: "4° Semana" }
];

const TEAM_WEEK_KEYS = WEEK_OPTIONS.map((week) => week.key);

const GENERAL_METRICS = [
  { key: "tmaOpa", label: "Tempo Médio de Atendimento - OPA", type: "time" },
  { key: "tmrClienteOpa", label: "Tempo Médio de Resposta ao Cliente - OPA", type: "time" },
  { key: "tmrDoClienteOpa", label: "Tempo Médio de Resposta do Cliente - OPA", type: "time" },
  { key: "iaOpa", label: "Quantidade de atendimento realizado pela IA - OPA", type: "number" },
  { key: "avaliacaoOpa", label: "Qualidade Percebida na Avaliação Geral - OPA", type: "score" },
  { key: "slaLoginN2", label: "Taxa de Cumprimento de SLA em (%) Ativação de Login - N2", type: "percent" },
  { key: "equipeN2", label: "Quantidade de Atendimentos Realizados pela Equipe - N2", type: "number" },
  { key: "campoIxc", label: "Quantidade de Atendimentos que foi a campo - IXC", type: "number" },
  { key: "solucionadosIxc", label: "Quantidade de Atendimentos Solucionados - IXC", type: "number" },
  { key: "realizadosIxc", label: "Quantidade de Atendimentos realizados - IXC", type: "number" },
  { key: "taxaContato", label: "Taxa de Cliente que entrou em contato com o suporte em %", type: "percent" },
  { key: "totalClientes", label: "Quantidade Total de Cliente UNI - IXC", type: "number" }
];

const N1_COLUMNS = [
  { key: "name", label: "Colaborador", type: "text" },
  { key: "operacional", label: "Registros Operacional", type: "number" },
  { key: "financeiro", label: "Registro Financeiro", type: "number" },
  { key: "osCampo", label: "O.S Aberta a Campo", type: "number" },
  { key: "opaSuite", label: "Quantidade de Atendimento OPASuite", type: "number" },
  { key: "avaliacao", label: "Avaliação Individual", type: "score" },
  { key: "tma", label: "Tempo Médio de Atendimento - TMA", type: "time" },
  { key: "tmr", label: "Tempo Médio de Resposta - TMR", type: "time" }
];

const N2_COLUMNS = [
  { key: "name", label: "Colaborador", type: "text" },
  { key: "externo", label: "Atendimento Externo", type: "number" },
  { key: "interno", label: "Atendimento Interno", type: "number" },
  { key: "osCampo", label: "O.S Aberta a Campo", type: "number" },
  { key: "login", label: "Ativação de Novo Login", type: "number" }
];

const COLLABORATOR_GOALS = {
  N1: {
    "Registros Operacional": { target: 38, direction: "up" },
    "Registro Financeiro": { target: 38, direction: "up" },
    "O.S Aberta a Campo": { target: 25, direction: "down" },
    "Atendimento OPASuite": { target: 96, direction: "up" },
    "Avaliacao Individual": { target: 4.3, direction: "up" },
    "Tempo Medio de Atendimento": { target: "01:30:00", direction: "down" },
    "Tempo Medio de Resposta": { target: "00:02:20", direction: "down" }
  },
  N2: {
    "Ativacao de Novo Login": { target: 20, direction: "up" },
    "Suporte Interno": { target: 0, direction: "up" },
    "O.S Aberta a Campo": { target: 8, direction: "up" },
    "Atendimento Externo": { target: 40, direction: "up" },
    "Atendimento Interno": { target: 5, direction: "up" }
  }
};

const state = {
  months: {},
  monthOrder: [],
  currentMonth: "",
  currentWeek: "s2"
};

const els = {
  status: document.querySelector("#launchStatus"),
  monthSelect: document.querySelector("#monthSelect"),
  monthLabel: document.querySelector("#monthLabel"),
  monthKey: document.querySelector("#monthKey"),
  newMonthButton: document.querySelector("#newMonthButton"),
  addPeriodButton: document.querySelector("#addPeriodButton"),
  removePeriodButton: document.querySelector("#removePeriodButton"),
  calculateButton: document.querySelector("#calculateButton"),
  saveButton: document.querySelector("#saveButton"),
  weekSelect: document.querySelector("#weekSelect"),
  generalHead: document.querySelector("#generalHead"),
  generalBody: document.querySelector("#generalBody"),
  n1Head: document.querySelector("#n1Head"),
  n1Body: document.querySelector("#n1Body"),
  n1Foot: document.querySelector("#n1Foot"),
  n1Summary: document.querySelector("#n1Summary"),
  n2Head: document.querySelector("#n2Head"),
  n2Body: document.querySelector("#n2Body"),
  n2Foot: document.querySelector("#n2Foot"),
  n2Summary: document.querySelector("#n2Summary"),
  addN1Button: document.querySelector("#addN1Button"),
  addN2Button: document.querySelector("#addN2Button")
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  bindEvents();
  renderTeamHeaders();
  await waitForAuth();
  await loadSavedData();
  render();
}

function bindEvents() {
  els.monthSelect.addEventListener("change", () => {
    syncCurrentInputs();
    state.currentMonth = els.monthSelect.value;
    render();
  });

  els.monthLabel.addEventListener("input", () => {
    const month = currentMonth();
    month.label = els.monthLabel.value;
  });

  els.monthKey.addEventListener("input", () => {
    const month = currentMonth();
    month.id = slug(els.monthKey.value);
  });

  els.weekSelect.addEventListener("change", () => {
    state.currentWeek = els.weekSelect.value;
    renderCollaborators();
  });

  els.newMonthButton.addEventListener("click", createNewMonth);
  els.addPeriodButton.addEventListener("click", addPeriodColumn);
  els.removePeriodButton.addEventListener("click", removeLastPeriodColumn);
  els.calculateButton.addEventListener("click", () => {
    calculateGeneralFromCollaborators();
    renderGeneralBody();
    setStatus("Médias e totais aplicados nas métricas gerais. Revise e salve para sincronizar.", "success");
  });
  els.saveButton.addEventListener("click", saveData);
  els.addN1Button.addEventListener("click", () => addCollaborator("N1"));
  els.addN2Button.addEventListener("click", () => addCollaborator("N2"));
}

async function waitForAuth() {
  for (let index = 0; index < 80; index += 1) {
    if (window.SGPAuth?.loadManualIndicators && document.documentElement.dataset.authReady === "true") return;
    await delay(100);
  }
  throw new Error("Autenticação não carregou a tempo.");
}

async function loadSavedData() {
  try {
    const saved = await window.SGPAuth.loadManualIndicators();
    const months = saved?.manualData?.months || {};
    const monthOrder = saved?.manualData?.monthOrder || [];
    state.months = months;
    state.monthOrder = monthOrder.filter((monthId) => months[monthId]);
    if (!hasAnyLaunchData()) {
      const seeded = loadFromLocalSeedData() || loadFromStoredDashboardData() || await loadFromGoogleSheetsData();
      if (!seeded) createDefaultMonth(false);
    } else if (!hasAnyCollaboratorData()) {
      await mergeCollaboratorsFromPlanilha();
    }
    ensureCurrentCalendarMonth();
    if (monthNeedsSeed(state.months[state.currentMonth])) {
      await mergeCollaboratorsFromPlanilha();
      ensureCurrentCalendarMonth();
    }
    ensureCollaboratorsForAllMonths();
    ensurePreviousMonthLatestWeekForAllMonths();
    setStatus(saved?.updatedAt ? "Lançamentos manuais carregados do Firebase." : "Pronto para lançar dados manuais.", "success");
  } catch (error) {
    console.error(error);
    createDefaultMonth(false);
    ensureCollaboratorsForAllMonths();
    ensurePreviousMonthLatestWeekForAllMonths();
    setStatus("Não foi possível carregar os lançamentos. Você ainda pode preencher e tentar salvar.", "error");
  }
}

function loadFromStoredDashboardData() {
  const general = parseStoredJson("indicadoresGeneralWorkbookV2");
  const collaborator = parseStoredJson("indicadoresCollaboratorWorkbookV1");
  const monthIds = Array.from(new Set([
    ...(general?.monthOrder || []),
    ...(collaborator?.monthOrder || [])
  ]));

  if (!monthIds.length) return false;

  state.months = {};
  state.monthOrder = monthIds.filter((monthId) => general?.months?.[monthId] || collaborator?.months?.[monthId]);
  state.monthOrder.forEach((monthId) => {
    const generalMonth = general?.months?.[monthId];
    const collaboratorMonth = collaborator?.months?.[monthId];
    const periods = (generalMonth?.periods?.length ? generalMonth.periods : PERIODS)
      .map((period, index) => ({
        key: period.key || `p${index + 1}`,
        label: period.label || `Coluna ${index + 1}`,
        week: period.week || inferWeekFromPeriodLabel(period.label),
        startDate: period.startDate || "",
        endDate: period.endDate || ""
      }));

    const month = createEmptyMonth(
      monthId,
      generalMonth?.label || collaboratorMonth?.label || monthId,
      generalMonth?.sortKey || collaboratorMonth?.sortKey || sortKeyFromLabel(generalMonth?.label || collaboratorMonth?.label || monthId)
    );
    month.periods = periods;
    month.values = valuesFromGeneralMonth(generalMonth, periods);
    month.collaborators = collaboratorsFromWorkbookMonth(collaboratorMonth);
    normalizeMonthStructure(month);
    state.months[monthId] = month;
  });

  state.currentMonth = state.monthOrder.at(-1);
  setStatus("Dados da planilha atual carregados para edição manual. Ajuste, adicione/remova linhas e salve para sincronizar.", "success");
  return true;
}

function buildSeedFromStoredDashboardData() {
  return buildManualSeedFromWorkbooks(
    parseStoredJson("indicadoresGeneralWorkbookV2"),
    parseStoredJson("indicadoresCollaboratorWorkbookV1")
  );
}

function loadFromLocalSeedData() {
  const seed = buildSeedFromLocalSeedData();
  if (!seed?.monthOrder?.length) return false;
  state.months = seed.months;
  state.monthOrder = seed.monthOrder;
  state.currentMonth = state.monthOrder.at(-1);
  setStatus("Base local de Junho 2026 carregada. Salve uma vez para gravar no Firebase.", "success");
  return true;
}

function buildSeedFromLocalSeedData() {
  const manualData = window.SGP_MANUAL_INDICATORS_SEED?.manualData;
  if (!manualData?.monthOrder?.length) return null;
  return cloneData({
    months: manualData.months || {},
    monthOrder: manualData.monthOrder || []
  });
}

async function loadFromGoogleSheetsData() {
  const seed = await buildSeedFromGoogleSheetsData();
  if (!seed?.monthOrder?.length) return false;
  state.months = seed.months;
  state.monthOrder = seed.monthOrder;
  state.currentMonth = state.monthOrder.at(-1);
  setStatus("Colaboradores N1/N2 carregados direto da planilha para edicao manual.", "success");
  return true;
}

async function buildSeedFromGoogleSheetsData() {
  if (!window.XLSX) return null;
  try {
    setStatus("Buscando colaboradores direto da planilha...", "info");
    const response = await fetch(GOOGLE_SHEETS_GENERAL_XLSX_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`Google Sheets retornou ${response.status}.`);
    const buffer = await response.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
    const sheets = workbook.SheetNames.map((name) => ({
      name,
      rows: XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, raw: false, defval: "" })
    }));
    return buildManualSeedFromWorkbooks(generalWorkbookFromSheets(sheets), collaboratorWorkbookFromSheets(sheets));
  } catch (error) {
    console.error(error);
    return null;
  }
}

function buildManualSeedFromWorkbooks(general, collaborator) {
  const monthIds = Array.from(new Set([
    ...(general?.monthOrder || []),
    ...(collaborator?.monthOrder || [])
  ]));
  if (!monthIds.length) return null;

  const months = {};
  const monthOrder = monthIds.filter((monthId) => general?.months?.[monthId] || collaborator?.months?.[monthId]);
  monthOrder.forEach((monthId) => {
    const generalMonth = general?.months?.[monthId];
    const collaboratorMonth = collaborator?.months?.[monthId];
    const periods = (generalMonth?.periods?.length ? generalMonth.periods : PERIODS)
      .map((period, index) => ({
        key: period.key || `p${index + 1}`,
        label: period.label || `Coluna ${index + 1}`,
        week: period.week || inferWeekFromPeriodLabel(period.label),
        startDate: period.startDate || "",
        endDate: period.endDate || ""
      }));

    const month = createEmptyMonth(
      monthId,
      generalMonth?.label || collaboratorMonth?.label || monthId,
      generalMonth?.sortKey || collaboratorMonth?.sortKey || sortKeyFromLabel(generalMonth?.label || collaboratorMonth?.label || monthId)
    );
    month.periods = periods;
    month.values = valuesFromGeneralMonth(generalMonth, periods);
    month.collaborators = collaboratorsFromWorkbookMonth(collaboratorMonth);
    normalizeMonthStructure(month);
    months[monthId] = month;
  });

  return { months, monthOrder };
}

function hasAnyLaunchData() {
  return state.monthOrder.some((monthId) => {
    const month = state.months[monthId];
    if (!month) return false;
    const hasGeneral = Object.values(month.values || {}).some((periodValues) =>
      Object.values(periodValues || {}).some((value) => String(value ?? "").trim())
    );
    return hasGeneral || monthHasCollaborators(month);
  });
}

function hasAnyCollaboratorData() {
  return state.monthOrder.some((monthId) => monthHasCollaborators(state.months[monthId]));
}

function monthHasCollaborators(month) {
  return ["N1", "N2"].some((teamKey) =>
    Object.values(month?.collaborators?.[teamKey] || {}).some((rows) =>
      Array.isArray(rows) && rows.some((row) => String(row?.name || "").trim())
    )
  );
}

function monthHasGeneralValues(month) {
  return Object.values(month?.values || {}).some((periodValues) =>
    Object.values(periodValues || {}).some((value) => String(value ?? "").trim())
  );
}

function monthNeedsSeed(month) {
  return !month || !monthHasGeneralValues(month) || !monthHasCollaborators(month);
}

async function mergeCollaboratorsFromPlanilha() {
  const seed = buildSeedFromLocalSeedData() || buildSeedFromStoredDashboardData() || await buildSeedFromGoogleSheetsData();
  if (!seed?.monthOrder?.length) return false;

  seed.monthOrder.forEach((monthId) => {
    const seedMonth = seed.months[monthId];
    const targetId = state.months[monthId] ? monthId : findMonthByLabel(seedMonth.label) || monthId;
    if (!state.months[targetId]) {
      state.months[targetId] = cloneData(seedMonth);
      state.monthOrder.push(targetId);
      return;
    }

    mergeSeedMonth(state.months[targetId], seedMonth);
  });

  sortMonthOrder();
  return true;
}

function mergeSeedMonth(target, seedMonth) {
  normalizeMonthStructure(target);
  normalizeMonthStructure(seedMonth);
  mergeSeedPeriods(target, seedMonth);
  mergeSeedGeneralValues(target, seedMonth);
  mergeSeedCollaborators(target, seedMonth, "N1");
  mergeSeedCollaborators(target, seedMonth, "N2");
}

function mergeSeedPeriods(target, seedMonth) {
  seedMonth.periods.forEach((seedPeriod) => {
    const period = target.periods.find((item) => item.key === seedPeriod.key);
    if (!period) {
      target.periods.push({ ...seedPeriod });
      return;
    }
    period.label ||= seedPeriod.label;
    period.week ||= seedPeriod.week;
    period.startDate ||= seedPeriod.startDate;
    period.endDate ||= seedPeriod.endDate;
  });
}

function mergeSeedGeneralValues(target, seedMonth) {
  GENERAL_METRICS.forEach((metric) => {
    target.values[metric.key] ||= {};
    seedMonth.values[metric.key] ||= {};
    seedMonth.periods.forEach((period) => {
      const current = target.values[metric.key][period.key];
      const seeded = seedMonth.values[metric.key][period.key];
      if (isBlank(current) && !isBlank(seeded)) {
        target.values[metric.key][period.key] = seeded;
      }
    });
  });
}

function mergeSeedCollaborators(target, seedMonth, teamKey) {
  TEAM_WEEK_KEYS.forEach((weekKey) => {
    const targetRows = target.collaborators[teamKey][weekKey] ||= [];
    const seedRows = seedMonth.collaborators[teamKey][weekKey] || [];
    seedRows.forEach((seedRow) => {
      const row = findCollaboratorRow(targetRows, seedRow);
      if (!row) {
        targetRows.push(cloneData(seedRow));
        return;
      }
      Object.entries(seedRow).forEach(([key, value]) => {
        if (key === "_id") return;
        if (isBlank(row[key]) && !isBlank(value)) {
          row[key] = value;
        }
      });
    });
  });
  normalizeCollaboratorTeam(target, teamKey);
}

function findCollaboratorRow(rows, seedRow) {
  const seedId = seedRow._id;
  const seedName = normalizeText(seedRow.name);
  return rows.find((row) => (seedId && row._id === seedId) || normalizeText(row.name) === seedName);
}

function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === "";
}

function findMonthByLabel(label) {
  const normalized = normalizeText(label);
  return state.monthOrder.find((monthId) => normalizeText(state.months[monthId]?.label) === normalized);
}

function valuesFromGeneralMonth(generalMonth, periods) {
  const values = Object.fromEntries(GENERAL_METRICS.map((metric) => [metric.key, emptyPeriodValues(periods)]));
  if (!generalMonth?.metrics?.length) return values;

  GENERAL_METRICS.forEach((definition) => {
    const metric = generalMonth.metrics.find((item) => normalizeText(item.name) === normalizeText(definition.label));
    periods.forEach((period) => {
      values[definition.key][period.key] = displayValue(metric?.values?.[period.key], definition.type);
    });
  });
  return values;
}

function collaboratorsFromWorkbookMonth(month) {
  return {
    N1: rowsByWeekFromWorkbook(month?.teams?.N1?.rowsByWeek, "N1"),
    N2: rowsByWeekFromWorkbook(month?.teams?.N2?.rowsByWeek, "N2")
  };
}

function rowsByWeekFromWorkbook(rowsByWeek = {}, teamKey) {
  const output = emptyRowsByWeek();
  WEEK_OPTIONS.forEach((week) => {
    output[week.key] = (rowsByWeek[week.key] || []).map((row) => teamKey === "N1" ? n1Object(row) : n2Object(row));
  });
  return output;
}

function n1Object(row = []) {
  return {
    name: row[0] || "",
    operacional: displayValue(row[1], "number"),
    financeiro: displayValue(row[2], "number"),
    osCampo: displayValue(row[3], "number"),
    opaSuite: displayValue(row[4], "number"),
    avaliacao: displayValue(row[5], "score"),
    tma: displayValue(row[6], "time"),
    tmr: displayValue(row[7], "time")
  };
}

function n2Object(row = []) {
  return {
    name: row[0] || "",
    login: displayValue(row[1], "number"),
    osCampo: displayValue(row[3], "number"),
    externo: displayValue(row[4], "number"),
    interno: displayValue(row[5], "number")
  };
}

function parseStoredJson(key) {
  try {
    const raw = localStorage.getItem(key) || sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error(error);
    return null;
  }
}

function cloneData(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function generalWorkbookFromSheets(sheets) {
  const months = {};
  const monthOrder = [];
  sheets.forEach((sheet, index) => {
    const headerIndex = sheet.rows.findIndex((row) =>
      row.map((cell) => normalizeText(cell)).some((cell) => cell.includes("SEMANA") || cell.includes("MENSAL"))
    );
    if (headerIndex === -1) return;

    const periods = sheet.rows[headerIndex]
      .slice(1)
      .map((label, periodIndex) => ({ key: `p${periodIndex + 1}`, label: String(label || "").trim(), week: inferWeekFromPeriodLabel(label), startDate: "", endDate: "" }))
      .filter((period) => period.label);
    if (!periods.length) return;

    const meta = monthMetaFromSheet(sheet.name, index);
    months[meta.id] = {
      id: meta.id,
      label: meta.label,
      sortKey: meta.sortKey,
      periods,
      metrics: GENERAL_METRICS.map((definition) => {
        const row = sheet.rows.find((item) => normalizeText(item[0]) === normalizeText(definition.label));
        return {
          name: definition.label,
          type: definition.type,
          values: Object.fromEntries(periods.map((period, periodIndex) => [
            period.key,
            normalizeValue(row?.[periodIndex + 1], definition.type)
          ])),
          matched: Boolean(row)
        };
      })
    };
    monthOrder.push(meta.id);
  });
  return { months, monthOrder: monthOrder.sort((a, b) => (months[a].sortKey || 0) - (months[b].sortKey || 0)) };
}

function collaboratorWorkbookFromSheets(sheets) {
  const months = {};
  const monthOrder = [];
  sheets.forEach((sheet, index) => {
    const teams = parseCollaboratorTeams(sheet.rows);
    if (!Object.values(teams.N1.rowsByWeek).some((rows) => rows.length) && !Object.values(teams.N2.rowsByWeek).some((rows) => rows.length)) return;

    const meta = monthMetaFromSheet(sheet.name, index);
    months[meta.id] = {
      id: meta.id,
      label: meta.label,
      sortKey: meta.sortKey,
      sourceName: sheet.name,
      teams
    };
    monthOrder.push(meta.id);
  });
  return { version: 5, months, monthOrder: monthOrder.sort((a, b) => (months[a].sortKey || 0) - (months[b].sortKey || 0)) };
}

function parseCollaboratorTeams(rows) {
  const teams = {
    N1: { rowsByWeek: emptyRowsByWeek(), goalsByWeek: defaultGoalsByWeek("N1") },
    N2: { rowsByWeek: emptyRowsByWeek(), goalsByWeek: defaultGoalsByWeek("N2") }
  };
  const counters = { N1: 0, N2: 0 };

  rows.forEach((row, index) => {
    const label = normalizeText(row[0]);
    if (!label.includes("EQUIPE DE COLABORADORES")) return;
    const teamKey = label.includes("N1") ? "N1" : label.includes("N2") ? "N2" : "";
    if (!teamKey) return;
    const week = ["s1", "s2", "s3", "s4"][counters[teamKey]] || "s4";
    counters[teamKey] += 1;
    teams[teamKey].rowsByWeek[week] = parseCollaboratorBlock(rows, index, teamKey);
  });

  ["N1", "N2"].forEach((teamKey) => {
    const latest = ["s4", "s3", "s2", "s1"].find((week) => teams[teamKey].rowsByWeek[week].length);
    if (latest && !teams[teamKey].rowsByWeek.ultima.length) {
      teams[teamKey].rowsByWeek.ultima = teams[teamKey].rowsByWeek[latest];
    }
  });

  return teams;
}

function parseCollaboratorBlock(rows, startIndex, teamKey) {
  const header = rows[startIndex] || [];
  const map = teamKey === "N1" ? n1ColumnMap(header) : n2ColumnMap(header);
  const parsed = [];

  for (let index = startIndex + 1; index < rows.length; index += 1) {
    const row = rows[index] || [];
    const name = String(row[0] || "").trim();
    const label = normalizeText(name);
    if (!name) break;
    if (label.includes("EQUIPE DE COLABORADORES") || label.includes("METRICA MATRIZ")) break;
    if (label.includes("TOTAL") || label.includes("META COLETIVA") || label.includes("META INDIVIDUAL")) continue;

    parsed.push(teamKey === "N1"
      ? [
          name,
          normalizeValue(row[map.operacional], "number"),
          normalizeValue(row[map.financeiro], "number"),
          normalizeValue(row[map.osCampo], "number"),
          normalizeValue(row[map.opaSuite], "number"),
          normalizeValue(row[map.avaliacao], "score"),
          normalizeValue(row[map.tma], "time") || "00:00:00",
          normalizeValue(row[map.tmr], "time") || "00:00:00"
        ]
      : [
          name,
          normalizeValue(row[map.login], "number"),
          0,
          normalizeValue(row[map.osCampo], "number"),
          normalizeValue(row[map.externo], "number"),
          normalizeValue(row[map.interno], "number")
        ]);
  }

  return parsed;
}

function n1ColumnMap(header) {
  const map = { operacional: 1, financeiro: 2, osCampo: 3, opaSuite: 4, avaliacao: 5, tma: 6, tmr: 7 };
  header.forEach((cell, index) => {
    const label = normalizeText(cell);
    if (label.includes("REGISTROS OPERACIONAL")) map.operacional = index;
    if (label.includes("REGISTRO FINANCEIRO")) map.financeiro = index;
    if (label.includes("O.S ABERTA") || label.includes("OS ABERTA")) map.osCampo = index;
    if (label.includes("OPASUITE")) map.opaSuite = index;
    if (label.includes("AVALIACAO")) map.avaliacao = index;
    if (label.includes("TEMPO MEDIO") && label.includes("ATENDIMENTO")) map.tma = index;
    if (label.includes("TEMPO MEDIO") && label.includes("RESPOSTA")) map.tmr = index;
  });
  return map;
}

function n2ColumnMap(header) {
  const map = { externo: 1, interno: 2, osCampo: 3, login: 4 };
  header.forEach((cell, index) => {
    const label = normalizeText(cell);
    if (label.includes("EXTERNO")) map.externo = index;
    if (label.includes("INTERNO")) map.interno = index;
    if (label.includes("O.S ABERTA") || label.includes("OS ABERTA")) map.osCampo = index;
    if (label.includes("ATIVACAO") || label.includes("LOGIN")) map.login = index;
  });
  return map;
}

function defaultGoalsByWeek(teamKey) {
  return Object.fromEntries(WEEK_OPTIONS.map((week) => [week.key, { ...COLLABORATOR_GOALS[teamKey] }]));
}

function monthMetaFromSheet(sheetName, index) {
  const label = prettifyMonthLabel(sheetName);
  return {
    id: slug(label || sheetName || `mes-${index + 1}`),
    label: label || sheetName || `Mês ${index + 1}`,
    sortKey: sortKeyFromLabel(label || sheetName) || index
  };
}

function prettifyMonthLabel(value) {
  const normalized = normalizeText(value);
  const months = [
    ["JANEIRO", "Janeiro"], ["FEVEREIRO", "Fevereiro"], ["MARCO", "Marco"], ["ABRIL", "Abril"],
    ["MAIO", "Maio"], ["JUNHO", "Junho"], ["JULHO", "Julho"], ["AGOSTO", "Agosto"],
    ["SETEMBRO", "Setembro"], ["OUTUBRO", "Outubro"], ["NOVEMBRO", "Novembro"], ["DEZEMBRO", "Dezembro"]
  ];
  const month = months.find(([key]) => normalized.includes(key))?.[1] || String(value || "").trim();
  const year = normalized.match(/20\d{2}|25|26/)?.[0];
  return `${month}${year ? ` ${year.length === 2 ? `20${year}` : year}` : ""}`.trim();
}

function createDefaultMonth(shouldRender = true) {
  const id = ensureCurrentCalendarMonth();
  state.monthOrder = Array.from(new Set([...state.monthOrder, id]));
  state.currentMonth = id;
  if (shouldRender) render();
}

function ensureCurrentCalendarMonth(date = new Date()) {
  const meta = calendarMonthMeta(date);
  const existingId = state.monthOrder.find((monthId) => state.months[monthId]?.sortKey === meta.sortKey)
    || findMonthByLabel(meta.label)
    || findMonthByLabel(new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date));

  if (existingId) {
    state.currentMonth = existingId;
    sortMonthOrder();
    return existingId;
  }

  state.months[meta.id] = createEmptyMonth(meta.id, meta.label, meta.sortKey);
  state.monthOrder = Array.from(new Set([...state.monthOrder, meta.id]));
  sortMonthOrder();
  state.currentMonth = meta.id;
  return meta.id;
}

function calendarMonthMeta(date = new Date()) {
  const month = titleCase(new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(date));
  const year = date.getFullYear();
  const label = `${month} ${year}`;
  return {
    id: slug(label),
    label,
    sortKey: year * 100 + date.getMonth() + 1
  };
}

function sortMonthOrder() {
  state.monthOrder = Array.from(new Set(state.monthOrder.filter((monthId) => state.months[monthId])))
    .sort((a, b) => (state.months[a]?.sortKey || 0) - (state.months[b]?.sortKey || 0));
}

function createNewMonth() {
  syncCurrentInputs();
  const label = window.prompt("Nome do novo mês", "Junho 2026");
  if (!label) return;
  const id = uniqueMonthId(slug(label));
  state.months[id] = createEmptyMonth(id, label, sortKeyFromLabel(label));
  state.monthOrder = Array.from(new Set([...state.monthOrder, id]));
  state.currentMonth = id;
  ensureCollaboratorsForMonth(id);
  ensurePreviousMonthLatestWeekForMonth(id);
  render();
}

function createEmptyMonth(id, label, sortKey) {
  const periods = PERIODS.map((period) => ({ ...period }));
  return {
    id,
    label,
    sortKey,
    periods,
    values: Object.fromEntries(GENERAL_METRICS.map((metric) => [metric.key, emptyPeriodValues(periods)])),
    collaborators: {
      N1: emptyRowsByWeek(),
      N2: emptyRowsByWeek()
    }
  };
}

function emptyPeriodValues(periods = currentMonth().periods || PERIODS) {
  return Object.fromEntries(periods.map((period) => [period.key, ""]));
}

function emptyRowsByWeek() {
  return Object.fromEntries(WEEK_OPTIONS.map((week) => [week.key, []]));
}

function normalizeMonthStructure(month) {
  month.periods = Array.isArray(month.periods) && month.periods.length
    ? month.periods.map((period, index) => ({
        key: period.key || `p${index + 1}`,
        label: period.label || `Coluna ${index + 1}`,
        week: period.week || inferWeekFromPeriodLabel(period.label),
        startDate: period.startDate || "",
        endDate: period.endDate || ""
      }))
    : PERIODS.map((period) => ({ ...period, startDate: "", endDate: "" }));

  GENERAL_METRICS.forEach((metric) => {
    month.values[metric.key] ||= {};
    month.periods.forEach((period) => {
      if (month.values[metric.key][period.key] === undefined) {
        month.values[metric.key][period.key] = "";
      }
    });
  });

  month.collaborators ||= { N1: emptyRowsByWeek(), N2: emptyRowsByWeek() };
  month.collaborators.N1 ||= emptyRowsByWeek();
  month.collaborators.N2 ||= emptyRowsByWeek();
  normalizeCollaboratorTeam(month, "N1");
  normalizeCollaboratorTeam(month, "N2");
}

function normalizeCollaboratorTeam(month, teamKey) {
  const rowsByWeek = month.collaborators[teamKey];
  TEAM_WEEK_KEYS.forEach((weekKey) => {
    rowsByWeek[weekKey] = Array.isArray(rowsByWeek[weekKey])
      ? rowsByWeek[weekKey].map((row) => normalizeCollaboratorRow(teamKey, row))
      : [];
  });

  const masterRows = [];
  const seen = new Set();
  TEAM_WEEK_KEYS.forEach((weekKey) => {
    rowsByWeek[weekKey].forEach((row) => {
      if (!row._id) row._id = collaboratorIdFromName(teamKey, row.name);
      if (!row._id || seen.has(row._id)) return;
      seen.add(row._id);
      masterRows.push({ _id: row._id, name: row.name || "" });
    });
  });

  TEAM_WEEK_KEYS.forEach((weekKey) => {
    const currentById = new Map(rowsByWeek[weekKey].map((row) => [row._id, row]));
    rowsByWeek[weekKey] = masterRows.map((master) => {
      const current = currentById.get(master._id);
      return {
        ...createBlankCollaboratorRow(teamKey, master.name, master._id),
        ...(current || {}),
        _id: master._id,
        name: current?.name || master.name
      };
    });
  });
}

function ensureCollaboratorsForAllMonths() {
  sortMonthOrder();
  state.monthOrder.forEach((monthId) => ensureCollaboratorsForMonth(monthId));
}

function ensureCollaboratorsForMonth(monthId) {
  const target = state.months[monthId];
  if (!target) return false;
  normalizeMonthStructure(target);

  let changed = false;
  ["N1", "N2"].forEach((teamKey) => {
    if (monthHasTeamCollaborators(target, teamKey)) return;
    const source = findSourceMonthWithTeam(monthId, teamKey);
    if (!source) return;
    changed = copyCollaboratorRoster(target, source, teamKey) || changed;
  });

  if (changed) normalizeMonthStructure(target);
  return changed;
}

function monthHasTeamCollaborators(month, teamKey) {
  return Object.values(month?.collaborators?.[teamKey] || {}).some((rows) =>
    Array.isArray(rows) && rows.some((row) => String(row?.name || "").trim())
  );
}

function findSourceMonthWithTeam(targetId, teamKey) {
  const targetIndex = state.monthOrder.indexOf(targetId);
  const before = state.monthOrder.slice(0, Math.max(targetIndex, 0)).reverse();
  const after = state.monthOrder.slice(Math.max(targetIndex + 1, 0));
  const sourceId = [...before, ...after].find((monthId) => monthHasTeamCollaborators(state.months[monthId], teamKey));
  return sourceId ? state.months[sourceId] : null;
}

function copyCollaboratorRoster(target, source, teamKey) {
  normalizeMonthStructure(source);
  const roster = collaboratorRoster(source, teamKey);
  if (!roster.length) return false;

  let changed = false;
  TEAM_WEEK_KEYS.forEach((weekKey) => {
    target.collaborators[teamKey][weekKey] ||= [];
    const currentRows = target.collaborators[teamKey][weekKey];
    roster.forEach((person) => {
      if (findCollaboratorRow(currentRows, person)) return;
      currentRows.push(createBlankCollaboratorRow(teamKey, person.name, person._id));
      changed = true;
    });
  });

  return changed;
}

function collaboratorRoster(month, teamKey) {
  const seen = new Set();
  const roster = [];
  TEAM_WEEK_KEYS.forEach((weekKey) => {
    (month.collaborators?.[teamKey]?.[weekKey] || []).forEach((row) => {
      const name = String(row?.name || "").trim();
      if (!name) return;
      const id = row._id || collaboratorIdFromName(teamKey, name);
      const key = id || normalizeText(name);
      if (seen.has(key)) return;
      seen.add(key);
      roster.push({ _id: id, name });
    });
  });
  return roster;
}

function ensurePreviousMonthLatestWeekForAllMonths() {
  sortMonthOrder();
  state.monthOrder.forEach((monthId) => ensurePreviousMonthLatestWeekForMonth(monthId));
}

function ensurePreviousMonthLatestWeekForMonth(monthId) {
  const target = state.months[monthId];
  const source = previousMonthForId(monthId);
  if (!target || !source) return false;
  normalizeMonthStructure(target);
  normalizeMonthStructure(source);

  const targetPeriods = target.periods.filter(isCarryPeriod);
  const sourcePeriod = latestFilledWeeklyPeriod(source);
  if (!targetPeriods.length || !sourcePeriod) return false;

  let changed = false;
  targetPeriods.forEach((targetPeriod) => {
    GENERAL_METRICS.forEach((metric) => {
      target.values[metric.key] ||= {};
      source.values[metric.key] ||= {};
      const current = target.values[metric.key][targetPeriod.key];
      const previous = source.values[metric.key][sourcePeriod.key];
      if (isBlank(current) && !isBlank(previous)) {
        target.values[metric.key][targetPeriod.key] = previous;
        changed = true;
      }
    });
  });

  ["N1", "N2"].forEach((teamKey) => {
    const sourceWeek = sourcePeriod.week && sourcePeriod.week !== "mensal" && sourcePeriod.week !== "ultima"
      ? sourcePeriod.week
      : latestFilledCollaboratorWeek(source, teamKey);
    if (!sourceWeek) return;
    changed = mergeCollaboratorWeek(target, source, teamKey, "ultima", sourceWeek) || changed;
  });

  if (changed) normalizeMonthStructure(target);
  return changed;
}

function previousMonthForId(monthId) {
  const index = state.monthOrder.indexOf(monthId);
  if (index <= 0) return null;
  return state.months[state.monthOrder[index - 1]] || null;
}

function isCarryPeriod(period) {
  const label = normalizeText(period?.label || "");
  return period?.week === "ultima" || label.includes("ULTIMA");
}

function latestFilledWeeklyPeriod(month) {
  const weeklyPeriods = (month?.periods || []).filter((period) => {
    const label = normalizeText(period.label);
    return !label.includes("ULTIMA") && !label.includes("MENSAL") && period.week !== "mensal" && period.week !== "ultima";
  });

  return [...weeklyPeriods].reverse().find((period) =>
    GENERAL_METRICS.some((metric) => !isBlank(month.values?.[metric.key]?.[period.key]))
  ) || weeklyPeriods.at(-1) || null;
}

function latestFilledCollaboratorWeek(month, teamKey) {
  return ["s4", "s3", "s2", "s1"].find((weekKey) =>
    (month.collaborators?.[teamKey]?.[weekKey] || []).some((row) => String(row?.name || "").trim())
  ) || "";
}

function mergeCollaboratorWeek(target, source, teamKey, targetWeek, sourceWeek) {
  const sourceRows = source.collaborators?.[teamKey]?.[sourceWeek] || [];
  if (!sourceRows.length) return false;

  target.collaborators[teamKey][targetWeek] ||= [];
  const targetRows = target.collaborators[teamKey][targetWeek];
  let changed = false;

  sourceRows.forEach((sourceRow) => {
    const row = findCollaboratorRow(targetRows, sourceRow);
    if (!row) {
      targetRows.push(cloneData(sourceRow));
      changed = true;
      return;
    }

    Object.entries(sourceRow).forEach(([key, value]) => {
      if (key === "_id") return;
      if (isBlank(row[key]) && !isBlank(value)) {
        row[key] = value;
        changed = true;
      }
    });
  });

  return changed;
}

function normalizeCollaboratorRow(teamKey, row = {}) {
  const normalized = {
    ...createBlankCollaboratorRow(teamKey, row.name || "", row._id || collaboratorIdFromName(teamKey, row.name)),
    ...row
  };
  normalized._id ||= collaboratorIdFromName(teamKey, normalized.name);
  if (teamKey === "N1") normalized.avaliacao = normalizeValue(normalized.avaliacao, "score");
  return normalized;
}

function createBlankCollaboratorRow(teamKey, name = "", id = createRowId(teamKey)) {
  return teamKey === "N1"
    ? { _id: id, name, operacional: "", financeiro: "", osCampo: "", opaSuite: "", avaliacao: "", tma: "", tmr: "" }
    : { _id: id, name, externo: "", interno: "", osCampo: "", login: "" };
}

function collaboratorIdFromName(teamKey, name) {
  const normalized = slug(normalizeText(name || ""));
  return normalized ? `${teamKey}-${normalized}` : createRowId(teamKey);
}

function createRowId(teamKey) {
  return `${teamKey}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function addPeriodColumn() {
  const month = currentMonth();
  normalizeMonthStructure(month);
  const label = window.prompt("Nome da nova coluna", "Mensal");
  if (!label) return;
  const key = nextPeriodKey(month.periods);
  month.periods.push({ key, label, week: inferWeekFromPeriodLabel(label), startDate: "", endDate: "" });
  GENERAL_METRICS.forEach((metric) => {
    month.values[metric.key] ||= {};
    month.values[metric.key][key] = "";
  });
  renderGeneralBody();
}

function removeLastPeriodColumn() {
  const month = currentMonth();
  normalizeMonthStructure(month);
  if (month.periods.length <= 1) {
    setStatus("Mantenha pelo menos uma coluna de indicadores.", "error");
    return;
  }

  const removed = month.periods.pop();
  GENERAL_METRICS.forEach((metric) => {
    delete month.values[metric.key]?.[removed.key];
  });
  renderGeneralBody();
  setStatus(`Coluna ${removed.label} removida. Salve para sincronizar.`, "success");
}

function nextPeriodKey(periods) {
  let index = periods.length + 1;
  while (periods.some((period) => period.key === `p${index}`)) index += 1;
  return `p${index}`;
}

function inferWeekFromPeriodLabel(label) {
  const normalized = normalizeText(label);
  if (normalized.includes("ULTIMA")) return "ultima";
  if (normalized.includes("1")) return "s1";
  if (normalized.includes("2")) return "s2";
  if (normalized.includes("3")) return "s3";
  if (normalized.includes("4")) return "s4";
  if (normalized.includes("MENSAL")) return "mensal";
  return "";
}

function periodDisplayLabel(period) {
  const range = dateRangeLabel(period);
  return range ? `${period.label} ${range}` : period.label;
}

function dateRangeLabel(period) {
  if (!period?.startDate && !period?.endDate) return "";
  const start = formatInputDate(period.startDate);
  const end = formatInputDate(period.endDate);
  if (start && end) return `(${start} a ${end})`;
  return `(${start || end})`;
}

function formatInputDate(value) {
  if (!value) return "";
  const [year, month, day] = String(value).split("-");
  if (!year || !month || !day) return "";
  return `${day}/${month}`;
}

function render() {
  renderMonthOptions();
  renderMonthInputs();
  renderWeekOptions();
  renderGeneralBody();
  renderCollaborators();
}

function renderTeamHeaders() {
  els.generalHead.innerHTML = `
    <tr>
      <th>Métrica Matriz</th>
      ${PERIODS.map((period) => `<th>${period.label}</th>`).join("")}
    </tr>
  `;
  els.n1Head.innerHTML = headerMarkup(N1_COLUMNS);
  els.n2Head.innerHTML = headerMarkup(N2_COLUMNS);
}

function headerMarkup(columns) {
  return `
    <tr>
      ${columns.map((column) => `<th>${column.label}</th>`).join("")}
      <th class="row-actions">Ações</th>
    </tr>
  `;
}

function renderMonthOptions() {
  els.monthSelect.innerHTML = state.monthOrder
    .map((monthId) => `<option value="${monthId}">${escapeHtml(state.months[monthId].label)}</option>`)
    .join("");
  els.monthSelect.value = state.currentMonth;
}

function renderMonthInputs() {
  const month = currentMonth();
  els.monthLabel.value = month.label || "";
  els.monthKey.value = month.id || "";
}

function renderWeekOptions() {
  const month = currentMonth();
  els.weekSelect.innerHTML = WEEK_OPTIONS
    .map((week) => `<option value="${week.key}">${weekOptionLabel(week, month)}</option>`)
    .join("");
  els.weekSelect.value = state.currentWeek;
}

function weekOptionLabel(week, month) {
  const period = month.periods?.find((item) => item.week === week.key);
  const range = dateRangeLabel(period);
  return range ? `${week.label} (${range})` : week.label;
}

function renderGeneralBody() {
  const month = currentMonth();
  normalizeMonthStructure(month);
  els.generalHead.innerHTML = `
    <tr>
      <th>Métrica Matriz</th>
      ${month.periods.map((period) => `
        <th>
          <div class="period-header-fields">
            <input
              class="period-label-input"
              value="${escapeHtml(period.label)}"
              data-period-label="${period.key}"
              aria-label="Nome da coluna ${escapeHtml(period.label)}"
            />
            <div class="period-date-row">
              <input
                type="date"
                value="${escapeHtml(period.startDate || "")}"
                data-period-start="${period.key}"
                aria-label="Data inicial de ${escapeHtml(period.label)}"
              />
              <input
                type="date"
                value="${escapeHtml(period.endDate || "")}"
                data-period-end="${period.key}"
                aria-label="Data final de ${escapeHtml(period.label)}"
              />
            </div>
          </div>
        </th>
      `).join("")}
    </tr>
  `;

  els.generalBody.innerHTML = GENERAL_METRICS.map((metric) => `
    <tr>
      <td class="metric-name">${metric.label}</td>
      ${month.periods.map((period) => `
        <td>
          <input
            value="${escapeHtml(month.values[metric.key]?.[period.key] ?? "")}"
            data-general-metric="${metric.key}"
            data-period="${period.key}"
            inputmode="decimal"
          />
        </td>
      `).join("")}
    </tr>
  `).join("");

  els.generalHead.querySelectorAll("[data-period-label]").forEach((input) => {
    input.addEventListener("input", () => {
      const period = month.periods.find((item) => item.key === input.dataset.periodLabel);
      if (!period) return;
      period.label = input.value;
      period.week = inferWeekFromPeriodLabel(input.value);
    });
  });

  els.generalHead.querySelectorAll("[data-period-start]").forEach((input) => {
    input.addEventListener("input", () => {
      const period = month.periods.find((item) => item.key === input.dataset.periodStart);
      if (period) period.startDate = input.value;
    });
  });

  els.generalHead.querySelectorAll("[data-period-end]").forEach((input) => {
    input.addEventListener("input", () => {
      const period = month.periods.find((item) => item.key === input.dataset.periodEnd);
      if (period) period.endDate = input.value;
    });
  });

  els.generalBody.querySelectorAll("[data-general-metric]").forEach((input) => {
    input.addEventListener("input", () => {
      const metric = input.dataset.generalMetric;
      const period = input.dataset.period;
      month.values[metric] ||= emptyPeriodValues(month.periods);
      month.values[metric][period] = input.value;
      if (metric === "totalClientes") {
        calculateGeneralFromCollaborators();
        syncGeneralInputsFromState();
      }
    });
  });
}

function renderCollaborators() {
  renderTeam("N1", N1_COLUMNS, els.n1Body, els.n1Foot, els.n1Summary);
  renderTeam("N2", N2_COLUMNS, els.n2Body, els.n2Foot, els.n2Summary);
}

function renderTeam(teamKey, columns, body, foot, summary) {
  const rows = collaboratorRows(teamKey);
  body.innerHTML = rows.map((row, index) => `
    <tr>
      ${columns.map((column) => `
        <td class="${column.key === "name" ? "collaborator-name" : ""}">
          <input
            type="text"
            value="${escapeHtml(row[column.key] ?? "")}"
            data-team="${teamKey}"
            data-row="${index}"
            data-column="${column.key}"
          />
        </td>
      `).join("")}
      <td class="row-actions">
        <button class="danger" type="button" data-remove-row="${index}" data-remove-id="${escapeHtml(row._id || "")}" data-remove-team="${teamKey}">Remover</button>
      </td>
    </tr>
  `).join("");

  body.querySelectorAll("[data-team]").forEach((input) => {
    input.addEventListener("input", () => {
      const row = collaboratorRows(input.dataset.team)[Number(input.dataset.row)];
      if (!row) return;
      row[input.dataset.column] = input.value;
      if (input.dataset.column === "name") {
        syncCollaboratorName(input.dataset.team, row._id, input.value);
      }
      renderTeamFooters();
      calculateGeneralFromCollaborators();
      syncGeneralInputsFromState();
    });
  });

  body.querySelectorAll("[data-remove-row]").forEach((button) => {
    button.addEventListener("click", () => {
      removeCollaborator(button.dataset.removeTeam, button.dataset.removeId, Number(button.dataset.removeRow));
      calculateGeneralFromCollaborators();
      renderCollaborators();
      syncGeneralInputsFromState();
    });
  });

  summary.textContent = `${rows.length} colaborador(es)`;
  foot.innerHTML = footerMarkup(teamKey, columns, rows);
}

function renderTeamFooters() {
  els.n1Foot.innerHTML = footerMarkup("N1", N1_COLUMNS, collaboratorRows("N1"));
  els.n2Foot.innerHTML = footerMarkup("N2", N2_COLUMNS, collaboratorRows("N2"));
}

function footerMarkup(teamKey, columns, rows) {
  const totals = teamTotals(teamKey, rows);
  return `
    <tr>
      ${columns.map((column) => `<td>${column.key === "name" ? "TOTAL / MÉDIA" : escapeHtml(totals[column.key] ?? "")}</td>`).join("")}
      <td></td>
    </tr>
  `;
}

function addCollaborator(teamKey) {
  const month = currentMonth();
  normalizeMonthStructure(month);
  const row = createBlankCollaboratorRow(teamKey);
  TEAM_WEEK_KEYS.forEach((weekKey) => {
    month.collaborators[teamKey][weekKey].push({ ...row });
  });
  calculateGeneralFromCollaborators();
  renderCollaborators();
  syncGeneralInputsFromState();
}

function syncCollaboratorName(teamKey, rowId, name) {
  if (!rowId) return;
  const rowsByWeek = currentMonth().collaborators[teamKey];
  TEAM_WEEK_KEYS.forEach((weekKey) => {
    const row = rowsByWeek[weekKey]?.find((item) => item._id === rowId);
    if (row) row.name = name;
  });
}

function removeCollaborator(teamKey, rowId, rowIndex) {
  const rowsByWeek = currentMonth().collaborators[teamKey];
  TEAM_WEEK_KEYS.forEach((weekKey) => {
    const rows = rowsByWeek[weekKey] || [];
    const index = rowId ? rows.findIndex((row) => row._id === rowId) : rowIndex;
    if (index >= 0) rows.splice(index, 1);
  });
}

function calculateGeneralFromCollaborators() {
  const month = currentMonth();
  normalizeMonthStructure(month);
  month.periods.forEach((period) => {
    const n1 = rowsForPeriod(month, "N1", period);
    const n2 = rowsForPeriod(month, "N2", period);
    const operacional = sumRowKeys(n1, ["operacional"]);
    const financeiro = sumRowKeys(n1, ["financeiro"]);
    const campo = sumRowKeys(n1, ["osCampo"]);
    const solucionados = addNumericValues(operacional, financeiro);
    const realizados = addNumericValues(operacional, financeiro, campo);
    const totalClientes = parseQuantityNumber(month.values.totalClientes?.[period.key]);

    setGeneralValue("tmaOpa", period.key, averageTime(n1.map((row) => row.tma)));
    setGeneralValue("tmrClienteOpa", period.key, averageTime(n1.map((row) => row.tmr)));
    setGeneralValue("avaliacaoOpa", period.key, averageScore(n1.map((row) => row.avaliacao), 2));
    setGeneralValue("equipeN2", period.key, sumRowKeys(n2, ["externo", "interno", "osCampo", "login"]));
    setGeneralValue("campoIxc", period.key, campo);
    setGeneralValue("solucionadosIxc", period.key, solucionados);
    setGeneralValue("realizadosIxc", period.key, realizados);
    setGeneralValue("taxaContato", period.key, formatContactRate(realizados, totalClientes));
  });
}

function rowsForPeriod(month, teamKey, period) {
  if (period.week === "mensal") {
    return ["s1", "s2", "s3", "s4"].flatMap((week) => month.collaborators[teamKey][week] || []);
  }
  return month.collaborators[teamKey][period.week] || [];
}

function setGeneralValue(metric, period, value) {
  currentMonth().values[metric] ||= emptyPeriodValues(currentMonth().periods);
  currentMonth().values[metric][period] = value === undefined || value === null ? "" : value;
}

function syncGeneralInputsFromState() {
  const month = currentMonth();
  els.generalBody.querySelectorAll("[data-general-metric]").forEach((input) => {
    input.value = month.values[input.dataset.generalMetric]?.[input.dataset.period] ?? "";
  });
}

async function saveData() {
  syncCurrentInputs();
  ensureCollaboratorsForAllMonths();
  ensurePreviousMonthLatestWeekForAllMonths();
  const manualData = normalizedManualData();
  const generalWorkbook = buildGeneralWorkbook(manualData);
  const collaboratorWorkbook = buildCollaboratorWorkbook(manualData);

  try {
    setBusy(true);
    await window.SGPAuth.saveManualIndicators({
      manualData,
      generalWorkbook,
      collaboratorWorkbook,
      sourceName: "Lançamentos manuais SGP"
    });
    setLocalCopies(generalWorkbook, collaboratorWorkbook);
    setStatus("Lançamentos salvos. Indicadores Gerais e Colaboradores já podem usar estes dados.", "success");
  } catch (error) {
    console.error(error);
    setStatus(error.message || "Não foi possível salvar os lançamentos.", "error");
  } finally {
    setBusy(false);
  }
}

function normalizedManualData() {
  const month = currentMonth();
  const previousId = state.currentMonth;
  const id = uniqueMonthId(slug(month.id || month.label), previousId);
  if (id !== previousId) {
    delete state.months[previousId];
    month.id = id;
    state.months[id] = month;
    state.currentMonth = id;
  } else {
    month.id = id;
  }

  month.label = month.label || titleCase(id.replace(/-/g, " "));
  month.sortKey = sortKeyFromLabel(month.label);
  Object.values(state.months).forEach(normalizeMonthStructure);
  state.monthOrder = Array.from(new Set(state.monthOrder.map((monthId) => state.months[monthId]?.id).filter(Boolean)))
    .sort((a, b) => (state.months[a]?.sortKey || 0) - (state.months[b]?.sortKey || 0));

  return {
    version: 1,
    months: state.months,
    monthOrder: state.monthOrder
  };
}

function buildGeneralWorkbook(manualData) {
  const months = {};
  manualData.monthOrder.forEach((monthId) => {
    const month = manualData.months[monthId];
    normalizeMonthStructure(month);
    months[monthId] = {
      id: monthId,
      label: month.label,
      sortKey: month.sortKey,
      sourceSheet: "Lançamento manual",
      periods: month.periods.map((period) => ({
        key: period.key,
        label: periodDisplayLabel(period),
        startDate: period.startDate || "",
        endDate: period.endDate || ""
      })),
      metrics: GENERAL_METRICS.map((metric) => ({
        name: metric.label,
        type: metric.type,
        values: Object.fromEntries(month.periods.map((period) => [period.key, normalizeValue(month.values[metric.key]?.[period.key], metric.type)])),
        matched: true
      }))
    };
  });
  return { months, monthOrder: manualData.monthOrder };
}

function buildCollaboratorWorkbook(manualData) {
  const months = {};
  manualData.monthOrder.forEach((monthId) => {
    const month = manualData.months[monthId];
    months[monthId] = {
      id: monthId,
      label: month.label,
      sortKey: month.sortKey,
      sourceName: "Lançamento manual",
      teams: {
        N1: {
          rowsByWeek: Object.fromEntries(WEEK_OPTIONS.map((week) => [week.key, (month.collaborators.N1[week.key] || []).map(n1Row)])),
          goalsByWeek: Object.fromEntries(WEEK_OPTIONS.map((week) => [week.key, COLLABORATOR_GOALS.N1]))
        },
        N2: {
          rowsByWeek: Object.fromEntries(WEEK_OPTIONS.map((week) => [week.key, (month.collaborators.N2[week.key] || []).map(n2Row)])),
          goalsByWeek: Object.fromEntries(WEEK_OPTIONS.map((week) => [week.key, COLLABORATOR_GOALS.N2]))
        }
      }
    };
  });
  return { version: 5, months, monthOrder: manualData.monthOrder };
}

function n1Row(row) {
  return [
    row.name || "",
    normalizeValue(row.operacional, "number"),
    normalizeValue(row.financeiro, "number"),
    normalizeValue(row.osCampo, "number"),
    normalizeValue(row.opaSuite, "number"),
    normalizeValue(row.avaliacao, "score"),
    normalizeValue(row.tma, "time") || "00:00:00",
    normalizeValue(row.tmr, "time") || "00:00:00"
  ];
}

function n2Row(row) {
  return [
    row.name || "",
    normalizeValue(row.login, "number"),
    0,
    normalizeValue(row.osCampo, "number"),
    normalizeValue(row.externo, "number"),
    normalizeValue(row.interno, "number")
  ];
}

function setLocalCopies(generalWorkbook, collaboratorWorkbook) {
  const importedAt = new Date().toLocaleString("pt-BR");
  localStorage.setItem("indicadoresGeneralWorkbookV2", JSON.stringify(generalWorkbook));
  localStorage.setItem("indicadoresGeneralWorkbookName", "Lançamentos manuais SGP");
  localStorage.setItem("indicadoresGeneralImportedAt", importedAt);
  localStorage.setItem("indicadoresCollaboratorWorkbookV1", JSON.stringify(collaboratorWorkbook));
  sessionStorage.setItem("indicadoresCollaboratorWorkbookV1", JSON.stringify(collaboratorWorkbook));
  localStorage.setItem("indicadoresWorkbookName", "Lançamentos manuais SGP");
  localStorage.setItem("indicadoresImportedAt", importedAt);
  sessionStorage.setItem("indicadoresWorkbookName", "Lançamentos manuais SGP");
  sessionStorage.setItem("indicadoresImportedAt", importedAt);
}

function currentMonth() {
  if (!state.currentMonth || !state.months[state.currentMonth]) createDefaultMonth(false);
  return state.months[state.currentMonth];
}

function collaboratorRows(teamKey) {
  const month = currentMonth();
  normalizeMonthStructure(month);
  month.collaborators[teamKey][state.currentWeek] ||= [];
  return month.collaborators[teamKey][state.currentWeek];
}

function syncCurrentInputs() {
  const month = currentMonth();
  month.label = els.monthLabel.value.trim() || month.label;
  month.id = slug(els.monthKey.value || month.id || month.label);
}

function teamTotals(teamKey, rows) {
  if (teamKey === "N1") {
    return {
      operacional: sumRows(rows, "operacional"),
      financeiro: sumRows(rows, "financeiro"),
      osCampo: sumRows(rows, "osCampo"),
      opaSuite: sumRows(rows, "opaSuite"),
      avaliacao: averageScore(rows.map((row) => row.avaliacao), 2),
      tma: averageTime(rows.map((row) => row.tma)),
      tmr: averageTime(rows.map((row) => row.tmr))
    };
  }
  return {
    externo: sumRows(rows, "externo"),
    interno: sumRows(rows, "interno"),
    osCampo: sumRows(rows, "osCampo"),
    login: sumRows(rows, "login")
  };
}

function sumRows(rows, key) {
  return rows.reduce((total, row) => {
    const value = parseNumber(row[key]);
    return Number.isFinite(value) ? total + value : total;
  }, 0);
}

function sumRowKeys(rows, keys) {
  let total = 0;
  let hasValue = false;
  rows.forEach((row) => {
    keys.forEach((key) => {
      const value = parseNumber(row[key]);
      if (!Number.isFinite(value)) return;
      total += value;
      hasValue = true;
    });
  });
  return hasValue ? total : "";
}

function addNumericValues(...values) {
  let total = 0;
  let hasValue = false;
  values.forEach((value) => {
    const number = parseNumber(value);
    if (!Number.isFinite(number)) return;
    total += number;
    hasValue = true;
  });
  return hasValue ? total : "";
}

function formatContactRate(realizados, totalClientes) {
  const numerator = parseNumber(realizados);
  if (!Number.isFinite(numerator) || !Number.isFinite(totalClientes) || totalClientes <= 0) return "";
  return `${((numerator / totalClientes) * 100).toFixed(2).replace(".", ",")}%`;
}

function averageNumber(values, digits = 0) {
  const numbers = values.map(parseNumber).filter(Number.isFinite);
  if (!numbers.length) return "";
  const average = numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
  return digits ? average.toFixed(digits) : Math.round(average);
}

function averageScore(values, digits = 0) {
  const numbers = values.map(normalizeScoreValue).filter(Number.isFinite);
  if (!numbers.length) return "";
  const average = numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
  return digits ? average.toFixed(digits) : Math.round(average);
}

function averageTime(values) {
  const seconds = values.map(timeToSeconds).filter((value) => Number.isFinite(value) && value > 0);
  if (!seconds.length) return "";
  return secondsToTime(Math.round(seconds.reduce((sum, value) => sum + value, 0) / seconds.length));
}

function normalizeValue(value, type) {
  if (type === "time") return normalizeTime(value);
  if (type === "percent") {
    const number = parseNumber(String(value).replace("%", ""));
    if (!Number.isFinite(number)) return "";
    return number > 1 ? number / 100 : number;
  }
  const number = parseNumber(value);
  if (type === "score") return normalizeScoreNumber(number);
  return Number.isFinite(number) ? number : "";
}

function normalizeScoreValue(value) {
  return normalizeScoreNumber(parseNumber(value));
}

function normalizeScoreNumber(number) {
  if (!Number.isFinite(number)) return "";
  let score = number;
  if (score > 10 && score <= 100) score /= 20;
  else if (score > 5) score /= 2;
  return Math.min(Math.max(score, 0), 5);
}

function displayValue(value, type) {
  if (value === "" || value === null || value === undefined || Number.isNaN(value)) return "";
  if (type === "time") return normalizeTime(value) || String(value);
  if (type === "percent") {
    const number = Number(value);
    if (!Number.isFinite(number)) return String(value);
    return number <= 1 ? `${(number * 100).toFixed(2).replace(".", ",")}%` : String(value);
  }
  return String(value).replace(".", ",");
}

function parseNumber(value) {
  const text = String(value ?? "").trim();
  if (!text || text === "-") return NaN;
  const comma = text.lastIndexOf(",");
  const dot = text.lastIndexOf(".");
  let normalized = text.replace(/[^\d,.-]/g, "");
  if (comma > dot) normalized = normalized.replace(/\./g, "").replace(",", ".");
  if (dot > comma && comma !== -1) normalized = normalized.replace(/,/g, "");
  return Number(normalized);
}

function parseQuantityNumber(value) {
  const text = String(value ?? "").trim();
  if (!text || text === "-") return NaN;
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(text)) {
    return Number(text.replace(/\./g, "").replace(",", "."));
  }
  return parseNumber(text);
}

function normalizeTime(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (/^\d{1,3}:\d{2}(:\d{2})?$/.test(text)) {
    const parts = text.split(":").map(Number);
    const full = parts.length === 2 ? [0, parts[0], parts[1]] : parts;
    return full.map((part) => String(part || 0).padStart(2, "0")).join(":");
  }
  return "";
}

function timeToSeconds(value) {
  const time = normalizeTime(value);
  if (!time) return NaN;
  const [hours, minutes, seconds] = time.split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}

function secondsToTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

function uniqueMonthId(base, current = "") {
  const fallback = base || "mes-manual";
  if (fallback === current || !state.months[fallback]) return fallback;
  let index = 2;
  while (state.months[`${fallback}-${index}`]) index += 1;
  return `${fallback}-${index}`;
}

function sortKeyFromLabel(label) {
  const normalized = normalizeText(label);
  const yearMatch = normalized.match(/20\d{2}/);
  const year = yearMatch ? Number(yearMatch[0]) : new Date().getFullYear();
  const month = [
    "JANEIRO", "FEVEREIRO", "MARCO", "ABRIL", "MAIO", "JUNHO",
    "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"
  ].findIndex((item) => normalized.includes(item)) + 1;
  return year * 100 + (month || 1);
}

function slug(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function titleCase(value) {
  return String(value || "").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function setBusy(busy) {
  document.querySelectorAll("input, select, button").forEach((element) => {
    element.disabled = busy;
  });
}

function setStatus(message, type = "info") {
  els.status.textContent = message;
  els.status.dataset.type = type;
}

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
