// =============================================
// ContratosPro v2.1 — Firebase CDN
// =============================================

'use strict';

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const PAGE_SIZE = 15;

let contracts = [];
let filtered = [];
let currentPage = 1;
let editingId = null;
let deleteId = null;
let pendingImport = null;
let charts = {};
let db = null;

const $ = id => document.getElementById(id);
const val = id => ($(id) ? $(id).value.trim() : '');
const num = v => (isNaN(parseFloat(v)) || v === '' || v === null || v === undefined ? 0 : parseFloat(v));

function fmt(v, d = 2) {
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }).format(num(v));
}
function fmtBRL(v) { return 'R$ ' + fmt(v); }
function today() { return new Date().toLocaleDateString('pt-BR'); }

function toast(msg, type = 'info') {
  const el = $('toast');
  el.textContent = msg;
  el.className = `toast show ${type}`;
  setTimeout(() => { el.className = 'toast'; }, 3500);
}

function setSync(status) {
  const dot = $('syncDot'), text = $('syncText');
  if (!dot || !text) return;
  if (status === 'online') { dot.className = 'sync-dot online'; text.textContent = 'Sincronizado'; }
  else if (status === 'saving') { dot.className = 'sync-dot saving'; text.textContent = 'Salvando...'; }
  else { dot.className = 'sync-dot offline'; text.textContent = 'Sem conexão'; }
}

function calcTotals(c) {
  let totPrev = 0, totPago = 0, totGlosa = 0;
  MONTHS.forEach(m => {
    const mes = c.meses?.[m] || {};
    totPrev += num(mes.prev); totPago += num(mes.pago); totGlosa += num(mes.glosa);
  });
  const saldo = num(c.valor_total) > 0 ? num(c.valor_total) - totPago : totPrev - totPago;
  return { totPrev, totPago, totGlosa, saldo };
}

// ─── Firebase Init ────────────────────────────
function initFirebase() {
  const firebaseConfig = {
    apiKey: "AIzaSyBPB3mRsKjiLxP9v_090y8mrD3tBL7aVw0",
    authDomain: "sistema-contratos-dd057.firebaseapp.com",
    projectId: "sistema-contratos-dd057",
    storageBucket: "sistema-contratos-dd057.firebasestorage.app",
    messagingSenderId: "950566474906",
    appId: "1:950566474906:web:9819c5ab34f7dbe1f3bb23"
  };

  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();

  db.collection('contratos')
    .orderBy('createdAt', 'desc')
    .onSnapshot(snapshot => {
      contracts = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setSync('online');
      $('loadingOverlay').style.display = 'none';

      const activePage = document.querySelector('.page.active');
      if (activePage?.id === 'page-dashboard') renderDashboard();
      if (activePage?.id === 'page-contracts') { filtered = [...contracts]; renderContracts(); }
    }, err => {
      console.error('Firestore error:', err);
      setSync('offline');
      $('loadingOverlay').style.display = 'none';
      toast('Erro de conexão: ' + err.message, 'error');
    });
}

async function saveToFirebase(data) {
  setSync('saving');
  try {
    const payload = { ...data, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
    if (editingId) {
      await db.collection('contratos').doc(editingId).update(payload);
    } else {
      payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('contratos').add(payload);
    }
    setSync('online');
    return true;
  } catch (e) {
    console.error(e);
    setSync('offline');
    toast('Erro ao salvar: ' + e.message, 'error');
    return false;
  }
}

async function deleteFromFirebase(id) {
  setSync('saving');
  try {
    await db.collection('contratos').doc(id).delete();
    setSync('online');
    return true;
  } catch (e) {
    setSync('offline');
    toast('Erro ao excluir.', 'error');
    return false;
  }
}

// ─── Navigation ──────────────────────────────
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const el = $(`page-${page}`);
  if (el) el.classList.add('active');
  const nav = document.querySelector(`[data-page="${page}"]`);
  if (nav) nav.classList.add('active');
  const titles = { dashboard: 'Painel', contracts: 'Contratos', 'new-contract': editingId ? 'Editar Contrato' : 'Novo Contrato', reports: 'Relatórios', import: 'Importar Dados' };
  $('pageTitle').textContent = titles[page] || page;
  if (window.innerWidth <= 900) $('sidebar').classList.remove('open');
  if (page === 'dashboard') renderDashboard();
  if (page === 'contracts') { filtered = [...contracts]; renderContracts(); }
  if (page === 'new-contract') renderForm();
  if (page === 'reports') populateReportSelects();
}

// ─── DASHBOARD ───────────────────────────────
function renderDashboard() {
  let totalPrev = 0, totalPago = 0, totalGlosa = 0, totalSaldo = 0;
  contracts.forEach(c => { const t = calcTotals(c); totalPrev += t.totPrev; totalPago += t.totPago; totalGlosa += t.totGlosa; totalSaldo += t.saldo; });

  $('kpiGrid').innerHTML = `
    <div class="kpi-card blue"><div class="kpi-label">Total Previsto</div><div class="kpi-value">${fmtBRL(totalPrev)}</div><div class="kpi-sub">${contracts.length} contrato(s)</div></div>
    <div class="kpi-card green"><div class="kpi-label">Total Pago</div><div class="kpi-value">${fmtBRL(totalPago)}</div><div class="kpi-sub">${fmt(totalPrev > 0 ? totalPago/totalPrev*100 : 0)}% executado</div></div>
    <div class="kpi-card red"><div class="kpi-label">Total Glosa</div><div class="kpi-value">${fmtBRL(totalGlosa)}</div><div class="kpi-sub">${fmt(totalPago > 0 ? totalGlosa/totalPago*100 : 0)}% do pago</div></div>
    <div class="kpi-card yellow"><div class="kpi-label">Saldo Disponível</div><div class="kpi-value">${fmtBRL(totalSaldo)}</div><div class="kpi-sub">Previsto - Pago</div></div>
    <div class="kpi-card purple"><div class="kpi-label">Contratos Ativos</div><div class="kpi-value">${contracts.length}</div><div class="kpi-sub">cadastros no sistema</div></div>
  `;
  renderCharts();
  const tbody = document.querySelector('#recentTable tbody');
  tbody.innerHTML = [...contracts].slice(0, 8).map(c => {
    const t = calcTotals(c);
    return `<tr><td class="td-mono">${c.contrato}</td><td>${c.os}</td><td>${c.unidade}</td><td class="val-mono">${fmtBRL(t.totPrev)}</td><td class="val-pos">${fmtBRL(t.totPago)}</td><td class="val-neg">${fmtBRL(t.totGlosa)}</td><td class="${t.saldo >= 0 ? 'val-pos' : 'val-neg'}">${fmtBRL(t.saldo)}</td></tr>`;
  }).join('');
}

function renderCharts() {
  Object.values(charts).forEach(c => c?.destroy()); charts = {};
  const fonteTotals = {};
  contracts.forEach(c => { const t = calcTotals(c); fonteTotals[c.fonte] = (fonteTotals[c.fonte] || 0) + t.totPago; });
  charts.fonte = new Chart($('chartFonte').getContext('2d'), {
    type: 'doughnut',
    data: { labels: Object.keys(fonteTotals).map(f => f.charAt(0).toUpperCase() + f.slice(1)), datasets: [{ data: Object.values(fonteTotals), backgroundColor: ['#4f8eff','#34d399','#fbbf24','#a78bfa'], borderWidth: 0, hoverOffset: 6 }] },
    options: { responsive: true, plugins: { legend: { labels: { color: '#8a90a2', font: { size: 11 } } }, tooltip: { callbacks: { label: ctx => ' R$ ' + fmt(ctx.parsed) } } } }
  });
  const grouped = {};
  contracts.forEach(c => { const key = `${c.contrato} - ${c.os}`; if (!grouped[key]) grouped[key] = { prev: 0, pago: 0 }; const t = calcTotals(c); grouped[key].prev += t.totPrev; grouped[key].pago += t.totPago; });
  charts.contratos = new Chart($('chartContratos').getContext('2d'), {
    type: 'bar',
    data: { labels: Object.keys(grouped).map(k => k.length > 20 ? k.slice(0,20)+'…' : k), datasets: [{ label: 'Previsto', data: Object.values(grouped).map(v => v.prev), backgroundColor: 'rgba(79,142,255,0.5)', borderColor: '#4f8eff', borderWidth: 1 }, { label: 'Pago', data: Object.values(grouped).map(v => v.pago), backgroundColor: 'rgba(52,211,153,0.5)', borderColor: '#34d399', borderWidth: 1 }] },
    options: { responsive: true, plugins: { legend: { labels: { color: '#8a90a2', font: { size: 11 } } }, tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: R$ ${fmt(ctx.parsed.y)}` } } }, scales: { x: { ticks: { color: '#5a6070', font: { size: 10 } }, grid: { color: '#252a38' } }, y: { ticks: { color: '#5a6070', callback: v => 'R$' + fmt(v/1000) + 'k' }, grid: { color: '#252a38' } } } }
  });
}

// ─── CONTRACTS ───────────────────────────────
function renderContracts() {
  currentPage = 1; renderTable();
  $('resultCount').textContent = `${filtered.length} contrato(s) encontrado(s)`;
}

function renderTable() {
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageData = filtered.slice(start, start + PAGE_SIZE);
  const tbody = $('contractsBody');
  if (!pageData.length) { tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:2rem;color:var(--text3);">Nenhum contrato encontrado.</td></tr>'; $('pagination').innerHTML = ''; return; }
  tbody.innerHTML = pageData.map(c => {
    const t = calcTotals(c);
    return `<tr><td class="td-mono">${c.contrato}</td><td>${c.os}</td><td>${c.unidade}</td><td>${c.ano}</td><td><span class="td-badge badge-${c.fonte}">${c.fonte}</span></td><td class="val-mono">${c.valor_total ? fmtBRL(c.valor_total) : '—'}</td><td class="val-mono">${fmtBRL(t.totPrev)}</td><td class="val-pos">${fmtBRL(t.totPago)}</td><td class="val-neg">${fmtBRL(t.totGlosa)}</td><td class="${t.saldo >= 0 ? 'val-pos' : 'val-neg'}">${fmtBRL(t.saldo)}</td><td><button class="action-btn" onclick="viewContract('${c.id}')">👁</button><button class="action-btn" onclick="startEdit('${c.id}')">✏</button><button class="action-btn danger" onclick="startDelete('${c.id}')">🗑</button></td></tr>`;
  }).join('');
  renderPagination();
}

function renderPagination() {
  const total = Math.ceil(filtered.length / PAGE_SIZE);
  if (total <= 1) { $('pagination').innerHTML = ''; return; }
  let html = '';
  if (currentPage > 1) html += `<button class="page-btn" onclick="goPage(${currentPage-1})">‹</button>`;
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= currentPage-2 && i <= currentPage+2)) html += `<button class="page-btn ${i===currentPage?'active':''}" onclick="goPage(${i})">${i}</button>`;
    else if (i === currentPage-3 || i === currentPage+3) html += `<span style="color:var(--text3);padding:0 4px;">…</span>`;
  }
  if (currentPage < total) html += `<button class="page-btn" onclick="goPage(${currentPage+1})">›</button>`;
  $('pagination').innerHTML = html;
}

function goPage(p) { currentPage = p; renderTable(); window.scrollTo(0,0); }

function searchContracts() {
  const sC = val('sContrato').toLowerCase(), sO = val('sOS').toLowerCase(), sObj = val('sObjeto').toLowerCase();
  const sA = val('sAno'), sF = val('sFonte'), sVM = num($('sValMin')?.value);
  filtered = contracts.filter(c => {
    const t = calcTotals(c);
    return (!sC || c.contrato.toLowerCase().includes(sC)) && (!sO || c.os.toLowerCase().includes(sO)) &&
           (!sObj || c.unidade.toLowerCase().includes(sObj)) && (!sA || c.ano == sA) &&
           (!sF || c.fonte === sF) && (!sVM || t.totPago >= sVM);
  });
  renderContracts();
}

function clearSearch() {
  ['sContrato','sOS','sObjeto','sAno','sFonte','sValMin'].forEach(id => { if ($(id)) $(id).value = ''; });
  filtered = [...contracts]; renderContracts();
}

// ─── FORM ─────────────────────────────────────
function renderForm() {
  $('formTitle').textContent = editingId ? 'Editar Contrato' : 'Novo Contrato';
  const c = editingId ? contracts.find(x => x.id === editingId) : null;
  if (c) { $('fContrato').value = c.contrato; $('fOS').value = c.os; $('fUnidade').value = c.unidade; $('fAno').value = c.ano; $('fFonte').value = c.fonte; $('fValorTotal').value = c.valor_total || ''; $('fObs').value = c.obs || ''; }
  else { ['fContrato','fOS','fUnidade','fFonte','fValorTotal','fObs'].forEach(id => { if ($(id)) $(id).value = ''; }); $('fAno').value = new Date().getFullYear(); }
  $('monthlyBody').innerHTML = MONTHS.map((m, i) => {
    const mes = c?.meses?.[m] || {};
    return `<tr><td>${MONTH_NAMES[i]}</td><td><input type="number" id="m_${m}_prev" step="0.01" min="0" value="${mes.prev||''}" placeholder="0,00" oninput="calcMonthlyTotal()" /></td><td><input type="number" id="m_${m}_pago" step="0.01" min="0" value="${mes.pago||''}" placeholder="0,00" oninput="calcMonthlyTotal()" /></td><td><input type="number" id="m_${m}_glosa" step="0.01" min="0" value="${mes.glosa||''}" placeholder="0,00" oninput="calcMonthlyTotal()" /></td></tr>`;
  }).join('');
  calcMonthlyTotal();
}

function calcMonthlyTotal() {
  let totPrev = 0, totPago = 0, totGlosa = 0;
  MONTHS.forEach(m => { totPrev += num($(`m_${m}_prev`)?.value); totPago += num($(`m_${m}_pago`)?.value); totGlosa += num($(`m_${m}_glosa`)?.value); });
  $('totPrev').textContent = fmtBRL(totPrev); $('totPago').textContent = fmtBRL(totPago); $('totGlosa').textContent = fmtBRL(totGlosa);
}

async function saveContract() {
  const contrato = val('fContrato'), os = val('fOS'), unidade = val('fUnidade'), fonte = val('fFonte');
  const ano = parseInt(val('fAno')) || new Date().getFullYear();
  if (!contrato || !os || !unidade || !fonte) { toast('Preencha os campos obrigatórios!', 'error'); return; }
  const meses = {};
  MONTHS.forEach(m => { meses[m] = { prev: num($(`m_${m}_prev`)?.value), pago: num($(`m_${m}_pago`)?.value), glosa: num($(`m_${m}_glosa`)?.value) }; });
  const $btn = $('saveBtn');
  $btn.disabled = true; $btn.textContent = 'Salvando...';
  const ok = await saveToFirebase({ contrato, os, unidade, ano, fonte, valor_total: num($('fValorTotal').value) || null, obs: val('fObs'), meses });
  $btn.disabled = false; $btn.textContent = '💾 Salvar Contrato';
  if (ok) { toast(editingId ? 'Contrato atualizado!' : 'Contrato cadastrado!', 'success'); editingId = null; navigate('contracts'); }
}

function cancelForm() { editingId = null; navigate('contracts'); }
function startEdit(id) { editingId = id; navigate('new-contract'); }

// ─── VIEW ─────────────────────────────────────
function viewContract(id) {
  const c = contracts.find(x => x.id === id); if (!c) return;
  const t = calcTotals(c);
  $('viewModalTitle').textContent = `Contrato ${c.contrato} — ${c.os}`;
  const monthRows = MONTHS.map((m, i) => { const mes = c.meses?.[m] || {}; if (!mes.prev && !mes.pago && !mes.glosa) return ''; return `<tr><td>${MONTH_NAMES[i]}</td><td class="val-mono">${fmtBRL(mes.prev)}</td><td class="val-pos">${fmtBRL(mes.pago)}</td><td class="val-neg">${fmtBRL(mes.glosa)}</td></tr>`; }).join('');
  $('viewModalBody').innerHTML = `
    <div class="detail-grid">
      <div class="detail-item"><label>Nº Contrato</label><span>${c.contrato}</span></div>
      <div class="detail-item"><label>OS / Empresa</label><span>${c.os}</span></div>
      <div class="detail-item"><label>Unidade / Objeto</label><span>${c.unidade}</span></div>
      <div class="detail-item"><label>Ano</label><span>${c.ano}</span></div>
      <div class="detail-item"><label>Fonte</label><span class="td-badge badge-${c.fonte}">${c.fonte}</span></div>
      <div class="detail-item"><label>Valor Total</label><span>${c.valor_total ? fmtBRL(c.valor_total) : '—'}</span></div>
    </div>
    <div class="form-section-title">Resumo Financeiro</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-bottom:1.5rem;">
      <div class="kpi-card blue"><div class="kpi-label">Total Previsto</div><div class="kpi-value" style="font-size:1rem;">${fmtBRL(t.totPrev)}</div></div>
      <div class="kpi-card green"><div class="kpi-label">Total Pago</div><div class="kpi-value" style="font-size:1rem;">${fmtBRL(t.totPago)}</div></div>
      <div class="kpi-card red"><div class="kpi-label">Total Glosa</div><div class="kpi-value" style="font-size:1rem;">${fmtBRL(t.totGlosa)}</div></div>
    </div>
    <div class="form-section-title">Execução Mensal</div>
    <div class="table-wrap"><table><thead><tr><th>Mês</th><th>Previsto</th><th>Pago</th><th>Glosa</th></tr></thead><tbody>${monthRows || '<tr><td colspan="4" style="text-align:center;color:var(--text3)">Sem execução registrada.</td></tr>'}</tbody><tfoot><tr class="total-row"><td><strong>TOTAL</strong></td><td class="val-mono"><strong>${fmtBRL(t.totPrev)}</strong></td><td class="val-pos"><strong>${fmtBRL(t.totPago)}</strong></td><td class="val-neg"><strong>${fmtBRL(t.totGlosa)}</strong></td></tr></tfoot></table></div>
    ${c.obs ? `<div class="form-section-title" style="margin-top:1.5rem;">Observações</div><p style="color:var(--text2);font-size:0.875rem;line-height:1.7;">${c.obs}</p>` : ''}
  `;
  $('viewModal').style.display = 'flex';
  $('viewModal')._currentId = id;
}

function editFromView() { const id = $('viewModal')._currentId; closeModal('viewModal'); startEdit(id); }
function printContract() { window.print(); }

// ─── DELETE ───────────────────────────────────
function startDelete(id) {
  const c = contracts.find(x => x.id === id); if (!c) return;
  deleteId = id; $('deleteContractName').textContent = `${c.contrato} — ${c.os}`; $('deleteModal').style.display = 'flex';
}

async function confirmDelete() {
  const ok = await deleteFromFirebase(deleteId);
  if (ok) { deleteId = null; closeModal('deleteModal'); toast('Contrato excluído.', 'success'); }
}

function closeModal(id) { $(id).style.display = 'none'; }

// ─── EXPORT ──────────────────────────────────
function exportCSV() {
  const data = filtered.length ? filtered : contracts;
  const headers = ['contrato','os','unidade','ano','fonte','valor_total', ...MONTHS.flatMap(m => [`${m}_prev`,`${m}_pago`,`${m}_glosa`]), 'total_previsto','total_pago','total_glosa','saldo','obs'];
  const rows = data.map(c => { const t = calcTotals(c); return [c.contrato, c.os, c.unidade, c.ano, c.fonte, c.valor_total||'', ...MONTHS.flatMap(m => { const mes = c.meses?.[m]||{}; return [mes.prev||0, mes.pago||0, mes.glosa||0]; }), t.totPrev, t.totPago, t.totGlosa, t.saldo, c.obs||''].map(v => `"${String(v).replace(/"/g,'""')}"`).join(','); });
  downloadFile([headers.join(','), ...rows].join('\n'), 'contratos.csv', 'text/csv');
  toast('CSV exportado!', 'success');
}

function downloadFile(content, filename, mime) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['\uFEFF' + content], { type: mime }));
  a.download = filename; a.click();
}

function downloadTemplate() {
  const headers = ['contrato','os','unidade','ano','fonte','valor_total', ...MONTHS.flatMap(m => [`${m}_prev`,`${m}_pago`,`${m}_glosa`]),'obs'];
  const example = ['01/2024','Santa Casa','Contratualização','2026','federal','', ...MONTHS.flatMap(() => ['','','']), 'Observações'];
  downloadFile([headers.join(','), example.join(',')].join('\n'), 'modelo_contratos.csv', 'text/csv');
}

// ─── IMPORT ───────────────────────────────────
function handleImport(event) {
  const file = event.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const text = e.target.result;
    if (file.name.endsWith('.json')) { try { pendingImport = JSON.parse(text); showImportPreview(pendingImport); } catch { toast('JSON inválido.', 'error'); } }
    else { pendingImport = parseCSV(text); showImportPreview(pendingImport); }
  };
  reader.readAsText(file, 'UTF-8');
}

function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const obj = {}; headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
    const meses = {};
    MONTHS.forEach(m => { meses[m] = { prev: num(obj[`${m}_prev`]), pago: num(obj[`${m}_pago`]), glosa: num(obj[`${m}_glosa`]) }; });
    return { contrato: obj.contrato||'', os: obj.os||'', unidade: obj.unidade||'', ano: parseInt(obj.ano)||new Date().getFullYear(), fonte: obj.fonte||'municipal', valor_total: num(obj.valor_total)||null, obs: obj.obs||'', meses };
  }).filter(c => c.contrato);
}

function showImportPreview(data) {
  if (!data?.length) { toast('Nenhum dado válido.', 'error'); return; }
  $('importHead').innerHTML = '<tr><th>Contrato</th><th>Empresa</th><th>Unidade</th><th>Ano</th><th>Fonte</th></tr>';
  $('importBody').innerHTML = data.slice(0,10).map(c => `<tr><td class="td-mono">${c.contrato}</td><td>${c.os}</td><td>${c.unidade}</td><td>${c.ano}</td><td>${c.fonte}</td></tr>`).join('');
  if (data.length > 10) $('importBody').innerHTML += `<tr><td colspan="5" style="text-align:center;color:var(--text3)">... e mais ${data.length-10} registros</td></tr>`;
  $('importPreview').style.display = 'block';
  toast(`${data.length} contratos prontos para importação.`, 'info');
}

async function confirmImport() {
  if (!pendingImport) return;
  toast('Importando...', 'info');
  for (const c of pendingImport) {
    await db.collection('contratos').add({ ...c, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
  }
  pendingImport = null; $('importPreview').style.display = 'none'; $('importFile').value = '';
  toast('Importação concluída!', 'success');
}

function cancelImport() { pendingImport = null; $('importPreview').style.display = 'none'; $('importFile').value = ''; }

async function clearAllData() {
  if (!confirm('Tem certeza? Todos os contratos serão excluídos permanentemente!')) return;
  for (const c of contracts) { await db.collection('contratos').doc(c.id).delete(); }
  toast('Todos os dados foram removidos.', 'error');
}

// ─── REPORTS ─────────────────────────────────
function populateReportSelects() {
  const sel = $('rContrato');
  sel.innerHTML = '<option value="">Todos</option>';
  [...new Set(contracts.map(c => c.contrato))].forEach(n => { const o = document.createElement('option'); o.value = n; o.textContent = n; sel.appendChild(o); });
}

function generateReport() {
  const tipo = val('rTipo'), contrato = val('rContrato'), mesIni = val('rMesIni'), mesFim = val('rMesFim'), ano = val('rAno'), fonte = val('rFonte');
  let data = contracts.filter(c => (!contrato || c.contrato === contrato) && (!ano || c.ano == ano) && (!fonte || c.fonte === fonte));
  const mesIniIdx = mesIni ? MONTHS.indexOf(mesIni) : 0;
  const mesFimIdx = mesFim ? MONTHS.indexOf(mesFim) : 11;
  const activeMths = MONTHS.slice(mesIniIdx, mesFimIdx + 1);
  let totals = { prev: 0, pago: 0, glosa: 0, saldo: 0 };

  if (tipo === 'contrato' || tipo === 'geral') {
    const extraCol = tipo === 'geral';
    $('reportHead').innerHTML = `<tr><th>Contrato</th>${extraCol ? '<th>Fonte</th>' : ''}<th>Previsto</th><th>Pago</th><th>Glosa</th><th>Saldo</th></tr>`;
    $('reportBody').innerHTML = data.map(c => { let prev = 0, pago = 0, glosa = 0; activeMths.forEach(m => { prev += num(c.meses?.[m]?.prev); pago += num(c.meses?.[m]?.pago); glosa += num(c.meses?.[m]?.glosa); }); const saldo = prev-pago; totals.prev+=prev; totals.pago+=pago; totals.glosa+=glosa; totals.saldo+=saldo; return `<tr><td>${c.contrato} — ${c.os} / ${c.unidade}</td>${extraCol ? `<td><span class="td-badge badge-${c.fonte}">${c.fonte}</span></td>` : ''}<td class="val-mono">${fmtBRL(prev)}</td><td class="val-pos">${fmtBRL(pago)}</td><td class="val-neg">${fmtBRL(glosa)}</td><td class="${saldo>=0?'val-pos':'val-neg'}">${fmtBRL(saldo)}</td></tr>`; }).join('');
    $('reportFoot').innerHTML = `<tr class="total-row"><td ${extraCol?'colspan="2"':''}><strong>TOTAL</strong></td><td class="val-mono"><strong>${fmtBRL(totals.prev)}</strong></td><td class="val-pos"><strong>${fmtBRL(totals.pago)}</strong></td><td class="val-neg"><strong>${fmtBRL(totals.glosa)}</strong></td><td><strong>${fmtBRL(totals.saldo)}</strong></td></tr>`;
  } else if (tipo === 'periodo') {
    $('reportHead').innerHTML = '<tr><th>Mês</th><th>Previsto</th><th>Pago</th><th>Glosa</th><th>Saldo</th></tr>';
    $('reportBody').innerHTML = activeMths.map(m => { let prev=0,pago=0,glosa=0; data.forEach(c=>{prev+=num(c.meses?.[m]?.prev);pago+=num(c.meses?.[m]?.pago);glosa+=num(c.meses?.[m]?.glosa);}); const saldo=prev-pago; totals.prev+=prev;totals.pago+=pago;totals.glosa+=glosa;totals.saldo+=saldo; return `<tr><td>${MONTH_NAMES[MONTHS.indexOf(m)]}</td><td class="val-mono">${fmtBRL(prev)}</td><td class="val-pos">${fmtBRL(pago)}</td><td class="val-neg">${fmtBRL(glosa)}</td><td class="${saldo>=0?'val-pos':'val-neg'}">${fmtBRL(saldo)}</td></tr>`; }).join('');
    $('reportFoot').innerHTML = `<tr class="total-row"><td><strong>TOTAL</strong></td><td class="val-mono"><strong>${fmtBRL(totals.prev)}</strong></td><td class="val-pos"><strong>${fmtBRL(totals.pago)}</strong></td><td class="val-neg"><strong>${fmtBRL(totals.glosa)}</strong></td><td><strong>${fmtBRL(totals.saldo)}</strong></td></tr>`;
  } else if (tipo === 'fonte') {
    const fonteMap = {};
    data.forEach(c=>{if(!fonteMap[c.fonte])fonteMap[c.fonte]={prev:0,pago:0,glosa:0};activeMths.forEach(m=>{fonteMap[c.fonte].prev+=num(c.meses?.[m]?.prev);fonteMap[c.fonte].pago+=num(c.meses?.[m]?.pago);fonteMap[c.fonte].glosa+=num(c.meses?.[m]?.glosa);});});
    $('reportHead').innerHTML = '<tr><th>Fonte</th><th>Previsto</th><th>Pago</th><th>Glosa</th><th>Saldo</th></tr>';
    $('reportBody').innerHTML = Object.entries(fonteMap).map(([f,v])=>{const saldo=v.prev-v.pago;totals.prev+=v.prev;totals.pago+=v.pago;totals.glosa+=v.glosa;totals.saldo+=saldo;return `<tr><td><span class="td-badge badge-${f}">${f}</span></td><td class="val-mono">${fmtBRL(v.prev)}</td><td class="val-pos">${fmtBRL(v.pago)}</td><td class="val-neg">${fmtBRL(v.glosa)}</td><td class="${saldo>=0?'val-pos':'val-neg'}">${fmtBRL(saldo)}</td></tr>`;}).join('');
    $('reportFoot').innerHTML = `<tr class="total-row"><td><strong>TOTAL</strong></td><td class="val-mono"><strong>${fmtBRL(totals.prev)}</strong></td><td class="val-pos"><strong>${fmtBRL(totals.pago)}</strong></td><td class="val-neg"><strong>${fmtBRL(totals.glosa)}</strong></td><td><strong>${fmtBRL(totals.saldo)}</strong></td></tr>`;
  }

  const tipoLabel = { contrato:'Por Contrato', periodo:'Por Período', fonte:'Por Fonte', geral:'Geral Consolidado' };
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

function printReport() { window.print(); }
function exportReportCSV() {
  const table = $('reportTable'); if (!table) return;
  const csv = [...table.querySelectorAll('tr')].map(r => [...r.querySelectorAll('th,td')].map(c => `"${c.textContent.trim().replace(/"/g,'""')}"`).join(',')).join('\n');
  downloadFile(csv, `relatorio_${today().replace(/\//g,'-')}.csv`, 'text/csv');
}

// ─── INIT ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initFirebase();

  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', e => { e.preventDefault(); if (el.dataset.page === 'new-contract') editingId = null; navigate(el.dataset.page); });
  });
  $('menuToggle').addEventListener('click', () => $('sidebar').classList.toggle('open'));
  document.querySelectorAll('.modal-overlay').forEach(el => { el.addEventListener('click', e => { if (e.target === el) el.style.display = 'none'; }); });

  const zone = $('importZone');
  if (zone) {
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.style.borderColor = 'var(--accent)'; });
    zone.addEventListener('dragleave', () => { zone.style.borderColor = ''; });
    zone.addEventListener('drop', e => { e.preventDefault(); zone.style.borderColor = ''; const file = e.dataTransfer.files[0]; if (file) handleImport({ target: { files: [file] } }); });
  }
  navigate('dashboard');
});
