const REPORT_STORAGE = {
  indicators: "indicadoresGeneralWorkbookV2",
  occurrences: "sgpOccurrenceWorkbookV1"
};

const reportState = {
  indicators: null,
  occurrences: null,
  charts: {}
};

const reportEls = {
  printButton: document.querySelector("#printButton"),
  indicatorMonthSelect: document.querySelector("#indicatorMonthSelect"),
  indicatorPeriodSelect: document.querySelector("#indicatorPeriodSelect"),
  occurrenceMonthSelect: document.querySelector("#occurrenceMonthSelect"),
  status: document.querySelector("#reportStatus"),
  summaryGrid: document.querySelector("#summaryGrid"),
  criticalList: document.querySelector("#criticalList"),
  executiveText: document.querySelector("#executiveText")
};

const reportMetrics = [
  { key: "Tempo Médio de Atendimento - OPA", label: "TMA", type: "time", badWhen: "up" },
  { key: "Tempo Médio de Resposta ao Cliente - OPA", label: "TMR", type: "time", badWhen: "up" },
  { key: "Qualidade Percebida na Avaliação Geral - OPA", label: "Qualidade", type: "score", badWhen: "down" },
  { key: "Quantidade de Atendimentos realizados - IXC", label: "Atendimentos IXC", type: "number", badWhen: "up" },
  { key: "Quantidade de Atendimentos que foi a campo - IXC", label: "Campo IXC", type: "number", badWhen: "up" },
  { key: "Quantidade de Atendimentos Solucionados - IXC", label: "Solucionados", type: "number", badWhen: "down" },
  { key: "Resolutividade IXC", label: "Resolutividade", type: "percent", badWhen: "down" }
];

document.addEventListener("DOMContentLoaded", async () => {
  reportEls.printButton.addEventListener("click", () => window.print());
  reportEls.indicatorMonthSelect.addEventListener("change", renderReport);
  reportEls.indicatorPeriodSelect.addEventListener("change", renderReport);
  reportEls.occurrenceMonthSelect.addEventListener("change", renderReport);

  await loadReportData();
  populateSelectors();
  renderReport();
});

async function loadReportData() {
  await waitForAuth();
  reportState.indicators = await loadIndicatorWorkbook();
  reportState.occurrences = await loadOccurrenceWorkbook();

  const messages = [];
  if (reportState.indicators?.monthOrder?.length) messages.push("indicadores");
  if (reportState.occurrences?.monthOrder?.length) messages.push("ocorrencias");
  reportEls.status.textContent = messages.length
    ? `Dados carregados: ${messages.join(" e ")}. Use Exportar PDF para salvar.`
    : "Nenhum dado encontrado. Abra Indicadores/Ocorrencias ou cadastre lancamentos antes de gerar o relatorio.";
}

async function waitForAuth() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (document.documentElement.dataset.authReady === "true" || window.SGPAuth) return;
    await new Promise((resolve) => window.setTimeout(resolve, 100));
  }
}

async function loadIndicatorWorkbook() {
  try {
    const saved = await window.SGPAuth?.loadManualIndicators?.();
    if (saved?.generalWorkbook?.monthOrder?.length) return normalizeIndicatorWorkbook(saved.generalWorkbook);
  } catch (error) {
    console.error(error);
  }

  const stored = localStorage.getItem(REPORT_STORAGE.indicators);
  if (!stored) return null;
  try {
    return normalizeIndicatorWorkbook(JSON.parse(stored));
  } catch (error) {
    console.error(error);
    return null;
  }
}

async function loadOccurrenceWorkbook() {
  try {
    const saved = await window.SGPAuth?.loadManualOccurrences?.();
    if (saved?.workbook && saved?.monthOrder?.length) {
      return {
        workbook: saved.workbook,
        monthOrder: saved.monthOrder.filter((key) => saved.workbook[key])
      };
    }
  } catch (error) {
    console.error(error);
  }

  const stored = sessionStorage.getItem(REPORT_STORAGE.occurrences);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch (error) {
    console.error(error);
    return null;
  }
}

function normalizeIndicatorWorkbook(workbook) {
  if (!workbook?.months || !workbook?.monthOrder) return null;
  return {
    ...workbook,
    monthOrder: workbook.monthOrder.filter((key) => workbook.months[key])
  };
}

function populateSelectors() {
  const indicatorOrder = reportState.indicators?.monthOrder || [];
  reportEls.indicatorMonthSelect.innerHTML = indicatorOrder.length
    ? indicatorOrder.map((key) => `<option value="${key}">${escapeHtml(reportState.indicators.months[key].label || key)}</option>`).join("")
    : '<option value="">Sem indicadores</option>';
  reportEls.indicatorMonthSelect.value = indicatorOrder.at(-1) || "";

  const occurrenceOrder = reportState.occurrences?.monthOrder || [];
  reportEls.occurrenceMonthSelect.innerHTML = occurrenceOrder.length
    ? occurrenceOrder.map((key) => `<option value="${key}">${escapeHtml(reportState.occurrences.workbook[key].label || key)}</option>`).join("")
    : '<option value="">Sem ocorrencias</option>';
  reportEls.occurrenceMonthSelect.value = occurrenceOrder.at(-1) || "";

  populatePeriodSelect();
}

function populatePeriodSelect() {
  const month = selectedIndicatorMonth();
  const periods = month?.periods || [];
  reportEls.indicatorPeriodSelect.innerHTML = periods.length
    ? periods.map((period) => `<option value="${period.key}">${escapeHtml(period.label)}</option>`).join("")
    : '<option value="">Sem periodo</option>';
  reportEls.indicatorPeriodSelect.value = periods.at(-1)?.key || "";
}

function renderReport() {
  if (document.activeElement === reportEls.indicatorMonthSelect) populatePeriodSelect();

  const indicatorMonth = selectedIndicatorMonth();
  const occurrenceMonth = selectedOccurrenceMonth();
  const periodKey = reportEls.indicatorPeriodSelect.value || indicatorMonth?.periods?.at(-1)?.key || "";

  renderSummary(indicatorMonth, periodKey, occurrenceMonth);
  renderCriticalList(indicatorMonth, periodKey, occurrenceMonth);
  renderIndicatorTrend(indicatorMonth);
  renderReasonChart(occurrenceMonth);
  renderCityChart(occurrenceMonth);
  renderExecutiveText(indicatorMonth, periodKey, occurrenceMonth);
}

function selectedIndicatorMonth() {
  const key = reportEls.indicatorMonthSelect.value;
  return reportState.indicators?.months?.[key] || null;
}

function selectedOccurrenceMonth() {
  const key = reportEls.occurrenceMonthSelect.value;
  return reportState.occurrences?.workbook?.[key] || null;
}

function renderSummary(indicatorMonth, periodKey, occurrenceMonth) {
  const tma = metricSnapshot(indicatorMonth, "Tempo Médio de Atendimento - OPA", periodKey);
  const tmr = metricSnapshot(indicatorMonth, "Tempo Médio de Resposta ao Cliente - OPA", periodKey);
  const quality = metricSnapshot(indicatorMonth, "Qualidade Percebida na Avaliação Geral - OPA", periodKey);
  const occurrences = occurrenceMonth?.records?.length || 0;
  const topCity = rankBy(occurrenceMonth?.records || [], "city")[0];

  reportEls.summaryGrid.innerHTML = [
    ["TMA", formatMetric(tma), indicatorMonth?.label || "-"],
    ["TMR", formatMetric(tmr), periodLabel(indicatorMonth, periodKey)],
    ["Qualidade", formatMetric(quality), "Avaliacao geral"],
    ["Ocorrencias", occurrences.toLocaleString("pt-BR"), topCity ? `Cidade critica: ${topCity.name}` : "-"]
  ].map(([label, value, detail]) => `
    <article class="summary-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(detail)}</small>
    </article>
  `).join("");
}

function renderCriticalList(indicatorMonth, periodKey, occurrenceMonth) {
  const previousKey = previousPeriodKey(indicatorMonth, periodKey);
  const indicatorAlerts = reportMetrics
    .map((definition) => {
      const current = metricSnapshot(indicatorMonth, definition.key, periodKey);
      const previous = metricSnapshot(indicatorMonth, definition.key, previousKey);
      const delta = metricValue(current?.value, definition.type) - metricValue(previous?.value, definition.type);
      const isBad = definition.badWhen === "up" ? delta > 0 : delta < 0;
      return current && previous && isBad
        ? { title: definition.label, detail: `${formatMetric(current)} vs. ${formatMetric(previous)} no periodo anterior.` }
        : null;
    })
    .filter(Boolean)
    .slice(0, 3);

  const topReason = rankBy(occurrenceMonth?.records || [], "reason")[0];
  const topCity = rankBy(occurrenceMonth?.records || [], "city")[0];
  const occurrenceAlerts = [
    topReason ? { title: `Motivo critico: ${topReason.name}`, detail: `${topReason.total} ocorrencia(s) no mes.` } : null,
    topCity ? { title: `Cidade critica: ${topCity.name}`, detail: `${topCity.total} ocorrencia(s) no mes.` } : null
  ].filter(Boolean);

  const alerts = [...indicatorAlerts, ...occurrenceAlerts];
  reportEls.criticalList.innerHTML = alerts.length
    ? alerts.map((item) => `
      <div class="critical-item">
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.detail)}</span>
      </div>
    `).join("")
    : '<div class="critical-item"><strong>Sem alertas relevantes</strong><span>Nenhum ponto critico encontrado para os dados carregados.</span></div>';
}

function renderIndicatorTrend(month) {
  const periods = month?.periods || [];
  const tma = metricByName(month, "Tempo Médio de Atendimento - OPA");
  const tmr = metricByName(month, "Tempo Médio de Resposta ao Cliente - OPA");
  const quality = metricByName(month, "Qualidade Percebida na Avaliação Geral - OPA");

  destroyChart("indicator");
  reportState.charts.indicator = new Chart(document.querySelector("#indicatorTrendChart"), {
    type: "line",
    data: {
      labels: periods.map((period) => period.label),
      datasets: [
        buildTrendDataset("TMA", tma, periods, "time", "#243c9f"),
        buildTrendDataset("TMR", tmr, periods, "time", "#35b5e9"),
        buildTrendDataset("Qualidade", quality, periods, "score", "#009c67")
      ].filter(Boolean)
    },
    options: chartOptions("Evolucao")
  });
}

function buildTrendDataset(label, metric, periods, type, color) {
  if (!metric) return null;
  return {
    label,
    data: periods.map((period) => metricValue(metric.values?.[period.key], type)),
    borderColor: color,
    backgroundColor: `${color}22`,
    pointRadius: 4,
    tension: 0.32
  };
}

function renderReasonChart(month) {
  const rows = rankBy(month?.records || [], "reason").slice(0, 8);
  destroyChart("reason");
  reportState.charts.reason = new Chart(document.querySelector("#reasonChart"), {
    type: "bar",
    data: {
      labels: rows.map((row) => shorten(row.name, 22)),
      datasets: [{
        label: "Ocorrencias",
        data: rows.map((row) => row.total),
        backgroundColor: "rgba(0, 156, 103, 0.72)",
        borderColor: "#009c67",
        borderWidth: 1,
        borderRadius: 6
      }]
    },
    options: chartOptions("Motivos")
  });
}

function renderCityChart(month) {
  const rows = rankBy(month?.records || [], "city").slice(0, 8);
  destroyChart("city");
  reportState.charts.city = new Chart(document.querySelector("#cityChart"), {
    type: "bar",
    data: {
      labels: rows.map((row) => shorten(row.name, 22)),
      datasets: [{
        label: "Ocorrencias",
        data: rows.map((row) => row.total),
        backgroundColor: rows.map((_, index) => index === 0 ? "rgba(214, 69, 69, 0.78)" : "rgba(53, 181, 233, 0.66)"),
        borderColor: rows.map((_, index) => index === 0 ? "#d64545" : "#35b5e9"),
        borderWidth: 1,
        borderRadius: 6
      }]
    },
    options: chartOptions("Cidades")
  });
}

function renderExecutiveText(indicatorMonth, periodKey, occurrenceMonth) {
  const tma = metricSnapshot(indicatorMonth, "Tempo Médio de Atendimento - OPA", periodKey);
  const tmr = metricSnapshot(indicatorMonth, "Tempo Médio de Resposta ao Cliente - OPA", periodKey);
  const quality = metricSnapshot(indicatorMonth, "Qualidade Percebida na Avaliação Geral - OPA", periodKey);
  const solved = metricSnapshot(indicatorMonth, "Quantidade de Atendimentos Solucionados - IXC", periodKey);
  const topReason = rankBy(occurrenceMonth?.records || [], "reason")[0];
  const topCity = rankBy(occurrenceMonth?.records || [], "city")[0];

  reportEls.executiveText.innerHTML = `
    <p><strong>Periodo analisado:</strong> ${escapeHtml(indicatorMonth?.label || "-")} / ${escapeHtml(periodLabel(indicatorMonth, periodKey))}.</p>
    <p><strong>Indicadores principais:</strong> TMA ${escapeHtml(formatMetric(tma))}, TMR ${escapeHtml(formatMetric(tmr))}, qualidade ${escapeHtml(formatMetric(quality))} e ${escapeHtml(formatMetric(solved))} atendimentos solucionados.</p>
    <p><strong>Ocorrencias:</strong> ${escapeHtml(String(occurrenceMonth?.records?.length || 0))} registro(s) no mes. ${topCity ? `Cidade mais afetada: ${escapeHtml(topCity.name)} (${topCity.total}).` : ""} ${topReason ? `Principal motivo: ${escapeHtml(topReason.name)} (${topReason.total}).` : ""}</p>
    <p><strong>Proxima acao sugerida:</strong> validar os indicadores fora da meta, priorizar o motivo/cidade com maior impacto e registrar plano de correcao semanal.</p>
  `;
}

function metricSnapshot(month, name, periodKey) {
  const metric = metricByName(month, name);
  if (!metric) return null;
  return {
    metric,
    value: metric.values?.[periodKey],
    type: metric.type || "number"
  };
}

function metricByName(month, name) {
  const target = normalizeText(name);
  return (month?.metrics || []).find((metric) => normalizeText(metric.name) === target);
}

function previousPeriodKey(month, periodKey) {
  const periods = month?.periods || [];
  const index = periods.findIndex((period) => period.key === periodKey);
  return index > 0 ? periods[index - 1].key : periodKey;
}

function periodLabel(month, periodKey) {
  return (month?.periods || []).find((period) => period.key === periodKey)?.label || "-";
}

function formatMetric(snapshot) {
  if (!snapshot) return "-";
  return formatValue(snapshot.value, snapshot.type);
}

function formatValue(value, type) {
  if (value === "" || value === null || value === undefined || Number.isNaN(value)) return "-";
  if (type === "time") return normalizeTimeLabel(value);
  const numeric = parseLocaleNumber(value);
  if (!Number.isFinite(numeric)) return String(value);
  if (type === "percent") return `${numeric.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
  if (type === "score") return numeric.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return numeric.toLocaleString("pt-BR");
}

function metricValue(value, type) {
  if (type === "time") return timeToSeconds(value);
  const numeric = parseLocaleNumber(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function parseLocaleNumber(value) {
  if (typeof value === "number") return value;
  const text = String(value ?? "").trim();
  if (!text) return NaN;
  const cleaned = text.replace("%", "").replace(/\s+/g, "");
  const comma = cleaned.lastIndexOf(",");
  const dot = cleaned.lastIndexOf(".");
  if (comma > dot) {
    return Number(cleaned.replace(/\./g, "").replace(",", "."));
  }
  return Number(cleaned.replace(/,/g, ""));
}

function normalizeTimeLabel(value) {
  if (typeof value === "number" && value > 0 && value < 1) {
    return secondsToTime(Math.round(value * 86400));
  }
  const text = String(value || "").trim();
  if (!text) return "-";
  const parts = text.split(":").map(Number);
  if (parts.length === 3 && parts.every(Number.isFinite)) {
    return parts.map((part) => String(part).padStart(2, "0")).join(":");
  }
  if (parts.length === 2 && parts.every(Number.isFinite)) {
    return `00:${String(parts[0]).padStart(2, "0")}:${String(parts[1]).padStart(2, "0")}`;
  }
  return text;
}

function timeToSeconds(value) {
  const label = normalizeTimeLabel(value);
  const parts = label.split(":").map(Number);
  if (parts.length !== 3 || !parts.every(Number.isFinite)) return 0;
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

function secondsToTime(totalSeconds) {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  return [hours, minutes, rest].map((part) => String(part).padStart(2, "0")).join(":");
}

function rankBy(rows, key) {
  const map = new Map();
  rows.forEach((row) => {
    const value = row?.[key] || "Nao informado";
    map.set(value, (map.get(value) || 0) + 1);
  });
  return [...map.entries()]
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}

function chartOptions(label) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom", labels: { boxWidth: 12, color: "#26516d" } },
      tooltip: { mode: "index", intersect: false },
      title: { display: false, text: label }
    },
    scales: {
      x: { grid: { color: "#dcecf5" }, ticks: { color: "#45627a" } },
      y: { beginAtZero: true, grid: { color: "#dcecf5" }, ticks: { color: "#45627a" } }
    }
  };
}

function destroyChart(key) {
  reportState.charts[key]?.destroy();
  reportState.charts[key] = null;
}

function shorten(value, size) {
  const text = String(value || "");
  return text.length > size ? `${text.slice(0, size - 1)}...` : text;
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ç/g, "c")
    .replace(/ã/g, "a")
    .replace(/é/g, "e")
    .replace(/ê/g, "e")
    .toUpperCase()
    .trim();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
