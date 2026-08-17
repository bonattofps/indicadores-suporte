const STORAGE_KEYS = {
  workbook: "indicadoresGeneralWorkbookV2",
  workbookName: "indicadoresGeneralWorkbookName",
  importedAt: "indicadoresGeneralImportedAt"
};

const OCCURRENCE_STORAGE_KEY = "sgpOccurrenceWorkbookV1";
const OCCURRENCE_SHEETS_URL = "https://docs.google.com/spreadsheets/d/1W9LUNFCcrmqDuKVqTJhv6uYOmJ0IbyPoErFYcvnvRfg/export?format=xlsx";

const DEFAULT_GOALS = {
  executiveTmaMax: "00:45:00",
  executiveTmrMax: "00:02:40",
  executiveCsatMin: 4.5,
  evolutionTmaWeight: 1,
  evolutionTmrWeight: 1,
  evolutionCsatWeight: 1
};

const METRICS = [
  {
    key: "tma",
    label: "TMA",
    fullName: "Tempo Médio de Atendimento",
    source: "Tempo Médio de Atendimento - OPA",
    type: "time",
    direction: "down",
    goalKey: "executiveTmaMax",
    weightKey: "evolutionTmaWeight"
  },
  {
    key: "tmr",
    label: "TMR",
    fullName: "Tempo Médio de Resposta",
    source: "Tempo Médio de Resposta ao Cliente - OPA",
    type: "time",
    direction: "down",
    goalKey: "executiveTmrMax",
    weightKey: "evolutionTmrWeight"
  },
  {
    key: "csat",
    label: "CSAT",
    fullName: "Satisfação do Cliente",
    source: "Qualidade Percebida na Avaliação Geral - OPA",
    type: "score",
    direction: "up",
    goalKey: "executiveCsatMin",
    weightKey: "evolutionCsatWeight"
  }
];

const METRIC_ALIASES = {
  tma: ["tempo medio de atendimento opa", "tempo medio de atendimento"],
  tmr: ["tempo medio de resposta ao cliente opa", "tempo medio de resposta ao cliente"],
  csat: ["qualidade percebida na avaliacao geral opa", "qualidade percebida na avaliacao geral", "csat"]
};

const state = {
  workbook: null,
  occurrences: [],
  monthId: "",
  periodKey: "",
  mode: "weekly",
  goals: { ...DEFAULT_GOALS },
  charts: {}
};

const els = {
  status: document.querySelector("#dataStatus"),
  mode: document.querySelector("#modeSelect"),
  month: document.querySelector("#monthSelect"),
  monthField: document.querySelector("#monthField"),
  week: document.querySelector("#weekSelect"),
  year: document.querySelector("#yearSelect"),
  weekField: document.querySelector("#weekField"),
  yearField: document.querySelector("#yearField"),
  customStartField: document.querySelector("#customStartField"),
  customEndField: document.querySelector("#customEndField"),
  customStart: document.querySelector("#customStart"),
  customEnd: document.querySelector("#customEnd"),
  comparisonLabel: document.querySelector("#comparisonLabel"),
  fileInput: document.querySelector("#fileInput"),
  occurrencePeriodLabel: document.querySelector("#occurrencePeriodLabel"),
  occurrenceCards: document.querySelector("#occurrenceCards"),
  occurrenceNarrative: document.querySelector("#occurrenceNarrative"),
  resultHero: document.querySelector("#resultHero"),
  resultStatus: document.querySelector("#resultStatus"),
  executiveSummary: document.querySelector("#executiveSummary"),
  evolutionIndex: document.querySelector("#evolutionIndex"),
  evolutionGauge: document.querySelector("#evolutionGauge"),
  evolutionMethod: document.querySelector("#evolutionMethod"),
  generatedAt: document.querySelector("#reportGeneratedAt"),
  activePeriodLabel: document.querySelector("#activePeriodLabel"),
  printPeriod: document.querySelector("#printPeriod"),
  snapshot: document.querySelector("#executiveSnapshot"),
  cards: document.querySelector("#executiveCards"),
  weeklyBody: document.querySelector("#weeklyBody"),
  weeklyNarrative: document.querySelector("#weeklyNarrative"),
  weeklyHighlights: document.querySelector("#weeklyHighlights"),
  weeklyChart: document.querySelector("#weeklyTrendChart"),
  monthlyBody: document.querySelector("#monthlyBody"),
  monthlyChart: document.querySelector("#monthlyTrendChart"),
  goalResults: document.querySelector("#goalResultList"),
  goalScore: document.querySelector("#goalScore"),
  occurrenceTrendChart: document.querySelector("#occurrenceTrendChart"),
  occurrenceReasonChart: document.querySelector("#occurrenceReasonChart"),
  improved: document.querySelector("#improvedList"),
  attention: document.querySelector("#attentionList"),
  recommendations: document.querySelector("#recommendedActions"),
  conclusionTitle: document.querySelector("#conclusionTitle"),
  conclusion: document.querySelector("#executiveConclusion"),
  detailsButton: document.querySelector("#detailsButton"),
  detailsContent: document.querySelector("#detailsContent"),
  presentationButton: document.querySelector("#presentationButton"),
  printButton: document.querySelector("#printButton")
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  bindEvents();
  [state.goals, state.workbook, state.occurrences] = await Promise.all([
    loadGoals(),
    loadWorkbook(),
    loadOccurrenceData()
  ]);
  if (!isValidWorkbook(state.workbook)) {
    renderEmpty("Nenhum dado de indicadores foi encontrado.");
    return;
  }
  normalizeWorkbook(state.workbook);
  state.monthId = state.workbook.monthOrder.at(-1) || "";
  state.periodKey = defaultWeeklyPeriod(currentMonth())?.key || "";
  setCustomDateDefaults();
  render();
  window.lucide?.createIcons();
}

function bindEvents() {
  els.mode.addEventListener("change", () => {
    state.mode = els.mode.value;
    syncFilterVisibility();
    render();
  });

  els.month.addEventListener("change", () => {
    state.monthId = els.month.value;
    state.periodKey = defaultWeeklyPeriod(currentMonth())?.key || "";
    render();
  });
  els.week.addEventListener("change", () => {
    state.periodKey = els.week.value;
    render();
  });
  els.year.addEventListener("change", render);
  els.customStart.addEventListener("change", render);
  els.customEnd.addEventListener("change", render);
  els.fileInput?.addEventListener("change", importWorkbook);
  els.presentationButton.addEventListener("click", togglePresentationMode);
  els.printButton.addEventListener("click", printExecutiveReport);
  els.detailsButton.addEventListener("click", () => {
    const expanded = els.detailsButton.getAttribute("aria-expanded") === "true";
    els.detailsButton.setAttribute("aria-expanded", String(!expanded));
    els.detailsContent.hidden = expanded;
    setButtonLabel(els.detailsButton, expanded ? "Metodologia e fontes" : "Ocultar metodologia e fontes");
  });
  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement && document.body.classList.contains("presentation-mode")) {
      document.body.classList.remove("presentation-mode");
      setButtonLabel(els.presentationButton, "Apresentar");
    }
  });
  window.addEventListener("beforeprint", resizeCharts);
  window.addEventListener("afterprint", resizeCharts);
}

async function loadWorkbook() {
  await waitForAuth();
  try {
    const saved = await window.SGPAuth?.loadManualIndicators?.();
    if (isValidWorkbook(saved?.generalWorkbook)) {
      persistLocalWorkbook(saved.generalWorkbook, "Lançamentos manuais SGP");
      return saved.generalWorkbook;
    }
  } catch (error) {
    console.warn(error);
  }

  const stored = parseStoredJson(STORAGE_KEYS.workbook);
  if (isValidWorkbook(stored)) return stored;

  const seed = window.SGP_MANUAL_INDICATORS_SEED?.generalWorkbook;
  return isValidWorkbook(seed) ? seed : null;
}

async function loadGoals() {
  await waitForAuth();
  const loaded = window.SGPAuth?.indicatorGoals?.() || {};
  return { ...DEFAULT_GOALS, ...loaded };
}

async function loadOccurrenceData() {
  await waitForAuth();
  const sources = [];

  try {
    const saved = await window.SGPAuth?.loadManualOccurrences?.();
    if (saved?.workbook && saved?.monthOrder?.length) {
      sources.push(saved.monthOrder.flatMap((key) => saved.workbook[key]?.records || []));
    }
  } catch (error) {
    console.warn(error);
  }

  try {
    const response = await fetch(`${OCCURRENCE_SHEETS_URL}&_=${Date.now()}`, { cache: "no-store" });
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      sources.push(parseOccurrenceSheets(buffer));
    }
  } catch (error) {
    console.warn(error);
  }

  if (!sources.length) {
    const stored = parseStoredJson(OCCURRENCE_STORAGE_KEY);
    if (stored?.workbook) sources.push(Object.values(stored.workbook).flatMap((month) => month?.records || []));
  }

  return deduplicateOccurrences(sources.flat());
}

function parseOccurrenceSheets(buffer) {
  if (typeof XLSX === "undefined") return [];
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  return workbook.SheetNames.flatMap((sheetName) => {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, raw: false, defval: "" });
    const headerIndex = rows.findIndex((row) => row.some((cell) => normalizeText(cell) === "OCORRENCIAS"));
    if (headerIndex < 0) return [];
    const headers = rows[headerIndex].map(normalizeOccurrenceHeader);
    return rows.slice(headerIndex + 1).flatMap((row) => {
      const record = Object.fromEntries(headers.map((header, index) => [header, clean(row[index])]));
      const occurrence = record.ocorrencias || record.ocorrencia || "";
      const city = record.cidade || "";
      if (!occurrence || !city || normalizeText(occurrence).includes("TOTAL")) return [];
      return [{
        date: record.data,
        branch: record.filial || "-",
        city,
        occurrence,
        reason: record.motivo || "-",
        downtime: record.tempo_off || record.tempo || "-"
      }];
    });
  });
}

function normalizeOccurrenceHeader(value) {
  return clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function deduplicateOccurrences(rows) {
  const unique = new Map();
  rows.forEach((row) => {
    const normalized = {
      date: clean(row?.date),
      branch: clean(row?.branch) || "-",
      city: clean(row?.city) || "-",
      occurrence: clean(row?.occurrence),
      reason: clean(row?.reason) || "-",
      downtime: clean(row?.downtime) || "-"
    };
    if (!normalized.occurrence) return;
    const key = [normalized.date, normalized.branch, normalized.city, normalized.occurrence, normalized.reason, normalized.downtime].map(normalizeText).join("|");
    if (!unique.has(key)) unique.set(key, normalized);
  });
  return [...unique.values()];
}

async function waitForAuth() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (document.documentElement.dataset.authReady === "true") return;
    await new Promise((resolve) => window.setTimeout(resolve, 100));
  }
}

function render() {
  renderFilters();
  const report = buildReport();
  renderHeadline(report);
  renderExecutiveSnapshot(report);
  renderCards(report);
  renderWeekly(report);
  renderWeeklyHighlights(report);
  renderMonthly(report);
  renderGoalResults(report);
  renderOccurrences(report);
  renderCharts(report);
  renderDecisionLists(report);
  renderRecommendations(report);
  renderConclusion(report);
  els.status.textContent = `${state.workbook.monthOrder.length} mês(es) de indicadores e ${state.occurrences.length.toLocaleString("pt-BR")} ocorrência(s) disponíveis. Comparações calculadas automaticamente sem alterar as bases originais.`;
  window.lucide?.createIcons();
}

function renderFilters() {
  els.mode.value = state.mode;
  const monthIds = state.workbook.monthOrder || [];
  els.month.innerHTML = monthIds.map((monthId) => `<option value="${escapeHtml(monthId)}">${escapeHtml(state.workbook.months[monthId]?.label || monthId)}</option>`).join("");
  els.month.value = state.monthId;

  const periods = weeklyPeriods(currentMonth());
  if (!periods.some((period) => period.key === state.periodKey)) state.periodKey = periods.at(-1)?.key || "";
  els.week.innerHTML = periods.map((period) => `<option value="${escapeHtml(period.key)}">${escapeHtml(periodDisplayLabel(period))}</option>`).join("");
  els.week.value = state.periodKey;

  const years = availableYears();
  const requestedYear = Number(els.year.value);
  const selectedYear = years.includes(requestedYear)
    ? requestedYear
    : monthYear(currentMonth()) || years.at(-1) || new Date().getFullYear();
  els.year.innerHTML = years.map((year) => `<option value="${year}">${year}</option>`).join("");
  if (![...els.year.options].some((option) => Number(option.value) === selectedYear)) {
    els.year.insertAdjacentHTML("beforeend", `<option value="${selectedYear}">${selectedYear}</option>`);
  }
  els.year.value = String(selectedYear);
  syncFilterVisibility();
}

function syncFilterVisibility() {
  const weekly = state.mode === "weekly";
  const yearly = state.mode === "yearly";
  const custom = state.mode === "custom";
  els.weekField.hidden = !weekly;
  els.yearField.hidden = !yearly;
  els.customStartField.hidden = !custom;
  els.customEndField.hidden = !custom;
  els.monthField.hidden = yearly || custom;
}

function buildReport() {
  const selection = selectionContext();
  const indicators = METRICS.map((config) => buildIndicator(config, selection));
  const index = evolutionIndex(indicators);
  const hasResults = indicators.some((indicator) => hasValue(indicator.current));
  const className = !hasResults ? "neutral" : index >= 70 ? "good" : index >= 45 ? "warn" : "bad";
  const status = !hasResults ? "Sem dados" : index >= 70 ? "Evolução positiva" : index >= 45 ? "Cenário de atenção" : "Necessita atenção";
  const report = {
    selection,
    indicators,
    index,
    className,
    status,
    weekly: weeklyTimeline(),
    monthly: monthlyTimeline()
  };
  report.occurrence = buildOccurrenceSummary(selection);
  return report;
}

function selectionContext() {
  if (state.mode === "monthly") return monthlySelection();
  if (state.mode === "yearly") return yearlySelection();
  if (state.mode === "custom") return customSelection();
  return weeklySelection();
}

function weeklySelection() {
  const month = currentMonth();
  const periods = weeklyPeriods(month);
  const current = periods.find((period) => period.key === state.periodKey) || periods.at(-1) || null;
  const allPeriods = month?.periods || [];
  const currentIndex = allPeriods.findIndex((period) => period.key === current?.key);
  let previous = currentIndex > 0 ? allPeriods[currentIndex - 1] : null;
  if (previous && isMonthlyPeriod(previous)) previous = null;
  const previousMonth = previousMonthFor(month);
  const fallback = latestWeeklyPeriod(previousMonth);
  const previousContext = previous
    ? { month, period: previous }
    : fallback ? { month: previousMonth, period: fallback } : null;
  return {
    label: current ? periodDisplayLabel(current) : month?.label || "Período",
    comparisonLabel: previousContext ? periodDisplayLabel(previousContext.period) : "Sem período anterior",
    currentRange: periodDateRange(month, current),
    previousRange: previousContext ? periodDateRange(previousContext.month, previousContext.period) : null,
    currentValue: (config) => metricPeriodValue(month, current, config),
    previousValue: (config) => previousContext ? metricPeriodValue(previousContext.month, previousContext.period, config) : ""
  };
}

function monthlySelection() {
  const month = currentMonth();
  const previous = previousMonthFor(month);
  return {
    label: month?.label || "Mês selecionado",
    comparisonLabel: previous?.label || "Sem mês anterior",
    currentRange: monthDateRange(month),
    previousRange: monthDateRange(previous),
    currentValue: (config) => metricMonthlyValue(month, config),
    previousValue: (config) => metricMonthlyValue(previous, config)
  };
}

function yearlySelection() {
  const year = Number(els.year.value) || monthYear(currentMonth());
  const currentMonths = monthsForYear(year);
  const previousMonths = monthsForYear(year - 1);
  return {
    label: `Ano ${year}`,
    comparisonLabel: previousMonths.length ? `Ano ${year - 1}` : "Sem ano anterior",
    currentRange: yearDateRange(year),
    previousRange: previousMonths.length ? yearDateRange(year - 1) : null,
    currentValue: (config) => aggregateValues(currentMonths.map((month) => metricMonthlyValue(month, config)), config.type),
    previousValue: (config) => aggregateValues(previousMonths.map((month) => metricMonthlyValue(month, config)), config.type)
  };
}

function customSelection() {
  const start = dateValue(els.customStart.value);
  const end = dateValue(els.customEnd.value);
  const selected = datedPeriods().filter((item) => item.end >= start && item.start <= end);
  const duration = end && start ? Math.max(1, end - start + 86400000) : 0;
  const previousEnd = start ? start - 86400000 : 0;
  const previousStart = previousEnd && duration ? previousEnd - duration + 86400000 : 0;
  const previous = datedPeriods().filter((item) => item.end >= previousStart && item.start <= previousEnd);
  return {
    label: start && end ? `${shortDate(start)} a ${shortDate(end)}` : "Período personalizado",
    comparisonLabel: previousStart && previousEnd ? `${shortDate(previousStart)} a ${shortDate(previousEnd)}` : "Sem período anterior",
    currentRange: start && end ? { start, end } : null,
    previousRange: previousStart && previousEnd ? { start: previousStart, end: previousEnd } : null,
    currentValue: (config) => aggregateValues(selected.map((item) => metricPeriodValue(item.month, item.period, config)), config.type),
    previousValue: (config) => aggregateValues(previous.map((item) => metricPeriodValue(item.month, item.period, config)), config.type)
  };
}

function buildIndicator(config, selection) {
  const current = selection.currentValue(config);
  const previous = selection.previousValue(config);
  const goal = state.goals[config.goalKey] ?? DEFAULT_GOALS[config.goalKey];
  const hasCurrent = hasValue(current);
  const hasPrevious = hasValue(previous);
  const currentNumber = comparableValue(current, config.type);
  const previousNumber = comparableValue(previous, config.type);
  const absolute = hasCurrent && hasPrevious ? currentNumber - previousNumber : null;
  const percent = hasCurrent && hasPrevious && previousNumber !== 0 ? (absolute / Math.abs(previousNumber)) * 100 : null;
  const goalNumber = comparableValue(goal, config.type);
  const goalMet = hasCurrent && (config.direction === "down" ? currentNumber <= goalNumber : currentNumber >= goalNumber);
  const trend = absolute === null || Math.abs(absolute) < 0.000001
    ? "neutral"
    : config.direction === "down" ? (absolute < 0 ? "good" : "bad") : (absolute > 0 ? "good" : "bad");
  const statusClass = !hasCurrent ? "neutral" : goalMet && trend !== "bad" ? "good" : goalMet ? "warn" : "bad";
  const status = !hasCurrent ? "Sem dados" : goalMet ? "Dentro da Meta" : "Fora da Meta";
  return { ...config, current, previous, goal, absolute, percent, goalMet, trend, statusClass, status };
}

function evolutionIndex(indicators) {
  let weighted = 0;
  let totalWeight = 0;
  indicators.forEach((indicator) => {
    if (!hasValue(indicator.current)) return;
    const weight = positiveNumber(state.goals[indicator.weightKey], 1);
    const score = hasValue(indicator.previous)
      ? indicator.trend === "good" ? 100 : indicator.trend === "bad" ? 0 : 50
      : indicator.goalMet ? 100 : 0;
    weighted += score * weight;
    totalWeight += weight;
  });
  return totalWeight ? Math.round(weighted / totalWeight) : 0;
}

function renderHeadline(report) {
  const improved = report.indicators.filter((item) => item.trend === "good");
  const worsened = report.indicators.filter((item) => item.trend === "bad");
  const met = report.indicators.filter((item) => item.goalMet);
  const available = report.indicators.filter((item) => hasValue(item.current));
  els.resultStatus.className = `result-status ${report.className}`;
  els.resultStatus.textContent = report.status;
  els.resultHero.style.borderLeftColor = report.className === "good"
    ? "var(--green)"
    : report.className === "warn" ? "var(--amber)" : report.className === "bad" ? "var(--red)" : "var(--blue)";
  els.evolutionIndex.textContent = `${report.index}%`;
  els.evolutionGauge.style.setProperty("--gauge-value", `${Math.max(0, Math.min(100, report.index)) * 3.6}deg`);
  els.evolutionGauge.style.setProperty("--gauge-color", report.className === "good"
    ? "var(--green)"
    : report.className === "warn" ? "var(--amber)" : report.className === "bad" ? "var(--red)" : "var(--blue)");
  els.evolutionMethod.textContent = `Pesos: TMA ${metricWeight("tma")} · TMR ${metricWeight("tmr")} · CSAT ${metricWeight("csat")}`;
  els.executiveSummary.textContent = executiveSummaryText(report, improved, worsened, met, available);
  els.activePeriodLabel.textContent = `${report.selection.label} x ${report.selection.comparisonLabel}`;
  const printPeriodLabel = `${report.selection.label} | comparação: ${report.selection.comparisonLabel}`;
  els.printPeriod.textContent = printPeriodLabel;
  document.querySelectorAll(".print-period-copy").forEach((element) => { element.textContent = printPeriodLabel; });
  els.comparisonLabel.textContent = report.selection.comparisonLabel;
  els.generatedAt.textContent = `Atualizado em ${new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}`;
}

function executiveSummaryText(report, improved, worsened, met, available) {
  if (!available.length) return "Não há dados suficientes para interpretar o período selecionado.";
  const opening = report.className === "good"
    ? "No período analisado, os principais indicadores apresentaram evolução positiva."
    : report.className === "warn"
      ? "No período analisado, os resultados ficaram divididos e exigem acompanhamento da gestão."
      : "No período analisado, houve deterioração nos principais indicadores e a gestão deve priorizar ações corretivas.";
  const improvementText = improved.length ? ` Melhoraram: ${improved.map((item) => item.label).join(", ")}.` : "";
  const attentionText = worsened.length ? ` Precisam de atenção: ${worsened.map((item) => item.label).join(", ")}.` : "";
  return `${opening}${improvementText}${attentionText} ${met.length} de ${available.length} metas foram atingidas.`;
}

function renderExecutiveSnapshot(report) {
  const available = report.indicators.filter((item) => hasValue(item.current));
  const met = available.filter((item) => item.goalMet);
  const improved = report.indicators.filter((item) => item.trend === "good").sort(byVariationMagnitude);
  const priorities = report.indicators.filter((item) => hasValue(item.current) && (!item.goalMet || item.trend === "bad")).sort(byVariationMagnitude);
  const occurrence = report.occurrence;
  const occurrenceDetail = occurrence.previousRows.length
    ? `${occurrence.delta > 0 ? "+" : ""}${occurrence.delta} frente ao período anterior`
    : "Sem base anterior comparável";
  const items = [
    {
      icon: "target",
      label: "Metas atingidas",
      value: `${met.length} de ${available.length || METRICS.length}`,
      detail: available.length ? `${Math.round((met.length / available.length) * 100)}% de cumprimento` : "Sem dados suficientes",
      className: available.length && met.length === available.length ? "good" : met.length ? "warn" : "bad"
    },
    {
      icon: "trending-up",
      label: "Principal avanço",
      value: improved[0]?.label || "Sem avanço",
      detail: improved[0] ? changeHeadline(improved[0]) : "Nenhuma melhora comparável",
      className: improved.length ? "good" : "warn"
    },
    {
      icon: "triangle-alert",
      label: "Prioridade executiva",
      value: priorities[0]?.label || "Manter padrão",
      detail: priorities[0] ? priorityDetail(priorities[0]) : "Indicadores principais controlados",
      className: priorities.length ? "bad" : "good"
    },
    {
      icon: "radio-tower",
      label: "Ocorrências",
      value: occurrence.currentRows.length.toLocaleString("pt-BR"),
      detail: occurrenceDetail,
      className: occurrence.comparisonClass
    }
  ];
  els.snapshot.innerHTML = items.map((item) => `
    <article class="snapshot-item ${item.className}">
      <span class="snapshot-icon"><i data-lucide="${item.icon}" aria-hidden="true"></i></span>
      <div><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong><small>${escapeHtml(item.detail)}</small></div>
    </article>
  `).join("");
}

function renderWeeklyHighlights(report) {
  if (!els.weeklyHighlights) return;
  const points = [];
  const available = report.indicators.filter((item) => hasValue(item.current));
  const improved = available.filter((item) => item.trend === "good").sort(byVariationMagnitude);
  const risks = available.filter((item) => item.trend === "bad" || !item.goalMet).sort(byVariationMagnitude);
  if (improved[0]) points.push({ className: "good", text: `${improved[0].label}: ${decisionSentence(improved[0], true)}` });
  if (risks[0]) points.push({ className: "bad", text: `${risks[0].label}: ${priorityDetail(risks[0])}` });
  const met = available.filter((item) => item.goalMet).length;
  points.push({ className: met === available.length && available.length ? "good" : "neutral", text: `${met} de ${available.length || METRICS.length} indicadores encerraram dentro da meta.` });
  els.weeklyHighlights.innerHTML = points.slice(0, 3).map((point) => `<div class="narrative-point ${point.className}">${escapeHtml(point.text)}</div>`).join("");
}

function renderCards(report) {
  els.cards.innerHTML = report.indicators.map((item) => `
    <article class="metric-card ${item.statusClass}">
      <header><div><h3>${escapeHtml(item.label)}</h3><span class="metric-name">${escapeHtml(item.fullName)}</span></div><span class="status-pill ${item.statusClass}">${escapeHtml(item.status)}</span></header>
      <div class="metric-value-row"><div class="metric-value">${escapeHtml(formatMetric(item.current, item.type))}</div><div class="metric-change ${item.trend}">${escapeHtml(changeHeadline(item))}</div></div>
      <div class="metric-facts">
        <span>Meta<strong>${escapeHtml(formatMetric(item.goal, item.type))}</strong></span>
        <span>Anterior<strong>${escapeHtml(formatMetric(item.previous, item.type))}</strong></span>
      </div>
      <footer>${escapeHtml(changeExplanation(item))}</footer>
    </article>
  `).join("");
}

function renderWeekly(report) {
  els.weeklyBody.innerHTML = report.weekly.length
    ? report.weekly.map((row) => `
      <tr>
        <td>${escapeHtml(row.label)}</td>
        ${METRICS.map((config) => `<td>${escapeHtml(formatMetric(row.values[config.key], config.type))}</td>`).join("")}
        <td>${renderTableStatus(row.status)}</td>
      </tr>
    `).join("")
    : '<tr><td colspan="5">Sem semanas disponíveis.</td></tr>';
  els.weeklyNarrative.textContent = weeklyNarrative(report.weekly);
}

function renderMonthly(report) {
  els.monthlyBody.innerHTML = report.monthly.length
    ? report.monthly.map((row) => `
      <tr>
        <td>${escapeHtml(row.label)}</td>
        ${METRICS.map((config) => `<td>${escapeHtml(formatMetric(row.values[config.key], config.type))}</td>`).join("")}
        <td>${row.goalsMet}/${METRICS.length}</td>
        <td>${renderTableStatus(row.status)}</td>
      </tr>
    `).join("")
    : '<tr><td colspan="6">Sem meses disponíveis.</td></tr>';
}

function renderGoalResults(report) {
  const available = report.indicators.filter((item) => hasValue(item.current));
  const met = available.filter((item) => item.goalMet).length;
  els.goalScore.textContent = `${met}/${available.length || METRICS.length}`;
  els.goalResults.innerHTML = report.indicators.map((item) => `
    <div class="goal-row">
      <div><span>Indicador</span><strong>${escapeHtml(item.label)}</strong></div>
      <div class="goal-result-value"><span>Meta / resultado</span><strong>${escapeHtml(formatMetric(item.goal, item.type))} / ${escapeHtml(formatMetric(item.current, item.type))}</strong></div>
      <div>${renderTableStatus(
        !hasValue(item.current) ? "neutral" : item.goalMet ? "good" : "bad",
        !hasValue(item.current) ? "Sem dados" : item.goalMet ? "Atingiu" : "Não atingiu"
      )}</div>
    </div>
  `).join("");
}

function buildOccurrenceSummary(selection) {
  const currentRows = occurrencesInRange(selection.currentRange);
  const previousRows = occurrencesInRange(selection.previousRange);
  const city = occurrenceRanking(currentRows, "city")[0];
  const reasonRanking = occurrenceRanking(currentRows, "reason");
  const reason = reasonRanking[0];
  const offlineSeconds = currentRows.reduce((total, row) => {
    const seconds = occurrenceOfflineSeconds(row.downtime);
    return total + (Number.isFinite(seconds) ? seconds : 0);
  }, 0);
  const delta = currentRows.length - previousRows.length;
  const percent = previousRows.length ? (delta / previousRows.length) * 100 : null;
  const comparisonClass = !previousRows.length ? "neutral" : delta <= 0 ? "good" : "bad";
  return { currentRows, previousRows, city, reason, reasonRanking, offlineSeconds, delta, percent, comparisonClass };
}

function renderCharts(report) {
  renderAdherenceChart("weekly", els.weeklyChart, report.weekly);
  renderAdherenceChart("monthly", els.monthlyChart, report.monthly);
  renderOccurrenceCharts(report);
}

function renderAdherenceChart(key, canvas, rows) {
  if (!canvas || !window.Chart) return;
  destroyChart(key);
  const colors = { tma: "#1f7ea8", tmr: "#dd8b18", csat: "#00a66f" };
  const datasets = METRICS.map((config) => ({
    label: config.label,
    data: rows.map((row) => metricAdherence(row.values[config.key], config)),
    borderColor: colors[config.key],
    backgroundColor: colors[config.key],
    borderWidth: 2.5,
    pointRadius: 3,
    pointHoverRadius: 5,
    tension: 0.25,
    spanGaps: true
  }));
  datasets.push({
    label: "Meta",
    data: rows.map(() => 100),
    borderColor: "#6a7d89",
    borderDash: [5, 5],
    borderWidth: 1.5,
    pointRadius: 0,
    tension: 0
  });
  state.charts[key] = new Chart(canvas, {
    type: "line",
    data: { labels: rows.map((row) => compactPeriodLabel(row.label)), datasets },
    options: baseChartOptions({
      scales: {
        x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true } },
        y: { beginAtZero: true, suggestedMax: 130, ticks: { callback: (value) => `${value}%` }, grid: { color: "#dfe9ed" } }
      }
    })
  });
}

function renderOccurrenceCharts(report) {
  if (!window.Chart) return;
  const selectedSort = currentMonth()?.sortKey || Infinity;
  const monthlyRows = (state.workbook.monthOrder || [])
    .map((monthId) => state.workbook.months[monthId])
    .filter((month) => (month?.sortKey || 0) <= selectedSort)
    .slice(-12)
    .map((month) => ({ label: month.label, total: occurrencesInRange(monthDateRange(month)).length }));

  destroyChart("occurrenceTrend");
  if (els.occurrenceTrendChart) {
    state.charts.occurrenceTrend = new Chart(els.occurrenceTrendChart, {
      type: "line",
      data: {
        labels: monthlyRows.map((row) => compactMonthLabel(row.label)),
        datasets: [{ label: "Ocorrências", data: monthlyRows.map((row) => row.total), borderColor: "#1f7ea8", backgroundColor: "rgba(31, 126, 168, 0.12)", fill: true, borderWidth: 2.5, pointRadius: 3, tension: 0.28 }]
      },
      options: baseChartOptions({ scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: "#dfe9ed" } } } })
    });
  }

  destroyChart("occurrenceReason");
  const reasons = report.occurrence.reasonRanking.slice(0, 6).reverse();
  if (els.occurrenceReasonChart) {
    state.charts.occurrenceReason = new Chart(els.occurrenceReasonChart, {
      type: "bar",
      data: {
        labels: reasons.map((row) => truncateLabel(row.name, 24)),
        datasets: [{ label: "Ocorrências", data: reasons.map((row) => row.total), backgroundColor: reasons.map((_, index) => index === reasons.length - 1 ? "#dd8b18" : "#4bb493"), borderRadius: 3 }]
      },
      options: baseChartOptions({ indexAxis: "y", plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: "#dfe9ed" } }, y: { grid: { display: false } } } })
    });
  }
}

function baseChartOptions(overrides = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { position: "bottom", labels: { usePointStyle: true, boxWidth: 8, padding: 14, color: "#29475b", font: { size: 11, weight: 700 } } },
      tooltip: { backgroundColor: "#10283c", padding: 10, titleFont: { weight: 800 } }
    },
    ...overrides,
    plugins: { ...{
      legend: { position: "bottom", labels: { usePointStyle: true, boxWidth: 8, padding: 14, color: "#29475b", font: { size: 11, weight: 700 } } },
      tooltip: { backgroundColor: "#10283c", padding: 10, titleFont: { weight: 800 } }
    }, ...(overrides.plugins || {}) }
  };
}

function metricAdherence(value, config) {
  if (!hasValue(value)) return null;
  const current = comparableValue(value, config.type);
  const goal = comparableValue(state.goals[config.goalKey] ?? DEFAULT_GOALS[config.goalKey], config.type);
  if (!Number.isFinite(current) || !Number.isFinite(goal) || current < 0 || goal <= 0) return null;
  const score = config.direction === "down" ? (goal / Math.max(current, 0.000001)) * 100 : (current / goal) * 100;
  return Math.round(Math.min(180, score) * 10) / 10;
}

function destroyChart(key) {
  state.charts[key]?.destroy?.();
  delete state.charts[key];
}

function resizeCharts() {
  window.setTimeout(() => Object.values(state.charts).forEach((chart) => chart?.resize?.()), 50);
}

function renderOccurrences(report) {
  if (!els.occurrenceCards || !els.occurrenceNarrative) return;
  const { currentRows, previousRows, city, reason, offlineSeconds, delta, percent, comparisonClass } = report.occurrence;

  els.occurrencePeriodLabel.textContent = report.selection.label;
  els.occurrenceCards.innerHTML = [
    {
      label: "Ocorrências no período",
      value: currentRows.length.toLocaleString("pt-BR"),
      detail: previousRows.length
        ? `${delta > 0 ? "+" : ""}${delta} vs. período anterior (${formatSignedPercent(percent)})`
        : "Sem base anterior comparável",
      className: comparisonClass
    },
    { label: "Cidade mais afetada", value: city?.name || "-", detail: city ? `${city.total} ocorrência(s)` : "Sem registros", className: city ? "warn" : "neutral" },
    { label: "Principal causa", value: reason?.name || "-", detail: reason ? `${reason.total} ocorrência(s)` : "Sem registros", className: reason ? "warn" : "neutral" },
    { label: "Tempo offline acumulado", value: offlineSeconds ? humanOfflineDuration(offlineSeconds) : "-", detail: "Somente ocorrências com início e fim", className: offlineSeconds ? "bad" : "neutral" }
  ].map((item) => `
    <article class="occurrence-card ${item.className}">
      <span>${escapeHtml(item.label)}</span>
      <strong>${escapeHtml(item.value)}</strong>
      <small>${escapeHtml(item.detail)}</small>
    </article>
  `).join("");

  if (!currentRows.length) {
    els.occurrenceNarrative.textContent = "Não há ocorrências registradas no período selecionado.";
  } else if (!previousRows.length) {
    els.occurrenceNarrative.textContent = `${currentRows.length} ocorrência(s) registrada(s), com maior concentração em ${city?.name || "cidade não informada"} e predominância de ${reason?.name || "motivo não informado"}.`;
  } else {
    const direction = delta < 0 ? "redução" : delta > 0 ? "aumento" : "estabilidade";
    els.occurrenceNarrative.textContent = `O período apresentou ${direction} no volume de ocorrências em relação ao anterior. A maior concentração foi em ${city?.name || "cidade não informada"}, e a causa mais frequente foi ${reason?.name || "motivo não informado"}.`;
  }
}

function renderDecisionLists(report) {
  const improved = report.indicators.filter((item) => item.trend === "good");
  const worsened = report.indicators.filter((item) => hasValue(item.current) && (item.trend === "bad" || !item.goalMet));
  els.improved.innerHTML = improved.length
    ? improved.map((item) => `<li><strong>${escapeHtml(item.label)}</strong> ${escapeHtml(decisionSentence(item, true))}</li>`).join("")
    : "<li>Nenhum avanço comparável foi identificado no período.</li>";
  els.attention.innerHTML = worsened.length
    ? uniqueByKey(worsened).map((item) => `<li><strong>${escapeHtml(item.label)}</strong> ${escapeHtml(decisionSentence(item, false))}</li>`).join("")
    : "<li>Nenhum dos principais indicadores apresentou deterioração no período.</li>";
}

function renderRecommendations(report) {
  if (!els.recommendations) return;
  const actions = [];
  report.indicators
    .filter((item) => hasValue(item.current) && (!item.goalMet || item.trend === "bad"))
    .sort((a, b) => Number(a.goalMet) - Number(b.goalMet) || byVariationMagnitude(a, b))
    .forEach((item) => {
      const texts = {
        tma: "Revisar distribuição da fila, complexidade das tratativas e etapas que elevam o tempo médio. Definir responsável e reavaliar no próximo fechamento.",
        tmr: "Atuar sobre o tempo de primeira resposta, cobertura da fila e priorização dos contatos. Acompanhar diariamente até retornar ao limite configurado.",
        csat: "Auditar atendimentos com notas baixas, identificar causas recorrentes e transformar os achados em orientação prática para a equipe."
      };
      actions.push({
        level: item.goalMet ? "Média" : "Alta",
        className: item.goalMet ? "priority-medium" : "priority-high",
        title: `${item.label}: recuperar aderência`,
        text: texts[item.key]
      });
    });

  if (report.occurrence.previousRows.length && report.occurrence.delta > 0) {
    actions.push({
      level: "Alta",
      className: "priority-high",
      title: "Reduzir recorrência operacional",
      text: `Concentrar a análise em ${report.occurrence.city?.name || "local não informado"} e na causa ${report.occurrence.reason?.name || "não informada"}, que lideram o recorte atual.`
    });
  }

  if (!actions.length) {
    actions.push({
      level: "Manutenção",
      className: "priority-maintain",
      title: "Sustentar o padrão atual",
      text: "Manter a rotina de acompanhamento, registrar desvios e preservar as práticas que conduziram os indicadores ao objetivo."
    });
  }

  els.recommendations.innerHTML = actions.slice(0, 3).map((action, index) => `
    <article class="recommendation-item ${action.className}">
      <header><span>Prioridade ${escapeHtml(action.level)}</span><strong>${String(index + 1).padStart(2, "0")}</strong></header>
      <h3>${escapeHtml(action.title)}</h3>
      <p>${escapeHtml(action.text)}</p>
    </article>
  `).join("");
}

function renderConclusion(report) {
  const available = report.indicators.filter((item) => hasValue(item.current));
  const met = available.filter((item) => item.goalMet);
  const outside = available.filter((item) => !item.goalMet);
  if (!available.length) {
    els.conclusionTitle.textContent = "Período sem dados";
    els.conclusion.textContent = "Ainda não existem valores suficientes para produzir uma conclusão executiva deste período.";
    return;
  }
  els.conclusionTitle.textContent = report.className === "good" ? "Resultado favorável" : report.className === "warn" ? "Resultado requer acompanhamento" : "Prioridade de atuação";
  const occurrenceText = report.occurrence.currentRows.length
    ? ` Foram registradas ${report.occurrence.currentRows.length} ocorrências, com maior concentração em ${report.occurrence.city?.name || "local não informado"}.`
    : " Não houve ocorrência registrada no recorte selecionado.";
  els.conclusion.textContent = `${report.selection.label} encerrou com ${met.length} de ${available.length} metas atingidas. ${met.length ? `${met.map((item) => item.label).join(", ")} ${met.length === 1 ? "permaneceu" : "permaneceram"} dentro do objetivo.` : "Nenhum indicador principal atingiu a meta."} ${outside.length ? `${outside.map((item) => item.label).join(", ")} ${outside.length === 1 ? "deve" : "devem"} receber atenção no próximo ciclo.` : "A operação deve manter o padrão atual e acompanhar a consistência nas próximas semanas."}${occurrenceText}`;
}

function byVariationMagnitude(a, b) {
  return Math.abs(b.percent || 0) - Math.abs(a.percent || 0);
}

function priorityDetail(item) {
  if (!item.goalMet) return `${item.status}. ${changeExplanation(item)}`;
  return changeExplanation(item);
}

function compactPeriodLabel(label) {
  const text = fixMojibake(label || "");
  const range = text.match(/\((\d{2}\/\d{2})\s+a\s+(\d{2}\/\d{2})\)/i);
  const name = text.replace(/\s*\([^)]*\)\s*$/, "").replace(/SEMANA/gi, "Sem.").trim();
  return range ? `${name} ${range[1]}-${range[2]}` : name;
}

function compactMonthLabel(label) {
  const [month = "", year = ""] = fixMojibake(label || "").split(/\s+/);
  return `${month.slice(0, 3)}${year ? `/${year.slice(-2)}` : ""}`;
}

function truncateLabel(value, maxLength) {
  const text = fixMojibake(value || "");
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function weeklyTimeline() {
  const month = currentMonth();
  return weeklyPeriods(month)
    .map((period) => {
      const values = Object.fromEntries(METRICS.map((config) => [config.key, metricPeriodValue(month, period, config)]));
      return { label: periodDisplayLabel(period), values, status: periodStatus(values) };
    })
    .filter((row) => METRICS.some((config) => hasValue(row.values[config.key])));
}

function monthlyTimeline() {
  const selectedSort = currentMonth()?.sortKey || Infinity;
  return (state.workbook.monthOrder || [])
    .map((monthId) => state.workbook.months[monthId])
    .filter((month) => (month?.sortKey || 0) <= selectedSort)
    .slice(-12)
    .map((month) => {
      const values = Object.fromEntries(METRICS.map((config) => [config.key, metricMonthlyValue(month, config)]));
      const goalsMet = METRICS.filter((config) => valueMeetsGoal(values[config.key], config)).length;
      const previous = previousMonthFor(month);
      const previousValues = Object.fromEntries(METRICS.map((config) => [config.key, metricMonthlyValue(previous, config)]));
      return { label: month.label, values, goalsMet, status: valuesEvolutionStatus(values, previousValues) };
    });
}

function periodStatus(values) {
  const met = METRICS.filter((config) => valueMeetsGoal(values[config.key], config)).length;
  return met === METRICS.length ? "good" : met >= 2 ? "warn" : "bad";
}

function valuesEvolutionStatus(values, previousValues) {
  const trends = METRICS.map((config) => trendForValues(values[config.key], previousValues[config.key], config));
  const good = trends.filter((trend) => trend === "good").length;
  const bad = trends.filter((trend) => trend === "bad").length;
  return good > bad ? "good" : bad > good ? "bad" : "warn";
}

function weeklyNarrative(rows) {
  if (rows.length < 2) return "Ainda não há semanas suficientes para identificar uma tendência consistente.";
  const first = rows[0].values;
  const last = rows.at(-1).values;
  const improved = METRICS.filter((config) => trendForValues(last[config.key], first[config.key], config) === "good");
  const worsened = METRICS.filter((config) => trendForValues(last[config.key], first[config.key], config) === "bad");
  if (improved.length > worsened.length) return `Nas semanas disponíveis, houve evolução predominante, com melhoria em ${improved.map((item) => item.label).join(", ")}.`;
  if (worsened.length > improved.length) return `A sequência semanal indica deterioração predominante em ${worsened.map((item) => item.label).join(", ")}, exigindo acompanhamento.`;
  return "A evolução semanal ficou estável ou dividida entre melhorias e oscilações, sem tendência predominante.";
}

function currentMonth() {
  return state.workbook?.months?.[state.monthId] || null;
}

function previousMonthFor(month) {
  if (!month) return null;
  const index = state.workbook.monthOrder.indexOf(month.id);
  if (index > 0) return state.workbook.months[state.workbook.monthOrder[index - 1]] || null;
  const previous = [...state.workbook.monthOrder]
    .reverse()
    .map((monthId) => state.workbook.months[monthId])
    .find((item) => (item?.sortKey || 0) < (month.sortKey || 0));
  return previous || null;
}

function weeklyPeriods(month) {
  return (month?.periods || []).filter((period) => !isMonthlyPeriod(period) && !isCarryPeriod(period));
}

function latestWeeklyPeriod(month) {
  return weeklyPeriods(month).filter((period) => periodHasCoreData(month, period)).at(-1) || weeklyPeriods(month).at(-1) || null;
}

function defaultWeeklyPeriod(month) {
  return weeklyPeriods(month).filter((period) => periodHasCoreData(month, period)).at(-1) || weeklyPeriods(month).at(-1) || null;
}

function periodHasCoreData(month, period) {
  return METRICS.some((config) => hasValue(metricPeriodValue(month, period, config)));
}

function metricPeriodValue(month, period, config) {
  if (!month || !period) return "";
  const metric = findMetric(month, config);
  return normalizeMetricValue(metric?.values?.[period.key], config.type);
}

function metricMonthlyValue(month, config) {
  if (!month) return "";
  const metric = findMetric(month, config);
  if (!metric) return "";
  const explicit = (month.periods || []).find(isMonthlyPeriod);
  if (explicit && hasValue(metric.values?.[explicit.key])) return normalizeMetricValue(metric.values[explicit.key], config.type);
  return aggregateValues(weeklyPeriods(month).map((period) => metricPeriodValue(month, period, config)), config.type);
}

function findMetric(month, config) {
  return (month?.metrics || []).find((metric) => isMetricName(metric.name, config)) || null;
}

function isMetricName(value, config) {
  const normalized = normalizeText(value);
  return normalized === normalizeText(config.source)
    || METRIC_ALIASES[config.key].some((alias) => normalized === normalizeText(alias));
}

function aggregateValues(values, type) {
  const usable = values.filter(hasValue);
  if (!usable.length) return "";
  if (type === "time") return secondsToTime(Math.round(usable.reduce((sum, value) => sum + timeToSeconds(value), 0) / usable.length));
  return usable.reduce((sum, value) => sum + Number(value), 0) / usable.length;
}

function normalizeMetricValue(value, type) {
  if (!hasValue(value)) return "";
  if (type === "time") return normalizeTime(value);
  const number = parseLocaleNumber(value);
  if (!Number.isFinite(number)) return "";
  if (type === "score" && number > 5 && number <= 10) return number / 2;
  return number;
}

function valueMeetsGoal(value, config) {
  if (!hasValue(value)) return false;
  const current = comparableValue(value, config.type);
  const goal = comparableValue(state.goals[config.goalKey] ?? DEFAULT_GOALS[config.goalKey], config.type);
  return config.direction === "down" ? current <= goal : current >= goal;
}

function trendForValues(current, previous, config) {
  if (!hasValue(current) || !hasValue(previous)) return "neutral";
  const delta = comparableValue(current, config.type) - comparableValue(previous, config.type);
  if (Math.abs(delta) < 0.000001) return "neutral";
  return config.direction === "down" ? (delta < 0 ? "good" : "bad") : (delta > 0 ? "good" : "bad");
}

function changeHeadline(item) {
  if (!hasValue(item.previous) || item.percent === null) return "Sem base anterior comparável";
  if (Math.abs(item.percent) < 0.01) return "Sem variação percentual";
  const arrow = item.absolute < 0 ? "↓" : "↑";
  const quality = item.trend === "good" ? "Melhoria" : item.trend === "bad" ? "Oscilação negativa" : "Estável";
  return `${arrow} ${Math.abs(item.percent).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% · ${quality}`;
}

function changeExplanation(item) {
  if (!hasValue(item.current)) return "Sem dados no período selecionado.";
  if (!hasValue(item.previous) || item.absolute === null) return item.goalMet ? "Resultado atual dentro da meta." : "Resultado atual fora da meta.";
  if (item.type === "time") {
    const verb = item.absolute < 0 ? "Redução" : "Aumento";
    return `${verb} de ${humanDuration(Math.abs(item.absolute))} em relação ao período anterior.`;
  }
  const verb = item.absolute < 0 ? "Redução" : "Aumento";
  return `${verb} de ${Math.abs(item.absolute).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ponto(s) em relação ao período anterior.`;
}

function decisionSentence(item, positive) {
  if (!hasValue(item.previous) || item.absolute === null) return positive ? "permaneceu dentro da meta." : "está fora da meta e requer acompanhamento.";
  if (item.type === "time") return `${item.absolute < 0 ? "reduziu" : "aumentou"} ${humanDuration(Math.abs(item.absolute))} em relação ao período anterior.`;
  return `${item.absolute < 0 ? "caiu" : "aumentou"} ${Math.abs(item.absolute).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ponto(s).`;
}

function renderTableStatus(status, customLabel = "") {
  const labels = { good: "Positivo", warn: "Atenção", bad: "Evoluir", neutral: "Sem base" };
  return `<span class="table-status ${status}">${escapeHtml(customLabel || labels[status] || labels.neutral)}</span>`;
}

function periodDisplayLabel(period) {
  if (!period) return "-";
  const label = fixMojibake(period.label || "Semana");
  if (/\(\d{2}\/\d{2}\s+a\s+\d{2}\/\d{2}\)/i.test(label)) return label;
  const start = shortIsoDate(period.startDate);
  const end = shortIsoDate(period.endDate);
  return start || end ? `${label} (${start || end} a ${end || start})` : label;
}

function isMonthlyPeriod(period) {
  return period?.week === "mensal" || normalizeText(period?.label).includes("MENSAL");
}

function isCarryPeriod(period) {
  return period?.week === "ultima" || normalizeText(period?.label).includes("ULTIMA SEMANA");
}

function datedPeriods() {
  return (state.workbook.monthOrder || []).flatMap((monthId) => {
    const month = state.workbook.months[monthId];
    return weeklyPeriods(month).flatMap((period) => {
      const start = dateValue(period.startDate);
      const end = dateValue(period.endDate);
      return start && end ? [{ month, period, start, end }] : [];
    });
  });
}

function periodDateRange(month, period) {
  const start = occurrenceDateValue(period?.startDate);
  const end = occurrenceDateValue(period?.endDate);
  return start && end ? { start, end: end + 86399999 } : monthDateRange(month);
}

function monthDateRange(month) {
  const year = monthYear(month);
  const monthNumber = monthNumberFromData(month);
  if (!year || !monthNumber) return null;
  return {
    start: new Date(year, monthNumber - 1, 1).getTime(),
    end: new Date(year, monthNumber, 0, 23, 59, 59, 999).getTime()
  };
}

function yearDateRange(year) {
  return {
    start: new Date(year, 0, 1).getTime(),
    end: new Date(year, 11, 31, 23, 59, 59, 999).getTime()
  };
}

function monthNumberFromData(month) {
  if (month?.sortKey) return Number(month.sortKey) % 100;
  const names = ["JANEIRO", "FEVEREIRO", "MARCO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
  return names.findIndex((name) => normalizeText(month?.label).includes(name)) + 1;
}

function occurrencesInRange(range) {
  if (!range?.start || !range?.end) return [];
  return state.occurrences.filter((row) => {
    const timestamp = occurrenceDateValue(row.date);
    return timestamp && timestamp >= range.start && timestamp <= range.end;
  });
}

function occurrenceRanking(rows, key) {
  const totals = new Map();
  rows.forEach((row) => {
    const name = clean(row[key]) || "Não informado";
    totals.set(name, (totals.get(name) || 0) + 1);
  });
  return [...totals.entries()].map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "pt-BR"));
}

function occurrenceDateValue(value) {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  const text = clean(value);
  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).getTime();
  match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (match) {
    const year = Number(match[3].length === 2 ? `20${match[3]}` : match[3]);
    return new Date(year, Number(match[2]) - 1, Number(match[1])).getTime();
  }
  const parsed = new Date(text).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function occurrenceOfflineSeconds(value) {
  const text = clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (!text || text === "-") return NaN;
  const matches = [...text.matchAll(/(\d{1,2})(?::|h)(\d{1,2})(?::(\d{1,2}))?/g)].map((match) => {
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    const second = Number(match[3] || 0);
    return hour <= 23 && minute <= 59 && second <= 59 ? hour * 3600 + minute * 60 + second : NaN;
  }).filter(Number.isFinite);
  if (matches.length < 2) return NaN;
  let delta = matches[1] - matches[0];
  if (delta < 0) delta += 86400;
  return delta > 0 ? delta : NaN;
}

function humanOfflineDuration(totalSeconds) {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (days) return `${days}d ${hours}h ${minutes}min`;
  if (hours) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}

function formatSignedPercent(value) {
  if (!Number.isFinite(value)) return "-";
  return `${value > 0 ? "+" : ""}${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

function setCustomDateDefaults() {
  const dated = datedPeriods();
  if (!dated.length) return;
  const latest = dated.at(-1);
  const first = dated[Math.max(0, dated.length - 4)];
  els.customStart.value = isoDate(first.start);
  els.customEnd.value = isoDate(latest.end);
}

function availableYears() {
  return [...new Set((state.workbook.monthOrder || []).map((monthId) => monthYear(state.workbook.months[monthId])).filter(Boolean))].sort();
}

function monthsForYear(year) {
  return (state.workbook.monthOrder || []).map((monthId) => state.workbook.months[monthId]).filter((month) => monthYear(month) === year);
}

function monthYear(month) {
  if (month?.sortKey) return Math.floor(Number(month.sortKey) / 100);
  const match = String(month?.label || "").match(/20\d{2}/);
  return match ? Number(match[0]) : null;
}

function metricWeight(key) {
  const metric = METRICS.find((item) => item.key === key);
  return positiveNumber(state.goals[metric?.weightKey], 1).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

function togglePresentationMode() {
  const active = document.body.classList.toggle("presentation-mode");
  setButtonLabel(els.presentationButton, active ? "Sair da apresentação" : "Apresentar");
  if (active && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
  if (!active && document.fullscreenElement) document.exitFullscreen().catch(() => {});
}

function setButtonLabel(button, label) {
  const textNode = button?.querySelector("span");
  if (textNode) textNode.textContent = label;
}

function printExecutiveReport() {
  const originalTitle = document.title;
  const report = buildReport();
  document.title = filenameSafe(`SGP - Relatório Executivo - ${report.selection.label}`);
  window.addEventListener("afterprint", () => { document.title = originalTitle; }, { once: true });
  window.print();
}

async function importWorkbook(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
    const sheets = workbook.SheetNames.map((name) => ({
      name,
      rows: XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, raw: false, defval: "" })
    }));
    const parsed = parseImportedSheets(sheets);
    normalizeWorkbook(parsed);
    state.workbook = parsed;
    state.monthId = parsed.monthOrder.at(-1) || "";
    state.periodKey = defaultWeeklyPeriod(currentMonth())?.key || "";
    persistLocalWorkbook(parsed, file.name);
    setCustomDateDefaults();
    render();
  } catch (error) {
    console.error(error);
    els.status.textContent = "Não foi possível interpretar o arquivo. Confira se ele segue a matriz de indicadores do SGP.";
  } finally {
    event.target.value = "";
  }
}

function parseImportedSheets(sheets) {
  const months = {};
  sheets.forEach((sheet) => {
    const headerIndex = sheet.rows.findIndex((row) => row.some((cell) => normalizeText(cell).includes("SEMANA") || normalizeText(cell).includes("MENSAL")));
    if (headerIndex < 0) return;
    const header = sheet.rows[headerIndex] || [];
    const periods = header.slice(1).flatMap((cell, index) => {
      const label = clean(cell);
      return label ? [{ key: `p${index + 1}`, label, week: inferWeek(label), sourceColumn: index + 1 }] : [];
    });
    if (!periods.length) return;
    const metrics = METRICS.map((config) => {
      const row = sheet.rows.find((candidate) => isMetricName(candidate[0], config));
      const values = {};
      periods.forEach((period) => { values[period.key] = normalizeMetricValue(row?.[period.sourceColumn], config.type); });
      return { name: config.source, type: config.type, values, matched: Boolean(row) };
    });
    if (metrics.filter((metric) => metric.matched).length < 2) return;
    const meta = monthMeta(sheet.name, header[0]);
    months[meta.id] = { ...meta, periods, metrics, sourceSheet: sheet.name };
  });
  const monthOrder = Object.values(months).sort((a, b) => a.sortKey - b.sortKey).map((month) => month.id);
  if (!monthOrder.length) throw new Error("Nenhum mês compatível encontrado.");
  return { months, monthOrder };
}

function monthMeta(sheetName, title) {
  const text = normalizeText(`${sheetName} ${title || ""}`);
  const monthNames = ["JANEIRO","FEVEREIRO","MARCO","ABRIL","MAIO","JUNHO","JULHO","AGOSTO","SETEMBRO","OUTUBRO","NOVEMBRO","DEZEMBRO"];
  const labels = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const index = Math.max(0, monthNames.findIndex((month) => text.includes(month)));
  const year = Number(text.match(/20\d{2}/)?.[0] || 2026);
  return { id: `${monthNames[index]} ${year}`, label: `${labels[index]} ${year}`, sortKey: year * 100 + index + 1 };
}

function inferWeek(label) {
  const text = normalizeText(label);
  if (text.includes("ULTIMA")) return "ultima";
  if (text.includes("MENSAL")) return "mensal";
  const match = text.match(/([1-5])\s*(?:A|O)?\s*SEMANA/);
  return match ? `s${match[1]}` : "";
}

function persistLocalWorkbook(workbook, name) {
  localStorage.setItem(STORAGE_KEYS.workbook, JSON.stringify(workbook));
  localStorage.setItem(STORAGE_KEYS.workbookName, name);
  localStorage.setItem(STORAGE_KEYS.importedAt, new Date().toLocaleString("pt-BR"));
}

function normalizeWorkbook(workbook) {
  Object.values(workbook?.months || {}).forEach((month) => {
    month.id ||= Object.keys(workbook.months).find((key) => workbook.months[key] === month) || normalizeText(month.label);
    (month.metrics || []).forEach((metric) => {
      const config = METRICS.find((item) => isMetricName(metric.name, item));
      if (!config) return;
      Object.keys(metric.values || {}).forEach((key) => { metric.values[key] = normalizeMetricValue(metric.values[key], config.type); });
    });
  });
}

function renderEmpty(message) {
  els.status.textContent = message;
  els.resultStatus.textContent = "Sem dados";
  els.executiveSummary.textContent = "Cadastre ou sincronize os indicadores no SGP para gerar a leitura executiva.";
  els.cards.innerHTML = METRICS.map((metric) => `<article class="metric-card"><h3>${metric.label}</h3><div class="metric-value">-</div></article>`).join("");
  els.snapshot.innerHTML = "";
  els.weeklyHighlights.innerHTML = "";
  els.goalScore.textContent = "0/3";
  els.recommendations.innerHTML = '<article class="recommendation-item priority-maintain"><header><span>Aguardando dados</span><strong>01</strong></header><h3>Sincronizar indicadores</h3><p>Cadastre ou sincronize os dados para gerar encaminhamentos executivos.</p></article>';
  Object.keys(state.charts).forEach(destroyChart);
  window.lucide?.createIcons();
}

function isValidWorkbook(workbook) {
  return Boolean(workbook?.months && Array.isArray(workbook.monthOrder) && workbook.monthOrder.length);
}

function hasValue(value) {
  return value !== "" && value !== null && value !== undefined && !(typeof value === "number" && Number.isNaN(value));
}

function comparableValue(value, type) {
  if (!hasValue(value)) return NaN;
  return type === "time" ? timeToSeconds(value) : Number(value);
}

function formatMetric(value, type) {
  if (!hasValue(value)) return "-";
  if (type === "time") return normalizeTime(value);
  return Number(value).toLocaleString("pt-BR", { minimumFractionDigits: type === "score" ? 2 : 0, maximumFractionDigits: 2 });
}

function normalizeTime(value) {
  if (typeof value === "number" && value > 0 && value < 1) return secondsToTime(Math.round(value * 86400));
  const parts = String(value || "").trim().split(":").map(Number);
  if (parts.some(Number.isNaN)) return "";
  if (parts.length === 2) parts.unshift(0);
  if (parts.length !== 3) return "";
  return parts.map((part) => String(part).padStart(2, "0")).join(":");
}

function timeToSeconds(value) {
  const parts = normalizeTime(value).split(":").map(Number);
  return parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : NaN;
}

function secondsToTime(total) {
  if (!Number.isFinite(total)) return "";
  const seconds = Math.max(0, Math.round(total));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return [hours, minutes, seconds % 60].map((part) => String(part).padStart(2, "0")).join(":");
}

function humanDuration(seconds) {
  const rounded = Math.round(seconds);
  if (rounded >= 3600) return `${Math.floor(rounded / 3600)}h ${Math.floor((rounded % 3600) / 60)}min`;
  if (rounded >= 60) return `${Math.floor(rounded / 60)}min ${rounded % 60}s`;
  return `${rounded}s`;
}

function parseLocaleNumber(value) {
  if (typeof value === "number") return value;
  const text = String(value ?? "").replace("%", "").trim();
  if (!text) return NaN;
  if (text.includes(",")) return Number(text.replace(/\./g, "").replace(",", "."));
  return Number(text);
}

function positiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function uniqueByKey(items) {
  return [...new Map(items.map((item) => [item.key, item])).values()];
}

function parseStoredJson(key) {
  try { return JSON.parse(localStorage.getItem(key) || sessionStorage.getItem(key) || "null"); }
  catch (_) { return null; }
}

function dateValue(value) {
  if (!value) return 0;
  const time = new Date(`${value}T00:00:00`).getTime();
  return Number.isFinite(time) ? time : 0;
}

function shortIsoDate(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}` : "";
}

function shortDate(timestamp) {
  return new Date(timestamp).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function isoDate(timestamp) {
  const date = new Date(timestamp);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function clean(value) { return fixMojibake(String(value ?? "")).replace(/\s+/g, " ").trim(); }

function normalizeText(value) {
  return clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]+/gi, " ").trim().toUpperCase();
}

function fixMojibake(value) {
  const text = String(value ?? "");
  if (!/[ÃÂ]/.test(text)) return text;
  try { return decodeURIComponent(escape(text)); } catch (_) { return text; }
}

function filenameSafe(value) { return String(value).replace(/[\\/:*?"<>|]/g, " ").replace(/\s+/g, " ").trim(); }

function escapeHtml(value) {
  return fixMojibake(String(value ?? "")).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
