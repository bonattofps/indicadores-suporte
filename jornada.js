const state = {
  workbook: null,
  scaleSheets: [],
  currentMonth: null,
  currentData: null,
  selectedEmployee: null,
  teamFilter: "all",
  expandedSummary: null,
  sortAscending: true
};

const GOOGLE_SHEETS_JORNADA_XLSX_URL = "https://docs.google.com/spreadsheets/d/17QoDe9GbP07OtEOD1Vq8gRCU-SVBctX6FJH3oGRpkOE/export?format=xlsx";
const GOOGLE_SHEETS_JORNADA_NAME = "Google Sheets - Jornadas do Suporte";

const elements = {
  workbookInput: document.getElementById("workbookInput"),
  monthSelect: document.getElementById("monthSelect"),
  collaboratorInput: document.getElementById("collaboratorInput"),
  collaboratorOptions: document.getElementById("collaboratorOptions"),
  teamSelect: document.getElementById("teamSelect"),
  clearFilters: document.getElementById("clearFilters"),
  statusMessage: document.getElementById("statusMessage"),
  themeToggle: document.getElementById("themeToggle"),
  profileCard: document.getElementById("profileCard"),
  breaksList: document.getElementById("breaksList"),
  sectorList: document.getElementById("sectorList"),
  calendarSubtitle: document.getElementById("calendarSubtitle"),
  calendarGrid: document.getElementById("calendarGrid"),
  detailsTableBody: document.getElementById("detailsTableBody"),
  sortDateButton: document.getElementById("sortDateButton"),
  totals: {
    work: document.getElementById("totalWork"),
    off: document.getElementById("totalOff"),
    onCall: document.getElementById("totalOnCall"),
    vacation: document.getElementById("totalVacation"),
    noSchedule: document.getElementById("totalNoSchedule"),
    notes: document.getElementById("totalNotes")
  }
};

const STATUS = {
  WORK: { key: "work", label: "Trabalho normal" },
  OFF: { key: "off", label: "Folga" },
  ON_CALL: { key: "on-call", label: "Plantão" },
  VACATION: { key: "vacation", label: "Férias" },
  NO_SCHEDULE: { key: "no-schedule", label: "Sem escala" },
  NOTE: { key: "note", label: "Observação" }
};

const MONTHS = [
  { normalized: "JANEIRO", label: "Janeiro", index: 0 },
  { normalized: "FEVEREIRO", label: "Fevereiro", index: 1 },
  { normalized: "MARCO", label: "Março", index: 2 },
  { normalized: "ABRIL", label: "Abril", index: 3 },
  { normalized: "MAIO", label: "Maio", index: 4 },
  { normalized: "JUNHO", label: "Junho", index: 5 },
  { normalized: "JULHO", label: "Julho", index: 6 },
  { normalized: "AGOSTO", label: "Agosto", index: 7 },
  { normalized: "SETEMBRO", label: "Setembro", index: 8 },
  { normalized: "OUTUBRO", label: "Outubro", index: 9 },
  { normalized: "NOVEMBRO", label: "Novembro", index: 10 },
  { normalized: "DEZEMBRO", label: "Dezembro", index: 11 }
];

const WEEKDAYS = {
  DOM: "Domingo",
  DOMINGO: "Domingo",
  SEG: "Segunda",
  SEGUNDA: "Segunda",
  TER: "Terça",
  TERCA: "Terça",
  TERC: "Terça",
  QUA: "Quarta",
  QUARTA: "Quarta",
  QUI: "Quinta",
  QUINTA: "Quinta",
  SEX: "Sexta",
  SEXTA: "Sexta",
  SAB: "Sábado",
  SABADO: "Sábado"
};

init();

function init() {
  applySavedTheme();
  resetVisuals();
  bindEvents();
  loadGoogleSheetsWorkbook();
}

function bindEvents() {
  elements.workbookInput.addEventListener("change", handleWorkbookUpload);
  elements.monthSelect.addEventListener("change", handleMonthChange);
  elements.teamSelect.addEventListener("change", handleTeamChange);
  elements.collaboratorInput.addEventListener("input", handleCollaboratorInput);
  elements.collaboratorInput.addEventListener("change", handleCollaboratorInput);
  elements.clearFilters.addEventListener("click", clearFilters);
  elements.themeToggle.addEventListener("click", toggleTheme);
  elements.sortDateButton.addEventListener("click", toggleDateSort);
  elements.detailsTableBody.addEventListener("click", handleSummaryChipClick);
}

async function handleWorkbookUpload(event) {
  const file = event.target.files?.[0];

  if (!file) {
    setMessage("Carregue a planilha para iniciar a consulta.", "info");
    return;
  }

  if (!/\.xlsx?$/i.test(file.name)) {
    setMessage("Selecione um arquivo Excel válido no formato .xlsx ou .xls.", "error");
    return;
  }

  try {
    const buffer = await file.arrayBuffer();
    applyWorkbookBuffer(buffer, "Planilha carregada com sucesso. Selecione o mes para consultar a escala.");
  } catch (error) {
    console.error(error);
    resetAfterWorkbookFailure();
    setMessage("Erro ao processar o arquivo. Verifique a planilha e tente novamente.", "error");
  }
}

async function loadGoogleSheetsWorkbook() {
  setMessage("Carregando jornadas pelo Google Sheets...", "info");

  try {
    const response = await fetch(GOOGLE_SHEETS_JORNADA_XLSX_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`Google Sheets retornou ${response.status}.`);
    const buffer = await response.arrayBuffer();
    applyWorkbookBuffer(buffer, `${GOOGLE_SHEETS_JORNADA_NAME} carregado automaticamente. Selecione o mes para consultar a escala.`);
  } catch (error) {
    console.error(error);
    setMessage("Nao foi possivel carregar o Google Sheets. Carregue a planilha manualmente ou publique/compartilhe a planilha de Jornadas.", "warning");
  }
}

function applyWorkbookBuffer(buffer, successMessage) {
  state.workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  state.scaleSheets = state.workbook.SheetNames
    .filter((name) => normalize(name).startsWith("ESCALA"))
    .map((sheetName) => ({
      sheetName,
      displayName: formatSheetName(sheetName)
    }));

  if (!state.scaleSheets.length) {
    resetAfterWorkbookFailure();
    setMessage("Aba de escala nao encontrada. Verifique se ha abas iniciando com ESCALA.", "error");
    return;
  }

  populateMonthSelect();
  clearSelectedMonth();
  elements.monthSelect.disabled = false;
  setMessage(successMessage, "success");
}

function handleMonthChange() {
  const sheetName = elements.monthSelect.value;
  state.expandedSummary = null;
  clearEmployeeSelection();
  resetVisuals();

  if (!state.workbook) {
    setMessage("Carregue a planilha para iniciar a consulta.", "warning");
    return;
  }

  if (!sheetName) {
    setMessage("Selecione um mês para carregar os colaboradores.", "warning");
    return;
  }

  const worksheet = state.workbook.Sheets[sheetName];
  if (!worksheet) {
    setMessage("Aba de escala não encontrada.", "error");
    return;
  }

  try {
    const rows = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      blankrows: false,
      defval: "",
      raw: false
    });

    const parsed = parseScaleSheet(rows, sheetName);
    state.currentMonth = state.scaleSheets.find((sheet) => sheet.sheetName === sheetName);
    state.currentData = parsed;
    state.teamFilter = "all";
    elements.teamSelect.value = "all";
    elements.teamSelect.disabled = false;

    populateCollaboratorOptions(getFilteredEmployees());
    state.sortAscending = true;
    renderGeneralTable(getFilteredEmployees());
    setMessage("Selecione um colaborador para visualizar a escala.", "info");
  } catch (error) {
    console.error(error);
    state.currentData = null;
    elements.collaboratorInput.disabled = true;
    elements.collaboratorInput.placeholder = "Estrutura inválida";
    setMessage(error.message || "Não foi possível identificar a estrutura da aba selecionada.", "error");
  }
}

function handleTeamChange() {
  state.teamFilter = elements.teamSelect.value || "all";
  state.selectedEmployee = null;
  state.expandedSummary = null;
  elements.collaboratorInput.value = "";

  if (!state.currentData) {
    setMessage("Selecione um mês para carregar os colaboradores.", "warning");
    return;
  }

  const employees = getFilteredEmployees();
  populateCollaboratorOptions(employees);
  resetEmployeePanels();
  renderGeneralTable(employees);
  setMessage("Selecione um colaborador para visualizar a escala.", "info");
}

function handleCollaboratorInput() {
  const search = normalize(elements.collaboratorInput.value);

  if (!state.currentData) {
    setMessage("Selecione um mês para carregar os colaboradores.", "warning");
    return;
  }

  if (!search) {
    state.selectedEmployee = null;
    resetEmployeePanels();
    renderGeneralTable(getFilteredEmployees());
    setMessage("Selecione um colaborador para visualizar a jornada.", "info");
    return;
  }

  const employee = getFilteredEmployees().find((item) => normalize(item.name) === search);

  if (!employee) {
    state.selectedEmployee = null;
    resetEmployeePanels();
    renderGeneralTable(getFilteredEmployees());
    setMessage("Colaborador não encontrado no mês selecionado.", "warning");
    return;
  }

  state.selectedEmployee = employee;
  state.expandedSummary = null;
  state.sortAscending = true;
  renderEmployeeDashboard(employee);
  setMessage("Escala carregada para o colaborador selecionado.", "success");
}

function parseScaleSheet(rows, sheetName) {
  if (!Array.isArray(rows) || !rows.length) {
    throw new Error("Não foi possível identificar a estrutura da aba selecionada.");
  }

  const headerRowIndex = findHeaderRowIndex(rows);
  if (headerRowIndex === -1) {
    throw new Error("Não foi possível identificar a estrutura da aba selecionada.");
  }

  const headerMap = mapHeaderColumns(rows[headerRowIndex]);
  if (headerMap.nome === undefined) {
    throw new Error("Não foi possível localizar a coluna NOME na aba selecionada.");
  }

  const firstDaySearchColumn = Math.max(
    headerMap.horario ?? 0,
    headerMap.categoria ?? 0,
    headerMap.nome ?? 0,
    headerMap.ramal ?? 0,
    headerMap.filial ?? 0
  ) + 1;

  const dayRowIndex = findDayRowIndex(rows, firstDaySearchColumn, headerRowIndex);
  if (dayRowIndex === -1) {
    throw new Error("Não foi possível identificar os dias do mês na aba selecionada.");
  }

  const monthInfo = parseMonthInfo(sheetName);
  const dayColumns = annotateDayColumns(
    extractDayColumns(rows[dayRowIndex], firstDaySearchColumn),
    monthInfo
  );
  if (!dayColumns.length) {
    throw new Error("Não foi possível identificar os dias do mês na aba selecionada.");
  }

  const weekdayRowIndex = findWeekdayRowIndex(rows, dayColumns, dayRowIndex, headerRowIndex);
  const periodLabel = getPeriodLabel(dayColumns, monthInfo);
  const employees = extractEmployees(rows, {
    headerMap,
    dayColumns,
    startRow: Math.max(headerRowIndex, dayRowIndex, weekdayRowIndex) + 1,
    headerRow: rows[headerRowIndex],
    dayRow: rows[dayRowIndex],
    weekdayRow: weekdayRowIndex >= 0 ? rows[weekdayRowIndex] : null,
    monthInfo
  });

  if (!employees.length) {
    throw new Error("Nenhuma escala encontrada para este mês.");
  }

  return {
    headerMap,
    dayColumns,
    monthInfo,
    periodLabel,
    employees
  };
}

function findHeaderRowIndex(rows) {
  let bestIndex = -1;
  let bestScore = 0;

  rows.forEach((row, rowIndex) => {
    const cells = row.map(normalize);
    const hasName = cells.some((cell) => cell === "NOME" || cell.includes("NOME"));
    const score = ["HORARIO", "CATEGORIA", "NOME", "RAMAL", "FILIAL"]
      .reduce((total, expected) => total + (cells.some((cell) => cell === expected || cell.includes(expected)) ? 1 : 0), 0);

    if (hasName && score > bestScore) {
      bestIndex = rowIndex;
      bestScore = score;
    }
  });

  return bestScore >= 2 ? bestIndex : -1;
}

function mapHeaderColumns(row) {
  const map = {};

  row.forEach((cell, index) => {
    const value = normalize(cell);
    if (!value) return;

    if (value === "HORARIO" || value.includes("HORARIO")) map.horario = index;
    if (value === "CATEGORIA" || value.includes("CATEGORIA")) map.categoria = index;
    if (value === "NOME" || value.includes("NOME")) map.nome = index;
    if (value === "RAMAL" || value.includes("RAMAL")) map.ramal = index;
    if (value === "FILIAL" || value.includes("FILIAL")) map.filial = index;
  });

  return map;
}

function findDayRowIndex(rows, startColumn, headerRowIndex) {
  const candidateIndexes = new Set();
  for (let index = Math.max(0, headerRowIndex - 6); index <= Math.min(rows.length - 1, headerRowIndex + 8); index += 1) {
    candidateIndexes.add(index);
  }
  rows.slice(0, 18).forEach((_, index) => candidateIndexes.add(index));

  let best = { index: -1, count: 0, orderedRun: 0 };
  candidateIndexes.forEach((rowIndex) => {
    const row = rows[rowIndex] || [];
    let count = 0;
    let orderedRun = 0;
    let expected = 1;

    for (let column = startColumn; column < row.length; column += 1) {
      const day = parseDayValue(row[column]);
      if (day !== null) {
        count += 1;
        if (day === expected) {
          orderedRun += 1;
          expected += 1;
        }
      }
    }

    if (count > best.count || (count === best.count && orderedRun > best.orderedRun)) {
      best = { index: rowIndex, count, orderedRun };
    }
  });

  return best.count >= 7 ? best.index : -1;
}

function extractDayColumns(dayRow, startColumn) {
  const columns = [];
  const seen = new Set();

  for (let column = startColumn; column < dayRow.length; column += 1) {
    const day = parseDayValue(dayRow[column]);
    if (day !== null && !seen.has(day)) {
      columns.push({ column, day });
      seen.add(day);
    }
  }

  return columns;
}

function annotateDayColumns(dayColumns, monthInfo) {
  const wrapIndex = dayColumns.findIndex((item, index) => (
    index > 0 && item.day < dayColumns[index - 1].day
  ));

  return dayColumns.map((item, index) => ({
    ...item,
    sortIndex: index,
    dateInfo: resolveDateInfoForDay(index, wrapIndex, monthInfo)
  }));
}

function getPeriodLabel(dayColumns, monthInfo) {
  if (!dayColumns.length) return "";
  const first = dayColumns[0];
  const last = dayColumns[dayColumns.length - 1];
  const firstLabel = formatDateLabel(first.dateInfo || monthInfo, first.day);
  const lastLabel = formatDateLabel(last.dateInfo || monthInfo, last.day);
  return `${firstLabel} a ${lastLabel}`;
}

function resolveDateInfoForDay(index, wrapIndex, monthInfo) {
  if (monthInfo.monthIndex === null || !monthInfo.year) return null;
  if (wrapIndex > 0 && index < wrapIndex) {
    return shiftMonthInfo(monthInfo, -1);
  }
  return monthInfo;
}

function shiftMonthInfo(monthInfo, delta) {
  const shiftedDate = new Date(monthInfo.year, monthInfo.monthIndex + delta, 1);
  const shiftedMonth = MONTHS[shiftedDate.getMonth()];
  return {
    monthLabel: shiftedMonth.label,
    monthIndex: shiftedMonth.index,
    year: shiftedDate.getFullYear()
  };
}

function findWeekdayRowIndex(rows, dayColumns, dayRowIndex, headerRowIndex) {
  let best = { index: -1, score: 0 };
  const minIndex = Math.max(0, Math.min(dayRowIndex, headerRowIndex) - 4);
  const maxIndex = Math.min(rows.length - 1, Math.max(dayRowIndex, headerRowIndex) + 5);

  for (let rowIndex = minIndex; rowIndex <= maxIndex; rowIndex += 1) {
    if (rowIndex === dayRowIndex) continue;
    const row = rows[rowIndex] || [];
    const score = dayColumns.reduce((total, item) => {
      const weekday = parseWeekday(row[item.column]);
      return total + (weekday ? 1 : 0);
    }, 0);

    if (score > best.score) {
      best = { index: rowIndex, score };
    }
  }

  return best.score >= Math.min(5, dayColumns.length) ? best.index : -1;
}

function extractEmployees(rows, config) {
  const employees = [];
  const employeesByName = new Map();
  const firstExtraColumn = Math.max(...config.dayColumns.map((item) => item.column)) + 1;
  let activeHeaderRow = config.headerRow || [];

  for (let rowIndex = config.startRow; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] || [];

    if (isBlockHeaderRow(row, config.headerMap)) {
      activeHeaderRow = row;
      continue;
    }

    const name = cleanText(row[config.headerMap.nome]);

    if (!isValidEmployeeName(name)) continue;

    const nameKey = normalize(name);

    const employee = {
      name,
      category: cleanText(row[config.headerMap.categoria]) || "Não informado",
      schedule: cleanText(row[config.headerMap.horario]) || "",
      extension: cleanText(row[config.headerMap.ramal]) || "Não informado",
      branch: cleanText(row[config.headerMap.filial]) || "Não informado",
      extraInfo: extractExtraInfo(row, activeHeaderRow, config.dayRow, firstExtraColumn),
      records: config.dayColumns.map((item) => {
        const rawMarker = cleanText(row[item.column]);
        const weekdayFromSheet = config.weekdayRow ? parseWeekday(config.weekdayRow[item.column]) : "";
        const weekday = weekdayFromSheet || calculateWeekday(item.dateInfo || config.monthInfo, item.day);
        const interpreted = interpretStatus(rawMarker, cleanText(row[config.headerMap.horario]), name);

        return {
          day: item.day,
          sortIndex: item.sortIndex,
          dateLabel: formatDateLabel(item.dateInfo || config.monthInfo, item.day),
          weekday,
          rawMarker,
          status: interpreted.status,
          statusKey: interpreted.status.key,
          schedule: interpreted.showSchedule ? cleanText(row[config.headerMap.horario]) : "",
          note: interpreted.note
        };
      })
    };

    employee.breaks = employee.extraInfo.filter((item) => item.type === "break");
    employee.sectors = employee.extraInfo.filter((item) => item.type === "sector");
    employee.otherInfo = employee.extraInfo.filter((item) => item.type === "extra");

    if (employeesByName.has(nameKey)) {
      mergeEmployeeInfo(employeesByName.get(nameKey), employee);
      continue;
    }

    employees.push(employee);
    employeesByName.set(nameKey, employee);
  }

  return employees.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

function mergeEmployeeInfo(target, source) {
  target.category = target.category !== "Não informado" ? target.category : source.category;
  target.schedule = target.schedule || source.schedule;
  target.extension = target.extension !== "Não informado" ? target.extension : source.extension;
  target.branch = target.branch !== "Não informado" ? target.branch : source.branch;
  target.extraInfo = mergeUniqueItems(target.extraInfo, source.extraInfo);
  target.breaks = target.extraInfo.filter((item) => item.type === "break");
  target.sectors = target.extraInfo.filter((item) => item.type === "sector");
  target.otherInfo = target.extraInfo.filter((item) => item.type === "extra");
}

function mergeUniqueItems(currentItems, newItems) {
  const seen = new Set(currentItems.map((item) => `${item.type}|${normalize(item.label)}|${normalize(item.value)}`));
  const merged = [...currentItems];

  newItems.forEach((item) => {
    const key = `${item.type}|${normalize(item.label)}|${normalize(item.value)}`;
    if (!seen.has(key)) {
      merged.push(item);
      seen.add(key);
    }
  });

  return merged;
}

function isBlockHeaderRow(row, headerMap) {
  return normalize(row[headerMap.horario]).includes("HORARIO")
    && normalize(row[headerMap.nome]).includes("NOME");
}

function extractExtraInfo(row, headerRow, dayRow, firstExtraColumn) {
  const items = [];
  let currentGroup = "";
  let sectorCount = 0;

  for (let column = firstExtraColumn; column < row.length; column += 1) {
    const dayHeader = cleanText(dayRow?.[column]);
    const blockHeader = cleanText(headerRow?.[column]);
    const header = blockHeader || dayHeader;
    const normalizedHeader = normalize(header);

    if (normalizedHeader.includes("SETORIZACAO")) {
      currentGroup = "Setorização";
    } else if (normalizedHeader.includes("PAUSA")) {
      currentGroup = "";
    }

    const value = cleanText(row[column]);
    if (!value || value === "-") continue;

    if (normalizedHeader.includes("PAUSA")) {
      items.push({
        type: "break",
        label: formatExtraLabel(header, items.filter((item) => item.type === "break").length + 1),
        value
      });
      continue;
    }

    if (normalizedHeader.includes("SETORIZACAO") || currentGroup === "Setorização") {
      sectorCount += 1;
      items.push({
        type: "sector",
        label: sectorCount === 1 ? "Setorização" : `Setorização ${sectorCount}`,
        value
      });
      continue;
    }

    items.push({
      type: "extra",
      label: header || `Informação ${items.length + 1}`,
      value
    });
  }

  return items;
}

function formatExtraLabel(label, index) {
  const cleanLabel = cleanText(label);
  if (cleanLabel) return cleanLabel;
  return `Pausa ${index}`;
}

function interpretStatus(rawMarker, schedule, name) {
  const value = normalize(rawMarker);
  const hasSchedule = Boolean(cleanText(schedule));
  const hasName = Boolean(cleanText(name));

  if (!hasName) {
    return { status: STATUS.NO_SCHEDULE, showSchedule: false, note: "" };
  }

  if (!value) {
    return hasSchedule
      ? { status: STATUS.WORK, showSchedule: true, note: "" }
      : { status: STATUS.NO_SCHEDULE, showSchedule: false, note: "" };
  }

  if (["FERIAS", "FE", "FÉ"].includes(value) || value.includes("FERIAS")) {
    return { status: STATUS.VACATION, showSchedule: false, note: "" };
  }

  if (["P", "PLANTAO"].includes(value) || value.includes("PLANTAO")) {
    return { status: STATUS.ON_CALL, showSchedule: true, note: "" };
  }

  if (["F", "FOLGA"].includes(value)) {
    return { status: STATUS.OFF, showSchedule: false, note: "" };
  }

  return { status: STATUS.NOTE, showSchedule: hasSchedule, note: rawMarker };
}

function populateMonthSelect() {
  elements.monthSelect.innerHTML = '<option value="">Selecione o mês</option>';
  state.scaleSheets.forEach((sheet) => {
    const option = document.createElement("option");
    option.value = sheet.sheetName;
    option.textContent = sheet.displayName;
    elements.monthSelect.appendChild(option);
  });
}

function populateCollaboratorOptions(employees) {
  elements.collaboratorOptions.innerHTML = "";
  employees.forEach((employee) => {
    const option = document.createElement("option");
    option.value = employee.name;
    elements.collaboratorOptions.appendChild(option);
  });

  elements.collaboratorInput.disabled = false;
  elements.collaboratorInput.placeholder = "Digite ou selecione o nome";
}

function getFilteredEmployees() {
  if (!state.currentData) return [];
  if (state.teamFilter === "all") return state.currentData.employees;

  return state.currentData.employees.filter((employee) => getEmployeeTeamGroup(employee) === state.teamFilter);
}

function getEmployeeTeamGroup(employee) {
  const category = normalize(employee.category);
  const name = normalize(employee.name);
  if (name.includes("YURI GADELHA")
    || name.includes("MAYCON BATISTA")
    || name.includes("MAICON BATISTA")) {
    return "n2";
  }

  if (category.includes("SUPERVISOR") || category.includes("ESPECIALISTA")) {
    return "lead";
  }

  const isN2Operation = category.includes("N2")
    || category.includes("N3 - PLANTAO")
    || category.includes("N1 TRAINEE");

  return isN2Operation ? "n2" : "n1";
}

function getTeamLabel(employee) {
  const group = getEmployeeTeamGroup(employee);
  if (group === "lead") return "Supervisor/Especialista";
  return group === "n2" ? "N2" : "N1";
}

function renderEmployeeDashboard(employee) {
  renderProfile(employee);
  renderExtraInfo(employee);
  renderSummary(employee.records);
  renderCalendar(employee.records);
  renderGeneralTable(getFilteredEmployees());
  elements.calendarSubtitle.textContent = `${employee.name} - ${state.currentMonth.displayName} (${state.currentData.periodLabel})`;
}

function renderProfile(employee) {
  elements.profileCard.className = "profile-card";
  elements.profileCard.innerHTML = `
    <h2 class="profile-name">${escapeHtml(employee.name)}</h2>
    <dl class="profile-details">
      <div>
        <dt>Categoria</dt>
        <dd>${escapeHtml(employee.category)}</dd>
      </div>
      <div>
        <dt>Horário</dt>
        <dd>${escapeHtml(employee.schedule || "Não informado")}</dd>
      </div>
      <div>
        <dt>Ramal</dt>
        <dd>${escapeHtml(employee.extension)}</dd>
      </div>
      <div>
        <dt>Filial</dt>
        <dd>${escapeHtml(employee.branch)}</dd>
      </div>
      <div>
        <dt>Mês</dt>
        <dd>${escapeHtml(state.currentMonth.displayName)}</dd>
      </div>
      <div>
        <dt>Período</dt>
        <dd>${escapeHtml(state.currentData.periodLabel || "Conforme aba")}</dd>
      </div>
    </dl>
  `;
}

function renderExtraInfo(employee) {
  renderMiniList(elements.breaksList, employee.breaks, "Nenhuma pausa cadastrada para este colaborador.");

  const sectorItems = [
    ...employee.sectors,
    ...employee.otherInfo
  ];
  renderMiniList(elements.sectorList, sectorItems, "Nenhuma setorização ou informação adicional cadastrada.");
}

function renderMiniList(container, items, emptyText) {
  if (!items.length) {
    container.innerHTML = `<div class="empty-state compact">${escapeHtml(emptyText)}</div>`;
    return;
  }

  container.innerHTML = items.map((item) => `
    <div class="mini-item">
      <span>${escapeHtml(item.label)}</span>
      <strong>${escapeHtml(item.value)}</strong>
    </div>
  `).join("");
}

function renderSummary(records) {
  const totals = calculateRecordTotals(records);

  elements.totals.work.textContent = totals.work || 0;
  elements.totals.off.textContent = totals.off || 0;
  elements.totals.onCall.textContent = totals["on-call"] || 0;
  elements.totals.vacation.textContent = totals.vacation || 0;
  elements.totals.noSchedule.textContent = totals["no-schedule"] || 0;
  elements.totals.notes.textContent = totals.note || 0;
}

function renderCalendar(records) {
  if (!records.length) {
    elements.calendarGrid.innerHTML = '<div class="placeholder-box">Nenhuma escala encontrada para este colaborador no mês selecionado.</div>';
    return;
  }

  elements.calendarGrid.innerHTML = records.map((record) => `
    <article class="day-card ${record.statusKey}">
      <div class="day-top">
        <span class="day-number">${String(record.day).padStart(2, "0")}</span>
        <span class="weekday">${escapeHtml(record.weekday || "-")}</span>
      </div>
      <span class="status-pill">${escapeHtml(record.status.label)}</span>
      ${record.schedule ? `<p class="day-meta">${escapeHtml(record.schedule)}</p>` : ""}
      ${record.note ? `<p class="day-meta">${escapeHtml(record.note)}</p>` : ""}
    </article>
  `).join("");
}

function renderGeneralTable(employees) {
  const sortedEmployees = [...employees].sort((a, b) => (
    state.sortAscending
      ? a.name.localeCompare(b.name, "pt-BR")
      : b.name.localeCompare(a.name, "pt-BR")
  ));

  if (!sortedEmployees.length) {
    elements.detailsTableBody.innerHTML = '<tr><td colspan="6" class="table-empty">Nenhum colaborador para exibir.</td></tr>';
    return;
  }

  elements.sortDateButton.textContent = state.sortAscending ? "Colaborador ↑" : "Colaborador ↓";
  elements.detailsTableBody.innerHTML = sortedEmployees.map((employee) => {
    const totals = calculateRecordTotals(employee.records);
    const employeeKey = normalize(employee.name);
    const breaks = renderTableList(employee.breaks.map((item) => ({
      label: item.label,
      value: item.value
    })));
    const sectors = renderTableList([...employee.sectors, ...employee.otherInfo].map((item) => ({
      label: item.label,
      value: item.value
    })));

    const mainRow = `
      <tr class="${state.selectedEmployee && normalize(state.selectedEmployee.name) === normalize(employee.name) ? "selected-row" : ""}">
        <td class="person-cell">
          <strong>${escapeHtml(employee.name)}</strong>
          <span>${escapeHtml(employee.category)}</span>
          <em>${escapeHtml(getTeamLabel(employee))}</em>
        </td>
        <td class="long-cell">${escapeHtml(employee.schedule || "-")}</td>
        <td class="contact-cell">
          <span>Ramal: <strong>${escapeHtml(employee.extension)}</strong></span>
          <span>Filial: <strong>${escapeHtml(employee.branch)}</strong></span>
        </td>
        <td>
          <div class="summary-chips">
            ${renderCountChip("Trabalho", totals.work || 0, "work", employeeKey)}
            ${renderCountChip("Folga", totals.off || 0, "off", employeeKey)}
            ${renderCountChip("Plantão", totals["on-call"] || 0, "on-call", employeeKey)}
            ${renderCountChip("Férias", totals.vacation || 0, "vacation", employeeKey)}
            ${renderCountChip("Sem escala", totals["no-schedule"] || 0, "no-schedule", employeeKey)}
            ${renderCountChip("Obs.", totals.note || 0, "note", employeeKey)}
          </div>
        </td>
        <td class="long-cell">${breaks}</td>
        <td class="long-cell">${sectors}</td>
      </tr>
    `;

    const detailRow = state.expandedSummary
      && state.expandedSummary.employeeKey === employeeKey
      ? renderSummaryDetailRow(employee, state.expandedSummary.statusKey)
      : "";

    return mainRow + detailRow;
  }).join("");
}

function renderCountChip(label, value, key, employeeKey) {
  return `
    <button
      class="count-chip ${key}"
      type="button"
      data-employee-key="${escapeHtml(employeeKey)}"
      data-status-key="${escapeHtml(key)}"
      title="Ver datas de ${escapeHtml(label)}"
    >
      <b>${value}</b>${escapeHtml(label)}
    </button>
  `;
}

function handleSummaryChipClick(event) {
  const chip = event.target.closest(".count-chip");
  if (!chip) return;

  const employeeKey = chip.dataset.employeeKey;
  const statusKey = chip.dataset.statusKey;
  const isSame = state.expandedSummary
    && state.expandedSummary.employeeKey === employeeKey
    && state.expandedSummary.statusKey === statusKey;

  state.expandedSummary = isSame ? null : { employeeKey, statusKey };
  renderGeneralTable(getFilteredEmployees());
}

function renderSummaryDetailRow(employee, statusKey) {
  const records = employee.records.filter((record) => record.statusKey === statusKey);
  const statusLabel = records[0]?.status.label || getStatusLabelByKey(statusKey);

  return `
    <tr class="summary-detail-row">
      <td colspan="6">
        <div class="summary-detail">
          <div class="summary-detail-head">
            <strong>${escapeHtml(employee.name)}</strong>
            <span>${escapeHtml(statusLabel)} - ${records.length} dia(s)</span>
          </div>
          ${records.length ? `
            <div class="date-chip-list">
              ${records.map((record) => `
                <span class="${escapeHtml(statusKey)}">
                  <strong>${escapeHtml(record.dateLabel)}</strong>
                  <small>${escapeHtml(record.weekday || "-")}${record.schedule ? ` | ${escapeHtml(record.schedule)}` : ""}${record.note ? ` | ${escapeHtml(record.note)}` : ""}</small>
                </span>
              `).join("")}
            </div>
          ` : '<p class="muted-line">Nenhuma data encontrada para este status.</p>'}
        </div>
      </td>
    </tr>
  `;
}

function getStatusLabelByKey(statusKey) {
  const status = Object.values(STATUS).find((item) => item.key === statusKey);
  return status?.label || "Status";
}

function renderTableList(items) {
  if (!items.length) return '<span class="muted-dash">-</span>';

  return `
    <div class="table-mini-list">
      ${items.map((item) => `
        <span>
          <small>${escapeHtml(item.label)}</small>
          <strong>${escapeHtml(item.value)}</strong>
        </span>
      `).join("")}
    </div>
  `;
}

function calculateRecordTotals(records) {
  return records.reduce((acc, record) => {
    acc[record.statusKey] = (acc[record.statusKey] || 0) + 1;
    return acc;
  }, {});
}

function toggleDateSort() {
  state.sortAscending = !state.sortAscending;
  if (state.currentData) {
    renderGeneralTable(state.currentData.employees);
  }
}

function clearFilters() {
  if (!state.workbook) {
    resetAfterWorkbookFailure();
    elements.workbookInput.value = "";
    setMessage("Carregue a planilha para iniciar a consulta.", "info");
    return;
  }

  clearSelectedMonth();
  setMessage("Selecione um mês para carregar os colaboradores.", "info");
}

function clearSelectedMonth() {
  state.currentMonth = null;
  state.currentData = null;
  state.selectedEmployee = null;
  state.expandedSummary = null;
  elements.monthSelect.value = "";
  clearEmployeeSelection();
  resetVisuals();
}

function clearEmployeeSelection() {
  state.selectedEmployee = null;
  elements.collaboratorInput.value = "";
  elements.collaboratorInput.disabled = true;
  elements.collaboratorInput.placeholder = "Selecione um mês primeiro";
  elements.collaboratorOptions.innerHTML = "";
  elements.teamSelect.value = "all";
  elements.teamSelect.disabled = true;
  state.teamFilter = "all";
}

function resetEmployeePanels() {
  elements.profileCard.className = "profile-card empty-state";
  elements.profileCard.innerHTML = `
    <span class="empty-icon" aria-hidden="true">ID</span>
    <div>
      <h2>Nenhum colaborador selecionado</h2>
      <p>Selecione um mês e um colaborador para visualizar a jornada.</p>
    </div>
  `;
  elements.breaksList.innerHTML = '<div class="empty-state compact">Nenhuma pausa para exibir.</div>';
  elements.sectorList.innerHTML = '<div class="empty-state compact">Nenhuma setorização para exibir.</div>';

  Object.values(elements.totals).forEach((item) => {
    item.textContent = "0";
  });

  elements.calendarSubtitle.textContent = "Os dias do mês selecionado aparecerão aqui.";
  elements.calendarGrid.innerHTML = '<div class="placeholder-box">Selecione um colaborador para visualizar a escala.</div>';
}

function resetVisuals() {
  resetEmployeePanels();
  elements.detailsTableBody.innerHTML = '<tr><td colspan="6" class="table-empty">Selecione um mês para exibir a tabela geral.</td></tr>';
  elements.sortDateButton.textContent = "Colaborador";
}

function resetAfterWorkbookFailure() {
  state.workbook = null;
  state.scaleSheets = [];
  state.currentMonth = null;
  state.currentData = null;
  state.selectedEmployee = null;
  elements.monthSelect.innerHTML = '<option value="">Carregue a planilha primeiro</option>';
  elements.monthSelect.disabled = true;
  clearEmployeeSelection();
  resetVisuals();
}

function setMessage(text, type = "info") {
  elements.statusMessage.textContent = text;
  elements.statusMessage.className = `status-message ${type}`;
}

function applySavedTheme() {
  const savedTheme = localStorage.getItem("dashboard-jornada-theme") || "light";
  document.documentElement.dataset.theme = savedTheme;
  elements.themeToggle.textContent = savedTheme === "dark" ? "☼" : "☾";
}

function toggleTheme() {
  const current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  localStorage.setItem("dashboard-jornada-theme", next);
  elements.themeToggle.textContent = next === "dark" ? "☼" : "☾";
}

function formatSheetName(sheetName) {
  const monthInfo = parseMonthInfo(sheetName);
  if (!monthInfo.monthLabel) {
    return cleanText(sheetName.replace(/^ESCALA\s*/i, "")) || sheetName;
  }

  return monthInfo.year ? `${monthInfo.monthLabel} ${monthInfo.year}` : monthInfo.monthLabel;
}

function parseMonthInfo(sheetName) {
  const normalized = normalize(sheetName);
  const yearMatch = normalized.match(/\b(20\d{2}|19\d{2})\b|(\d{4})$/);
  const year = yearMatch ? Number(yearMatch[1] || yearMatch[2]) : null;
  const month = MONTHS.find((item) => normalized.includes(item.normalized));

  return {
    monthLabel: month?.label || "",
    monthIndex: month?.index ?? null,
    year
  };
}

function formatDateLabel(monthInfo, day) {
  const paddedDay = String(day).padStart(2, "0");

  if (monthInfo.monthLabel && monthInfo.year) {
    return `${paddedDay}/${String(monthInfo.monthIndex + 1).padStart(2, "0")}/${monthInfo.year}`;
  }

  if (monthInfo.monthLabel) {
    return `${paddedDay} de ${monthInfo.monthLabel}`;
  }

  return `Dia ${paddedDay}`;
}

function calculateWeekday(monthInfo, day) {
  if (monthInfo.monthIndex === null || !monthInfo.year) return "";
  const date = new Date(monthInfo.year, monthInfo.monthIndex, day);
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(date)
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function parseDayValue(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.getDate();
  }

  if (typeof value === "number" && value >= 1 && value <= 31) {
    return Math.trunc(value);
  }

  const text = cleanText(value);
  const exactNumber = text.match(/^(\d{1,2})$/);
  if (exactNumber) {
    const day = Number(exactNumber[1]);
    return day >= 1 && day <= 31 ? day : null;
  }

  const dateLike = text.match(/^(\d{1,2})[\/.-]\d{1,2}(?:[\/.-]\d{2,4})?$/);
  if (dateLike) {
    const day = Number(dateLike[1]);
    return day >= 1 && day <= 31 ? day : null;
  }

  return null;
}

function parseWeekday(value) {
  const normalized = normalize(value).replace(/\./g, "");
  if (!normalized) return "";
  const direct = WEEKDAYS[normalized];
  if (direct) return direct;

  const prefix = normalized.slice(0, 3);
  return WEEKDAYS[prefix] || "";
}

function isValidEmployeeName(name) {
  const normalized = normalize(name);
  if (!normalized) return false;
  if (normalized.length < 3) return false;
  if (/^(NOME|COLABORADOR|FUNCIONARIO|TOTAL|HORARIO|CATEGORIA|FILIAL|RAMAL)$/.test(normalized)) return false;
  if (/^\d+$/.test(normalized)) return false;
  return /[A-Z]/.test(normalized);
}

function normalize(value) {
  return cleanText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function cleanText(value) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\s+/g, " ").trim();
}

function escapeHtml(value) {
  return cleanText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
