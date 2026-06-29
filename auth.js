import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDORS5NBC9kp2K7JpebALst4FaBYqTV6V0",
  authDomain: "sgp-sistema-suporte.firebaseapp.com",
  projectId: "sgp-sistema-suporte",
  storageBucket: "sgp-sistema-suporte.firebasestorage.app",
  messagingSenderId: "569194527116",
  appId: "1:569194527116:web:dd06e9ffc80b7c6634bea9",
  measurementId: "G-5XG43LT4RV"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const adminCreationApp = initializeApp(firebaseConfig, "admin-user-creation");
const adminCreationAuth = getAuth(adminCreationApp);

auth.languageCode = "pt-BR";
await setPersistence(auth, browserLocalPersistence);

const LOGIN_PAGE = "login.html";

const roleOptions = [
  { key: "viewer", label: "Viewer" },
  { key: "n1", label: "N1" },
  { key: "n2", label: "N2" },
  { key: "supervisor", label: "Supervisor" },
  { key: "gerente", label: "Gerente" },
  { key: "administrador", label: "Administrador" }
];

const protectedRoleKeys = new Set(roleOptions.map((role) => role.key));

const dashboardOptions = [
  { page: "sem-acesso.html", label: "Sem acesso", systemOnly: true },
  { page: "index.html", label: "Início" },
  { page: "apresentacao.html", label: "Indicadores Gerais" },
  { page: "colaboradores.html", label: "Colaboradores" },
  { page: "operacional.html", label: "Reincidência" },
  { page: "ocorrencias.html", label: "Ocorrências" },
  { page: "jornada.html", label: "Jornadas do Suporte" },
  { page: "cto.html", label: "Identificação de CTO/Gerador PPPoE" },
  { page: "lancamentos-indicadores.html", label: "Lançamentos" },
  { page: "lancamentos-ocorrencias.html", label: "Lançar Ocorrências" },
  { page: "usuarios.html", label: "Configurações", adminOnly: true }
];

let customRoleOptions = [];

const getRoleOptions = () => [...roleOptions, ...customRoleOptions];

const getRoleLabel = (role) => getRoleOptions().find((item) => item.key === role)?.label || role;

const getRoleDescription = (role) =>
  getRoleOptions().find((item) => item.key === role)?.description || roleDescriptions[role] || "";

const roleDescriptions = {
  viewer: "Conta criada, mas ainda sem dashboards liberadas.",
  n1: "Acesso operacional básico para indicadores e identificação.",
  n2: "Acesso de equipe com colaboradores, jornadas e indicadores.",
  supervisor: "Acompanha operação, ocorrências, jornadas e equipe.",
  gerente: "Visão ampla das dashboards operacionais e executivas.",
  administrador: "Acesso total, incluindo Configurações."
};

const dashboardDescriptions = {
  "apresentacao.html": "KPIs, TMA, metas e evolução semanal.",
  "colaboradores.html": "Ranking e desempenho N1/N2.",
  "operacional.html": "Clientes reincidentes e análise operacional.",
  "ocorrencias.html": "Ocorrências mensais, cidades e motivos críticos.",
  "jornada.html": "Escala, plantões, folgas e férias.",
  "cto.html": "Identificação de CTO e gerador PPPoE.",
  "lancamentos-indicadores.html": "Cadastro manual dos indicadores e colaboradores.",
  "lancamentos-ocorrencias.html": "Cadastro manual das ocorrências mensais.",
  "usuarios.html": "Usuários, cargos, pendências e planilhas."
};

const defaultOccurrenceOptions = {
  branches: [
    "Alta Floresta d'Oeste",
    "Alto Alegre dos Parecis",
    "Alto Paraíso",
    "Alvorada d'Oeste",
    "Ariquemes",
    "Buritis",
    "Cabixi",
    "Cacaulândia",
    "Cacoal",
    "Campo Novo de Rondônia",
    "Candeias do Jamari",
    "Castanheiras",
    "Cerejeiras",
    "Chupinguaia",
    "Colorado do Oeste",
    "Corumbiara",
    "Costa Marques",
    "Cujubim",
    "Espigão d'Oeste",
    "Governador Jorge Teixeira",
    "Guajará-Mirim",
    "Itapuã do Oeste",
    "Jaru",
    "Ji-Paraná",
    "Machadinho d'Oeste",
    "Ministro Andreazza",
    "Mirante da Serra",
    "Monte Negro",
    "Nova Brasilândia d'Oeste",
    "Nova Mamoré",
    "Nova União",
    "Novo Horizonte do Oeste",
    "Ouro Preto do Oeste",
    "Parecis",
    "Pimenta Bueno",
    "Pimenteiras do Oeste",
    "Porto Velho",
    "Presidente Médici",
    "Primavera de Rondônia",
    "Rio Crespo",
    "Rolim de Moura",
    "Santa Luzia d'Oeste",
    "São Felipe d'Oeste",
    "São Francisco do Guaporé",
    "São Miguel do Guaporé",
    "Seringueiras",
    "Teixeirópolis",
    "Theobroma",
    "Urupá",
    "Vale do Anari",
    "Vale do Paraíso",
    "Vilhena"
  ],
  cities: [
    "Alta Floresta d'Oeste",
    "Alto Alegre dos Parecis",
    "Alto Paraíso",
    "Alvorada d'Oeste",
    "Ariquemes",
    "Buritis",
    "Cabixi",
    "Cacaulândia",
    "Cacoal",
    "Campo Novo de Rondônia",
    "Candeias do Jamari",
    "Castanheiras",
    "Cerejeiras",
    "Chupinguaia",
    "Colorado do Oeste",
    "Corumbiara",
    "Costa Marques",
    "Cujubim",
    "Espigão d'Oeste",
    "Governador Jorge Teixeira",
    "Guajará-Mirim",
    "Itapuã do Oeste",
    "Jaru",
    "Ji-Paraná",
    "Machadinho d'Oeste",
    "Ministro Andreazza",
    "Mirante da Serra",
    "Monte Negro",
    "Nova Brasilândia d'Oeste",
    "Nova Mamoré",
    "Nova União",
    "Novo Horizonte do Oeste",
    "Ouro Preto do Oeste",
    "Parecis",
    "Pimenta Bueno",
    "Pimenteiras do Oeste",
    "Porto Velho",
    "Presidente Médici",
    "Primavera de Rondônia",
    "Rio Crespo",
    "Rolim de Moura",
    "Santa Luzia d'Oeste",
    "São Felipe d'Oeste",
    "São Francisco do Guaporé",
    "São Miguel do Guaporé",
    "Seringueiras",
    "Teixeirópolis",
    "Theobroma",
    "Urupá",
    "Vale do Anari",
    "Vale do Paraíso",
    "Vilhena"
  ],
  reasons: [
    "CTO OFF",
    "Pop's Offline",
    "Manutenção",
    "Instabilidade",
    "OPA Off",
    "IXC Off",
    "Migração"
  ]
};

const legacyRoleMap = {
  gerencia: "gerente",
  suporte: "n1"
};

const defaultRoleAccess = {
  viewer: ["sem-acesso.html"],
  n1: ["index.html", "apresentacao.html", "cto.html"],
  n2: ["index.html", "apresentacao.html", "colaboradores.html", "jornada.html", "cto.html"],
  supervisor: ["index.html", "apresentacao.html", "colaboradores.html", "operacional.html", "ocorrencias.html", "jornada.html", "cto.html"],
  gerente: ["index.html", "apresentacao.html", "colaboradores.html", "operacional.html", "ocorrencias.html", "jornada.html", "cto.html"],
  administrador: ["index.html", "apresentacao.html", "colaboradores.html", "operacional.html", "ocorrencias.html", "jornada.html", "cto.html", "lancamentos-indicadores.html", "lancamentos-ocorrencias.html", "usuarios.html"]
};

const defaultIndicatorGoals = {
  tmaMax: "00:05:00",
  tmrMax: "00:02:00",
  slaMin: 90,
  satisfactionMin: 85,
  qualityScoreMin: 4.5,
  fieldOpenMax: 450,
  solvedTicketsMin: 1400,
  solvedMin: 75,
  totalTicketsMax: 2200
};

const roleHome = {
  viewer: "sem-acesso.html",
  n1: "apresentacao.html",
  n2: "apresentacao.html",
  supervisor: "index.html",
  gerente: "index.html",
  administrador: "index.html"
};

let activeRoleAccess = structuredClone(defaultRoleAccess);
let activeIndicatorGoals = { ...defaultIndicatorGoals };
let activeOccurrenceOptions = structuredClone(defaultOccurrenceOptions);
let selectedPermissionRole = "n1";

const dashboardPages = new Set(dashboardOptions.map((dashboard) => dashboard.page));
const publicPages = new Set([LOGIN_PAGE]);
const ONLINE_WINDOW_MS = 2 * 60 * 1000;
const PRESENCE_INTERVAL_MS = 45 * 1000;

let activeProfile = null;
let usersUnsubscribe = null;
let presenceInterval = null;
let presenceListenersBound = false;

const ready = () => {
  if (document.readyState !== "loading") return Promise.resolve();
  return new Promise((resolve) => document.addEventListener("DOMContentLoaded", resolve, { once: true }));
};

const currentPage = () => {
  const page = decodeURIComponent(window.location.pathname.split("/").pop() || "");
  return page || "index.html";
};

const cleanEmail = (email) =>
  String(email || "")
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, "")
    .trim()
    .toLowerCase();

const emailFromForm = (form) => {
  const input = form.querySelector('input[name="email"]');
  const email = cleanEmail(input?.value);
  if (input) input.value = email;
  return email;
};

const valueFromForm = (form, name) => String(form.querySelector(`[name="${name}"]`)?.value || "");

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

const statusText = (selector, message, type = "error") => {
  const element = document.querySelector(selector);
  if (!element) return;
  element.textContent = message;
  element.dataset.type = type;
};

const setBusy = (form, busy) => {
  form.querySelectorAll("input, select, textarea, button").forEach((item) => {
    item.disabled = busy;
  });
};

const roleExists = (role) => getRoleOptions().some((item) => item.key === role);

const slugRoleKey = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

const sanitizeCustomRoles = (roles = []) => {
  if (!Array.isArray(roles)) return [];
  const seen = new Set();
  return roles
    .map((role) => {
      const label = String(role?.label || "").trim();
      const key = slugRoleKey(role?.key || label);
      const description = String(role?.description || "").trim();
      if (!label || !key || protectedRoleKeys.has(key) || seen.has(key)) return null;
      seen.add(key);
      return { key, label, description, custom: true };
    })
    .filter(Boolean);
};

const normalizeRoleKey = (role) => {
  const normalized = legacyRoleMap[role] || role || "viewer";
  return roleExists(normalized) ? normalized : "viewer";
};

const mergeRoleAccess = (savedRoles = {}) => {
  const merged = structuredClone(defaultRoleAccess);
  getRoleOptions().forEach(({ key }) => {
    if (key === "viewer") {
      merged.viewer = ["sem-acesso.html"];
      return;
    }

    const savedPages = Array.isArray(savedRoles[key]) ? savedRoles[key].filter((page) => dashboardPages.has(page)) : [];
    if (savedPages.length) {
      merged[key] = Array.from(new Set(["index.html", ...savedPages]));
    } else if (!protectedRoleKeys.has(key)) {
      merged[key] = ["index.html"];
    }
  });
  merged.administrador = dashboardOptions
    .filter((dashboard) => !dashboard.systemOnly)
    .map((dashboard) => dashboard.page);
  return merged;
};

const normalizeListItems = (items = []) => {
  const seen = new Set();
  return (Array.isArray(items) ? items : [])
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .filter((item) => {
      const key = item
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
};

const mergeOccurrenceOptions = (savedOptions = {}) => ({
  branches: normalizeListItems(savedOptions.branches?.length ? savedOptions.branches : defaultOccurrenceOptions.branches),
  cities: normalizeListItems(savedOptions.cities?.length ? savedOptions.cities : defaultOccurrenceOptions.cities),
  reasons: normalizeListItems(savedOptions.reasons?.length ? savedOptions.reasons : defaultOccurrenceOptions.reasons)
});

const loadRoleAccess = async () => {
  try {
    const snapshot = await getDoc(doc(db, "settings", "roleAccess"));
    const data = snapshot.exists() ? snapshot.data() : {};
    customRoleOptions = sanitizeCustomRoles(data.customRoles);
    activeRoleAccess = snapshot.exists() ? mergeRoleAccess(data.roles) : structuredClone(defaultRoleAccess);
    activeIndicatorGoals = data.indicatorGoals ? { ...defaultIndicatorGoals, ...data.indicatorGoals } : { ...defaultIndicatorGoals };
    activeOccurrenceOptions = mergeOccurrenceOptions(data.occurrenceOptions);
  } catch (error) {
    console.error(error);
    customRoleOptions = [];
    activeRoleAccess = structuredClone(defaultRoleAccess);
    activeIndicatorGoals = { ...defaultIndicatorGoals };
    activeOccurrenceOptions = structuredClone(defaultOccurrenceOptions);
  }
};

const canAccess = (role, page) => activeRoleAccess[normalizeRoleKey(role)]?.includes(page) || false;

const homeForRole = (role) => {
  const normalizedRole = normalizeRoleKey(role);
  if (roleHome[normalizedRole]) return roleHome[normalizedRole];
  const pages = activeRoleAccess[normalizedRole] || [];
  return pages.find((page) => page !== "index.html" && dashboardPages.has(page)) || "index.html";
};

const sanitizeReturnPage = (page, role) => {
  const normalizedRole = normalizeRoleKey(role);
  const fallback = homeForRole(normalizedRole);
  const normalized = String(page || "").split(/[?#]/)[0] || fallback;
  return dashboardPages.has(normalized) && canAccess(normalizedRole, normalized) ? normalized : fallback;
};

const redirectToLogin = () => {
  const loginUrl = new URL(LOGIN_PAGE, window.location.href);
  loginUrl.searchParams.set("return", currentPage());
  window.location.replace(loginUrl.href);
};

const redirectToHome = (role) => {
  window.location.replace(homeForRole(role));
};

const verificationSettings = () => ({
  url: new URL(LOGIN_PAGE, window.location.href).href,
  handleCodeInApp: false
});

const userRef = (uid) => doc(db, "users", uid);
const emailIndexKey = (email) => encodeURIComponent(cleanEmail(email));
const emailIndexRef = (email) => doc(db, "emailIndex", emailIndexKey(email));
const manualIndicatorsRef = () => doc(db, "manualIndicators", "support");
const manualOccurrencesRef = () => doc(db, "manualOccurrences", "monthly");

const isEmailIndexed = async (email) => {
  try {
    const snapshot = await getDoc(emailIndexRef(email));
    return snapshot.exists();
  } catch (error) {
    console.error(error);
    return false;
  }
};

const ensureEmailIndex = async (uid, email) => {
  const normalizedEmail = cleanEmail(email);
  if (!uid || !isValidEmail(normalizedEmail)) return;

  await setDoc(emailIndexRef(normalizedEmail), {
    uid,
    email: normalizedEmail,
    updatedAt: serverTimestamp()
  }, { merge: true });
};

const updatePresence = async (online = true) => {
  const user = auth.currentUser;
  if (!user) return;

  try {
    await updateDoc(userRef(user.uid), {
      online,
      lastSeen: serverTimestamp()
    });
  } catch (error) {
    console.error(error);
  }
};

const bindPresenceListeners = () => {
  if (presenceListenersBound) return;
  presenceListenersBound = true;

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && activeProfile) {
      updatePresence(true);
    }
  });

  window.addEventListener("pagehide", () => {
    if (activeProfile) updatePresence(false);
  });
};

const startPresence = () => {
  bindPresenceListeners();
  window.clearInterval(presenceInterval);
  updatePresence(true);
  presenceInterval = window.setInterval(() => updatePresence(true), PRESENCE_INTERVAL_MS);
};

const stopPresence = () => {
  window.clearInterval(presenceInterval);
  presenceInterval = null;
};

const parseJsonField = (value) => {
  if (!value || typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch (error) {
    console.error(error);
    return null;
  }
};

const decodeManualIndicators = (data) => {
  if (!data) return null;
  return {
    ...data,
    manualData: parseJsonField(data.manualDataJson) || data.manualData,
    generalWorkbook: parseJsonField(data.generalWorkbookJson) || data.generalWorkbook,
    collaboratorWorkbook: parseJsonField(data.collaboratorWorkbookJson) || data.collaboratorWorkbook
  };
};

const encodeManualIndicators = (payload) => ({
  sourceName: payload.sourceName || "Lançamentos manuais SGP",
  manualDataJson: JSON.stringify(payload.manualData || null),
  generalWorkbookJson: JSON.stringify(payload.generalWorkbook || null),
  collaboratorWorkbookJson: JSON.stringify(payload.collaboratorWorkbook || null)
});

const decodeManualOccurrences = (data) => {
  if (!data) return null;
  return {
    ...data,
    workbook: parseJsonField(data.workbookJson) || data.workbook,
    monthOrder: parseJsonField(data.monthOrderJson) || data.monthOrder
  };
};

const encodeManualOccurrences = (payload) => ({
  sourceName: payload.sourceName || "Lançamentos manuais de ocorrências SGP",
  workbookJson: JSON.stringify(payload.workbook || {}),
  monthOrderJson: JSON.stringify(payload.monthOrder || [])
});

const ensureUserProfile = async (user) => {
  const ref = userRef(user.uid);
  const snapshot = await getDoc(ref);
  const baseProfile = {
    uid: user.uid,
    email: cleanEmail(user.email),
    name: user.displayName || cleanEmail(user.email).split("@")[0],
    emailVerified: user.emailVerified
  };

  if (!snapshot.exists()) {
    const createdProfile = {
      ...baseProfile,
      approved: false,
      role: "viewer",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    await setDoc(ref, createdProfile);
    await ensureEmailIndex(user.uid, baseProfile.email);
    return createdProfile;
  }

  const data = snapshot.data();
  const role = normalizeRoleKey(data.role);
  const profile = {
    ...baseProfile,
    ...data,
    role
  };

  if (data.emailVerified !== user.emailVerified || data.name !== baseProfile.name) {
    await updateDoc(ref, {
      emailVerified: user.emailVerified,
      name: baseProfile.name,
      updatedAt: serverTimestamp()
    });
  }

  await ensureEmailIndex(user.uid, baseProfile.email);
  return profile;
};

const injectStyles = () => {
  if (document.querySelector("#sgpAuthStyles")) return;

  const style = document.createElement("style");
  style.id = "sgpAuthStyles";
  style.textContent = `
    .sgp-userbar {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      flex-wrap: wrap;
      color: #102033;
      font-size: 0.86rem;
    }

    .sgp-userbar strong {
      font-size: 0.92rem;
    }

    .sgp-role-pill {
      border: 1px solid rgba(0, 156, 103, 0.26);
      border-radius: 999px;
      padding: 5px 9px;
      background: rgba(0, 156, 103, 0.1);
      color: #00764e;
      font-weight: 800;
    }

    .sgp-logout {
      min-height: 34px;
      border: 1px solid rgba(16, 32, 51, 0.18);
      border-radius: 8px;
      padding: 0 10px;
      background: #ffffff;
      color: #102033;
      font: inherit;
      font-weight: 800;
      cursor: pointer;
    }
  `;
  document.head.appendChild(style);
};

const syncNavigationAccess = (profile) => {
  document.querySelectorAll('a[href$=".html"]').forEach((link) => {
    const page = link.getAttribute("href").split(/[?#]/)[0];
    if (!dashboardPages.has(page)) return;

    const visible = canAccess(profile.role, page);

    const card = link.closest(".card");
    if (card) {
      card.hidden = !visible;
      card.style.display = visible ? "" : "none";
      card.setAttribute("aria-hidden", String(!visible));
      return;
    }

    link.hidden = !visible;
    link.style.display = visible ? "" : "none";
    link.setAttribute("aria-hidden", String(!visible));
  });
};

const renderUserBar = (profile) => {
  if (currentPage() === LOGIN_PAGE || document.querySelector("#sgpUserBar")) return;

  injectStyles();
  syncNavigationAccess(profile);

  const userBar = document.createElement("div");
  userBar.id = "sgpUserBar";
  userBar.className = "sgp-userbar";
  userBar.innerHTML = `
    <span>Logado como <strong>${profile.name}</strong></span>
    <span class="sgp-role-pill">${getRoleLabel(profile.role)}</span>
    <button class="sgp-logout" type="button">Sair</button>
  `;
  userBar.querySelector("button").addEventListener("click", () => window.SGPAuth.logout());

  const header = document.querySelector("header");
  if (header) {
    header.appendChild(userBar);
  } else {
    document.body.prepend(userBar);
  }
};

const authErrorMessage = (error, context = "default", options = {}) => {
  const code = error?.code || "";

  if (context === "login") {
    if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
      return options.emailIndexed ? "Senha incorreta." : "Conta nao cadastrada.";
    }

    const loginMessages = {
      "auth/user-not-found": "Conta nao cadastrada.",
      "auth/invalid-email": "Informe um email valido.",
      "auth/too-many-requests": "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.",
      "permission-denied": "Conta nao cadastrada na dashboard."
    };
    return loginMessages[code] || "Nao foi possivel entrar. Confira email e senha.";
  }

  if (context === "reset") {
    const resetMessages = {
      "auth/invalid-email": "Informe um email valido.",
      "auth/user-not-found": "Conta nao cadastrada.",
      "auth/too-many-requests": "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente."
    };
    return resetMessages[code] || "Nao foi possivel enviar a redefinicao de senha.";
  }

  if (context === "register") {
    const registerMessages = {
      "auth/email-already-in-use": "Este email ja possui cadastro.",
      "auth/invalid-email": "Informe um email valido.",
      "auth/too-many-requests": "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.",
      "auth/weak-password": "Use uma senha com pelo menos 6 caracteres.",
      "permission-denied": "Conta criada, mas o perfil nao foi salvo. Publique as regras do Firestore."
    };
    return registerMessages[code] || "Nao foi possivel criar a conta.";
  }

  const messages = {
    "auth/email-already-in-use": "Este email ja possui cadastro.",
    "auth/invalid-email": "Informe um email valido.",
    "auth/invalid-credential": "Senha incorreta.",
    "auth/operation-not-allowed": "Login por email e senha nao esta ativo.",
    "auth/too-many-requests": "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.",
    "auth/unauthorized-continue-uri": "Dominio nao autorizado no Firebase.",
    "auth/user-not-found": "Conta nao cadastrada.",
    "auth/weak-password": "Use uma senha com pelo menos 6 caracteres.",
    "permission-denied": "Sem permissao para concluir esta acao."
  };

  return messages[code] || "Nao foi possivel concluir.";
};

const bindLoginPage = () => {
  const loginForm = document.querySelector("#loginForm");
  const registerForm = document.querySelector("#registerForm");
  const forgotPasswordButton = document.querySelector("#forgotPasswordButton");
  const resetPasswordForm = document.querySelector("#resetPasswordForm");
  const hideResetPasswordButton = document.querySelector("#hideResetPasswordButton");

  document.querySelectorAll('input[type="email"]').forEach((input) => {
    input.addEventListener("blur", () => {
      input.value = cleanEmail(input.value);
    });
  });

  loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setBusy(loginForm, true);
    statusText("#loginStatus", "Entrando...", "info");

    try {
      const email = emailFromForm(loginForm);
      const password = valueFromForm(loginForm, "password");

      if (!isValidEmail(email)) {
        statusText("#loginStatus", `Email lido como "${email}". Confira se esta completo.`);
        return;
      }

      const credential = await signInWithEmailAndPassword(auth, email, password);
      await reload(credential.user);
      const profile = await ensureUserProfile(credential.user);

      if (!credential.user.emailVerified && !profile.approved) {
        await signOut(auth);
        statusText(
          "#loginStatus",
          "Precisa confirmar o email antes de entrar.",
          "error"
        );
        return;
      }

      const returnPage = new URLSearchParams(window.location.search).get("return");
      await loadRoleAccess();
      window.location.replace(sanitizeReturnPage(returnPage, profile.role));
    } catch (error) {
      const email = emailFromForm(loginForm);
      const emailIndexed = await isEmailIndexed(email);
      statusText("#loginStatus", authErrorMessage(error, "login", { emailIndexed }));
    } finally {
      setBusy(loginForm, false);
    }
  });

  forgotPasswordButton?.addEventListener("click", () => {
    if (!resetPasswordForm) return;
    resetPasswordForm.hidden = false;
    statusText("#loginStatus", "");

    const loginEmail = cleanEmail(loginForm?.querySelector('input[name="email"]')?.value);
    const resetEmailInput = resetPasswordForm.querySelector('input[name="email"]');
    if (resetEmailInput && loginEmail) resetEmailInput.value = loginEmail;
    resetEmailInput?.focus();
  });

  hideResetPasswordButton?.addEventListener("click", () => {
    if (!resetPasswordForm) return;
    resetPasswordForm.hidden = true;
    resetPasswordForm.reset();
    statusText("#resetPasswordStatus", "");
  });

  resetPasswordForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setBusy(resetPasswordForm, true);
    statusText("#resetPasswordStatus", "Enviando recuperacao de senha...", "info");

    try {
      const email = emailFromForm(resetPasswordForm);

      if (!isValidEmail(email)) {
        statusText("#resetPasswordStatus", `Email lido como "${email}". Confira se esta completo.`);
        return;
      }

      await sendPasswordResetEmail(auth, email, verificationSettings());
      statusText("#resetPasswordStatus", "Enviamos um link para redefinir sua senha. Confira seu email.", "success");
    } catch (error) {
      statusText("#resetPasswordStatus", authErrorMessage(error, "reset"));
    } finally {
      setBusy(resetPasswordForm, false);
    }
  });

  registerForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setBusy(registerForm, true);
    statusText("#registerStatus", "Criando cadastro...", "info");

    try {
      const name = valueFromForm(registerForm, "name").trim();
      const email = emailFromForm(registerForm);
      const password = valueFromForm(registerForm, "password");
      const confirmPassword = valueFromForm(registerForm, "confirmPassword");

      if (!isValidEmail(email)) {
        statusText("#registerStatus", `Email lido como "${email}". Confira se esta completo.`);
        return;
      }

      if (password !== confirmPassword) {
        statusText("#registerStatus", "As senhas nao conferem.");
        return;
      }

      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(credential.user, { displayName: name });
      await sendEmailVerification(credential.user, verificationSettings());

      try {
        await setDoc(userRef(credential.user.uid), {
          uid: credential.user.uid,
          name,
          email,
          approved: false,
          role: "viewer",
          emailVerified: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true });
        await ensureEmailIndex(credential.user.uid, email);

        const savedProfile = await getDoc(userRef(credential.user.uid));
        if (!savedProfile.exists()) {
          throw new Error("Perfil criado no Authentication, mas nao foi salvo no Firestore.");
        }
      } catch (profileError) {
        console.error(profileError);
        if (profileError.code === "permission-denied") {
          statusText(
            "#registerStatus",
            "Conta criada, mas o perfil nao foi salvo. Publique as regras do Firestore.",
            "error"
          );
          await signOut(auth);
          registerForm.reset();
          return;
        }

        throw profileError;
      }

      await signOut(auth);
      registerForm.reset();
      statusText(
        "#registerStatus",
        "Cadastro criado como Viewer. Confira seu email e aguarde o administrador definir seu cargo.",
        "success"
      );
    } catch (error) {
      statusText("#registerStatus", authErrorMessage(error, "register"));
    } finally {
      setBusy(registerForm, false);
    }
  });
};

const formatDate = (value) => {
  if (!value?.toDate) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(value.toDate());
};

const dateFromTimestamp = (value) => value?.toDate?.() || null;

const isUserOnline = (user) => {
  const lastSeen = dateFromTimestamp(user.lastSeen);
  return user.online === true && lastSeen && Date.now() - lastSeen.getTime() <= ONLINE_WINDOW_MS;
};

const formatPresence = (user) => {
  const lastSeen = dateFromTimestamp(user.lastSeen);
  if (isUserOnline(user)) return "Online agora";
  if (!lastSeen) return "Sem atividade";

  const diffMinutes = Math.max(1, Math.round((Date.now() - lastSeen.getTime()) / 60000));
  if (diffMinutes < 60) return `Visto ha ${diffMinutes} min`;

  return `Visto em ${formatDate(user.lastSeen)}`;
};

const saveRoleAccess = async (profile) => {
  activeRoleAccess.administrador = dashboardOptions
    .filter((dashboard) => !dashboard.systemOnly)
    .map((dashboard) => dashboard.page);
  getRoleOptions().forEach(({ key }) => {
    if (key === "viewer") {
      activeRoleAccess.viewer = ["sem-acesso.html"];
      return;
    }

    activeRoleAccess[key] = Array.from(new Set(["index.html", ...(activeRoleAccess[key] || [])]));
  });

  await setDoc(doc(db, "settings", "roleAccess"), {
    roles: activeRoleAccess,
    customRoles: customRoleOptions.map(({ key, label, description }) => ({ key, label, description })),
    indicatorGoals: activeIndicatorGoals,
    occurrenceOptions: activeOccurrenceOptions,
    updatedAt: serverTimestamp(),
    updatedBy: profile.uid
  });
};

const loadIndicatorGoals = async () => {
  try {
    const snapshot = await getDoc(doc(db, "settings", "roleAccess"));
    const savedGoals = snapshot.exists() ? snapshot.data().indicatorGoals : null;
    activeIndicatorGoals = savedGoals ? { ...defaultIndicatorGoals, ...savedGoals } : { ...defaultIndicatorGoals };
    return activeIndicatorGoals;
  } catch (error) {
    console.error(error);
    activeIndicatorGoals = { ...defaultIndicatorGoals };
    return activeIndicatorGoals;
  }
};

const parseGoalNumber = (value, fallback) => {
  const normalized = String(value || "")
    .replace(",", ".")
    .trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const listToTextarea = (items = []) => normalizeListItems(items).join("\n");

const textareaToList = (value) => normalizeListItems(String(value || "").split(/\r?\n/));

const renderIndicatorGoalsPanel = async (profile) => {
  const form = document.querySelector("#indicatorGoalsForm");
  const status = document.querySelector("#usersStatus");
  if (!form || form.dataset.bound) return;

  const goals = await loadIndicatorGoals();
  Object.entries(defaultIndicatorGoals).forEach(([key, fallback]) => {
    const input = form.querySelector(`[name="${key}"]`);
    if (input) input.value = goals[key] ?? fallback;
  });

  form.dataset.bound = "true";
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setBusy(form, true);
    status.textContent = "Salvando metas...";

    const nextGoals = {
      tmaMax: valueFromForm(form, "tmaMax").trim() || defaultIndicatorGoals.tmaMax,
      tmrMax: valueFromForm(form, "tmrMax").trim() || defaultIndicatorGoals.tmrMax,
      slaMin: parseGoalNumber(valueFromForm(form, "slaMin"), defaultIndicatorGoals.slaMin),
      satisfactionMin: parseGoalNumber(valueFromForm(form, "satisfactionMin"), defaultIndicatorGoals.satisfactionMin),
      qualityScoreMin: parseGoalNumber(valueFromForm(form, "qualityScoreMin"), defaultIndicatorGoals.qualityScoreMin),
      fieldOpenMax: parseGoalNumber(valueFromForm(form, "fieldOpenMax"), defaultIndicatorGoals.fieldOpenMax),
      solvedTicketsMin: parseGoalNumber(valueFromForm(form, "solvedTicketsMin"), defaultIndicatorGoals.solvedTicketsMin),
      solvedMin: parseGoalNumber(valueFromForm(form, "solvedMin"), defaultIndicatorGoals.solvedMin),
      totalTicketsMax: parseGoalNumber(valueFromForm(form, "totalTicketsMax"), defaultIndicatorGoals.totalTicketsMax)
    };

    try {
      await setDoc(doc(db, "settings", "roleAccess"), {
        indicatorGoals: nextGoals,
        goalsUpdatedAt: serverTimestamp(),
        goalsUpdatedBy: profile.uid
      }, { merge: true });
      activeIndicatorGoals = { ...defaultIndicatorGoals, ...nextGoals };
      status.textContent = "Metas atualizadas.";
    } catch (error) {
      status.textContent = error.code === "permission-denied"
        ? "Sem permissão para salvar metas. Publique as regras do Firestore ou confirme se seu cargo está como Administrador."
        : authErrorMessage(error);
    } finally {
      setBusy(form, false);
    }
  });
};

const renderOccurrenceOptionsPanel = (profile) => {
  const form = document.querySelector("#occurrenceOptionsForm");
  const status = document.querySelector("#usersStatus");
  if (!form || form.dataset.bound) return;

  form.querySelector('[name="branches"]').value = listToTextarea(activeOccurrenceOptions.branches);
  form.querySelector('[name="cities"]').value = listToTextarea(activeOccurrenceOptions.cities);
  form.querySelector('[name="reasons"]').value = listToTextarea(activeOccurrenceOptions.reasons);

  form.dataset.bound = "true";
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setBusy(form, true);
    status.textContent = "Salvando listas de ocorrências...";

    const nextOptions = {
      branches: textareaToList(valueFromForm(form, "branches")),
      cities: textareaToList(valueFromForm(form, "cities")),
      reasons: textareaToList(valueFromForm(form, "reasons"))
    };

    try {
      activeOccurrenceOptions = mergeOccurrenceOptions(nextOptions);
      await setDoc(doc(db, "settings", "roleAccess"), {
        occurrenceOptions: activeOccurrenceOptions,
        occurrenceOptionsUpdatedAt: serverTimestamp(),
        occurrenceOptionsUpdatedBy: profile.uid
      }, { merge: true });
      form.querySelector('[name="branches"]').value = listToTextarea(activeOccurrenceOptions.branches);
      form.querySelector('[name="cities"]').value = listToTextarea(activeOccurrenceOptions.cities);
      form.querySelector('[name="reasons"]').value = listToTextarea(activeOccurrenceOptions.reasons);
      status.textContent = "Listas de ocorrências atualizadas.";
    } catch (error) {
      status.textContent = error.code === "permission-denied"
        ? "Sem permissão para salvar listas. Confirme se seu cargo está como Administrador."
        : authErrorMessage(error);
    } finally {
      setBusy(form, false);
    }
  });
};

const renderPermissionsPanel = (profile) => {
  const board = document.querySelector("#permissionsBoard");
  const head = document.querySelector("#permissionsHead");
  const body = document.querySelector("#permissionsBody");
  const status = document.querySelector("#usersStatus");

  const visibleDashboards = dashboardOptions.filter((dashboard) => dashboard.page !== "index.html" && !dashboard.systemOnly);
  const dashboardCount = visibleDashboards.length;

  if (board) {
    const allRoles = getRoleOptions();
    const selectedRole = allRoles.find((role) => role.key === selectedPermissionRole) || allRoles[1] || allRoles[0];
    selectedPermissionRole = selectedRole.key;

    const roleTabs = allRoles.map((role) => {
      const enabledCount = role.key === "viewer" ? 0 : visibleDashboards
        .filter((dashboard) => activeRoleAccess[role.key]?.includes(dashboard.page))
        .length;

      return `
        <button
          class="permission-role-tab ${role.key === selectedRole.key ? "is-selected" : ""}"
          type="button"
          data-select-permission-role="${role.key}"
          aria-pressed="${role.key === selectedRole.key ? "true" : "false"}"
        >
          <span>
            <strong>${role.label}</strong>
            <small>${getRoleDescription(role.key)}</small>
          </span>
          <span class="permission-count">${enabledCount}/${dashboardCount}</span>
        </button>
      `;
    }).join("");

    const isViewer = selectedRole.key === "viewer";
    const enabledCount = isViewer ? 0 : visibleDashboards
      .filter((dashboard) => activeRoleAccess[selectedRole.key]?.includes(dashboard.page))
      .length;

    const dashboardsMarkup = isViewer
      ? `<div class="permission-locked-note">Viewer não visualiza dashboards. Use este cargo para novas contas aguardando liberação.</div>`
      : visibleDashboards.map((dashboard) => {
        const checked = activeRoleAccess[selectedRole.key]?.includes(dashboard.page) || false;
        const locked = dashboard.adminOnly && selectedRole.key !== "administrador";
        const adminRequired = dashboard.adminOnly && selectedRole.key === "administrador";
        const disabled = locked || adminRequired;
        const note = locked ? "Somente Administrador" : adminRequired ? "Obrigatório" : dashboardDescriptions[dashboard.page] || "";

        return `
          <label class="permission-toggle ${checked ? "is-active" : ""} ${disabled ? "is-locked" : ""}">
            <span>
              <strong>${dashboard.label}</strong>
              <span>${note}</span>
            </span>
            <input
              type="checkbox"
              data-role-permission="${selectedRole.key}"
              data-dashboard-page="${dashboard.page}"
              ${checked ? "checked" : ""}
              ${disabled ? "disabled" : ""}
            />
          </label>
        `;
      }).join("");

    board.innerHTML = `
      <nav class="permission-role-list" aria-label="Selecionar cargo">
        ${roleTabs}
      </nav>
      <article class="permission-role-card permission-detail-card">
        <div class="permission-card-head">
          <div>
            <h3>${selectedRole.label}</h3>
            <p>${getRoleDescription(selectedRole.key)}</p>
          </div>
          <div class="permission-head-actions">
            <span class="permission-count">${enabledCount}/${dashboardCount}</span>
            ${selectedRole.custom ? `<button class="secondary danger-outline" type="button" data-delete-custom-role="${selectedRole.key}">Excluir cargo</button>` : ""}
          </div>
        </div>
        <div class="permission-dashboard-list">
          ${dashboardsMarkup}
        </div>
      </article>
    `;

    board.querySelectorAll("[data-select-permission-role]").forEach((button) => {
      button.addEventListener("click", () => {
        selectedPermissionRole = button.dataset.selectPermissionRole;
        renderPermissionsPanel(profile);
      });
    });

    board.querySelectorAll("[data-role-permission]").forEach((checkbox) => {
      checkbox.addEventListener("change", async () => {
        const role = checkbox.dataset.rolePermission;
        const page = checkbox.dataset.dashboardPage;
        const pages = new Set(activeRoleAccess[role] || ["index.html"]);

        if (checkbox.checked) {
          pages.add(page);
        } else {
          pages.delete(page);
        }

        pages.add("index.html");
        activeRoleAccess[role] = Array.from(pages);
        checkbox.closest(".permission-toggle")?.classList.toggle("is-active", checkbox.checked);
        status.textContent = "Salvando permissões...";

        try {
          await saveRoleAccess(profile);
          status.textContent = "Permissões atualizadas.";
          renderPermissionsPanel(profile);
        } catch (error) {
          checkbox.checked = !checkbox.checked;
          checkbox.closest(".permission-toggle")?.classList.toggle("is-active", checkbox.checked);
          status.textContent = authErrorMessage(error);
        }
      });
    });

    board.querySelector("[data-delete-custom-role]")?.addEventListener("click", async (event) => {
      const role = event.currentTarget.dataset.deleteCustomRole;
      const label = getRoleLabel(role);
      const confirmed = window.confirm(`Excluir o cargo ${label}? Usuarios com este cargo voltarao para Viewer no proximo acesso.`);
      if (!confirmed) return;

      status.textContent = "Excluindo cargo...";
      customRoleOptions = customRoleOptions.filter((item) => item.key !== role);
      delete activeRoleAccess[role];
      selectedPermissionRole = "n1";

      try {
        await saveRoleAccess(profile);
        status.textContent = "Cargo excluido.";
        renderRoleSelectOptions();
        renderPermissionsPanel(profile);
      } catch (error) {
        status.textContent = authErrorMessage(error);
      }
    });

    return;
  }

  if (!head || !body) return;

  const permissionRoles = getRoleOptions().filter((role) => role.key !== "viewer");
  head.innerHTML = `
    <tr>
      <th>Cargo</th>
      ${visibleDashboards.map((dashboard) => `<th>${dashboard.label}</th>`).join("")}
    </tr>
  `;

  body.innerHTML = permissionRoles.map((role) => `
    <tr>
      <td><strong>${role.label}</strong></td>
      ${visibleDashboards.map((dashboard) => {
        const checked = activeRoleAccess[role.key]?.includes(dashboard.page) || false;
        const locked = dashboard.adminOnly && role.key !== "administrador";
        const adminRequired = dashboard.adminOnly && role.key === "administrador";
        return `
          <td>
            <label class="permission-check">
              <input
                type="checkbox"
                data-role-permission="${role.key}"
                data-dashboard-page="${dashboard.page}"
                ${checked ? "checked" : ""}
                ${locked || adminRequired ? "disabled" : ""}
              />
            </label>
          </td>
        `;
      }).join("")}
    </tr>
  `).join("");

  body.querySelectorAll("[data-role-permission]").forEach((checkbox) => {
    checkbox.addEventListener("change", async () => {
      const role = checkbox.dataset.rolePermission;
      const page = checkbox.dataset.dashboardPage;
      const pages = new Set(activeRoleAccess[role] || ["index.html"]);

      if (checkbox.checked) {
        pages.add(page);
      } else {
        pages.delete(page);
      }

      pages.add("index.html");
      activeRoleAccess[role] = Array.from(pages);
      status.textContent = "Salvando permissões...";

      try {
        await saveRoleAccess(profile);
        status.textContent = "Permissões atualizadas.";
      } catch (error) {
        checkbox.checked = !checkbox.checked;
        status.textContent = authErrorMessage(error);
      }
    });
  });
};

const roleOptionsMarkup = (selected = "viewer") =>
  getRoleOptions()
    .map((role) => `<option value="${role.key}" ${normalizeRoleKey(selected) === role.key ? "selected" : ""}>${role.label}</option>`)
    .join("");

const renderRoleSelectOptions = () => {
  document.querySelectorAll("select[data-role-options]").forEach((select) => {
    const selected = normalizeRoleKey(select.value);
    select.innerHTML = roleOptionsMarkup(selected);
  });
};

const bindCustomRoleForm = (profile) => {
  const form = document.querySelector("#customRoleForm");
  const status = document.querySelector("#usersStatus");
  if (!form || form.dataset.bound) return;

  form.dataset.bound = "true";
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setBusy(form, true);
    status.textContent = "Criando cargo...";

    const label = valueFromForm(form, "roleLabel").trim();
    const description = valueFromForm(form, "roleDescription").trim();
    const key = slugRoleKey(label);

    try {
      if (!label || !key) {
        status.textContent = "Informe um nome valido para o cargo.";
        return;
      }

      if (roleExists(key) || protectedRoleKeys.has(key)) {
        status.textContent = "Ja existe um cargo com esse nome.";
        return;
      }

      customRoleOptions = [...customRoleOptions, { key, label, description, custom: true }];
      activeRoleAccess[key] = ["index.html"];
      selectedPermissionRole = key;
      await saveRoleAccess(profile);

      form.reset();
      renderRoleSelectOptions();
      renderPermissionsPanel(profile);
      status.textContent = `Cargo ${label} criado. Agora selecione as dashboards liberadas.`;
    } catch (error) {
      customRoleOptions = customRoleOptions.filter((role) => role.key !== key);
      delete activeRoleAccess[key];
      status.textContent = authErrorMessage(error);
    } finally {
      setBusy(form, false);
    }
  });
};

const renderUsersPage = async (profile) => {
  const body = document.querySelector("#usersBody");
  const status = document.querySelector("#usersStatus");
  if (!body || !status) return;

  await renderIndicatorGoalsPanel(profile);
  renderOccurrenceOptionsPanel(profile);
  bindCustomRoleForm(profile);
  renderPermissionsPanel(profile);
  renderRoleSelectOptions();

  const createUserForm = document.querySelector("#adminCreateUserForm");
  if (createUserForm && !createUserForm.dataset.bound) {
    createUserForm.dataset.bound = "true";
    createUserForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setBusy(createUserForm, true);
    status.textContent = "Criando usuario...";

    try {
      const name = valueFromForm(createUserForm, "name").trim();
      const email = emailFromForm(createUserForm);
      const password = valueFromForm(createUserForm, "password");
      const role = normalizeRoleKey(valueFromForm(createUserForm, "role"));
      const approved = createUserForm.querySelector('[name="approved"]')?.checked || false;
      const sendVerification = createUserForm.querySelector('[name="sendVerification"]')?.checked || false;

      if (!isValidEmail(email)) {
        status.textContent = `Email lido como "${email}". Confira se esta completo.`;
        return;
      }

      if (password.length < 6) {
        status.textContent = "A senha precisa ter pelo menos 6 caracteres.";
        return;
      }

      const credential = await createUserWithEmailAndPassword(adminCreationAuth, email, password);
      await updateProfile(credential.user, { displayName: name });

      await setDoc(userRef(credential.user.uid), {
        uid: credential.user.uid,
        name,
        email,
        approved,
        role,
        emailVerified: credential.user.emailVerified,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: profile.uid
      });
      await ensureEmailIndex(credential.user.uid, email);

      const savedProfile = await getDoc(userRef(credential.user.uid));
      if (!savedProfile.exists()) {
        throw new Error("Perfil criado no Authentication, mas nao foi salvo no Firestore.");
      }

      if (sendVerification) {
        await sendEmailVerification(credential.user, verificationSettings());
      }

      await signOut(adminCreationAuth);
      createUserForm.reset();
      status.textContent = `Usuario criado e salvo. UID: ${credential.user.uid}`;
    } catch (error) {
      status.textContent = authErrorMessage(error);
    } finally {
      setBusy(createUserForm, false);
    }
    });
  }

  status.textContent = "Carregando usuarios...";

  usersUnsubscribe?.();
  usersUnsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
    const users = snapshot.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .sort((a, b) => String(a.email).localeCompare(String(b.email)));

    users.forEach((user) => {
      ensureEmailIndex(user.id, user.email).catch((error) => console.error(error));
    });

    body.innerHTML = users.map((user) => `
      <tr>
        <td>${user.name || "-"}</td>
        <td>${user.email || "-"}</td>
        <td>
          <span class="presence-badge ${isUserOnline(user) ? "online" : ""}">
            ${formatPresence(user)}
          </span>
        </td>
        <td>${user.emailVerified ? "Confirmado" : "Pendente"}</td>
        <td>
          <select data-user-approved="${user.id}" aria-label="Liberacao de ${user.email || "usuario"}">
            <option value="false" ${user.approved ? "" : "selected"}>Aguardando</option>
            <option value="true" ${user.approved ? "selected" : ""}>Liberado</option>
          </select>
        </td>
        <td>
          <select data-role-options data-user-role="${user.id}" aria-label="Cargo de ${user.email || "usuario"}">
            ${roleOptionsMarkup(user.role)}
          </select>
        </td>
        <td>${formatDate(user.createdAt)}</td>
        <td>
          <button
            class="danger"
            type="button"
            data-delete-user="${user.id}"
            data-delete-email="${user.email || ""}"
            ${user.id === profile.uid ? "disabled" : ""}
          >
            Excluir
          </button>
        </td>
      </tr>
    `).join("");

    body.querySelectorAll("[data-user-role]").forEach((select) => {
      select.addEventListener("change", async () => {
        const uid = select.dataset.userRole;
        const role = select.value;
        status.textContent = "Salvando cargo...";

        try {
          await updateDoc(userRef(uid), {
            role,
            updatedAt: serverTimestamp(),
            updatedBy: profile.uid
          });
          status.textContent = "Cargo atualizado.";
        } catch (error) {
          status.textContent = authErrorMessage(error);
        }
      });
    });

    body.querySelectorAll("[data-user-approved]").forEach((select) => {
      select.addEventListener("change", async () => {
        const uid = select.dataset.userApproved;
        const approved = select.value === "true";
        status.textContent = "Salvando liberacao...";

        try {
          await updateDoc(userRef(uid), {
            approved,
            updatedAt: serverTimestamp(),
            updatedBy: profile.uid
          });
          status.textContent = "Liberacao atualizada.";
        } catch (error) {
          status.textContent = authErrorMessage(error);
        }
      });
    });

    body.querySelectorAll("[data-delete-user]").forEach((button) => {
      button.addEventListener("click", async () => {
        const uid = button.dataset.deleteUser;
        const email = button.dataset.deleteEmail || "este usuario";
        const confirmed = window.confirm(`Excluir o cadastro de ${email} da dashboard?`);
        if (!confirmed) return;

        status.textContent = "Excluindo cadastro...";
        button.disabled = true;

        try {
          await deleteDoc(userRef(uid));
          await deleteDoc(emailIndexRef(email));
          status.textContent = "Cadastro excluido da dashboard.";
        } catch (error) {
          button.disabled = false;
          status.textContent = authErrorMessage(error);
        }
      });
    });

    status.textContent = users.length ? `${users.length} usuario(s) encontrado(s).` : "Nenhum usuario cadastrado.";
  }, (error) => {
    status.textContent = authErrorMessage(error);
  });
};

window.SGPAuth = {
  canAccess,
  currentUser: () => activeProfile,
  indicatorGoals: () => ({ ...activeIndicatorGoals }),
  occurrenceOptions: () => structuredClone(activeOccurrenceOptions),
  async loadOccurrenceOptions() {
    return structuredClone(activeOccurrenceOptions);
  },
  async loadManualIndicators() {
    const snapshot = await getDoc(manualIndicatorsRef());
    return snapshot.exists() ? decodeManualIndicators(snapshot.data()) : null;
  },
  async saveManualIndicators(payload) {
    if (!canAccess(activeProfile?.role, "lancamentos-indicadores.html")) {
      throw new Error("Seu cargo não tem permissão para salvar lançamentos manuais.");
    }

    await setDoc(manualIndicatorsRef(), {
      ...encodeManualIndicators(payload),
      updatedAt: serverTimestamp(),
      updatedBy: activeProfile.uid
    }, { merge: true });
  },
  async loadManualOccurrences() {
    const snapshot = await getDoc(manualOccurrencesRef());
    return snapshot.exists() ? decodeManualOccurrences(snapshot.data()) : null;
  },
  async saveManualOccurrences(payload) {
    if (!canAccess(activeProfile?.role, "lancamentos-ocorrencias.html")) {
      throw new Error("Seu cargo não tem permissão para salvar ocorrências manuais.");
    }

    await setDoc(manualOccurrencesRef(), {
      ...encodeManualOccurrences(payload),
      updatedAt: serverTimestamp(),
      updatedBy: activeProfile.uid
    }, { merge: true });
  },
  logout() {
    stopPresence();
    updatePresence(false).finally(() => {
      signOut(auth).finally(() => window.location.replace(LOGIN_PAGE));
    });
  }
};

await ready();
bindLoginPage();

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    activeProfile = null;
    stopPresence();
    if (!publicPages.has(currentPage())) redirectToLogin();
    return;
  }

  try {
    await reload(user);

    const profile = await ensureUserProfile(user);
    activeProfile = profile;

    if (!user.emailVerified && !profile.approved) {
      activeProfile = null;
      if (!publicPages.has(currentPage())) {
        await signOut(auth);
        redirectToLogin();
      }
      return;
    }

    await loadRoleAccess();

    if (currentPage() === LOGIN_PAGE) {
      redirectToHome(profile.role);
      return;
    }

    if (!canAccess(profile.role, currentPage())) {
      redirectToHome(profile.role);
      return;
    }

    startPresence();
    renderUserBar(profile);
    document.documentElement.dataset.authReady = "true";

    if (currentPage() === "usuarios.html") {
      renderUsersPage(profile);
    }
  } catch (error) {
    console.error(error);
    if (!publicPages.has(currentPage())) redirectToLogin();
  }
});
