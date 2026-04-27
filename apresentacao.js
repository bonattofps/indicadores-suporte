const weeks = [
  { key: "ultima", label: "Última Semana" },
  { key: "s1", label: "1ª Semana" },
  { key: "s2", label: "2ª Semana" },
  { key: "s3", label: "3ª Semana" },
  { key: "s4", label: "4ª Semana" }
];

let data = [
  { name: "Tempo Médio de Atendimento - OPA", type: "time", values: { ultima: "00:44:37", s1: "00:50:25", s2: "00:51:27", s3: "00:45:18", s4: "00:38:55" } },
  { name: "Tempo Médio de Resposta ao Cliente - OPA", type: "time", values: { ultima: "00:02:06", s1: "00:02:58", s2: "00:03:38", s3: "00:02:19", s4: "00:02:31" } },
  { name: "Tempo Médio de Resposta do Cliente - OPA", type: "time", values: { ultima: "00:04:01", s1: "00:04:52", s2: "00:05:12", s3: "00:04:34", s4: "00:04:23" } },
  { name: "Quantidade de atendimento realizado pela IA - OPA", type: "number", values: { ultima: 9841, s1: 7049, s2: 8025, s3: 9777, s4: 6284 } },
  { name: "Qualidade Percebida na Avaliação Geral - OPA", type: "score", values: { ultima: 4.47, s1: 4.50, s2: 4.53, s3: 4.53, s4: 4.51 } },
  { name: "Taxa de Cumprimento de SLA em (%) Ativação de Login - N2", type: "percent", values: { ultima: 0.99, s1: 0.97, s2: 0.98, s3: 0.99, s4: 0.99 } },
  { name: "Quantidade de Atendimentos Realizados pela Equipe - N2", type: "number", values: { ultima: 405, s1: 404, s2: 409, s3: 404, s4: 495 } },
  { name: "Quantidade de Atendimentos que foi a campo - IXC", type: "number", values: { ultima: 627, s1: 534, s2: 566, s3: 612, s4: 569 } },
  { name: "Quantidade de Atendimentos Solucionados - IXC", type: "number", values: { ultima: 1636, s1: 2104, s2: 1768, s3: 2138, s4: 1888 } },
  { name: "Quantidade de Atendimentos realizados - IXC", type: "number", values: { ultima: 2263, s1: 2638, s2: 2334, s3: 2750, s4: 2457 } },
  { name: "Quantidade de Pesquisa de Satisfação Realizados - IXC", type: "number", values: { ultima: 48, s1: 59, s2: 175, s3: 89, s4: 85 } },
  { name: "Qualidade Percebida na Satisfação em % - IXC", type: "percent", values: { ultima: 0.99, s1: 0.98, s2: 0.98, s3: 0.99, s4: 0.99 } },
  { name: "Taxa de Cliente que entrou em contato com o suporte em %", type: "percent", values: { ultima: 0.0277, s1: 0.0335, s2: 0.0295, s3: 0.0348, s4: 0.0310 } },
  { name: "Quantidade Total de Cliente UNI - IXC", type: "number", values: { ultima: 78663, s1: 78857, s2: 79018, s3: 79072, s4: 79195 } }
];

let selectedWeek = "ultima";
let charts = {};

document.addEventListener("DOMContentLoaded", () => {
  document.querySelector("#fileInput").addEventListener("change", handleImport);
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
          ultima: normalizeImportedValue(row[1], metric.type),
          s1: normalizeImportedValue(row[2], metric.type),
          s2: normalizeImportedValue(row[3], metric.type),
          s3: normalizeImportedValue(row[4], metric.type),
          s4: normalizeImportedValue(row[5], metric.type)
        }
      };
    });

    render();
  } catch (error) {
    console.error(error);
    alert("Não foi possível importar a planilha. Confira se o arquivo segue o modelo da matriz.");
  }
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
  renderGoals();
  renderSummary();
  renderTable();
  renderCharts();
}

function renderKpis() {
  const kpis = [
    "Quantidade de Atendimentos realizados - IXC",
    "Quantidade de Atendimentos Solucionados - IXC",
    "Taxa de Cumprimento de SLA em (%) Ativação de Login - N2",
    "Qualidade Percebida na Satisfação em % - IXC"
  ];

  document.querySelector("#kpiBoard").innerHTML = kpis.map((name) => {
    const metric = byName(name);
    const current = metric.values[selectedWeek];
    const first = metric.values.s1;
    const delta = Number.isFinite(toNumber(current)) && Number.isFinite(toNumber(first))
      ? toNumber(current) - toNumber(first)
      : 0;

    return `
      <article class="kpi">
        <div class="label">${name}</div>
        <div class="value">${format(current, metric.type)}</div>
        <div class="change">${deltaLabel(delta, metric.type)} vs. 1ª Semana</div>
      </article>
    `;
  }).join("");
}

function renderGoals() {
  const goals = [
    byName("Tempo Médio de Atendimento - OPA"),
    byName("Qualidade Percebida na Avaliação Geral - OPA"),
    byName("Taxa de Cumprimento de SLA em (%) Ativação de Login - N2"),
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

  const items = [
    ["Resolutividade IXC", `${((solved / total) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`],
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
        data: weeks.map((week) => metric.values[week.key]),
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
    data: weeks.map((week) => metric.values[week.key]),
    borderColor: color,
    backgroundColor: `${color}24`,
    pointRadius: 4,
    tension: 0.35,
    fill: true
  };
}

function goalStatus(metric) {
  const value = metric.values[selectedWeek];
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
      legend: { labels: { color: "#dfe8f2", boxWidth: 12 } },
      tooltip: {
        backgroundColor: "#0c1118",
        borderColor: "#2b3947",
        borderWidth: 1,
        titleColor: "#edf4fb",
        bodyColor: "#dfe8f2"
      }
    },
    scales: {
      x: { ticks: { color: "#91a0b2" }, grid: { color: "rgba(43, 57, 71, 0.45)" } },
      y: { beginAtZero: true, ticks: { color: "#91a0b2" }, grid: { color: "rgba(43, 57, 71, 0.45)" } }
    }
  };
}

function byName(name) {
  return data.find((metric) => metric.name === name);
}

function format(value, type) {
  if (type === "percent") return `${(value * 100).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`;
  if (type === "score") return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (type === "number") return value.toLocaleString("pt-BR");
  return value;
}

function deltaLabel(delta, type) {
  if (!delta) return "Sem variação";
  const signal = delta > 0 ? "+" : "";
  return `${signal}${format(Math.abs(delta), type).replace("-", "")}`;
}

function toNumber(value) {
  return typeof value === "number" ? value : NaN;
}

function timeToSeconds(value) {
  const [hours, minutes, seconds] = value.split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}

function normalizeImportedValue(value, type) {
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
  return Number.isFinite(number) ? number : 0;
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
