(() => {
  const reportState = {
    initialized: false,
    dateInitialized: false,
    activeView: "dashboard",
    reportMode: "executive",
    page: 1,
    pageSize: 25,
    filteredRows: [],
    dailyChart: null,
    executiveChart: null,
    printing: false
  };

  const reportEls = {};

  document.addEventListener("DOMContentLoaded", initializeOccurrenceReport);

  function initializeOccurrenceReport() {
    Object.assign(reportEls, {
      tabs: [...document.querySelectorAll("[data-occurrence-view]")],
      dashboardView: document.querySelector("#occurrenceDashboardView"),
      reportView: document.querySelector("#occurrenceReportView"),
      dateStart: document.querySelector("#reportDateStart"),
      dateEnd: document.querySelector("#reportDateEnd"),
      generate: document.querySelector("#generateOccurrenceReport"),
      city: document.querySelector("#reportCityFilter"),
      locality: document.querySelector("#reportLocalityFilter"),
      reason: document.querySelector("#reportReasonFilter"),
      type: document.querySelector("#reportTypeFilter"),
      status: document.querySelector("#reportStatusFilter"),
      responsible: document.querySelector("#reportResponsibleFilter"),
      generationStatus: document.querySelector("#reportGenerationStatus"),
      empty: document.querySelector("#reportEmptyState"),
      content: document.querySelector("#occurrenceReportContent"),
      executiveView: document.querySelector("#executiveReportView"),
      executiveDocument: document.querySelector("#executiveReportDocument"),
      summaryCards: document.querySelector("#reportSummaryCards"),
      activePeriod: document.querySelector("#reportActivePeriod"),
      printPeriod: document.querySelector("#reportPrintPeriod"),
      narrative: document.querySelector("#reportNarrative"),
      featureGrid: document.querySelector("#reportFeatureGrid"),
      attentionList: document.querySelector("#reportAttentionList"),
      cityBody: document.querySelector("#reportCityBody"),
      localityBody: document.querySelector("#reportLocalityBody"),
      reasonBody: document.querySelector("#reportReasonBody"),
      dayBody: document.querySelector("#reportDayBody"),
      dailyChart: document.querySelector("#reportDailyChart"),
      detailBody: document.querySelector("#reportDetailBody"),
      resultCount: document.querySelector("#reportResultCount"),
      pageSize: document.querySelector("#reportPageSize"),
      pageInfo: document.querySelector("#reportPageInfo"),
      previousPage: document.querySelector("#reportPreviousPage"),
      nextPage: document.querySelector("#reportNextPage")
    });

    bindReportEvents();
    const today = isoDate(startOfDay(new Date()));
    reportEls.dateStart.max = today;
    reportEls.dateEnd.max = today;
    reportState.initialized = true;
    const requestedView = location.hash === "#relatorios" ? "reports" : "dashboard";
    setActiveView(requestedView, false);
    syncReport();
  }

  function bindReportEvents() {
    reportEls.tabs.forEach((button) => button.addEventListener("click", () => setActiveView(button.dataset.occurrenceView)));
    reportEls.generate.addEventListener("click", generateReportFromButton);
    [reportEls.dateStart, reportEls.dateEnd].forEach((input) => input.addEventListener("change", () => {
      reportState.page = 1;
      clearActiveShortcut();
      setGenerationStatus("Período alterado. Clique em Gerar relatório para aplicar.", "pending");
    }));
    document.querySelectorAll("[data-report-range]").forEach((button) => {
      button.addEventListener("click", () => applyDateShortcut(button.dataset.reportRange, button));
    });
    const filters = [reportEls.city, reportEls.locality, reportEls.reason, reportEls.type, reportEls.status, reportEls.responsible];
    filters.forEach((select) => select.addEventListener("change", () => {
      reportState.page = 1;
      renderReport();
    }));
    reportEls.pageSize.addEventListener("change", () => {
      reportState.pageSize = Number(reportEls.pageSize.value) || 25;
      reportState.page = 1;
      renderDetailTable();
    });
    reportEls.previousPage.addEventListener("click", () => changePage(-1));
    reportEls.nextPage.addEventListener("click", () => changePage(1));
    document.querySelectorAll("[data-report-export]").forEach((button) => {
      button.addEventListener("click", () => handleExport(button.dataset.reportExport));
    });
    reportEls.executiveDocument?.addEventListener("click", handleExecutiveCityToggle);
    window.addEventListener("hashchange", () => setActiveView(location.hash === "#relatorios" ? "reports" : "dashboard", false));
  }

  function handleExecutiveCityToggle(event) {
    const row = event.target.closest("[data-executive-city-row]");
    if (!row) return;
    const button = row.querySelector("[data-executive-city-toggle]");
    const detail = button && document.getElementById(button.getAttribute("aria-controls"));
    if (!button || !detail) return;
    const expanded = button.getAttribute("aria-expanded") === "true";
    button.setAttribute("aria-expanded", String(!expanded));
    detail.hidden = expanded;
    row.classList.toggle("is-expanded", !expanded);
  }

  function setActiveView(view, updateHash = true) {
    reportState.activeView = view === "reports" ? "reports" : "dashboard";
    const showReport = reportState.activeView === "reports";
    if (showReport) {
      occurrenceState?.charts?.cityMap?.remove?.();
      if (occurrenceState?.charts) occurrenceState.charts.cityMap = null;
    }
    reportEls.dashboardView.hidden = showReport;
    reportEls.reportView.hidden = !showReport;
    reportEls.tabs.forEach((button) => {
      const active = button.dataset.occurrenceView === reportState.activeView;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });
    if (updateHash) history.replaceState(null, "", showReport ? "#relatorios" : location.pathname + location.search);
    if (showReport) {
      syncReport();
      window.setTimeout(renderDailyChart, 80);
    } else if (typeof renderCharts === "function") {
      window.setTimeout(renderCharts, 80);
    }
  }

  function syncReport() {
    if (!reportState.initialized) return;
    const rows = allOccurrenceRows();
    if (!reportState.dateInitialized && rows.length) setDefaultReportPeriod(rows);
    populateReportFilterOptions(rows);
    renderReport();
  }

  function allOccurrenceRows() {
    const unique = new Map();
    const today = startOfDay(new Date());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    Object.values(occurrenceState.workbook || {}).forEach((month) => {
      (month?.records || []).forEach((row) => {
        const normalized = {
          ...row,
          locality: text(row.locality),
          type: text(row.type),
          status: text(row.status),
          responsible: text(row.responsible)
        };
        const occurrenceDate = parseDate(normalized.date);
        if (occurrenceDate && occurrenceDate > endOfToday) return;
        const key = typeof occurrenceFingerprint === "function"
          ? occurrenceFingerprint(normalized)
          : [normalized.date, normalized.city, normalized.occurrence, normalized.reason, normalized.downtime].map(normalizedText).join("|");
        if (!unique.has(key)) unique.set(key, normalized);
      });
    });
    return [...unique.values()].sort(compareDateAscending);
  }

  function setDefaultReportPeriod(rows) {
    const today = startOfDay(new Date());
    const dates = rows.map((row) => parseDate(row.date)).filter((date) => date && date <= today).sort((a, b) => a - b);
    if (!dates.length) return;
    const hasCurrentMonth = dates.some((date) => date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth());
    const targetMonth = hasCurrentMonth ? today : dates.at(-1);
    const targetEnd = hasCurrentMonth
      ? today
      : new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0);
    reportEls.dateStart.value = isoDate(new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1));
    reportEls.dateEnd.value = isoDate(targetEnd);
    reportState.dateInitialized = true;
  }

  function populateReportFilterOptions(rows) {
    setSelectOptions(reportEls.city, uniqueValues(rows, "city"), "Todas");
    setSelectOptions(reportEls.locality, uniqueValues(rows, "locality"), "Todas");
    setSelectOptions(reportEls.reason, uniqueValues(rows, "reason", ["-"]), "Todos");
    setSelectOptions(reportEls.type, uniqueValues(rows, "type"), "Todos");
    setSelectOptions(reportEls.status, uniqueValues(rows, "status"), "Todos");
    setSelectOptions(reportEls.responsible, uniqueValues(rows, "responsible"), "Todos");
  }

  function uniqueValues(rows, key, excluded = []) {
    const excludedKeys = new Set(excluded.map(normalizedText));
    const values = new Map();
    rows.forEach((row) => {
      const value = text(row[key]);
      const normalized = normalizedText(value);
      if (!value || excludedKeys.has(normalized)) return;
      if (!values.has(normalized)) values.set(normalized, value);
    });
    return [...values.values()].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }

  function setSelectOptions(select, values, emptyLabel) {
    const current = select.value;
    select.innerHTML = `<option value="">${escape(emptyLabel)}</option>${values.map((value) => `<option value="${escape(value)}">${escape(value)}</option>`).join("")}`;
    if (values.includes(current)) select.value = current;
  }

  function applyDateShortcut(range, button) {
    const today = startOfDay(new Date());
    let start = today;
    let end = today;
    if (range === "yesterday") start = end = addDays(today, -1);
    if (["7", "15", "30"].includes(range)) start = addDays(today, -(Number(range) - 1));
    if (range === "month") start = new Date(today.getFullYear(), today.getMonth(), 1);
    if (range === "previous-month") {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 0);
    }
    reportEls.dateStart.value = isoDate(start);
    reportEls.dateEnd.value = isoDate(end);
    document.querySelectorAll("[data-report-range]").forEach((item) => item.classList.toggle("active", item === button));
    reportState.page = 1;
    renderReport();
  }

  function clearActiveShortcut() {
    document.querySelectorAll("[data-report-range]").forEach((button) => button.classList.remove("active"));
  }

  function generateReportFromButton() {
    reportState.page = 1;
    clearActiveShortcut();
    reportEls.generate.disabled = true;
    reportEls.generate.textContent = "Gerando...";
    setGenerationStatus("Processando os registros do período selecionado...", "pending");

    window.requestAnimationFrame(() => {
      const generated = renderReport();
      reportEls.generate.disabled = false;
      reportEls.generate.textContent = reportState.reportMode === "executive" ? "Gerar relatório executivo" : "Gerar relatório";
      if (generated) {
        setGenerationStatus(`${reportState.filteredRows.length.toLocaleString("pt-BR")} ocorrência(s) encontrada(s). Relatório atualizado.`, "success");
        const target = reportState.reportMode === "executive" ? reportEls.executiveView : reportEls.summaryCards;
        target?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        setGenerationStatus(reportEls.empty.textContent, "error");
        reportEls.empty?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  }

  function setGenerationStatus(message, state = "") {
    if (!reportEls.generationStatus) return;
    reportEls.generationStatus.textContent = message;
    reportEls.generationStatus.dataset.state = state;
  }

  function renderReport() {
    if (!reportState.initialized) return;
    if (!validDateRange()) {
      showReportEmpty("A data inicial deve ser anterior ou igual à data final.");
      return false;
    }
    const rows = filterReportRows(allOccurrenceRows());
    reportState.filteredRows = rows;
    if (!rows.length) {
      showReportEmpty("Nenhuma ocorrência encontrada para o período selecionado.");
      destroyDailyChart();
      return false;
    }
    reportEls.empty.hidden = true;
    const executive = reportState.reportMode === "executive";
    reportEls.content.hidden = executive;
    reportEls.executiveView.hidden = !executive;
    const analysis = buildAnalysis(rows);
    renderSummaryCards(analysis);
    renderNarrative(analysis);
    renderFeatures(analysis);
    renderAttention(analysis);
    renderRankings(analysis);
    renderDailyChart(analysis);
    renderDetailTable();
    renderExecutiveReport(analysis);
    return true;
  }

  function filterReportRows(rows) {
    const start = inputDate(reportEls.dateStart.value, false);
    const end = inputDate(reportEls.dateEnd.value, true);
    return rows.filter((row) => {
      const date = parseDate(row.date);
      if (!date || (start && date < start) || (end && date > end)) return false;
      return matchesComplementaryFilters(row);
    });
  }

  function matchesComplementaryFilters(row) {
    const filters = {
      city: reportEls.city.value,
      locality: reportEls.locality.value,
      reason: reportEls.reason.value,
      type: reportEls.type.value,
      status: reportEls.status.value,
      responsible: reportEls.responsible.value
    };
    return Object.entries(filters).every(([key, value]) => !value || normalizedText(row[key]) === normalizedText(value));
  }

  function validDateRange() {
    const start = inputDate(reportEls.dateStart.value, false);
    const end = inputDate(reportEls.dateEnd.value, true);
    return !start || !end || start <= end;
  }

  function showReportEmpty(message) {
    reportEls.empty.textContent = message;
    reportEls.empty.hidden = false;
    reportEls.content.hidden = true;
    reportEls.executiveView.hidden = true;
    destroyExecutiveChart();
  }

  function buildAnalysis(rows) {
    const cities = ranking(rows, (row) => text(row.city));
    const localities = localityRanking(rows);
    const reasons = ranking(rows, (row) => {
      const reason = text(row.reason);
      return reason === "-" ? "" : reason;
    });
    const days = ranking(rows, (row) => dateKey(row.date)).filter((item) => item.name);
    const durationValues = rows.map((row) => offlineDurationSeconds(row.downtime)).filter(Number.isFinite);
    const totalSeconds = durationValues.reduce((sum, seconds) => sum + seconds, 0);
    const durationReasons = durationRanking(rows, (row) => {
      const reason = text(row.reason);
      return reason === "-" ? "" : reason;
    });
    const periodDays = selectedPeriodDays(rows);
    const averageDaily = periodDays ? rows.length / periodDays : 0;
    return {
      rows,
      total: rows.length,
      cities,
      localities,
      reasons,
      days,
      topCity: topGroup(cities),
      topLocality: topGroup(localities),
      topReason: topGroup(reasons),
      topDay: topGroup(days),
      durationReasons,
      topDurationReason: topGroup(durationReasons),
      citiesAffected: cities.length,
      localitiesAffected: localities.length,
      periodDays,
      averageDaily,
      aboveAverageDays: days.filter((item) => item.total > averageDaily),
      topThreeReasonsShare: rows.length ? reasons.slice(0, 3).reduce((sum, item) => sum + item.total, 0) / rows.length : 0,
      durationCount: durationValues.length,
      totalSeconds,
      averageSeconds: durationValues.length ? Math.round(totalSeconds / durationValues.length) : NaN
    };
  }

  function durationRanking(rows, valueGetter) {
    const grouped = new Map();
    rows.forEach((row) => {
      const name = valueGetter(row);
      const seconds = offlineDurationSeconds(row.downtime);
      if (!name || !Number.isFinite(seconds)) return;
      if (!grouped.has(name)) grouped.set(name, { name, total: 0, occurrences: 0 });
      const item = grouped.get(name);
      item.total += seconds;
      item.occurrences += 1;
    });
    return [...grouped.values()].sort((a, b) => b.total - a.total || b.occurrences - a.occurrences || a.name.localeCompare(b.name, "pt-BR"));
  }

  function selectedPeriodDays(rows) {
    const selectedStart = inputDate(reportEls.dateStart.value, false);
    const selectedEnd = inputDate(reportEls.dateEnd.value, false);
    if (selectedStart && selectedEnd) return Math.max(1, Math.round((selectedEnd - selectedStart) / 86400000) + 1);
    const dates = rows.map((row) => parseDate(row.date)).filter(Boolean).sort((a, b) => a - b);
    return dates.length ? Math.max(1, Math.round((dates.at(-1) - dates[0]) / 86400000) + 1) : 0;
  }

  function ranking(rows, valueGetter) {
    const grouped = new Map();
    rows.forEach((row) => {
      const name = valueGetter(row);
      if (!name) return;
      if (!grouped.has(name)) grouped.set(name, { name, total: 0 });
      grouped.get(name).total += 1;
    });
    return [...grouped.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "pt-BR"));
  }

  function localityRanking(rows) {
    const grouped = new Map();
    rows.forEach((row) => {
      const locality = text(row.locality);
      if (!locality || locality === "-") return;
      const city = text(row.city) || "Não informado";
      const key = `${normalizedText(locality)}|${normalizedText(city)}`;
      if (!grouped.has(key)) grouped.set(key, { name: locality, city, total: 0 });
      grouped.get(key).total += 1;
    });
    return [...grouped.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "pt-BR"));
  }

  function topGroup(items) {
    if (!items.length) return { leaders: [], total: 0 };
    const total = items[0].total;
    return { leaders: items.filter((item) => item.total === total), total };
  }

  function renderSummaryCards(analysis) {
    const cards = [
      { label: "Total de ocorrências", value: analysis.total.toLocaleString("pt-BR"), note: periodLabel(), className: "primary" },
      { label: "Cidade mais afetada", value: leaderNames(analysis.topCity), note: leaderCountNote(analysis.topCity, analysis.total), className: "attention" },
      { label: "Localidade mais afetada", value: leaderNames(analysis.topLocality), note: leaderCountNote(analysis.topLocality, analysis.total), className: "attention" },
      { label: "Dia mais crítico", value: leaderNames(analysis.topDay, true), note: leaderCountNote(analysis.topDay, analysis.total), className: "attention" },
      { label: "Principal motivo", value: leaderNames(analysis.topReason), note: leaderCountNote(analysis.topReason, analysis.total), className: "attention" },
      { label: "Tempo total", value: Number.isFinite(analysis.totalSeconds) && analysis.durationCount ? humanDuration(analysis.totalSeconds) : "Não informado", note: `${analysis.durationCount} duração(ões) válida(s)`, className: "" },
      { label: "Tempo médio", value: Number.isFinite(analysis.averageSeconds) ? clockDuration(analysis.averageSeconds) : "Não informado", note: "Média das durações válidas", className: "" }
    ];
    reportEls.summaryCards.innerHTML = cards.map((card) => `
      <article class="report-summary-card ${card.className}"><span>${escape(card.label)}</span><strong>${escape(card.value)}</strong><small>${escape(card.note)}</small></article>
    `).join("");
  }

  function renderNarrative(analysis) {
    const city = leaderSentence(analysis.topCity, "A cidade mais afetada foi", "As cidades mais afetadas foram");
    const locality = analysis.topLocality.leaders.length
      ? leaderSentence(analysis.topLocality, "A localidade com maior concentração foi", "As localidades com maior concentração foram")
      : "A base atual não possui localidade preenchida neste período.";
    const day = leaderSentence(analysis.topDay, "O dia mais crítico foi", "Os dias mais críticos foram", true);
    const reason = leaderSentence(analysis.topReason, "O principal motivo foi", "Os principais motivos foram");
    reportEls.activePeriod.textContent = periodLabel();
    reportEls.printPeriod.textContent = periodLabel();
    reportEls.narrative.textContent = `Foram registradas ${analysis.total.toLocaleString("pt-BR")} ocorrências no período selecionado. ${city} ${locality} ${day} ${reason}`;
  }

  function renderFeatures(analysis) {
    const features = [
      { label: "Cidade mais afetada", value: leaderNames(analysis.topCity), note: leaderCountNote(analysis.topCity, analysis.total) },
      { label: "Localidade mais afetada", value: leaderNames(analysis.topLocality), note: leaderCountNote(analysis.topLocality, analysis.total) },
      { label: "Dia mais crítico", value: leaderNames(analysis.topDay, true), note: `${analysis.topDay.total} ocorrência(s)` },
      { label: "Principal motivo", value: leaderNames(analysis.topReason), note: leaderCountNote(analysis.topReason, analysis.total) }
    ];
    reportEls.featureGrid.innerHTML = features.map((item) => `<article class="report-feature"><span>${escape(item.label)}</span><strong>${escape(item.value)}</strong><small>${escape(item.note)}</small></article>`).join("");
  }

  function renderAttention(analysis) {
    const items = [
      ["Cidade", leaderNames(analysis.topCity), analysis.topCity.total],
      ["Localidade", leaderNames(analysis.topLocality), analysis.topLocality.total],
      ["Dia", leaderNames(analysis.topDay, true), analysis.topDay.total],
      ["Motivo", leaderNames(analysis.topReason), analysis.topReason.total]
    ];
    reportEls.attentionList.innerHTML = items.map(([label, value, total]) => {
      const detail = total ? `${value} — ${Number(total).toLocaleString("pt-BR")} ocorrência(s)` : "Sem dados preenchidos";
      return `<div class="report-attention-item"><span>${escape(label)}</span><strong>${escape(detail)}</strong></div>`;
    }).join("");
  }

  function renderRankings(analysis) {
    reportEls.cityBody.innerHTML = analysis.cities.length
      ? analysis.cities.slice(0, 10).map((item, index) => `<tr><td>${index + 1}</td><td>${escape(item.name)}</td><td>${item.total.toLocaleString("pt-BR")}</td><td>${percent(item.total, analysis.total)}</td></tr>`).join("")
      : emptyRankingRow(4, "Sem dados de cidade.");
    reportEls.localityBody.innerHTML = analysis.localities.length
      ? analysis.localities.slice(0, 10).map((item, index) => `<tr><td>${index + 1}</td><td>${escape(item.name)}</td><td>${escape(item.city)}</td><td>${item.total.toLocaleString("pt-BR")}</td></tr>`).join("")
      : emptyRankingRow(4, "Sem dados de localidade.");
    reportEls.reasonBody.innerHTML = analysis.reasons.length
      ? analysis.reasons.slice(0, 10).map((item) => `<tr><td>${escape(item.name)}</td><td>${item.total.toLocaleString("pt-BR")}</td><td>${percent(item.total, analysis.total)}</td></tr>`).join("")
      : emptyRankingRow(3, "Sem dados de motivo.");
    reportEls.dayBody.innerHTML = analysis.days.length
      ? analysis.days.slice(0, 10).map((item) => `<tr><td>${escape(formatDateKey(item.name))}</td><td>${item.total.toLocaleString("pt-BR")}</td></tr>`).join("")
      : emptyRankingRow(2, "Sem datas válidas.");
  }

  function emptyRankingRow(columns, message) {
    return `<tr><td class="report-empty-cell" colspan="${columns}">${escape(message)}</td></tr>`;
  }

  function renderDailyChart(analysis = buildAnalysis(reportState.filteredRows)) {
    if (reportState.activeView !== "reports" || reportState.reportMode !== "operational" || !reportEls.dailyChart || !window.Chart) return;
    destroyDailyChart();
    const chronological = [...analysis.days].sort((a, b) => a.name.localeCompare(b.name));
    const color = document.body.dataset.theme === "dark" ? "#dfe8f2" : "#567086";
    const grid = document.body.dataset.theme === "dark" ? "rgba(145,160,178,.18)" : "rgba(207,226,238,.8)";
    reportState.dailyChart = new Chart(reportEls.dailyChart, {
      type: "bar",
      data: {
        labels: chronological.map((item) => formatDateKey(item.name)),
        datasets: [{ label: "Ocorrências", data: chronological.map((item) => item.total), backgroundColor: chronological.map((item) => item.total === analysis.topDay.total ? "rgba(214,69,69,.78)" : "rgba(0,156,103,.68)"), borderRadius: 4 }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: { legend: { display: false } },
        scales: { x: { ticks: { color, maxRotation: 45, minRotation: 0 }, grid: { display: false } }, y: { beginAtZero: true, ticks: { color, precision: 0 }, grid: { color: grid } } }
      }
    });
  }

  function destroyDailyChart() {
    reportState.dailyChart?.destroy?.();
    reportState.dailyChart = null;
  }

  function renderExecutiveReport(analysis) {
    if (!reportEls.executiveDocument || !analysis?.rows?.length) return;
    destroyExecutiveChart();
    const recurrence = buildRecurrenceAnalysis(analysis.rows, analysis);
    const attention = buildExecutiveAttention(analysis, recurrence);
    const generatedAt = new Date();
    const generationLabel = generatedAt.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
    const vision = executiveVision(analysis);
    const conclusion = executiveConclusion(analysis, recurrence);

    reportEls.executiveDocument.innerHTML = `
      <section class="executive-page executive-cover">
        <div class="executive-cover-brand"><img src="logo.png" alt="Uni Internet" /><span>SGP · Gestão do Suporte</span></div>
        <div class="executive-cover-title">
          <p>Documento corporativo de análise operacional</p>
          <h1>Relatório Executivo<br />de Ocorrências</h1>
          <span>Leitura consolidada para Diretoria, Gerência e Liderança</span>
        </div>
        <dl class="executive-metadata">
          <div><dt>Período analisado</dt><dd>${escape(periodLabel())}</dd></div>
          <div><dt>Área</dt><dd>Operações / Suporte / Rede</dd></div>
          <div><dt>Data de geração</dt><dd>${escape(generationLabel)}</dd></div>
          <div><dt>Registros analisados</dt><dd>${analysis.total.toLocaleString("pt-BR")} ocorrências</dd></div>
        </dl>
        <div class="executive-cover-vision">
          <span>Visão Executiva</span>
          <p>${escape(vision)}</p>
        </div>
        ${executiveFooter(1, generationLabel)}
      </section>

      <section class="executive-page">
        ${executivePageHeader("Resumo e principais destaques", 2)}
        <section class="executive-section">
          <p class="executive-section-number">1. Resumo Executivo</p>
          <h2>Dimensão do período analisado</h2>
          <div class="executive-kpi-grid">
            ${executiveMetric("Ocorrências", analysis.total.toLocaleString("pt-BR"))}
            ${executiveMetric("Cidades afetadas", analysis.citiesAffected.toLocaleString("pt-BR"))}
            ${executiveMetric("Cidade mais afetada", leaderNames(analysis.topCity))}
            ${executiveMetric("Localidade mais afetada", leaderNames(analysis.topLocality))}
            ${executiveMetric("Principal motivo", leaderNames(analysis.topReason))}
            ${executiveMetric("Dia mais crítico", leaderNames(analysis.topDay, true))}
            ${executiveMetric("Local que mais demorou para estabilizar", longestStabilizationLabel(analysis.rows), "executive-metric-full")}
          </div>
          ${executiveStatement("Análise", executiveSummaryAnalysis(analysis))}
        </section>
        <section class="executive-section executive-section-compact">
          <p class="executive-section-number">2. Principais Destaques</p>
          <h2>Fatos de maior relevância</h2>
          <div class="executive-highlight-list">
            ${executiveHighlight("Maior concentração geográfica", leaderNames(analysis.topCity), leaderCountNote(analysis.topCity, analysis.total))}
            ${executiveHighlight("Localidade mais afetada", leaderNames(analysis.topLocality), analysis.topLocality.total ? leaderCountNote(analysis.topLocality, analysis.total) : "Campo não preenchido na base analisada")}
            ${executiveHighlight("Dia de maior impacto", leaderNames(analysis.topDay, true), `${analysis.topDay.total.toLocaleString("pt-BR")} ocorrência(s)`)}
            ${executiveHighlight("Principal motivo", leaderNames(analysis.topReason), leaderCountNote(analysis.topReason, analysis.total))}
            ${executiveHighlight("Maior duração acumulada", leaderNames(analysis.topDurationReason), analysis.topDurationReason.total ? humanDuration(analysis.topDurationReason.total) : "Duração não disponível")}
          </div>
        </section>
        ${executiveFooter(2, generationLabel)}
      </section>

      <section class="executive-page">
        ${executivePageHeader("Concentração geográfica", 3)}
        <section class="executive-section">
          <p class="executive-section-number">3. Análise Geográfica</p>
          <h2>Cidades mais afetadas</h2>
          ${executiveCityRankingTable(analysis)}
          ${executiveStatement("Análise", geographicAnalysis(analysis))}
        </section>
        ${executiveFooter(3, generationLabel)}
      </section>

      <section class="executive-page">
        ${executivePageHeader("Composição dos registros", 4)}
        <section class="executive-section">
          <p class="executive-section-number">4. Principais Motivos das Ocorrências</p>
          <h2>Distribuição por categoria registrada</h2>
          ${executiveReasonRankingTable(analysis, false)}
          ${executiveStatement("Análise", reasonAnalysis(analysis))}
        </section>
        ${executiveFooter(4, generationLabel)}
      </section>

      <section class="executive-page">
        ${executivePageHeader("Recorrência, impacto e prioridades", 5)}
        <section class="executive-section">
          <p class="executive-section-number">5. Recorrência e Concentração de Eventos</p>
          <h2>Padrões observáveis na base</h2>
          <div class="executive-evidence-list">${recurrence.items.map((item) => executiveEvidence(item.label, item.value, item.note)).join("")}</div>
          ${executiveStatement("Limite da análise", recurrence.limitNote)}
        </section>
        <section class="executive-section executive-section-compact">
          <p class="executive-section-number">6. Impacto Operacional</p>
          <h2>Dimensão mensurável dos registros</h2>
          ${executiveStatement("Análise", impactAnalysis(analysis))}
        </section>
        <section class="executive-section executive-section-compact">
          <p class="executive-section-number">7. Pontos de Atenção</p>
          <h2>Fato, número e interpretação</h2>
          <div class="executive-attention-list">${attention.map((item, index) => executiveAttention(item, index + 1)).join("")}</div>
        </section>
        ${executiveFooter(5, generationLabel)}
      </section>

      <section class="executive-page">
        ${executivePageHeader("Conclusão executiva", 6)}
        <section class="executive-section executive-section-compact">
          <p class="executive-section-number">8. Conclusão Executiva</p>
          <h2>Síntese do período</h2>
          <div class="executive-conclusion">${conclusion.map((paragraph) => `<p>${escape(paragraph)}</p>`).join("")}</div>
        </section>
        ${executiveFooter(6, generationLabel)}
      </section>
    `;
  }

  function executivePageHeader(title, page) {
    return `<header class="executive-page-header"><img src="logo.png" alt="Uni Internet" /><div><span>Relatório Executivo de Ocorrências</span><strong>${escape(title)}</strong></div><small>${escape(String(page))}</small></header>`;
  }

  function executiveFooter(page, generationLabel) {
    return `<footer class="executive-page-footer"><span>SGP · Documento de análise operacional</span><span>Gerado em ${escape(generationLabel)}</span><strong>Página ${escape(String(page))}</strong></footer>`;
  }

  function executiveMetric(label, value, className = "") {
    return `<div class="executive-metric${className ? ` ${escape(className)}` : ""}"><span>${escape(label)}</span><strong>${escape(value)}</strong></div>`;
  }

  function executiveHighlight(label, value, note) {
    return `<div class="executive-highlight"><span>${escape(label)}</span><strong>${escape(value)}</strong><small>${escape(note)}</small></div>`;
  }

  function executiveStatement(label, textValue) {
    return `<div class="executive-statement"><span>${escape(label)}</span><p>${escape(textValue)}</p></div>`;
  }

  function executiveRankingTable(headers, rows, emptyMessage) {
    const body = rows.length
      ? rows.map((row) => `<tr>${row.map((cell) => `<td>${escape(cell)}</td>`).join("")}</tr>`).join("")
      : `<tr><td colspan="${headers.length}" class="report-empty-cell">${escape(emptyMessage)}</td></tr>`;
    return `<div class="executive-table-wrap"><table class="executive-table"><thead><tr>${headers.map((header) => `<th>${escape(header)}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table></div>`;
  }

  function executiveCityRankingTable(analysis) {
    const cities = analysis.cities.slice(0, 10);
    if (!cities.length) return executiveRankingTable(["Ranking", "Município", "Ocorrências", "Participação"], [], "Sem dados de município.");

    const body = cities.map((item, index) => {
      const detailId = `executive-city-detail-${index}`;
      const cityRows = analysis.rows.filter((row) => normalizedText(row.city) === normalizedText(item.name));
      const occurrences = cityRows.map((row) => `
        <tr>
          <td>${escape(formatDate(row.date))}</td>
          <td>${escape(displayValue(row.locality))}</td>
          <td>${escape(displayValue(row.occurrence))}</td>
          <td>${escape(displayValue(row.reason))}</td>
          <td>${escape(timeRange(row.downtime))}</td>
          <td>${escape(durationForRow(row))}</td>
        </tr>
      `).join("");

      return `
        <tr class="executive-city-row${index % 2 ? " is-alternate" : ""}" data-executive-city-row>
          <td>${index + 1}</td>
          <td>
            <button class="executive-city-toggle" type="button" data-executive-city-toggle aria-expanded="false" aria-controls="${detailId}">
              <span class="executive-city-chevron" aria-hidden="true"></span>
              ${escape(item.name)}
            </button>
          </td>
          <td>${item.total.toLocaleString("pt-BR")}</td>
          <td>${percent(item.total, analysis.total)}</td>
        </tr>
        <tr id="${detailId}" class="executive-city-detail-row" hidden>
          <td colspan="4">
            <div class="executive-city-detail">
              <div class="executive-city-detail-title"><strong>Ocorrências em ${escape(item.name)}</strong><span>${cityRows.length.toLocaleString("pt-BR")} registro(s)</span></div>
              <div class="executive-city-detail-scroll">
                <table class="executive-city-detail-table">
                  <thead><tr><th>Data</th><th>Localidade</th><th>Ocorrência</th><th>Motivo</th><th>Tempo off</th><th>Duração</th></tr></thead>
                  <tbody>${occurrences}</tbody>
                </table>
              </div>
            </div>
          </td>
        </tr>
      `;
    }).join("");

    return `<div class="executive-table-wrap executive-city-ranking"><table class="executive-table"><thead><tr><th>Ranking</th><th>Município</th><th>Ocorrências</th><th>Participação</th></tr></thead><tbody>${body}</tbody></table></div>`;
  }

  function executiveReasonRankingTable(analysis, durationOnly) {
    const reasons = (durationOnly ? analysis.durationReasons : analysis.reasons).slice(0, durationOnly ? 8 : 12);
    const headers = durationOnly
      ? ["Motivo", "Ocorrências com duração", "Tempo acumulado"]
      : ["Motivo", "Ocorrências", "Participação"];
    const emptyMessage = durationOnly ? "Não há durações válidas associadas aos motivos." : "Sem motivos informados.";
    if (!reasons.length) return executiveRankingTable(headers, [], emptyMessage);

    const body = reasons.map((item, index) => {
      const detailId = `executive-reason-${durationOnly ? "duration" : "volume"}-detail-${index}`;
      const reasonRows = analysis.rows.filter((row) => {
        const sameReason = normalizedText(row.reason) === normalizedText(item.name);
        return sameReason && (!durationOnly || Number.isFinite(offlineDurationSeconds(row.downtime)));
      });
      const occurrences = reasonRows.map((row) => `
        <tr>
          <td>${escape(formatDate(row.date))}</td>
          <td>${escape(displayValue(row.city))}</td>
          <td>${escape(displayValue(row.locality))}</td>
          <td>${escape(displayValue(row.occurrence))}</td>
          <td>${escape(timeRange(row.downtime))}</td>
          <td>${escape(durationForRow(row))}</td>
        </tr>
      `).join("");
      const count = durationOnly ? item.occurrences : item.total;
      const lastValue = durationOnly ? humanDuration(item.total) : percent(item.total, analysis.total);

      return `
        <tr class="executive-city-row${index % 2 ? " is-alternate" : ""}" data-executive-city-row>
          <td>
            <button class="executive-city-toggle" type="button" data-executive-city-toggle aria-expanded="false" aria-controls="${detailId}">
              <span class="executive-city-chevron" aria-hidden="true"></span>
              ${escape(item.name)}
            </button>
          </td>
          <td>${count.toLocaleString("pt-BR")}</td>
          <td>${escape(lastValue)}</td>
        </tr>
        <tr id="${detailId}" class="executive-city-detail-row" hidden>
          <td colspan="3">
            <div class="executive-city-detail">
              <div class="executive-city-detail-title"><strong>Ocorrências por ${escape(item.name)}</strong><span>${reasonRows.length.toLocaleString("pt-BR")} registro(s)</span></div>
              <div class="executive-city-detail-scroll">
                <table class="executive-city-detail-table">
                  <thead><tr><th>Data</th><th>Município</th><th>Localidade</th><th>Ocorrência</th><th>Tempo off</th><th>Duração</th></tr></thead>
                  <tbody>${occurrences}</tbody>
                </table>
              </div>
            </div>
          </td>
        </tr>
      `;
    }).join("");

    return `<div class="executive-table-wrap executive-reason-ranking"><table class="executive-table"><thead><tr>${headers.map((header) => `<th>${escape(header)}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table></div>`;
  }

  function executiveEvidence(label, value, note) {
    return `<div class="executive-evidence"><span>${escape(label)}</span><strong>${escape(value)}</strong><p>${escape(note)}</p></div>`;
  }

  function executiveAttention(item, number) {
    return `<article class="executive-attention"><span>Atenção ${number}</span><h3>${escape(item.title)}</h3><p><strong>Fato:</strong> ${escape(item.fact)}</p><p><strong>Número:</strong> ${escape(item.number)}</p><p><strong>Interpretação:</strong> ${escape(item.interpretation)}</p></article>`;
  }

  function renderExecutiveChart(analysis) {
    const canvas = document.querySelector("#executiveDailyChart");
    if (!canvas || !window.Chart || reportState.reportMode !== "executive") return;
    destroyExecutiveChart();
    const chronological = [...analysis.days].sort((a, b) => a.name.localeCompare(b.name));
    reportState.executiveChart = new Chart(canvas, {
      type: "line",
      data: {
        labels: chronological.map((item) => formatDateKey(item.name)),
        datasets: [{
          label: "Ocorrências",
          data: chronological.map((item) => item.total),
          borderColor: "#087b62",
          backgroundColor: "rgba(8,123,98,.10)",
          pointBackgroundColor: chronological.map((item) => item.total === analysis.topDay.total ? "#c83e3e" : "#087b62"),
          pointRadius: 3,
          borderWidth: 2,
          tension: .25,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: "#50697e", maxRotation: 0, autoSkip: true } },
          y: { beginAtZero: true, ticks: { precision: 0, color: "#50697e" }, grid: { color: "rgba(190,211,222,.65)" } }
        }
      }
    });
  }

  function destroyExecutiveChart() {
    reportState.executiveChart?.destroy?.();
    reportState.executiveChart = null;
  }

  function buildPeriodComparison(currentAnalysis) {
    const currentStart = inputDate(reportEls.dateStart.value, false);
    const currentEnd = inputDate(reportEls.dateEnd.value, false);
    if (!currentStart || !currentEnd) return { available: false, reason: "Comparação não disponível porque o período atual não está completamente definido." };
    const days = Math.max(1, Math.round((currentEnd - currentStart) / 86400000) + 1);
    const previousEnd = addDays(currentStart, -1);
    const previousStart = addDays(previousEnd, -(days - 1));
    const previousRows = allOccurrenceRows().filter((row) => {
      const date = parseDate(row.date);
      return date && date >= previousStart && date <= new Date(previousEnd.getFullYear(), previousEnd.getMonth(), previousEnd.getDate(), 23, 59, 59) && matchesComplementaryFilters(row);
    });
    if (!previousRows.length) {
      return {
        available: false,
        reason: `Comparação não disponível: não há registros entre ${formatDateObject(previousStart)} e ${formatDateObject(previousEnd)} com os filtros selecionados.`
      };
    }
    const previous = buildAnalysis(previousRows);
    return {
      available: true,
      previous,
      rows: previousRows,
      periodLabel: `${formatDateObject(previousStart)} a ${formatDateObject(previousEnd)}`,
      totalDelta: metricDelta(currentAnalysis.total, previous.total),
      totalTimeDelta: metricDelta(currentAnalysis.totalSeconds, previous.totalSeconds),
      averageTimeDelta: metricDelta(currentAnalysis.averageSeconds, previous.averageSeconds)
    };
  }

  function metricDelta(current, previous) {
    if (!Number.isFinite(current) || !Number.isFinite(previous)) return { value: NaN, percentage: NaN };
    const value = current - previous;
    return { value, percentage: previous ? (value / previous) * 100 : NaN };
  }

  function comparisonMarkup(comparison, current) {
    if (!comparison.available) return executiveStatement("Fato", comparison.reason || "Comparação não disponível para o período selecionado.");
    const previous = comparison.previous;
    const rows = [
      ["Total de ocorrências", previous.total.toLocaleString("pt-BR"), current.total.toLocaleString("pt-BR"), trendLabel(comparison.totalDelta)],
      ["Cidade mais afetada", leaderNames(previous.topCity), leaderNames(current.topCity), leaderNames(previous.topCity) === leaderNames(current.topCity) ? "Manteve" : "Alterou"],
      ["Principal motivo", leaderNames(previous.topReason), leaderNames(current.topReason), leaderNames(previous.topReason) === leaderNames(current.topReason) ? "Manteve" : "Alterou"],
      ["Cidades afetadas", previous.citiesAffected.toLocaleString("pt-BR"), current.citiesAffected.toLocaleString("pt-BR"), trendLabel(metricDelta(current.citiesAffected, previous.citiesAffected))],
      ["Tempo total", previous.durationCount ? humanDuration(previous.totalSeconds) : "Não disponível", current.durationCount ? humanDuration(current.totalSeconds) : "Não disponível", previous.durationCount && current.durationCount ? trendLabel(comparison.totalTimeDelta) : "Sem base comparável"],
      ["Tempo médio", Number.isFinite(previous.averageSeconds) ? clockDuration(previous.averageSeconds) : "Não disponível", Number.isFinite(current.averageSeconds) ? clockDuration(current.averageSeconds) : "Não disponível", Number.isFinite(previous.averageSeconds) && Number.isFinite(current.averageSeconds) ? trendLabel(comparison.averageTimeDelta) : "Sem base comparável"]
    ];
    const movement = comparison.totalDelta.value > 0 ? "aumento" : comparison.totalDelta.value < 0 ? "redução" : "estabilidade";
    const percentageText = Number.isFinite(comparison.totalDelta.percentage) ? ` de ${decimal(Math.abs(comparison.totalDelta.percentage), 1)}%` : "";
    return `${executiveRankingTable(["Indicador", "Período anterior", "Período atual", "Movimento"], rows, "Comparação não disponível.")}${executiveStatement("Análise", `Em relação ao período imediatamente anterior de mesma duração, o volume apresentou ${movement}${percentageText}. A comparação considera os mesmos filtros e não altera as bases originais.`)}`;
  }

  function trendLabel(delta) {
    if (!Number.isFinite(delta?.value)) return "Sem base comparável";
    if (delta.value === 0) return "Estável";
    const direction = delta.value > 0 ? "Aumento" : "Redução";
    return Number.isFinite(delta.percentage) ? `${direction} de ${decimal(Math.abs(delta.percentage), 1)}%` : direction;
  }

  function buildRecurrenceAnalysis(rows, analysis) {
    const repeatedDescriptions = normalizedValueRanking(rows, (row) => text(row.occurrence)).filter((item) => item.total > 1 && item.name.length >= 8);
    const cityReasons = normalizedValueRanking(rows, (row) => {
      const city = text(row.city);
      const reason = text(row.reason);
      return city && reason && reason !== "-" ? `${city} · ${reason}` : "";
    }).filter((item) => item.total > 1);
    const technicalReferences = technicalReferenceRanking(rows).filter((item) => item.total > 1);
    const items = [];
    if (analysis.localities[0]?.total > 1) {
      const top = analysis.localities[0];
      items.push({ label: "Concentração por localidade", value: `${top.name} · ${top.total} registros`, note: `Localidade informada em ${top.city}, correspondendo a ${percent(top.total, analysis.total)} do período.` });
    }
    if (cityReasons[0]) {
      const top = cityReasons[0];
      items.push({ label: "Município e motivo", value: `${top.name} · ${top.total} registros`, note: "Combinação repetida nos dados analisados; o resultado demonstra concentração de registros, não confirma uma causa técnica comum." });
    }
    if (technicalReferences[0]) {
      const top = technicalReferences[0];
      items.push({ label: "Referência técnica explícita", value: `${top.name} · ${top.total} menções`, note: "Referência identificada diretamente nas descrições originais e repetida no período." });
    }
    if (repeatedDescriptions[0]) {
      const top = repeatedDescriptions[0];
      items.push({ label: "Descrição recorrente", value: `${shortText(top.name, 90)} · ${top.total} registros`, note: "Texto técnico idêntico ou equivalente encontrado mais de uma vez na base filtrada." });
    }
    if (!items.length && analysis.topCity.total > 1) {
      items.push({ label: "Concentração municipal", value: `${leaderNames(analysis.topCity)} · ${analysis.topCity.total} registros`, note: "Concentração observada no município com maior volume; não há elementos suficientes para caracterizar uma falha recorrente." });
    }
    const missingStructured = [];
    if (!analysis.localities.length) missingStructured.push("localidade");
    if (!technicalReferences.length) missingStructured.push("identificadores estruturados de OLT, CTO ou PON");
    missingStructured.push("cliente afetado");
    return {
      items,
      repeatedDescriptions,
      cityReasons,
      technicalReferences,
      limitNote: `A análise utiliza somente repetições comprováveis na base. Não foram inferidas falhas técnicas ou impacto por cliente. Campos sem evidência estruturada: ${joinNames(missingStructured)}.`
    };
  }

  function normalizedValueRanking(rows, getter) {
    const grouped = new Map();
    rows.forEach((row) => {
      const name = getter(row);
      const key = normalizedText(name);
      if (!name || !key) return;
      if (!grouped.has(key)) grouped.set(key, { name, total: 0 });
      grouped.get(key).total += 1;
    });
    return [...grouped.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "pt-BR"));
  }

  function technicalReferenceRanking(rows) {
    const references = [];
    const ignored = new Set(["OFF", "OFFLINE", "ONLINE", "HTTP", "HTTPS", "WWW", "LINK", "ID", "OLT", "CTO", "PON", "SEM", "COM", "DO", "DA", "DE", "NA", "NO"]);
    rows.forEach((row) => {
      const description = text(row.occurrence);
      const pattern = /\b(OLT|CTO|PON)\s*(?:ID\s*)?(?:N[°º]?\s*)?[:#-]?\s*([A-Z0-9][A-Z0-9./_-]{1,24})/gi;
      for (const match of description.matchAll(pattern)) {
        const code = match[2].toUpperCase();
        if (!ignored.has(code)) references.push({ reference: `${match[1].toUpperCase()} ${code}` });
      }
    });
    return normalizedValueRanking(references, (item) => item.reference);
  }

  function buildExecutiveAttention(analysis, recurrence) {
    const items = [];
    if (analysis.topCity.leaders.length) {
      items.push({
        title: "Concentração geográfica",
        fact: `${leaderNames(analysis.topCity)} apresentou o maior volume municipal.`,
        number: `${analysis.topCity.total.toLocaleString("pt-BR")} ocorrências, equivalentes a ${percent(analysis.topCity.total, analysis.total)} do total.`,
        interpretation: "A concentração justifica acompanhamento específico das localidades e motivos registrados nesse município."
      });
    }
    if (analysis.topLocality.leaders.length) {
      items.push({
        title: "Concentração por localidade",
        fact: `${leaderNames(analysis.topLocality)} foi a localidade mais registrada.`,
        number: `${analysis.topLocality.total.toLocaleString("pt-BR")} ocorrências, equivalentes a ${percent(analysis.topLocality.total, analysis.total)} do total.`,
        interpretation: "O volume observado permite priorizar o acompanhamento dessa localidade, sem presumir causa técnica."
      });
    }
    if (analysis.topReason.leaders.length) {
      items.push({
        title: "Concentração por motivo",
        fact: `${leaderNames(analysis.topReason)} foi a categoria mais frequente.`,
        number: `${analysis.topReason.total.toLocaleString("pt-BR")} ocorrências, equivalentes a ${percent(analysis.topReason.total, analysis.total)} do total.`,
        interpretation: "A participação da categoria deve ser monitorada nos períodos seguintes para verificar continuidade ou mudança do padrão."
      });
    }
    if (analysis.topDay.leaders.length) {
      const ratio = analysis.averageDaily ? analysis.topDay.total / analysis.averageDaily : 0;
      items.push({
        title: ratio >= 1.5 ? "Pico operacional" : "Maior volume diário",
        fact: `${leaderNames(analysis.topDay, true)} concentrou o maior número diário de registros.`,
        number: `${analysis.topDay.total.toLocaleString("pt-BR")} ocorrências frente à média diária de ${decimal(analysis.averageDaily, 1)}.`,
        interpretation: ratio >= 1.5 ? "O volume ficou significativamente acima da média do período e merece revisão contextual dos eventos dessa data." : "O volume representa o ponto máximo do período, sem afastamento expressivo da média diária."
      });
    }
    if (recurrence.items[0]) {
      items.push({
        title: "Padrão repetido nos dados",
        fact: recurrence.items[0].value,
        number: recurrence.items[0].note,
        interpretation: "A repetição deve ser tratada como evidência de concentração de registros, não como confirmação automática de falha recorrente."
      });
    }
    return items.slice(0, 5);
  }

  function executiveVision(analysis) {
    const localityText = analysis.localitiesAffected ? ` e ${analysis.localitiesAffected} localidades informadas` : "";
    const durationText = analysis.durationCount ? ` O tempo acumulado das ocorrências com duração válida foi de ${humanDuration(analysis.totalSeconds)}.` : " A base não possui duração válida para todos os registros.";
    return `Durante ${periodLabel()}, foram registradas ${analysis.total.toLocaleString("pt-BR")} ocorrências distribuídas em ${analysis.citiesAffected.toLocaleString("pt-BR")} cidades${localityText}. ${leaderNames(analysis.topCity)} concentrou ${percent(analysis.topCity.total, analysis.total)} dos registros, enquanto ${leaderNames(analysis.topReason)} foi o motivo mais frequente. O maior volume diário ocorreu em ${leaderNames(analysis.topDay, true)}, com ${analysis.topDay.total.toLocaleString("pt-BR")} ocorrências.${durationText}`;
  }

  function executiveSummaryAnalysis(analysis) {
    const topThree = analysis.reasons.length ? ` Os três principais motivos representam ${decimal(analysis.topThreeReasonsShare * 100, 1)}% do total.` : "";
    const locality = analysis.localitiesAffected ? ` Foram identificadas ${analysis.localitiesAffected} localidades distintas com preenchimento válido.` : " O campo de localidade não está preenchido na base deste período.";
    return `O período apresentou maior concentração em ${leaderNames(analysis.topCity)}, com ${analysis.topCity.total.toLocaleString("pt-BR")} registros. O pico diário ocorreu em ${leaderNames(analysis.topDay, true)}, quando foram contabilizadas ${analysis.topDay.total.toLocaleString("pt-BR")} ocorrências.${topThree}${locality}`;
  }

  function geographicAnalysis(analysis) {
    if (!analysis.cities.length) return "Não há dados de município suficientes para análise geográfica.";
    const top = analysis.cities[0];
    const second = analysis.cities[1];
    const comparison = second ? ` A diferença para ${second.name}, segundo município do ranking, foi de ${(top.total - second.total).toLocaleString("pt-BR")} ocorrências.` : " Não há outro município com registros para comparação.";
    return `${top.name} concentrou ${percent(top.total, analysis.total)} das ocorrências registradas no período.${comparison} O resultado demonstra concentração geográfica dos registros e permite direcionar o acompanhamento para os municípios com maior participação.`;
  }

  function localityAnalysis(analysis) {
    if (!analysis.localities.length) return "A base analisada não possui o campo de localidade preenchido. Por esse motivo, não é possível estabelecer ranking ou concentração por localidade sem criar inferências.";
    const top = analysis.localities[0];
    return `${top.name}, em ${top.city}, apresentou ${top.total.toLocaleString("pt-BR")} ocorrências e concentrou ${percent(top.total, analysis.total)} do total. As localidades com maior volume devem ser acompanhadas como pontos de concentração dos registros, sem pressupor uma causa técnica comum.`;
  }

  function temporalAnalysis(analysis) {
    const ratio = analysis.averageDaily ? analysis.topDay.total / analysis.averageDaily : 0;
    const relation = ratio ? `${decimal(ratio, 1)} vez(es) a média diária` : "sem relação calculável com a média";
    const peak = ratio >= 1.5 ? " Esse comportamento caracteriza um pico operacional dentro da série analisada." : " O maior volume permaneceu próximo da distribuição média do período.";
    return `A média diária foi de ${decimal(analysis.averageDaily, 1)} ocorrências ao longo de ${analysis.periodDays} dia(s). O maior volume ocorreu em ${leaderNames(analysis.topDay, true)}, com ${analysis.topDay.total.toLocaleString("pt-BR")} registros, equivalente a ${relation}.${peak} ${analysis.aboveAverageDays.length} dia(s) ficaram acima da média.`;
  }

  function reasonAnalysis(analysis) {
    if (!analysis.reasons.length) return "Não há motivos válidos preenchidos para análise.";
    const topNames = analysis.reasons.slice(0, 3).map((item) => item.name);
    return `${analysis.reasons[0].name} foi o principal motivo, com ${analysis.reasons[0].total.toLocaleString("pt-BR")} ocorrências e participação de ${percent(analysis.reasons[0].total, analysis.total)}. Em conjunto, ${joinNames(topNames)} representam ${decimal(analysis.topThreeReasonsShare * 100, 1)}% do total, indicando o grau de concentração dos registros nas categorias de maior volume.`;
  }

  function impactAnalysis(analysis) {
    const duration = analysis.durationCount ? `As ${analysis.durationCount.toLocaleString("pt-BR")} ocorrências com duração válida somaram ${humanDuration(analysis.totalSeconds)}, com média de ${clockDuration(analysis.averageSeconds)}.` : "Não há durações válidas suficientes para calcular tempo total e médio.";
    const locality = analysis.localitiesAffected ? `${analysis.localitiesAffected.toLocaleString("pt-BR")} localidades` : "localidades não informadas";
    return `A dimensão mensurável do período corresponde a ${analysis.total.toLocaleString("pt-BR")} ocorrências, distribuídas em ${analysis.citiesAffected.toLocaleString("pt-BR")} cidades e ${locality}. ${duration} A distribuição indica maior concentração em ${leaderNames(analysis.topCity)} e no motivo ${leaderNames(analysis.topReason)}, permitindo orientar o acompanhamento para os pontos de maior volume observado.`;
  }

  function executiveConclusion(analysis, recurrence) {
    const first = `A análise de ${periodLabel()} demonstra que ${leaderNames(analysis.topCity)} concentrou a maior parcela das ${analysis.total.toLocaleString("pt-BR")} ocorrências registradas. As categorias ${joinNames(analysis.reasons.slice(0, 3).map((item) => item.name))} reuniram ${decimal(analysis.topThreeReasonsShare * 100, 1)}% dos eventos, evidenciando concentração dos registros em um conjunto reduzido de motivos.`;
    const locality = analysis.topLocality.leaders.length ? `A localidade ${leaderNames(analysis.topLocality)} apresentou o maior volume individual, com ${analysis.topLocality.total.toLocaleString("pt-BR")} registros.` : "A ausência de localidade estruturada limita a análise de concentração em nível inferior ao município.";
    const second = `O comportamento temporal apresentou média de ${decimal(analysis.averageDaily, 1)} ocorrências por dia e maior volume em ${leaderNames(analysis.topDay, true)}, com ${analysis.topDay.total.toLocaleString("pt-BR")} registros. ${locality}`;
    const recurrenceText = recurrence.items.length
      ? `${recurrence.items.length === 1 ? "Foi observado 1 padrão" : `Foram observados ${recurrence.items.length} padrões`} de concentração ou repetição diretamente sustentado${recurrence.items.length === 1 ? "" : "s"} pelos dados.`
      : "Não foram identificados padrões adicionais comprováveis na base filtrada.";
    const third = `${recurrenceText} O conjunto analisado oferece uma visão objetiva das cidades, datas e categorias de maior participação, permitindo que a liderança acompanhe a continuidade ou mudança desses padrões nos próximos períodos.`;
    return [first, second, third];
  }

  function shortText(value, limit) {
    const source = text(value);
    return source.length > limit ? `${source.slice(0, Math.max(0, limit - 1))}…` : source;
  }

  function decimal(value, digits = 1) {
    return Number(value || 0).toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }

  function formatDateObject(date) {
    return date.toLocaleDateString("pt-BR");
  }

  function renderDetailTable() {
    const rows = reportState.filteredRows;
    const totalPages = Math.max(1, Math.ceil(rows.length / reportState.pageSize));
    reportState.page = Math.min(Math.max(1, reportState.page), totalPages);
    const visibleRows = reportState.printing
      ? rows
      : rows.slice((reportState.page - 1) * reportState.pageSize, reportState.page * reportState.pageSize);
    reportEls.detailBody.innerHTML = visibleRows.map((row) => `
      <tr>
        <td>${escape(formatDate(row.date))}</td>
        <td>${escape(displayValue(row.city))}</td>
        <td>${escape(displayValue(row.locality))}</td>
        <td>${escape(displayValue(row.occurrence))}</td>
        <td>${escape(displayValue(row.reason))}</td>
        <td>${escape(timeRange(row.downtime))}</td>
        <td>${escape(durationForRow(row))}</td>
      </tr>
    `).join("");
    reportEls.resultCount.textContent = `${rows.length.toLocaleString("pt-BR")} registro(s)`;
    reportEls.pageInfo.textContent = `Página ${reportState.page} de ${totalPages}`;
    reportEls.previousPage.disabled = reportState.page <= 1;
    reportEls.nextPage.disabled = reportState.page >= totalPages;
  }

  function changePage(delta) {
    reportState.page += delta;
    renderDetailTable();
    reportEls.detailBody.closest(".report-detail-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleExport(type) {
    if (!reportState.filteredRows.length) return;
    if (type === "csv") exportCsv();
    if (type === "excel") exportExcel();
    if (type === "pdf" || type === "print") printReport();
  }

  function exportCsv() {
    const rows = exportRows();
    const csv = rows.map((row) => row.map(csvValue).join(";")).join("\n");
    downloadBlob(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }), reportFilename("csv"));
  }

  function exportExcel() {
    if (!window.XLSX) return;
    const analysis = buildAnalysis(reportState.filteredRows);
    const workbook = XLSX.utils.book_new();
    const summary = [
      ["RELATÓRIO DE OCORRÊNCIAS"],
      ["Período", periodLabel()],
      ["Total de ocorrências", analysis.total],
      ["Cidade mais afetada", leaderNames(analysis.topCity), analysis.topCity.total],
      ["Localidade mais afetada", leaderNames(analysis.topLocality), analysis.topLocality.total],
      ["Dia mais crítico", leaderNames(analysis.topDay, true), analysis.topDay.total],
      ["Principal motivo", leaderNames(analysis.topReason), analysis.topReason.total],
      ["Tempo total", analysis.durationCount ? humanDuration(analysis.totalSeconds) : "Não informado"],
      ["Tempo médio", Number.isFinite(analysis.averageSeconds) ? clockDuration(analysis.averageSeconds) : "Não informado"]
    ];
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(summary), "Resumo");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["Posição", "Cidade", "Ocorrências", "%"], ...analysis.cities.map((item, index) => [index + 1, item.name, item.total, percent(item.total, analysis.total)])]), "Cidades");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["Posição", "Localidade", "Cidade", "Ocorrências"], ...analysis.localities.map((item, index) => [index + 1, item.name, item.city, item.total])]), "Localidades");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["Motivo", "Ocorrências", "%"], ...analysis.reasons.map((item) => [item.name, item.total, percent(item.total, analysis.total)])]), "Motivos");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(exportRows()), "Ocorrências");
    XLSX.writeFile(workbook, reportFilename("xlsx"));
  }

  function printReport() {
    const originalTitle = document.title;
    const executive = reportState.reportMode === "executive";
    const printClass = executive ? "printing-executive-report" : "printing-occurrence-report";
    reportState.printing = true;
    if (executive) renderExecutiveReport(buildAnalysis(reportState.filteredRows));
    else renderDetailTable();
    document.body.classList.add(printClass);
    document.title = reportFilename("").replace(/\.$/, "");
    window.addEventListener("afterprint", () => {
      document.body.classList.remove("printing-occurrence-report", "printing-executive-report");
      reportState.printing = false;
      document.title = originalTitle;
      renderDetailTable();
      window.setTimeout(() => reportState.dailyChart?.resize?.(), 60);
      window.setTimeout(() => reportState.executiveChart?.resize?.(), 60);
    }, { once: true });
    window.setTimeout(() => window.print(), 80);
  }

  function exportRows() {
    return [
      ["Data", "Município", "Localidade", "Descrição", "Motivo", "Horário", "Duração", "Tipo", "Status", "Responsável"],
      ...reportState.filteredRows.map((row) => [formatDate(row.date), displayValue(row.city), displayValue(row.locality), displayValue(row.occurrence), displayValue(row.reason), timeRange(row.downtime), durationForRow(row), displayValue(row.type), displayValue(row.status), displayValue(row.responsible)])
    ];
  }

  function reportFilename(extension) {
    const start = reportEls.dateStart.value || "inicio";
    const end = reportEls.dateEnd.value || "fim";
    const reportType = reportState.reportMode === "executive" ? "Executivo-Ocorrencias" : "Ocorrencias";
    return `SGP-Relatorio-${reportType}-${start}-a-${end}${extension ? `.${extension}` : ""}`;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function leaderNames(group, isDate = false) {
    if (!group?.leaders?.length) return "Não informado";
    const names = group.leaders.map((item) => isDate ? formatDateKey(item.name) : item.name);
    return names.length > 1 ? `Empate: ${joinNames(names)}` : names[0];
  }

  function leaderCountNote(group, total) {
    if (!group?.leaders?.length) return "Sem informação";
    const suffix = group.leaders.length > 1 ? "cada" : "";
    return `${group.total.toLocaleString("pt-BR")} ocorrência(s) ${suffix} · ${percent(group.total, total)} do total`;
  }

  function leaderSentence(group, singularPrefix, pluralPrefix, isDate = false) {
    if (!group?.leaders?.length) return `${singularPrefix} Não informado.`;
    const names = group.leaders.map((item) => isDate ? formatDateKey(item.name) : item.name);
    const prefix = names.length > 1 ? pluralPrefix : singularPrefix;
    const each = names.length > 1 ? " cada" : "";
    return `${prefix} ${joinNames(names)}, com ${group.total.toLocaleString("pt-BR")} ocorrência(s)${each}.`;
  }

  function joinNames(names) {
    if (names.length <= 1) return names[0] || "Não informado";
    return `${names.slice(0, -1).join(", ")} e ${names.at(-1)}`;
  }

  function periodLabel() {
    const start = reportEls.dateStart.value ? inputDateLabel(reportEls.dateStart.value) : "início da base";
    const end = reportEls.dateEnd.value ? inputDateLabel(reportEls.dateEnd.value) : "fim da base";
    return `${start} até ${end}`;
  }

  function displayValue(value) {
    const result = text(value);
    return result && result !== "-" ? result : "Não informado";
  }

  function percent(value, total) {
    return `${(total ? (value / total) * 100 : 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  }

  function dateKey(value) {
    const date = parseDate(value);
    return date ? isoDate(date) : "";
  }

  function formatDateKey(value) {
    return value ? inputDateLabel(value) : "Não informado";
  }

  function timeRange(value) {
    const source = text(value);
    const matches = [...source.matchAll(/\b([01]?\d|2[0-3])[:h]([0-5]\d)(?::[0-5]\d)?\b/gi)].map((match) => `${String(Number(match[1])).padStart(2, "0")}:${match[2]}`);
    if (matches.length < 2) return "Não informado";
    return `${matches[0]} - ${matches[1]}`;
  }

  function durationForRow(row) {
    const seconds = offlineDurationSeconds(row.downtime);
    return Number.isFinite(seconds) ? clockDuration(seconds) : "Não informado";
  }

  function longestStabilizationLabel(rows) {
    const longest = rows.reduce((current, row) => {
      const seconds = offlineDurationSeconds(row.downtime);
      return Number.isFinite(seconds) && (!current || seconds > current.seconds) ? { row, seconds } : current;
    }, null);
    if (!longest) return "Não disponível";

    const locality = displayValue(longest.row.locality);
    const city = displayValue(longest.row.city);
    const hasLocality = normalizedText(locality) !== "nao informado";
    const hasCity = normalizedText(city) !== "nao informado";
    const place = hasLocality && hasCity && normalizedText(locality) !== normalizedText(city)
      ? `${locality}, ${city}`
      : hasLocality ? locality : hasCity ? city : "Local não informado";
    return `${place} · ${humanDuration(longest.seconds)}`;
  }

  function clockDuration(totalSeconds) {
    if (!Number.isFinite(totalSeconds)) return "Não informado";
    const total = Math.max(0, Math.round(totalSeconds));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
  }

  function humanDuration(totalSeconds) {
    if (!Number.isFinite(totalSeconds)) return "Não informado";
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (days) return `${days}d ${hours}h ${minutes}min`;
    if (hours) return `${hours}h ${minutes}min`;
    return `${minutes}min`;
  }

  function compareDateAscending(a, b) {
    const left = parseDate(a.date);
    const right = parseDate(b.date);
    if (left && right) return left - right;
    if (left) return -1;
    if (right) return 1;
    return text(a.occurrence).localeCompare(text(b.occurrence), "pt-BR");
  }

  function inputDate(value, endOfDay) {
    if (!value) return null;
    return new Date(`${value}T${endOfDay ? "23:59:59" : "00:00:00"}`);
  }

  function inputDateLabel(value) {
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  }

  function isoDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  function text(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim();
  }

  function normalizedText(value) {
    return text(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  function csvValue(value) {
    return `"${String(value ?? "").replace(/"/g, '""')}"`;
  }

  function escape(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  window.SGPOccurrenceReport = { sync: syncReport, open: () => setActiveView("reports") };
})();
