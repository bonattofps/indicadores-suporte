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
        <p>${escapeHtml(item.text)}</p>
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

  const mainNeed = bad[0]?.metric || warn[0]?.metric || "";
  const nextGoal = mainNeed ? goalForMetric(mainNeed) : "Manter todos os indicadores dentro da meta por mais uma semana.";

  return [
    {
      kind: mainNeed ? "goal" : "good",
      label: "Meta da próxima semana",
      title: mainNeed ? mainNeed : "Manter desempenho",
      text: nextGoal
    },
    {
      kind: "check",
      label: "Como acompanhar",
      title: "Verificação diária",
      text: mainNeed
        ? actionForMetric(mainNeed)
        : "Conferir os indicadores no meio da semana e manter a rotina que trouxe o resultado atual."
    },
    {
      kind: "support",
      label: "Combinado",
      title: "Próxima conversa",
      text: secondaryGoal(good, bad, warn)
    }
  ];
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

function goalForMetric(metric) {
  const goal = currentGoals()[metric];
  if (!goal) return `Melhorar ${metric} na próxima semana.`;
  return goal.direction === "down"
    ? `Fechar a próxima semana com ${metric} em até ${formatCell(goal.target)}.`
    : `Fechar a próxima semana com ${metric} em no mínimo ${formatCell(goal.target)}.`;
}

function secondaryGoal(good, bad, warn) {
  const issues = [...bad, ...warn].map((item) => item.metric);
  if (issues.length > 1) {
    return `Prioridade 1: ${issues[0]}. Prioridade 2: ${issues[1]}. Revisar evolução na próxima conversa.`;
  }
  if (issues.length === 1) {
    return `Foco único em ${issues[0]} para evitar dispersão e facilitar o acompanhamento.`;
  }
  const strength = good[0]?.metric || "os indicadores dentro da meta";
  return `Manter ${strength} dentro da meta e repetir o acompanhamento na próxima semana.`;
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

  document.title = suggestedTitle;
  els.status.textContent = `Nome sugerido do PDF: ${suggestedTitle}.pdf`;

  const restoreTitle = () => {
    document.title = originalTitle;
    window.removeEventListener("afterprint", restoreTitle);
  };

  window.addEventListener("afterprint", restoreTitle, { once: true });
  window.print();
  window.setTimeout(restoreTitle, 15000);
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
