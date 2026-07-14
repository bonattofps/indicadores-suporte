const STORAGE_KEYS = {
  workbook: "indicadoresCollaboratorWorkbookV1",
  notePrefix: "sgpFeedbackNote"
};

const WEEK_ORDER = ["ultima", "s1", "s2", "s3", "s4"];
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
    "Avaliacao Individual",
    "Tempo Medio de Atendimento",
    "Tempo Medio de Resposta"
  ],
  N2: [
    "Colaborador",
    "Ativacao de Novo Login",
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
    "Avaliacao Individual": { target: 4.3, direction: "up" },
    "Tempo Medio de Atendimento": { target: "00:59:59", direction: "down" },
    "Tempo Medio de Resposta": { target: "00:02:20", direction: "down" }
  },
  N2: {
    "Ativacao de Novo Login": { target: 20, direction: "up" },
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
  applySelections();
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
  els.print.addEventListener("click", () => window.print());
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

function applySelections() {
  renderMonthOptions();
  renderCollaboratorOptions();
}

function syncCollaboratorSelection() {
  const rows = currentRows();
  const names = rows.map((row) => rowObject(row).Colaborador).filter(Boolean);
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
    ? `Feedback carregado para ${row.Colaborador}.`
    : "Selecione um colaborador com dados para montar o feedback.";

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

  els.feedback.innerHTML = feedbackParagraphs(row, good, warn, bad)
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join("");

  els.note.value = localStorage.getItem(noteKey()) || "";
}

function renderEmpty() {
  els.month.innerHTML = '<option value="">Sem dados</option>';
  els.collaborator.innerHTML = '<option value="">Sem dados</option>';
  els.profile.innerHTML = "";
  els.metrics.innerHTML = '<tr><td colspan="4">Sem dados para exibir.</td></tr>';
  els.feedback.innerHTML = "<p>Sem dados para gerar feedback.</p>";
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
  const workbookGoals = currentMonth()?.teams?.[state.team]?.goalsByWeek?.[state.week] || {};
  const goals = { ...TEAM_GOALS[state.team], ...workbookGoals };

  if (state.team === "N1") {
    return { ...goals, ...TEAM_GOALS.N1 };
  }

  return goals;
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

function feedbackParagraphs(row, good, warn, bad) {
  if (!row) return ["Selecione um colaborador para gerar o feedback individual."];

  const strengths = good.map((item) => item.metric);
  const needs = [...bad, ...warn].map((item) => item.metric);
  const mainNeed = bad[0]?.metric || warn[0]?.metric || "";

  const paragraphs = [
    `${row.Colaborador}, este feedback é referente a ${WEEK_LABELS[state.week] || state.week}. A conversa é individual e o objetivo é alinhar pontos fortes, metas e próximos passos.`,
    strengths.length
      ? `Pontos positivos: ${strengths.slice(0, 3).join(", ")} ficaram dentro da meta.`
      : "Nesta semana não houve indicador totalmente dentro da meta, então o foco será organizar uma recuperação objetiva para o próximo ciclo.",
    needs.length
      ? `Pontos de melhoria: ${needs.slice(0, 4).join(", ")}.`
      : "Todos os indicadores avaliados ficaram dentro da meta. O foco agora é manter consistência na próxima semana.",
    mainNeed
      ? `Plano sugerido: priorizar ${mainNeed}. ${actionForMetric(mainNeed)}`
      : "Plano sugerido: manter a rotina atual, acompanhar diariamente e evitar queda nos indicadores já estabilizados."
  ];

  return paragraphs;
}

function actionForMetric(metric) {
  if (metric.includes("Operacional")) return "Revisar a rotina diária de registros operacionais e acompanhar o volume no meio do turno.";
  if (metric.includes("Financeiro")) return "Garantir registro completo dos contatos financeiros e revisar eventuais atendimentos não classificados.";
  if (metric.includes("O.S")) return "Avaliar a necessidade real de abertura para campo e alinhar critérios de encaminhamento.";
  if (metric.includes("OPASuite")) return "Acompanhar a fila com mais frequência e reduzir atendimentos sem tratativa registrada.";
  if (metric.includes("Avaliacao")) return "Trabalhar qualidade da comunicação, encerramento do atendimento e confirmação de resolução com o cliente.";
  if (metric.includes("Atendimento")) return "Reduzir tempo médio com respostas objetivas, uso de modelos e priorização da fila.";
  if (metric.includes("Resposta")) return "Responder o cliente com mais agilidade e evitar longos intervalos sem retorno.";
  return "Definir acompanhamento diário e revisar evolução na próxima conversa.";
}

function copyFeedback() {
  const text = [...els.feedback.querySelectorAll("p")].map((item) => item.textContent).join("\n\n");
  navigator.clipboard?.writeText(text);
  els.status.textContent = "Texto de feedback copiado.";
}

function saveNote() {
  localStorage.setItem(noteKey(), els.note.value);
  els.status.textContent = "Observação salva neste navegador.";
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
    button.textContent = saved === "dark" ? "☀" : "◐";
    button.addEventListener("click", () => {
      const next = document.body.dataset.theme === "dark" ? "light" : "dark";
      document.body.dataset.theme = next;
      localStorage.setItem("sgp-theme", next);
      button.textContent = next === "dark" ? "☀" : "◐";
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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
