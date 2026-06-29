import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getAI, getGenerativeModel, GoogleAIBackend } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-ai.js";
import { buildIndicadoresContextForQuestion } from "./indicadores-context.js?v=20260611-5";
import { buildJornadaContextForQuestion } from "./jornada-context.js?v=20260611-2";

const firebaseConfig = {
  apiKey: "AIzaSyDORS5NBC9kp2K7JpebALst4FaBYqTV6V0",
  authDomain: "sgp-sistema-suporte.firebaseapp.com",
  projectId: "sgp-sistema-suporte",
  storageBucket: "sgp-sistema-suporte.firebasestorage.app",
  messagingSenderId: "569194527116",
  appId: "1:569194527116:web:dd06e9ffc80b7c6634bea9",
  measurementId: "G-5XG43LT4RV"
};

const aiApp = initializeApp(firebaseConfig, "sgp-ai-assistant");
const ai = getAI(aiApp, { backend: new GoogleAIBackend() });
const model = getGenerativeModel(ai, { model: "gemini-2.5-flash" });

const currentFile = () => decodeURIComponent(window.location.pathname.split("/").pop() || "index.html");

const waitForProfile = () =>
  new Promise((resolve) => {
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      const profile = window.SGPAuth?.currentUser?.();
      if (profile || attempts > 80) {
        window.clearInterval(timer);
        resolve(profile || null);
      }
    }, 125);
  });

const visiblePageText = () => {
  const clone = document.body.cloneNode(true);
  clone.querySelectorAll("script, style, .sgp-assistant-panel, .sgp-assistant-button").forEach((item) => item.remove());
  return clone.textContent.replace(/\s+/g, " ").trim().slice(0, 5000);
};

const buildPrompt = (profile, message, extraContext = "") => `
Voce e o Assistente SGP da Uni Internet.
Responda sempre em portugues do Brasil, com clareza e foco operacional.
Ajude a interpretar dashboards de suporte, ocorrencias, jornadas, escala do dia, CTO/PPPoE e acompanhamento de equipe.
Nao invente numeros ou informacoes que nao estejam no contexto recebido.
Quando faltar dado, diga o que precisa ser conferido.
Seja objetivo e proponha proximas acoes praticas.

Usuario: ${profile.name || "Usuario"}
Cargo: ${profile.role || "viewer"}
Pagina: ${document.title}
Arquivo: ${currentFile()}

Texto visivel da tela:
${visiblePageText() || "Sem texto capturado."}

Contexto operacional adicional:
${extraContext || "Sem contexto adicional carregado."}

Pergunta:
${message}
`;

const addMessage = (messages, text, type = "assistant") => {
  const message = document.createElement("div");
  message.className = `sgp-assistant-message ${type}`;
  message.textContent = text;
  messages.appendChild(message);
  messages.scrollTop = messages.scrollHeight;
  return message;
};

const friendlyAiError = (error) => {
  const text = String(error?.message || error || "");

  if (text.includes("API key not valid") || text.includes("API_KEY")) {
    return "Firebase AI Logic ainda nao foi ativado nesse projeto.";
  }

  if (text.includes("quota") || text.includes("RESOURCE_EXHAUSTED")) {
    return "O limite gratuito do Gemini foi atingido por enquanto. Tente novamente mais tarde.";
  }

  if (text.includes("permission") || text.includes("PERMISSION_DENIED")) {
    return "Ative o Firebase AI Logic com Gemini Developer API no console do Firebase.";
  }

  if (text.includes("not found") || text.includes("NOT_FOUND")) {
    return "Esse modelo Gemini ainda nao esta disponivel no projeto. Atualize a pagina e tente novamente.";
  }

  return `Nao foi possivel responder agora. Detalhe: ${text.slice(0, 140)}`;
};

const buildAssistant = (profile) => {
  const button = document.createElement("button");
  button.className = "sgp-assistant-button";
  button.type = "button";
  button.innerHTML = '<span class="sgp-assistant-button-icon">AI</span><span>Assistente SGP</span>';

  const panel = document.createElement("section");
  panel.className = "sgp-assistant-panel";
  panel.hidden = true;
  panel.setAttribute("aria-label", "Assistente SGP");
  panel.innerHTML = `
    <header class="sgp-assistant-header">
      <div>
        <h2 class="sgp-assistant-title">Assistente SGP</h2>
        <p class="sgp-assistant-subtitle">Resumo rapido das dashboards e operacao.</p>
      </div>
      <button class="sgp-assistant-close" type="button" aria-label="Fechar assistente">x</button>
    </header>
    <div class="sgp-assistant-messages" aria-live="polite"></div>
    <div class="sgp-assistant-quick-actions" aria-label="Perguntas rápidas">
      <button type="button" data-assistant-question="Resumo operacional da última semana">Resumo da semana</button>
      <button type="button" data-assistant-question="Qual foi o TMA da última semana?">TMA</button>
      <button type="button" data-assistant-question="Quem está de plantão hoje?">Plantão hoje</button>
      <button type="button" data-assistant-question="Quem vai trabalhar hoje?">Escala hoje</button>
    </div>
    <form class="sgp-assistant-form">
      <textarea class="sgp-assistant-input" name="message" placeholder="Ex: O que devo olhar nessa tela?" required></textarea>
      <button class="sgp-assistant-submit" type="submit">Enviar</button>
    </form>
  `;

  const messages = panel.querySelector(".sgp-assistant-messages");
  const form = panel.querySelector(".sgp-assistant-form");
  const quickActions = panel.querySelector(".sgp-assistant-quick-actions");
  const input = panel.querySelector(".sgp-assistant-input");
  const submit = panel.querySelector(".sgp-assistant-submit");
  const closeButton = panel.querySelector(".sgp-assistant-close");

  addMessage(messages, `Ola, ${profile.name || "tudo bem"}! Posso buscar indicadores, escala, plantao e pontos de atencao conforme o seu cargo.`);

  button.addEventListener("click", () => {
    panel.hidden = !panel.hidden;
    if (!panel.hidden) input.focus();
  });

  closeButton.addEventListener("click", () => {
    panel.hidden = true;
  });

  const askAssistant = async (text) => {
    if (!text) return;

    addMessage(messages, text, "user");
    input.value = "";
    input.disabled = true;
    submit.disabled = true;
    const waiting = addMessage(messages, "Analisando...", "assistant");

    try {
      const jornadaContext = await buildJornadaContextForQuestion(text, profile);
      if (jornadaContext.directAnswer) {
        waiting.textContent = jornadaContext.directAnswer;
        return;
      }

      const indicadoresContext = await buildIndicadoresContextForQuestion(text, profile);
      if (indicadoresContext.directAnswer) {
        waiting.textContent = indicadoresContext.directAnswer;
        return;
      }

      const extraContext = [jornadaContext.context, indicadoresContext.context].filter(Boolean).join("\n\n");
      const result = await model.generateContent(buildPrompt(profile, text, extraContext));
      const answer = result.response.text();
      waiting.textContent = answer || "Nao encontrei uma resposta para isso.";
    } catch (error) {
      console.error(error);
      waiting.className = "sgp-assistant-message error";
      waiting.textContent = friendlyAiError(error);
    } finally {
      input.disabled = false;
      submit.disabled = false;
      input.focus();
    }
  };

  quickActions.addEventListener("click", (event) => {
    const action = event.target.closest("[data-assistant-question]");
    if (!action || input.disabled) return;
    askAssistant(action.dataset.assistantQuestion);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await askAssistant(input.value.trim());
  });

  document.body.append(panel, button);
};

const init = async () => {
  if (currentFile() === "login.html") return;

  const profile = await waitForProfile();
  if (!profile) return;

  buildAssistant(profile);
};

init();
