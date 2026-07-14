const STORAGE_KEYS = {
  workbook: "indicadoresCollaboratorWorkbookV1",
  notePrefix: "sgpFeedbackNote"
};

const WEEK_LABELS = {
  ultima: "Última semana",
  s1: "1ª semana",
  s2: "2ª semana",
  s3: "3ª semana",
  s4: "4ª semana"
};

const TEAM_HEADERS = {
  N1: [
    "Colaborador",
    "Registros Operacional",
    "Registro Financeiro",
    "O.S Aberta a Campo",
    "Atendimento OPASuite",
    "Avaliação Individual",
    "Tempo Médio de Atendimento",
    "Tempo Médio de Resposta"
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
  collaborator: ""
};

let activePrintRestore = null;

const els = {
  status: document.querySelector("#feedbackStatus"),
  month: document.querySelector("#monthSelect"),
  team: document.querySelector("#teamSelect"),
  week: document.querySelector("#weekSelect"),
  collaborator: document.querySelector("#collaboratorSelect"),
  profile: document.querySelector("#profileBand"),
  metrics: document.querySelector("#metricsBody"),
  feedback: document.querySelector("#feedbackText"),
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
    syncCollaboratorSelection();
    render();
  });
  els.team.addEventListener("change", () => {
    state.team = els.team.value;
    syncCollaboratorSelection();
    render();
  });
  els.week.addEventListener("change", () => {
    state.week = els.week.value;
    syncCollaboratorSelection();
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
  const names = currentRows().map((row) => rowObject(row).Colaborador).filter(Boolean);
  if (!names.includes(state.collaborator)) state.collaborator = names[0] || "";
  renderCollaboratorOptions();
}

function render() {
  if (!isValidWorkbook(state.workbook)) return;
  renderMonthOptions();
  renderCollaboratorOptions();
  renderFeedback();
}

function renderMonthOptions() {
  els.month.innerHTML = state.workbook.monthOrder
    .map((monthId) => `<option value="${monthId}">${escapeHtml(state.workbook.months[monthId]?.label || monthId)}</option>`)
    .join("");
  els.month.value = state.month;
  els.team.value = state.team;
  els.week.value = state.week;
}

function renderCollaboratorOptions() {
  const names = currentRows().map((row) => rowObject(row).Colaborador).filter(Boolean);
  els.collaborator.innerHTML = names.length
    ? names.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("")
    : '<option value="">Sem colaboradores</option>';
  if (!state.collaborator || !names.includes(state.collaborator)) state.collaborator = names[0] || "";
  els.collaborator.value = state.collaborator;
}

function renderFeedback() {
  const row = selectedRowObject();
  const month = currentMonth();
  const goals = currentGoals();
  const metrics = Object.keys(goals).map((metric) => {
    const status = metricStatus(row?.[metric], goals[metric]);
    return { metric, value: row?.[metric], goal: goals[metric], status };
  });
  const bad = metrics.filter((item) => item.status === "bad");
  const warn = metrics.filter((item) => item.status === "warn");
  const good = metrics.filter((item) => item.status === "good");
  const status = bad.length ? "Crítico" : warn.length ? "Atenção" : "Bom";
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
      <span class="eyebrow">Melhorar</span>
      <strong>${bad.length}</strong>
    </div>
  `;

  els.metrics.innerHTML = metrics.map((item) => `
    <tr>
      <td>${escapeHtml(item.metric)}</td>
      <td class="${item.status}-cell">${escapeHtml(formatCell(item.value))}</td>
      <td>${escapeHtml(goalLabel(item.goal))}</td>
      <td><span class="badge ${item.status}">${statusLabel(item.status)}</span></td>
    </tr>
  `).join("");

  els.feedback.innerHTML = feedbackItems(row, good, warn, bad)
    .map((item) => `
      <div class="tv-card tv-${item.kind}">
        <span>${escapeHtml(item.label)}</span>
        <strong>${escapeHtml(item.title)}</strong>
        ${renderCardText(item)}
      </div>
    `)
    .join("");

  els.note.value = localStorage.getItem(noteKey()) || "";
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

function currentRows() {
  return currentMonth()?.teams?.[state.team]?.rowsByWeek?.[state.week] || [];
}

function selectedRowObject() {
  return currentRows()
    .map(rowObject)
    .find((row) => row.Colaborador === state.collaborator) || null;
}

function rowObject(row) {
  const headers = TEAM_HEADERS[state.team] || [];
  return Object.fromEntries(headers.map((header, index) => [header, row?.[index] ?? ""]));
}

function currentGoals() {
  const defaultGoals = TEAM_GOALS[state.team] || {};
  const workbookGoals = currentMonth()?.teams?.[state.team]?.goalsByWeek?.[state.week] || {};
  const goals = { ...defaultGoals };

  Object.entries(workbookGoals).forEach(([metric, goal]) => {
    const canonicalMetric = canonicalGoalMetric(metric, defaultGoals);
    if (!canonicalMetric) {
      goals[metric] = goal;
      return;
    }

    if (state.team !== "N1") {
      goals[canonicalMetric] = { ...goals[canonicalMetric], ...goal };
    }
  });

  return goals;
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

  const needs = [...bad, ...warn];
  const mainNeeds = needs.slice(0, 4);
  const hasNeeds = mainNeeds.length > 0;

  return [
    {
      kind: hasNeeds ? "goal" : "good",
      label: "Meta da próxima semana",
      title: hasNeeds ? goalTitle(mainNeeds) : "Manter desempenho",
      lines: hasNeeds
        ? goalsForMetrics(mainNeeds)
        : ["Manter todos os indicadores dentro da meta por mais uma semana."]
    },
    {
      kind: "check",
      label: "Como acompanhar",
      title: "Verificação diária",
      lines: hasNeeds
        ? actionsForMetrics(mainNeeds)
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
  if (Array.isArray(item.lines) && item.lines.length > 1) {
    return `<ul>${item.lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`;
  }

  const text = Array.isArray(item.lines) ? item.lines[0] : item.text;
  return `<p>${escapeHtml(text || "")}</p>`;
}

function actionForMetric(metric) {
  if (metric.includes("Operacional")) return "Conferir o volume de registros no meio do turno e corrigir a rota antes do fechamento do dia.";
  if (metric.includes("Financeiro")) return "Registrar todos os contatos financeiros tratados e revisar se algum atendimento ficou sem classificação.";
  if (metric.includes("O.S")) return "Acompanhar a abertura de O.S diariamente e manter o volume dentro do limite combinado.";
  if (metric.includes("OPASuite")) return "Acompanhar a fila com mais frequência e evitar atendimentos sem tratativa registrada.";
  if (metric.includes("Avaliação")) return "Reforçar comunicação clara, confirmação de resolução e encerramento cordial do atendimento.";
  if (metric.includes("Atendimento")) return "Usar respostas objetivas, modelos prontos e priorização de fila para reduzir o tempo médio.";
  if (metric.includes("Resposta")) return "Responder o cliente com mais agilidade e evitar longos intervalos sem retorno.";
  return "Definir acompanhamento diário e revisar evolução na próxima conversa.";
}

function goalTitle(items) {
  const names = items.map((item) => shortMetricName(item.metric));
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} e ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} e ${names.at(-1)}`;
}

function goalsForMetrics(items) {
  return items
    .map((item) => goalForMetric(item.metric));
}

function actionsForMetrics(items) {
  return items
    .map((item, index) => `Prioridade ${index + 1}: ${actionForMetric(item.metric)}`);
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
  if (!goal) return `Melhorar ${metric} na próxima semana.`;
  return goal.direction === "down"
    ? `Fechar a próxima semana com ${shortMetricName(metric)} em até ${formatCell(goal.target)}.`
    : `Fechar a próxima semana com ${shortMetricName(metric)} em no mínimo ${formatCell(goal.target)}.`;
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
  const text = [...els.feedback.querySelectorAll(".tv-card")]
    .map((item) => item.textContent.replace(/\s+/g, " ").trim())
    .join("\n\n");
  navigator.clipboard?.writeText(text);
  els.status.textContent = "Meta da próxima semana copiada.";
}

function saveNote() {
  localStorage.setItem(noteKey(), els.note.value);
  els.status.textContent = "Meta salva neste navegador.";
}

function printFeedbackPdf() {
  const originalTitle = document.title;
  const row = selectedRowObject();
  const collaborator = row?.Colaborador || state.collaborator || "Colaborador";
  const month = currentMonth()?.label || state.month || "Periodo";
  const week = WEEK_LABELS[state.week] || state.week || "Semana";
  const suggestedTitle = filenameSafe(`SGP - Feedback - ${collaborator} - ${week} - ${month}`);

  preparePrintMode();
  document.title = suggestedTitle;
  els.status.textContent = `Nome sugerido do PDF: ${suggestedTitle}.pdf`;

  const restoreTitle = () => {
    document.title = originalTitle;
    window.removeEventListener("afterprint", restoreTitle);
  };

  window.addEventListener("afterprint", restoreTitle, { once: true });
  window.print();
  window.setTimeout(() => {
    restoreTitle();
    restorePrintMode();
  }, 15000);
}

function preparePrintMode() {
  if (activePrintRestore) return;
  document.body.classList.add("sgp-print-feedback");
  activePrintRestore = hidePrintOnlyElements();
}

function restorePrintMode() {
  document.body.classList.remove("sgp-print-feedback");
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
        display: block !important;
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
    }
  `;
  document.head.appendChild(style);
}

function hidePrintOnlyElements() {
  const selector = [
    ".switcher",
    ".filters",
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

function goalLabel(goal) {
  const direction = goal?.direction === "down" ? "Até" : "Mínimo";
  return `${direction} ${formatCell(goal?.target)}`;
}

function statusLabel(status) {
  return status === "good" ? "Dentro" : status === "warn" ? "Atenção" : "Melhorar";
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
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toUpperCase();
}

function filenameSafe(value) {
  return String(value ?? "")
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
