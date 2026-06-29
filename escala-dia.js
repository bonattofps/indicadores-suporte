const GOOGLE_SHEETS_JORNADA_XLSX_URL = "https://docs.google.com/spreadsheets/d/17QoDe9GbP07OtEOD1Vq8gRCU-SVBctX6FJH3oGRpkOE/export?format=xlsx";

const STATUS = {
  WORK: { key: "work", label: "Trabalho" },
  OFF: { key: "off", label: "Folga" },
  ON_CALL: { key: "on-call", label: "Plantao" },
  VACATION: { key: "vacation", label: "Ferias" },
  NO_SCHEDULE: { key: "no-schedule", label: "Sem escala" },
  NOTE: { key: "note", label: "Observacao" }
};

const MONTHS = [
  { normalized: "JANEIRO", label: "Janeiro", index: 0 },
  { normalized: "FEVEREIRO", label: "Fevereiro", index: 1 },
  { normalized: "MARCO", label: "Marco", index: 2 },
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
  TER: "Terca",
  TERCA: "Terca",
  QUA: "Quarta",
  QUARTA: "Quarta",
  QUI: "Quinta",
  QUINTA: "Quinta",
  SEX: "Sexta",
  SEXTA: "Sexta",
  SAB: "Sabado",
  SABADO: "Sabado"
};

const state = {
  employees: [],
  filteredEmployees: [],
  selectedDate: new Date()
};

const elements = {
  subtitle: document.querySelector("#dateSubtitle"),
  status: document.querySelector("#statusMessage"),
  teamFilter: document.querySelector("#teamFilter"),
  searchInput: document.querySelector("#searchInput"),
  refreshButton: document.querySelector("#refreshButton"),
  body: document.querySelector("#todayBody"),
  workCount: document.querySelector("#workCount"),
  onCallCount: document.querySelector("#onCallCount"),
  offCount: document.querySelector("#offCount"),
  vacationCount: document.querySelector("#vacationCount")
};

elements.teamFilter.addEventListener("change", render);
elements.searchInput.addEventListener("input", render);
elements.refreshButton.addEventListener("click", loadWorkbook);

loadWorkbook();

async function loadWorkbook() {
  elements.refreshButton.disabled = true;
  setMessage("Carregando jornadas pelo Google Sheets...", "info");
  elements.subtitle.textContent = formatFullDate(state.selectedDate);

  try {
    const response = await fetch(`${GOOGLE_SHEETS_JORNADA_XLSX_URL}&_=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Google Sheets retornou ${response.status}.`);
    const buffer = await response.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
    const parsedSheets = workbook.SheetNames
      .filter((name) => normalize(name).startsWith("ESCALA"))
      .map((sheetName) => parseWorksheet(workbook.Sheets[sheetName], sheetName))
      .filter(Boolean);

    const todaySheet = findSheetForDate(parsedSheets, state.selectedDate);
    state.employees = todaySheet ? buildTodayEmployees(todaySheet, state.selectedDate) : [];
    render();

    setMessage(
      todaySheet
        ? `Escala carregada: ${todaySheet.displayName}.`
        : "Nao encontrei uma aba de escala para a data de hoje.",
      todaySheet ? "success" : "warning"
    );
  } catch (error) {
    console.error(error);
    state.employees = [];
    render();
    setMessage("Nao foi possivel carregar a escala do dia.", "error");
  } finally {
    elements.refreshButton.disabled = false;
  }
}

function parseWorksheet(worksheet, sheetName) {
  if (!worksheet) return null;
  const rows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    blankrows: false,
    defval: "",
    raw: false
  });

  try {
    return {
      sheetName,
      displayName: formatSheetName(sheetName),
      ...parseScaleSheet(rows, sheetName)
    };
  } catch (error) {
    console.warn(error);
    return null;
  }
}

function parseScaleSheet(rows, sheetName) {
  const headerRowIndex = findHeaderRowIndex(rows);
  if (headerRowIndex === -1) throw new Error("Cabecalho nao encontrado.");

  const headerMap = mapHeaderColumns(rows[headerRowIndex]);
  const firstDaySearchColumn = Math.max(
    headerMap.horario ?? 0,
    headerMap.categoria ?? 0,
    headerMap.nome ?? 0,
    headerMap.ramal ?? 0,
    headerMap.filial ?? 0
  ) + 1;

  const dayRowIndex = findDayRowIndex(rows, firstDaySearchColumn, headerRowIndex);
  if (dayRowIndex === -1) throw new Error("Dias do mes nao encontrados.");

  const monthInfo = parseMonthInfo(sheetName);
  const dayColumns = annotateDayColumns(extractDayColumns(rows[dayRowIndex], firstDaySearchColumn), monthInfo);
  const weekdayRowIndex = findWeekdayRowIndex(rows, dayColumns, dayRowIndex, headerRowIndex);
  const employees = extractEmployees(rows, {
    headerMap,
    dayColumns,
    startRow: Math.max(headerRowIndex, dayRowIndex, weekdayRowIndex) + 1,
    headerRow: rows[headerRowIndex],
    dayRow: rows[dayRowIndex],
    weekdayRow: weekdayRowIndex >= 0 ? rows[weekdayRowIndex] : null,
    monthInfo
  });

  return { monthInfo, dayColumns, employees };
}

function findSheetForDate(sheets, date) {
  return sheets.find((sheet) => sheet.dayColumns.some((item) => sameDateInfo(item.dateInfo, item.day, date)))
    || sheets.find((sheet) => sheet.monthInfo.monthIndex === date.getMonth() && sheet.monthInfo.year === date.getFullYear())
    || null;
}

function buildTodayEmployees(sheet, date) {
  return sheet.employees.map((employee) => {
    const record = employee.records.find((item) => sameDateInfo(item.dateInfo, item.day, date));
    return record ? { ...employee, today: record } : null;
  }).filter(Boolean);
}

function sameDateInfo(dateInfo, day, date) {
  return dateInfo
    && dateInfo.year === date.getFullYear()
    && dateInfo.monthIndex === date.getMonth()
    && Number(day) === date.getDate();
}

function render() {
  const team = elements.teamFilter.value;
  const search = normalize(elements.searchInput.value);
  const employees = state.employees
    .filter((employee) => team === "all" || getEmployeeTeamGroup(employee) === team)
    .filter((employee) => !search || normalize(employee.name).includes(search))
    .sort((a, b) => statusOrder(a.today.statusKey) - statusOrder(b.today.statusKey) || a.name.localeCompare(b.name, "pt-BR"));

  const totals = employees.reduce((acc, employee) => {
    acc[employee.today.statusKey] = (acc[employee.today.statusKey] || 0) + 1;
    return acc;
  }, {});

  elements.workCount.textContent = totals.work || 0;
  elements.onCallCount.textContent = totals["on-call"] || 0;
  elements.offCount.textContent = totals.off || 0;
  elements.vacationCount.textContent = totals.vacation || 0;

  elements.body.innerHTML = employees.length
    ? employees.map((employee) => renderEmployeeRow(employee)).join("")
    : `<tr><td colspan="8">Nenhum colaborador encontrado para os filtros atuais.</td></tr>`;
}

function renderEmployeeRow(employee) {
  const breaks = employee.breaks.map((item) => item.value).join(" | ") || "-";
  const sectors = [...employee.sectors, ...employee.otherInfo].map((item) => item.value).join(" | ") || "-";
  return `
    <tr>
      <td><strong>${escapeHtml(employee.name)}</strong></td>
      <td>${escapeHtml(getTeamLabel(employee))}</td>
      <td><span class="status-chip ${employee.today.statusKey}">${escapeHtml(employee.today.status.label)}</span></td>
      <td>${escapeHtml(employee.today.schedule || employee.schedule || "-")}</td>
      <td class="muted-cell">${escapeHtml(breaks)}</td>
      <td class="muted-cell">${escapeHtml(sectors)}</td>
      <td>${escapeHtml(employee.extension)}</td>
      <td>${escapeHtml(employee.branch)}</td>
    </tr>
  `;
}

function statusOrder(status) {
  return { work: 1, "on-call": 2, note: 3, off: 4, vacation: 5, "no-schedule": 6 }[status] || 9;
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
    if (value === "HORARIO" || value.includes("HORARIO")) map.horario = index;
    if (value === "CATEGORIA" || value.includes("CATEGORIA")) map.categoria = index;
    if (value === "NOME" || value.includes("NOME")) map.nome = index;
    if (value === "RAMAL" || value.includes("RAMAL")) map.ramal = index;
    if (value === "FILIAL" || value.includes("FILIAL")) map.filial = index;
  });
  return map;
}

function findDayRowIndex(rows, startColumn, headerRowIndex) {
  let best = { index: -1, count: 0, orderedRun: 0 };
  for (let rowIndex = Math.max(0, headerRowIndex - 6); rowIndex <= Math.min(rows.length - 1, headerRowIndex + 8); rowIndex += 1) {
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
  }
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
  const wrapIndex = dayColumns.findIndex((item, index) => index > 0 && item.day < dayColumns[index - 1].day);
  return dayColumns.map((item, index) => ({
    ...item,
    sortIndex: index,
    dateInfo: wrapIndex > 0 && index < wrapIndex ? shiftMonthInfo(monthInfo, -1) : monthInfo
  }));
}

function findWeekdayRowIndex(rows, dayColumns, dayRowIndex, headerRowIndex) {
  let best = { index: -1, score: 0 };
  const minIndex = Math.max(0, Math.min(dayRowIndex, headerRowIndex) - 4);
  const maxIndex = Math.min(rows.length - 1, Math.max(dayRowIndex, headerRowIndex) + 5);
  for (let rowIndex = minIndex; rowIndex <= maxIndex; rowIndex += 1) {
    if (rowIndex === dayRowIndex) continue;
    const row = rows[rowIndex] || [];
    const score = dayColumns.reduce((total, item) => total + (parseWeekday(row[item.column]) ? 1 : 0), 0);
    if (score > best.score) best = { index: rowIndex, score };
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

    const employee = {
      name,
      category: cleanText(row[config.headerMap.categoria]) || "Nao informado",
      schedule: cleanText(row[config.headerMap.horario]) || "",
      extension: cleanText(row[config.headerMap.ramal]) || "Nao informado",
      branch: cleanText(row[config.headerMap.filial]) || "Nao informado",
      extraInfo: extractExtraInfo(row, activeHeaderRow, config.dayRow, firstExtraColumn),
      records: config.dayColumns.map((item) => {
        const rawMarker = cleanText(row[item.column]);
        const weekdayFromSheet = config.weekdayRow ? parseWeekday(config.weekdayRow[item.column]) : "";
        const weekday = weekdayFromSheet || calculateWeekday(item.dateInfo || config.monthInfo, item.day);
        const interpreted = interpretStatus(rawMarker, cleanText(row[config.headerMap.horario]), name);
        return {
          day: item.day,
          dateInfo: item.dateInfo || config.monthInfo,
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

    const key = normalize(name);
    if (employeesByName.has(key)) {
      mergeEmployeeInfo(employeesByName.get(key), employee);
      continue;
    }

    employees.push(employee);
    employeesByName.set(key, employee);
  }
  return employees;
}

function mergeEmployeeInfo(target, source) {
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

function extractExtraInfo(row, headerRow, dayRow, firstExtraColumn) {
  const items = [];
  let currentGroup = "";
  let sectorCount = 0;
  for (let column = firstExtraColumn; column < row.length; column += 1) {
    const dayHeader = cleanText(dayRow?.[column]);
    const blockHeader = cleanText(headerRow?.[column]);
    const header = blockHeader || dayHeader;
    const normalizedHeader = normalize(header);
    if (normalizedHeader.includes("SETORIZACAO")) currentGroup = "Setorizacao";
    if (normalizedHeader.includes("PAUSA")) currentGroup = "";
    const value = cleanText(row[column]);
    if (!value || value === "-") continue;
    if (normalizedHeader.includes("PAUSA")) {
      items.push({ type: "break", label: header || "Pausa", value });
    } else if (normalizedHeader.includes("SETORIZACAO") || currentGroup === "Setorizacao") {
      sectorCount += 1;
      items.push({ type: "sector", label: sectorCount === 1 ? "Setorizacao" : `Setorizacao ${sectorCount}`, value });
    } else {
      items.push({ type: "extra", label: header || "Informacao", value });
    }
  }
  return items;
}

function interpretStatus(rawMarker, schedule, name) {
  const value = normalize(rawMarker);
  const hasSchedule = Boolean(cleanText(schedule));
  const hasName = Boolean(cleanText(name));
  if (!hasName) return { status: STATUS.NO_SCHEDULE, showSchedule: false, note: "" };
  if (!value) return hasSchedule
    ? { status: STATUS.WORK, showSchedule: true, note: "" }
    : { status: STATUS.NO_SCHEDULE, showSchedule: false, note: "" };
  if (["FERIAS", "FE"].includes(value) || value.includes("FERIAS")) return { status: STATUS.VACATION, showSchedule: false, note: "" };
  if (["P", "PLANTAO"].includes(value) || value.includes("PLANTAO")) return { status: STATUS.ON_CALL, showSchedule: true, note: "" };
  if (["F", "FOLGA"].includes(value)) return { status: STATUS.OFF, showSchedule: false, note: "" };
  return { status: STATUS.NOTE, showSchedule: hasSchedule, note: rawMarker };
}

function getEmployeeTeamGroup(employee) {
  const category = normalize(employee.category);
  const name = normalize(employee.name);
  if (name.includes("YURI GADELHA") || name.includes("MAYCON BATISTA") || name.includes("MAICON BATISTA")) return "n2";
  if (category.includes("SUPERVISOR") || category.includes("ESPECIALISTA")) return "lead";
  return category.includes("N2") || category.includes("N3 - PLANTAO") || category.includes("N1 TRAINEE") ? "n2" : "n1";
}

function getTeamLabel(employee) {
  const group = getEmployeeTeamGroup(employee);
  if (group === "lead") return "Supervisor/Especialista";
  return group === "n2" ? "N2" : "N1";
}

function isBlockHeaderRow(row, headerMap) {
  return normalize(row[headerMap.horario]).includes("HORARIO") && normalize(row[headerMap.nome]).includes("NOME");
}

function formatSheetName(sheetName) {
  const monthInfo = parseMonthInfo(sheetName);
  return monthInfo.monthLabel ? `${monthInfo.monthLabel}${monthInfo.year ? ` ${monthInfo.year}` : ""}` : cleanText(sheetName);
}

function parseMonthInfo(sheetName) {
  const normalized = normalize(sheetName);
  const yearMatch = normalized.match(/\b(20\d{2}|19\d{2})\b|(\d{4})$/);
  const year = yearMatch ? Number(yearMatch[1] || yearMatch[2]) : null;
  const month = MONTHS.find((item) => normalized.includes(item.normalized));
  return { monthLabel: month?.label || "", monthIndex: month?.index ?? null, year };
}

function shiftMonthInfo(monthInfo, delta) {
  const shiftedDate = new Date(monthInfo.year, monthInfo.monthIndex + delta, 1);
  const shiftedMonth = MONTHS[shiftedDate.getMonth()];
  return { monthLabel: shiftedMonth.label, monthIndex: shiftedMonth.index, year: shiftedDate.getFullYear() };
}

function calculateWeekday(monthInfo, day) {
  if (monthInfo.monthIndex === null || !monthInfo.year) return "";
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(new Date(monthInfo.year, monthInfo.monthIndex, day));
}

function parseDayValue(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.getDate();
  if (typeof value === "number" && value >= 1 && value <= 31) return Math.trunc(value);
  const text = cleanText(value);
  const exact = text.match(/^(\d{1,2})$/);
  if (exact) return Number(exact[1]) >= 1 && Number(exact[1]) <= 31 ? Number(exact[1]) : null;
  const dateLike = text.match(/^(\d{1,2})[\/.-]\d{1,2}(?:[\/.-]\d{2,4})?$/);
  if (dateLike) return Number(dateLike[1]);
  return null;
}

function parseWeekday(value) {
  const normalized = normalize(value).replace(/\./g, "");
  return WEEKDAYS[normalized] || WEEKDAYS[normalized.slice(0, 3)] || "";
}

function isValidEmployeeName(name) {
  const normalized = normalize(name);
  if (!normalized || normalized.length < 3) return false;
  if (/^(NOME|COLABORADOR|FUNCIONARIO|TOTAL|HORARIO|CATEGORIA|FILIAL|RAMAL)$/.test(normalized)) return false;
  return /[A-Z]/.test(normalized);
}

function formatFullDate(date) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "full" }).format(date);
}

function setMessage(message, type = "info") {
  elements.status.textContent = message;
  elements.status.dataset.type = type;
}

function normalize(value) {
  return cleanText(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toUpperCase();
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
