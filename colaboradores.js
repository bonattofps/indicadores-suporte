const WEEK_ORDER = ["s1", "s2", "s3", "s4"];
const WEEK_LABELS = {
  ultima: "Última Semana",
  s1: "1ª Semana",
  s2: "2ª Semana",
  s3: "3ª Semana",
  s4: "4ª Semana"
};

const teams = {
  N2: {
    headers: ["Colaborador", "Ativação de Novo Login", "Suporte Interno", "O.S Aberta a Campo", "Atendimento Externo", "Atendimento Interno"],
    goals: {
      "Ativação de Novo Login": { target: 20, direction: "up" },
      "Suporte Interno": { target: 0, direction: "up" },
      "O.S Aberta a Campo": { target: 8, direction: "up" },
      "Atendimento Externo": { target: 40, direction: "up" },
      "Atendimento Interno": { target: 5, direction: "up" }
    },
    rows: [
      ["EBERTON PERES DE OLIVEIRA", 0, 0, 46, 8],
      ["EMANUELLY FERREIRA CAVALHEIRO", 28, 13, 87, 37],
      ["JUANDER BONATO", 0, 0, 0, 0],
      ["RAMON THIERRY BESERRA GOMES", 0, 0, 0, 0],
      ["SABRINA FERNANDES", 0, 1, 43, 3],
      ["BRUNO MATHEUS ROSSOW DE ASSIS", 23, 11, 52, 5],
      ["WELINGTON SOUZA PINTO", 0, 3, 44, 0]
    ]
  },
  N1: {
    headers: ["Colaborador", "Registros Operacional", "Registro Financeiro", "O.S Aberta a Campo", "Atendimento OPASuite", "Avaliação Individual", "Tempo Médio de Atendimento", "Tempo Médio de Resposta"],
    goals: {
      "Registros Operacional": { target: 38, direction: "up" },
      "Registro Financeiro": { target: 38, direction: "up" },
      "O.S Aberta a Campo": { target: 20, direction: "up" },
      "Atendimento OPASuite": { target: 96, direction: "up" },
      "Avaliação Individual": { target: 4.0, direction: "up" },
      "Tempo Médio de Atendimento": { target: "01:00:00", direction: "down" },
      "Tempo Médio de Resposta": { target: "00:02:20", direction: "down" }
    },
    rows: [
      ["ADELAIDY VITÓRIA", 11, 24, 9, 88, 15, 72, 4.48, "01:26:29", "00:04:59"],
      ["ANA CLARA SANTANA DA SILVA", 64, 55, 31, 58, 18, 119, 4.48, "00:52:01", "00:03:20"],
      ["ANA VIRGINIA MORENO", 19, 28, 14, 0, 0, 60, 4.54, "00:26:07", "00:01:46"],
      ["ANNA CLARA OLIVEIRA ANDRADE", 25, 41, 19, 95, 17, 42, 4.86, "01:14:52", "00:01:52"],
      ["ANNA HELOISA PEREIRA SILVA", 72, 75, 24, 55, 14, 167, 4.07, "01:19:29", "00:09:39"],
      ["BRENO BATISTA DE JESUS SOUSA", 74, 50, 25, 100, 24, 164, 4.67, "00:40:18", "00:01:40"],
      ["DANIEL ALEXANDRE ALVES DO NASCIMENTO", 8, 1, 15, 41, 4, 20, 3.50, "01:23:00", "00:03:08"],
      ["EMANUELE ARAÚJO", 42, 37, 16, 65, 11, 84, 4.52, "01:07:30", "00:03:55"],
      ["EZEQUIEL RICARDO FIGUEIREDO", 79, 14, 29, 0, 0, 98, 4.81, "00:46:02", "00:03:04"],
      ["GABRIELI DOURADO MILANI", 13, 48, 17, 44, 13, 125, 4.61, "00:38:28", "00:01:59"],
      ["JENNYFER TAVARES", 61, 57, 38, 131, 21, 117, 4.58, "00:25:14", "00:00:33"],
      ["JOÃO PAULO BARBOSA", 34, 55, 25, 48, 6, 89, 4.65, "00:52:50", "00:02:50"],
      ["JOÃO PEDRO VIZELI ARAUJO", 59, 40, 29, 38, 6, 106, 4.67, "01:09:45", "00:02:25"],
      ["JULIANA SANTIAGO", 71, 44, 36, 0, 0, 126, 4.58, "00:25:05", "00:02:01"],
      ["LEANDRO ALVES", 13, 6, 15, 0, 0, 92, 4.67, "00:52:42", "00:01:21"],
      ["LORYAN DOS SANTOS PAULO", 1, 1, 0, 158, 19, 26, 4.71, "00:45:31", "00:02:05"],
      ["LUCAS MAYER", 44, 2, 38, 0, 0, 114, 4.44, "00:33:44", "00:02:06"],
      ["MATHEUS MERELES", 79, 54, 17, 59, 11, 103, 4.73, "00:38:49", "00:01:41"],
      ["MAYCON DA SILVA BATISTA", 25, 14, 13, 113, 26, 38, 5.00, "01:21:42", "00:03:14"],
      ["MIRIAN BRITO", 74, 31, 17, 47, 3, 90, 4.75, "00:34:16", "00:02:51"],
      ["NICOLY SILVA MALESCZA (financeiro)", 40, 49, 17, 26, 3, 106, 4.26, "01:07:22", "00:08:46"],
      ["VICTORIA CELESTINO DA SILVA (financeiro)", 7, 25, 18, 10, 3, 59, 4.41, "00:52:11", "00:02:08"],
      ["VANESSA MOURA GOMES", 4, 27, 7, 25, 3, 44, 4.38, "01:01:44", "00:03:31"],
      ["VINICIUS SANTIAGO DE OLIVEIRA", 72, 62, 20, 26, 3, 108, 4.10, "00:33:04", "00:02:37"],
      ["WEVERTON HENRIQUE DA SILVA CORDEIRO", 127, 48, 27, 33, 5, 151, 4.00, "01:24:29", "00:05:02"],
      ["WILLAMY CARRILHO DE ABREU", 0, 0, 3, 0, 0, 0, 0, "00:00:00", "00:00:00"],
      ["YURI GADELHA", 72, 57, 18, 5, 0, 133, 4.58, "00:37:42", "00:01:32"]
    ]
  }
};

teams.N1.rows = [];
teams.N2.rows = [];

Object.values(teams).forEach((team) => {
  if (team.headers.includes("Atendimento OPASuite")) {
    team.rows = team.rows.map((row) => row.length > team.headers.length
      ? [row[0], row[1], row[2], row[3], row[6], row[7], row[8], row[9]]
      : row
    );
  }
  team.rowsByWeek = {
    ultima: team.rows,
    s1: team.rows,
    s2: [],
    s3: [],
    s4: []
  };
  team.goalsByWeek = {
    ultima: { ...team.goals },
    s1: { ...team.goals },
    s2: { ...team.goals },
    s3: { ...team.goals },
    s4: { ...team.goals }
  };
});

let currentTeam = "N1";
let currentWeek = "ultima";
let charts = {};

const els = {
  teamTabs: document.querySelector("#teamTabs"),
  weekTabs: document.querySelector("#weekTabs"),
  search: document.querySelector("#searchInput"),
  metricSelect: document.querySelector("#metricSelect"),
  kpiBoard: document.querySelector("#kpiBoard"),
  importStatus: document.querySelector("#importStatus"),
  executiveSummary: document.querySelector("#executiveSummary"),
  validationList: document.querySelector("#validationList"),
  improveList: document.querySelector("#improveList"),
  improveTitle: document.querySelector("#improveTitle"),
  topGoodList: document.querySelector("#topGoodList"),
  topCriticalList: document.querySelector("#topCriticalList"),
  actionHead: document.querySelector("#actionHead"),
  actionBody: document.querySelector("#actionBody"),
  tableHead: document.querySelector("#tableHead"),
  tableBody: document.querySelector("#tableBody")
};

document.addEventListener("DOMContentLoaded", () => {
  setupTheme();
  loadSavedGoals();
  loadImportedRows();
  document.querySelector("#fileInput").addEventListener("change", handleImport);
  document.querySelector("#clearButton").addEventListener("click", clearImportedData);
  els.teamTabs.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    currentTeam = button.dataset.team;
    document.querySelectorAll("#teamTabs button").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    fillMetricSelect();
    render();
  });
  els.weekTabs.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    currentWeek = button.dataset.week;
    document.querySelectorAll("#weekTabs button").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    render();
  });
  els.search.addEventListener("input", renderTable);
  els.metricSelect.addEventListener("change", renderRankingChart);
  fillMetricSelect();
  render();
});

async function handleImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const rows = await readWorkbookRows(file);
    sessionStorage.setItem("indicadoresWorkbookRows", JSON.stringify(rows));
    sessionStorage.setItem("indicadoresWorkbookName", file.name);
    sessionStorage.setItem("indicadoresImportedAt", new Date().toLocaleString("pt-BR"));
    applyCollaboratorRows(rows);
    fillMetricSelect();
    render();
  } catch (error) {
    console.error(error);
    alert("Não foi possível importar colaboradores. Confira se a planilha segue o modelo da matriz.");
  }
}

function loadImportedRows() {
  const savedRows = sessionStorage.getItem("indicadoresWorkbookRows");
  if (!savedRows) return;
  try {
    applyCollaboratorRows(JSON.parse(savedRows));
  } catch (error) {
    sessionStorage.removeItem("indicadoresWorkbookRows");
  }
}

function applyCollaboratorRows(rows) {
    const n2Index = rows.findIndex((row) => normalize(row[0]).includes("EQUIPE DE COLABORADORES N2"));
    const n1Index = rows.findIndex((row) => normalize(row[0]).includes("EQUIPE DE COLABORADORES N1"));

    if (n2Index === -1 && n1Index === -1) throw new Error("Blocos de colaboradores não encontrados.");

    const imported = parseWeeklyBlocks(rows);
    ["N1", "N2"].forEach((teamKey) => {
      const weeks = imported[teamKey];
      const lastWeek = [...WEEK_ORDER].reverse().find((week) => weeks.rows[week]?.length);
      if (lastWeek) {
        teams[teamKey].rowsByWeek = {
          ultima: weeks.rows[lastWeek],
          s1: weeks.rows.s1 || [],
          s2: weeks.rows.s2 || [],
          s3: weeks.rows.s3 || [],
          s4: weeks.rows.s4 || []
        };
        teams[teamKey].goalsByWeek = {
          ultima: weeks.goals[lastWeek] || teams[teamKey].goals,
          s1: weeks.goals.s1 || teams[teamKey].goals,
          s2: weeks.goals.s2 || teams[teamKey].goals,
          s3: weeks.goals.s3 || teams[teamKey].goals,
          s4: weeks.goals.s4 || teams[teamKey].goals
        };
        teams[teamKey].rows = teams[teamKey].rowsByWeek.ultima;
      }
    });
    updateImportStatus(rows);
    renderValidation(rows);
}

function parseWeeklyBlocks(rows) {
  const imported = {
    N1: { rows: { s1: [], s2: [], s3: [], s4: [] }, goals: { s1: null, s2: null, s3: null, s4: null } },
    N2: { rows: { s1: [], s2: [], s3: [], s4: [] }, goals: { s1: null, s2: null, s3: null, s4: null } }
  };
  const counters = { N1: 0, N2: 0 };

  rows.forEach((row, index) => {
    const label = normalize(row[0]);
    if (!label.includes("EQUIPE DE COLABORADORES")) return;

    const team = label.includes("N2") ? "N2" : label.includes("N1") ? "N1" : null;
    if (!team) return;

    const week = detectBlockWeek(rows, index, counters[team]);
    counters[team] += 1;
    const parsed = parseBlock(rows, index, team);
    imported[team].rows[week] = parsed.rows;
    imported[team].goals[week] = parsed.goals;
  });

  return imported;
}

function detectBlockWeek(rows, blockIndex, fallbackIndex) {
  return WEEK_ORDER[Math.min(fallbackIndex, WEEK_ORDER.length - 1)];
}

async function readWorkbookRows(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
  return workbook.SheetNames.flatMap((name) =>
    XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, raw: false, defval: "" })
  );
}

function parseBlock(rows, startIndex, team) {
  const parsed = [];
  const columnMap = team === "N1" ? buildN1ColumnMap(rows[startIndex]) : buildN2ColumnMap(rows[startIndex]);
  let goals = null;

  for (let i = startIndex + 1; i < rows.length; i += 1) {
    const row = rows[i];
    const name = clean(row[0]);
    const normalized = normalize(name);

    if (!name) break;
    if (normalized.includes("EQUIPE DE COLABORADORES") || normalized.includes("METRICA MATRIZ")) break;
    if (normalized.includes("META INDIVIDUAL")) {
      goals = parseGoalsRow(row, team, columnMap);
      continue;
    }
    if (["TOTAL", "META COLETIVA"].some((word) => normalized.includes(word))) continue;

    if (team === "N2") {
      parsed.push([
        name,
        normalizeImportedValue(row[columnMap.login]),
        normalizeImportedValue(row[columnMap.suporteInterno]),
        normalizeImportedValue(row[columnMap.osCampo]),
        normalizeImportedValue(row[columnMap.externo]),
        normalizeImportedValue(row[columnMap.interno])
      ]);
    } else {
      parsed.push([
        name,
        normalizeImportedValue(row[columnMap.operacional]),
        normalizeImportedValue(row[columnMap.financeiro]),
        normalizeImportedValue(row[columnMap.osCampo]),
        normalizeImportedValue(row[columnMap.opaSuite]),
        normalizeImportedValue(row[columnMap.avaliacao]),
        normalizeImportedValue(row[columnMap.tma], "time"),
        normalizeImportedValue(row[columnMap.tmr], "time")
      ]);
    }
  }

  return { rows: parsed.length ? parsed : teams[team].rows, goals: goals || teams[team].goals };
}

function parseGoalsRow(row, team, columnMap) {
  const goals = {};
  if (team === "N2") {
    goals["Ativação de Novo Login"] = { target: normalizeImportedValue(row[columnMap.login]), direction: "up" };
    goals["Suporte Interno"] = { target: normalizeImportedValue(row[columnMap.suporteInterno]), direction: "up" };
    goals["O.S Aberta a Campo"] = { target: normalizeImportedValue(row[columnMap.osCampo]), direction: "up" };
    goals["Atendimento Externo"] = { target: normalizeImportedValue(row[columnMap.externo]), direction: "up" };
    goals["Atendimento Interno"] = { target: normalizeImportedValue(row[columnMap.interno]), direction: "up" };
    return goals;
  }

  goals["Registros Operacional"] = { target: normalizeImportedValue(row[columnMap.operacional]), direction: "up" };
  goals["Registro Financeiro"] = { target: normalizeImportedValue(row[columnMap.financeiro]), direction: "up" };
  goals["O.S Aberta a Campo"] = { target: normalizeImportedValue(row[columnMap.osCampo]), direction: "up" };
  goals["Atendimento OPASuite"] = { target: normalizeImportedValue(row[columnMap.opaSuite]), direction: "up" };
  goals["Avaliação Individual"] = { target: normalizeImportedValue(row[columnMap.avaliacao]), direction: "up" };
  goals["Tempo Médio de Atendimento"] = { target: normalizeImportedValue(row[columnMap.tma], "time"), direction: "down" };
  goals["Tempo Médio de Resposta"] = { target: normalizeImportedValue(row[columnMap.tmr], "time"), direction: "down" };
  return goals;
}

function buildN2ColumnMap(headerRow) {
  const map = {
    login: 1,
    suporteInterno: 2,
    osCampo: 3,
    externo: 4,
    interno: 5
  };

  headerRow.forEach((cell, index) => {
    const header = normalize(cell);
    if (header.includes("ATIVACAO") || header.includes("NOVO LOGIN")) map.login = index;
    if (header.includes("SUPORTE INTERNO")) map.suporteInterno = index;
    if (header.includes("O S ABERTA") || header.includes("OS ABERTA")) map.osCampo = index;
    if (header.includes("ATENDIMENTO EXTERNO")) map.externo = index;
    if (header.includes("ATENDIMENTO INTERNO")) map.interno = index;
  });

  return map;
}

function buildN1ColumnMap(headerRow) {
  const map = {
    operacional: 1,
    financeiro: 2,
    osCampo: 3,
    opaSuite: 6,
    avaliacao: 7,
    tma: 8,
    tmr: 9
  };

  headerRow.forEach((cell, index) => {
    const header = normalize(cell);
    if (header.includes("REGISTROS OPERACIONAL")) map.operacional = index;
    if (header.includes("REGISTRO FINANCEIRO")) map.financeiro = index;
    if (header.includes("O S ABERTA") || header.includes("OS ABERTA")) map.osCampo = index;
    if (header.includes("OPASUITE")) map.opaSuite = index;
    if (header.includes("AVALIACAO INDIVIDUAL") || header.includes("AVALIA O INDIVIDUAL") || header.includes("AVALIA")) map.avaliacao = index;
    if (header.includes("TEMPO MEDIO") && header.includes("ATENDIMENTO")) map.tma = index;
    if (header.includes("TEMPO MEDIO") && header.includes("RESPOSTA")) map.tmr = index;
  });

  return map;
}

function fillMetricSelect() {
  const headers = teams[currentTeam].headers.slice(1);
  els.metricSelect.innerHTML = headers.map((header) => `<option value="${header}">${header}</option>`).join("");
  els.metricSelect.value = currentTeam === "N1" ? "Atendimento OPASuite" : "Atendimento Externo";
}

function render() {
  renderKpis();
  renderExecutiveSummary();
  renderImproveList();
  renderTopLists();
  renderTable();
  renderActionPlan();
  renderRankingChart();
}

function rowsAsObjects(weekKey = currentWeek) {
  const team = teams[currentTeam];
  const weekRows = team.rowsByWeek?.[weekKey] || [];
  return weekRows.map((row) => Object.fromEntries(team.headers.map((header, index) => [header, row[index]])));
}

function filteredRows() {
  const search = normalize(els.search.value);
  return rowsAsObjects().filter((row) => normalize(row.Colaborador).includes(search));
}

function renderKpis() {
  const scored = rowsAsObjects().map((row) => ({ row, result: scoreRow(row) }));
  const good = scored.filter((item) => item.result.misses.length === 0).length;
  const bad = scored.filter((item) => item.result.misses.length >= 1).length;
  const best = [...scored].sort((a, b) => b.result.score - a.result.score)[0];
  const worst = [...scored].sort((a, b) => b.result.misses.length - a.result.misses.length || a.result.score - b.result.score)[0];

  els.kpiBoard.innerHTML = [
    [`Colaboradores avaliados - ${WEEK_LABELS[currentWeek]}`, scored.length],
    ["Dentro ou perto da meta", good],
    ["Críticos", bad],
    ["Melhor desempenho", best?.row.Colaborador || "-"]
  ].map(([label, value]) => `
    <article class="kpi">
      <span>${label}</span>
      <strong>${value}</strong>
    </article>
  `).join("");
}

function renderExecutiveSummary() {
  const rows = rowsAsObjects();
  const scored = rows.map((row) => ({ row, result: scoreRow(row) }));
  const critical = scored.filter((item) => item.result.misses.length).length;
  const best = [...scored].sort((a, b) => b.result.score - a.result.score)[0]?.row.Colaborador || "-";
  const previousRows = rowsAsObjects(previousWeekKey());
  const metric = els.metricSelect.value;
  const currentTotal = rows.reduce((sum, row) => sum + metricValue(row[metric]), 0);
  const previousTotal = previousRows.reduce((sum, row) => sum + metricValue(row[metric]), 0);
  const delta = previousTotal ? (((currentTotal - previousTotal) / previousTotal) * 100).toFixed(1) : "-";

  els.executiveSummary.innerHTML = [
    ["Semana", WEEK_LABELS[currentWeek]],
    ["Críticos", critical],
    ["Melhor desempenho", best],
    ["Evolução vs anterior", delta === "-" ? "-" : `${delta}%`]
  ].map(([label, value]) => `<article class="insight-card"><span>${label}</span><strong>${value}</strong></article>`).join("");
}

function renderImproveList() {
  els.improveTitle.textContent = `Precisa melhorar - ${WEEK_LABELS[currentWeek]}`;
  const items = rowsAsObjects()
    .map((row) => ({ row, result: scoreRow(row) }))
    .filter((item) => item.result.misses.length)
    .sort((a, b) => b.result.misses.length - a.result.misses.length || a.result.score - b.result.score)
    .slice(0, 8);

  if (!items.length) {
    els.improveList.innerHTML = `
      <div class="improve-item">
        <strong>Nenhuma melhoria crítica nesta semana</strong>
        <span>Selecione outra semana ou importe a planilha atualizada para revisar a equipe.</span>
      </div>
    `;
    return;
  }

  els.improveList.innerHTML = items.map((item) => `
    <div class="improve-item">
      <strong>${item.row.Colaborador}</strong>
      <span>${item.result.misses.slice(0, 3).join(", ")}</span>
    </div>
  `).join("");
}

function renderTopLists() {
  const scored = rowsAsObjects().map((row) => ({ row, result: scoreRow(row) }));
  const good = [...scored]
    .filter((item) => !item.result.misses.length)
    .sort((a, b) => b.result.score - a.result.score)
    .slice(0, 5);
  const critical = [...scored]
    .filter((item) => item.result.misses.length)
    .sort((a, b) => b.result.misses.length - a.result.misses.length || a.result.score - b.result.score)
    .slice(0, 5);

  els.topGoodList.innerHTML = renderMiniList(good, "Sem colaboradores 100% dentro da meta nesta semana.");
  els.topCriticalList.innerHTML = renderMiniList(critical, "Sem críticos nesta semana.");
}

function renderMiniList(items, emptyMessage) {
  if (!items.length) {
    return `<div class="improve-item"><strong>${emptyMessage}</strong><span>${WEEK_LABELS[currentWeek]}</span></div>`;
  }
  return items.map((item) => `
    <div class="improve-item">
      <strong>${item.row.Colaborador}</strong>
      <span>${item.result.misses.length ? item.result.misses.join(", ") : "Dentro da meta"}</span>
    </div>
  `).join("");
}

function renderActionPlan() {
  const rows = rowsAsObjects();
  const actions = [];
  const goals = currentGoals();
  rows.forEach((row) => {
    const misses = scoreRow(row).misses;
    if (!misses.length) return;
    actions.push({
      colaborador: row.Colaborador,
      metrics: misses.map((metric) => {
        const goal = goals[metric];
        return `${metric}: atual ${formatCell(row[metric])} / meta ${formatCell(goal.target)}`;
      }).join(" | "),
      action: [...new Set(misses.map(actionForMetric))].join(" ")
    });
  });

  els.actionHead.innerHTML = `<tr><th>Colaborador</th><th>Precisa melhorar</th><th>Ação sugerida</th></tr>`;
  if (!actions.length) {
    els.actionBody.innerHTML = `<tr><td class="neutral-cell" colspan="3">Nenhum plano de ação necessário para ${WEEK_LABELS[currentWeek]}.</td></tr>`;
    return;
  }

  els.actionBody.innerHTML = actions.map((item) => `
    <tr>
      <td>${item.colaborador}</td>
      <td>${item.metrics}</td>
      <td>${item.action}</td>
    </tr>
  `).join("");
}

function renderTable() {
  const team = teams[currentTeam];
  const headers = team.headers;
  const rows = filteredRows();

  els.tableHead.innerHTML = `<tr>${headers.map((header) => `<th>${header}</th>`).join("")}<th>Status</th><th>Precisa melhorar</th></tr>`;
  if (!rows.length) {
    els.tableBody.innerHTML = `<tr><td class="neutral-cell" colspan="${headers.length + 2}">Sem dados para ${WEEK_LABELS[currentWeek]} nesta equipe.</td></tr>`;
    return;
  }

  els.tableBody.innerHTML = rows.map((row) => {
    const result = scoreRow(row);
    const badge = statusBadge(result);
    return `
      <tr>
        ${headers.map((header) => `<td class="${cellClass(row, header)}">${formatCell(row[header])}</td>`).join("")}
        <td class="neutral-cell"><span class="badge ${badge.className}">${badge.label}</span></td>
        <td class="neutral-cell">${result.misses.join(", ") || "Dentro da meta"}</td>
      </tr>
    `;
  }).join("");
}

function renderRankingChart() {
  const metric = els.metricSelect.value;
  const rows = rowsAsObjects()
    .map((row) => ({ name: shortName(row.Colaborador), value: metricValue(row[metric]) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);

  charts.ranking?.destroy();
  charts.ranking = new Chart(document.querySelector("#rankingChart"), {
    type: "bar",
    data: {
      labels: rows.map((row) => row.name),
      datasets: [{
        label: metric,
        data: rows.map((row) => row.value),
        backgroundColor: "rgba(33, 192, 122, 0.72)",
        borderColor: "#21c07a",
        borderWidth: 1,
        borderRadius: 6
      }]
    },
    options: chartOptions()
  });
}

function renderStatusChart() {
  const counts = { good: 0, warn: 0, bad: 0 };
  rowsAsObjects().forEach((row) => {
    counts[statusBadge(scoreRow(row)).className] += 1;
  });

  charts.status?.destroy();
  charts.status = new Chart(document.querySelector("#statusChart"), {
    type: "doughnut",
    data: {
      labels: ["Bom", "Atenção", "Crítico"],
      datasets: [{
        data: [counts.good, counts.warn, counts.bad],
        backgroundColor: ["#21c07a", "#f0b429", "#ef5b5b"],
        borderColor: "#121820",
        borderWidth: 2
      }]
    },
    options: { ...chartOptions(), cutout: "62%", scales: {} }
  });
}

function scoreRow(row) {
  const goals = currentGoals();
  let score = 0;
  const misses = [];

  Object.entries(goals).forEach(([metric, goal]) => {
    const status = metricStatus(row[metric], goal);
    if (status === "good") score += 2;
    if (status === "warn") score += 1;
    if (status === "bad") misses.push(metric);
  });

  return { score, misses };
}

function cellClass(row, header) {
  if (header === "Colaborador") return "neutral-cell";
  const goal = currentGoals()[header];
  if (!goal) return "neutral-cell";
  return `${metricStatus(row[header], goal)}-cell`;
}

function currentGoals() {
  return teams[currentTeam].goalsByWeek?.[currentWeek] || teams[currentTeam].goals;
}

function metricStatus(value, goal) {
  const number = metricValue(value);
  const target = metricValue(goal.target);
  if (!Number.isFinite(number) || !Number.isFinite(target)) return "warn";
  if (goal.direction === "down") return number <= target ? "good" : "bad";
  if (goal.direction === "up" && number >= target) return "good";
  const ratio = goal.direction === "up" ? number / target : target / Math.max(number, 1);
  return ratio >= 0.8 ? "warn" : "bad";
}

function statusBadge(result) {
  if (result.misses.length >= 1) return { label: "Crítico", className: "bad" };
  return { label: "Bom", className: "good" };
}

function metricValue(value) {
  if (typeof value === "number") return value;
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(String(value))) return timeToSeconds(value);
  return Number(value);
}

function timeToSeconds(value) {
  const parts = String(value).split(":").map(Number);
  const hours = parts.length === 3 ? parts[0] : 0;
  const minutes = parts.length === 3 ? parts[1] : parts[0];
  const seconds = parts.length === 3 ? parts[2] : parts[1];
  return hours * 3600 + minutes * 60 + seconds;
}

function formatCell(value) {
  if (typeof value === "number") return value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  return value;
}

function chartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: "#26516d", boxWidth: 12 } },
      tooltip: { backgroundColor: "#ffffff", borderColor: "#cfe2ee", borderWidth: 1, titleColor: "#102033", bodyColor: "#102033" }
    },
    scales: {
      x: { ticks: { color: "#567086", maxRotation: 35 }, grid: { color: "rgba(207, 226, 238, 0.8)" } },
      y: { beginAtZero: true, ticks: { color: "#567086" }, grid: { color: "rgba(207, 226, 238, 0.8)" } }
    }
  };
}

function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/Ã‡/g, "C")
    .replace(/Ã£/g, "A")
    .replace(/Ã©/g, "E")
    .replace(/Ã‰/g, "E")
    .replace(/Ã¡/g, "A")
    .replace(/Ã“/g, "O")
    .replace(/[^A-Z0-9]+/gi, " ")
    .toUpperCase()
    .trim();
}

function shortName(name) {
  const parts = String(name).split(" ").filter(Boolean);
  if (parts.length <= 2) return parts.join(" ");
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

function normalizeImportedValue(value, type = "number") {
  const text = clean(value);
  if (!text || normalize(text) === "S R") return 0;
  if (type === "time") {
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(text)) return normalizeTimeLabel(text);
    const number = parseLocaleNumber(text);
    return Number.isFinite(number) ? excelTimeToLabel(number) : "00:00:00";
  }
  const number = parseLocaleNumber(text.replace("%", ""));
  return Number.isFinite(number) ? number : 0;
}

function parseLocaleNumber(value) {
  const text = String(value).trim();
  if (!text) return NaN;
  if (/^-?\d+([.,]\d+)?e[+-]?\d+$/i.test(text)) return Number(text.replace(",", "."));
  const comma = text.lastIndexOf(",");
  const dot = text.lastIndexOf(".");
  let normalized = text;
  if (comma > dot) {
    normalized = text.replace(/\./g, "").replace(",", ".");
  } else if (dot > comma && comma !== -1) {
    normalized = text.slice(dot + 1).length === 3 ? text.replace(/\./g, "") : text.replace(/,/g, "");
  }
  return Number(normalized);
}

function excelTimeToLabel(value) {
  const totalSeconds = Math.round(value * 86400);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

function normalizeTimeLabel(value) {
  const parts = String(value).split(":").map(Number);
  const hours = parts.length === 3 ? parts[0] : 0;
  const minutes = parts.length === 3 ? parts[1] : parts[0];
  const seconds = parts.length === 3 ? parts[2] : parts[1];
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function previousWeekKey() {
  if (currentWeek === "ultima") return "s3";
  const index = WEEK_ORDER.indexOf(currentWeek);
  return index > 0 ? WEEK_ORDER[index - 1] : currentWeek;
}

function actionForMetric(metric) {
  if (metric.includes("Tempo Médio")) return "Revisar fila, priorização e tempo de resposta individual.";
  if (metric.includes("Avaliação")) return "Analisar atendimentos mal avaliados e reforçar padrão de qualidade.";
  if (metric.includes("O.S")) return "Acompanhar abertura de campo e aderência ao processo.";
  if (metric.includes("OPASuite")) return "Revisar produtividade no OPASuite e distribuição de demandas.";
  if (metric.includes("Financeiro") || metric.includes("Operacional")) return "Checar volume de registros e meta diária.";
  return "Acompanhar indicador com feedback semanal.";
}

function updateImportStatus(rows) {
  if (!els.importStatus) return;
  const name = sessionStorage.getItem("indicadoresWorkbookName") || "Planilha importada";
  const importedAt = sessionStorage.getItem("indicadoresImportedAt") || new Date().toLocaleString("pt-BR");
  const weeksFound = WEEK_ORDER.filter((week) => teams.N1.rowsByWeek[week]?.length || teams.N2.rowsByWeek[week]?.length).length;
  els.importStatus.textContent = `${name} importada em ${importedAt}. ${weeksFound} semana(s) de colaboradores encontrada(s). ${rows.length} linhas lidas.`;
}

function renderValidation(rows) {
  if (!els.validationList) return;
  const warnings = [];
  ["N1", "N2"].forEach((teamKey) => {
    WEEK_ORDER.forEach((week) => {
      if (!teams[teamKey].rowsByWeek[week]?.length) warnings.push(`${teamKey}: ${WEEK_LABELS[week]} sem dados.`);
    });
  });
  if (!rows.some((row) => normalize(row.join(" ")).includes("AVALIACAO"))) warnings.push("Coluna Avaliação Individual não identificada.");
  els.validationList.innerHTML = warnings.map((warning) => `<div>${warning}</div>`).join("");
}

function loadSavedGoals() {
  const saved = localStorage.getItem("indicadores-colaborador-metas");
  if (!saved) return;
  try {
    const parsed = JSON.parse(saved);
    Object.keys(parsed).forEach((teamKey) => {
      Object.assign(teams[teamKey].goals, parsed[teamKey]);
    });
  } catch {
    localStorage.removeItem("indicadores-colaborador-metas");
  }
}

function configureGoals() {
  const metric = prompt(`Digite a métrica para alterar:\n${Object.keys(teams[currentTeam].goals).join("\n")}`);
  if (!metric || !teams[currentTeam].goals[metric]) return;
  const current = teams[currentTeam].goals[metric].target;
  const target = prompt(`Nova meta para ${metric}:`, current);
  if (!target) return;
  teams[currentTeam].goals[metric].target = /^\d{1,2}:\d{2}(:\d{2})?$/.test(target) ? target : normalizeImportedValue(target);
  localStorage.setItem("indicadores-colaborador-metas", JSON.stringify({ N1: teams.N1.goals, N2: teams.N2.goals }));
  render();
}

function setupTheme() {
  const button = document.querySelector("#themeToggle");
  const savedTheme = localStorage.getItem("indicadores-theme") || "light";
  document.body.dataset.theme = savedTheme;
  button.textContent = savedTheme === "dark" ? "☀" : "☾";
  button.addEventListener("click", () => {
    const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
    document.body.dataset.theme = nextTheme;
    localStorage.setItem("indicadores-theme", nextTheme);
    button.textContent = nextTheme === "dark" ? "☀" : "☾";
  });
}

function clearImportedData() {
  sessionStorage.removeItem("indicadoresWorkbookRows");
  sessionStorage.removeItem("indicadoresWorkbookName");
  sessionStorage.removeItem("indicadoresImportedAt");
  ["N1", "N2"].forEach((teamKey) => {
    teams[teamKey].rows = [];
    teams[teamKey].rowsByWeek = { ultima: [], s1: [], s2: [], s3: [], s4: [] };
    teams[teamKey].goalsByWeek = {
      ultima: { ...teams[teamKey].goals },
      s1: { ...teams[teamKey].goals },
      s2: { ...teams[teamKey].goals },
      s3: { ...teams[teamKey].goals },
      s4: { ...teams[teamKey].goals }
    };
  });
  els.importStatus.textContent = "Nenhuma planilha importada nesta aba.";
  els.validationList.innerHTML = "";
  render();
}
