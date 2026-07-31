const STORAGE_KEYS = {
  workbook: "indicadoresCollaboratorWorkbookV1",
  notePrefix: "sgpFeedbackNote"
};

const WEEK_LABELS = {
  ultima: "Última semana",
  s1: "1ª semana",
  s2: "2ª semana",
  s3: "3ª semana",
  s4: "4ª semana",
  s5: "5ª semana"
};

const WEEK_ORDER = ["ultima", "s1", "s2", "s3", "s4", "s5"];

const TEAM_HEADERS = {
  N1: [
    "Colaborador",
    "Registros Operacional",
    "Registro Financeiro",
    "O.S Aberta a Campo",
    "Atendimento OPASuite",
    "Avaliação Individual",
    "Tempo Médio de Atendimento",
    "Tempo Médio de Resposta",
    "Chamadas Atendidas - OPA"
  ],
  N2: [
    "Colaborador",
    "Ativação de Novo Login",
    "Suporte Interno",
    "O.S Aberta a Campo",
    "Atendimento Externo",
    "Atendimento Interno"
  ]
};

const TEAM_GOALS = {
  N1: {
    "Registros Operacional": { target: 38, direction: "up" },
    "Registro Financeiro": { target: 38, direction: "up" },
    "O.S Aberta a Campo": { target: 25, direction: "down" },
    "Atendimento OPASuite": { target: 96, direction: "up" },
    "Chamadas Atendidas - OPA": { target: 12, direction: "up" },
    "Avaliação Individual": { target: 4.3, direction: "up" },
    "Tempo Médio de Atendimento": { target: "01:30:00", direction: "down" },
    "Tempo Médio de Resposta": { target: "00:02:20", direction: "down" }
  },
  N2: {
    "Ativação de Novo Login": { target: 20, direction: "up" },
    "Suporte Interno": { target: 0, direction: "up" },
    "O.S Aberta a Campo": { target: 8, direction: "up" },
    "Atendimento Externo": { target: 40, direction: "up" },
    "Atendimento Interno": { target: 5, direction: "up" }
  }
};

const state = {
  workbook: null,
  month: "",
  team: "N1",
  week: "ultima",
  compareWeek: "",
  mode: "weekly",
  collaborator: ""
};

let activePrintRestore = null;

const els = {
  status: document.querySelector("#feedbackStatus"),
  month: document.querySelector("#monthSelect"),
  team: document.querySelector("#teamSelect"),
  week: document.querySelector("#weekSelect"),
  compareWeek: document.querySelector("#compareWeekSelect"),
  compareControl: document.querySelector("#compareControl"),
  weeklyMode: document.querySelector("#weeklyModeButton"),
  comparisonMode: document.querySelector("#comparisonModeButton"),
  monthlyMode: document.querySelector("#monthlyModeButton"),
  collaborator: document.querySelector("#collaboratorSelect"),
  profile: document.querySelector("#profileBand"),
  metrics: document.querySelector("#metricsBody"),
  feedback: document.querySelector("#feedbackText"),
  comparisonPanel: document.querySelector("#comparisonPanel"),
  comparisonBoards: document.querySelector("#comparisonBoards"),
  comparisonSummary: document.querySelector("#comparisonSummary"),
  comparisonText: document.querySelector("#comparisonText"),
  monthlyPanel: document.querySelector("#monthlyPanel"),
  monthlyWeeks: document.querySelector("#monthlyWeeks"),
  monthlySummary: document.querySelector("#monthlySummary"),
  monthlyText: document.querySelector("#monthlyText"),
  note: document.querySelector("#noteInput"),
  copy: document.querySelector("#copyFeedbackButton"),
  save: document.querySelector("#saveNoteButton"),
  print: document.querySelector("#printButton")
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  ensurePrintStyles();
  setupTheme();
  bindEvents();
  state.workbook = await loadWorkbook();

  if (!isValidWorkbook(state.workbook)) {
    els.status.textContent = "Nenhum dado de colaborador encontrado. Abra Lançamentos ou Colaboradores para carregar/sincronizar os dados.";
    renderEmpty();
    return;
  }

  state.month = state.workbook.monthOrder.at(-1) || "";
  render();
}

function bindEvents() {
  els.month.addEventListener("change", () => {
    state.month = els.month.value;
    syncCompareWeek();
    syncCollaboratorSelection();
    render();
  });
  els.team.addEventListener("change", () => {
    state.team = els.team.value;
    syncCompareWeek();
    syncCollaboratorSelection();
    render();
  });
  els.week.addEventListener("change", () => {
    state.week = els.week.value;
    syncCompareWeek();
    syncCollaboratorSelection();
    render();
  });
  els.compareWeek?.addEventListener("change", () => {
    state.compareWeek = els.compareWeek.value;
    render();
  });
  els.weeklyMode?.addEventListener("click", () => {
    state.mode = "weekly";
    render();
  });
  els.comparisonMode?.addEventListener("click", () => {
    state.mode = "comparison";
    syncCompareWeek();
    render();
  });
  els.monthlyMode?.addEventListener("click", () => {
    state.mode = "monthly";
    render();
  });
  els.collaborator.addEventListener("change", () => {
    state.collaborator = els.collaborator.value;
    render();
  });
  els.copy.addEventListener("click", copyFeedback);
  els.save.addEventListener("click", saveNote);
  els.print.addEventListener("click", printFeedbackPdf);
  window.addEventListener("beforeprint", preparePrintMode);
  window.addEventListener("afterprint", restorePrintMode);
}

async function loadWorkbook() {
  await waitForAuth();

  try {
    const saved = await window.SGPAuth?.loadManualIndicators?.();
    if (isValidWorkbook(saved?.collaboratorWorkbook)) return saved.collaboratorWorkbook;
  } catch (error) {
    console.warn(error);
  }

  const stored = parseStoredJson(STORAGE_KEYS.workbook);
  if (isValidWorkbook(stored)) return stored;

  const seed = window.SGP_MANUAL_INDICATORS_SEED?.collaboratorWorkbook;
  if (isValidWorkbook(seed)) return seed;

  return null;
}

async function waitForAuth() {
  for (let index = 0; index < 80; index += 1) {
    if (document.documentElement.dataset.authReady === "true") return;
    await new Promise((resolve) => window.setTimeout(resolve, 100));
  }
}

function isValidWorkbook(workbook) {
  return workbook?.version === 5 && workbook?.months && Array.isArray(workbook.monthOrder) && workbook.monthOrder.length;
}

function syncCollaboratorSelection() {
  const names = collaboratorNamesForMonth();
  if (!names.includes(state.collaborator)) state.collaborator = names[0] || "";
  renderCollaboratorOptions();
}

function render() {
  if (!isValidWorkbook(state.workbook)) return;
  renderMonthOptions();
  renderModeControls();
  renderCollaboratorOptions();
  renderFeedback();
  renderComparison();
  renderMonthly();
}

function renderMonthOptions() {
  els.month.innerHTML = state.workbook.monthOrder
    .map((monthId) => `<option value="${monthId}">${escapeHtml(state.workbook.months[monthId]?.label || monthId)}</option>`)
    .join("");
  els.month.value = state.month;
  els.team.value = state.team;
  els.week.value = state.week;
  syncCompareWeek();
}

function renderModeControls() {
  const isComparison = state.mode === "comparison";
  const isMonthly = state.mode === "monthly";
  document.body.dataset.feedbackMode = state.mode;
  els.weeklyMode?.classList.toggle("active", !isComparison && !isMonthly);
  els.comparisonMode?.classList.toggle("active", isComparison);
  els.monthlyMode?.classList.toggle("active", isMonthly);
  if (els.copy) els.copy.textContent = isMonthly ? "Copiar mensal" : isComparison ? "Copiar comparativo" : "Copiar meta";
  if (els.compareControl) els.compareControl.hidden = !isComparison;
  if (els.comparisonPanel) els.comparisonPanel.hidden = !isComparison;
  if (els.monthlyPanel) els.monthlyPanel.hidden = !isMonthly;

  const options = comparisonOptions()
    .map((weekKey) => `<option value="${weekKey}">${escapeHtml(WEEK_LABELS[weekKey] || weekKey)}</option>`)
    .join("");

  if (els.compareWeek) {
    els.compareWeek.innerHTML = options || '<option value="">Sem semana para comparar</option>';
    els.compareWeek.value = state.compareWeek;
    els.compareWeek.disabled = true;
  }
}

function availableWeeks() {
  const rowsByWeek = currentMonth()?.teams?.[state.team]?.rowsByWeek || {};
  return WEEK_ORDER.filter((weekKey) => Array.isArray(rowsByWeek[weekKey]) && rowsByWeek[weekKey].length);
}

function syncCompareWeek() {
  const expected = expectedComparisonWeek(state.week);
  state.compareWeek = availableWeeks().includes(expected) ? expected : "";
}

function expectedComparisonWeek(weekKey) {
  const index = WEEK_ORDER.indexOf(weekKey);
  if (index <= 0) return "";
  return WEEK_ORDER[index - 1] || "";
}

function comparisonOptions() {
  return state.compareWeek ? [state.compareWeek] : [];
}

function renderCollaboratorOptions() {
  const names = collaboratorNamesForMonth();
  els.collaborator.innerHTML = names.length
    ? names.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("")
    : '<option value="">Sem colaboradores</option>';
  if (!state.collaborator || !names.includes(state.collaborator)) state.collaborator = names[0] || "";
  els.collaborator.value = state.collaborator;
}

function collaboratorNamesForMonth() {
  const names = new Set();
  availableWeeks().forEach((weekKey) => {
    currentRows(weekKey)
      .map((row) => rowObject(row).Colaborador)
      .filter(Boolean)
      .forEach((name) => names.add(name));
  });
  return [...names].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function renderFeedback() {
  const row = selectedRowObject();
  const month = currentMonth();
  const goals = currentGoals();
  const metricNames = state.team === "N2" ? TEAM_HEADERS.N2.slice(1) : trackedMetricNames(goals);
  const metrics = metricNames.map((metric) => {
    const status = state.team === "N2"
      ? "good"
      : goals[metric]
        ? metricStatus(row?.[metric], goals[metric])
        : "neutral";
    return { metric, value: row?.[metric], goal: goals[metric], status };
  });
  const bad = metrics.filter((item) => item.status === "bad");
  const warn = metrics.filter((item) => item.status === "warn");
  const good = metrics.filter((item) => item.status === "good");
  const status = bad.length ? "Evoluir" : warn.length ? "Atenção" : "Dentro";
  const statusClass = bad.length ? "bad" : warn.length ? "warn" : "good";

  els.status.textContent = row
    ? `Meta da próxima semana carregada para ${row.Colaborador}.`
    : "Selecione um colaborador com dados para montar a meta da próxima semana.";

  els.profile.innerHTML = `
    <div class="profile-item">
      <span class="eyebrow">Colaborador</span>
      <strong>${escapeHtml(row?.Colaborador || "-")}</strong>
      <span class="muted">${escapeHtml(state.team)} - ${escapeHtml(month?.label || "-")} - ${escapeHtml(WEEK_LABELS[state.week] || state.week)}</span>
    </div>
    <div class="profile-item">
      <span class="eyebrow">Status</span>
      <span class="badge ${statusClass}">${status}</span>
    </div>
    <div class="profile-item">
      <span class="eyebrow">Dentro</span>
      <strong>${good.length}</strong>
    </div>
    <div class="profile-item">
      <span class="eyebrow">Atenção</span>
      <strong>${warn.length}</strong>
    </div>
    <div class="profile-item">
      <span class="eyebrow">Evoluir</span>
      <strong>${bad.length}</strong>
    </div>
  `;

  els.metrics.innerHTML = metrics.map((item) => `
    <tr>
      <td>${escapeHtml(item.metric)}</td>
      <td class="${item.status}-cell">${escapeHtml(formatCell(item.value))}</td>
      <td>${escapeHtml(goalLabel(item.goal, item.metric))}</td>
      <td>${renderStatusCell(item.status)}</td>
    </tr>
  `).join("");

  els.feedback.innerHTML = feedbackItems(row, good, warn, bad)
    .map((item) => `
      <div class="tv-card tv-${item.kind}">
        <span>${escapeHtml(item.label)}</span>
        ${item.title ? `<strong>${escapeHtml(item.title)}</strong>` : ""}
        ${renderCardText(item)}
      </div>
    `)
    .join("");

  els.note.value = localStorage.getItem(noteKey()) || "";
}

function renderComparison() {
  if (!els.comparisonPanel) return;
  if (state.mode !== "comparison") {
    els.comparisonPanel.hidden = true;
    return;
  }

  els.comparisonPanel.hidden = false;

  if (state.team !== "N1") {
    els.comparisonSummary.innerHTML = `
      <article class="comparison-card neutral">
        <span>Comparativo</span>
        <strong>N2 sem metas comparativas</strong>
        <p>Use este modo para N1, onde existem metas individuais configuradas.</p>
      </article>
    `;
    els.comparisonBody.innerHTML = '<tr><td colspan="4">Comparativo por meta disponível para N1.</td></tr>';
    els.comparisonText.innerHTML = "";
    return;
  }

  const current = selectedRowObject(state.week);
  const previous = selectedRowObject(state.compareWeek);
  const goals = currentGoals();
  const comparisons = trackedMetricNames(goals).map((metric) => compareMetric(metric, current, previous, goals[metric]));
  const improved = comparisons.filter((item) => item.trend === "improved");
  const worsened = comparisons.filter((item) => item.trend === "worse");
  const stable = comparisons.filter((item) => item.trend === "same");
  const missing = comparisons.filter((item) => item.trend === "missing");

  els.comparisonSummary.innerHTML = `
    <article class="comparison-card good">
      <span>Melhorou</span>
      <strong>${improved.length}</strong>
      <p>${escapeHtml(metricListText(improved, "Nenhum indicador melhorou."))}</p>
    </article>
    <article class="comparison-card bad">
      <span>Oscilou</span>
      <strong>${worsened.length}</strong>
      <p>${escapeHtml(metricListText(worsened, "Nenhum indicador oscilou."))}</p>
    </article>
    <article class="comparison-card neutral">
      <span>Manteve</span>
      <strong>${stable.length}</strong>
      <p>${escapeHtml(metricListText(stable, "Nenhum indicador ficou igual."))}</p>
    </article>
  `;

  els.comparisonBody.innerHTML = comparisons.map((item) => `
    <tr>
      <td>${escapeHtml(item.metric)}</td>
      <td>${escapeHtml(item.previousLabel)}</td>
      <td>${escapeHtml(item.currentLabel)}</td>
      <td>
        <span class="trend-badge ${item.trend}">${escapeHtml(item.trendLabel)}</span>
        <small>${escapeHtml(item.diffLabel)}</small>
      </td>
    </tr>
  `).join("");

  const currentLabel = WEEK_LABELS[state.week] || state.week;
  const previousLabel = WEEK_LABELS[state.compareWeek] || state.compareWeek || "semana anterior";
  const attention = [...worsened, ...missing].slice(0, 4);

  els.comparisonText.innerHTML = `
    <div class="comparison-note">
      <strong>Leitura para a conversa</strong>
      <p>${escapeHtml(state.collaborator || "Colaborador")} teve ${improved.length} indicador(es) com evolução positiva comparando ${escapeHtml(currentLabel)} com ${escapeHtml(previousLabel)}.</p>
      <p>${attention.length
        ? `Pontos para acompanhar: ${escapeHtml(metricListText(attention, ""))}.`
        : "Não há pontos críticos novos na comparação selecionada."}</p>
    </div>
  `;
}

function renderComparison() {
  if (!els.comparisonPanel) return;
  if (state.mode !== "comparison") {
    els.comparisonPanel.hidden = true;
    return;
  }

  els.comparisonPanel.hidden = false;

  if (state.team !== "N1") {
    els.comparisonBoards.innerHTML = "";
    els.comparisonSummary.innerHTML = `
      <article class="comparison-card neutral">
        <span>Comparativo</span>
        <strong>N2 sem metas comparativas</strong>
        <p>Use este modo para N1, onde existem metas individuais configuradas.</p>
      </article>
    `;
    els.comparisonText.innerHTML = "";
    return;
  }

  const current = selectedRowObject(state.week);
  const previous = selectedRowObject(state.compareWeek);
  const goals = currentGoals();
  const metrics = trackedMetricNames(goals);

  if (!state.compareWeek || !previous) {
    els.comparisonBoards.innerHTML = "";
    els.comparisonSummary.innerHTML = `
      <article class="comparison-card neutral">
        <span>Comparativo</span>
        <strong>Sem base anterior</strong>
        <p>Para esta semana, ainda não existe a semana anterior necessária para comparação.</p>
      </article>
    `;
    els.comparisonText.innerHTML = "";
    return;
  }

  const comparisons = metrics.map((metric) => compareMetric(metric, current, previous, goals[metric]));
  const improved = comparisons.filter((item) => item.trend === "improved");
  const worsened = comparisons.filter((item) => item.trend === "worse");
  const stable = comparisons.filter((item) => item.trend === "same");
  const missing = comparisons.filter((item) => item.trend === "missing");
  const currentLabel = WEEK_LABELS[state.week] || state.week;
  const previousLabel = WEEK_LABELS[state.compareWeek] || state.compareWeek || "semana anterior";
  const attention = [...worsened, ...missing].slice(0, 4);

  els.comparisonBoards.innerHTML = `
    ${renderComparisonBoard(previousLabel, previous, metrics, goals, "compare")}
    ${renderComparisonBoard(currentLabel, current, metrics, goals, "current")}
  `;

  els.comparisonSummary.innerHTML = `
    <article class="comparison-card good">
      <span>Melhorou</span>
      <strong>${improved.length}</strong>
      <p>${escapeHtml(metricListText(improved, "Nenhum indicador melhorou."))}</p>
    </article>
    <article class="comparison-card bad">
      <span>Oscilou</span>
      <strong>${worsened.length}</strong>
      <p>${escapeHtml(metricListText(worsened, "Nenhum indicador oscilou."))}</p>
    </article>
    <article class="comparison-card neutral">
      <span>Manteve</span>
      <strong>${stable.length}</strong>
      <p>${escapeHtml(metricListText(stable, "Nenhum indicador ficou igual."))}</p>
    </article>
  `;

  els.comparisonText.innerHTML = `
    <div class="comparison-note">
      <strong>Relatório da evolução</strong>
      <div class="comparison-report">
        <section>
          <span>Melhorou</span>
          <p>${escapeHtml(metricListText(improved, "Nenhum indicador apresentou melhora na comparação."))}</p>
        </section>
        <section>
          <span>Oscilou</span>
          <p>${escapeHtml(metricListText(worsened, "Nenhum indicador oscilou na comparação."))}</p>
        </section>
        <section>
          <span>Manter atenção</span>
          <p>${attention.length
            ? escapeHtml(metricListText(attention, ""))
            : "Não há pontos críticos novos na comparação selecionada."}</p>
        </section>
      </div>
    </div>
  `;
}

function renderComparisonBoard(label, row, metrics, goals, kind) {
  const statusItems = metrics.map((metric) => {
    const status = goals[metric] ? metricStatus(row?.[metric], goals[metric]) : "neutral";
    return { metric, value: row?.[metric], goal: goals[metric], status };
  });

  return `
    <article class="comparison-board ${kind}">
      <div class="comparison-board-head">
        <span>${escapeHtml(kind === "current" ? "Semana atual" : "Semana comparada")}</span>
        <strong>${escapeHtml(label)}</strong>
      </div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Indicador</th>
              <th>Resultado</th>
              <th>Meta</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${statusItems.map((item) => `
              <tr>
                <td>${escapeHtml(item.metric)}</td>
                <td class="${item.status}-cell">${escapeHtml(formatCell(item.value))}</td>
                <td>${escapeHtml(goalLabel(item.goal, item.metric))}</td>
                <td>${renderStatusCell(item.status)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </article>
  `;
}

function renderMonthly() {
  if (!els.monthlyPanel) return;
  if (state.mode !== "monthly") {
    els.monthlyPanel.hidden = true;
    return;
  }

  els.monthlyPanel.hidden = false;

  if (state.team !== "N1") {
    els.monthlyWeeks.innerHTML = "";
    els.monthlySummary.innerHTML = `
      <article class="monthly-card neutral">
        <span>Mensal</span>
        <strong>N2 em acompanhamento</strong>
        <p>O fechamento mensal com metas e médias está configurado para N1.</p>
      </article>
    `;
    els.monthlyText.innerHTML = "";
    return;
  }

  const goals = currentGoals();
  const metrics = trackedMetricNames(goals);
  const weekRows = monthlyRowsForCollaborator();
  const aggregates = monthlyAggregates(weekRows);
  els.status.textContent = weekRows.length
    ? `Fechamento mensal carregado para ${state.collaborator}.`
    : "Sem dados mensais do colaborador nas semanas deste mês.";

  els.monthlyWeeks.innerHTML = weekRows.length
    ? renderMonthlyWeekBoard(weekRows, metrics, goals)
    : '<div class="monthly-empty">Sem dados deste colaborador nas semanas do mês.</div>';

  els.monthlySummary.innerHTML = aggregates.map((item) => `
    <article class="monthly-card ${item.kind}">
      <span>${escapeHtml(item.type)}</span>
      <strong>${escapeHtml(item.value)}</strong>
      <small>${escapeHtml(item.target)}</small>
      <p>${escapeHtml(item.label)}</p>
    </article>
  `).join("");

  const belowGoal = aggregates.filter((item) => item.kind === "bad").map((item) => item.label);
  els.monthlyText.innerHTML = `
    <div class="monthly-note">
      <strong>Leitura mensal</strong>
      <p>${escapeHtml(state.collaborator || "Colaborador")} teve ${weekRows.length} semana(s) considerada(s) em ${escapeHtml(currentMonth()?.label || state.month)}.</p>
      <p>${belowGoal.length
        ? `Pontos para evoluir no mês: ${escapeHtml(belowGoal.join(", "))}.`
        : "Fechamento mensal dentro dos principais limites configurados."}</p>
    </div>
  `;
}

function monthlyRowsForCollaborator() {
  return monthlyWeeks()
    .map((weekKey) => ({ weekKey, row: selectedRowObject(weekKey) }))
    .filter((item) => item.row);
}

function monthlyWeeks() {
  return availableWeeks().filter((weekKey) => weekKey !== "ultima");
}

function renderMonthlyWeekBoard(weekRows, metrics, goals) {
  return `
    <article class="monthly-week monthly-matrix">
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Indicador</th>
              ${weekRows.map((item) => `<th>${escapeHtml(WEEK_LABELS[item.weekKey] || item.weekKey)}</th>`).join("")}
              <th>Mensal</th>
            </tr>
          </thead>
          <tbody>
            ${metrics.map((metric) => {
              const monthlyValue = monthlyValueForMetric(weekRows, metric);
              const monthlyStatus = monthlyStatusKind(metric, monthlyValue, weekRows.length, monthlyAggregationMode(metric));
              return `
                <tr>
                  <td>${escapeHtml(metric)}</td>
                  ${weekRows.map((item) => {
                    const status = goals[metric] ? metricStatus(item.row?.[metric], goals[metric]) : "neutral";
                    return `<td class="${status}-cell">${escapeHtml(formatCell(item.row?.[metric]))}</td>`;
                  }).join("")}
                  <td class="${monthlyStatus}-cell"><strong>${escapeHtml(formatMonthlyMetric(metric, monthlyValue))}</strong></td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    </article>
  `;
}

function monthlyAggregates(weekRows) {
  const sumMetrics = monthlySumMetrics();
  const averageMetrics = monthlyAverageMetrics();

  return [
    ...sumMetrics.map((metric) => {
      const value = sumMetric(weekRows, metric);
      return {
        type: "Soma mensal",
        label: metric,
        value: formatMonthlyMetric(metric, value),
        target: monthlyTargetLabel(metric, weekRows.length, "sum"),
        kind: monthlyStatusKind(metric, value, weekRows.length, "sum")
      };
    }),
    ...averageMetrics.map((metric) => {
      const value = averageMetric(weekRows, metric);
      return {
        type: "Média mensal",
        label: metric,
        value: formatMonthlyMetric(metric, value),
        target: monthlyTargetLabel(metric, weekRows.length, "average"),
        kind: monthlyStatusKind(metric, value, weekRows.length, "average")
      };
    })
  ];
}

function monthlySumMetrics() {
  return [
    "Registros Operacional",
    "Registro Financeiro",
    "O.S Aberta a Campo",
    "Atendimento OPASuite",
    "Chamadas Atendidas - OPA"
  ];
}

function monthlyAverageMetrics() {
  return [
    "Avaliação Individual",
    "Tempo Médio de Atendimento",
    "Tempo Médio de Resposta"
  ];
}

function monthlyAggregationMode(metric) {
  return monthlyAverageMetrics().includes(metric) ? "average" : "sum";
}

function monthlyValueForMetric(weekRows, metric) {
  return monthlyAggregationMode(metric) === "average"
    ? averageMetric(weekRows, metric)
    : sumMetric(weekRows, metric);
}

function sumMetric(weekRows, metric) {
  return weekRows.reduce((total, item) => {
    const value = metricValue(item.row?.[metric]);
    return Number.isFinite(value) ? total + value : total;
  }, 0);
}

function averageMetric(weekRows, metric) {
  const values = weekRows
    .map((item) => metricValue(item.row?.[metric]))
    .filter((value) => Number.isFinite(value));
  if (!values.length) return NaN;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function formatMonthlyMetric(metric, value) {
  if (!Number.isFinite(value)) return "-";
  if (metric.includes("Tempo")) return secondsToTime(value);
  if (metric.includes("Avaliação")) {
    return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return Math.round(value).toLocaleString("pt-BR");
}

function monthlyTargetLabel(metric, weekCount, mode) {
  const goal = currentGoals()[metric];
  if (!goal) return "Meta mensal: -";
  const baseTarget = metricValue(goal.target);
  if (!Number.isFinite(baseTarget)) return "Meta mensal: -";
  const target = mode === "sum" ? baseTarget * Math.max(weekCount, 1) : baseTarget;
  const direction = goal.direction === "down" ? "até" : "mínimo";
  return `Meta mensal: ${direction} ${formatMonthlyMetric(metric, target)}`;
}

function monthlyStatusKind(metric, value, weekCount, mode) {
  const goal = currentGoals()[metric];
  if (!goal || !Number.isFinite(value)) return "neutral";
  const baseTarget = metricValue(goal.target);
  const target = mode === "sum" ? baseTarget * Math.max(weekCount, 1) : baseTarget;
  if (!Number.isFinite(target)) return "neutral";
  if (goal.direction === "down") return value <= target ? "good" : "bad";
  return value >= target ? "good" : "bad";
}

function compareMetric(metric, currentRow, previousRow, goal) {
  const currentValue = currentRow?.[metric];
  const previousValue = previousRow?.[metric];
  const currentNumber = metricValue(currentValue);
  const previousNumber = metricValue(previousValue);
  const hasData = Number.isFinite(currentNumber) && Number.isFinite(previousNumber);

  if (!hasData) {
    return {
      metric,
      trend: "missing",
      trendLabel: "Sem dados",
      previousLabel: formatCell(previousValue),
      currentLabel: formatCell(currentValue),
      diffLabel: "Comparação incompleta"
    };
  }

  const diff = currentNumber - previousNumber;
  const same = Math.abs(diff) < 0.0001;
  const improved = goal?.direction === "down" ? diff < 0 : diff > 0;
  const trend = same ? "same" : improved ? "improved" : "worse";

  return {
    metric,
    trend,
    trendLabel: trendLabel(trend),
    previousLabel: formatCell(previousValue),
    currentLabel: formatCell(currentValue),
    diffLabel: diffLabel(metric, diff)
  };
}

function trendLabel(trend) {
  if (trend === "improved") return "Melhorou";
  if (trend === "worse") return "Oscilou";
  if (trend === "missing") return "Sem dados";
  return "Manteve";
}

function diffLabel(metric, diff) {
  if (!Number.isFinite(diff)) return "-";
  const sign = diff > 0 ? "+" : diff < 0 ? "-" : "";
  const absolute = Math.abs(diff);
  if (metric.includes("Tempo")) return `${sign}${secondsToTime(absolute)}`;
  const value = Number.isInteger(absolute)
    ? String(absolute)
    : absolute.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${sign}${value}`;
}

function secondsToTime(seconds) {
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return [hours, minutes, secs].map((part) => String(part).padStart(2, "0")).join(":");
}

function metricListText(items, fallback) {
  if (!items.length) return fallback;
  return items.map((item) => shortMetricName(item.metric)).join(", ");
}

function renderEmpty() {
  els.month.innerHTML = '<option value="">Sem dados</option>';
  els.collaborator.innerHTML = '<option value="">Sem dados</option>';
  els.profile.innerHTML = "";
  els.metrics.innerHTML = '<tr><td colspan="4">Sem dados para exibir.</td></tr>';
  els.feedback.innerHTML = '<div class="tv-card tv-neutral"><span>Sem dados</span><strong>Nenhuma meta gerada</strong><p>Carregue os dados dos colaboradores para montar a meta da próxima semana.</p></div>';
}

function currentMonth() {
  return state.workbook?.months?.[state.month] || null;
}

function currentRows(weekKey = state.week) {
  return currentMonth()?.teams?.[state.team]?.rowsByWeek?.[weekKey] || [];
}

function selectedRowObject(weekKey = state.week) {
  return currentRows(weekKey)
    .map(rowObject)
    .find((row) => row.Colaborador === state.collaborator) || null;
}

function rowObject(row) {
  const headers = TEAM_HEADERS[state.team] || [];
  return Object.fromEntries(headers.map((header, index) => [header, row?.[index] ?? ""]));
}

function currentGoals() {
  if (state.team === "N2") return {};

  const defaultGoals = TEAM_GOALS[state.team] || {};
  const workbookGoals = currentMonth()?.teams?.[state.team]?.goalsByWeek?.[state.week] || {};
  const goals = { ...defaultGoals };

  Object.entries(workbookGoals).forEach(([metric, goal]) => {
    const canonicalMetric = canonicalGoalMetric(metric, defaultGoals);
    if (!canonicalMetric) {
      if (state.team === "N1") return;
      goals[metric] = goal;
      return;
    }

    if (state.team !== "N1") {
      goals[canonicalMetric] = { ...goals[canonicalMetric], ...goal };
    }
  });

  return goals;
}

function trackedMetricNames(goals = currentGoals()) {
  if (state.team !== "N1") return Object.keys(goals);
  return Array.from(new Set([
    ...Object.keys(goals),
    "Chamadas Atendidas - OPA"
  ]));
}

function canonicalGoalMetric(metric, defaultGoals) {
  const metricKey = normalize(metric);
  return Object.keys(defaultGoals).find((defaultMetric) => normalize(defaultMetric) === metricKey) || "";
}

function metricStatus(value, goal) {
  const current = metricValue(value);
  const target = metricValue(goal?.target);
  if (!Number.isFinite(current) || !Number.isFinite(target)) return "warn";

  if (goal.direction === "down") {
    return current <= target ? "good" : "bad";
  }

  if (current >= target) return "good";
  return current >= target * 0.8 ? "warn" : "bad";
}

function metricValue(value) {
  if (typeof value === "number") return value;
  if (isTimeLike(value)) return timeToSeconds(value);
  const numeric = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(numeric) ? numeric : NaN;
}

function feedbackItems(row, good, warn, bad) {
  if (!row) {
    return [{
      kind: "neutral",
      label: "Sem colaborador",
      title: "Selecione um colaborador",
      text: "Escolha mês, semana, equipe e colaborador para montar a meta da próxima semana."
    }];
  }

  if (state.team === "N2") {
    return [
      {
        kind: "check",
        label: "Como acompanhar",
        title: "",
        lines: ["Continuar focado nos deveres do N2, apoiar a operação e manter as tratativas alinhadas com a rotina da equipe."]
      },
      {
        kind: "support",
        label: "Combinado",
        title: "",
        lines: ["Seguir o que for passado para a equipe e manter alinhamento com a liderança sobre prioridades e demandas do período."]
      }
    ];
  }

  const needs = [...bad, ...warn];
  const mainNeeds = needs.slice(0, 4);
  const hasNeeds = mainNeeds.length > 0;

  return [
    {
      kind: hasNeeds ? "goal" : "good",
      label: "Meta da próxima semana",
      title: hasNeeds ? `${mainNeeds.length} ${mainNeeds.length === 1 ? "meta pendente" : "metas pendentes"}` : "Manter desempenho",
      rows: hasNeeds ? goalRowsForMetrics(mainNeeds) : null,
      lines: hasNeeds
        ? null
        : ["Manter todos os indicadores dentro da meta por mais uma semana."]
    },
    {
      kind: "check",
      label: "Como acompanhar",
      title: "Verificação diária",
      rows: hasNeeds ? actionRowsForMetrics(mainNeeds) : null,
      lines: hasNeeds
        ? null
        : ["Conferir os indicadores no meio da semana e manter a rotina que trouxe o resultado atual."]
    },
    {
      kind: "support",
      label: "Combinado",
      title: "Próxima conversa",
      lines: [secondaryGoal(good, bad, warn)]
    }
  ];
}

function renderCardText(item) {
  if (Array.isArray(item.rows) && item.rows.length) {
    return `
      <div class="metric-list">
        ${item.rows.map((row) => `
          <div class="metric-row">
            <span>${escapeHtml(row.label)}</span>
            <strong>${escapeHtml(row.value)}</strong>
          </div>
        `).join("")}
      </div>
    `;
  }

  if (Array.isArray(item.lines) && item.lines.length > 1) {
    return `<ul>${item.lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`;
  }

  const text = Array.isArray(item.lines) ? item.lines[0] : item.text;
  return `<p>${escapeHtml(text || "")}</p>`;
}

function renderStatusCell(status) {
  const label = statusLabel(status);
  if (!label) return "";
  return `<span class="badge ${status}">${escapeHtml(label)}</span>`;
}

function actionForMetric(metric) {
  if (metric.includes("Chamadas")) return "Acompanhar a disponibilidade na fila e manter pelo menos 12 chamadas atendidas na semana.";
  if (metric.includes("Operacional")) return "Conferir o volume de registros no meio do turno e corrigir a rota antes do fechamento do dia.";
  if (metric.includes("Financeiro")) return "Registrar todos os contatos financeiros tratados e revisar se algum atendimento ficou sem classificação.";
  if (metric.includes("O.S")) return "Acompanhar a abertura de O.S diariamente e manter o volume dentro do limite combinado.";
  if (metric.includes("OPASuite")) return "Acompanhar a fila com mais frequência e evitar atendimentos sem tratativa registrada.";
  if (metric.includes("Avaliação")) return "Reforçar comunicação clara, confirmação de resolução e encerramento cordial do atendimento.";
  if (metric.includes("Atendimento")) return "Usar respostas objetivas, modelos prontos e priorização de fila para reduzir o tempo médio.";
  if (metric.includes("Resposta")) return "Responder o cliente com mais agilidade e evitar longos intervalos sem retorno.";
  return "Definir acompanhamento diário e revisar evolução na próxima conversa.";
}

function goalRowsForMetrics(items) {
  return items
    .map((item) => ({
      label: shortMetricName(item.metric),
      value: goalTargetText(item.metric)
    }));
}

function actionRowsForMetrics(items) {
  return items
    .map((item, index) => ({
      label: `Prioridade ${index + 1}`,
      value: actionForMetric(item.metric)
    }));
}

function shortMetricName(metric) {
  if (metric.includes("Operacional")) return "Operacional";
  if (metric.includes("Financeiro")) return "Financeiro";
  if (metric.includes("O.S")) return "O.S Campo";
  if (metric.includes("OPASuite")) return "OPASuite";
  if (metric.includes("Avaliação")) return "Avaliação";
  if (metric.includes("Atendimento")) return "TMA";
  if (metric.includes("Resposta")) return "TMR";
  return metric;
}

function goalForMetric(metric) {
  const goal = currentGoals()[metric];
  if (!goal) return `Acompanhar ${metric} na próxima semana.`;
  return goal.direction === "down"
    ? `Fechar a próxima semana com ${shortMetricName(metric)} em até ${formatCell(goal.target)}.`
    : `Fechar a próxima semana com ${shortMetricName(metric)} em no mínimo ${formatCell(goal.target)}.`;
}

function goalTargetText(metric) {
  const goal = currentGoals()[metric];
  if (!goal) return "Acompanhar";
  return goal.direction === "down"
    ? `Até ${formatCell(goal.target)}`
    : `Mínimo ${formatCell(goal.target)}`;
}

function secondaryGoal(good, bad, warn) {
  const issues = [...bad, ...warn].map((item) => item.metric);
  if (issues.length > 1) {
    return `Foco nos ${issues.length} indicadores fora da meta. Revisar evolução na próxima conversa e manter os indicadores que já estão dentro.`;
  }
  if (issues.length === 1) {
    return `Foco único em ${shortMetricName(issues[0])} para evitar dispersão e facilitar o acompanhamento.`;
  }
  const strength = good[0]?.metric || "os indicadores dentro da meta";
  return `Manter ${shortMetricName(strength)} dentro da meta e repetir o acompanhamento na próxima semana.`;
}

function copyFeedback() {
  const source = state.mode === "monthly" ? els.monthlyPanel : state.mode === "comparison" ? els.comparisonPanel : els.feedback;
  const text = [...source.querySelectorAll(".tv-card, .comparison-board, .comparison-card, .comparison-note, .monthly-week, .monthly-card, .monthly-note")]
    .map((item) => item.textContent.replace(/\s+/g, " ").trim())
    .join("\n\n");
  navigator.clipboard?.writeText(text);
  els.status.textContent = state.mode === "monthly" ? "Fechamento mensal copiado." : state.mode === "comparison" ? "Comparativo copiado." : "Meta da próxima semana copiada.";
}

function saveNote() {
  localStorage.setItem(noteKey(), els.note.value);
  els.status.textContent = "Meta salva neste navegador.";
}

function printFeedbackPdf() {
  if (state.mode === "comparison") {
    els.status.textContent = "Será gerado um PDF com 2 páginas: feedback semanal e comparativo semanal.";
    printReportForMode("comparison-complete");
    return;
  }

  printReportForMode(state.mode);
}

function printReportSequence(modes) {
  const [mode, ...nextModes] = modes;
  if (!mode) return;
  printReportForMode(mode, () => {
    if (nextModes.length) {
      window.setTimeout(() => printReportSequence(nextModes), 800);
    }
  });
}

function printReportForMode(mode, afterPrintCallback) {
  const originalTitle = document.title;
  const row = selectedRowObject();
  const collaborator = row?.Colaborador || state.collaborator || "Colaborador";
  const month = currentMonth()?.label || state.month || "Periodo";
  const week = WEEK_LABELS[state.week] || state.week || "Semana";
  const compareWeek = WEEK_LABELS[state.compareWeek] || state.compareWeek || "Semana anterior";
  const titlePrefix = mode === "monthly" ? "SGP - Mensal" : mode === "comparison" || mode === "comparison-complete" ? "SGP - Feedback e Comparativo" : "SGP - Feedback";
  const titleSuffix = mode === "monthly" ? "Fechamento mensal" : mode === "comparison" || mode === "comparison-complete" ? `${compareWeek} x ${week}` : week;
  const suggestedTitle = filenameSafe(`${titlePrefix} - ${collaborator} - ${titleSuffix} - ${month}`);

  preparePrintMode(mode);
  document.title = suggestedTitle;
  els.status.textContent = `Nome sugerido do PDF: ${suggestedTitle}.pdf`;

  let restored = false;
  const restoreTitle = () => {
    if (restored) return;
    restored = true;
    document.title = originalTitle;
    window.removeEventListener("afterprint", restoreTitle);
    restorePrintMode();
    if (typeof afterPrintCallback === "function") afterPrintCallback();
  };

  window.addEventListener("afterprint", restoreTitle, { once: true });
  window.print();
  window.setTimeout(() => {
    restoreTitle();
  }, 15000);
}

function preparePrintMode(mode = state.mode) {
  if (activePrintRestore) return;
  document.body.classList.add("sgp-print-feedback");
  document.body.dataset.printMode = mode;
  activePrintRestore = hidePrintOnlyElements();
}

function restorePrintMode() {
  document.body.classList.remove("sgp-print-feedback");
  delete document.body.dataset.printMode;
  if (activePrintRestore) {
    activePrintRestore();
    activePrintRestore = null;
  }
}

function ensurePrintStyles() {
  if (document.querySelector("#sgpFeedbackPrintStyle")) return;
  const style = document.createElement("style");
  style.id = "sgpFeedbackPrintStyle";
  style.textContent = `
    @media print {
      body.sgp-print-feedback .switcher,
      body.sgp-print-feedback .filters,
      body.sgp-print-feedback .feedback-mode,
      body.sgp-print-feedback .subtitle,
      body.sgp-print-feedback .sgp-userbar,
      body.sgp-print-feedback .sgp-assistant-button,
      body.sgp-print-feedback .sgp-assistant-panel,
      body.sgp-print-feedback [class*="sgp-assistant"],
      body.sgp-print-feedback #copyFeedbackButton,
      body.sgp-print-feedback #saveNoteButton,
      body.sgp-print-feedback #printButton,
      body.sgp-print-feedback .notice {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
      }

      body.sgp-print-feedback {
        background: #fff !important;
      }

      body.sgp-print-feedback .screen {
        width: 100% !important;
        padding: 0 !important;
      }

      body.sgp-print-feedback .profile-band {
        display: grid !important;
        grid-template-columns: 1.6fr repeat(4, 0.7fr) !important;
      }

      body.sgp-print-feedback .feedback-layout {
        display: grid !important;
        grid-template-columns: minmax(0, 1.06fr) minmax(0, 0.94fr) !important;
        gap: 8px !important;
        align-items: start !important;
      }

      body.sgp-print-feedback .table-scroll {
        max-height: none !important;
        overflow: visible !important;
      }

      body.sgp-print-feedback .good-cell {
        background: #d8f1dd !important;
        color: #005f3f !important;
      }

      body.sgp-print-feedback .warn-cell {
        background: #fff0bf !important;
        color: #7a5300 !important;
      }

      body.sgp-print-feedback .bad-cell {
        background: #ffd7d7 !important;
        color: #9f1d1d !important;
      }

      body.sgp-print-feedback[data-print-mode="weekly"] .comparison-panel,
      body.sgp-print-feedback[data-print-mode="weekly"] .monthly-panel,
      body.sgp-print-feedback[data-print-mode="comparison"] .feedback-layout,
      body.sgp-print-feedback[data-print-mode="comparison"] .monthly-panel,
      body.sgp-print-feedback[data-print-mode="comparison-complete"] .monthly-panel,
      body.sgp-print-feedback[data-print-mode="monthly"] .feedback-layout,
      body.sgp-print-feedback[data-print-mode="monthly"] .comparison-panel {
        display: none !important;
      }

      body.sgp-print-feedback[data-print-mode="monthly"] .monthly-panel,
      body.sgp-print-feedback[data-print-mode="comparison"] .comparison-panel,
      body.sgp-print-feedback[data-print-mode="comparison-complete"] .comparison-panel {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
      }

      body.sgp-print-feedback[data-print-mode="comparison-complete"] .comparison-panel {
        break-before: page !important;
        page-break-before: always !important;
      }
    }
  `;
  document.head.appendChild(style);
}

function hidePrintOnlyElements() {
  const selector = [
    ".switcher",
    ".filters",
    ".feedback-mode",
    ".subtitle",
    ".sgp-userbar",
    ".sgp-assistant-button",
    ".sgp-assistant-panel",
    "[class*='sgp-assistant']",
    "#copyFeedbackButton",
    "#saveNoteButton",
    "#printButton",
    ".notice"
  ].join(",");
  const elements = [...document.querySelectorAll(selector)];
  const previous = elements.map((element) => ({
    element,
    display: element.style.getPropertyValue("display"),
    priority: element.style.getPropertyPriority("display")
  }));

  elements.forEach(({ style }) => style.setProperty("display", "none", "important"));

  return () => {
    previous.forEach(({ element, display, priority }) => {
      if (display) {
        element.style.setProperty("display", display, priority);
      } else {
        element.style.removeProperty("display");
      }
    });
  };
}

function noteKey() {
  return `${STORAGE_KEYS.notePrefix}:${state.month}:${state.team}:${state.week}:${normalize(state.collaborator)}`;
}

function goalLabel(goal, metric = "") {
  if (state.team === "N2" || !goal) {
    return metric ? "SEM META" : "-";
  }
  const direction = goal?.direction === "down" ? "Até" : "Mínimo";
  return `${direction} ${formatCell(goal?.target)}`;
}

function statusLabel(status) {
  if (state.team === "N2") return "";
  if (status === "neutral") return "";
  return status === "good" ? "Dentro" : status === "warn" ? "Atenção" : "Evoluir";
}

function formatCell(value) {
  if (value === "" || value === null || value === undefined) return "-";
  if (isTimeLike(value)) return normalizeTimeLabel(value);
  const numeric = Number(value);
  if (Number.isFinite(numeric) && Math.abs(numeric) < 10 && !Number.isInteger(numeric)) {
    return numeric.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return String(value);
}

function isTimeLike(value) {
  return /^\d{1,3}:\d{2}(:\d{2})?$/.test(String(value ?? "").trim());
}

function normalizeTimeLabel(value) {
  const parts = String(value).split(":").map((part) => Number(part) || 0);
  if (parts.length === 2) parts.unshift(0);
  return parts.map((part) => String(part).padStart(2, "0")).join(":");
}

function timeToSeconds(value) {
  const parts = normalizeTimeLabel(value).split(":").map(Number);
  return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
}

function parseStoredJson(key) {
  try {
    const raw = localStorage.getItem(key) || sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setupTheme() {
  const button = document.querySelector("#themeToggle");
  const saved = localStorage.getItem("sgp-theme") || "light";
  document.body.dataset.theme = saved;
  if (button) {
    button.textContent = saved === "dark" ? "Claro" : "Tema";
    button.addEventListener("click", () => {
      const next = document.body.dataset.theme === "dark" ? "light" : "dark";
      document.body.dataset.theme = next;
      localStorage.setItem("sgp-theme", next);
      button.textContent = next === "dark" ? "Claro" : "Tema";
    });
  }
}

function normalize(value) {
  return fixMojibake(String(value ?? ""))
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toUpperCase();
}

function fixMojibake(value) {
  return String(value ?? "")
    .replaceAll("\u00C3\u0161", "Ú")
    .replaceAll("\u00C3\u00A7", "ç")
    .replaceAll("\u00C3\u00A3", "ã")
    .replaceAll("\u00C3\u00A9", "é")
    .replaceAll("\u00C3\u00A1", "á")
    .replaceAll("\u00C3\u00B3", "ó")
    .replaceAll("\u00C3\u00AD", "í")
    .replaceAll("\u00C3\u00BA", "ú")
    .replaceAll("\u00C3\u00AA", "ê")
    .replaceAll("\u00C2\u00AA", "ª");
}

function filenameSafe(value) {
  return String(value ?? "")
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(value) {
  return fixMojibake(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
