const WEEK_KEYS = ["ULTIMA SEMANA", "1° SEMANA", "2° SEMANA", "3° SEMANA", "4° SEMANA"];

const GENERAL_INDICATORS = [
  "Tempo Médio de Atendimento - OPA",
  "Tempo Médio de Resposta ao Cliente - OPA",
  "Tempo Médio de Resposta do Cliente - OPA",
  "Quantidade de atendimento realizado pela IA - OPA",
  "Qualidade Percebida na Avaliação Geral - OPA",
  "Taxa de Cumprimento de SLA em (%) Ativação de Login - N2",
  "Quantidade de Atendimentos Realizados pela Equipe - N2",
  "Quantidade de Atendimentos que foi a campo - IXC",
  "Quantidade de Atendimentos Solucionados - IXC",
  "Quantidade de Atendimentos realizados - IXC",
  "Quantidade de Pesquisa de Satisfação Realizados - IXC",
  "Qualidade Percebida na Satisfação em % - IXC",
  "Taxa de Cliente que entrou em contato com o suporte em %",
  "Quantidade Total de Cliente UNI - IXC"
];

const N1_HEADERS = [
  "Nome do colaborador",
  "Registros Operacional",
  "Registro Financeiro",
  "O.S Aberta a Campo",
  "Quantidade de Ligação Atendida x Recusadas",
  "Quantidade de Atendimento OPASuite",
  "Avaliação Individual",
  "Tempo Médio de Atendimento",
  "Tempo Médio de Resposta"
];

const N2_HEADERS = [
  "Nome do colaborador",
  "Ativação de Novo Login",
  "O.S Aberta a Campo",
  "Atendimento Externo",
  "Atendimento Interno"
];

const state = {
  week: "ULTIMA SEMANA",
  team: "N1",
  data: {
    general: {},
    employees: { N1: [], N2: [] }
  },
  charts: {}
};

const el = {
  fileInput: document.querySelector("#fileInput"),
  fileStatus: document.querySelector("#fileStatus"),
  weekFilter: document.querySelector("#weekFilter"),
  teamToggle: document.querySelector("#teamToggle"),
  kpiGrid: document.querySelector("#overview"),
  lineMetric: document.querySelector("#lineMetric"),
  pieMetric: document.querySelector("#pieMetric"),
  barMetric: document.querySelector("#barMetric"),
  goalList: document.querySelector("#goalList"),
  searchInput: document.querySelector("#searchInput"),
  tableHead: document.querySelector("#tableHead"),
  tableBody: document.querySelector("#tableBody"),
  exportCsv: document.querySelector("#exportCsv")
};

document.addEventListener("DOMContentLoaded", () => {
  seedEmptyState();
  bindEvents();
  render();
});

function bindEvents() {
  el.fileInput.addEventListener("change", handleFile);
  el.weekFilter.addEventListener("click", (event) => setButtonFilter(event, "week"));
  el.teamToggle.addEventListener("click", (event) => setButtonFilter(event, "team"));
  el.searchInput.addEventListener("input", renderTable);
  el.lineMetric.addEventListener("change", renderLineChart);
  el.pieMetric.addEventListener("change", () => {
    renderPieChart();
    renderTable();
  });
  el.barMetric.addEventListener("change", renderBarChart);
  el.exportCsv.addEventListener("click", exportFilteredCsv);
}

function setButtonFilter(event, type) {
  const button = event.target.closest("button");
  if (!button) return;

  button.parentElement.querySelectorAll("button").forEach((item) => item.classList.remove("active"));
  button.classList.add("active");
  state[type] = button.dataset[type];

  fillMetricSelects();
  render();
}

async function handleFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
    const rows = workbook.SheetNames.flatMap((name) =>
      XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, raw: false, defval: "" })
    );

    state.data = parseWorkbookRows(rows);
    el.fileStatus.textContent = file.name;
    document.querySelector(".pulse").style.background = "var(--green)";
    document.querySelector(".pulse").style.boxShadow = "0 0 0 6px rgba(33, 192, 122, 0.13)";
    fillMetricSelects();
    render();
  } catch (error) {
    console.error(error);
    alert("Não foi possível importar o arquivo. Verifique se ele está em CSV ou XLSX válido.");
  }
}

function parseWorkbookRows(rows) {
  const data = {
    general: {},
    employees: { N1: [], N2: [] }
  };

  rows.forEach((row, index) => {
    const label = cleanText(row[0]);
    if (!label) return;

    const matchedIndicator = GENERAL_INDICATORS.find((indicator) => sameText(indicator, label));
    if (matchedIndicator) {
      data.general[matchedIndicator] = {};
      WEEK_KEYS.forEach((week, offset) => {
        data.general[matchedIndicator][week] = normalizeValue(row[offset + 1]);
      });
    }

    if (includesText(label, "EQUIPE DE COLABORADORES N2")) {
      parseEmployeeBlock(rows, index, "N2", data.employees.N2);
    }

    if (includesText(label, "EQUIPE DE COLABORADORES N1")) {
      parseEmployeeBlock(rows, index, "N1", data.employees.N1);
    }
  });

  return data;
}

function parseEmployeeBlock(rows, startIndex, team, target) {
  const week = detectBlockWeek(rows, startIndex);
  const headers = team === "N1" ? N1_HEADERS : N2_HEADERS;

  for (let i = startIndex + 1; i < rows.length; i += 1) {
    const row = rows[i];
    const name = cleanText(row[0]);
    const normalized = normalizeKey(name);

    if (!name) break;
    if (normalized.includes("EQUIPE DE COLABORADORES") || normalized.includes("METRICA MATRIZ")) break;
    if (shouldIgnorePersonRow(normalized)) continue;

    const record = { Equipe: team, Semana: week, [headers[0]]: name };

    if (team === "N1") {
      record[headers[1]] = normalizeValue(row[1]);
      record[headers[2]] = normalizeValue(row[2]);
      record[headers[3]] = normalizeValue(row[3]);
      record[headers[4]] = combineCalls(row[4], row[5]);
      record[headers[5]] = normalizeValue(row[6]);
      record[headers[6]] = normalizeValue(row[7]);
      record[headers[7]] = normalizeValue(row[8]);
      record[headers[8]] = normalizeValue(row[9]);
    } else {
      headers.slice(1).forEach((header, index) => {
        record[header] = normalizeValue(row[index + 1]);
      });
    }

    target.push(record);
  }
}

function detectBlockWeek(rows, startIndex) {
  for (let i = startIndex; i >= Math.max(0, startIndex - 8); i -= 1) {
    const text = normalizeKey(rows[i].join(" "));
    const found = WEEK_KEYS.find((week) => text.includes(normalizeKey(week).replace("°", "")) || text.includes(normalizeKey(week)));
    if (found) return found;
  }
  return "ULTIMA SEMANA";
}

function fillMetricSelects() {
  fillSelect(el.lineMetric, Object.keys(state.data.general), GENERAL_INDICATORS[0]);

  const employeeRows = getEmployeeRows({ fallback: true });
  const headers = state.team === "N1" ? N1_HEADERS.slice(1) : N2_HEADERS.slice(1);
  const numericHeaders = headers.filter((header) => employeeRows.some((row) => Number.isFinite(valueAsNumber(row[header]))));

  fillSelect(el.pieMetric, numericHeaders, numericHeaders[0]);
  const defaultRanking = state.team === "N1" && numericHeaders.includes("Registros Operacional")
    ? "Registros Operacional"
    : numericHeaders[0];
  fillSelect(el.barMetric, numericHeaders, defaultRanking);
}

function fillSelect(select, options, preferred) {
  const current = select.value;
  select.innerHTML = "";
  options.forEach((option) => {
    const item = document.createElement("option");
    item.value = option;
    item.textContent = option;
    select.appendChild(item);
  });
  select.value = options.includes(current) ? current : options.includes(preferred) ? preferred : options[0] || "";
}

function render() {
  renderKpis();
  renderLineChart();
  renderPieChart();
  renderBarChart();
  renderGoals();
  renderTable();
}

function renderKpis() {
  const preferred = [
    "Tempo Médio de Atendimento - OPA",
    "Qualidade Percebida na Avaliação Geral - OPA",
    "Taxa de Cumprimento de SLA em (%) Ativação de Login - N2",
    "Quantidade de Atendimentos realizados - IXC"
  ];

  el.kpiGrid.innerHTML = preferred.map((name) => {
    const value = state.data.general[name]?.[state.week];
    const status = getGoalStatus(name, value);
    return `
      <article class="kpi-card">
        <div class="label">${name}</div>
        <div class="value">${formatValue(value, name)}</div>
        <span class="status-pill ${status.className}">${status.label}</span>
      </article>
    `;
  }).join("");
}

function renderLineChart() {
  const metric = el.lineMetric.value || Object.keys(state.data.general)[0];
  const values = WEEK_KEYS.map((week) => valueAsNumber(state.data.general[metric]?.[week]));
  const ctx = document.querySelector("#lineChart");

  state.charts.line?.destroy();
  state.charts.line = new Chart(ctx, {
    type: "line",
    data: {
      labels: WEEK_KEYS.map(formatWeekLabel),
      datasets: [{
        label: metric || "Indicador",
        data: values,
        borderColor: "#38bdf8",
        backgroundColor: "rgba(56, 189, 248, 0.14)",
        tension: 0.35,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: chartOptions()
  });
}

function renderPieChart() {
  const metric = el.pieMetric.value;
  const rows = getEmployeeRows({ fallback: true })
    .filter((row) => Number.isFinite(valueAsNumber(row[metric])))
    .sort((a, b) => valueAsNumber(b[metric]) - valueAsNumber(a[metric]))
    .slice(0, 10);

  state.charts.pie?.destroy();
  state.charts.pie = new Chart(document.querySelector("#pieChart"), {
    type: "doughnut",
    data: {
      labels: rows.map((row) => shortName(row["Nome do colaborador"])),
      datasets: [{
        data: rows.map((row) => valueAsNumber(row[metric])),
        backgroundColor: ["#21c07a", "#38bdf8", "#f0b429", "#ef5b5b", "#a78bfa", "#14b8a6", "#f97316", "#84cc16", "#60a5fa", "#f472b6"],
        borderColor: "#12161d",
        borderWidth: 2
      }]
    },
    options: {
      ...chartOptions(),
      cutout: "62%",
      scales: {}
    }
  });
}

function renderBarChart() {
  const metric = el.barMetric.value;
  const rows = getEmployeeRows({ fallback: true })
    .filter((row) => Number.isFinite(valueAsNumber(row[metric])))
    .sort((a, b) => valueAsNumber(b[metric]) - valueAsNumber(a[metric]))
    .slice(0, 12);

  state.charts.bar?.destroy();
  state.charts.bar = new Chart(document.querySelector("#barChart"), {
    type: "bar",
    data: {
      labels: rows.map((row) => shortName(row["Nome do colaborador"])),
      datasets: [{
        label: metric || "Ranking",
        data: rows.map((row) => valueAsNumber(row[metric])),
        backgroundColor: "rgba(33, 192, 122, 0.72)",
        borderColor: "#21c07a",
        borderWidth: 1,
        borderRadius: 6
      }]
    },
    options: chartOptions()
  });
}

function renderGoals() {
  const items = GENERAL_INDICATORS.slice(0, 8).map((name) => {
    const value = state.data.general[name]?.[state.week];
    const status = getGoalStatus(name, value);
    return `
      <div class="goal-item">
        <div>
          <strong>${name}</strong>
          <span>${formatValue(value, name)}</span>
        </div>
        <span class="status-pill ${status.className}">${status.label}</span>
      </div>
    `;
  });

  el.goalList.innerHTML = items.join("");
}

function renderTable() {
  const search = normalizeKey(el.searchInput.value);
  const rows = getEmployeeRows({ fallback: true })
    .filter((row) => normalizeKey(row["Nome do colaborador"]).includes(search))
    .sort((a, b) => valueAsNumber(b[el.barMetric.value]) - valueAsNumber(a[el.barMetric.value]));
  const headers = state.team === "N1" ? N1_HEADERS : N2_HEADERS;

  el.tableHead.innerHTML = `<tr>${["Equipe", "Semana", ...headers].map((header) => `<th>${header}</th>`).join("")}</tr>`;

  if (!rows.length) {
    el.tableBody.innerHTML = `<tr><td class="empty-state" colspan="${headers.length + 2}">Nenhum colaborador encontrado para os filtros atuais.</td></tr>`;
    return;
  }

  el.tableBody.innerHTML = rows.map((row) => `
    <tr>
      ${["Equipe", "Semana", ...headers].map((header) => `<td>${formatValue(row[header], header)}</td>`).join("")}
    </tr>
  `).join("");
}

function getEmployeeRows({ fallback = false } = {}) {
  const rows = state.data.employees[state.team] || [];
  const filtered = rows.filter((row) => row.Semana === state.week);
  return filtered.length || !fallback ? filtered : rows;
}

function getGoalStatus(name, rawValue) {
  const value = valueAsNumber(rawValue);
  if (!Number.isFinite(value)) return { label: "Sem dados", className: "status-warn" };

  const isTime = includesText(name, "TEMPO MEDIO");
  const isQuality = includesText(name, "QUALIDADE") || includesText(name, "SLA");
  const isSupportRate = includesText(name, "CLIENTE QUE ENTROU");

  if (isTime) {
    if (value <= 0.025) return { label: "Dentro da meta", className: "status-good" };
    if (value <= 0.05) return { label: "Atenção", className: "status-warn" };
    return { label: "Crítico", className: "status-bad" };
  }

  if (isQuality) {
    if (value >= 0.95 || value >= 4.5) return { label: "Dentro da meta", className: "status-good" };
    if (value >= 0.9 || value >= 4.0) return { label: "Atenção", className: "status-warn" };
    return { label: "Crítico", className: "status-bad" };
  }

  if (isSupportRate) {
    if (value <= 0.03) return { label: "Dentro da meta", className: "status-good" };
    if (value <= 0.04) return { label: "Atenção", className: "status-warn" };
    return { label: "Crítico", className: "status-bad" };
  }

  if (value > 0) return { label: "Monitorado", className: "status-good" };
  return { label: "Atenção", className: "status-warn" };
}

function exportFilteredCsv() {
  const rows = getEmployeeRows({ fallback: true })
    .filter((row) => normalizeKey(row["Nome do colaborador"]).includes(normalizeKey(el.searchInput.value)));
  const headers = ["Equipe", "Semana", ...(state.team === "N1" ? N1_HEADERS : N2_HEADERS)];
  const csv = [headers, ...rows.map((row) => headers.map((header) => formatValue(row[header], header)))]
    .map((line) => line.map(csvCell).join(";"))
    .join("\n");

  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `indicadores-${state.team}-${state.week.toLowerCase().replaceAll(" ", "-")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function seedEmptyState() {
  GENERAL_INDICATORS.forEach((indicator) => {
    state.data.general[indicator] = {};
    WEEK_KEYS.forEach((week) => {
      state.data.general[indicator][week] = "";
    });
  });
  fillMetricSelects();
}

function normalizeValue(value) {
  if (value === null || value === undefined) return "";
  const text = cleanText(value);
  if (!text || normalizeKey(text) === "S R") return "";

  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(text)) return text;
  if (text.includes("%")) return parseLocaleNumber(text.replace("%", "")) / 100;

  const parsed = parseLocaleNumber(text);
  return Number.isFinite(parsed) ? parsed : text;
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
    const afterDot = text.slice(dot + 1);
    normalized = afterDot.length === 3 ? text.replace(/\./g, "") : text.replace(/,/g, "");
  }

  return Number(normalized);
}

function valueAsNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return NaN;
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(value)) {
    const parts = value.split(":").map(Number);
    return ((parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0)) / 86400;
  }
  const parsed = normalizeValue(value);
  return typeof parsed === "number" ? parsed : NaN;
}

function formatValue(value, context = "") {
  if (value === "" || value === undefined || value === null) return "-";
  const numeric = valueAsNumber(value);
  const normalizedContext = normalizeKey(context);

  if (typeof value === "string" && value.includes("/")) return value;
  if (typeof value === "string" && /^\d{1,2}:\d{2}(:\d{2})?$/.test(value)) return value;
  if (!Number.isFinite(numeric)) return String(value);

  if (normalizedContext.includes("TEMPO MEDIO") || (numeric > 0 && numeric < 0.09 && normalizedContext.includes("TEMPO"))) {
    return excelTimeToLabel(numeric);
  }
  if (normalizedContext.includes("%") || normalizedContext.includes("TAXA") || normalizedContext.includes("SLA") || normalizedContext.includes("SATISFACAO")) {
    return `${(numeric * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
  }
  if (normalizedContext.includes("AVALIACAO") || normalizedContext.includes("QUALIDADE")) {
    return numeric.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return numeric.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

function excelTimeToLabel(value) {
  const totalSeconds = Math.round(value * 86400);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

function combineCalls(answered, refused) {
  const first = normalizeValue(answered);
  const second = normalizeValue(refused);
  if (first === "" && second === "") return "";
  if (second === "") return first;
  return `${formatValue(first)} / ${formatValue(second)}`;
}

function chartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: "#d8e0ea", boxWidth: 12 }
      },
      tooltip: {
        backgroundColor: "#0d1117",
        borderColor: "#26313d",
        borderWidth: 1,
        titleColor: "#e6edf3",
        bodyColor: "#d8e0ea"
      }
    },
    scales: {
      x: {
        ticks: { color: "#8b98a8", maxRotation: 35, minRotation: 0 },
        grid: { color: "rgba(38, 49, 61, 0.48)" }
      },
      y: {
        ticks: { color: "#8b98a8" },
        grid: { color: "rgba(38, 49, 61, 0.48)" },
        beginAtZero: true
      }
    }
  };
}

function shouldIgnorePersonRow(normalized) {
  return ["TOTAL", "META", "MEDIA", "MÉDIA", "INDICADOR"].some((word) => normalized.includes(normalizeKey(word)));
}

function sameText(a, b) {
  return normalizeKey(a) === normalizeKey(b);
}

function includesText(text, search) {
  return normalizeKey(text).includes(normalizeKey(search));
}

function normalizeKey(value) {
  return cleanText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[ºª°]/g, "")
    .replace(/[^A-Z0-9%]+/gi, " ")
    .trim()
    .toUpperCase();
}

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function shortName(name) {
  const parts = cleanText(name).split(" ").filter(Boolean);
  if (parts.length <= 2) return parts.join(" ");
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

function formatWeekLabel(week) {
  return week.replace("ULTIMA", "Última").replace("1°", "1ª").replace("2°", "2ª").replace("3°", "3ª").replace("4°", "4ª");
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}
