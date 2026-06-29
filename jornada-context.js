const GOOGLE_SHEETS_JORNADA_XLSX_URL = "https://docs.google.com/spreadsheets/d/17QoDe9GbP07OtEOD1Vq8gRCU-SVBctX6FJH3oGRpkOE/export?format=xlsx";
const XLSX_CDN = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";

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

let cachedSheets = null;

export async function buildJornadaContextForQuestion(question, profile = null) {
  if (!isJornadaQuestion(question)) return { context: "", directAnswer: "" };

  const canAccess = !profile || window.SGPAuth?.canAccess?.(profile.role, "jornada.html");
  if (!canAccess) {
    return {
      context: "",
      directAnswer: "Seu cargo não tem acesso à dashboard Jornadas do Suporte. Peça ao Administrador para liberar essa permissão em Configurações."
    };
  }

  try {
    const date = parseRequestedDate(question);
    const sheets = await loadJornadaSheets();
    const sheet = findSheetForDate(sheets, date);
    if (!sheet) {
      return {
        context: "",
        directAnswer: `Nao encontrei uma aba de escala para ${formatShortDate(date)}.`
      };
    }

    const employees = buildEmployeesForDate(sheet, date);
    const onCall = employees.filter((employee) => employee.record.statusKey === "on-call");
    const working = employees.filter((employee) => employee.record.statusKey === "work");
    const off = employees.filter((employee) => employee.record.statusKey === "off");
    const vacation = employees.filter((employee) => employee.record.statusKey === "vacation");

    const lines = [
      `Contexto da planilha Jornadas para ${formatFullDate(date)} (${sheet.displayName}):`,
      `Plantao: ${formatEmployeeList(onCall)}`,
      `Trabalhando: ${formatEmployeeList(working)}`,
      `Folga: ${formatEmployeeList(off)}`,
      `Ferias: ${formatEmployeeList(vacation)}`
    ];

    if (isOnCallQuestion(question)) {
      return {
        context: lines.join("\n"),
        directAnswer: onCall.length
          ? `No dia ${formatShortDate(date)}, o plantao esta com:\n${onCall.map(formatEmployeeLine).join("\n")}`
          : `No dia ${formatShortDate(date)}, nao encontrei nenhum colaborador marcado como plantao na planilha.`
      };
    }

    if (isWorkingQuestion(question)) {
      return {
        context: lines.join("\n"),
        directAnswer: working.length
          ? `No dia ${formatShortDate(date)}, estao trabalhando:\n${formatLimitedEmployees(working)}`
          : `No dia ${formatShortDate(date)}, nao encontrei colaboradores marcados como trabalho na planilha.`
      };
    }

    if (isOffQuestion(question)) {
      return {
        context: lines.join("\n"),
        directAnswer: off.length
          ? `No dia ${formatShortDate(date)}, estao de folga:\n${formatLimitedEmployees(off)}`
          : `No dia ${formatShortDate(date)}, nao encontrei colaboradores de folga na planilha.`
      };
    }

    if (isVacationQuestion(question)) {
      return {
        context: lines.join("\n"),
        directAnswer: vacation.length
          ? `No dia ${formatShortDate(date)}, estao em ferias:\n${formatLimitedEmployees(vacation)}`
          : `No dia ${formatShortDate(date)}, nao encontrei colaboradores em ferias na planilha.`
      };
    }

    if (isDailySummaryQuestion(question)) {
      return {
        context: lines.join("\n"),
        directAnswer: [
          `Resumo da escala em ${formatShortDate(date)} (${sheet.displayName}):`,
          `- Trabalhando: ${working.length}`,
          `- Plantao: ${onCall.length}`,
          `- Folga: ${off.length}`,
          `- Ferias: ${vacation.length}`,
          "",
          "Plantao:",
          onCall.length ? formatLimitedEmployees(onCall, 6) : "- Nenhum",
          "",
          "Primeiros colaboradores em trabalho:",
          working.length ? formatLimitedEmployees(working, 8) : "- Nenhum"
        ].join("\n")
      };
    }

    return { context: lines.join("\n"), directAnswer: "" };
  } catch (error) {
    console.error(error);
    return {
      context: "",
      directAnswer: "Nao consegui consultar a planilha de Jornadas agora. Confira se ela continua publica."
    };
  }
}

function isJornadaQuestion(question) {
  const text = normalize(question);
  return ["PLANTAO", "ESCALA", "JORNADA", "TRABALHAR", "TRABALHA", "FOLGA", "FERIAS"].some((word) => text.includes(word));
}

function isOnCallQuestion(question) {
  return normalize(question).includes("PLANTAO");
}

function isWorkingQuestion(question) {
  const text = normalize(question);
  return text.includes("TRABALHAR") || text.includes("TRABALHA") || text.includes("TRABALHANDO") || text.includes("QUEM VAI");
}

function isOffQuestion(question) {
  return normalize(question).includes("FOLGA");
}

function isVacationQuestion(question) {
  return normalize(question).includes("FERIAS");
}

function isDailySummaryQuestion(question) {
  const text = normalize(question);
  return text.includes("RESUMO") || text.includes("ESCALA DO DIA") || text.includes("ESCALA HOJE") || text.includes("HOJE");
}

function parseRequestedDate(question) {
  const now = new Date();
  const text = normalize(question);
  const dateMatch = cleanText(question).match(/\b(\d{1,2})(?:[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?)?\b/);
  if (dateMatch) {
    const day = Number(dateMatch[1]);
    const month = dateMatch[2] ? Number(dateMatch[2]) - 1 : now.getMonth();
    const year = dateMatch[3] ? normalizeYear(Number(dateMatch[3])) : now.getFullYear();
    return new Date(year, month, day);
  }

  if (text.includes("AMANHA")) return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (text.includes("ONTEM")) return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function normalizeYear(year) {
  return year < 100 ? 2000 + year : year;
}

async function loadJornadaSheets() {
  if (cachedSheets) return cachedSheets;

  await ensureXlsx();
  const response = await fetch(`${GOOGLE_SHEETS_JORNADA_XLSX_URL}&_=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Google Sheets retornou ${response.status}.`);
  const buffer = await response.arrayBuffer();
  const workbook = window.XLSX.read(buffer, { type: "array", cellDates: true });
  cachedSheets = workbook.SheetNames
    .filter((name) => normalize(name).startsWith("ESCALA"))
    .map((sheetName) => parseWorksheet(workbook.Sheets[sheetName], sheetName))
    .filter(Boolean);
  return cachedSheets;
}

function ensureXlsx() {
  if (window.XLSX) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${XLSX_CDN}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = XLSX_CDN;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function parseWorksheet(worksheet, sheetName) {
  if (!worksheet) return null;
  const rows = window.XLSX.utils.sheet_to_json(worksheet, {
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

function buildEmployeesForDate(sheet, date) {
  return sheet.employees.map((employee) => {
    const record = employee.records.find((item) => sameDateInfo(item.dateInfo, item.day, date));
    return record ? { ...employee, record } : null;
  }).filter(Boolean);
}

function sameDateInfo(dateInfo, day, date) {
  return dateInfo
    && dateInfo.year === date.getFullYear()
    && dateInfo.monthIndex === date.getMonth()
    && Number(day) === date.getDate();
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
    employees.push(employee);
  }
  return employees;
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
  const year = yearMatch ? Number(yearMatch[1] || yearMatch[2]) : new Date().getFullYear();
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

function formatEmployeeList(employees) {
  return employees.length ? employees.map(formatEmployeeLine).join("; ") : "Nenhum";
}

function formatLimitedEmployees(employees, limit = 12) {
  const visible = employees.slice(0, limit).map(formatEmployeeLine);
  const remaining = employees.length - visible.length;
  return [
    ...visible,
    ...(remaining > 0 ? [`- Mais ${remaining} colaborador(es) na escala.`] : [])
  ].join("\n");
}

function formatEmployeeLine(employee) {
  const details = [
    getTeamLabel(employee),
    employee.record.schedule || employee.schedule,
    employee.breaks.map((item) => item.value).join(" | "),
    employee.sectors.map((item) => item.value).join(" | ")
  ].filter(Boolean);
  return `- ${employee.name}${details.length ? ` (${details.join(" - ")})` : ""}`;
}

function formatShortDate(date) {
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

function formatFullDate(date) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "full" }).format(date);
}

function normalize(value) {
  return cleanText(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toUpperCase();
}

function cleanText(value) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\s+/g, " ").trim();
}
