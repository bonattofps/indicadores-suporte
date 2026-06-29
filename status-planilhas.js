const SHEETS = [
  {
    name: "Indicadores Gerais",
    source: "Indicadores de Suporte",
    url: "https://docs.google.com/spreadsheets/d/1aZdeCuJreUJm2G-LeyLMDchUec4oMSl3dgX_S8pR_48/export?format=csv&gid=704599160"
  },
  {
    name: "Ocorrencias Mensais",
    source: "Ocorrencias",
    url: "https://docs.google.com/spreadsheets/d/1W9LUNFCcrmqDuKVqTJhv6uYOmJ0IbyPoErFYcvnvRfg/export?format=csv&gid=893426944"
  },
  {
    name: "Jornadas do Suporte",
    source: "Jornadas",
    url: "https://docs.google.com/spreadsheets/d/17QoDe9GbP07OtEOD1Vq8gRCU-SVBctX6FJH3oGRpkOE/export?format=csv&gid=1617519603"
  },
  {
    name: "CTO e PPPoE",
    source: "Identificação de CTO",
    url: "https://docs.google.com/spreadsheets/d/16YDlQwCS9tXWWENGbbqTCgvt8jCjiTbK3i2RL5jMFLs/export?format=csv&gid=1078481546"
  }
];

const elements = {
  status: document.querySelector("#sheetStatus"),
  connectedCount: document.querySelector("#connectedCount"),
  errorCount: document.querySelector("#errorCount"),
  totalRows: document.querySelector("#totalRows"),
  lastCheck: document.querySelector("#lastCheck"),
  body: document.querySelector("#sheetsBody"),
  refresh: document.querySelector("#refreshSheets")
};

const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((item) => String(item).trim())) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((item) => String(item).trim())) rows.push(row);
  return rows;
};

const detectLastRecord = (headers, records) => {
  if (!records.length) return "-";

  const last = records[records.length - 1];
  const dateIndex = headers.findIndex((header) => /data|date/i.test(header));
  if (dateIndex >= 0 && last[dateIndex]) return last[dateIndex];

  const firstFilled = last.find((item) => String(item || "").trim());
  return firstFilled || "-";
};

const checkSheet = async (sheet) => {
  const startedAt = performance.now();
  const response = await fetch(`${sheet.url}&_=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const text = await response.text();
  const rows = parseCsv(text);
  const headers = rows[0] || [];
  const records = rows.slice(1).filter((row) => row.some((item) => String(item).trim()));

  return {
    ...sheet,
    ok: true,
    rows: records.length,
    lastRecord: detectLastRecord(headers, records),
    latency: Math.round(performance.now() - startedAt)
  };
};

const render = (results) => {
  const connected = results.filter((item) => item.ok);
  const errors = results.filter((item) => !item.ok);
  const now = new Date();

  elements.connectedCount.textContent = connected.length;
  elements.errorCount.textContent = errors.length;
  elements.totalRows.textContent = connected.reduce((sum, item) => sum + item.rows, 0);
  elements.lastCheck.textContent = new Intl.DateTimeFormat("pt-BR", { timeStyle: "short" }).format(now);

  elements.body.innerHTML = results.map((item) => `
    <tr>
      <td><strong>${escapeHtml(item.name)}</strong></td>
      <td><span class="badge ${item.ok ? "ok" : "danger"}">${item.ok ? "Conectada" : "Erro"}</span></td>
      <td>${item.ok ? item.rows : "-"}</td>
      <td>${escapeHtml(item.ok ? item.lastRecord : item.error)}</td>
      <td>${escapeHtml(item.source)}${item.ok ? ` (${item.latency} ms)` : ""}</td>
    </tr>
  `).join("");

  elements.status.textContent = errors.length
    ? `${errors.length} planilha(s) com erro de leitura.`
    : "Todas as planilhas responderam corretamente.";
};

const refresh = async () => {
  elements.status.textContent = "Verificando planilhas...";
  elements.refresh.disabled = true;

  const results = await Promise.all(SHEETS.map(async (sheet) => {
    try {
      return await checkSheet(sheet);
    } catch (error) {
      console.error(error);
      return {
        ...sheet,
        ok: false,
        rows: 0,
        lastRecord: "-",
        error: "Nao foi possivel ler a planilha"
      };
    }
  }));

  render(results);
  elements.refresh.disabled = false;
};

elements.refresh.addEventListener("click", refresh);
refresh();
