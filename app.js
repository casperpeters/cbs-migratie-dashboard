const API_BASE = 'https://opendata.cbs.nl/ODataApi/OData/85484NED';
const CBS_TABLE_URL = 'https://opendata.cbs.nl/ODataApi/OData/85484NED';
const MOTIVE_API_BASE = 'https://opendata.cbs.nl/ODataApi/OData/84809NED';
const MOTIVE_TABLE_URL = 'https://opendata.cbs.nl/ODataApi/OData/84809NED';
const TOTAL_FILTER = "Geslacht eq 'T001038' and Herkomstland eq 'T001040' and Geboorteland eq 'T001638'";
const BIRTH_TOTAL = "Geboorteland eq 'T001638'";
const SEX_TOTAL = "Geslacht eq 'T001038'";
const MOTIVE_TOTAL_FILTER_PARTS = [
  "Geslacht eq 'T001038'",
  "Leeftijd eq '10000  '",
  "SociaaleconomischeCategorie eq 'T001083'",
  "Nationaliteit eq 'T001059'",
  "Verblijfsduur eq 'A027954'"
];

const ORIGIN_SEGMENTS = [
  { key: '1012600', label: 'Nederland', color: '#828fff' },
  { key: 'H007933', label: 'Europa excl. NL', color: '#5eead4' },
  { key: 'H008859', label: 'Buiten Europa', color: '#f0abfc' }
];

const COUNTRY_CATEGORY_GROUPS = new Set([2, 3, 4, 5, 6, 7]);
const NON_COUNTRY_HERKOMST_KEYS = new Set([
  'T001040', '2012605',
  'H007933', 'H008859', 'H008860', 'H008861', 'H008862',
  'H008519', 'H008520', 'H008524', 'H008531',
  'H007935', 'H007936', 'H007937',
  'H007119', 'H007186', 'H007069', 'H007204', 'H007172',
  '2012659'
]);
const COUNTRY_COLORS = ['#828fff', '#5eead4', '#f0abfc', '#f59e0b', '#7dd3fc', '#fb7185', '#a7f3d0', '#fef08a', '#c084fc', '#34d399', '#60a5fa', '#f97316'];

const MOTIVE_KEYS = [
  { key: 'A009232', label: 'Arbeidsmigratie', shortLabel: 'Arbeid', color: '#5eead4' },
  { key: 'A009233', label: 'Asielmigratie', shortLabel: 'Asiel', color: '#828fff' },
  { key: 'A009234', label: 'Gezinsmigratie', shortLabel: 'Gezin', color: '#f0abfc' },
  { key: 'A009235', label: 'Studiemigratie', shortLabel: 'Studie', color: '#f59e0b' },
  { key: 'A052135', label: 'Tijdelijke bescherming', shortLabel: 'Tijdelijke bescherming', color: '#7dd3fc' },
  { key: 'A009238', label: 'Overig', shortLabel: 'Overig', color: '#fb7185' }
];
const MOTIVE_DETAIL_KEYS = {
  familyWithLabor: 'A052714',
  familyWithAsylum: 'A052716'
};

const MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
const SHORT_MONTHS = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

const state = {
  monthly: [],
  periods: new Map(),
  latest: null,
  range: 12,
  originRows: [],
  countryRows: [],
  motiveRows: [],
  motiveTotal: 0,
  motivePeriod: null,
  motiveDetails: {},
  trendChart: null,
  originChart: null,
  countryChart: null,
  motiveChart: null,
  fetchedAt: null
};

const $ = (id) => document.getElementById(id);
const formatter = new Intl.NumberFormat('nl-NL');
const signedFormatter = new Intl.NumberFormat('nl-NL', { signDisplay: 'always' });
const percentFormatter = new Intl.NumberFormat('nl-NL', { style: 'percent', maximumFractionDigits: 1 });

window.addEventListener('DOMContentLoaded', () => {
  $('sourceLink').href = CBS_TABLE_URL;
  bindRangeButtons();
  loadDashboard();
});

function bindRangeButtons() {
  document.querySelectorAll('[data-range]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-range]').forEach((b) => b.classList.remove('active'));
      button.classList.add('active');
      state.range = button.dataset.range === 'all' ? 'all' : Number(button.dataset.range);
      renderTrendChart();
    });
  });
}

async function loadDashboard() {
  setLoading(true);
  try {
    $('errorBox').classList.add('hidden');
    const [seriesRows, periodRows, originCategories, motiveData] = await Promise.all([
      cbsFetch('TypedDataSet', { '$filter': TOTAL_FILTER }),
      cbsFetch('Perioden'),
      cbsFetch('Herkomstland'),
      fetchMigrationMotives().catch((error) => ({ error }))
    ]);

    state.periods = new Map(periodRows.map((row) => [row.Key, row]));
    state.monthly = seriesRows
      .filter((row) => row.Perioden.includes('MM'))
      .sort((a, b) => a.Perioden.localeCompare(b.Perioden));

    if (!state.monthly.length) {
      throw new Error('CBS gaf geen maandrecords terug voor de totale selectie.');
    }

    state.latest = state.monthly[state.monthly.length - 1];
    const latestOriginRows = await fetchLatestOriginRows(state.latest.Perioden);
    const rowsByHerkomst = new Map(latestOriginRows.map((row) => [row.Herkomstland, row]));
    state.originRows = buildOriginRows(rowsByHerkomst);
    state.countryRows = buildCountryRows(latestOriginRows, originCategories);
    if (motiveData.error) {
      console.warn('Migratiemotieven konden niet worden geladen:', motiveData.error);
      state.motiveRows = [];
      state.motiveTotal = 0;
      state.motivePeriod = null;
      state.motiveDetails = {};
      $('motiveError').classList.remove('hidden');
    } else {
      $('motiveError').classList.add('hidden');
      state.motiveRows = motiveData.rows;
      state.motiveTotal = motiveData.total;
      state.motivePeriod = motiveData.period;
      state.motiveDetails = motiveData.details;
    }
    state.fetchedAt = new Date();

    updateSummaryCards();
    updateInsightSummary();
    renderTrendChart();
    renderOriginChart();
    renderOriginList();
    renderCountryChart();
    renderCountryList();
    updateMotiveCards();
    renderMotiveChart();
    renderMotiveList();
    $('loadedAt').textContent = state.fetchedAt.toLocaleString('nl-NL', { dateStyle: 'medium', timeStyle: 'short' });
  } catch (error) {
    console.error(error);
    showError(error);
  } finally {
    setLoading(false);
  }
}

async function cbsFetch(resource, params = {}, baseUrl = API_BASE) {
  const query = new URLSearchParams({ ...params, '$format': 'json' });
  const response = await fetch(`${baseUrl}/${resource}?${query.toString()}`, {
    headers: { Accept: 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`CBS API-fout ${response.status} bij ${resource}`);
  }

  const payload = await response.json();
  return payload.value ?? [];
}

async function fetchLatestOriginRows(periodKey) {
  const filter = [
    SEX_TOTAL,
    BIRTH_TOTAL,
    `Perioden eq '${periodKey}'`
  ].join(' and ');
  return cbsFetch('TypedDataSet', { '$filter': filter });
}

async function fetchMigrationMotives() {
  const periods = await cbsFetch('JaarVanImmigratie', {}, MOTIVE_API_BASE);
  const latestPeriod = periods
    .filter((period) => /^\d{4}JJ00$/.test(period.Key))
    .at(-1);

  if (!latestPeriod) {
    throw new Error('CBS gaf geen jaar terug voor migratiemotief-data.');
  }

  const filter = [
    ...MOTIVE_TOTAL_FILTER_PARTS,
    `JaarVanImmigratie eq '${latestPeriod.Key}'`
  ].join(' and ');
  const rows = await cbsFetch('TypedDataSet', { '$filter': filter }, MOTIVE_API_BASE);
  const rowsByMotive = new Map(rows.map((row) => [row.Migratiemotief, row]));
  const total = Number(rowsByMotive.get('T001056')?.ImmigrantenExclusiefEUEFTA_1 ?? 0) || 1;

  return {
    period: latestPeriod,
    total,
    rows: MOTIVE_KEYS.map((motive) => {
      const value = Number(rowsByMotive.get(motive.key)?.ImmigrantenExclusiefEUEFTA_1 ?? 0);
      return {
        ...motive,
        value,
        share: value / total
      };
    }).filter((row) => row.value > 0),
    details: Object.fromEntries(Object.entries(MOTIVE_DETAIL_KEYS).map(([name, key]) => [
      name,
      Number(rowsByMotive.get(key)?.ImmigrantenExclusiefEUEFTA_1 ?? 0)
    ]))
  };
}

function buildOriginRows(rowsByHerkomst) {
  return ORIGIN_SEGMENTS.map((segment) => ({
    ...segment,
    ...migrationValues(rowsByHerkomst.get(segment.key))
  }));
}

function buildCountryRows(latestOriginRows, originCategories) {
  const metadataByKey = new Map(originCategories.map((row) => [row.Key, row]));
  const totalRow = latestOriginRows.find((row) => row.Herkomstland === 'T001040');
  const totalImmigration = Number(totalRow?.Immigratie_1 ?? state.latest?.Immigratie_1 ?? 0) || 1;

  return latestOriginRows
    .map((row) => {
      const metadata = metadataByKey.get(row.Herkomstland);
      if (!metadata) return null;
      return {
        key: row.Herkomstland,
        label: metadata.Title,
        categoryGroupId: Number(metadata.CategoryGroupID),
        share: Number(row.Immigratie_1 ?? 0) / totalImmigration,
        ...migrationValues(row)
      };
    })
    .filter(Boolean)
    .filter((row) => COUNTRY_CATEGORY_GROUPS.has(row.categoryGroupId))
    .filter((row) => !NON_COUNTRY_HERKOMST_KEYS.has(row.key))
    .filter((row) => row.immigratie > 0)
    .sort((a, b) => b.immigratie - a.immigratie || a.label.localeCompare(b.label, 'nl'))
    .slice(0, 12)
    .map((row, index) => ({
      ...row,
      rank: index + 1,
      color: COUNTRY_COLORS[index % COUNTRY_COLORS.length]
    }));
}

function migrationValues(row = {}) {
  return {
    immigratie: Number(row.Immigratie_1 ?? 0),
    emigratie: Number(row.EmigratieInclusiefAdministratieveC_2 ?? 0),
    saldo: Number(row.MigratiesaldoInclusiefAdministratie_3 ?? 0)
  };
}

function updateSummaryCards() {
  const latest = state.latest;
  const sameMonthLastYear = state.monthly[state.monthly.length - 13];
  const period = state.periods.get(latest.Perioden);
  const periodTitle = period?.Title ?? periodLabel(latest.Perioden);
  const status = period?.Status ?? 'CBS';

  $('latestPeriod').textContent = periodTitle;
  $('latestStatus').textContent = status;
  $('heroSaldo').textContent = formatSigned(latest.MigratiesaldoInclusiefAdministratie_3);

  setMetric('immigration', latest.Immigratie_1, delta(latest, sameMonthLastYear, 'Immigratie_1'), 't.o.v. dezelfde maand vorig jaar');
  setMetric('emigration', latest.EmigratieInclusiefAdministratieveC_2, delta(latest, sameMonthLastYear, 'EmigratieInclusiefAdministratieveC_2'), 't.o.v. dezelfde maand vorig jaar');
  setMetric('saldo', latest.MigratiesaldoInclusiefAdministratie_3, delta(latest, sameMonthLastYear, 'MigratiesaldoInclusiefAdministratie_3'), 't.o.v. dezelfde maand vorig jaar', true);

  const last12 = state.monthly.slice(-12);
  const previous12 = state.monthly.slice(-24, -12);
  const sum12 = sum(last12, 'MigratiesaldoInclusiefAdministratie_3');
  const sumPrevious12 = previous12.length === 12 ? sum(previous12, 'MigratiesaldoInclusiefAdministratie_3') : null;
  $('twelveMonthSaldo').textContent = formatSigned(sum12);
  $('twelveMonthCaption').textContent = sumPrevious12 === null
    ? 'Netto saldo over de laatste 12 maanden'
    : `${formatSigned(sum12 - sumPrevious12)} t.o.v. de 12 maanden ervoor`;
  $('twelveMonthCaption').className = sumPrevious12 !== null ? classFor(sum12 - sumPrevious12) : '';
}

function updateInsightSummary() {
  const latest = state.latest;
  const last12 = state.monthly.slice(-12);
  const previous12 = state.monthly.slice(-24, -12);
  const saldo12 = sum(last12, 'MigratiesaldoInclusiefAdministratie_3');
  const previousSaldo12 = previous12.length === 12 ? sum(previous12, 'MigratiesaldoInclusiefAdministratie_3') : null;
  const topCountry = state.countryRows[0];
  const dominantMotive = [...state.motiveRows].sort((a, b) => b.value - a.value)[0];

  const sentences = [
    `In ${periodLabel(latest.Perioden)} kwamen ${formatter.format(latest.Immigratie_1)} mensen naar Nederland en vertrokken er ${formatter.format(latest.EmigratieInclusiefAdministratieveC_2)}. Het saldo was ${formatSigned(latest.MigratiesaldoInclusiefAdministratie_3)}.`
  ];

  if (previousSaldo12 !== null) {
    const difference = saldo12 - previousSaldo12;
    const direction = difference > 0 ? 'hoger' : difference < 0 ? 'lager' : 'gelijk';
    const comparison = difference === 0 ? direction : `${formatter.format(Math.abs(difference))} ${direction}`;
    sentences.push(`Over de laatste 12 maanden was het saldo ${formatSigned(saldo12)}; ${comparison} dan in de 12 maanden ervoor.`);
  }
  if (topCountry) {
    sentences.push(`${topCountry.label} was het grootste afzonderlijke herkomstland met ${percentFormatter.format(topCountry.share)} van de immigratie in de laatste maand.`);
  }
  if (dominantMotive) {
    sentences.push(`Binnen de jaarlijkse niet-EU/EFTA-dataset was ${dominantMotive.label.toLowerCase()} het grootste migratiemotief (${percentFormatter.format(dominantMotive.share)}).`);
  }

  $('insightSummary').textContent = sentences.join(' ');
}

function setMetric(prefix, value, change, caption, signed = false) {
  $(`${prefix}Value`).textContent = signed ? formatSigned(value) : formatter.format(value);
  const deltaEl = $(`${prefix}Delta`);
  deltaEl.textContent = `${formatSigned(change)} ${caption}`;
  deltaEl.className = classFor(change);
}

function renderTrendChart() {
  if (!state.monthly.length) return;

  const rows = state.range === 'all' ? state.monthly : state.monthly.slice(-state.range);
  renderTrendTable(rows);
  if (!window.Chart) return;
  const labels = rows.map((row) => periodLabel(row.Perioden, true));
  const saldo = rows.map((row) => row.MigratiesaldoInclusiefAdministratie_3);
  const immigratie = rows.map((row) => row.Immigratie_1);
  const emigratie = rows.map((row) => row.EmigratieInclusiefAdministratieveC_2);

  const datasets = [
    {
      type: 'bar',
      label: 'Migratiesaldo',
      data: saldo,
      order: 3,
      borderWidth: 1,
      borderRadius: 8,
      borderSkipped: false,
      backgroundColor: saldo.map((value) => value >= 0 ? 'rgba(16, 185, 129, .42)' : 'rgba(239, 68, 68, .42)'),
      borderColor: saldo.map((value) => value >= 0 ? 'rgba(16, 185, 129, .82)' : 'rgba(239, 68, 68, .82)')
    },
    {
      type: 'line',
      label: 'Immigratie',
      data: immigratie,
      order: 1,
      tension: .34,
      pointRadius: 0,
      pointHoverRadius: 4,
      borderColor: '#828fff',
      backgroundColor: 'rgba(130, 143, 255, .12)',
      borderWidth: 3,
      fill: true
    },
    {
      type: 'line',
      label: 'Emigratie incl. correcties',
      data: emigratie,
      order: 2,
      tension: .34,
      pointRadius: 0,
      pointHoverRadius: 4,
      borderColor: '#5eead4',
      backgroundColor: 'rgba(94, 234, 212, .08)',
      borderWidth: 2.5,
      fill: false
    }
  ];

  if (state.trendChart) {
    state.trendChart.data.labels = labels;
    state.trendChart.data.datasets = datasets;
    state.trendChart.update();
    return;
  }

  state.trendChart = new Chart($('trendChart'), {
    data: { labels, datasets },
    options: baseChartOptions('Aantal personen')
  });
}

function renderTrendTable(rows) {
  $('trendDataTableBody').innerHTML = [...rows].reverse().map((row) => `
    <tr>
      <th scope="row">${escapeHtml(periodLabel(row.Perioden))}</th>
      <td>${formatter.format(row.Immigratie_1)}</td>
      <td>${formatter.format(row.EmigratieInclusiefAdministratieveC_2)}</td>
      <td>${formatSigned(row.MigratiesaldoInclusiefAdministratie_3)}</td>
    </tr>`).join('');
}

function renderOriginChart() {
  if (!state.originRows.length || !window.Chart) return;

  $('originPeriod').textContent = periodLabel(state.latest.Perioden);
  const labels = state.originRows.map((row) => row.label);
  const datasets = [
    {
      label: 'Immigratie',
      data: state.originRows.map((row) => row.immigratie),
      borderColor: '#828fff',
      backgroundColor: 'rgba(130, 143, 255, .72)',
      borderWidth: 1,
      borderRadius: 8,
      borderSkipped: false
    },
    {
      label: 'Emigratie',
      data: state.originRows.map((row) => row.emigratie),
      borderColor: '#5eead4',
      backgroundColor: 'rgba(94, 234, 212, .62)',
      borderWidth: 1,
      borderRadius: 8,
      borderSkipped: false
    }
  ];

  if (state.originChart) {
    state.originChart.data.labels = labels;
    state.originChart.data.datasets = datasets;
    state.originChart.update();
    return;
  }

  state.originChart = new Chart($('originChart'), {
    type: 'bar',
    data: { labels, datasets },
    options: horizontalBarOptions('Aantal personen')
  });
}

function renderOriginList() {
  const totalImmigration = sum(state.originRows, 'immigratie') || 1;
  $('originList').innerHTML = state.originRows.map((row) => {
    const share = Math.round((row.immigratie / totalImmigration) * 100);
    return `
      <div class="origin-item">
        <span class="origin-dot" style="color:${row.color};background:${row.color}"></span>
        <div>
          <div class="origin-title">${escapeHtml(row.label)}</div>
          <div class="origin-meta">${share}% van immigratie · saldo ${formatSigned(row.saldo)}</div>
        </div>
        <strong>${formatter.format(row.immigratie)}</strong>
      </div>`;
  }).join('');
}

function renderCountryChart() {
  if (!state.countryRows.length || !window.Chart) return;

  $('countryPeriod').textContent = periodLabel(state.latest.Perioden);
  const rows = state.countryRows.slice(0, 10);
  const labels = rows.map((row) => row.label);
  const datasets = [
    {
      label: 'Immigratie',
      data: rows.map((row) => row.immigratie),
      borderColor: rows.map((row) => row.color),
      backgroundColor: rows.map((row) => `${row.color}cc`),
      borderWidth: 1,
      borderRadius: 8,
      borderSkipped: false
    }
  ];

  if (state.countryChart) {
    state.countryChart.data.labels = labels;
    state.countryChart.data.datasets = datasets;
    state.countryChart.update();
    return;
  }

  state.countryChart = new Chart($('countryChart'), {
    type: 'bar',
    data: { labels, datasets },
    options: horizontalBarOptions('Aantal immigranten', false)
  });
}

function renderCountryList() {
  if (!state.countryRows.length) return;

  $('countryList').innerHTML = state.countryRows.map((row) => `
    <div class="country-item">
      <span class="country-rank">#${row.rank}</span>
      <div>
        <div class="origin-title">${escapeHtml(row.label)}</div>
        <div class="origin-meta">
          ${percentFormatter.format(row.share)} van alle immigratie · emigratie ${formatter.format(row.emigratie)} · saldo ${formatSigned(row.saldo)}
        </div>
      </div>
      <strong>${formatter.format(row.immigratie)}</strong>
    </div>`).join('');
}

function updateMotiveCards() {
  if (!state.motiveRows.length) return;

  const labor = motiveByKey('A009232');
  const asylum = motiveByKey('A009233');
  const temporaryProtection = motiveByKey('A052135');
  $('motivePeriod').textContent = yearLabel(state.motivePeriod?.Key ?? state.motivePeriod?.Title ?? '—');
  $('motiveTotalValue').textContent = formatter.format(state.motiveTotal);

  setMotiveMetric('motiveLabor', labor, `Gezin meegekomen met arbeid: ${formatter.format(state.motiveDetails.familyWithLabor ?? 0)}`);
  setMotiveMetric('motiveAsylum', asylum, `Gezin meegekomen met asiel: ${formatter.format(state.motiveDetails.familyWithAsylum ?? 0)}`);
  setMotiveMetric('motiveProtection', temporaryProtection, 'O.a. tijdelijke bescherming voor Oekraïne');
}

function motiveByKey(key) {
  return state.motiveRows.find((row) => row.key === key) ?? { value: 0, share: 0 };
}

function setMotiveMetric(prefix, row, caption) {
  $(`${prefix}Share`).textContent = percentFormatter.format(row.share ?? 0);
  $(`${prefix}Value`).textContent = `${formatter.format(row.value ?? 0)} personen`;
  $(`${prefix}Detail`).textContent = caption;
}

function renderMotiveChart() {
  if (!state.motiveRows.length || !window.Chart) return;

  const labels = state.motiveRows.map((row) => row.shortLabel);
  const data = state.motiveRows.map((row) => row.value);
  const colors = state.motiveRows.map((row) => row.color);
  const dataset = {
    label: 'Immigranten',
    data,
    backgroundColor: colors.map((color) => `${color}cc`),
    borderColor: colors,
    borderWidth: 1.4,
    hoverOffset: 7
  };

  if (state.motiveChart) {
    state.motiveChart.data.labels = labels;
    state.motiveChart.data.datasets = [dataset];
    state.motiveChart.update();
    return;
  }

  state.motiveChart = new Chart($('motiveChart'), {
    type: 'doughnut',
    data: { labels, datasets: [dataset] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: '#d0d6e0',
            usePointStyle: true,
            pointStyle: 'circle',
            boxWidth: 7,
            boxHeight: 7,
            padding: 16,
            font: { family: 'Inter', size: 12 }
          }
        },
        tooltip: {
          backgroundColor: '#191a1f',
          borderColor: 'rgba(255,255,255,.12)',
          borderWidth: 1,
          padding: 12,
          titleColor: '#f7f8f8',
          bodyColor: '#d0d6e0',
          callbacks: {
            label(context) {
              const value = Number(context.raw ?? 0);
              const share = value / (state.motiveTotal || 1);
              return `${context.label}: ${formatter.format(value)} personen (${percentFormatter.format(share)})`;
            }
          }
        }
      }
    }
  });
}

function renderMotiveList() {
  if (!state.motiveRows.length) return;

  $('motiveList').innerHTML = state.motiveRows.map((row) => `
    <div class="motive-item">
      <div class="motive-row-head">
        <span class="origin-dot" style="color:${row.color};background:${row.color}"></span>
        <strong>${escapeHtml(row.label)}</strong>
        <span>${percentFormatter.format(row.share)}</span>
      </div>
      <div class="motive-bar" aria-hidden="true"><span style="width:${Math.round(row.share * 1000) / 10}% ; background:${row.color}"></span></div>
      <div class="origin-meta">${formatter.format(row.value)} personen van ${formatter.format(state.motiveTotal)} niet-EU/EFTA-immigranten</div>
    </div>`).join('');
}

function baseChartOptions(yTitle) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        labels: {
          color: '#d0d6e0',
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 7,
          boxHeight: 7,
          padding: 18,
          font: { family: 'Inter', size: 12 }
        }
      },
      tooltip: {
        backgroundColor: '#191a1f',
        borderColor: 'rgba(255,255,255,.12)',
        borderWidth: 1,
        padding: 12,
        titleColor: '#f7f8f8',
        bodyColor: '#d0d6e0',
        displayColors: true,
        callbacks: {
          label(context) {
            const value = tooltipNumericValue(context);
            return `${context.dataset.label}: ${formatter.format(value)} personen`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,.04)', drawBorder: false },
        ticks: { color: '#8a8f98', maxRotation: 0, autoSkipPadding: 22, font: { family: 'Inter', size: 11 } }
      },
      y: axisOptions(yTitle)
    }
  };
}

function horizontalBarOptions(xTitle, showLegend = true) {
  const options = baseChartOptions(xTitle);
  options.indexAxis = 'y';
  options.plugins.legend.display = showLegend;
  options.scales = {
    x: axisOptions(xTitle),
    y: {
      grid: { color: 'rgba(255,255,255,.04)', drawBorder: false },
      ticks: { color: '#d0d6e0', font: { family: 'Inter', size: 12 } }
    }
  };
  return options;
}

function axisOptions(title) {
  return {
    beginAtZero: true,
    grid: { color: 'rgba(255,255,255,.055)', drawBorder: false },
    ticks: {
      color: '#8a8f98',
      callback(value) { return compactNumber(value); },
      font: { family: 'Inter', size: 11 }
    },
    title: {
      display: true,
      text: title,
      color: '#62666d',
      font: { family: 'Inter', size: 11, weight: 500 }
    }
  };
}

function tooltipNumericValue(context) {
  const parsed = context.parsed ?? {};
  if (context.chart?.options?.indexAxis === 'y') return parsed.x ?? 0;
  return parsed.y ?? parsed.x ?? 0;
}

function periodLabel(key, compact = false) {
  const match = key.match(/^(\d{4})MM(\d{2})$/);
  if (!match) return key;
  const year = match[1];
  const month = Number(match[2]) - 1;
  return compact ? `${SHORT_MONTHS[month]} '${year.slice(2)}` : `${MONTHS[month]} ${year}`;
}

function yearLabel(key) {
  const match = String(key).match(/^(\d{4})JJ00$/);
  return match ? match[1] : String(key).trim();
}

function formatSigned(value) {
  return signedFormatter.format(Number(value));
}

function compactNumber(value) {
  const number = Number(value);
  if (Math.abs(number) >= 1000) return `${Math.round(number / 1000)}k`;
  return formatter.format(number);
}

function delta(current, previous, key) {
  if (!previous) return 0;
  return Number(current[key] ?? 0) - Number(previous[key] ?? 0);
}

function sum(rows, key) {
  return rows.reduce((total, row) => total + Number(row[key] ?? 0), 0);
}

function classFor(value) {
  if (value > 0) return 'positive';
  if (value < 0) return 'negative';
  return '';
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = String(value);
  return div.innerHTML;
}

function setLoading(isLoading) {
  $('loading').classList.toggle('hidden', !isLoading);
}

function showError(error) {
  $('errorMessage').textContent = error.message;
  $('errorBox').classList.remove('hidden');
}
