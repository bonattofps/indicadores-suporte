import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  collection,
  getFirestore,
  onSnapshot
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

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const ONLINE_WINDOW_MS = 2 * 60 * 1000;
const INACTIVE_WINDOW_MS = 24 * 60 * 60 * 1000;

const roleLabels = {
  viewer: "Viewer",
  n1: "N1",
  n2: "N2",
  suporte: "N1",
  supervisor: "Supervisor",
  gerente: "Gerente",
  gerencia: "Gerente",
  administrador: "Administrador"
};

const elements = {
  status: document.querySelector("#pendingStatus"),
  viewerCount: document.querySelector("#viewerCount"),
  emailCount: document.querySelector("#emailCount"),
  approvalCount: document.querySelector("#approvalCount"),
  inactiveCount: document.querySelector("#inactiveCount"),
  body: document.querySelector("#pendingBody")
};

const dateFromTimestamp = (value) => value?.toDate?.() || null;

const formatDate = (value) => {
  const date = dateFromTimestamp(value);
  if (!date) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
};

const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const normalizedRole = (role) => (role === "suporte" ? "n1" : role === "gerencia" ? "gerente" : role || "viewer");

const isOnline = (user) => {
  const lastSeen = dateFromTimestamp(user.lastSeen);
  return user.online === true && lastSeen && Date.now() - lastSeen.getTime() <= ONLINE_WINDOW_MS;
};

const isInactive = (user) => {
  const lastSeen = dateFromTimestamp(user.lastSeen);
  return user.approved === true && (!lastSeen || Date.now() - lastSeen.getTime() > INACTIVE_WINDOW_MS);
};

const collectReasons = (user) => {
  const reasons = [];
  if (normalizedRole(user.role) === "viewer") reasons.push("Definir cargo");
  if (!user.emailVerified) reasons.push("Confirmar email");
  if (!user.approved) reasons.push("Liberar acesso");
  if (isInactive(user)) reasons.push("Revisar inatividade");
  return reasons;
};

const render = (users) => {
  const viewerUsers = users.filter((user) => normalizedRole(user.role) === "viewer");
  const emailUsers = users.filter((user) => !user.emailVerified);
  const approvalUsers = users.filter((user) => !user.approved);
  const inactiveUsers = users.filter(isInactive);
  const pendingUsers = users
    .map((user) => ({ ...user, reasons: collectReasons(user) }))
    .filter((user) => user.reasons.length)
    .sort((a, b) => b.reasons.length - a.reasons.length || String(a.email).localeCompare(String(b.email)));

  elements.viewerCount.textContent = viewerUsers.length;
  elements.emailCount.textContent = emailUsers.length;
  elements.approvalCount.textContent = approvalUsers.length;
  elements.inactiveCount.textContent = inactiveUsers.length;

  elements.body.innerHTML = pendingUsers.length
    ? pendingUsers.map((user) => {
        const role = normalizedRole(user.role);
        const online = isOnline(user);
        return `
          <tr>
            <td>${escapeHtml(user.name || "-")}</td>
            <td>${escapeHtml(user.email || "-")}</td>
            <td>${escapeHtml(roleLabels[role] || role)}</td>
            <td>${user.reasons.map((reason) => `<span class="badge warn">${escapeHtml(reason)}</span>`).join(" ")}</td>
            <td><span class="badge ${online ? "ok" : ""}">${online ? "Online" : "Offline"}</span></td>
            <td>${formatDate(user.lastSeen)}</td>
          </tr>
        `;
      }).join("")
    : `<tr><td colspan="6">Nenhuma pendencia encontrada.</td></tr>`;

  elements.status.textContent = pendingUsers.length
    ? `${pendingUsers.length} usuario(s) com pendencia.`
    : "Nenhuma pendencia encontrada.";
};

onAuthStateChanged(auth, (user) => {
  if (!user) return;

  onSnapshot(collection(db, "users"), (snapshot) => {
    const users = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    render(users);
  }, (error) => {
    console.error(error);
    elements.status.textContent = "Nao foi possivel carregar as pendencias.";
  });
});
