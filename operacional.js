const operationalState = {
  rows: [],
  filteredRows: [],
  selectedClient: "",
  selectedMonthKey: "all",
  charts: {}
};

const EXCLUDED_OPERATIONAL_CLIENTS = new Set([
  normalizeHeader("UNI SERVICOS DE TECNOLOGIA DA INFORMACAO LTDA")
]);

const operationalEls = {
  fileInput: document.querySelector("#fileInput"),
  themeToggle: document.querySelector("#themeToggle"),
  clearButton: document.querySelector("#clearButton"),
  importStatus: document.querySelector("#importStatus"),
  clientSearch: document.querySelector("#clientSearch"),
  monthFilter: document.querySelector("#monthFilter"),
  periodFilter: document.querySelector("#periodFilter"),
  summaryStrip: document.querySelector("#summaryStrip"),
  comparisonStrip: document.querySelector("#comparisonStrip"),
  detailMetrics: document.querySelector("#detailMetrics"),
  supportBreakdown: document.querySelector("#supportBreakdown"),
  clientHead: document.querySelector("#clientHead"),
  clientBody: document.querySelector("#clientBody"),
  repeatHead: document.querySelector("#repeatHead"),
  repeatBody: document.querySelector("#repeatBody"),
  ticketHead: document.querySelector("#ticketHead"),
  ticketBody: document.querySelector("#ticketBody"),
  detailTitle: document.querySelector("#detailTitle")
};

document.addEventListener("DOMContentLoaded", () => {
  setupTheme();
  operationalEls.fileInput.addEventListener("change", handleOperationalImport);
  operationalEls.clearButton.addEventListener("click", clearOperationalData);
  operationalEls.clientSearch.addEventListener("input", renderOperational);
  operationalEls.monthFilter.addEventListener("change", handleMonthChange);
  operationalEls.periodFilter.addEventListener("change", renderOperational);
  tryAutoLoadOperational();
});

async function tryAutoLoadOperational() {
  const saved = sessionStorage.getItem("operationalRows");
  if (saved) {
    operationalState.rows = JSON.parse(saved);
    operationalEls.importStatus.textContent = "Relatório operacional carregado da sessão atual.";
    renderOperational();
    return;
  }

  const candidates = [
    "relatorio atendimento operacional.csv",
    "relatorio operacional.csv",
    "relatorio atendimento operacional.xlsx",
    "relatorio operacional.xlsx",
    "relatorio atendimento operacional.xls",
    "relatorio operacional.xls"
  ];

  for (const fileName of candidates) {
    try {
      const response = await fetch(fileName, { cache: "no-store" });
      if (!response.ok) continue;
      const buffer = await response.arrayBuffer();
      applyOperationalRows(parseOperationalWorkbook(buffer, "array"));
      operationalEls.importStatus.textContent = `${fileName} carregado automaticamente da pasta do site.`;
      return;
    } catch {
      // tenta o próximo arquivo compatível
    }
  }

  operationalEls.importStatus.textContent = "Importe o relatório operacional para analisar reincidência.";
  renderOperational();
}

async function handleOperationalImport(event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const buffer = await file.arrayBuffer();
    applyOperationalRows(parseOperationalWorkbook(buffer, "array"));
    operationalEls.importStatus.textContent = `${file.name} importado com sucesso.`;
  } catch (error) {
    console.error(error);
    operationalEls.importStatus.textContent = "Não foi possível ler o relatório operacional.";
  }
}

function parseOperationalWorkbook(content, type) {
  const workbook = XLSX.read(content, { type });
  const collectedRows = [];

  workbook.SheetNames.forEach((name) => {
    const sheetRows = XLSX.utils.sheet_to_json(workbook.Sheets[name], {
      header: 1,
      raw: false,
      defval: ""
    });
    const headerIndex = findOperationalHeaderIndex(sheetRows);
    if (headerIndex === -1) return;

    const headers = sheetRows[headerIndex].map(normalizeHeader);
    sheetRows.slice(headerIndex + 1).forEach((row) => {
      if (!row.some((cell) => clean(cell))) return;

      const record = {};
      headers.forEach((header, index) => {
        record[header] = clean(row[index]);
      });

      const parsed = {
        id: record.id,
        cliente: firstFilled(record.cliente, record.nome_do_cliente),
        assunto: firstFilled(record.assunto, record.descricao_assunto),
        criadoEm: firstFilled(record.criado_em, record.data_abertura, record.data),
        status: firstFilled(record.novo_status, record.status, record.status_complementar),
        usuario: firstFilled(record.usuario, record.responsavel, record.atendente, record.suporte),
        responsavel: record.responsavel,
        protocolo: record.protocolo,
        diagnostico: record.diagnostico,
        login: record.login,
        descricao: record.descricao
      };

      if (!parsed.cliente || !parsed.assunto) return;
      if (!normalizeHeader(parsed.assunto).includes("registro_de_atendimento_operacional")) return;
      if (EXCLUDED_OPERATIONAL_CLIENTS.has(normalizeHeader(parsed.cliente))) return;
      collectedRows.push(parsed);
    });
  });

  return collectedRows;
}

function applyOperationalRows(rows) {
  operationalState.rows = rows;
  sessionStorage.setItem("operationalRows", JSON.stringify(rows));
  const months = availableMonths(rows);
  operationalState.selectedMonthKey = months.at(-1)?.key || "all";
  operationalState.selectedClient = topRecurringClients(rows)[0]?.cliente || "";
  renderOperational();
}

function renderOperational() {
  renderMonthOptions();
  operationalState.filteredRows = filterOperationalRows();
  renderOperationalSummary();
  renderOperationalComparison();
  renderOperationalChart();
  renderClientTable();
  renderClientDetail();
}

function filterOperationalRows() {
  const search = normalizeHeader(operationalEls.clientSearch.value);
  const monthKey = operationalState.selectedMonthKey;
  const period = operationalEls.periodFilter.value;
  const now = new Date();
  return operationalState.rows.filter((row) => {
    if (search && !normalizeHeader(row.cliente).includes(search)) return false;
    const createdAt = parseBrDate(row.criadoEm);
    if (monthKey !== "all") {
      if (!createdAt || monthKeyFromDate(createdAt) !== monthKey) return false;
    }
    if (period === "all") return true;
    if (!createdAt) return false;
    const days = Number(period);
    return (now - createdAt) / 86400000 <= days;
  });
}

function renderOperationalSummary() {
  const rows = operationalState.filteredRows;
  const recurring = topRecurringClients(rows);
  const supports = supportTotals(rows);
  const repeatedCases = repeatedSupportCases(rows);
  const leadClient = recurring[0];
  operationalEls.summaryStrip.innerHTML = [
    ["Registros operacionais", rows.length],
    ["Clientes únicos", uniqueCount(rows.map((row) => row.cliente))],
    ["Clientes reincidentes", recurring.filter((item) => item.total > 1).length],
    ["Maior reincidência", leadClient ? `${leadClient.total} chamados` : "-", leadClient ? shorten(leadClient.cliente, 48) : ""],
    ["Mesmo suporte repetiu", repeatedCases.length, supports[0] ? `Suporte líder: ${supports[0].name}` : ""]
  ].map(([label, value, note = ""]) => `
    <article class="insight-card">
      <span>${label}</span>
      <strong>${value}</strong>
      ${note ? `<small>${note}</small>` : ""}
    </article>
  `).join("");
}

function renderOperationalComparison() {
  const currentRows = rowsByMonthKey(operationalState.selectedMonthKey);
  const previousKey = previousMonthKey(operationalState.selectedMonthKey);
  const previousRows = rowsByMonthKey(previousKey);
  const currentRecurring = topRecurringClients(currentRows);
  const previousRecurring = topRecurringClients(previousRows);
  const cards = [
    comparisonCard("Mês selecionado", monthLabel(operationalState.selectedMonthKey), previousKey ? `Comparando com ${monthLabel(previousKey)}` : "Sem mês anterior"),
    comparisonMetricCard("Registros operacionais", currentRows.length, previousRows.length),
    comparisonMetricCard("Clientes reincidentes", currentRecurring.filter((item) => item.total > 1).length, previousRecurring.filter((item) => item.total > 1).length),
    comparisonMetricCard("Mesmo suporte repetiu", repeatedSupportCases(currentRows).length, repeatedSupportCases(previousRows).length)
  ];
  operationalEls.comparisonStrip.innerHTML = cards.join("");
}

function renderOperationalChart() {
  const topClients = topRecurringClients(operationalState.filteredRows).slice(0, 10);
  operationalState.charts.client?.destroy();
  operationalState.charts.client = new Chart(document.querySelector("#clientChart"), {
    type: "bar",
    data: {
      labels: topClients.map((item) => shorten(item.cliente, 26)),
      datasets: [{
        label: "Atendimentos",
        data: topClients.map((item) => item.total),
        backgroundColor: "rgba(0, 156, 103, 0.72)",
        borderColor: "#009c67",
        borderWidth: 1,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: "#567086" }, grid: { color: "rgba(207,226,238,0.8)" } },
        y: { beginAtZero: true, ticks: { color: "#567086" }, grid: { color: "rgba(207,226,238,0.8)" } }
      }
    }
  });
}

function renderClientTable() {
  const topClients = topRecurringClients(operationalState.filteredRows);
  operationalEls.clientHead.innerHTML = "<tr><th>Cliente</th><th>Total</th><th>Maior suporte</th><th>Repetição do mesmo suporte</th></tr>";
  if (!topClients.length) {
    operationalEls.clientBody.innerHTML = '<tr><td colspan="4">Nenhum dado encontrado para os filtros atuais.</td></tr>';
    return;
  }
  operationalEls.clientBody.innerHTML = topClients.map((item) => `
    <tr class="${item.cliente === operationalState.selectedClient ? "is-active" : ""}" data-client="${escapeHtml(item.cliente)}">
      <td>${item.cliente}</td>
      <td>${item.total}</td>
      <td>${item.topSupportName} (${item.topSupportCount})</td>
      <td>${item.repeatedSupportText}</td>
    </tr>
  `).join("");

  operationalEls.clientBody.querySelectorAll("tr[data-client]").forEach((row) => {
    row.addEventListener("click", () => {
      operationalState.selectedClient = row.dataset.client;
      renderClientTable();
      renderClientDetail();
    });
  });
}

function renderClientDetail() {
  const selectedClient = operationalState.selectedClient;
  const clientRows = operationalState.filteredRows.filter((row) => row.cliente === selectedClient);
  operationalEls.detailTitle.textContent = selectedClient ? `Análise de ${selectedClient}` : "Análise do cliente";
  renderClientMetrics(clientRows, selectedClient);
  const breakdown = supportTotals(clientRows);
  operationalEls.supportBreakdown.innerHTML = breakdown.length
    ? breakdown.map((item) => `
      <div class="detail-item">
        <strong>${item.name}</strong>
        <span>${item.total} atendimento(s) para este cliente</span>
        <span>${item.total > 1 ? "Reincidência com o mesmo suporte" : "Atendimento único no período"}</span>
      </div>
    `).join("")
    : '<div class="detail-item"><strong>Selecione um cliente</strong><span>O detalhamento dos suportes aparece aqui.</span></div>';

  const repeatedSupports = repeatedSupportClientPairs(clientRows);
  operationalEls.repeatHead.innerHTML = "<tr><th>Suporte</th><th>Atendimentos</th><th>Status</th></tr>";
  operationalEls.repeatBody.innerHTML = repeatedSupports.length
    ? repeatedSupports.map((item) => `
      <tr>
        <td>${item.support}</td>
        <td>${item.total}</td>
        <td><span class="status-badge ${item.total > 1 ? "critical" : "good"}">${item.total > 1 ? "Repetiu" : "Único"}</span></td>
      </tr>
    `).join("")
    : '<tr><td colspan="3">Nenhum atendimento encontrado para o cliente selecionado.</td></tr>';

  operationalEls.ticketHead.innerHTML = "<tr><th>Criado em</th><th>Protocolo</th><th>Suporte</th><th>Status</th><th>Diagnóstico</th><th>Login</th></tr>";
  if (!clientRows.length) {
    operationalEls.ticketBody.innerHTML = '<tr><td colspan="6">Nenhum atendimento encontrado para o cliente selecionado.</td></tr>';
    return;
  }
  operationalEls.ticketBody.innerHTML = clientRows
    .sort((a, b) => (parseBrDate(b.criadoEm) || 0) - (parseBrDate(a.criadoEm) || 0))
    .map((row) => `
      <tr>
        <td>${row.criadoEm || "-"}</td>
        <td>${row.protocolo || "-"}</td>
        <td>${row.usuario || "-"}</td>
        <td>${row.status || "-"}</td>
        <td>${row.diagnostico || "-"}</td>
        <td>${row.login || "-"}</td>
      </tr>
    `).join("");
}

function renderMonthOptions() {
  const options = availableMonths(operationalState.rows);
  operationalEls.monthFilter.innerHTML = [
    '<option value="all">Todos os meses</option>',
    ...options.map((item) => `<option value="${item.key}">${item.label}</option>`)
  ].join("");
  operationalEls.monthFilter.value = options.some((item) => item.key === operationalState.selectedMonthKey)
    ? operationalState.selectedMonthKey
    : "all";
}

function topRecurringClients(rows) {
  const grouped = new Map();
  rows.forEach((row) => {
    const current = grouped.get(row.cliente) || { cliente: row.cliente, total: 0, supports: new Map(), lastAt: "" };
    current.total += 1;
    current.supports.set(row.usuario || "Não informado", (current.supports.get(row.usuario || "Não informado") || 0) + 1);
    const createdAt = parseBrDate(row.criadoEm);
    if (createdAt && (!current.lastDate || createdAt > current.lastDate)) {
      current.lastDate = createdAt;
      current.lastAt = row.criadoEm;
    }
    grouped.set(row.cliente, current);
  });
  return [...grouped.values()].map((item) => {
    const supportEntries = [...item.supports.entries()].sort((a, b) => b[1] - a[1]);
    const topSupport = supportEntries[0] || ["-", 0];
    const repeated = supportEntries.filter(([, total]) => total > 1);
    return {
      cliente: item.cliente,
      total: item.total,
      supportsDistinct: item.supports.size,
      topSupportName: topSupport[0],
      topSupportCount: topSupport[1],
      lastAt: item.lastAt,
      repeatedSupportText: repeated.length
        ? repeated.map(([name, total]) => `${name} (${total})`).join(", ")
        : "Sem repetição"
    };
  }).sort((a, b) => b.total - a.total || a.cliente.localeCompare(b.cliente));
}

function supportTotals(rows) {
  const grouped = new Map();
  rows.forEach((row) => {
    const name = row.usuario || "Não informado";
    grouped.set(name, (grouped.get(name) || 0) + 1);
  });
  return [...grouped.entries()].map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);
}

function repeatedSupportClientPairs(rows) {
  const grouped = new Map();
  rows.forEach((row) => {
    const support = row.usuario || "Não informado";
    grouped.set(support, (grouped.get(support) || 0) + 1);
  });
  return [...grouped.entries()]
    .map(([support, total]) => ({ support, total }))
    .sort((a, b) => b.total - a.total || a.support.localeCompare(b.support));
}

function repeatedSupportCases(rows) {
  const grouped = new Map();
  rows.forEach((row) => {
    const support = row.usuario || "Não informado";
    const key = `${row.cliente}||${support}`;
    grouped.set(key, {
      cliente: row.cliente,
      support,
      total: (grouped.get(key)?.total || 0) + 1
    });
  });
  return [...grouped.values()].filter((item) => item.total > 1);
}

function availableMonths(rows) {
  const grouped = new Map();
  rows.forEach((row) => {
    const createdAt = parseBrDate(row.criadoEm);
    if (!createdAt) return;
    const key = monthKeyFromDate(createdAt);
    if (!grouped.has(key)) grouped.set(key, { key, label: monthLabel(key), date: new Date(createdAt.getFullYear(), createdAt.getMonth(), 1) });
  });
  return [...grouped.values()].sort((a, b) => a.date - b.date);
}

function monthKeyFromDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key) {
  if (!key || key === "all") return "Todos os meses";
  const [year, month] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
}

function previousMonthKey(key) {
  const months = availableMonths(operationalState.rows);
  const index = months.findIndex((item) => item.key === key);
  return index > 0 ? months[index - 1].key : "";
}

function rowsByMonthKey(key) {
  if (!key || key === "all") return operationalState.rows;
  return operationalState.rows.filter((row) => {
    const createdAt = parseBrDate(row.criadoEm);
    return createdAt && monthKeyFromDate(createdAt) === key;
  });
}

function comparisonCard(label, value, note = "") {
  return `
    <article class="comparison-card">
      <span>${label}</span>
      <strong>${value || "-"}</strong>
      ${note ? `<small>${note}</small>` : ""}
    </article>
  `;
}

function comparisonMetricCard(label, current, previous) {
  const delta = current - previous;
  const deltaClass = delta === 0 ? "neutral" : delta > 0 ? "bad" : "good";
  const deltaLabel = previous || delta === 0
    ? `${delta > 0 ? "+" : ""}${delta.toLocaleString("pt-BR")} vs. mês anterior`
    : "Sem base anterior";
  return `
    <article class="comparison-card">
      <span>${label}</span>
      <strong>${Number(current).toLocaleString("pt-BR")}</strong>
      <small>Anterior: ${Number(previous || 0).toLocaleString("pt-BR")}</small>
      <div class="comparison-delta ${deltaClass}">${deltaLabel}</div>
    </article>
  `;
}

function renderClientMetrics(clientRows, selectedClient) {
  if (!selectedClient || !clientRows.length) {
    operationalEls.detailMetrics.innerHTML = [
      ["Cliente", "-"],
      ["Atendimentos", "-"],
      ["Suportes distintos", "-"],
      ["Repetições do mesmo suporte", "-"]
    ].map(([label, value]) => `
      <article class="metric-chip">
        <span>${label}</span>
        <strong>${value}</strong>
      </article>
    `).join("");
    return;
  }

  const supportRanking = supportTotals(clientRows);
  const repeatedCount = supportRanking.filter((item) => item.total > 1).length;
  operationalEls.detailMetrics.innerHTML = [
    ["Cliente", shorten(selectedClient, 42), `${clientRows.length} atendimento(s)`],
    ["Suportes distintos", supportRanking.length, supportRanking[0] ? `Maior volume: ${supportRanking[0].name}` : ""],
    ["Mesmo suporte repetiu", repeatedCount, repeatedCount ? "Precisa acompanhar reincidência" : "Sem repetição por suporte"],
    ["Último atendimento", clientRows
      .slice()
      .sort((a, b) => (parseBrDate(b.criadoEm) || 0) - (parseBrDate(a.criadoEm) || 0))[0]?.criadoEm || "-", ""]
  ].map(([label, value, note = ""]) => `
    <article class="metric-chip">
      <span>${label}</span>
      <strong>${value}</strong>
      ${note ? `<small>${note}</small>` : ""}
    </article>
  `).join("");
}

function uniqueCount(items) {
  return new Set(items.filter(Boolean)).size;
}

function parseBrDate(value) {
  if (!value) return null;
  const normalized = value.replace(/\u00a0/g, " ").trim();
  const slashDate = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (slashDate) {
    let [, left, right, year, hour = "0", minute = "0", second = "0"] = slashDate;
    let day = Number(left);
    let month = Number(right);

    if (day <= 12 && month > 12) {
      day = Number(right);
      month = Number(left);
    } else if (day <= 12 && month <= 12) {
      // prioridade para o layout do relatório operacional atual (MM/DD/YYYY)
      day = Number(right);
      month = Number(left);
    }

    const parsedManual = new Date(
      Number(year),
      month - 1,
      day,
      Number(hour),
      Number(minute),
      Number(second)
    );
    return Number.isNaN(parsedManual.getTime()) ? null : parsedManual;
  }
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function findOperationalHeaderIndex(rows) {
  return rows.findIndex((row) => {
    const normalizedCells = row.map(normalizeHeader);
    return normalizedCells.includes("cliente")
      && normalizedCells.includes("assunto")
      && normalizedCells.some((cell) => ["usuario", "responsavel", "atendente", "suporte"].includes(cell));
  });
}

function firstFilled(...values) {
  return values.map(clean).find(Boolean) || "";
}

function normalizeHeader(value) {
  return clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function shorten(value, size) {
  return value.length > size ? `${value.slice(0, size - 1)}…` : value;
}

function escapeHtml(value) {
  return String(value).replace(/"/g, "&quot;");
}

function clearOperationalData() {
  sessionStorage.removeItem("operationalRows");
  operationalState.rows = [];
  operationalState.filteredRows = [];
  operationalState.selectedClient = "";
  operationalState.selectedMonthKey = "all";
  operationalEls.importStatus.textContent = "Importe o relatório atendimento operacional para analisar reincidência.";
  renderOperational();
}

function handleMonthChange(event) {
  operationalState.selectedMonthKey = event.target.value;
  operationalState.selectedClient = topRecurringClients(filterOperationalRows())[0]?.cliente || "";
  renderOperational();
}

function setupTheme() {
  const button = operationalEls.themeToggle;
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
