/* =============================================
   ContratosPro — app.js
   Sistema de Gestão de Contratos
   ============================================= */

'use strict';

// ─── Constants ───────────────────────────────
const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const STORAGE_KEY = 'contratosPro_data';
const PAGE_SIZE = 15;

// ─── State ───────────────────────────────────
let contracts = [];
let filtered = [];
let currentPage = 1;
let editingId = null;
let deleteId = null;
let pendingImport = null;
let charts = {};

// ─── Utility ─────────────────────────────────
const $ = id => document.getElementById(id);
const val = id => ($(id) ? $(id).value.trim() : '');
const num = v => (isNaN(parseFloat(v)) || v === '' || v === null || v === undefined ? 0 : parseFloat(v));

function fmt(v, decimals = 2) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num(v));
}

function fmtBRL(v) {
  return 'R$ ' + fmt(v);
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

function today() {
  return new Date().toLocaleDateString('pt-BR');
}

function toast(msg, type = 'info') {
  const el = $('toast');
  el.textContent = msg;
  el.className = `toast show ${type}`;
  setTimeout(() => { el.className = 'toast'; }, 3500);
}

// ─── Storage ─────────────────────────────────
function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(contracts));
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    contracts = raw ? JSON.parse(raw) : [];
  } catch {
    contracts = [];
  }
  if (contracts.length === 0) seedSampleData();
}

function seedSampleData() {
  contracts = [
    {
      id: uid(),
      contrato: '01/2024',
      os: 'Santa Casa',
      unidade: 'Contratualização',
      ano: 2026,
      fonte: 'federal',
      valor_total: null,
      obs: 'Emprestimo CEF - Parcela 36º/36º R$ 106.827,86 / Emprestimo Banco Bradesco - Parcela 29/60 R$ 140.795,09',
      meses: {
        Jan: { prev: 3285126.97, pago: 3210126.97, glosa: 75000 },
        Fev: { prev: 3285126.97, pago: 3210126.97, glosa: 75000 },
        Mar: { prev: 3285126.97, pago: 3210126.97, glosa: 75000 },
        Abr: { prev: 0, pago: 0, glosa: 0 },
        Mai: { prev: 0, pago: 0, glosa: 0 },
        Jun: { prev: 0, pago: 0, glosa: 0 },
        Jul: { prev: 0, pago: 0, glosa: 0 },
        Ago: { prev: 0, pago: 0, glosa: 0 },
        Set: { prev: 0, pago: 0, glosa: 0 },
        Out: { prev: 0, pago: 0, glosa: 0 },
        Nov: { prev: 0, pago: 0, glosa: 0 },
        Dez: { prev: 0, pago: 0, glosa: 0 },
      }
    },
    {
      id: uid(),
      contrato: '21/2025',
      os: 'Fundação ABC',
      unidade: 'Jardim Universo',
      ano: 2026,
      fonte: 'municipal',
      valor_total: null,
      obs: '',
      meses: {
        Jan: { prev: 1127848, pago: 1102077.79, glosa: 25770.21 },
        Fev: { prev: 1127848, pago: 1127848, glosa: 0 },
        Mar: { prev: 1127848, pago: 1111029.34, glosa: 16818.66 },
        Abr: { prev: 1015063.2, pago: 1015063.2, glosa: 0 },
        Mai: { prev: 0, pago: 0, glosa: 0 },
        Jun: { prev: 0, pago: 0, glosa: 0 },
        Jul: { prev: 0, pago: 0, glosa: 0 },
        Ago: { prev: 0, pago: 0, glosa: 0 },
        Set: { prev: 0, pago: 0, glosa: 0 },
        Out: { prev: 0, pago: 0, glosa: 0 },
        Nov: { prev: 0, pago: 0, glosa: 0 },
        Dez: { prev: 0, pago: 0, glosa: 0 },
      }
    },
    {
      id: uid(),
      contrato: '21/2025',
      os: 'Fundação ABC',
      unidade: 'Jardim Universo',
      ano: 2026,
      fonte: 'federal',
      valor_total: null,
      obs: '',
      meses: {
        Jan: { prev: 16000, pago: 16000, glosa: 0 },
        Fev: { prev: 16000, pago: 16000, glosa: 0 },
        Mar: { prev: 14000, pago: 14000, glosa: 0 },
        Abr: { prev: 14000, pago: 14000, glosa: 0 },
        Mai: { prev: 0, pago: 0, glosa: 0 },
        Jun: { prev: 0, pago: 0, glosa: 0 },
        Jul: { prev: 0, pago: 0, glosa: 0 },
        Ago: { prev: 0, pago: 0, glosa: 0 },
        Set: { prev: 0, pago: 0, glosa: 0 },
        Out: { prev: 0, pago: 0, glosa: 0 },
        Nov: { prev: 0, pago: 0, glosa: 0 },
        Dez: { prev: 0, pago: 0, glosa: 0 },
      }
    }
  ];
  saveData();
}

// ─── Computed totals ──────────────────────────
function calcTotals(c) {
  let totPrev = 0, totPago = 0, totGlosa = 0;
  MONTHS.forEach(m => {
    const mes = c.meses[m] || {};
    totPrev += num(mes.prev);
    totPago += num(mes.pago);
    totGlosa += num(mes.glosa);
  });
  const saldo = num(c.valor_total) > 0 ? num(c.valor_total) - totPago : totPrev - totPago;
  return { totPrev, totPago, totGlosa, saldo };
}

// ─── Navigation ──────────────────────────────
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const el = $(`page-${page}`);
  if (el) el.classList.add('active');
  const nav = document.querySelector(`[data-page="${page}"]`);
  if (nav) nav.classList.add('active');

  const titles = {
    'dashboard': 'Painel',
    'contracts': 'Contratos',
    'new-contract': editingId ? 'Editar Contrato' : 'Novo Contrato',
    'reports': 'Relatórios',
    'import': 'Importar Dados'
  };
  $('pageTitle').textContent = titles[page] || page;

  // Close sidebar on mobile
  if (window.innerWidth <= 900) {
    $('sidebar').classList.remove('open');
  }

  if (page === 'dashboard') renderDashboard();
  if (page === 'contracts') { filtered = [...contracts]; renderContracts(); }
  if (page === 'new-contract') renderForm();
  if (page === 'reports') populateReportSelects();
}

// ─── DASHBOARD ───────────────────────────────
function renderDashboard() {
  let totalPrev = 0, totalPago = 0, totalGlosa = 0, totalSaldo = 0;
  contracts.forEach(c => {
    const t = calcTotals(c);
    totalPrev += t.totPrev;
    totalPago += t.totPago;
    totalGlosa += t.totGlosa;
    totalSaldo += t.saldo;
  });

  $('kpiGrid').innerHTML = `
    <div class="kpi-card blue">
      <div class="kpi-label">Total Previsto</div>
      <div class="kpi-value">${fmtBRL(totalPrev)}</div>
      <div class="kpi-sub">${contracts.length} contrato(s)</div>
    </div>
    <div class="kpi-card green">
      <div class="kpi-label">Total Pago</div>
      <div class="kpi-value">${fmtBRL(totalPago)}</div>
      <div class="kpi-sub">${fmt(totalPago / totalPrev * 100)}% executado</div>
    </div>
    <div class="kpi-card red">
      <div class="kpi-label">Total Glosa</div>
      <div class="kpi-value">${fmtBRL(totalGlosa)}</div>
      <div class="kpi-sub">${fmt(totalGlosa / totalPago * 100)}% do pago</div>
    </div>
    <div class="kpi-card yellow">
      <div class="kpi-label">Saldo Disponível</div>
      <div class="kpi-value">${fmtBRL(totalSaldo)}</div>
      <div class="kpi-sub">Previsto - Pago</div>
    </div>
    <div class="kpi-card purple">
      <div class="kpi-label">Contratos Ativos</div>
      <div class="kpi-value">${contracts.length}</div>
      <div class="kpi-sub">cadastros no sistema</div>
    </div>
  `;

  renderCharts();

  // Recent table
  const tbody = document.querySelector('#recentTable tbody');
  const recent = [...contracts].slice(-8).reverse();
  tbody.innerHTML = recent.map(c => {
    const t = calcTotals(c);
    return `<tr>
      <td class="td-mono">${c.contrato}</td>
      <td>${c.os}</td>
      <td>${c.unidade}</td>
      <td class="val-mono">${fmtBRL(t.totPrev)}</td>
      <td class="val-pos">${fmtBRL(t.totPago)}</td>
      <td class="val-neg">${fmtBRL(t.totGlosa)}</td>
      <td class="${t.saldo >= 0 ? 'val-pos' : 'val-neg'}">${fmtBRL(t.saldo)}</td>
    </tr>`;
  }).join('');
}

function renderCharts() {
  // Destroy existing charts
  Object.values(charts).forEach(c => c && c.destroy());
  charts = {};

  // Chart 1: por fonte
  const fonteTotals = {};
  contracts.forEach(c => {
    const t = calcTotals(c);
    fonteTotals[c.fonte] = (fonteTotals[c.fonte] || 0) + t.totPago;
  });

  const ctx1 = $('chartFonte').getContext('2d');
  charts.fonte = new Chart(ctx1, {
    type: 'doughnut',
    data: {
      labels: Object.keys(fonteTotals).map(f => f.charAt(0).toUpperCase() + f.slice(1)),
      datasets: [{
        data: Object.values(fonteTotals),
        backgroundColor: ['#4f8eff','#34d399','#fbbf24','#a78bfa'],
        borderWidth: 0,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: '#8a90a2', font: { size: 11 } } },
        tooltip: {
          callbacks: {
            label: ctx => ' R$ ' + fmt(ctx.parsed)
          }
        }
      }
    }
  });

  // Chart 2: previsto vs pago por contrato
  const labels = [], prevData = [], pagoData = [];
  const grouped = {};
  contracts.forEach(c => {
    const key = `${c.contrato} - ${c.os}`;
    if (!grouped[key]) grouped[key] = { prev: 0, pago: 0 };
    const t = calcTotals(c);
    grouped[key].prev += t.totPrev;
    grouped[key].pago += t.totPago;
  });
  Object.entries(grouped).forEach(([k, v]) => {
    labels.push(k.length > 20 ? k.slice(0, 20) + '…' : k);
    prevData.push(v.prev);
    pagoData.push(v.pago);
  });

  const ctx2 = $('chartContratos').getContext('2d');
  charts.contratos = new Chart(ctx2, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Previsto', data: prevData, backgroundColor: 'rgba(79,142,255,0.5)', borderColor: '#4f8eff', borderWidth: 1 },
        { label: 'Pago', data: pagoData, backgroundColor: 'rgba(52,211,153,0.5)', borderColor: '#34d399', borderWidth: 1 }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: '#8a90a2', font: { size: 11 } } },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: R$ ${fmt(ctx.parsed.y)}`
          }
        }
      },
      scales: {
        x: { ticks: { color: '#5a6070', font: { size: 10 } }, grid: { color: '#252a38' } },
        y: { ticks: { color: '#5a6070', font: { size: 10 }, callback: v => 'R$' + fmt(v / 1000) + 'k' }, grid: { color: '#252a38' } }
      }
    }
  });
}

// ─── CONTRACTS LIST ───────────────────────────
function renderContracts() {
  currentPage = 1;
  renderTable();
  $('resultCount').textContent = `${filtered.length} contrato(s) encontrado(s)`;
}

function renderTable() {
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageData = filtered.slice(start, start + PAGE_SIZE);
  const tbody = $('contractsBody');

  if (pageData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:2rem;color:var(--text3);">Nenhum contrato encontrado.</td></tr>';
    $('pagination').innerHTML = '';
    return;
  }

  tbody.innerHTML = pageData.map(c => {
    const t = calcTotals(c);
    return `<tr>
      <td class="td-mono">${c.contrato}</td>
      <td>${c.os}</td>
      <td>${c.unidade}</td>
      <td>${c.ano}</td>
      <td><span class="td-badge badge-${c.fonte}">${c.fonte}</span></td>
      <td class="val-mono">${c.valor_total ? fmtBRL(c.valor_total) : '—'}</td>
      <td class="val-mono">${fmtBRL(t.totPrev)}</td>
      <td class="val-pos">${fmtBRL(t.totPago)}</td>
      <td class="val-neg">${fmtBRL(t.totGlosa)}</td>
      <td class="${t.saldo >= 0 ? 'val-pos' : 'val-neg'}">${fmtBRL(t.saldo)}</td>
      <td>
        <button class="action-btn" onclick="viewContract('${c.id}')">👁</button>
        <button class="action-btn" onclick="startEdit('${c.id}')">✏</button>
        <button class="action-btn danger" onclick="startDelete('${c.id}')">🗑</button>
      </td>
    </tr>`;
  }).join('');

  renderPagination();
}

function renderPagination() {
  const total = Math.ceil(filtered.length / PAGE_SIZE);
  if (total <= 1) { $('pagination').innerHTML = ''; return; }

  let html = '';
  if (currentPage > 1) html += `<button class="page-btn" onclick="goPage(${currentPage - 1})">‹</button>`;

  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= currentPage - 2 && i <= currentPage + 2)) {
      html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goPage(${i})">${i}</button>`;
    } else if (i === currentPage - 3 || i === currentPage + 3) {
      html += `<span style="color:var(--text3);padding:0 4px;">…</span>`;
    }
  }

  if (currentPage < total) html += `<button class="page-btn" onclick="goPage(${currentPage + 1})">›</button>`;
  $('pagination').innerHTML = html;
}

function goPage(p) { currentPage = p; renderTable(); window.scrollTo(0, 0); }

function searchContracts() {
  const sC = val('sContrato').toLowerCase();
  const sO = val('sOS').toLowerCase();
  const sObj = val('sObjeto').toLowerCase();
  const sA = val('sAno');
  const sF = val('sFonte');
  const sVM = num($('sValMin').value);

  filtered = contracts.filter(c => {
    const t = calcTotals(c);
    return (
      (!sC || c.contrato.toLowerCase().includes(sC)) &&
      (!sO || c.os.toLowerCase().includes(sO)) &&
      (!sObj || c.unidade.toLowerCase().includes(sObj)) &&
      (!sA || c.ano == sA) &&
      (!sF || c.fonte === sF) &&
      (!sVM || t.totPago >= sVM)
    );
  });

  renderContracts();
}

function clearSearch() {
  ['sContrato','sOS','sObjeto','sAno','sFonte','sValMin'].forEach(id => { if ($(id)) $(id).value = ''; });
  filtered = [...contracts];
  renderContracts();
}

// ─── FORM ─────────────────────────────────────
function renderForm() {
  $('formTitle').textContent = editingId ? 'Editar Contrato' : 'Novo Contrato';

  const c = editingId ? contracts.find(x => x.id === editingId) : null;

  if (c) {
    $('fContrato').value = c.contrato;
    $('fOS').value = c.os;
    $('fUnidade').value = c.unidade;
    $('fAno').value = c.ano;
    $('fFonte').value = c.fonte;
    $('fValorTotal').value = c.valor_total || '';
    $('fObs').value = c.obs || '';
  } else {
    ['fContrato','fOS','fUnidade','fFonte','fValorTotal','fObs'].forEach(id => { if ($(id)) $(id).value = ''; });
    $('fAno').value = new Date().getFullYear();
  }

  // Render monthly table
  const tbody = $('monthlyBody');
  tbody.innerHTML = MONTHS.map((m, i) => {
    const mes = c ? (c.meses[m] || {}) : {};
    return `<tr>
      <td>${MONTH_NAMES[i]}</td>
      <td><input type="number" id="m_${m}_prev" step="0.01" min="0" value="${mes.prev || ''}" placeholder="0,00" oninput="calcMonthlyTotal()" /></td>
      <td><input type="number" id="m_${m}_pago" step="0.01" min="0" value="${mes.pago || ''}" placeholder="0,00" oninput="calcMonthlyTotal()" /></td>
      <td><input type="number" id="m_${m}_glosa" step="0.01" min="0" value="${mes.glosa || ''}" placeholder="0,00" oninput="calcMonthlyTotal()" /></td>
    </tr>`;
  }).join('');

  calcMonthlyTotal();
}

function calcMonthlyTotal() {
  let totPrev = 0, totPago = 0, totGlosa = 0;
  MONTHS.forEach(m => {
    totPrev += num($(`m_${m}_prev`) ? $(`m_${m}_prev`).value : 0);
    totPago += num($(`m_${m}_pago`) ? $(`m_${m}_pago`).value : 0);
    totGlosa += num($(`m_${m}_glosa`) ? $(`m_${m}_glosa`).value : 0);
  });
  $('totPrev').textContent = fmtBRL(totPrev);
  $('totPago').textContent = fmtBRL(totPago);
  $('totGlosa').textContent = fmtBRL(totGlosa);
}

function saveContract() {
  const contrato = val('fContrato');
  const os = val('fOS');
  const unidade = val('fUnidade');
  const ano = parseInt(val('fAno')) || new Date().getFullYear();
  const fonte = val('fFonte');

  if (!contrato || !os || !unidade || !fonte) {
    toast('Preencha os campos obrigatórios: Nº Contrato, Empresa, Unidade e Fonte.', 'error');
    return;
  }

  const meses = {};
  MONTHS.forEach(m => {
    meses[m] = {
      prev: num($(`m_${m}_prev`) ? $(`m_${m}_prev`).value : 0),
      pago: num($(`m_${m}_pago`) ? $(`m_${m}_pago`).value : 0),
      glosa: num($(`m_${m}_glosa`) ? $(`m_${m}_glosa`).value : 0),
    };
  });

  if (editingId) {
    const idx = contracts.findIndex(x => x.id === editingId);
    if (idx !== -1) {
      contracts[idx] = { ...contracts[idx], contrato, os, unidade, ano, fonte, valor_total: num($('fValorTotal').value) || null, obs: val('fObs'), meses };
    }
    toast('Contrato atualizado com sucesso!', 'success');
  } else {
    contracts.push({ id: uid(), contrato, os, unidade, ano, fonte, valor_total: num($('fValorTotal').value) || null, obs: val('fObs'), meses });
    toast('Contrato cadastrado com sucesso!', 'success');
  }

  saveData();
  editingId = null;
  navigate('contracts');
}

function cancelForm() {
  editingId = null;
  navigate('contracts');
}

function startEdit(id) {
  editingId = id;
  navigate('new-contract');
}

// ─── VIEW CONTRACT ────────────────────────────
function viewContract(id) {
  const c = contracts.find(x => x.id === id);
  if (!c) return;
  const t = calcTotals(c);

  $('viewModalTitle').textContent = `Contrato ${c.contrato} — ${c.os}`;

  const monthRows = MONTHS.map((m, i) => {
    const mes = c.meses[m] || {};
    if (!mes.prev && !mes.pago && !mes.glosa) return '';
    return `<tr>
      <td>${MONTH_NAMES[i]}</td>
      <td class="val-mono">${fmtBRL(mes.prev)}</td>
      <td class="val-pos">${fmtBRL(mes.pago)}</td>
      <td class="val-neg">${fmtBRL(mes.glosa)}</td>
    </tr>`;
  }).join('');

  $('viewModalBody').innerHTML = `
    <div class="detail-grid">
      <div class="detail-item"><label>Nº Contrato</label><span>${c.contrato}</span></div>
      <div class="detail-item"><label>OS / Empresa</label><span>${c.os}</span></div>
      <div class="detail-item"><label>Unidade / Objeto</label><span>${c.unidade}</span></div>
      <div class="detail-item"><label>Ano</label><span>${c.ano}</span></div>
      <div class="detail-item"><label>Fonte</label><span class="td-badge badge-${c.fonte}">${c.fonte}</span></div>
      <div class="detail-item mono"><label>Valor Total do Contrato</label><span>${c.valor_total ? fmtBRL(c.valor_total) : '—'}</span></div>
    </div>

    <div class="form-section-title">Resumo Financeiro</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-bottom:1.5rem;">
      <div class="kpi-card blue"><div class="kpi-label">Total Previsto</div><div class="kpi-value" style="font-size:1rem;">${fmtBRL(t.totPrev)}</div></div>
      <div class="kpi-card green"><div class="kpi-label">Total Pago</div><div class="kpi-value" style="font-size:1rem;">${fmtBRL(t.totPago)}</div></div>
      <div class="kpi-card red"><div class="kpi-label">Total Glosa</div><div class="kpi-value" style="font-size:1rem;">${fmtBRL(t.totGlosa)}</div></div>
    </div>

    <div class="form-section-title">Execução Mensal</div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Mês</th><th>Previsto</th><th>Pago</th><th>Glosa</th></tr></thead>
        <tbody>${monthRows || '<tr><td colspan="4" style="text-align:center;color:var(--text3)">Nenhuma execução registrada.</td></tr>'}</td>
        <tfoot><tr class="total-row">
          <td><strong>TOTAL</strong></td>
          <td class="val-mono"><strong>${fmtBRL(t.totPrev)}</strong></td>
          <td class="val-pos"><strong>${fmtBRL(t.totPago)}</strong></td>
          <td class="val-neg"><strong>${fmtBRL(t.totGlosa)}</strong></td>
        </tr></tfoot>
      </table>
    </div>

    ${c.obs ? `<div class="form-section-title" style="margin-top:1.5rem;">Observações</div><p style="color:var(--text2);font-size:0.875rem;line-height:1.7;">${c.obs}</p>` : ''}
  `;

  $('viewModal').style.display = 'flex';
  $('viewModal')._currentId = id;
}

function editFromView() {
  const id = $('viewModal')._currentId;
  closeModal('viewModal');
  startEdit(id);
}

function printContract() {
  window.print();
}

// ─── DELETE ───────────────────────────────────
function startDelete(id) {
  const c = contracts.find(x => x.id === id);
  if (!c) return;
  deleteId = id;
  $('deleteContractName').textContent = `${c.contrato} — ${c.os}`;
  $('deleteModal').style.display = 'flex';
}

function confirmDelete() {
  contracts = contracts.filter(x => x.id !== deleteId);
  saveData();
  deleteId = null;
  closeModal('deleteModal');
  filtered = [...contracts];
  renderContracts();
  toast('Contrato excluído com sucesso.', 'success');
}

// ─── MODAL ────────────────────────────────────
function closeModal(id) {
  $(id).style.display = 'none';
}

// ─── EXPORT CSV ──────────────────────────────
function exportCSV() {
  const data = filtered.length ? filtered : contracts;
  const headers = ['contrato','os','unidade','ano','fonte','valor_total',
    ...MONTHS.flatMap(m => [`${m}_prev`,`${m}_pago`,`${m}_glosa`]),
    'total_previsto','total_pago','total_glosa','saldo','obs'
  ];

  const rows = data.map(c => {
    const t = calcTotals(c);
    return [
      c.contrato, c.os, c.unidade, c.ano, c.fonte, c.valor_total || '',
      ...MONTHS.flatMap(m => {
        const mes = c.meses[m] || {};
        return [mes.prev || 0, mes.pago || 0, mes.glosa || 0];
      }),
      t.totPrev, t.totPago, t.totGlosa, t.saldo, c.obs || ''
    ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  downloadFile(csv, 'contratos.csv', 'text/csv');
  toast('CSV exportado com sucesso!', 'success');
}

function downloadFile(content, filename, mime) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['\uFEFF' + content], { type: mime }));
  a.download = filename;
  a.click();
}

function downloadTemplate() {
  const headers = ['contrato','os','unidade','ano','fonte','valor_total',
    ...MONTHS.flatMap(m => [`${m}_prev`,`${m}_pago`,`${m}_glosa`]),'obs'];
  const example = ['01/2024','Santa Casa','Contratualização','2026','federal','',
    ...MONTHS.flatMap(() => ['','','']), 'Observações aqui'];
  const csv = [headers.join(','), example.join(',')].join('\n');
  downloadFile(csv, 'modelo_contratos.csv', 'text/csv');
}

// ─── IMPORT ───────────────────────────────────
function handleImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    const text = e.target.result;
    if (file.name.endsWith('.json')) {
      try {
        pendingImport = JSON.parse(text);
        showImportPreview(pendingImport);
      } catch {
        toast('JSON inválido.', 'error');
      }
    } else {
      pendingImport = parseCSV(text);
      showImportPreview(pendingImport);
    }
  };
  reader.readAsText(file, 'UTF-8');
}

function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] || ''; });

    const meses = {};
    MONTHS.forEach(m => {
      meses[m] = {
        prev: num(obj[`${m}_prev`]),
        pago: num(obj[`${m}_pago`]),
        glosa: num(obj[`${m}_glosa`]),
      };
    });

    return {
      id: uid(),
      contrato: obj.contrato || '',
      os: obj.os || '',
      unidade: obj.unidade || '',
      ano: parseInt(obj.ano) || new Date().getFullYear(),
      fonte: obj.fonte || 'municipal',
      valor_total: num(obj.valor_total) || null,
      obs: obj.obs || '',
      meses
    };
  }).filter(c => c.contrato);
}

function showImportPreview(data) {
  if (!data || data.length === 0) { toast('Nenhum dado válido encontrado.', 'error'); return; }

  $('importHead').innerHTML = '<tr><th>Contrato</th><th>Empresa</th><th>Unidade</th><th>Ano</th><th>Fonte</th></tr>';
  $('importBody').innerHTML = data.slice(0, 10).map(c =>
    `<tr><td class="td-mono">${c.contrato}</td><td>${c.os}</td><td>${c.unidade}</td><td>${c.ano}</td><td>${c.fonte}</td></tr>`
  ).join('');

  if (data.length > 10) {
    $('importBody').innerHTML += `<tr><td colspan="5" style="text-align:center;color:var(--text3)">... e mais ${data.length - 10} registros</td></tr>`;
  }

  $('importPreview').style.display = 'block';
  toast(`${data.length} contratos prontos para importação.`, 'info');
}

function confirmImport() {
  if (!pendingImport) return;
  contracts = [...contracts, ...pendingImport];
  saveData();
  pendingImport = null;
  $('importPreview').style.display = 'none';
  $('importFile').value = '';
  toast(`${pendingImport ? 0 : contracts.length} contratos importados!`, 'success');
  toast('Importação concluída!', 'success');
}

function cancelImport() {
  pendingImport = null;
  $('importPreview').style.display = 'none';
  $('importFile').value = '';
}

function clearAllData() {
  if (!confirm('Tem certeza? Todos os contratos serão excluídos permanentemente!')) return;
  contracts = [];
  saveData();
  filtered = [];
  toast('Todos os dados foram removidos.', 'error');
}

// ─── REPORTS ─────────────────────────────────
function populateReportSelects() {
  const sel = $('rContrato');
  sel.innerHTML = '<option value="">Todos</option>';
  const unique = [...new Set(contracts.map(c => c.contrato))];
  unique.forEach(n => {
    const o = document.createElement('option');
    o.value = n;
    o.textContent = n;
    sel.appendChild(o);
  });
}

function generateReport() {
  const tipo = val('rTipo');
  const contrato = val('rContrato');
  const mesIni = val('rMesIni');
  const mesFim = val('rMesFim');
  const ano = val('rAno');
  const fonte = val('rFonte');

  let data = contracts.filter(c =>
    (!contrato || c.contrato === contrato) &&
    (!ano || c.ano == ano) &&
    (!fonte || c.fonte === fonte)
  );

  const mesIniIdx = mesIni ? MONTHS.indexOf(mesIni) : 0;
  const mesFimIdx = mesFim ? MONTHS.indexOf(mesFim) : 11;
  const activeMths = MONTHS.slice(mesIniIdx, mesFimIdx + 1);

  let reportRows = [];
  let totals = { prev: 0, pago: 0, glosa: 0, saldo: 0 };

  if (tipo === 'contrato') {
    reportRows = data.map(c => {
      let prev = 0, pago = 0, glosa = 0;
      activeMths.forEach(m => {
        prev += num(c.meses[m]?.prev);
        pago += num(c.meses[m]?.pago);
        glosa += num(c.meses[m]?.glosa);
      });
      const saldo = prev - pago;
      totals.prev += prev; totals.pago += pago; totals.glosa += glosa; totals.saldo += saldo;
      return { label: `${c.contrato} — ${c.os} / ${c.unidade}`, prev, pago, glosa, saldo };
    });

    $('reportHead').innerHTML = '<tr><th>Contrato</th><th>Previsto</th><th>Pago</th><th>Glosa</th><th>Saldo</th></tr>';
    $('reportBody').innerHTML = reportRows.map(r =>
      `<tr><td>${r.label}</td><td class="val-mono">${fmtBRL(r.prev)}</td><td class="val-pos">${fmtBRL(r.pago)}</td><td class="val-neg">${fmtBRL(r.glosa)}</td><td class="${r.saldo >= 0 ? 'val-pos' : 'val-neg'}">${fmtBRL(r.saldo)}</td></tr>`
    ).join('');

  } else if (tipo === 'periodo') {
    activeMths.forEach((m, i) => {
      let prev = 0, pago = 0, glosa = 0;
      data.forEach(c => {
        prev += num(c.meses[m]?.prev);
        pago += num(c.meses[m]?.pago);
        glosa += num(c.meses[m]?.glosa);
      });
      const saldo = prev - pago;
      totals.prev += prev; totals.pago += pago; totals.glosa += glosa; totals.saldo += saldo;
      reportRows.push({ label: MONTH_NAMES[MONTHS.indexOf(m)], prev, pago, glosa, saldo });
    });

    $('reportHead').innerHTML = '<tr><th>Mês</th><th>Previsto</th><th>Pago</th><th>Glosa</th><th>Saldo</th></tr>';
    $('reportBody').innerHTML = reportRows.map(r =>
      `<tr><td>${r.label}</td><td class="val-mono">${fmtBRL(r.prev)}</td><td class="val-pos">${fmtBRL(r.pago)}</td><td class="val-neg">${fmtBRL(r.glosa)}</td><td class="${r.saldo >= 0 ? 'val-pos' : 'val-neg'}">${fmtBRL(r.saldo)}</td></tr>`
    ).join('');

  } else if (tipo === 'fonte') {
    const fonteMap = {};
    data.forEach(c => {
      if (!fonteMap[c.fonte]) fonteMap[c.fonte] = { prev: 0, pago: 0, glosa: 0 };
      activeMths.forEach(m => {
        fonteMap[c.fonte].prev += num(c.meses[m]?.prev);
        fonteMap[c.fonte].pago += num(c.meses[m]?.pago);
        fonteMap[c.fonte].glosa += num(c.meses[m]?.glosa);
      });
    });

    $('reportHead').innerHTML = '<tr><th>Fonte</th><th>Previsto</th><th>Pago</th><th>Glosa</th><th>Saldo</th></tr>';
    $('reportBody').innerHTML = Object.entries(fonteMap).map(([f, v]) => {
      const saldo = v.prev - v.pago;
      totals.prev += v.prev; totals.pago += v.pago; totals.glosa += v.glosa; totals.saldo += saldo;
      return `<tr><td><span class="td-badge badge-${f}">${f}</span></td><td class="val-mono">${fmtBRL(v.prev)}</td><td class="val-pos">${fmtBRL(v.pago)}</td><td class="val-neg">${fmtBRL(v.glosa)}</td><td class="${saldo >= 0 ? 'val-pos' : 'val-neg'}">${fmtBRL(saldo)}</td></tr>`;
    }).join('');

  } else {
    // Geral
    data.forEach(c => {
      const t = calcTotals(c);
      totals.prev += t.totPrev; totals.pago += t.totPago; totals.glosa += t.totGlosa; totals.saldo += t.saldo;
      reportRows.push({ label: `${c.contrato} — ${c.os} / ${c.unidade}`, fonte: c.fonte, prev: t.totPrev, pago: t.totPago, glosa: t.totGlosa, saldo: t.saldo });
    });

    $('reportHead').innerHTML = '<tr><th>Contrato</th><th>Fonte</th><th>Total Previsto</th><th>Total Pago</th><th>Glosa</th><th>Saldo</th></tr>';
    $('reportBody').innerHTML = reportRows.map(r =>
      `<tr><td>${r.label}</td><td><span class="td-badge badge-${r.fonte}">${r.fonte}</span></td><td class="val-mono">${fmtBRL(r.prev)}</td><td class="val-pos">${fmtBRL(r.pago)}</td><td class="val-neg">${fmtBRL(r.glosa)}</td><td class="${r.saldo >= 0 ? 'val-pos' : 'val-neg'}">${fmtBRL(r.saldo)}</td></tr>`
    ).join('');
  }

  $('reportFoot').innerHTML = `<tr class="total-row">
    <td colspan="${tipo === 'geral' ? 2 : 1}"><strong>TOTAL GERAL</strong></td>
    <td class="val-mono"><strong>${fmtBRL(totals.prev)}</strong></td>
    <td class="val-pos"><strong>${fmtBRL(totals.pago)}</strong></td>
    <td class="val-neg"><strong>${fmtBRL(totals.glosa)}</strong></td>
    <td class="${totals.saldo >= 0 ? 'val-pos' : 'val-neg'}"><strong>${fmtBRL(totals.saldo)}</strong></td>
  </tr>`;

  const tipoLabel = { contrato: 'Por Contrato', periodo: 'Por Período', fonte: 'Por Fonte', geral: 'Geral Consolidado' };
  $('reportTitle').textContent = `Relatório ${tipoLabel[tipo]}`;
  $('reportDate').textContent = `Gerado em ${today()}`;

  $('reportKpis').innerHTML = `
    <div class="kpi-card blue"><div class="kpi-label">Total Previsto</div><div class="kpi-value" style="font-size:1rem;">${fmtBRL(totals.prev)}</div></div>
    <div class="kpi-card green"><div class="kpi-label">Total Pago</div><div class="kpi-value" style="font-size:1rem;">${fmtBRL(totals.pago)}</div></div>
    <div class="kpi-card red"><div class="kpi-label">Total Glosa</div><div class="kpi-value" style="font-size:1rem;">${fmtBRL(totals.glosa)}</div></div>
    <div class="kpi-card yellow"><div class="kpi-label">Saldo</div><div class="kpi-value" style="font-size:1rem;">${fmtBRL(totals.saldo)}</div></div>
  `;

  $('reportOutput').style.display = 'block';
  $('reportOutput').scrollIntoView({ behavior: 'smooth' });
}

function printReport() {
  window.print();
}

function exportReportCSV() {
  const table = $('reportTable');
  if (!table) return;
  const rows = [...table.querySelectorAll('tr')];
  const csv = rows.map(r =>
    [...r.querySelectorAll('th,td')].map(c => `"${c.textContent.trim().replace(/"/g,'""')}"`).join(',')
  ).join('\n');
  downloadFile(csv, `relatorio_${today().replace(/\//g,'-')}.csv`, 'text/csv');
}

// ─── INIT ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadData();

  // Navigation
  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      const page = el.dataset.page;
      if (page === 'new-contract') editingId = null;
      navigate(page);
    });
  });

  // Mobile menu
  $('menuToggle').addEventListener('click', () => {
    $('sidebar').classList.toggle('open');
  });

  // Close modal on overlay click
  document.querySelectorAll('.modal-overlay').forEach(el => {
    el.addEventListener('click', e => {
      if (e.target === el) el.style.display = 'none';
    });
  });

  // Import drag and drop
  const zone = $('importZone');
  if (zone) {
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.style.borderColor = 'var(--accent)'; });
    zone.addEventListener('dragleave', () => { zone.style.borderColor = ''; });
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.style.borderColor = '';
      const file = e.dataTransfer.files[0];
      if (file) {
        const fakeEvt = { target: { files: [file] } };
        handleImport(fakeEvt);
      }
    });
  }

  navigate('dashboard');
});
