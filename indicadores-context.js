const GOOGLE_SHEETS_GENERAL_XLSX_URL = "https://docs.google.com/spreadsheets/d/1aZdeCuJreUJm2G-LeyLMDchUec4oMSl3dgX_S8pR_48/export?format=xlsx";
const XLSX_CDN = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";

const metricDefinitions = [
  { name: "Tempo Medio de Atendimento - OPA", type: "time", goalKey: "tmaMax", goalDirection: "max", aliases: ["tempo medio de atendimento - opa", "tempo medio de atendimento - fluctus", "tempo medio de atendimento", "tma"] },
  { name: "Tempo Medio de Resposta ao Cliente - OPA", type: "time", goalKey: "tmrMax", goalDirection: "max", aliases: ["tempo medio de resposta ao cliente - opa", "tempo medio de resposta ao cliente - fluctus", "tempo medio de resposta ao cliente", "tmr"] },
  { name: "Tempo Medio de Resposta do Cliente - OPA", type: "time", aliases: ["tempo medio de resposta do cliente - opa", "tempo medio de resposta do cliente - fluctus", "tempo medio de resposta do cliente"] },
  { name: "Quantidade de atendimento realizado pela IA - OPA", type: "number", aliases: ["quantidade de atendimento realizado pela ia - opa"] },
  { name: "Qualidade Percebida na Avaliacao Geral - OPA", type: "score", goalKey: "qualityScoreMin", goalDirection: "min", aliases: ["qualidade percebida na avaliacao geral - opa", "qualidade percebida na avaliacao geral - fluctus", "qualidade percebida na avaliacao geral"] },
  { name: "Taxa de Cumprimento de SLA em (%) Ativacao de Login - N2", type: "percent", goalKey: "slaMin", goalDirection: "min", aliases: ["taxa de cumprimento de sla em (%) ativacao de login - n2", "taxa de cumprimento de sla em (%) ativacao de login"] },
  { name: "Quantidade de Atendimentos Realizados pela Equipe - N2", type: "number", aliases: ["quantidade de atendimentos realizados pela equipe - n2"] },
  { name: "Quantidade de Atendimentos que foi a campo - IXC", type: "number", goalKey: "fieldOpenMax", goalDirection: "max", aliases: ["quantidade de atendimentos que foi a campo - ixc", "quantidade de atendimentos que foi a campo"] },
  { name: "Quantidade de Atendimentos Solucionados - IXC", type: "number", goalKey: "solvedTicketsMin", goalDirection: "min", aliases: ["quantidade de atendimentos solucionados - ixc", "quantidade de atendimentos solucionados - fluctus", "quantidade de atendimentos solucionados"] },
  { name: "Quantidade de Atendimentos realizados - IXC", type: "number", goalKey: "totalTicketsMax", goalDirection: "max", aliases: ["quantidade de atendimentos realizados - ixc", "quantidade de atendimentos realizados - fluctus", "quantidade de atendimentos realizados"] },
  { name: "Quantidade de Pesquisa de Satisfacao Realizados - IXC", type: "number", aliases: ["quantidade de pesquisa de satisfacao realizados - ixc", "quantidade de pesquisa de satisfacao realizados"] },
  { name: "Qualidade Percebida na Satisfacao em % - IXC", type: "percent", goalKey: "satisfactionMin", goalDirection: "min", aliases: ["qualidade percebida na satisfacao em % - ixc", "qualidade percebida na satisfacao em %"] },
  { name: "Taxa de Cliente que entrou em contato com o suporte em %", type: "percent", aliases: ["taxa de cliente que entrou em contato com o suporte em %"] },
  { name: "Quantidade Total de Cliente UNI - IXC", type: "number", aliases: ["quantidade total de cliente uni - ixc", "quantidade total de cliente uni"] }
];

let cachedWorkbook = null;
let cachedGoals = null;

const defaultIndicatorGoals = {
  tmaMax: "00:05:00",
  tmrMax: "00:02:00",
  slaMin: 90,
  satisfactionMin: 85,
  qualityScoreMin: 4.5,
  fieldOpenMax: 450,
  solvedTicketsMin: 1400,
  solvedMin: 75,
  totalTicketsMax: 2200
};

export async function buildIndicadoresContextForQuestion(question, profile) {
  const canAccess = window.SGPAuth?.canAccess?.(profile.role, "apresentacao.html");
  if (!canAccess || !isIndicadoresQuestion(question)) return { context: "", directAnswer: "" };

  try {
    const parsed = await loadIndicadoresWorkbook();
    const month = parsed.months[parsed.monthOrder[parsed.monthOrder.length - 1]];
    if (!month) {
      return { context: "", directAnswer: "Nao encontrei dados de Indicadores Gerais carregados na planilha." };
    }

    const period = choosePeriod(month.periods, question);
    const previousPeriod = choosePreviousPeriod(month.periods, period);
    const goals = await loadIndicatorGoals();
    const metrics = metricDefinitions
      .map((definition) => metricSnapshot(month, definition, period, previousPeriod, goals))
      .filter(Boolean);

    const requestedMetric = requestedMetricDefinition(question);
    if (requestedMetric) {
      const snapshot = metricSnapshot(month, requestedMetric, period, previousPeriod, goals);
      if (!snapshot) {
        return { context: "", directAnswer: `Nao encontrei o indicador ${requestedMetric.name} na planilha.` };
      }

      const deltaText = snapshot.deltaLabel ? ` Variação vs. ${snapshot.previousLabel}: ${snapshot.deltaLabel}.` : "";
      const goalText = snapshot.goalText ? ` ${snapshot.goalText}` : "";
      return {
        context: "",
        directAnswer: `${snapshot.name} em ${month.label}, ${snapshot.periodLabel}: ${snapshot.valueLabel}.${deltaText}${goalText}`
      };
    }

    if (isOperationalSummaryQuestion(question)) {
      return {
        context: "",
        directAnswer: formatOperationalSummary(month, period, metrics)
      };
    }

    return {
      directAnswer: "",
      context: [
        `Contexto de Indicadores Gerais permitido para o cargo ${profile.role || "viewer"}.`,
        `Mes analisado: ${month.label}. Periodo: ${period.label}.`,
        ...metrics.slice(0, 10).map((item) => `${item.name}: ${item.valueLabel}${item.deltaLabel ? ` (${item.deltaLabel} vs. ${item.previousLabel})` : ""}${item.goalText ? ` - ${item.goalText}` : ""}`)
      ].join("\n")
    };
  } catch (error) {
    console.error(error);
    return {
      context: "",
      directAnswer: "Nao consegui consultar os Indicadores Gerais agora. Confira se a planilha esta publica."
    };
  }
}

function isIndicadoresQuestion(question) {
  const text = normalizeText(question);
  return [
    "TMA",
    "TEMPO MEDIO",
    "INDICADOR",
    "INDICADORES",
    "ULTIMA SEMANA",
    "ATENDIMENTOS",
    "RESOLUTIVIDADE",
    "SLA",
    "QUALIDADE",
    "SATISFACAO",
    "RESUMO",
    "OPERACIONAL",
    "O QUE DEVO OLHAR",
    "O QUE OLHAR",
    "ALERTA",
    "ALERTAS",
    "PIOROU",
    "MELHOROU"
  ].some((word) => text.includes(word));
}

function isOperationalSummaryQuestion(question) {
  const text = normalizeText(question);
  return [
    "RESUMO",
    "OPERACIONAL",
    "O QUE DEVO OLHAR",
    "O QUE OLHAR",
    "ALERTA",
    "ALERTAS",
    "PIOROU",
    "MELHOROU",
    "ULTIMA SEMANA"
  ].some((word) => text.includes(word));
}

function requestedMetricDefinition(question) {
  const text = normalizeText(question);
  if (text.includes("TMA") || text.includes("TEMPO MEDIO DE ATENDIMENTO")) {
    return metricDefinitions[0];
  }
  if (text.includes("TMR") || text.includes("TEMPO MEDIO DE RESPOSTA")) {
    return metricDefinitions[1];
  }
  if (text.includes("SLA")) {
    return metricDefinitions.find((item) => normalizeText(item.name).includes("SLA"));
  }
  if (text.includes("QUALIDADE") || text.includes("AVALIACAO")) {
    return metricDefinitions.find((item) => normalizeText(item.name).includes("QUALIDADE PERCEBIDA NA AVALIACAO"));
  }
  if (text.includes("SATISFACAO")) {
    return metricDefinitions.find((item) => normalizeText(item.name).includes("SATISFACAO"));
  }
  if (text.includes("ATENDIMENTOS REALIZADOS")) {
    return metricDefinitions.find((item) => normalizeText(item.name).includes("ATENDIMENTOS REALIZADOS - IXC"));
  }
  return null;
}

async function loadIndicadoresWorkbook() {
  if (cachedWorkbook) return cachedWorkbook;

  await ensureXlsx();
  const response = await fetch(`${GOOGLE_SHEETS_GENERAL_XLSX_URL}&_=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Google Sheets retornou ${response.status}.`);
  const buffer = await response.arrayBuffer();
  const workbook = window.XLSX.read(buffer, { type: "array", cellDates: false });
  const sheets = workbook.SheetNames.map((name) => ({
    name,
    rows: window.XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, raw: false, defval: "" })
  }));
  cachedWorkbook = parseWorkbook(sheets);
  return cachedWorkbook;
}

async function loadIndicatorGoals() {
  if (cachedGoals) return cachedGoals;

  for (let attempt = 0; attempt < 60; attempt += 1) {
    const goals = window.SGPAuth?.indicatorGoals?.();
    if (goals && document.documentElement.dataset.authReady === "true") {
      cachedGoals = { ...defaultIndicatorGoals, ...goals };
      return cachedGoals;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 100));
  }

  cachedGoals = { ...defaultIndicatorGoals };
  return cachedGoals;
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

function parseWorkbook(sheets) {
  const parsedMonths = {};
  sheets.forEach((sheet) => {
    const monthData = parseMonthSheet(sheet);
    if (monthData) parsedMonths[monthData.id] = monthData;
  });
  const monthOrder = Object.values(parsedMonths)
    .sort((a, b) => a.sortKey - b.sortKey)
    .map((item) => item.id);
  return { months: parsedMonths, monthOrder };
}

function parseMonthSheet(sheet) {
  const headerRowIndex = findHeaderRowIndex(sheet.rows);
  if (headerRowIndex === -1) return null;
  const headerRow = sheet.rows[headerRowIndex] || [];
  const periods = extractPeriods(headerRow);
  if (!periods.length) return null;
  const metrics = metricDefinitions.map((definition) => parseMetricRow(sheet.rows, definition, periods.length));
  if (metrics.filter((metric) => metric.matched).length < 5) return null;
  const monthMeta = buildMonthMeta(sheet.name, headerRow[0], headerRowIndex);
  return {
    id: monthMeta.id,
    label: monthMeta.label,
    sortKey: monthMeta.sortKey,
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

function choosePeriod(periods, question) {
  const text = normalizeText(question);
  if (text.includes("ULTIMA SEMANA")) {
    return periods.find((period) => normalizeText(period.label).includes("ULTIMA")) || periods[0] || { key: "", label: "-" };
  }
  if (text.includes("SEMANA 1") || text.includes("1 SEMANA")) return periods.find((period) => normalizeText(period.label).includes("1")) || periods[0];
  if (text.includes("SEMANA 2") || text.includes("2 SEMANA")) return periods.find((period) => normalizeText(period.label).includes("2")) || periods[0];
  if (text.includes("SEMANA 3") || text.includes("3 SEMANA")) return periods.find((period) => normalizeText(period.label).includes("3")) || periods[0];
  if (text.includes("SEMANA 4") || text.includes("4 SEMANA")) return periods.find((period) => normalizeText(period.label).includes("4")) || periods[0];
  return periods.find((period) => normalizeText(period.label).includes("ULTIMA")) || periods[0] || { key: "", label: "-" };
}

function choosePreviousPeriod(periods, period) {
  const index = periods.findIndex((item) => item.key === period.key);
  if (index === 0 && periods[1]) return periods[1];
  if (index > 0) return periods[index - 1];
  return null;
}

function metricSnapshot(month, definition, period, previousPeriod, goals = defaultIndicatorGoals) {
  const metric = month.metrics.find((item) => normalizeText(item.name) === normalizeText(definition.name));
  if (!metric || !metric.matched) return null;
  const value = metric.values[period.key];
  const previousValue = previousPeriod ? metric.values[previousPeriod.key] : "";
  const delta = previousPeriod ? deltaValue(value, previousValue, metric.type, metric.name) : null;
  const goal = evaluateGoal(value, metric.type, definition, goals);
  return {
    name: metric.name,
    type: metric.type,
    value,
    valueLabel: format(value, metric.type),
    periodLabel: period.label,
    previousLabel: previousPeriod?.label || "",
    deltaLabel: deltaLabel(delta, metric.type),
    goalStatus: goal.status,
    goalText: goal.text
  };
}

function evaluateGoal(value, type, definition, goals) {
  if (!definition.goalKey || value === "" || value === null || value === undefined) {
    return { status: "", text: "" };
  }

  const rawGoal = goals[definition.goalKey] ?? defaultIndicatorGoals[definition.goalKey];
  const valueNumber = type === "time" ? timeToSeconds(value) : Number(value);
  const goalNumber = type === "time" ? timeToSeconds(rawGoal) : type === "percent" ? Number(rawGoal) / 100 : Number(rawGoal);
  if (!Number.isFinite(valueNumber) || !Number.isFinite(goalNumber)) return { status: "", text: "" };

  const isGood = definition.goalDirection === "max" ? valueNumber <= goalNumber : valueNumber >= goalNumber;
  const goalLabel = type === "percent" ? `${Number(rawGoal).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%` : String(rawGoal);
  return {
    status: isGood ? "good" : "bad",
    text: isGood ? `Dentro da meta (${goalLabel}).` : `Fora da meta (${goalLabel}).`
  };
}

function formatOperationalSummary(month, period, metrics) {
  const selected = metrics.slice(0, 8);
  const lines = selected.map((item) => {
    const delta = item.deltaLabel ? ` (${item.deltaLabel} vs. ${item.previousLabel})` : "";
    const goal = item.goalText ? ` - ${item.goalText}` : "";
    return `- ${item.name}: ${item.valueLabel}${delta}${goal}`;
  });

  const alerts = selected
    .filter((item) => item.goalStatus === "bad" || (item.deltaLabel && item.deltaLabel !== "sem variacao"))
    .slice(0, 4)
    .map((item) => item.goalStatus === "bad"
      ? `- Conferir ${item.name}: ${item.valueLabel} está fora da meta.`
      : `- Conferir ${item.name}: ${item.deltaLabel} vs. ${item.previousLabel}.`);

  return [
    `Resumo de Indicadores Gerais - ${month.label}, ${period.label}:`,
    ...lines,
    "",
    "Pontos de atenção:",
    ...(alerts.length ? alerts : ["- Sem variações relevantes nos indicadores lidos."])
  ].join("\n");
}

function buildMonthMeta(sheetName, titleCell, headerRowIndex) {
  const label = prettifyMonthLabel(sheetName);
  const sortKey = monthSortKey(sheetName, titleCell, headerRowIndex);
  return { id: normalizeText(sheetName), label, sortKey };
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
    MARCO: "Marco",
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
  const year = yearMatch ? (yearMatch[1].length === 2 ? `20${yearMatch[1]}` : yearMatch[1]) : "";
  return `${monthMap[monthName] || clean(sheetName)}${year ? ` ${year}` : ""}`;
}

function isMetricRow(cell, aliases) {
  const normalized = normalizeText(cell);
  return aliases.some((alias) => normalized === normalizeText(alias));
}

function normalizeImportedValue(value, type, metricName = "") {
  const text = clean(value);
  if (!text || ["S/R", "N/A", "-", "---", "<", ">"].includes(normalizeText(text))) return "";
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

function format(value, type) {
  if (value === "" || value === null || value === undefined || Number.isNaN(value)) return "-";
  if (type === "percent") return `${(value * 100).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`;
  if (type === "score") return Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (type === "number") return Number(value).toLocaleString("pt-BR");
  return value;
}

function deltaValue(current, base, type, metricName = "") {
  if (current === "" || base === "" || current === null || base === null || current === undefined || base === undefined) return null;
  if (type === "time") return timeToSeconds(current) - timeToSeconds(base);
  const currentNumber = normalizeMetricNumber(current, metricName);
  const baseNumber = normalizeMetricNumber(base, metricName);
  return Number.isFinite(currentNumber) && Number.isFinite(baseNumber) ? currentNumber - baseNumber : null;
}

function deltaLabel(delta, type) {
  if (delta === null || delta === undefined || Number.isNaN(delta)) return "";
  if (!delta) return "sem variacao";
  if (type === "time") return `${delta > 0 ? "+" : "-"}${secondsToTime(Math.abs(delta))}`;
  const signal = delta > 0 ? "+" : "-";
  if (type === "percent") return `${signal}${(Math.abs(delta) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} p.p.`;
  return `${signal}${Math.abs(delta).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}

function normalizeMetricNumber(value, metricName) {
  const number = Number(value);
  if (isLargeCountMetric(metricName) && number > 0 && number < 100) return Math.round(number * 1000);
  return number;
}

function isLargeCountMetric(name) {
  return [
    "Quantidade de Atendimentos realizados - IXC",
    "Quantidade de Atendimentos que foi a campo - IXC",
    "Quantidade de Atendimentos Solucionados - IXC",
    "Quantidade de Pesquisa de Satisfacao Realizados - IXC",
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

function excelTimeToLabel(value) {
  return secondsToTime(Math.round(value * 86400));
}

function normalizeTimeLabel(value) {
  const parts = String(value).split(":").map(Number);
  const hours = parts.length === 3 ? parts[0] : 0;
  const minutes = parts.length === 3 ? parts[1] : parts[0];
  const seconds = parts.length === 3 ? parts[2] : parts[1];
  return [hours, minutes, seconds || 0].map((part) => String(part || 0).padStart(2, "0")).join(":");
}

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeText(value) {
  return clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}
