const occurrenceState = {
  workbook: {},
  monthOrder: [],
  selectedMonth: "",
  selectedCity: "",
  selectedReason: "",
  dateStart: "",
  dateEnd: "",
  filteredRows: [],
  charts: {}
};

const STORAGE_KEY = "sgpOccurrenceWorkbookV1";
const GOOGLE_SHEETS_OCCURRENCES_XLSX_URL = "https://docs.google.com/spreadsheets/d/1W9LUNFCcrmqDuKVqTJhv6uYOmJ0IbyPoErFYcvnvRfg/export?format=xlsx";
const GOOGLE_SHEETS_OCCURRENCES_NAME = "Google Sheets - Ocorrencias Mensais";

const RONDONIA_CITY_COORDS = {
  "ALTA FLORESTA": [-11.9283, -61.9953],
  "ALTA FLORESTA D OESTE": [-11.9283, -61.9953],
  "ALTO ALEGRE DOS PARECIS": [-12.1320, -61.8531],
  "ALTO PARAISO": [-9.7143, -63.3188],
  "ALVORADA DO OESTE": [-11.3463, -62.2847],
  "ARIQUEMES": [-9.9133, -63.0408],
  "BURITIS": [-10.1943, -63.8324],
  "CABIXI": [-13.4945, -60.5520],
  "CACAULANDIA": [-10.3389, -62.9032],
  "CACOAL": [-11.4386, -61.4472],
  "CAMPO NOVO DE RONDONIA": [-10.5684, -63.6241],
  "CANDEIAS DO JAMARI": [-8.7907, -63.7005],
  "CEREJEIRAS": [-13.1950, -60.8183],
  "CHUPINGUAIA": [-12.5611, -60.9019],
  "COLORADO DO OESTE": [-13.1178, -60.5450],
  "CORUMBIARA": [-12.9975, -60.9487],
  "COSTA MARQUES": [-12.4367, -64.2310],
  "CUJUBIM": [-9.3607, -62.5846],
  "ESPIGAO DO OESTE": [-11.5286, -61.0202],
  "GOVERNADOR JORGE TEIXEIRA": [-10.6121, -62.7405],
  "GUAJARA MIRIM": [-10.7828, -65.3394],
  "ITAPUA DO OESTE": [-9.1919, -63.1823],
  "JARU": [-10.4389, -62.4664],
  "JI PARANA": [-10.8777, -61.9322],
  "MACHADINHO": [-9.4256, -61.9996],
  "MACHADINHO DO OESTE": [-9.4256, -61.9996],
  "MINISTRO ANDREAZZA": [-11.1960, -61.5174],
  "MIRANTE DA SERRA": [-11.0290, -62.6696],
  "MONTE NEGRO": [-10.2631, -63.2947],
  "NOVA BRASILANDIA": [-11.7247, -62.3127],
  "NOVA BRASILANDIA DO OESTE": [-11.7247, -62.3127],
  "NOVA MAMORE": [-10.4077, -65.3346],
  "NOVA UNIAO": [-10.9068, -62.5555],
  "NOVO HORIZONTE DO OESTE": [-11.7097, -61.9944],
  "OURO PRETO": [-10.7481, -62.2158],
  "OURO PRETO DO OESTE": [-10.7481, -62.2158],
  "PARECIS": [-12.1754, -61.6032],
  "PIMENTA BUENO": [-11.6720, -61.1936],
  "PIMENTEIRAS DO OESTE": [-13.4823, -61.0471],
  "PORTO VELHO": [-8.7608, -63.9004],
  "PRESIDENTE MEDICI": [-11.1753, -61.9014],
  "PRIMAVERA DE RONDONIA": [-11.8295, -61.3153],
  "RIO CRESPO": [-9.6997, -62.9011],
  "ROLIM DE MOURA": [-11.7271, -61.7714],
  "CASTANHEIRAS": [-11.4253, -61.9482],
  "SANTA LUZIA D OESTE": [-11.9084, -61.7733],
  "SAO FRANCISCO": [-12.0638, -63.5680],
  "SAO FRANCISCO DO GUAPORE": [-12.0638, -63.5680],
  "SAO FELIPE": [-11.9023, -61.5026],
  "SAO FELIPE DO OESTE": [-11.9023, -61.5026],
  "SERINGUEIRAS": [-11.8055, -63.0182],
  "SAO MIGUEL": [-11.6956, -62.7192],
  "SAO MIGUEL DO GUAPORE": [-11.6956, -62.7192],
  "TANCREDOPOLIS": [-11.4386, -61.4472],
  "TEIXEIROPOLIS": [-10.9056, -62.2420],
  "THEOBROMA": [-10.2485, -62.3538],
  "URUPA": [-11.1261, -62.3639],
  "VALE DO ANARI": [-9.8622, -62.1876],
  "VALE DO PARAISO": [-10.4465, -62.1348],
  "VILHENA": [-12.7406, -60.1458]
};

const els = {
  fileInput: document.querySelector("#fileInput"),
  themeToggle: document.querySelector("#themeToggle"),
  clearButton: document.querySelector("#clearButton"),
  importStatus: document.querySelector("#importStatus"),
  monthSelect: document.querySelector("#monthSelect"),
  searchInput: document.querySelector("#searchInput"),
  dateStart: document.querySelector("#dateStart"),
  dateEnd: document.querySelector("#dateEnd"),
  clearDateButton: document.querySelector("#clearDateButton"),
  activeFilters: document.querySelector("#activeFilters"),
  summaryStrip: document.querySelector("#summaryStrip"),
  cityHeatmap: document.querySelector("#cityHeatmap"),
  occurrenceBody: document.querySelector("#occurrenceBody"),
  exportButton: document.querySelector("#exportButton")
};

document.addEventListener("DOMContentLoaded", () => {
  setupTheme();
  els.fileInput?.addEventListener("change", handleImport);
  els.clearButton.addEventListener("click", clearData);
  els.monthSelect.addEventListener("change", () => {
    occurrenceState.selectedMonth = els.monthSelect.value;
    occurrenceState.selectedCity = "";
    occurrenceState.selectedReason = "";
    render();
  });
  els.searchInput.addEventListener("input", render);
  els.dateStart.addEventListener("change", handleDateFilterChange);
  els.dateEnd.addEventListener("change", handleDateFilterChange);
  els.clearDateButton.addEventListener("click", clearDateFilter);
  els.exportButton.addEventListener("click", exportFilteredCsv);
  tryAutoLoad();
});

async function tryAutoLoad() {
  els.importStatus.textContent = "Carregando ocorrências da planilha e dos lançamentos manuais...";

  const sources = [];
  const googleParsed = await loadGoogleSheetsOccurrences();
  if (googleParsed?.monthOrder?.length) {
    sources.push(googleParsed);
  }

  if (!sources.length) {
    const sessionParsed = loadSessionOccurrences();
    if (sessionParsed?.monthOrder?.length) sources.push(sessionParsed);
  }

  if (!sources.length) {
    const localParsed = await loadLocalOccurrencesFile();
    if (localParsed?.monthOrder?.length) sources.push(localParsed);
  }

  const manualParsed = await loadManualOccurrences();
  if (manualParsed?.monthOrder?.length) {
    sources.push(manualParsed);
  }

  const merged = mergeOccurrenceSources(sources);
  if (merged.monthOrder.length) {
    applyWorkbook(merged, "Ocorrências carregadas da planilha e dos lançamentos manuais.");
    return;
  }

  els.importStatus.textContent = "Importe a planilha OCORRENCIAS MENSAIS.xlsx ou cadastre ocorrências manuais para visualizar a dashboard.";
  render();
}

async function loadManualOccurrences() {
  try {
    for (let attempt = 0; attempt < 80; attempt += 1) {
      if (window.SGPAuth?.loadManualOccurrences && document.documentElement.dataset.authReady === "true") break;
      await new Promise((resolve) => window.setTimeout(resolve, 100));
    }

    const saved = await window.SGPAuth?.loadManualOccurrences?.();
    if (!saved?.workbook || !saved?.monthOrder?.length) return false;

    const parsed = {
      workbook: saved.workbook,
      monthOrder: saved.monthOrder.filter((key) => saved.workbook[key])
    };
    if (!parsed.monthOrder.length) return false;

    return normalizeOccurrenceWorkbookMonths(parsed);
  } catch (error) {
    console.error(error);
    return null;
  }
}

async function loadGoogleSheetsOccurrences() {
  try {
    const response = await fetch(`${GOOGLE_SHEETS_OCCURRENCES_XLSX_URL}&_=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Google Sheets retornou ${response.status}.`);
    const buffer = await response.arrayBuffer();
    return normalizeOccurrenceWorkbookMonths(parseWorkbook(buffer, "array"));
  } catch (error) {
    console.error(error);
    return null;
  }
}

function loadSessionOccurrences() {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    return normalizeOccurrenceWorkbookMonths({
      workbook: parsed.workbook || {},
      monthOrder: (parsed.monthOrder || []).filter((key) => parsed.workbook?.[key])
    });
  } catch (error) {
    console.error(error);
    return null;
  }
}

async function loadLocalOccurrencesFile() {
  try {
    const response = await fetch("OCORRENCIAS MENSAIS.xlsx", { cache: "no-store" });
    if (!response.ok) throw new Error("Arquivo não encontrado.");
    const buffer = await response.arrayBuffer();
    return normalizeOccurrenceWorkbookMonths(parseWorkbook(buffer, "array"));
  } catch (error) {
    console.error(error);
    return null;
  }
}

async function handleImport(event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const buffer = await file.arrayBuffer();
    applyWorkbook(parseWorkbook(buffer, "array"), `${file.name} importado com sucesso.`);
  } catch (error) {
    console.error(error);
    els.importStatus.textContent = "Não foi possível ler a planilha de ocorrências.";
  }
}

function parseWorkbook(content, type) {
  const workbook = XLSX.read(content, { type, cellDates: true });
  const parsed = {};
  const monthOrder = [];

  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" });
    const headerIndex = rows.findIndex((row) => row.map(normalizeHeader).includes("ocorrencias"));
    if (headerIndex === -1) return;

    const headers = rows[headerIndex].map(normalizeHeader);
    const monthKey = normalizeMonthKey(sheetName);
    const label = clean(sheetName).replace(/\s+/g, " ");
    const records = [];

    rows.slice(headerIndex + 1).forEach((row) => {
      if (!row.some((cell) => clean(cell))) return;
      const record = {};
      headers.forEach((header, index) => {
        record[header] = clean(row[index]);
      });

      const occurrence = firstFilled(record.ocorrencias, record.ocorrencia, record.ocorr_ncias);
      const city = normalizeCity(firstFilled(record.cidade));
      const reason = firstFilled(record.motivo);
      if (!occurrence || !city) return;
      if (isTotalRow(occurrence) || isTotalRow(city)) return;

      const downtime = firstFilled(record.tempo_off, record.tempo) || "-";
      records.push({
        occurrence,
        date: firstFilled(record.data),
        branch: firstFilled(record.filial) || "-",
        city,
        reason: reason || "-",
        downtime,
        downtimeDuration: offlineDurationLabel(downtime)
      });
    });

    if (!records.length) return;
    parsed[monthKey] = { key: monthKey, label, records };
    monthOrder.push(monthKey);
  });

  return { workbook: parsed, monthOrder };
}

function applyWorkbook(parsed, message) {
  occurrenceState.workbook = parsed.workbook;
  occurrenceState.monthOrder = parsed.monthOrder;
  occurrenceState.selectedMonth = parsed.monthOrder.at(-1) || "";
  occurrenceState.selectedCity = "";
  occurrenceState.selectedReason = "";
  occurrenceState.dateStart = "";
  occurrenceState.dateEnd = "";
  els.dateStart.value = "";
  els.dateEnd.value = "";
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  els.importStatus.textContent = `${message} ${totalRows(parsed.workbook).toLocaleString("pt-BR")} ocorrência(s) lida(s).`;
  render();
}

function render() {
  renderMonthOptions();
  occurrenceState.filteredRows = filterRows();
  renderActiveFilters();
  renderSummary();
  renderCharts();
  renderTable();
}

function renderMonthOptions() {
  els.monthSelect.innerHTML = occurrenceState.monthOrder.length
    ? occurrenceState.monthOrder.map((key) => `<option value="${key}">${occurrenceState.workbook[key].label}</option>`).join("")
    : '<option value="">Selecione o mês</option>';
  els.monthSelect.value = occurrenceState.selectedMonth;
}

function filterRows() {
  const month = occurrenceState.workbook[occurrenceState.selectedMonth];
  const search = normalizeText(els.searchInput.value);
  if (!month) return [];
  return month.records.filter((row) => {
    if (!dateBelongsToSelectedMonth(row.date)) return false;
    if (occurrenceState.selectedCity && row.city !== occurrenceState.selectedCity) return false;
    if (occurrenceState.selectedReason && row.reason !== occurrenceState.selectedReason) return false;
    if (!dateMatches(row.date)) return false;
    if (!search) return true;
    return [row.occurrence, row.branch, row.city, row.reason, row.downtime, offlineDurationLabel(row.downtime)].some((value) => normalizeText(value).includes(search));
  }).sort(compareOccurrenceDateAsc);
}

function renderActiveFilters() {
  const filters = [
    occurrenceState.selectedCity ? { key: "city", label: `Cidade: ${occurrenceState.selectedCity}` } : null,
    occurrenceState.selectedReason ? { key: "reason", label: `Motivo: ${occurrenceState.selectedReason}` } : null,
    occurrenceState.dateStart || occurrenceState.dateEnd ? { key: "date", label: `Data: ${dateFilterLabel()}` } : null
  ].filter(Boolean);

  if (!filters.length) {
    els.activeFilters.innerHTML = "";
    return;
  }

  els.activeFilters.innerHTML = `
    <span>Filtros do gráfico</span>
    ${filters.map((filter) => `<button type="button" data-clear-filter="${filter.key}">${filter.label} ×</button>`).join("")}
    <button type="button" class="clear-all" data-clear-filter="all">Limpar filtros</button>
  `;

  els.activeFilters.querySelectorAll("[data-clear-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.clearFilter;
      if (key === "city" || key === "all") occurrenceState.selectedCity = "";
      if (key === "reason" || key === "all") occurrenceState.selectedReason = "";
      if (key === "date" || key === "all") clearDateFilter(false);
      render();
    });
  });
}

function renderSummary() {
  const rows = occurrenceState.filteredRows;
  const branchRanking = rankBy(rows, "branch");
  const cityRanking = rankBy(rows, "city");
  const reasonRanking = rankBy(rows, "reason");
  const criticalBranch = branchRanking[0];
  const criticalCity = cityRanking[0];
  const criticalReason = reasonRanking[0];

  els.summaryStrip.innerHTML = [
    ["Ocorrências no mês", rows.length.toLocaleString("pt-BR"), occurrenceState.workbook[occurrenceState.selectedMonth]?.label || "-"],
    ["Filial mais crítica", criticalBranch?.name || "-", criticalBranch ? `${criticalBranch.total} ocorrência(s)` : ""],
    ["Cidade mais crítica", criticalCity?.name || "-", criticalCity ? `${criticalCity.total} ocorrência(s)` : ""],
    ["Motivo mais frequente", criticalReason?.name || "-", criticalReason ? `${criticalReason.total} ocorrência(s)` : ""],
    ["Cidades impactadas", uniqueCount(rows.map((row) => row.city)).toLocaleString("pt-BR"), ""]
  ].map(([label, value, note], index) => `
    <article class="insight-card ${index === 1 ? "critical" : ""}">
      <span>${label}</span>
      <strong>${value}</strong>
      ${note ? `<small>${note}</small>` : ""}
    </article>
  `).join("");
}

function renderCharts() {
  renderCityHeatmap();
  renderReasonChart();
  renderOccurrenceTrendChart();
  renderReasonVolumeChart();
}

function renderCityChart() {
  const rows = rankBy(baseRowsForCharts("city"), "city").slice(0, 12);
  occurrenceState.charts.city?.destroy();
  occurrenceState.charts.city = new Chart(document.querySelector("#cityChart"), {
    type: "bar",
    data: {
      labels: rows.map((item) => shorten(item.name, 24)),
      datasets: [{
        label: "Ocorrências",
        data: rows.map((item) => item.total),
        backgroundColor: rows.map((_, index) => index === 0 ? "rgba(214, 69, 69, 0.78)" : "rgba(0, 156, 103, 0.72)"),
        borderColor: rows.map((_, index) => index === 0 ? "#d64545" : "#009c67"),
        borderWidth: 1,
        borderRadius: 6
      }]
    },
    options: {
      ...chartOptions(false),
      onClick: (_, elements) => {
        const index = elements[0]?.index;
        if (index === undefined) return;
        occurrenceState.selectedCity = occurrenceState.selectedCity === rows[index].name ? "" : rows[index].name;
        render();
      }
    }
  });
}

function renderCityPieChart() {
  const rows = rankBy(baseRowsForCharts("city"), "city").slice(0, 8);
  occurrenceState.charts.cityPie?.destroy();
  occurrenceState.charts.cityPie = new Chart(document.querySelector("#cityPieChart"), {
    type: "doughnut",
    data: {
      labels: rows.map((item) => shorten(item.name, 24)),
      datasets: [{
        data: rows.map((item) => item.total),
        backgroundColor: ["#d64545", "#009c67", "#45b7e8", "#f2b84b", "#7a63d8", "#1f7a8c", "#92c56e", "#f27f5d"],
        borderColor: document.body.dataset.theme === "dark" ? "#111821" : "#ffffff",
        borderWidth: 2
      }]
    },
    options: {
      ...chartOptions(true),
      onClick: (_, elements) => {
        const index = elements[0]?.index;
        if (index === undefined) return;
        occurrenceState.selectedCity = occurrenceState.selectedCity === rows[index].name ? "" : rows[index].name;
        render();
      }
    }
  });
}

function renderCityHeatmap() {
  occurrenceState.charts.cityPie?.destroy();
  occurrenceState.charts.cityPie = null;
  occurrenceState.charts.cityMap?.remove?.();
  occurrenceState.charts.cityMap = null;

  const rows = rankBy(baseRowsForCharts("city"), "city");
  if (!els.cityHeatmap) return;
  if (!rows.length) {
    els.cityHeatmap.innerHTML = '<div class="heatmap-empty">Nenhuma cidade encontrada para os filtros atuais.</div>';
    return;
  }

  const mappedRows = rows
    .map((item) => ({ ...item, coords: coordinatesForCity(item.name) }))
    .filter((item) => item.coords);
  const unmappedRows = rows.filter((item) => !coordinatesForCity(item.name)).slice(0, 6);
  if (!window.L || !mappedRows.length) {
    renderCityFallbackHeatmap(rows.slice(0, 18));
    return;
  }

  const max = Math.max(...rows.map((item) => item.total), 1);
  const total = rows.reduce((sum, item) => sum + item.total, 0);
  els.cityHeatmap.innerHTML = `
    <div class="heatmap-legend">
      <span>Menor impacto</span>
      <div class="heatmap-scale" aria-hidden="true"></div>
      <span>Maior impacto</span>
    </div>
    <div class="ro-map-layout">
      <div class="ro-map" id="roHeatMap"></div>
      <aside class="ro-map-side">
        <h3>Cidades mais afetadas</h3>
        <div class="ro-map-ranking">
          ${rows.slice(0, 8).map((item, index) => {
            const share = total ? (item.total / total) * 100 : 0;
            const selected = occurrenceState.selectedCity === item.name;
            return `
              <button type="button" class="${selected ? "selected" : ""}" data-city="${escapeHtml(item.name)}">
                <span>#${index + 1}</span>
                <strong>${escapeHtml(item.name)}</strong>
                <small>${item.total.toLocaleString("pt-BR")} ocorrencia(s) · ${share.toFixed(1).replace(".", ",")}%</small>
              </button>
            `;
          }).join("")}
        </div>
        ${unmappedRows.length ? `
          <div class="ro-map-unmapped">
            <strong>Sem ponto no mapa</strong>
            <span>${unmappedRows.map((item) => `${escapeHtml(item.name)} (${item.total})`).join(", ")}</span>
          </div>
        ` : ""}
      </aside>
    </div>
  `;

  els.cityHeatmap.querySelectorAll("[data-city]").forEach((button) => {
    button.addEventListener("click", () => {
      const city = button.dataset.city;
      occurrenceState.selectedCity = occurrenceState.selectedCity === city ? "" : city;
      render();
    });
  });

  requestAnimationFrame(() => renderRondoniaMap(mappedRows, max));
}

function renderCityFallbackHeatmap(rows) {
  const max = Math.max(...rows.map((item) => item.total), 1);
  const total = rows.reduce((sum, item) => sum + item.total, 0);
  els.cityHeatmap.innerHTML = `
    <div class="heatmap-legend">
      <span>Menor impacto</span>
      <div class="heatmap-scale" aria-hidden="true"></div>
      <span>Maior impacto</span>
    </div>
    <div class="heatmap-grid">
      ${rows.map((item, index) => {
        const intensity = item.total / max;
        const share = total ? (item.total / total) * 100 : 0;
        const selected = occurrenceState.selectedCity === item.name;
        return `
          <button
            type="button"
            class="heatmap-cell ${selected ? "selected" : ""}"
            style="${heatmapStyle(intensity)}"
            data-city="${escapeHtml(item.name)}"
            aria-label="${escapeHtml(item.name)} com ${item.total} ocorrencias"
          >
            <span class="heatmap-rank">#${index + 1}</span>
            <strong>${escapeHtml(item.name)}</strong>
            <span>${item.total.toLocaleString("pt-BR")} ocorrencia(s)</span>
            <small>${share.toFixed(1).replace(".", ",")}% do filtro</small>
          </button>
        `;
      }).join("")}
    </div>
  `;
  els.cityHeatmap.querySelectorAll("[data-city]").forEach((button) => {
    button.addEventListener("click", () => {
      const city = button.dataset.city;
      occurrenceState.selectedCity = occurrenceState.selectedCity === city ? "" : city;
      render();
    });
  });
}

function renderRondoniaMap(rows, max) {
  const container = document.querySelector("#roHeatMap");
  if (!container || !window.L) return;

  const map = L.map(container, {
    zoomControl: true,
    attributionControl: false,
    scrollWheelZoom: false
  }).setView([-10.95, -62.85], 7);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 12
  }).addTo(map);

  if (L.heatLayer) {
    L.heatLayer(rows.map((item) => [
      item.coords[0],
      item.coords[1],
      Math.max(0.25, item.total / max)
    ]), {
      radius: 42,
      blur: 30,
      maxZoom: 9,
      gradient: {
        0.2: "#3bea61",
        0.48: "#f1f64a",
        0.72: "#ff981f",
        1: "#ff2f2f"
      }
    }).addTo(map);
  }

  const bounds = [];
  rows.forEach((item) => {
    bounds.push(item.coords);
    const selected = occurrenceState.selectedCity === item.name;
    const radius = 8 + Math.round((item.total / max) * 18);
    const marker = L.circleMarker(item.coords, {
      radius,
      color: selected ? "#102033" : "#d64545",
      weight: selected ? 3 : 1,
      fillColor: selected ? "#ff2f2f" : "#f2b84b",
      fillOpacity: selected ? 0.86 : 0.56
    }).addTo(map);
    marker.bindTooltip(`<strong>${escapeHtml(item.name)}</strong><br>${item.total.toLocaleString("pt-BR")} ocorrência(s)`, {
      direction: "top",
      sticky: true
    });
    marker.on("click", () => {
      occurrenceState.selectedCity = occurrenceState.selectedCity === item.name ? "" : item.name;
      render();
    });
  });

  if (bounds.length > 1) {
    map.fitBounds(bounds, { padding: [28, 28], maxZoom: 8 });
  }
  setTimeout(() => map.invalidateSize(), 120);
  occurrenceState.charts.cityMap = map;
}

function coordinatesForCity(city) {
  const key = cityCoordinateKey(city);
  return RONDONIA_CITY_COORDS[key] || null;
}

function cityCoordinateKey(city) {
  return normalizeText(city)
    .replace(/_/g, " ")
    .replace(/\bD OESTE\b/gi, "DO OESTE")
    .toUpperCase();
}

function heatmapStyle(intensity) {
  const alpha = 0.18 + (intensity * 0.72);
  const borderAlpha = 0.25 + (intensity * 0.55);
  return `--heat-alpha: ${alpha.toFixed(2)}; --heat-border-alpha: ${borderAlpha.toFixed(2)};`;
}

function renderReasonChart() {
  const rows = reasonImpactRows(baseRowsForCharts("reason")).slice(0, 12);
  const color = document.body.dataset.theme === "dark" ? "#dfe8f2" : "#567086";
  const grid = document.body.dataset.theme === "dark" ? "rgba(145,160,178,0.16)" : "rgba(207,226,238,0.72)";
  const selectedColor = document.body.dataset.theme === "dark" ? "#ff7373" : "#d64545";
  const maxTotal = Math.max(...rows.map((item) => item.total), 1);
  occurrenceState.charts.reason?.destroy();
  occurrenceState.charts.reason = new Chart(document.querySelector("#reasonChart"), {
    type: "bubble",
    data: {
      datasets: [{
        label: "Causas",
        data: rows.map((item) => ({
          x: item.total,
          y: item.averageOfflineHours,
          r: bubbleRadius(item.total, maxTotal),
          reason: item.name,
          total: item.total,
          knownDurations: item.knownDurations,
          averageOfflineLabel: secondsToDurationLabel(item.averageOfflineSeconds)
        })),
        backgroundColor: rows.map((item) => occurrenceState.selectedReason === item.name ? "rgba(214, 69, 69, 0.78)" : "rgba(69, 183, 232, 0.46)"),
        borderColor: rows.map((item) => occurrenceState.selectedReason === item.name ? selectedColor : "rgba(0, 156, 103, 0.82)"),
        borderWidth: rows.map((item) => occurrenceState.selectedReason === item.name ? 3 : 1.5)
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => {
              const point = context.raw;
              return [
                point.reason,
                `Ocorrências: ${point.total.toLocaleString("pt-BR")}`,
                `Tempo médio offline: ${point.averageOfflineLabel}`,
                `Com duração calculada: ${point.knownDurations.toLocaleString("pt-BR")}`
              ];
            }
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          title: { display: true, text: "Ocorrências", color },
          ticks: { color, precision: 0 },
          grid: { color: grid }
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: "Tempo médio offline", color },
          ticks: {
            color,
            callback: (value) => `${Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}h`
          },
          grid: { color: grid }
        }
      },
      onClick: (_, elements) => {
        const index = elements[0]?.index;
        if (index === undefined) return;
        occurrenceState.selectedReason = occurrenceState.selectedReason === rows[index].name ? "" : rows[index].name;
        render();
      }
    }
  });
}

function renderOccurrenceTrendChart() {
  const color = document.body.dataset.theme === "dark" ? "#dfe8f2" : "#567086";
  const grid = document.body.dataset.theme === "dark" ? "rgba(145,160,178,0.16)" : "rgba(207,226,238,0.72)";
  const rows = trendRows();
  occurrenceState.charts.trend?.destroy();
  occurrenceState.charts.trend = new Chart(document.querySelector("#occurrenceTrendChart"), {
    type: "line",
    data: {
      labels: rows.map((item) => item.label),
      datasets: [{
        label: "Ocorrências",
        data: rows.map((item) => item.total),
        borderColor: "#243c9f",
        backgroundColor: "rgba(36, 60, 159, 0.14)",
        pointBackgroundColor: rows.map((item) => item.key === occurrenceState.selectedMonth ? "#d64545" : "#243c9f"),
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointRadius: rows.map((item) => item.key === occurrenceState.selectedMonth ? 5 : 4),
        pointHoverRadius: 6,
        borderWidth: 3,
        tension: 0.32,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => `${context.raw.toLocaleString("pt-BR")} ocorrência(s)`
          }
        }
      },
      scales: {
        x: { ticks: { color, maxRotation: 0 }, grid: { color: grid } },
        y: { beginAtZero: true, ticks: { color, precision: 0 }, grid: { color: grid } }
      },
      onClick: (_, elements) => {
        const index = elements[0]?.index;
        if (index === undefined) return;
        occurrenceState.selectedMonth = rows[index].key;
        occurrenceState.selectedCity = "";
        occurrenceState.selectedReason = "";
        render();
      }
    }
  });
}

function renderReasonVolumeChart() {
  const color = document.body.dataset.theme === "dark" ? "#dfe8f2" : "#567086";
  const grid = document.body.dataset.theme === "dark" ? "rgba(145,160,178,0.16)" : "rgba(207,226,238,0.72)";
  const rows = rankBy(baseRowsForCharts("reason"), "reason").slice(0, 7);

  occurrenceState.charts.reasonVolume?.destroy();
  occurrenceState.charts.reasonVolume = new Chart(document.querySelector("#reasonVolumeChart"), {
    type: "bar",
    data: {
      labels: rows.map((item) => shorten(item.name, 26)),
      datasets: [{
        label: "Ocorrências",
        data: rows.map((item) => item.total),
        backgroundColor: rows.map((item, index) => {
          if (occurrenceState.selectedReason === item.name) return "rgba(214, 69, 69, 0.82)";
          return index === 0 ? "rgba(242, 184, 75, 0.78)" : "rgba(0, 156, 103, 0.68)";
        }),
        borderColor: rows.map((item) => occurrenceState.selectedReason === item.name ? "#d64545" : "rgba(0, 156, 103, 0.88)"),
        borderWidth: 1.5,
        borderRadius: 7
      }]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => `${context.raw.toLocaleString("pt-BR")} ocorrência(s)`
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: { color, precision: 0 },
          grid: { color: grid }
        },
        y: {
          ticks: { color },
          grid: { display: false }
        }
      },
      onClick: (_, elements) => {
        const index = elements[0]?.index;
        if (index === undefined) return;
        occurrenceState.selectedReason = occurrenceState.selectedReason === rows[index].name ? "" : rows[index].name;
        render();
      }
    }
  });
}

function trendRows() {
  return occurrenceState.monthOrder.map((key) => {
    const month = occurrenceState.workbook[key];
    return {
      key,
      label: shortMonthLabel(month?.label || key),
      total: month?.records?.length || 0
    };
  });
}

function shortMonthLabel(label) {
  const text = clean(label).replace(/20(\d{2})$/, "$1");
  const normalized = normalizeText(text);
  const names = [
    ["janeiro", "Jan"], ["fevereiro", "Fev"], ["marco", "Mar"], ["abril", "Abr"],
    ["maio", "Mai"], ["junho", "Jun"], ["julho", "Jul"], ["agosto", "Ago"],
    ["setembro", "Set"], ["outubro", "Out"], ["novembro", "Nov"], ["dezembro", "Dez"]
  ];
  return names.find(([key]) => normalized.includes(key))?.[1] || shorten(text, 8);
}

function bubbleRadius(total, maxTotal) {
  return 6 + Math.round(Math.sqrt(total / maxTotal) * 14);
}

function reasonImpactRows(rows) {
  const grouped = new Map();
  rows.forEach((row) => {
    const name = clean(row.reason) || "Não informado";
    if (!grouped.has(name)) {
      grouped.set(name, {
        name,
        total: 0,
        offlineSeconds: 0,
        knownDurations: 0
      });
    }

    const group = grouped.get(name);
    group.total += 1;
    const duration = offlineDurationSeconds(row.downtime);
    if (Number.isFinite(duration)) {
      group.offlineSeconds += duration;
      group.knownDurations += 1;
    }
  });

  return [...grouped.values()]
    .map((item) => {
      const averageOfflineSeconds = item.knownDurations ? Math.round(item.offlineSeconds / item.knownDurations) : 0;
      const averageOfflineMinutes = averageOfflineSeconds / 60;
      return {
        ...item,
        averageOfflineSeconds,
        averageOfflineMinutes,
        averageOfflineHours: Number((averageOfflineMinutes / 60).toFixed(2))
      };
    })
    .sort((a, b) => b.total - a.total || b.averageOfflineMinutes - a.averageOfflineMinutes || a.name.localeCompare(b.name));
}

function secondsToDurationLabel(totalSeconds) {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return "00:00:00:00";
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return [days, hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

function baseRowsForCharts(ignoreKey) {
  const month = occurrenceState.workbook[occurrenceState.selectedMonth];
  const search = normalizeText(els.searchInput.value);
  if (!month) return [];
  return month.records.filter((row) => {
    if (!dateBelongsToSelectedMonth(row.date)) return false;
    if (ignoreKey !== "city" && occurrenceState.selectedCity && row.city !== occurrenceState.selectedCity) return false;
    if (ignoreKey !== "reason" && occurrenceState.selectedReason && row.reason !== occurrenceState.selectedReason) return false;
    if (!dateMatches(row.date)) return false;
    if (!search) return true;
    return [row.occurrence, row.branch, row.city, row.reason, row.downtime, offlineDurationLabel(row.downtime)].some((value) => normalizeText(value).includes(search));
  }).sort(compareOccurrenceDateAsc);
}

function renderTable() {
  if (!occurrenceState.filteredRows.length) {
    els.occurrenceBody.innerHTML = '<tr><td colspan="7">Nenhuma ocorrência encontrada para os filtros atuais.</td></tr>';
    return;
  }

  els.occurrenceBody.innerHTML = occurrenceState.filteredRows
    .slice()
    .sort(compareOccurrenceDateAsc)
    .map((row) => `
      <tr>
        <td>${formatDate(row.date)}</td>
        <td>${row.branch}</td>
        <td>${row.city}</td>
        <td>${row.occurrence}</td>
        <td>${row.reason}</td>
        <td>${row.downtime}</td>
        <td class="offline-duration ${offlineDurationClass(row.downtime)}">${offlineDurationLabel(row.downtime)}</td>
      </tr>
    `).join("");
}

function exportFilteredCsv() {
  const rows = occurrenceState.filteredRows;
  if (!rows.length) return;
  const header = ["Data", "Filial", "Cidade", "Ocorrência", "Motivo", "Tempo off", "Duração offline"];
  const csvRows = [header, ...rows.map((row) => [formatDate(row.date), row.branch, row.city, row.occurrence, row.reason, row.downtime, offlineDurationLabel(row.downtime)])];
  const csv = csvRows.map((row) => row.map(csvCell).join(";")).join("\n");
  const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ocorrencias-${occurrenceState.workbook[occurrenceState.selectedMonth]?.label || "mes"}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function chartOptions(isPie) {
  const color = document.body.dataset.theme === "dark" ? "#dfe8f2" : "#567086";
  const grid = document.body.dataset.theme === "dark" ? "rgba(145,160,178,0.18)" : "rgba(207,226,238,0.8)";
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: isPie, position: "bottom", labels: { color } }
    },
    scales: isPie ? {} : {
      x: { ticks: { color }, grid: { color: grid } },
      y: { beginAtZero: true, ticks: { color, precision: 0 }, grid: { color: grid } }
    }
  };
}

function rankBy(rows, key) {
  const grouped = new Map();
  rows.forEach((row) => {
    const value = clean(row[key]) || "Não informado";
    grouped.set(value, (grouped.get(value) || 0) + 1);
  });
  return [...grouped.entries()]
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}

function normalizeCity(value) {
  return clean(value)
    .replace(/\s*\/\s*/g, " / ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeMonthKey(value) {
  return canonicalMonthKey(value) || normalizeText(value).replace(/_/g, "-");
}

function normalizeOccurrenceWorkbookMonths(parsed) {
  const workbook = {};
  const monthOrder = [];

  (parsed.monthOrder || []).forEach((key) => {
    const month = parsed.workbook?.[key];
    if (!month) return;
    const canonicalKey = canonicalMonthKey(month.label || key) || canonicalMonthKey(key) || key;
    if (!workbook[canonicalKey]) {
      workbook[canonicalKey] = {
        ...month,
        key: canonicalKey,
        label: canonicalMonthLabel(month.label || key),
        records: []
      };
      monthOrder.push(canonicalKey);
    }
    workbook[canonicalKey].records.push(...(month.records || []));
  });

  return { workbook, monthOrder };
}

function mergeOccurrenceSources(sources) {
  const workbook = {};
  const monthOrder = [];

  sources.filter(Boolean).forEach((source) => {
    const normalizedSource = normalizeOccurrenceWorkbookMonths(source);
    (normalizedSource.monthOrder || []).forEach((monthKey) => {
      const month = normalizedSource.workbook?.[monthKey];
      if (!month) return;

      if (!workbook[monthKey]) {
        workbook[monthKey] = {
          key: monthKey,
          label: month.label || canonicalMonthLabel(monthKey),
          records: []
        };
        monthOrder.push(monthKey);
      }

      const known = new Set(workbook[monthKey].records.map(occurrenceFingerprint));
      (month.records || []).forEach((record) => {
        const normalized = normalizeOccurrenceRecord(record);
        const targetMonthKey = monthKeyFromDate(normalized.date) || monthKey;
        if (!workbook[targetMonthKey]) {
          workbook[targetMonthKey] = {
            key: targetMonthKey,
            label: monthLabelFromDate(normalized.date) || canonicalMonthLabel(targetMonthKey) || month.label || targetMonthKey,
            records: []
          };
          monthOrder.push(targetMonthKey);
        }
        const targetKnown = targetMonthKey === monthKey
          ? known
          : new Set(workbook[targetMonthKey].records.map(occurrenceFingerprint));
        const fingerprint = occurrenceFingerprint(normalized);
        if (targetKnown.has(fingerprint)) return;
        targetKnown.add(fingerprint);
        workbook[targetMonthKey].records.push(normalized);
      });
    });
  });

  return {
    workbook,
    monthOrder: sortMonthKeys(monthOrder.filter((key, index, items) =>
      workbook[key]?.records?.length && items.indexOf(key) === index
    ))
  };
}

function normalizeOccurrenceRecord(record) {
  const downtime = clean(record?.downtime) || "-";
  return {
    occurrence: clean(record?.occurrence),
    date: clean(record?.date),
    branch: clean(record?.branch) || "-",
    city: normalizeCity(record?.city),
    reason: clean(record?.reason) || "-",
    downtime,
    downtimeDuration: offlineDurationLabel(downtime)
  };
}

function occurrenceFingerprint(record) {
  return [
    formatDate(record.date),
    record.branch,
    record.city,
    record.occurrence,
    record.reason,
    normalizeDowntimeText(record.downtime)
  ].map(normalizeText).join("|");
}

function monthKeyFromDate(value) {
  const date = parseDate(value);
  if (!date) return "";
  return `${monthSlugByNumber(date.getMonth() + 1)}-${date.getFullYear()}`;
}

function monthLabelFromDate(value) {
  const date = parseDate(value);
  if (!date) return "";
  return `${monthLabelByNumber(date.getMonth() + 1)} ${date.getFullYear()}`;
}

function sortMonthKeys(keys) {
  return [...keys].sort((a, b) => monthSortValue(a) - monthSortValue(b));
}

function monthSortValue(key) {
  const parsed = parseMonthYear(key);
  return parsed ? Number(parsed.year) * 100 + parsed.monthNumber : 999999;
}

function monthSlugByNumber(number) {
  return ["", "janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"][number] || "mes";
}

function monthLabelByNumber(number) {
  return ["", "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"][number] || "Mes";
}

function canonicalMonthKey(value) {
  const parsed = parseMonthYear(value);
  return parsed ? `${parsed.monthSlug}-${parsed.year}` : "";
}

function canonicalMonthLabel(value) {
  const parsed = parseMonthYear(value);
  return parsed ? `${parsed.monthLabel} ${parsed.year}` : clean(value);
}

function parseMonthYear(value) {
  const text = normalizeText(value).replace(/_/g, " ");
  const monthAliases = [
    ["janeiro", "janeiro", "Janeiro", 1],
    ["fevereiro", "fevereiro", "Fevereiro", 2],
    ["marco", "marco", "Março", 3],
    ["abril", "abril", "Abril", 4],
    ["maio", "maio", "Maio", 5],
    ["junho", "junho", "Junho", 6],
    ["junnho", "junho", "Junho", 6],
    ["julho", "julho", "Julho", 7],
    ["agosto", "agosto", "Agosto", 8],
    ["setembro", "setembro", "Setembro", 9],
    ["outubro", "outubro", "Outubro", 10],
    ["novembro", "novembro", "Novembro", 11],
    ["dezembro", "dezembro", "Dezembro", 12]
  ];
  const month = monthAliases.find(([alias]) => text.includes(alias));
  const yearMatch = text.match(/20\d{2}|25|26/);
  if (!month || !yearMatch) return null;
  const year = yearMatch[0].length === 2 ? `20${yearMatch[0]}` : yearMatch[0];
  return { monthSlug: month[1], monthLabel: month[2], monthNumber: month[3], year };
}

function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const text = clean(value);
  const isoMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }
  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (match) {
    const [, left, right, year] = match;
    let day = Number(left);
    let month = Number(right);
    if (month > 12 && day <= 12) {
      day = Number(right);
      month = Number(left);
    }
    const fullYear = Number(year.length === 2 ? `20${year}` : year);
    return new Date(fullYear, month - 1, day);
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(value) {
  const date = parseDate(value);
  if (!date) return value || "-";
  return date.toLocaleDateString("pt-BR");
}

function dateBelongsToSelectedMonth(value) {
  const selected = selectedMonthMeta();
  if (!selected) return true;
  const date = parseDate(value);
  if (!date) return false;
  return date.getFullYear() === Number(selected.year)
    && date.getMonth() + 1 === selected.monthNumber;
}

function selectedMonthMeta() {
  const month = occurrenceState.workbook[occurrenceState.selectedMonth];
  return parseMonthYear(month?.label || occurrenceState.selectedMonth)
    || parseMonthYear(occurrenceState.selectedMonth);
}

function compareOccurrenceDateAsc(a, b) {
  const left = parseDate(a.date);
  const right = parseDate(b.date);
  if (left && right) return left - right;
  if (left) return -1;
  if (right) return 1;
  return clean(a.occurrence).localeCompare(clean(b.occurrence), "pt-BR");
}

function handleDateFilterChange() {
  occurrenceState.dateStart = els.dateStart.value;
  occurrenceState.dateEnd = els.dateEnd.value;
  render();
}

function clearDateFilter(shouldRender = true) {
  occurrenceState.dateStart = "";
  occurrenceState.dateEnd = "";
  els.dateStart.value = "";
  els.dateEnd.value = "";
  if (shouldRender) render();
}

function dateMatches(value) {
  if (!occurrenceState.dateStart && !occurrenceState.dateEnd) return true;
  const date = parseDate(value);
  if (!date) return false;
  const start = occurrenceState.dateStart ? new Date(`${occurrenceState.dateStart}T00:00:00`) : null;
  const end = occurrenceState.dateEnd ? new Date(`${occurrenceState.dateEnd}T23:59:59`) : null;
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
}

function dateFilterLabel() {
  const start = occurrenceState.dateStart ? formatInputDate(occurrenceState.dateStart) : "início";
  const end = occurrenceState.dateEnd ? formatInputDate(occurrenceState.dateEnd) : "fim";
  return `${start} até ${end}`;
}

function offlineDurationLabel(value) {
  const duration = offlineDurationSeconds(value);
  return Number.isFinite(duration) ? secondsToDurationLabel(duration) : "-";
}

function offlineDurationClass(value) {
  return Number.isFinite(offlineDurationSeconds(value)) ? "" : "is-missing";
}

function offlineDurationMinutes(value) {
  const seconds = offlineDurationSeconds(value);
  return Number.isFinite(seconds) ? seconds / 60 : NaN;
}

function offlineDurationSeconds(value) {
  const text = normalizeDowntimeText(value);
  if (!text || text === "-") return NaN;

  const matches = [...text.matchAll(/(?:(dom|seg|ter|qua|qui|sex|sab)[a-z.]*\s*)?(\d{1,2})(?:\s*(?:h|:|horas?|hrs?)\s*(\d{1,2})?)?(?::(\d{1,2}))?/gi)]
    .map((match) => {
      const hour = Number(match[2]);
      const minute = match[3] === undefined || match[3] === "" ? 0 : Number(match[3]);
      const second = match[4] === undefined || match[4] === "" ? 0 : Number(match[4]);
      if (hour > 23 || minute > 59 || second > 59) return null;
      return {
        day: weekdayIndex(match[1]),
        seconds: (hour * 3600) + (minute * 60) + second
      };
    })
    .filter(Boolean);

  if (matches.length < 2) return NaN;
  const start = matches[0];
  const end = matches[1];
  let delta = end.seconds - start.seconds;

  if (start.day !== null && end.day !== null) {
    const dayDiff = (end.day - start.day + 7) % 7;
    delta += dayDiff * 86400;
  } else if (delta < 0) {
    delta += 86400;
  }

  return delta > 0 ? delta : NaN;
}

function normalizeDowntimeText(value) {
  return clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\bah\b/gi, " as ")
    .replace(/\bate\b/gi, " as ")
    .replace(/[àáâã]/gi, "a")
    .toLowerCase();
}

function weekdayIndex(value) {
  if (!value) return null;
  return { dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6 }[value.slice(0, 3).toLowerCase()] ?? null;
}

function formatInputDate(value) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function setupTheme() {
  const savedTheme = localStorage.getItem("indicadores-theme") || "light";
  document.body.dataset.theme = savedTheme;
  els.themeToggle.textContent = savedTheme === "dark" ? "?" : "☾";
  els.themeToggle.addEventListener("click", () => {
    const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
    document.body.dataset.theme = nextTheme;
    localStorage.setItem("indicadores-theme", nextTheme);
    els.themeToggle.textContent = nextTheme === "dark" ? "?" : "☾";
    renderCharts();
  });
}

function clearData() {
  sessionStorage.removeItem(STORAGE_KEY);
  occurrenceState.workbook = {};
  occurrenceState.monthOrder = [];
  occurrenceState.selectedMonth = "";
  occurrenceState.selectedCity = "";
  occurrenceState.selectedReason = "";
  occurrenceState.dateStart = "";
  occurrenceState.dateEnd = "";
  els.dateStart.value = "";
  els.dateEnd.value = "";
  occurrenceState.filteredRows = [];
  els.importStatus.textContent = "Importe a planilha OCORRENCIAS MENSAIS.xlsx para visualizar a dashboard.";
  render();
}

function totalRows(workbook) {
  return Object.values(workbook).reduce((total, month) => total + month.records.length, 0);
}

function uniqueCount(items) {
  return new Set(items.filter(Boolean)).size;
}

function firstFilled(...values) {
  return values.map(clean).find(Boolean) || "";
}

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function isTotalRow(value) {
  return normalizeText(value).includes("total");
}

function normalizeHeader(value) {
  return normalizeText(value);
}

function normalizeText(value) {
  return clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function shorten(value, size) {
  return value.length > size ? `${value.slice(0, size - 1)}?` : value;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}



