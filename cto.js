const CONFIG = {
  // Cole aqui a URL do Web App do Google Apps Script depois de publicar.
  appsScriptUrl: "https://script.google.com/macros/s/AKfycbwiYUxzrlXbkzXvDDVBRt6u7NGrefXBX2oM36quHKMV8hFHncm39UiByKHX_D-UrYGT/exec",
  storageKey: "painel-gerador-logins:v1"
};

const state = loadState();
let loginCountTimer = null;

const els = {
  form: document.querySelector("#registroForm"),
  olt: document.querySelector("#olt"),
  pon: document.querySelector("#pon"),
  tecnico: document.querySelector("#tecnico"),
  suporte: document.querySelector("#suporte"),
  observacoes: document.querySelector("#observacoes"),
  evidencia: document.querySelector("#evidencia"),
  resumo: document.querySelector("#resumo"),
  copiarResumo: document.querySelector("#copiarResumo"),
  salvarRegistro: document.querySelector("#salvarRegistro"),
  formStatus: document.querySelector("#formStatus"),
  nomeCompleto: document.querySelector("#nomeCompleto"),
  limparNome: document.querySelector("#limparNome"),
  loginList: document.querySelector("#loginList"),
  loginStatus: document.querySelector("#loginStatus"),
  buscaHistorico: document.querySelector("#buscaHistorico"),
  historicoBody: document.querySelector("#historicoBody"),
  navButtons: document.querySelectorAll(".nav-button"),
  dashboardViews: document.querySelectorAll(".dashboard-view"),
  dashboardTitle: document.querySelector("#dashboardTitle"),
  dashboardSubtitle: document.querySelector("#dashboardSubtitle"),
  totalRegistros: document.querySelector("#totalRegistros"),
  totalOlts: document.querySelector("#totalOlts"),
  totalTecnicos: document.querySelector("#totalTecnicos"),
  loginsGerados: document.querySelector("#loginsGerados"),
  loginsCopiados: document.querySelector("#loginsCopiados"),
  totalUsos: document.querySelector("#totalUsos")
};

["input", "change"].forEach((eventName) => {
  els.form.addEventListener(eventName, atualizarResumo);
});

els.form.addEventListener("submit", salvarRegistro);
els.copiarResumo.addEventListener("click", () => copiarTexto(els.resumo.value, "Resumo copiado.", els.formStatus));
els.nomeCompleto.addEventListener("input", renderLogins);
els.limparNome.addEventListener("click", () => {
  els.nomeCompleto.value = "";
  renderLogins();
  els.nomeCompleto.focus();
});
els.buscaHistorico.addEventListener("input", renderHistorico);
els.navButtons.forEach((button) => {
  button.addEventListener("click", () => trocarDashboard(button.dataset.dashboard));
});

atualizarResumo();
renderLogins();
renderHistorico();
renderStats();
sincronizarHistoricoDaPlanilha();

function trocarDashboard(dashboardName) {
  els.navButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.dashboard === dashboardName);
  });

  els.dashboardViews.forEach((view) => {
    const active = view.id === `dashboard-${dashboardName}`;
    view.classList.toggle("active", active);
    if (active) {
      els.dashboardTitle.textContent = view.dataset.title;
      els.dashboardSubtitle.textContent = view.dataset.subtitle;
    }
  });
}

function loadState() {
  const fallback = { registros: [], loginsGerados: 0, loginsCopiados: 0, generatedLoginKeys: [] };
  try {
    return { ...fallback, ...JSON.parse(localStorage.getItem(CONFIG.storageKey)) };
  } catch {
    return fallback;
  }
}

function persistState() {
  localStorage.setItem(CONFIG.storageKey, JSON.stringify(state));
}

function atualizarResumo() {
  const data = formatDate(new Date());
  const partes = [
    `Data: ${data}`,
    `OLT: ${els.olt.value || "-"}`,
    `SLOT/PON: ${els.pon.value || "-"}`,
    `Tecnico de Campo: ${els.tecnico.value || "-"}`,
    `Suporte Responsavel: ${els.suporte.value || "-"}`,
    `Observacoes Tecnicas: ${els.observacoes.value || "-"}`,
    `Link da Evidencia: ${els.evidencia.value || "-"}`
  ];
  els.resumo.value = partes.join("\n");
}

async function salvarRegistro(event) {
  event.preventDefault();
  atualizarResumo();

  const registro = {
    data: new Date().toISOString(),
    dataFormatada: formatDate(new Date()),
    olt: els.olt.value.trim(),
    pon: els.pon.value.trim(),
    tecnico: els.tecnico.value.trim(),
    suporte: els.suporte.value.trim(),
    observacoes: els.observacoes.value.trim(),
    evidencia: els.evidencia.value.trim()
  };

  setStatus("Salvando registro...", "");
  els.salvarRegistro.disabled = true;

  try {
    await enviarParaPlanilha(registro);
    state.registros.unshift(registro);
    persistState();
    els.form.reset();
    atualizarResumo();
    renderHistorico();
    renderStats();
    setStatus("Registro salvo com sucesso.", "success");
    window.setTimeout(sincronizarHistoricoDaPlanilha, 1200);
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    els.salvarRegistro.disabled = false;
  }
}

function sincronizarHistoricoDaPlanilha() {
  if (!CONFIG.appsScriptUrl) return;

  const callbackName = `receberHistorico_${Date.now()}`;
  const script = document.createElement("script");
  const separator = CONFIG.appsScriptUrl.includes("?") ? "&" : "?";

  window[callbackName] = (response) => {
    if (response && response.ok && Array.isArray(response.registros)) {
      state.registros = response.registros;
      persistState();
      renderHistorico();
      renderStats();
    }

    delete window[callbackName];
    script.remove();
  };

  script.onerror = () => {
    delete window[callbackName];
    script.remove();
  };

  script.src = `${CONFIG.appsScriptUrl}${separator}callback=${callbackName}&_=${Date.now()}`;
  document.body.appendChild(script);
}

async function enviarParaPlanilha(registro) {
  if (!CONFIG.appsScriptUrl) {
    return;
  }

  const body = new URLSearchParams();
  Object.entries(registro).forEach(([key, value]) => {
    body.append(key, value || "");
  });

  return fetch(CONFIG.appsScriptUrl, {
    method: "POST",
    mode: "no-cors",
    body
  });
}

function renderLogins() {
  const nome = els.nomeCompleto.value.trim();
  const logins = gerarLogins(nome);

  els.loginList.innerHTML = "";

  if (!logins.length) {
    els.loginList.innerHTML = `<div class="login-card"><div><small>Digite o nome completo</small><code>aguardando_dados_UNI</code></div><span class="badge">UNI</span></div>`;
    return;
  }

  const generatedKey = normalizarNome(nome).join(".");
  agendarContagemDeLogin(generatedKey);

  logins.forEach((item, index) => {
    const card = document.createElement("article");
    card.className = `login-card${index === 0 ? " main" : ""}`;
    card.innerHTML = `
      <div>
        <small>${item.rotulo}</small>
        <code>${item.login}</code>
      </div>
      <span class="badge">${index === 0 ? "PRINCIPAL" : "ALT"}</span>
      <button class="copy-login" type="button">Copiar</button>
    `;
    card.querySelector("button").addEventListener("click", () => {
      state.loginsCopiados += 1;
      persistState();
      renderStats();
      copiarTexto(item.login, "Login copiado.", els.loginStatus);
    });
    els.loginList.appendChild(card);
  });
}

function agendarContagemDeLogin(generatedKey) {
  window.clearTimeout(loginCountTimer);

  loginCountTimer = window.setTimeout(() => {
    const currentKey = normalizarNome(els.nomeCompleto.value.trim()).join(".");
    if (!currentKey || currentKey !== generatedKey) return;

    if (!Array.isArray(state.generatedLoginKeys)) {
      state.generatedLoginKeys = [];
    }

    if (state.generatedLoginKeys.includes(generatedKey)) return;

    state.generatedLoginKeys.push(generatedKey);
    state.loginsGerados += 1;
    persistState();
    renderStats();
  }, 900);
}

function gerarLogins(nome) {
  const partes = normalizarNome(nome);
  if (partes.length < 2) return [];

  const primeiro = partes[0];
  const segundo = partes[1] || "";
  const ultimo = partes[partes.length - 1];
  const inicialUltimo = ultimo ? ultimo.charAt(0) : "";
  const inicialSegundo = segundo ? segundo.charAt(0) : "";

  const candidatos = [
    {
      rotulo: "Opcao principal (primeiro.ultimo)",
      login: [primeiro, ultimo].filter(Boolean).join(".")
    },
    {
      rotulo: "Alternativa 2 (primeiro.segundo)",
      login: [primeiro, segundo].filter(Boolean).join(".")
    },
    {
      rotulo: "Alternativa 3 (primeiro.segundo.ultimo)",
      login: [primeiro, segundo, ultimo].filter(Boolean).join(".")
    },
    {
      rotulo: "Alternativa 4 (primeiro.inicial ultimo)",
      login: `${primeiro}.${inicialUltimo || inicialSegundo}`
    }
  ];

  const unicos = new Map();
  candidatos.forEach((item) => {
    const login = `${item.login}_UNI`;
    if (item.login && !unicos.has(login)) unicos.set(login, { ...item, login });
  });

  return [...unicos.values()].slice(0, 4);
}

function normalizarNome(nome) {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((parte) => parte && !["de", "da", "do", "das", "dos", "e"].includes(parte));
}

function renderHistorico() {
  const termo = els.buscaHistorico.value.trim().toLowerCase();
  const registros = state.registros.filter((registro) =>
    Object.values(registro).join(" ").toLowerCase().includes(termo)
  );

  els.historicoBody.innerHTML = registros
    .map(
      (registro) => `
        <tr>
          <td>${escapeHtml(registro.dataFormatada)}</td>
          <td>${escapeHtml(registro.olt)}</td>
          <td>${escapeHtml(registro.pon)}</td>
          <td>${escapeHtml(registro.tecnico)}</td>
          <td>${escapeHtml(registro.suporte || "-")}</td>
          <td>${escapeHtml(registro.observacoes || "-")}</td>
          <td>${registro.evidencia ? `<a href="${escapeAttribute(registro.evidencia)}" target="_blank" rel="noreferrer">Abrir</a>` : "-"}</td>
        </tr>
      `
    )
    .join("");
}

function renderStats() {
  const olts = new Set(state.registros.map((item) => item.olt).filter(Boolean));
  const tecnicos = new Set(state.registros.map((item) => item.tecnico).filter(Boolean));
  els.totalRegistros.textContent = state.registros.length;
  els.totalOlts.textContent = olts.size;
  els.totalTecnicos.textContent = tecnicos.size;
  els.loginsGerados.textContent = state.loginsGerados;
  els.loginsCopiados.textContent = state.loginsCopiados;
  els.totalUsos.textContent = state.loginsGerados + state.registros.length;
}

async function copiarTexto(texto, mensagem, target = els.formStatus) {
  if (!texto) return;
  await navigator.clipboard.writeText(texto);
  setStatus(mensagem, "success", target);
}

function setStatus(message, type, target = els.formStatus) {
  target.textContent = message;
  target.className = `form-status ${type}`;
}

function formatDate(date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}
