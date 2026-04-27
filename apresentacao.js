const weeks = [
  { key: "ultima", label: "Última Semana" },
  { key: "s1", label: "1ª Semana" },
  { key: "s2", label: "2ª Semana" },
  { key: "s3", label: "3ª Semana" },
  { key: "s4", label: "4ª Semana" }
];

const metricDefinitions = [
  ["Tempo Médio de Atendimento - OPA", "time"],
  ["Tempo Médio de Resposta ao Cliente - OPA", "time"],
  ["Tempo Médio de Resposta do Cliente - OPA", "time"],
  ["Quantidade de atendimento realizado pela IA - OPA", "number"],
  ["Qualidade Percebida na Avaliação Geral - OPA", "score"],
  ["Taxa de Cumprimento de SLA em (%) Ativação de Login - N2", "percent"],
  ["Quantidade de Atendimentos Realizados pela Equipe - N2", "number"],
  ["Quantidade de Atendimentos que foi a campo - IXC", "number"],
  ["Quantidade de Atendimentos Solucionados - IXC", "number"],
  ["Quantidade de Atendimentos realizados - IXC", "number"],
  ["Quantidade de Pesquisa de Satisfação Realizados - IXC", "number"],
  ["Qualidade Percebida na Satisfação em % - IXC", "percent"],
  ["Taxa de Cliente que entrou em contato com o suporte em %", "percent"],
  ["Quantidade Total de Cliente UNI - IXC", "number"]
];

let data = metricDefinitions.map(([name, type]) => ({ name, type, values: emptyWeekValues() }));

let selectedWeek = "ultima";
let charts = {};

document.addEventListener("DOMContentLoaded", () => {
  setupTheme();
  loadImportedRows();
  document.querySelector("#fileInput").addEventListener("change", handleImport);
  document.querySelector("#reportButton").addEventListener("click", () => window.print());
  document.querySelector("#weekTabs").addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    selectedWeek = button.dataset.week;
    document.querySelectorAll("#weekTabs button").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    render();
  });

  render();
});

async function handleImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const rows = await readWorkbookRows(file);
    sessionStorage.setItem("indicadoresWorkbookRows", JSON.stringify(rows));
    sessionStorage.setItem("indicadoresWorkbookName", file.name);
    sessionStorage.setItem("indicadoresImportedAt", new Date().toLocaleString("pt-BR"));
    applyGeneralRows(rows);
    render();
  } catch (error) {
    console.error(error);
    alert("Não foi possível importar a planilha. Confira se o arquivo segue o modelo da matriz.");
  }
}

function loadImportedRows() {
  const savedRows = sessionStorage.getItem("indicadoresWorkbookRows");
  if (!savedRows) return;
  try {
    applyGeneralRows(JSON.parse(savedRows));
  } catch (error) {
    sessionStorage.removeItem("indicadoresWorkbookRows");
  }
}

function applyGeneralRows(rows) {
    const importedRows = rows
      .filter((row) => clean(row[0]) && !normalizeText(row[0]).includes("METRICA MATRIZ"))
      .slice(0, data.length);

    if (importedRows.length < 8) throw new Error("Indicadores gerais não encontrados.");

    data = data.map((metric, index) => {
      const row = importedRows[index] || [];
      return {
        ...metric,
        name: metric.name,
        values: {
          ultima: normalizeImportedValue(row[1], metric.type, metric.name),
          s1: normalizeImportedValue(row[2], metric.type, metric.name),
          s2: normalizeImportedValue(row[3], metric.type, metric.name),
          s3: normalizeImportedValue(row[4], metric.type, metric.name),
          s4: normalizeImportedValue(row[5], metric.type, metric.name)
        }
      };
    });
    updateImportStatus(rows);
    renderValidation(importedRows);
}

async function readWorkbookRows(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
  return workbook.SheetNames.flatMap((name) =>
    XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, raw: false, defval: "" })
  );
}

function render() {
  renderKpis();
  renderExecutiveSummary();
  renderGoals();
  renderSummary();
  renderTable();
  renderCharts();
}

function renderExecutiveSummary() {
  const total = byName("Quantidade de Atendimentos realizados - IXC").values[selectedWeek];
  const solved = byName("Quantidade de Atendimentos Solucionados - IXC").values[selectedWeek];
  const tma = byName("Tempo Médio de Atendimento - OPA").values[selectedWeek];
  const ia = byName("Quantidade de atendimento realizado pela IA - OPA").values[selectedWeek];
  const resolved = Number(total) ? `${((Number(solved) / Number(total)) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : "-";

  document.querySelector("#executiveSummary").innerHTML = [
    ["Semana", weeks.find((week) => week.key === selectedWeek).label],
    ["Resolutividade IXC", resolved],
    ["TMA - OPA", format(tma, "time")],
    ["IA - OPA", format(ia, "number")]
  ].map(([label, value]) => `<article class="insight-card"><span>${label}</span><strong>${value}</strong></article>`).join("");
}

function renderKpis() {
  const kpis = [
    "Quantidade de Atendimentos realizados - IXC",
    "Quantidade de Atendimentos Solucionados - IXC",
    "Tempo Médio de Resposta ao Cliente - OPA",
    "Tempo Médio de Atendimento - OPA",
    "Quantidade de atendimento realizado pela IA - OPA"
  ];

  document.querySelector("#kpiBoard").innerHTML = kpis.map((name) => {
    const metric = byName(name);
    const current = metric.values[selectedWeek];
    const baseWeek = comparisonWeekKey();
    const base = metric.values[baseWeek];
    const delta = deltaValue(current, base, metric.type, metric.name);

    return `
      <article class="kpi">
        <div class="label">${name}</div>
        <div class="value">${format(current, metric.type)}</div>
        <div class="change">${deltaLabel(delta, metric.type)} vs. ${weekLabel(baseWeek)}</div>
      </article>
    `;
  }).join("");
}

function renderGoals() {
  const goals = [
    byName("Tempo Médio de Atendimento - OPA"),
    byName("Quantidade de atendimento realizado pela IA - OPA"),
    byName("Qualidade Percebida na Avaliação Geral - OPA"),
    byName("Taxa de Cumprimento de SLA em (%) Ativação de Login - N2"),
    byName("Qualidade Percebida na Satisfação em % - IXC"),
    byName("Taxa de Cliente que entrou em contato com o suporte em %"),
    byName("Quantidade de Atendimentos realizados - IXC")
  ];

  document.querySelector("#goalList").innerHTML = goals.map((metric) => {
    const status = goalStatus(metric);
    return `
      <div class="goal">
        <div>
          <strong>${metric.name}</strong>
          <span>${format(metric.values[selectedWeek], metric.type)}</span>
        </div>
        <span class="pill ${status.className}">${status.label}</span>
      </div>
    `;
  }).join("");
}

function renderSummary() {
  const solved = byName("Quantidade de Atendimentos Solucionados - IXC").values[selectedWeek];
  const total = byName("Quantidade de Atendimentos realizados - IXC").values[selectedWeek];
  const field = byName("Quantidade de Atendimentos que foi a campo - IXC").values[selectedWeek];
  const customers = byName("Quantidade Total de Cliente UNI - IXC").values[selectedWeek];
  const solvedNumber = Number(solved);
  const totalNumber = Number(total);

  const items = [
    ["Resolutividade IXC", totalNumber ? `${((solvedNumber / totalNumber) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : "-"],
    ["Atendimentos a campo", format(field, "number")],
    ["Clientes UNI", format(customers, "number")],
    ["Semana", weeks.find((week) => week.key === selectedWeek).label]
  ];

  document.querySelector("#summary").innerHTML = items.map(([label, value]) => `
    <div class="summary-item">
      <span>${label}</span>
      <strong>${value}</strong>
    </div>
  `).join("");
}

function renderTable() {
  document.querySelector("#tableHead").innerHTML = `
    <tr>
      <th>Indicador</th>
      ${weeks.map((week) => `<th>${week.label}</th>`).join("")}
    </tr>
  `;

  document.querySelector("#tableBody").innerHTML = data.map((metric) => `
    <tr>
      <td>${metric.name}</td>
      ${weeks.map((week) => `<td>${format(metric.values[week.key], metric.type)}</td>`).join("")}
    </tr>
  `).join("");
}

function renderCharts() {
  const labels = weeks.map((week) => week.label);
  const ixcMetrics = [
    byName("Quantidade de Atendimentos realizados - IXC"),
    byName("Quantidade de Atendimentos Solucionados - IXC"),
    byName("Quantidade de Atendimentos que foi a campo - IXC")
  ];

  charts.ixc?.destroy();
  charts.ixc = new Chart(document.querySelector("#ixcChart"), {
    type: "bar",
    data: {
      labels,
      datasets: ixcMetrics.map((metric, index) => ({
        label: metric.name.replace("Quantidade de ", ""),
        data: weeks.map((week) => chartNumber(metric, week.key)),
        backgroundColor: ["rgba(57, 169, 255, 0.72)", "rgba(32, 199, 123, 0.72)", "rgba(242, 184, 75, 0.72)"][index],
        borderColor: ["#39a9ff", "#20c77b", "#f2b84b"][index],
        borderWidth: 1,
        borderRadius: 6
      }))
    },
    options: chartOptions()
  });

  charts.main?.destroy();
  charts.main = new Chart(document.querySelector("#mainChart"), {
    type: "line",
    data: {
      labels,
      datasets: [
        lineDataset("IA - OPA", byName("Quantidade de atendimento realizado pela IA - OPA"), "#39a9ff"),
        lineDataset("Equipe N2", byName("Quantidade de Atendimentos Realizados pela Equipe - N2"), "#b491ff"),
        lineDataset("Pesquisa IXC", byName("Quantidade de Pesquisa de Satisfação Realizados - IXC"), "#f2b84b")
      ]
    },
    options: chartOptions()
  });
}

function lineDataset(label, metric, color) {
  return {
    label,
    data: weeks.map((week) => chartNumber(metric, week.key)),
    borderColor: color,
    backgroundColor: `${color}24`,
    pointRadius: 4,
    tension: 0.35,
    fill: true
  };
}

function goalStatus(metric) {
  const value = metric.values[selectedWeek];
  if (value === "" || value === null || value === undefined) return { label: "Sem dados", className: "warn" };
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
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: "#26516d", boxWidth: 12 } },
      tooltip: {
        backgroundColor: "#ffffff",
        borderColor: "#cfe2ee",
        borderWidth: 1,
        titleColor: "#102033",
        bodyColor: "#102033"
      }
    },
    scales: {
      x: { ticks: { color: "#567086" }, grid: { color: "rgba(207, 226, 238, 0.8)" } },
      y: { beginAtZero: true, ticks: { color: "#567086" }, grid: { color: "rgba(207, 226, 238, 0.8)" } }
    }
  };
}

function byName(name) {
  return data.find((metric) => metric.name === name);
}

function format(value, type) {
  if (value === "" || value === null || value === undefined) return "-";
  if (type === "percent") return `${(value * 100).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`;
  if (type === "score") return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (type === "number") return value.toLocaleString("pt-BR");
  return value;
}

function deltaLabel(delta, type) {
  if (delta === null || delta === undefined || Number.isNaN(delta)) return "Sem dados";
  if (!delta) return "Sem variação";
  if (type === "time") return `${delta > 0 ? "+" : "-"}${secondsToTime(Math.abs(delta))}`;
  const signal = delta > 0 ? "+" : "-";
  return `${signal}${Math.abs(delta).toLocaleString("pt-BR", { maximumFractionDigits: type === "percent" ? 2 : 0 })}`;
}

function toNumber(value) {
  return typeof value === "number" ? value : NaN;
}

function deltaValue(current, base, type, metricName = "") {
  if (current === "" || base === "" || current === null || base === null || current === undefined || base === undefined) return null;
  if (type === "time") return timeToSeconds(current) - timeToSeconds(base);
  const currentNumber = normalizeMetricNumber(current, metricName);
  const baseNumber = normalizeMetricNumber(base, metricName);
  return Number.isFinite(currentNumber) && Number.isFinite(baseNumber) ? currentNumber - baseNumber : null;
}

function normalizeMetricNumber(value, metricName) {
  const number = Number(value);
  if (isLargeCountMetric(metricName) && number > 0 && number < 100) return Math.round(number * 1000);
  return number;
}

function comparisonWeekKey() {
  if (selectedWeek === "ultima") return "s4";
  const order = ["s1", "s2", "s3", "s4"];
  const index = order.indexOf(selectedWeek);
  return index > 0 ? order[index - 1] : "s1";
}

function weekLabel(key) {
  return weeks.find((week) => week.key === key)?.label || "semana anterior";
}

function timeToSeconds(value) {
  const [hours, minutes, seconds] = value.split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}

function secondsToTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

function normalizeImportedValue(value, type, metricName = "") {
  const text = clean(value);
  if (!text || normalizeText(text) === "S R") return type === "time" ? "00:00:00" : 0;
  if (type === "time") {
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(text)) return text.length === 5 ? `00:${text}` : text;
    const number = parseLocaleNumber(text);
    return Number.isFinite(number) ? excelTimeToLabel(number) : "00:00:00";
  }
  if (type === "percent") {
    if (text.includes("%")) return parseLocaleNumber(text.replace("%", "")) / 100;
    const number = parseLocaleNumber(text);
    return number > 1 ? number / 100 : number;
  }
  const number = parseLocaleNumber(text);
  if (!Number.isFinite(number)) return 0;
  if (isLargeCountMetric(metricName) && number > 0 && number < 100 && /[.,]/.test(text)) return Math.round(number * 1000);
  return number;
}

function chartNumber(metric, weekKey) {
  const value = metric.values[weekKey];
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  if (isLargeCountMetric(metric.name) && number > 0 && number < 100) return Math.round(number * 1000);
  return number;
}

function isLargeCountMetric(name) {
  return [
    "Quantidade de Atendimentos realizados - IXC",
    "Quantidade de Atendimentos Solucionados - IXC",
    "Quantidade de atendimento realizado pela IA - OPA",
    "Quantidade Total de Cliente UNI - IXC"
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
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeText(value) {
  return clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}

function emptyWeekValues() {
  return { ultima: "", s1: "", s2: "", s3: "", s4: "" };
}

function updateImportStatus(rows) {
  const status = document.querySelector("#importStatus");
  if (!status) return;
  const name = sessionStorage.getItem("indicadoresWorkbookName") || "Planilha importada";
  const importedAt = sessionStorage.getItem("indicadoresImportedAt") || new Date().toLocaleString("pt-BR");
  status.textContent = `${name} importada em ${importedAt}. ${rows.length} linhas lidas.`;
}

function renderValidation(importedRows) {
  const validation = document.querySelector("#validationList");
  if (!validation) return;
  const warnings = [];
  metricDefinitions.forEach(([name], index) => {
    if (!importedRows[index]) warnings.push(`Indicador não encontrado: ${name}`);
  });
  validation.innerHTML = warnings.map((warning) => `<div>${warning}</div>`).join("");
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
  });
}
