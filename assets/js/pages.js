/* Fin360 — páginas da aplicação */

function goRoute(route) { location.hash = '#/' + route; }

function addDaysISO(iso, n) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function inPeriod(iso, period) {
  if (!iso) return false;
  if (period.type === 'year') return isSameYear(iso, period.value);
  return isSameMonth(iso, period.value || currentMonthStr());
}

function renderPeriodControl(prefix, period) {
  return `
    <div class="pill-group" id="${prefix}-period-group">
      <button class="pill ${period.type === 'month' ? 'active' : ''}" data-mode="thismonth">Este mês</button>
      <button class="pill" data-mode="custommonth">Escolher mês</button>
      <button class="pill ${period.type === 'year' ? 'active' : ''}" data-mode="year">Ano</button>
      ${period.type === 'month' ? `<input type="month" id="${prefix}-month-input" value="${period.value || currentMonthStr()}" style="width:150px" />` : ''}
    </div>
  `;
}
function wirePeriodControl(prefix, period, onChange) {
  const group = document.getElementById(`${prefix}-period-group`);
  if (!group) return;
  group.querySelectorAll('.pill').forEach((btn) => {
    btn.onclick = () => {
      if (btn.dataset.mode === 'thismonth') { period.type = 'month'; period.value = currentMonthStr(); }
      else if (btn.dataset.mode === 'custommonth') { period.type = 'month'; period.value = period.value || currentMonthStr(); }
      else if (btn.dataset.mode === 'year') { period.type = 'year'; period.value = String(new Date().getFullYear()); }
      onChange();
    };
  });
  const monthInput = document.getElementById(`${prefix}-month-input`);
  if (monthInput) monthInput.onchange = () => { period.value = monthInput.value; onChange(); };
}

/* ============ generic field rendering for simple CRUD pages ============ */
function fieldHTML(field, value) {
  const id = `f-${field.key}`;
  switch (field.type) {
    case 'number':
      return `<input type="number" step="0.01" id="${id}" value="${value ?? ''}" placeholder="${field.placeholder || '0,00'}" />`;
    case 'date':
      return `<input type="date" id="${id}" value="${value || todayISO()}" />`;
    case 'textarea':
      return `<textarea id="${id}" placeholder="${field.placeholder || ''}">${value || ''}</textarea>`;
    case 'select-category':
      return `<div class="input-with-btn"><select id="${id}">${categoryOptions(value)}</select><button type="button" class="btn-icon" id="${id}-add" title="Nova categoria">${icon('plus')}</button></div>`;
    case 'select-bank':
      return `<div class="input-with-btn"><select id="${id}">${bankOptions(value)}</select><button type="button" class="btn-icon" id="${id}-add" title="Novo banco">${icon('plus')}</button></div>`;
    case 'select':
      return `<select id="${id}">${field.options.map((o) => `<option value="${o.value}" ${o.value === value ? 'selected' : ''}>${o.label}</option>`).join('')}</select>`;
    case 'checkbox':
      return `<label class="checkbox-row"><input type="checkbox" id="${id}" ${value ? 'checked' : ''} /> ${field.label}</label>`;
    case 'emoji':
      return `<input type="text" id="${id}" value="${value || '🏷️'}" maxlength="2" style="width:64px;text-align:center" />`;
    default:
      return `<input type="text" id="${id}" value="${value || ''}" placeholder="${field.placeholder || ''}" />`;
  }
}
function readField(field) {
  const el = document.getElementById(`f-${field.key}`);
  if (!el) return undefined;
  if (field.type === 'number') return parseFloat(el.value) || 0;
  if (field.type === 'checkbox') return el.checked;
  return el.value;
}
function wireQuickAddButtons(fields) {
  fields.forEach((f) => {
    if (f.type === 'select-category') {
      const btn = document.getElementById(`f-${f.key}-add`);
      if (btn) btn.onclick = () => quickAddCategory((id) => { document.getElementById(`f-${f.key}`).innerHTML = categoryOptions(id); });
    }
    if (f.type === 'select-bank') {
      const btn = document.getElementById(`f-${f.key}-add`);
      if (btn) btn.onclick = () => quickAddBank((id) => { document.getElementById(`f-${f.key}`).innerHTML = bankOptions(id); });
    }
  });
}

function collapsibleNewCategory(prefix) {
  return `
    <button type="button" class="btn btn-ghost btn-block" id="${prefix}-toggle-cat" style="justify-content:space-between">
      <span>${icon('plus')} Nova categoria</span>${icon('chevronDown')}
    </button>
    <div id="${prefix}-newcat-box" style="display:none;margin-top:10px;padding:12px;border:1px solid var(--border);border-radius:10px;background:var(--bg-input)">
      <div class="field-row">
        <div class="field"><label>Nome</label><input type="text" id="${prefix}-nc-name" placeholder="Ex.: Pet" /></div>
        <div class="field"><label>Emoji</label><input type="text" id="${prefix}-nc-emoji" value="🏷️" maxlength="2" /></div>
      </div>
      <div class="field"><label>Cor</label><input type="text" id="${prefix}-nc-color" value="#3866ff" /></div>
      <button type="button" class="btn btn-primary btn-sm btn-block" id="${prefix}-nc-add">Adicionar categoria</button>
    </div>
  `;
}
function wireCollapsibleNewCategory(prefix, onAdded) {
  const toggle = document.getElementById(`${prefix}-toggle-cat`);
  const box = document.getElementById(`${prefix}-newcat-box`);
  if (!toggle) return;
  toggle.onclick = () => { box.style.display = box.style.display === 'none' ? 'block' : 'none'; };
  document.getElementById(`${prefix}-nc-add`).onclick = () => {
    const name = document.getElementById(`${prefix}-nc-name`).value.trim();
    if (!name) { toast('Dê um nome para a categoria', 'danger'); return; }
    const cat = Store.add('categories', {
      name,
      emoji: document.getElementById(`${prefix}-nc-emoji`).value || '🏷️',
      color: document.getElementById(`${prefix}-nc-color`).value || '#3866ff',
    });
    toast('Categoria adicionada', 'success');
    onAdded && onAdded(cat.id);
  };
}

/* =========================================================================
   DASHBOARD
   ========================================================================= */
let dashPeriod = { type: 'month', value: currentMonthStr() };

function monthsInPeriod(period) {
  if (period.type === 'year') return Array.from({ length: 12 }, (_, i) => `${period.value}-${String(i + 1).padStart(2, '0')}`);
  return [period.value || currentMonthStr()];
}

function pageDashboard(container) {
  const draw = () => {
    const period = dashPeriod;
    const months = monthsInPeriod(period);
    const fixos = months.flatMap((m) => gastosFixosForMonth(m));
    const variaveis = Store.state.gastosVariaveis.filter((g) => months.includes(g.data.slice(0, 7)));
    const receb = months.flatMap((m) => recebimentosForMonth(m));
    const faturaCartoes = months.reduce((s, m) => s + allCartoesFaturaForMonth(m), 0);

    const totalGastos = fixos.reduce((s, g) => s + g.valor, 0) + variaveis.reduce((s, g) => s + g.valor, 0) + faturaCartoes;
    const totalRecebimentos = receb.reduce((s, r) => s + r.valor, 0);
    const totalAReceber = receb.filter((r) => !r.recebido).reduce((s, r) => s + r.valor, 0);
    const totalPago = fixos.filter((g) => g.pago).reduce((s, g) => s + g.valor, 0) + variaveis.filter((g) => g.status === 'pago').reduce((s, g) => s + g.valor, 0);
    const faltaPagar = totalGastos - totalPago;
    const saldoBancos = Store.state.banks.reduce((s, b) => s + (b.balance || 0), 0);
    const saldoDisponivel = saldoBancos + receb.filter((r) => r.recebido).reduce((s, r) => s + r.valor, 0) - totalPago;

    const allTx = [
      ...fixos.map((g) => ({ ...g, label: g.nome, date: g.vencimentoISO, kind: 'gasto' })),
      ...variaveis.map((g) => ({ ...g, label: g.descricao, date: g.data, kind: 'gasto' })),
      ...receb.map((r) => ({ ...r, label: r.descricao, date: r.dataOcorrencia, kind: 'receb' })),
    ].sort((a, b) => (a.date < b.date ? 1 : -1));

    const catTotals = {};
    [...fixos, ...variaveis].forEach((g) => {
      const key = g.categoryId || 'sem';
      catTotals[key] = (catTotals[key] || 0) + g.valor;
    });
    const catEntries = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
    const catSum = catEntries.reduce((s, [, v]) => s + v, 0);

    const years = new Set([new Date().getFullYear()]);
    const yearSel = Number(period.type === 'year' ? period.value : new Date().getFullYear());

    container.innerHTML = `
      <div class="panel" style="margin-bottom:14px">
        <div class="panel-header">
          <div>
            <span class="stat-label">Período</span>
            <h3 style="margin-top:4px">${period.type === 'year' ? period.value : 'Este mês'}</h3>
          </div>
          ${renderPeriodControl('dash', period)}
        </div>
      </div>

      <div class="stat-grid">
        ${statCard({ label: 'Total de gastos', value: formatCurrency(totalGastos), sub: 'Fixos + variáveis + cartão', tone: 'red', iconName: 'arrowDownCircle' })}
        ${statCard({ label: 'Total de recebimentos', value: formatCurrency(totalRecebimentos), sub: 'Entradas no período', tone: 'green', iconName: 'arrowUpCircle' })}
        ${statCard({ label: 'Total a receber', value: formatCurrency(totalAReceber), sub: 'Recebimentos futuros', tone: 'blue', iconName: 'download' })}
        ${statCard({ label: 'Total pago', value: formatCurrency(totalPago), sub: 'Despesas já quitadas', tone: 'purple', iconName: 'checkCircle' })}
        ${statCard({ label: 'Falta pagar', value: formatCurrency(faltaPagar), sub: 'Pendentes + fatura', tone: 'orange', iconName: 'alertTriangle' })}
        ${statCard({ label: 'Saldo disponível', value: formatCurrency(saldoDisponivel), sub: saldoDisponivel >= 0 ? 'Positivo' : 'Negativo', tone: 'cyan', iconName: 'wallet' })}
      </div>

      <div class="panel">
        <div class="panel-header"><div><h3>Evolução do saldo</h3><div class="panel-sub">Acumulado no período selecionado</div></div></div>
        ${period.type === 'month' ? areaChartHTML(period.value, saldoBancos) : emptyState({ iconName: 'trendUp', title: 'Selecione "Este mês" ou "Escolher mês" para ver a evolução diária.' })}
      </div>

      <div class="panel">
        ${fixos.length === 0 ? emptyState({
          iconName: 'checkCircle', title: 'Nenhum gasto fixo cadastrado', text: 'Cadastre suas contas recorrentes (aluguel, internet, etc) para acompanhar aqui.', actionLabel: 'Adicionar gasto fixo', actionId: 'dash-add-fixo',
        }) : `
          <div class="panel-header">
            <div><h3>${icon('repeat')} Gastos fixos do mês</h3><div class="panel-sub">Recorrências automáticas — atualizam todo mês.</div></div>
            <div style="display:flex;gap:22px">
              <div><div class="stat-label" style="text-align:right">Total</div><strong>${formatCurrency(fixos.reduce((s, g) => s + g.valor, 0))}</strong></div>
              <div><div class="stat-label" style="text-align:right">Pendentes</div><strong style="color:var(--warning)">${formatCurrency(fixos.filter((g) => !g.pago).reduce((s, g) => s + g.valor, 0))}</strong></div>
            </div>
          </div>
          ${gastosFixosMiniList(fixos.slice(0, 5))}
          <button class="btn btn-ghost btn-block" id="dash-add-fixo" style="margin-top:6px">Gerenciar gastos fixos</button>
        `}
      </div>

      <div class="grid-2">
        <div class="panel">
          <div class="panel-header"><h3>${icon('card')} Seus cartões</h3><button class="btn btn-ghost btn-sm" id="dash-go-cartoes">Gerenciar</button></div>
          ${Store.state.cartoes.length === 0 ? emptyState({ iconName: 'card', title: 'Você ainda não cadastrou nenhum cartão', actionLabel: 'Adicionar cartão', actionId: 'dash-add-cartao' }) : cardsMini(Store.state.cartoes)}
        </div>
        <div class="panel">
          <div class="panel-header"><h3>${icon('piggy')} Seus cofrinhos</h3><button class="btn btn-ghost btn-sm" id="dash-go-cofrinhos">Gerenciar</button></div>
          ${Store.state.cofrinhos.length === 0 ? emptyState({ iconName: 'piggy', title: 'Você ainda não tem cofrinhos ativos', actionLabel: 'Criar cofrinho', actionId: 'dash-add-cofrinho' }) : cofrinhosMini(Store.state.cofrinhos)}
        </div>
      </div>

      <div class="panel">
        <div class="panel-header"><h3>${icon('trendUp')} Seus investimentos</h3><button class="btn btn-ghost btn-sm" id="dash-go-investimentos">Gerenciar</button></div>
        ${Store.state.investimentos.length === 0 ? emptyState({ iconName: 'trendUp', title: 'Você ainda não tem investimentos cadastrados', actionLabel: 'Adicionar investimento', actionId: 'dash-add-investimento' }) : investMini(Store.state.investimentos)}
      </div>

      <div class="grid-2">
        <div class="panel">
          <div class="panel-header"><div><h3>Distribuição por categoria</h3><div class="panel-sub">Como seus gastos se dividem</div></div></div>
          ${catEntries.length === 0 ? `<div style="text-align:center;padding:30px 0"><div class="stat-label">Total</div><div class="stat-value" style="font-size:26px">${formatCurrency(0)}</div></div>` : categoryDonut(catEntries, catSum)}
        </div>
        <div class="panel">
          <div class="panel-header"><div><h3>Últimas transações</h3><div class="panel-sub">Movimentações recentes</div></div></div>
          ${allTx.length === 0 ? emptyState({ iconName: 'list', title: 'Nenhuma transação ainda' }) : recentTxList(allTx.slice(0, 6))}
        </div>
      </div>

      <div class="panel">
        <div class="panel-header">
          <div><h3>${icon('calendar')} Controle do Ano — Mês por mês</h3><div class="panel-sub">Projeção financeira: realizados, mês atual e meses futuros agendados</div></div>
          <select id="dash-year-select">${[...years].map((y) => `<option value="${y}" ${y === yearSel ? 'selected' : ''}>${y}</option>`).join('')}</select>
        </div>
        ${yearTable(yearSel)}
      </div>
    `;

    wirePeriodControl('dash', period, draw);
    document.getElementById('dash-year-select').onchange = (e) => { dashPeriod = { type: 'year', value: e.target.value }; draw(); };
    const go = (id, route) => { const el = document.getElementById(id); if (el) el.onclick = () => goRoute(route); };
    go('dash-add-fixo', 'gastos-fixos'); go('dash-go-cartoes', 'cartoes'); go('dash-add-cartao', 'cartoes');
    go('dash-go-cofrinhos', 'cofrinhos'); go('dash-add-cofrinho', 'cofrinhos');
    go('dash-go-investimentos', 'investimentos'); go('dash-add-investimento', 'investimentos');
    container.querySelectorAll('[data-action="toggle-pago-fixo"]').forEach((b) => b.onclick = () => { toggleGastoFixoPago(b.dataset.id, b.dataset.mes); draw(); });
  };
  draw();
}

function areaChartHTML(mStr, saldoInicial) {
  const [y, m] = mStr.split('-').map(Number);
  const nDays = daysInMonth(y, m - 1);
  const days = Array.from({ length: nDays }, (_, i) => `${mStr}-${String(i + 1).padStart(2, '0')}`);
  const despesasDia = days.map((d) =>
    Store.state.gastosVariaveis.filter((g) => g.data === d).reduce((s, g) => s + g.valor, 0) +
    Store.state.gastosFixos.filter((g) => g.ativo !== false && gastoFixoVencimentoISO(g, mStr) === d).reduce((s, g) => s + g.valor, 0));
  const recebMes = recebimentosForMonth(mStr);
  const receitasDia = days.map((d) => recebMes.filter((r) => r.dataOcorrencia === d).reduce((s, r) => s + r.valor, 0));
  let acc = saldoInicial;
  const saldoDia = despesasDia.map((despesa, i) => { acc += receitasDia[i] - despesa; return acc; });

  if (despesasDia.every((v) => v === 0) && receitasDia.every((v) => v === 0)) {
    return emptyState({ iconName: 'trendUp', title: 'Sem movimentações no período.' });
  }

  const w = 1000, h = 280, padL = 56, padB = 26, padT = 14;
  const maxVal = Math.max(...saldoDia, ...despesasDia, ...receitasDia, 1);
  const minVal = Math.min(...saldoDia, 0);
  const range = maxVal - minVal || 1;
  const x = (i) => padL + (i / (nDays - 1 || 1)) * (w - padL - 10);
  const y0 = (v) => padT + (1 - (v - minVal) / range) * (h - padT - padB);
  const toPath = (arr) => arr.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y0(v).toFixed(1)}`).join(' ');
  const saldoPath = toPath(saldoDia);
  const areaPath = `${saldoPath} L${x(nDays - 1).toFixed(1)},${y0(minVal).toFixed(1)} L${x(0).toFixed(1)},${y0(minVal).toFixed(1)} Z`;
  const yTicks = [minVal, minVal + range / 2, maxVal];

  return `
    <svg viewBox="0 0 ${w} ${h}" style="width:100%;height:240px">
      <defs><linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--primary)" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="var(--primary)" stop-opacity="0"/>
      </linearGradient></defs>
      ${yTicks.map((t) => `<line x1="${padL}" y1="${y0(t).toFixed(1)}" x2="${w - 10}" y2="${y0(t).toFixed(1)}" stroke="var(--border-soft)" stroke-width="1"/><text x="0" y="${(y0(t) + 4).toFixed(1)}" font-size="16" fill="var(--text-faint)">${formatCurrency(t).replace('R$', '').trim()}</text>`).join('')}
      <path d="${areaPath}" fill="url(#areaGrad)" stroke="none"/>
      <path d="${toPath(despesasDia)}" fill="none" stroke="var(--danger)" stroke-width="2" opacity="0.7"/>
      <path d="${toPath(receitasDia)}" fill="none" stroke="var(--success)" stroke-width="2" opacity="0.7"/>
      <path d="${saldoPath}" fill="none" stroke="var(--primary)" stroke-width="3"/>
      ${days.filter((_, i) => i % 4 === 0 || i === nDays - 1).map((d, _, arr) => {
        const i = days.indexOf(d);
        return `<text x="${x(i).toFixed(1)}" y="${h - 4}" font-size="15" fill="var(--text-faint)" text-anchor="middle">${d.slice(8, 10)}/${mStr.slice(5, 7)}</text>`;
      }).join('')}
    </svg>
    <div style="display:flex;gap:18px;justify-content:center;margin-top:6px;font-size:12px;color:var(--text-muted)">
      <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--danger);margin-right:5px"></span>Despesas</span>
      <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--success);margin-right:5px"></span>Receitas</span>
      <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--primary);margin-right:5px"></span>Saldo</span>
    </div>
  `;
}

function gastosFixosMiniList(items) {
  return items.map((g) => `
    <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-top:1px solid var(--border-soft)">
      ${categoryAvatar(g.categoryId)}
      <div style="flex:1">
        <div class="row-title">${g.nome}</div>
        <div class="row-sub">${(Store.categoryById(g.categoryId) || {}).name || 'Sem categoria'} · dia ${g.diaVencimento}</div>
      </div>
      <strong>${formatCurrency(g.valor)}</strong>
      <button class="badge ${g.pago ? 'badge-success' : 'badge-warning'}" style="border:none" data-action="toggle-pago-fixo" data-id="${g.id}" data-mes="${g.mesRef}">${g.pago ? 'Pago' : 'Paga este mês'}</button>
    </div>`).join('');
}

function miniList(items) {
  return `<table class="list-table"><tbody>${items.map((i) => `
    <tr>
      <td><div class="row-title">${i.title}</div><div class="row-sub">${i.sub}</div></td>
      <td style="text-align:right">${formatCurrency(i.value)}</td>
      <td style="text-align:right">${badgeStatus(i.status)}</td>
    </tr>`).join('')}</tbody></table>`;
}
function cardsMini(cartoes) {
  return `<div class="grid-2">${cartoes.map((c) => {
    const mStr = currentMonthStr();
    const fatura = cartaoFaturaForMonth(c.id, mStr);
    const pct = c.limite > 0 ? Math.min(100, Math.round((fatura / c.limite) * 100)) : 0;
    return `
    <div style="background:var(--bg-input);border:1px solid var(--border-soft);border-radius:12px;padding:14px">
      <div style="display:flex;justify-content:space-between"><strong>${c.nome}</strong></div>
      <div class="row-sub" style="margin-bottom:8px">${c.banco || ''}</div>
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
        <strong style="font-size:17px">${formatCurrency(fatura)}</strong><span class="row-sub">de ${formatCurrency(c.limite)}</span>
      </div>
      <div class="progress-track"><div class="progress-fill" style="width:${pct}%;background:${pct > 80 ? 'var(--danger)' : 'var(--primary)'}"></div></div>
      <div class="row-sub" style="margin-top:8px">Vence dia ${c.diaVencimento || '—'} · Fecha dia ${c.diaFechamento || '—'}</div>
    </div>`;
  }).join('')}</div>`;
}
function cofrinhosMini(list) {
  return list.map((c) => {
    const pct = c.meta > 0 ? Math.min(100, Math.round((c.atual / c.meta) * 100)) : 0;
    return `
      <div style="margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px">
          <span>${c.icone || '🎯'} ${c.nome}</span>
          <span class="row-sub">${pct}% do objetivo</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:6px">
          <strong>${formatCurrency(c.atual)}</strong><span class="row-sub">de ${formatCurrency(c.meta)}</span>
        </div>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%;background:${c.cor || 'var(--primary)'}"></div></div>
      </div>`;
  }).join('');
}
function investMini(list) {
  return `<table class="list-table"><tbody>${list.map((i) => `
    <tr><td><div class="row-title">${i.nome}</div><div class="row-sub">${i.tipo}</div></td>
    <td style="text-align:right">${formatCurrency(i.capitalInicial)}</td></tr>`).join('')}</tbody></table>`;
}
function categoryDonut(entries, sum) {
  const colors = entries.map(([catId]) => (Store.categoryById(catId) || {}).color || 'var(--text-faint)');
  let acc = 0;
  const stops = entries.map(([catId, val], i) => {
    const start = acc;
    const pct = sum > 0 ? (val / sum) * 100 : 0;
    acc += pct;
    return `${colors[i]} ${start.toFixed(2)}% ${acc.toFixed(2)}%`;
  }).join(', ');
  return `
    <div style="display:flex;gap:24px;align-items:center;flex-wrap:wrap">
      <div style="width:160px;height:160px;border-radius:50%;background:conic-gradient(${stops});flex-shrink:0;display:flex;align-items:center;justify-content:center">
        <div style="width:96px;height:96px;border-radius:50%;background:var(--bg-card);display:flex;flex-direction:column;align-items:center;justify-content:center">
          <span class="stat-label">Total</span><strong style="font-size:15px">${formatCurrency(sum)}</strong>
        </div>
      </div>
      <div style="flex:1;min-width:180px">
        ${entries.map(([catId, val], i) => {
          const cat = Store.categoryById(catId);
          const pct = sum > 0 ? ((val / sum) * 100).toFixed(1) : '0.0';
          return `<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;font-size:13px">
            <span style="display:flex;align-items:center;gap:7px"><span style="width:9px;height:9px;border-radius:50%;background:${colors[i]}"></span>${cat ? cat.name : 'Sem categoria'}</span>
            <span class="row-sub">${pct}%</span>
          </div>`;
        }).join('')}
      </div>
    </div>
  `;
}
function recentTxList(items) {
  return `<table class="list-table"><tbody>${items.map((t) => `
    <tr>
      <td style="width:44px">${categoryAvatar(t.categoryId)}</td>
      <td><div class="row-title">${t.label}</div><div class="row-sub">${formatDateBR(t.date)}</div></td>
      <td style="text-align:right" class="${t.kind === 'receb' ? 'amount-pos' : 'amount-neg'}">${t.kind === 'receb' ? '+' : '-'} ${formatCurrency(t.valor)}</td>
    </tr>`).join('')}</tbody></table>`;
}
function badgeStatus(status) {
  if (status === 'pago' || status === 'recebido') return `<span class="badge badge-success">${icon('checkCircle')} ${status === 'pago' ? 'Pago' : 'Recebido'}</span>`;
  return `<span class="badge badge-warning">Pendente</span>`;
}

function yearTable(year) {
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, i) => i);
  const saldoBancos = Store.state.banks.reduce((s, b) => s + (b.balance || 0), 0);
  let runningBalance = saldoBancos;
  let totalGanhos = 0, totalFixos = 0, totalVar = 0, totalCartao = 0;
  const rows = months.map((m) => {
    const mStr = `${year}-${String(m + 1).padStart(2, '0')}`;
    const ganhos = recebimentosForMonth(mStr).reduce((s, r) => s + r.valor, 0);
    const fixos = gastosFixosForMonth(mStr).reduce((s, g) => s + g.valor, 0);
    const variaveis = Store.state.gastosVariaveis.filter((g) => isSameMonth(g.data, mStr)).reduce((s, g) => s + g.valor, 0);
    const cartao = allCartoesFaturaForMonth(mStr);
    totalGanhos += ganhos; totalFixos += fixos; totalVar += variaveis; totalCartao += cartao;
    runningBalance += ganhos - fixos - variaveis - cartao;
    let status = 'PROJETADO', cls = 'badge-warning';
    if (year < now.getFullYear() || (year === now.getFullYear() && m < now.getMonth())) { status = 'REALIZADO'; cls = 'badge-success'; }
    else if (year === now.getFullYear() && m === now.getMonth()) { status = 'ATUAL'; cls = 'badge-primary'; }
    const isCurrent = year === now.getFullYear() && m === now.getMonth();
    return `<tr class="${isCurrent ? 'is-current' : ''}">
      <td><strong>${monthLabel(m)} / ${year}</strong></td>
      <td><span class="badge ${cls}">${status}</span></td>
      <td class="amount-pos">${formatCurrency(ganhos)}</td>
      <td>${formatCurrency(fixos)}</td>
      <td>${formatCurrency(variaveis)}</td>
      <td>${formatCurrency(cartao)}</td>
      <td>${formatCurrency(0)}</td>
      <td><strong>${formatCurrency(runningBalance)}</strong></td>
    </tr>`;
  }).join('');

  return `
    <div class="month-table-wrap">
      <table class="month-table">
        <thead><tr><th>Mês</th><th>Status</th><th>Ganhos</th><th>Gastos fixos</th><th>Gastos variáveis</th><th>Cartão de crédito</th><th>Parcelamentos</th><th>Balanço</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><td colspan="2">Total do ano</td><td class="amount-pos">${formatCurrency(totalGanhos)}</td><td>${formatCurrency(totalFixos)}</td><td>${formatCurrency(totalVar)}</td><td>${formatCurrency(totalCartao)}</td><td>${formatCurrency(0)}</td><td>${formatCurrency(runningBalance)}</td></tr></tfoot>
      </table>
    </div>
  `;
}
/* =========================================================================
   RESUMO
   ========================================================================= */
let resumoPeriod = { type: 'hoje' };

function isInResumoPeriod(iso, period) {
  if (!iso) return false;
  const today = todayISO();
  if (period.type === 'hoje') return iso === today;
  if (period.type === 'amanha') return iso === addDaysISO(today, 1);
  if (period.type === '7dias') return iso >= today && iso <= addDaysISO(today, 7);
  if (period.type === 'mes') return isSameMonth(iso, currentMonthStr());
  if (period.type === 'custom') return iso >= (period.start || today) && iso <= (period.end || today);
  return true;
}

function resumoMonthsForPeriod(period) {
  const today = todayISO();
  if (period.type === 'custom') {
    const months = new Set();
    let cur = (period.start || today).slice(0, 7);
    const end = (period.end || today).slice(0, 7);
    let guard = 0;
    while (cur <= end && guard < 36) { months.add(cur); cur = monthAddStr(cur, 1); guard++; }
    return [...months];
  }
  if (period.type === 'mes') return [currentMonthStr()];
  return [currentMonthStr(), monthAddStr(currentMonthStr(), 1)];
}

function pageResumo(container) {
  const draw = () => {
    const period = resumoPeriod;
    const today = todayISO();

    const gastos = [
      ...resumoMonthsForPeriod(period).flatMap((m) => gastosFixosForMonth(m)).map((g) => ({ ...g, label: g.nome, date: g.vencimentoISO, kind: 'pagar', status: g.pago ? 'pago' : 'pendente' })),
      ...Store.state.gastosVariaveis.map((g) => ({ ...g, label: g.descricao, date: g.data, kind: 'pagar' })),
    ];
    const receb = resumoMonthsForPeriod(period).flatMap((m) => recebimentosForMonth(m)).map((r) => ({ ...r, label: r.descricao, date: r.dataOcorrencia, kind: 'receber', status: r.recebido ? 'recebido' : 'pendente' }));

    const paraPagar = gastos.filter((g) => g.status !== 'pago' && isInResumoPeriod(g.date, period));
    const paraReceber = receb.filter((r) => r.status !== 'recebido' && isInResumoPeriod(r.date, period));
    const concluidas = [...gastos.filter((g) => g.status === 'pago'), ...receb.filter((r) => r.status === 'recebido')]
      .filter((t) => isInResumoPeriod(t.date, period)).sort((a, b) => (a.date < b.date ? 1 : -1));

    const totalReceber = paraReceber.reduce((s, r) => s + r.valor, 0);
    const totalPagar = paraPagar.reduce((s, g) => s + g.valor, 0);
    const saldoBancos = Store.state.banks.reduce((s, b) => s + (b.balance || 0), 0);
    const recebidoHoje = receb.filter((r) => r.status === 'recebido' && r.date === today).reduce((s, r) => s + r.valor, 0);
    const pagoHoje = gastos.filter((g) => g.status === 'pago' && g.date === today).reduce((s, g) => s + g.valor, 0);
    const pendente = totalReceber + totalPagar;

    container.innerHTML = `
      <div class="panel">
        <div class="panel-header">
          <div>
            <h3 style="font-size:18px">Olá, ${(Store.state.profile.name || 'Mateus').toUpperCase()} 👋</h3>
            <div class="panel-sub">Estas são suas movimentações de <strong>${resumoLabel(period.type)}</strong>.</div>
          </div>
          <div class="pill-group" id="resumo-period-group">
            <button class="pill ${period.type === 'hoje' ? 'active' : ''}" data-mode="hoje">Hoje</button>
            <button class="pill ${period.type === 'amanha' ? 'active' : ''}" data-mode="amanha">Amanhã</button>
            <button class="pill ${period.type === '7dias' ? 'active' : ''}" data-mode="7dias">Últimos 7 dias</button>
            <button class="pill ${period.type === 'mes' ? 'active' : ''}" data-mode="mes">Este mês</button>
            <button class="pill ${period.type === 'custom' ? 'active' : ''}" data-mode="custom">Personalizado</button>
          </div>
        </div>
        ${period.type === 'custom' ? `
          <div class="field-row" style="max-width:340px">
            <div class="field"><label>De</label><input type="date" id="resumo-start" value="${period.start || today}" /></div>
            <div class="field"><label>Até</label><input type="date" id="resumo-end" value="${period.end || today}" /></div>
          </div>` : ''}
      </div>

      <div class="stat-grid">
        ${statCard({ label: 'A receber', value: formatCurrency(totalReceber), tone: 'green', iconName: 'arrowUpCircle' })}
        ${statCard({ label: 'A pagar', value: formatCurrency(totalPagar), tone: 'red', iconName: 'arrowDownCircle' })}
        ${statCard({ label: 'Saldo previsto', value: formatCurrency(saldoBancos + totalReceber - totalPagar), tone: 'blue', iconName: 'wallet' })}
        ${statCard({ label: 'Recebido hoje', value: formatCurrency(recebidoHoje), tone: 'green', iconName: 'checkCircle' })}
        ${statCard({ label: 'Pago hoje', value: formatCurrency(pagoHoje), tone: 'purple', iconName: 'checkCircle' })}
        ${statCard({ label: 'Pendente', value: formatCurrency(pendente), tone: 'orange', iconName: 'alertTriangle' })}
      </div>

      <div class="grid-2">
        <div class="panel">
          <div class="panel-header"><h3>${icon('arrowDownCircle')} Para pagar</h3><span class="badge badge-danger">Total ${formatCurrency(totalPagar)}</span></div>
          ${paraPagar.length === 0 ? emptyState({ iconName: 'checkCircle', title: 'Nada para pagar nesse período.' }) : miniList(paraPagar.map((g) => ({ title: g.label, sub: formatDateBR(g.date), value: g.valor, status: g.status })))}
        </div>
        <div class="panel">
          <div class="panel-header"><h3>${icon('arrowUpCircle')} Para receber</h3><span class="badge badge-success">Total ${formatCurrency(totalReceber)}</span></div>
          ${paraReceber.length === 0 ? emptyState({ iconName: 'calendar', title: 'Nada para receber nesse período.' }) : miniList(paraReceber.map((r) => ({ title: r.label, sub: formatDateBR(r.date), value: r.valor, status: r.status })))}
        </div>
      </div>

      <div class="panel">
        <div class="panel-header">
          <h3>${icon('list')} Últimas movimentações concluídas</h3>
          <div class="pill-group" id="resumo-period-group-2">
            <button class="pill ${period.type === 'hoje' ? 'active' : ''}" data-mode="hoje">Hoje</button>
            <button class="pill ${period.type === 'amanha' ? 'active' : ''}" data-mode="amanha">Amanhã</button>
            <button class="pill ${period.type === '7dias' ? 'active' : ''}" data-mode="7dias">Últimos 7 dias</button>
            <button class="pill ${period.type === 'mes' ? 'active' : ''}" data-mode="mes">Este mês</button>
            <button class="pill ${period.type === 'custom' ? 'active' : ''}" data-mode="custom">Personalizado</button>
          </div>
        </div>
        ${concluidas.length === 0 ? emptyState({ iconName: 'inbox', title: 'Nenhuma movimentação concluída neste período.' }) : recentTxList(concluidas.map((t) => ({ label: t.label, date: t.date, valor: t.valor, kind: t.kind === 'receber' ? 'receb' : 'gasto' })))}
      </div>
    `;

    const wireGroup = (groupId) => {
      document.getElementById(groupId).querySelectorAll('.pill').forEach((btn) => {
        btn.onclick = () => { resumoPeriod = { type: btn.dataset.mode, start: period.start, end: period.end }; draw(); };
      });
    };
    wireGroup('resumo-period-group'); wireGroup('resumo-period-group-2');
    const startEl = document.getElementById('resumo-start'), endEl = document.getElementById('resumo-end');
    if (startEl) startEl.onchange = () => { resumoPeriod.start = startEl.value; draw(); };
    if (endEl) endEl.onchange = () => { resumoPeriod.end = endEl.value; draw(); };
  };
  draw();
}
function resumoLabel(type) {
  return { hoje: 'hoje', amanha: 'amanhã', '7dias': 'nos últimos 7 dias', mes: 'este mês', custom: 'no período selecionado' }[type] || 'hoje';
}

/* =========================================================================
   GASTOS FIXOS
   ========================================================================= */
let gfPeriod = { type: 'month', value: currentMonthStr() };
let editingFixoId = null;

function gfPeriodMonth(period) {
  return period.type === 'year' ? `${period.value}-01` : (period.value || currentMonthStr());
}

function pageGastosFixos(container) {
  const draw = () => {
    const editing = editingFixoId ? Store.get('gastosFixos', editingFixoId) : null;
    const period = gfPeriod;
    const all = Store.state.gastosFixos;
    const mStr = period.type === 'month' ? (period.value || currentMonthStr()) : null;
    const monthsToShow = period.type === 'year' ? Array.from({ length: 12 }, (_, i) => `${period.value}-${String(i + 1).padStart(2, '0')}`) : [mStr];
    // para a lista, no modo "ano" mostramos a recorrência consolidada (1 linha por gasto fixo ativo no ano)
    const listMonth = period.type === 'year' ? currentMonthStr() : mStr;
    const inPeriodList = gastosFixosForMonth(listMonth);
    const totalMes = inPeriodList.reduce((s, g) => s + g.valor, 0);
    const pagoMes = inPeriodList.filter((g) => g.pago).reduce((s, g) => s + g.valor, 0);
    const pendenteMes = totalMes - pagoMes;
    const desativados = all.filter((g) => g.ativo === false);

    container.innerHTML = `
      <div class="grid-form-list">
        <div class="panel">
          <h3 style="margin-bottom:14px">${editing ? 'Editar gasto fixo' : 'Novo gasto fixo'}</h3>
          <div class="field"><label>Nome</label><input type="text" id="ff-nome" placeholder="Ex.: Aluguel" value="${editing ? editing.nome : ''}" /></div>
          <div class="field-row">
            <div class="field"><label>Valor</label><input type="number" step="0.01" id="ff-valor" placeholder="0,00" value="${editing ? editing.valor : ''}" /></div>
            <div class="field"><label>Dia do vencimento</label><input type="number" min="1" max="31" id="ff-dia" placeholder="Ex.: 10" value="${editing ? editing.diaVencimento : ''}" /></div>
          </div>
          <div class="field"><label>Categoria</label>${fieldHTML({ key: 'ff-categoria', type: 'select-category' }, editing ? editing.categoryId : '')}</div>
          <div class="field" style="display:flex;align-items:center;padding-top:4px"><label class="checkbox-row"><input type="checkbox" id="ff-ativo" ${!editing || editing.ativo !== false ? 'checked' : ''} /> Ativo (recorrente todo mês)</label></div>
          <div class="field"><label>Banco vinculado <span class="req">*</span></label>${fieldHTML({ key: 'ff-banco', type: 'select-bank' }, editing ? editing.bankId : '')}</div>
          <div class="field"><label>Observação (opcional)</label><textarea id="ff-obs" placeholder="Observação (opcional)">${editing ? (editing.observacao || '') : ''}</textarea></div>
          <button class="btn btn-primary btn-block" id="ff-save">${editing ? 'Salvar alterações' : 'Salvar gasto fixo'}</button>
          ${editing ? `<button class="btn btn-ghost btn-block" id="ff-cancel-edit" style="margin-top:8px">Cancelar edição</button>` : ''}
          <div style="margin-top:14px">${collapsibleNewCategory('ff')}</div>
        </div>

        <div>
          <div class="panel">
            <div class="panel-header">
              <div><h3>Lista de gastos fixos</h3><div class="panel-sub">Recorrentes — voltam como pendentes a cada mês.</div></div>
              ${renderPeriodControl('gf', period)}
            </div>
            <div class="stat-grid">
              ${statCard({ label: 'Total do mês', value: formatCurrency(totalMes), tone: 'blue', iconName: 'wallet' })}
              ${statCard({ label: 'Cadastrados', value: inPeriodList.length, sub: `${all.length} no total`, tone: 'purple', iconName: 'repeat' })}
              ${statCard({ label: 'Pago no mês', value: formatCurrency(pagoMes), tone: 'green', iconName: 'checkCircle' })}
              ${statCard({ label: 'Pendente', value: formatCurrency(pendenteMes), tone: 'orange', iconName: 'alertTriangle' })}
              ${statCard({ label: 'Desativados', value: formatCurrency(desativados.reduce((s, g) => s + g.valor, 0)), sub: `${desativados.length} contas`, tone: 'red', iconName: 'trash' })}
            </div>
            ${inPeriodList.length === 0 ? emptyState({ iconName: 'repeat', title: 'Nenhum gasto fixo cadastrado.' }) : gastosFixosTable(inPeriodList, listMonth)}
          </div>
        </div>
      </div>
    `;

    document.getElementById('ff-save').onclick = () => {
      const nome = document.getElementById('ff-nome').value.trim();
      const valor = parseFloat(document.getElementById('ff-valor').value) || 0;
      const diaVencimento = Math.min(31, Math.max(1, parseInt(document.getElementById('ff-dia').value, 10) || 1));
      const bankId = document.getElementById('f-ff-banco').value;
      if (!nome) { toast('Informe o nome do gasto fixo', 'danger'); return; }
      if (!valor) { toast('Informe um valor', 'danger'); return; }
      if (!bankId) { toast('Selecione o banco vinculado', 'danger'); return; }
      const payload = {
        nome, valor, diaVencimento, bankId,
        categoryId: document.getElementById('f-ff-categoria').value,
        ativo: document.getElementById('ff-ativo').checked,
        observacao: document.getElementById('ff-obs').value,
      };
      if (editing) { Store.update('gastosFixos', editing.id, payload); toast('Gasto fixo atualizado', 'success'); editingFixoId = null; }
      else { Store.add('gastosFixos', payload); toast('Gasto fixo cadastrado', 'success'); }
      draw();
    };
    if (editing) document.getElementById('ff-cancel-edit').onclick = () => { editingFixoId = null; draw(); };

    wireQuickAddButtons([{ key: 'ff-categoria', type: 'select-category' }, { key: 'ff-banco', type: 'select-bank' }]);
    wireCollapsibleNewCategory('ff', () => draw());
    wirePeriodControl('gf', period, draw);

    container.querySelectorAll('[data-action="edit-fixo"]').forEach((b) => b.onclick = () => { editingFixoId = b.dataset.id; draw(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    container.querySelectorAll('[data-action="toggle-ativo-fixo"]').forEach((b) => b.onclick = () => {
      const item = Store.get('gastosFixos', b.dataset.id);
      Store.update('gastosFixos', b.dataset.id, { ativo: item.ativo === false });
      draw();
    });
    container.querySelectorAll('[data-action="toggle-pago-fixo"]').forEach((b) => b.onclick = () => {
      toggleGastoFixoPago(b.dataset.id, b.dataset.mes);
      draw();
    });
    container.querySelectorAll('[data-action="delete-fixo"]').forEach((b) => b.onclick = () => {
      confirmModal({
        title: 'Excluir gasto fixo', text: 'Essa ação não pode ser desfeita. Deseja continuar?', confirmLabel: 'Excluir', danger: true,
        onConfirm: () => { Store.remove('gastosFixos', b.dataset.id); toast('Gasto fixo excluído', 'success'); draw(); },
      });
    });
  };
  draw();
}

function gastosFixosTable(list, mStr) {
  return `
    <table class="list-table">
      <thead><tr><th>Nome</th><th>Categoria</th><th>Venc.</th><th>Banco</th><th>Valor</th><th>Status</th><th></th></tr></thead>
      <tbody>
        ${list.map((g) => `
          <tr>
            <td>${categoryAvatar(g.categoryId)}<div style="display:inline-block;vertical-align:middle;margin-left:10px"><div class="row-title">${g.nome}</div>${g.ativo === false ? '<span class="badge badge-muted">Inativo</span>' : ''}</div></td>
            <td>${categoryTag(g.categoryId)}</td>
            <td>dia ${g.diaVencimento}</td>
            <td>${Store.bankById(g.bankId) ? Store.bankById(g.bankId).name : '—'}</td>
            <td><strong>${formatCurrency(g.valor)}</strong></td>
            <td><button class="badge ${g.pago ? 'badge-success' : 'badge-warning'}" style="border:none" data-action="toggle-pago-fixo" data-id="${g.id}" data-mes="${mStr}">${g.pago ? 'Pago — reabrir' : 'Pendente'}</button></td>
            <td><div class="row-actions">
              <button class="btn-icon" data-action="toggle-ativo-fixo" data-id="${g.id}" title="${g.ativo === false ? 'Reativar' : 'Desativar'}">${icon(g.ativo === false ? 'checkCircle' : 'alertTriangle')}</button>
              <button class="btn-icon" data-action="edit-fixo" data-id="${g.id}">${icon('edit')}</button>
              <button class="btn-icon" data-action="delete-fixo" data-id="${g.id}">${icon('trash')}</button>
            </div></td>
          </tr>`).join('')}
      </tbody>
    </table>
  `;
}

/* =========================================================================
   GASTOS VARIÁVEIS
   ========================================================================= */
let gvPeriod = { type: 'month', value: currentMonthStr() };
let gvFilters = { pill: 'todos', status: 'todos', category: 'todos', sort: 'desc', search: '' };
let editingVariavelId = null;

function pageGastosVariaveis(container) {
  const draw = () => {
    const editing = editingVariavelId ? Store.get('gastosVariaveis', editingVariavelId) : null;
    const period = gvPeriod;
    let list = Store.state.gastosVariaveis.filter((g) => inPeriod(g.data, period));

    if (gvFilters.pill === 'pagos') list = list.filter((g) => g.status === 'pago');
    else if (gvFilters.pill === 'pendentes') list = list.filter((g) => g.status !== 'pago');
    else if (gvFilters.pill.startsWith('cat:')) list = list.filter((g) => g.categoryId === gvFilters.pill.slice(4));

    if (gvFilters.status !== 'todos') list = list.filter((g) => g.status === gvFilters.status);
    if (gvFilters.category !== 'todos') list = list.filter((g) => g.categoryId === gvFilters.category);
    if (gvFilters.search) {
      const q = gvFilters.search.toLowerCase();
      list = list.filter((g) => (g.descricao || '').toLowerCase().includes(q) || (g.observacao || '').toLowerCase().includes(q) || (Store.categoryById(g.categoryId) || {}).name?.toLowerCase().includes(q));
    }
    list = [...list].sort((a, b) => gvFilters.sort === 'asc' ? (a.data < b.data ? -1 : 1) : (a.data < b.data ? 1 : -1));

    const baseForStats = Store.state.gastosVariaveis.filter((g) => inPeriod(g.data, period));
    const total = list.reduce((s, g) => s + g.valor, 0);
    const media = list.length ? total / list.length : 0;
    const pago = list.filter((g) => g.status === 'pago').reduce((s, g) => s + g.valor, 0);
    const pendente = total - pago;

    const usedCatIds = [...new Set(baseForStats.map((g) => g.categoryId).filter(Boolean))];

    container.innerHTML = `
      <div class="grid-form-list">
        <div class="panel">
          <h3 style="margin-bottom:14px">${editing ? 'Editar lançamento' : 'Novo lançamento'}</h3>
          <div class="field"><label>Descrição</label><input type="text" id="gv-desc" placeholder="Ex.: Mercado" value="${editing ? editing.descricao : ''}" /></div>
          <div class="field-row">
            <div class="field"><label>Valor</label><input type="number" step="0.01" id="gv-valor" placeholder="0,00" value="${editing ? editing.valor : ''}" /></div>
            <div class="field"><label>Data</label><input type="date" id="gv-data" value="${editing ? editing.data : todayISO()}" /></div>
          </div>
          <div class="field"><label>Categoria</label>${fieldHTML({ key: 'gv-categoria', type: 'select-category' }, editing ? editing.categoryId : '')}</div>
          <div class="field"><label>Status</label><select id="gv-status"><option value="pendente" ${editing && editing.status === 'pendente' ? 'selected' : ''}>Pendente</option><option value="pago" ${editing && editing.status === 'pago' ? 'selected' : ''}>Pago</option></select></div>
          <div class="field"><label>Banco vinculado <span class="req">*</span></label>${fieldHTML({ key: 'gv-banco', type: 'select-bank' }, editing ? editing.bankId : '')}</div>
          <div class="field"><label>Observação (opcional)</label><textarea id="gv-obs" placeholder="Observação (opcional)">${editing ? (editing.observacao || '') : ''}</textarea></div>
          <button class="btn btn-primary btn-block" id="gv-save">${editing ? 'Salvar alterações' : 'Adicionar lançamento'}</button>
          ${editing ? `<button class="btn btn-ghost btn-block" id="gv-cancel-edit" style="margin-top:8px">Cancelar edição</button>` : ''}
          <div style="margin-top:14px">${collapsibleNewCategory('gv')}</div>
        </div>

        <div>
          <div class="panel">
            <div class="panel-header">
              <div><h3>Lançamentos</h3><div class="panel-sub">Marque como pago a qualquer momento.</div></div>
              ${renderPeriodControl('gvp', period)}
            </div>
            <div class="panel-header" style="gap:8px">
              <select id="gv-filter-status" style="max-width:160px">
                <option value="todos" ${gvFilters.status === 'todos' ? 'selected' : ''}>Todos</option>
                <option value="pago" ${gvFilters.status === 'pago' ? 'selected' : ''}>Pagos</option>
                <option value="pendente" ${gvFilters.status === 'pendente' ? 'selected' : ''}>Pendentes</option>
              </select>
              <select id="gv-filter-cat" style="max-width:200px">
                <option value="todos">Todas categorias</option>
                ${Store.state.categories.map((c) => `<option value="${c.id}" ${gvFilters.category === c.id ? 'selected' : ''}>${c.emoji} ${c.name}</option>`).join('')}
              </select>
              <select id="gv-filter-sort" style="max-width:140px">
                <option value="desc" ${gvFilters.sort === 'desc' ? 'selected' : ''}>Data ↓</option>
                <option value="asc" ${gvFilters.sort === 'asc' ? 'selected' : ''}>Data ↑</option>
              </select>
            </div>
            <div class="field" style="max-width:480px">
              <input type="text" id="gv-search" placeholder="Buscar por descrição, categoria ou observação..." value="${gvFilters.search}" />
            </div>
            <div class="chip-row" style="margin-bottom:16px">
              <button class="chip ${gvFilters.pill === 'todos' ? 'active' : ''}" data-pill="todos">Todos</button>
              <button class="chip ${gvFilters.pill === 'pagos' ? 'active' : ''}" data-pill="pagos">Pagos</button>
              <button class="chip ${gvFilters.pill === 'pendentes' ? 'active' : ''}" data-pill="pendentes">Pendentes</button>
              ${usedCatIds.map((id) => { const c = Store.categoryById(id); if (!c) return ''; return `<button class="chip ${gvFilters.pill === 'cat:' + id ? 'active' : ''}" data-pill="cat:${id}"><span class="dot" style="color:${c.color}"></span>${c.emoji} ${c.name}</button>`; }).join('')}
            </div>
            <div class="stat-grid">
              ${statCard({ label: 'Encontrados', value: list.length, tone: 'blue', iconName: 'search' })}
              ${statCard({ label: 'Total', value: formatCurrency(total), tone: 'purple', iconName: 'wallet' })}
              ${statCard({ label: 'Média', value: formatCurrency(media), tone: 'cyan', iconName: 'trendUp' })}
              ${statCard({ label: 'Pago', value: formatCurrency(pago), tone: 'green', iconName: 'checkCircle' })}
              ${statCard({ label: 'Pendente', value: formatCurrency(pendente), tone: 'orange', iconName: 'alertTriangle' })}
            </div>
            ${list.length === 0 ? emptyState({ iconName: 'search', title: 'Nenhum lançamento encontrado com os filtros aplicados.' }) : gastosVariaveisTable(list)}
          </div>
        </div>
      </div>
    `;

    document.getElementById('gv-save').onclick = () => {
      const descricao = document.getElementById('gv-desc').value.trim();
      const valor = parseFloat(document.getElementById('gv-valor').value) || 0;
      const data = document.getElementById('gv-data').value;
      const bankId = document.getElementById('f-gv-banco').value;
      if (!descricao) { toast('Informe a descrição', 'danger'); return; }
      if (!valor) { toast('Informe um valor', 'danger'); return; }
      if (!bankId) { toast('Selecione o banco vinculado', 'danger'); return; }
      const payload = {
        descricao, valor, data, bankId,
        categoryId: document.getElementById('f-gv-categoria').value,
        status: document.getElementById('gv-status').value,
        observacao: document.getElementById('gv-obs').value,
      };
      if (editing) { Store.update('gastosVariaveis', editing.id, payload); toast('Lançamento atualizado', 'success'); editingVariavelId = null; }
      else { Store.add('gastosVariaveis', payload); toast('Lançamento adicionado', 'success'); }
      draw();
    };
    if (editing) document.getElementById('gv-cancel-edit').onclick = () => { editingVariavelId = null; draw(); };

    wireQuickAddButtons([{ key: 'gv-categoria', type: 'select-category' }, { key: 'gv-banco', type: 'select-bank' }]);
    wireCollapsibleNewCategory('gv', () => draw());
    wirePeriodControl('gvp', period, draw);

    document.getElementById('gv-filter-status').onchange = (e) => { gvFilters.status = e.target.value; draw(); };
    document.getElementById('gv-filter-cat').onchange = (e) => { gvFilters.category = e.target.value; draw(); };
    document.getElementById('gv-filter-sort').onchange = (e) => { gvFilters.sort = e.target.value; draw(); };
    document.getElementById('gv-search').oninput = (e) => { gvFilters.search = e.target.value; draw(); };
    container.querySelectorAll('[data-pill]').forEach((b) => b.onclick = () => { gvFilters.pill = b.dataset.pill; draw(); });

    container.querySelectorAll('[data-action="edit-var"]').forEach((b) => b.onclick = () => { editingVariavelId = b.dataset.id; draw(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    container.querySelectorAll('[data-action="toggle-pago-var"]').forEach((b) => b.onclick = () => {
      const item = Store.get('gastosVariaveis', b.dataset.id);
      Store.update('gastosVariaveis', b.dataset.id, { status: item.status === 'pago' ? 'pendente' : 'pago' });
      draw();
    });
    container.querySelectorAll('[data-action="delete-var"]').forEach((b) => b.onclick = () => {
      confirmModal({
        title: 'Excluir lançamento', text: 'Essa ação não pode ser desfeita. Deseja continuar?', confirmLabel: 'Excluir', danger: true,
        onConfirm: () => { Store.remove('gastosVariaveis', b.dataset.id); toast('Lançamento excluído', 'success'); draw(); },
      });
    });
  };
  draw();
}

function gastosVariaveisTable(list) {
  return `
    <table class="list-table">
      <thead><tr><th>Descrição</th><th>Categoria</th><th>Data</th><th>Banco</th><th>Valor</th><th>Status</th><th></th></tr></thead>
      <tbody>
        ${list.map((g) => `
          <tr>
            <td><div class="row-title">${g.descricao}</div>${g.observacao ? `<div class="row-sub">${g.observacao}</div>` : ''}</td>
            <td>${categoryTag(g.categoryId)}</td>
            <td>${formatDateBR(g.data)}</td>
            <td>${Store.bankById(g.bankId) ? Store.bankById(g.bankId).name : '—'}</td>
            <td><strong>${formatCurrency(g.valor)}</strong></td>
            <td><button class="badge ${g.status === 'pago' ? 'badge-success' : 'badge-warning'}" style="border:none" data-action="toggle-pago-var" data-id="${g.id}">${g.status === 'pago' ? 'Pago' : 'Pendente'}</button></td>
            <td><div class="row-actions">
              <button class="btn-icon" data-action="edit-var" data-id="${g.id}">${icon('edit')}</button>
              <button class="btn-icon" data-action="delete-var" data-id="${g.id}">${icon('trash')}</button>
            </div></td>
          </tr>`).join('')}
      </tbody>
    </table>
  `;
}

/* =========================================================================
   MOTOR GENÉRICO DE CRUD — usado por Bancos, Recebimentos, Cofrinhos,
   Cartões e Investimentos (mesmo padrão visual: formulário + lista)
   ========================================================================= */
function genericCrudPage(container, cfg) {
  let editingId = null;
  const draw = () => {
    const editing = editingId ? Store.get(cfg.collection, editingId) : null;
    const items = Store.state[cfg.collection];
    const stats = cfg.statsFn ? cfg.statsFn(items) : [];

    container.innerHTML = `
      <div class="grid-form-list">
        <div class="panel">
          <h3 style="margin-bottom:14px">${editing ? `Editar ${cfg.singularLower}` : cfg.formTitle}</h3>
          ${cfg.fields.map((f) => `
            <div class="field">
              <label>${f.label}${f.required ? ' <span class="req">*</span>' : ''}</label>
              ${fieldHTML(f, editing ? editing[f.key] : f.default)}
            </div>`).join('')}
          <button class="btn btn-primary btn-block" id="gc-save">${editing ? 'Salvar alterações' : cfg.submitLabel}</button>
          ${editing ? `<button class="btn btn-ghost btn-block" id="gc-cancel" style="margin-top:8px">Cancelar edição</button>` : ''}
        </div>
        <div class="panel">
          <div class="panel-header"><div><h3>${cfg.listTitle}</h3>${cfg.listSubtitle ? `<div class="panel-sub">${cfg.listSubtitle}</div>` : ''}</div></div>
          ${stats.length ? `<div class="stat-grid">${stats.map(statCard).join('')}</div>` : ''}
          ${items.length === 0 ? emptyState({ iconName: cfg.icon, title: cfg.emptyTitle, text: cfg.emptyText }) : cfg.renderList(items)}
        </div>
      </div>
    `;

    wireQuickAddButtons(cfg.fields);
    document.getElementById('gc-save').onclick = () => {
      const payload = {};
      for (const f of cfg.fields) {
        const val = readField(f);
        if (f.required && !val) { toast(`Preencha o campo "${f.label}"`, 'danger'); return; }
        payload[f.key] = val;
      }
      if (cfg.beforeSave) cfg.beforeSave(payload);
      if (editing) { Store.update(cfg.collection, editing.id, payload); toast(`${cfg.singular} atualizado(a)`, 'success'); editingId = null; }
      else { Store.add(cfg.collection, payload); toast(`${cfg.singular} cadastrado(a)`, 'success'); }
      draw();
    };
    if (editing) document.getElementById('gc-cancel').onclick = () => { editingId = null; draw(); };

    container.querySelectorAll('[data-action="edit"]').forEach((b) => b.onclick = () => { editingId = b.dataset.id; draw(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    container.querySelectorAll('[data-action="delete"]').forEach((b) => b.onclick = () => {
      confirmModal({
        title: `Excluir ${cfg.singularLower}`, text: 'Essa ação não pode ser desfeita. Deseja continuar?', confirmLabel: 'Excluir', danger: true,
        onConfirm: () => { Store.remove(cfg.collection, b.dataset.id); toast(`${cfg.singular} excluído(a)`, 'success'); draw(); },
      });
    });
    if (cfg.wireExtra) cfg.wireExtra(container, draw);
  };
  draw();
}

/* ---- Bancos ---- */
const BANK_CORES = ['#3866ff', '#7c3aed', '#22c55e', '#f04848', '#f5a623', '#14b8a6'];
let bancosTab = 'bancos';
let bancoFormOpen = false;
let editingBancoId = null;
let novoBancoCor = BANK_CORES[0];

function pageBancos(container) {
  const draw = () => {
    const banks = Store.state.banks;
    const editing = editingBancoId ? Store.get('banks', editingBancoId) : null;
    if (editing) novoBancoCor = editing.cor || BANK_CORES[0];

    container.innerHTML = `
      <div class="pill-group" style="margin-bottom:18px;display:inline-flex">
        <button class="pill ${bancosTab === 'bancos' ? 'active' : ''}" data-tab="bancos">${icon('bank')} Bancos</button>
        <button class="pill ${bancosTab === 'transferencias' ? 'active' : ''}" data-tab="transferencias">${icon('repeat')} Transferências</button>
      </div>

      ${bancosTab === 'bancos' ? `
        <div class="panel-header" style="margin-bottom:16px">
          <div class="row-sub">${banks.length} banco${banks.length === 1 ? '' : 's'} cadastrado${banks.length === 1 ? '' : 's'}</div>
          <button class="btn btn-primary btn-sm" id="bc-toggle-form">${icon('plus')} Novo banco</button>
        </div>

        <div class="panel" id="bc-form-panel" style="display:${bancoFormOpen ? 'block' : 'none'}">
          <div class="panel-header"><h3>${editing ? 'Editar banco' : 'Novo banco / conta'}</h3><button class="btn btn-ghost btn-sm" id="bc-cancel">Cancelar</button></div>
          <div class="field"><label>Nome</label><input type="text" id="bc-nome" placeholder="Ex.: Nubank" value="${editing ? editing.name : ''}" /></div>
          <div class="field"><label>Saldo ${editing ? 'atual' : 'inicial'}</label><input type="number" step="0.01" id="bc-saldo" placeholder="0,00" value="${editing ? editing.balance : ''}" /></div>
          <div class="field">
            <label>Cor</label>
            <div class="chip-row" id="bc-cor-group">
              ${BANK_CORES.map((c) => `<button type="button" data-cor="${c}" style="width:28px;height:28px;border-radius:50%;background:${c};border:2px solid ${c === novoBancoCor ? 'var(--text)' : 'transparent'};cursor:pointer"></button>`).join('')}
            </div>
          </div>
          <button class="btn btn-primary btn-block" id="bc-save">${editing ? 'Salvar alterações' : 'Salvar banco'}</button>
        </div>

        ${banks.length === 0 && !bancoFormOpen ? `<div class="panel">${emptyState({ iconName: 'bank', title: 'Nenhum banco cadastrado', text: 'Adicione um banco para registrar gastos, recebimentos e seu saldo real.', actionLabel: 'Novo banco', actionId: 'bc-empty-create' })}</div>` : ''}
        ${banks.length > 0 ? `<div class="grid-2">${banks.map((b, i) => `
          <div class="panel" style="border-top:3px solid ${b.cor || 'var(--primary)'};padding-top:16px">
            <div style="display:flex;justify-content:space-between;align-items:flex-start">
              <div style="display:flex;gap:10px;align-items:center">
                <span style="width:40px;height:40px;border-radius:50%;background:${hexToSoft(b.cor || '#3866ff')};display:flex;align-items:center;justify-content:center">${icon('bank')}</span>
                <div>
                  <strong>${i + 1} - ${b.name}</strong>
                  <div class="stat-label" style="margin-top:6px">Saldo atual</div>
                  <div class="stat-value" style="font-size:19px">${formatCurrency(b.balance || 0)}</div>
                </div>
              </div>
              <div class="row-actions"><button class="btn-icon" data-action="edit-banco" data-id="${b.id}">${icon('edit')}</button><button class="btn-icon" data-action="delete-banco" data-id="${b.id}">${icon('trash')}</button></div>
            </div>
          </div>`).join('')}</div>` : ''}
      ` : transferenciasHTML()}
    `;

    container.querySelectorAll('[data-tab]').forEach((b) => b.onclick = () => { bancosTab = b.dataset.tab; draw(); });

    if (document.getElementById('bc-toggle-form')) {
      document.getElementById('bc-toggle-form').onclick = () => { bancoFormOpen = !bancoFormOpen; if (!bancoFormOpen) editingBancoId = null; draw(); };
      document.getElementById('bc-cancel').onclick = () => { bancoFormOpen = false; editingBancoId = null; draw(); };
      if (document.getElementById('bc-empty-create')) document.getElementById('bc-empty-create').onclick = () => { bancoFormOpen = true; draw(); };
      const corBtns = document.getElementById('bc-cor-group').querySelectorAll('[data-cor]');
      corBtns.forEach((b) => b.onclick = () => { novoBancoCor = b.dataset.cor; corBtns.forEach((x) => x.style.border = x === b ? '2px solid var(--text)' : '2px solid transparent'); });
      document.getElementById('bc-save').onclick = () => {
        const name = document.getElementById('bc-nome').value.trim();
        if (!name) { toast('Dê um nome para o banco', 'danger'); return; }
        const payload = { name, balance: parseFloat(document.getElementById('bc-saldo').value) || 0, cor: novoBancoCor };
        if (editing) { Store.update('banks', editing.id, payload); toast('Banco atualizado', 'success'); }
        else { Store.add('banks', payload); toast('Banco adicionado', 'success'); }
        bancoFormOpen = false; editingBancoId = null;
        draw();
      };
      container.querySelectorAll('[data-action="edit-banco"]').forEach((b) => b.onclick = () => { editingBancoId = b.dataset.id; bancoFormOpen = true; draw(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
      container.querySelectorAll('[data-action="delete-banco"]').forEach((b) => b.onclick = () => {
        confirmModal({
          title: 'Excluir banco', text: 'Essa ação não pode ser desfeita. Deseja continuar?', confirmLabel: 'Excluir', danger: true,
          onConfirm: () => { Store.remove('banks', b.dataset.id); toast('Banco excluído', 'success'); draw(); },
        });
      });
    }

    if (document.getElementById('tf-save')) {
      document.getElementById('tf-save').onclick = () => {
        const deId = document.getElementById('tf-de').value;
        const paraId = document.getElementById('tf-para').value;
        const valor = parseFloat(document.getElementById('tf-valor').value) || 0;
        if (!deId || !paraId) { toast('Selecione os dois bancos', 'danger'); return; }
        if (deId === paraId) { toast('Escolha bancos diferentes', 'danger'); return; }
        if (!valor) { toast('Informe um valor', 'danger'); return; }
        const de = Store.get('banks', deId), para = Store.get('banks', paraId);
        Store.update('banks', deId, { balance: (de.balance || 0) - valor });
        Store.update('banks', paraId, { balance: (para.balance || 0) + valor });
        Store.add('transferencias', { deId, paraId, valor, data: document.getElementById('tf-data').value, observacao: document.getElementById('tf-obs').value });
        toast('Transferência realizada', 'success');
        draw();
      };
    }
  };
  draw();
}

function transferenciasHTML() {
  const banks = Store.state.banks;
  const transfs = [...Store.state.transferencias].sort((a, b) => (a.data < b.data ? 1 : -1));
  return `
    <div class="grid-form-list">
      <div class="panel">
        <h3 style="margin-bottom:14px">Nova transferência</h3>
        ${banks.length < 2 ? `<div class="row-sub" style="margin-bottom:10px">Cadastre pelo menos 2 bancos para transferir entre eles.</div>` : ''}
        <div class="field"><label>De</label><select id="tf-de"><option value="">Banco de origem...</option>${banks.map((b) => `<option value="${b.id}">${b.name} (${formatCurrency(b.balance || 0)})</option>`).join('')}</select></div>
        <div class="field"><label>Para</label><select id="tf-para"><option value="">Banco de destino...</option>${banks.map((b) => `<option value="${b.id}">${b.name}</option>`).join('')}</select></div>
        <div class="field-row">
          <div class="field"><label>Valor</label><input type="number" step="0.01" id="tf-valor" placeholder="0,00" /></div>
          <div class="field"><label>Data</label><input type="date" id="tf-data" value="${todayISO()}" /></div>
        </div>
        <div class="field"><label>Observação (opcional)</label><textarea id="tf-obs" placeholder="Observação (opcional)"></textarea></div>
        <button class="btn btn-primary btn-block" id="tf-save" ${banks.length < 2 ? 'disabled' : ''}>Transferir</button>
      </div>
      <div class="panel">
        <h3 style="margin-bottom:14px">Histórico de transferências</h3>
        ${transfs.length === 0 ? emptyState({ iconName: 'repeat', title: 'Nenhuma transferência registrada.' }) : `
          <table class="list-table">
            <thead><tr><th>De</th><th>Para</th><th>Data</th><th>Valor</th></tr></thead>
            <tbody>${transfs.map((t) => `<tr>
              <td>${(Store.bankById(t.deId) || {}).name || '—'}</td>
              <td>${(Store.bankById(t.paraId) || {}).name || '—'}</td>
              <td>${formatDateBR(t.data)}</td>
              <td><strong>${formatCurrency(t.valor)}</strong></td>
            </tr>`).join('')}</tbody>
          </table>
        `}
      </div>
    </div>
  `;
}

/* ---- Recebimentos ---- */
let editingRecebId = null;
let recebTipo = 'unico';
let recebPeriod = { type: 'month', value: currentMonthStr() };

function pageRecebimentos(container) {
  const draw = () => {
    const editing = editingRecebId ? Store.get('recebimentos', editingRecebId) : null;
    const period = recebPeriod;
    const mStr = period.type === 'year' ? null : (period.value || currentMonthStr());
    const months = period.type === 'year' ? Array.from({ length: 12 }, (_, i) => `${period.value}-${String(i + 1).padStart(2, '0')}`) : [mStr];
    const items = months.flatMap((m) => recebimentosForMonth(m));

    const total = items.reduce((s, r) => s + r.valor, 0);
    const previsto = items.filter((r) => !r.recebido).reduce((s, r) => s + r.valor, 0);
    const maior = items.reduce((max, r) => Math.max(max, r.valor), 0);
    const ticketMedio = items.length ? total / items.length : 0;

    container.innerHTML = `
      <div class="grid-form-list">
        <div class="panel">
          <h3 style="margin-bottom:14px">${editing ? 'Editar recebimento' : 'Novo recebimento'}</h3>
          <div class="field"><label>Descrição</label><input type="text" id="rc-desc" placeholder="Ex.: Salário" value="${editing ? editing.descricao : ''}" /></div>
          <div class="field-row">
            <div class="field"><label>Valor</label><input type="number" step="0.01" id="rc-valor" placeholder="0,00" value="${editing ? editing.valor : ''}" /></div>
            <div class="field"><label>Data</label><input type="date" id="rc-data" value="${editing ? editing.data : todayISO()}" /></div>
          </div>
          <div class="field"><label>Categoria</label>${fieldHTML({ key: 'rc-categoria', type: 'select-category' }, editing ? editing.categoryId : '')}</div>
          <div class="field"><label>Banco (obrigatório)</label>${fieldHTML({ key: 'rc-banco', type: 'select-bank' }, editing ? editing.bankId : '')}</div>
          <div class="field"><label>Observação (opcional)</label><textarea id="rc-obs" placeholder="Observação (opcional)">${editing ? (editing.observacao || '') : ''}</textarea></div>
          <div class="field">
            <label>Tipo de recebimento</label>
            <div class="pill-group" id="rc-tipo-group">
              <button type="button" class="pill ${recebTipo === 'unico' ? 'active' : ''}" data-tipo="unico">Único</button>
              <button type="button" class="pill ${recebTipo === 'recorrente' ? 'active' : ''}" data-tipo="recorrente">Recorrente</button>
              <button type="button" class="pill ${recebTipo === 'parcelado' ? 'active' : ''}" data-tipo="parcelado">Parcelado</button>
            </div>
          </div>
          <div class="field" id="rc-parcelas-field" style="display:${recebTipo === 'parcelado' ? 'block' : 'none'}">
            <label>Número de parcelas</label><input type="number" min="2" max="48" id="rc-parcelas" value="${editing ? editing.parcelas || 2 : 2}" />
          </div>
          <button class="btn btn-primary btn-block" id="rc-save">${editing ? 'Salvar alterações' : 'Registrar recebimento'}</button>
          ${editing ? `<button class="btn btn-ghost btn-block" id="rc-cancel-edit" style="margin-top:8px">Cancelar edição</button>` : ''}
          <div style="margin-top:14px">${collapsibleNewCategory('rc')}</div>
        </div>

        <div>
          <div class="panel">
            <div class="panel-header">
              <div><h3>Recebimentos</h3><div class="panel-sub">Entradas no período selecionado.</div></div>
              ${renderPeriodControl('rc', period)}
            </div>
            <div class="stat-grid">
              ${statCard({ label: 'Total recebido', value: formatCurrency(total - previsto), tone: 'green', iconName: 'checkCircle' })}
              ${statCard({ label: 'Previsto', value: formatCurrency(previsto), sub: `${items.filter((r) => !r.recebido).length} registro(s)`, tone: 'orange', iconName: 'alertTriangle' })}
              ${statCard({ label: 'Maior recebimento', value: formatCurrency(maior), tone: 'blue', iconName: 'trendUp' })}
              ${statCard({ label: 'Ticket médio', value: formatCurrency(ticketMedio), tone: 'purple', iconName: 'wallet' })}
            </div>
            ${items.length === 0 ? emptyState({ iconName: 'download', title: 'Nenhum recebimento nesse período.' }) : recebimentosTable(items)}
          </div>
        </div>
      </div>
    `;

    document.getElementById('rc-tipo-group').querySelectorAll('.pill').forEach((b) => b.onclick = () => {
      recebTipo = b.dataset.tipo;
      document.getElementById('rc-tipo-group').querySelectorAll('.pill').forEach((x) => x.classList.toggle('active', x === b));
      document.getElementById('rc-parcelas-field').style.display = recebTipo === 'parcelado' ? 'block' : 'none';
    });

    document.getElementById('rc-save').onclick = () => {
      const descricao = document.getElementById('rc-desc').value.trim();
      const valor = parseFloat(document.getElementById('rc-valor').value) || 0;
      const data = document.getElementById('rc-data').value;
      const bankId = document.getElementById('f-rc-banco').value;
      if (!descricao) { toast('Informe a descrição', 'danger'); return; }
      if (!valor) { toast('Informe um valor', 'danger'); return; }
      if (!bankId) { toast('Selecione o banco', 'danger'); return; }
      const payload = {
        descricao, valor, data, bankId,
        categoryId: document.getElementById('f-rc-categoria').value,
        observacao: document.getElementById('rc-obs').value,
        tipo: recebTipo,
        parcelas: recebTipo === 'parcelado' ? Math.max(2, parseInt(document.getElementById('rc-parcelas').value, 10) || 2) : 1,
      };
      if (editing) { Store.update('recebimentos', editing.id, payload); toast('Recebimento atualizado', 'success'); editingRecebId = null; }
      else { Store.add('recebimentos', payload); toast('Recebimento registrado', 'success'); }
      draw();
    };
    if (editing) document.getElementById('rc-cancel-edit').onclick = () => { editingRecebId = null; draw(); };

    wireQuickAddButtons([{ key: 'rc-categoria', type: 'select-category' }, { key: 'rc-banco', type: 'select-bank' }]);
    wireCollapsibleNewCategory('rc', () => draw());
    wirePeriodControl('rc', period, draw);

    container.querySelectorAll('[data-action="edit-receb"]').forEach((b) => b.onclick = () => { editingRecebId = b.dataset.id; recebTipo = Store.get('recebimentos', b.dataset.id).tipo || 'unico'; draw(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    container.querySelectorAll('[data-action="toggle-receb"]').forEach((b) => b.onclick = () => { toggleRecebimentoRecebido(b.dataset.id, b.dataset.mes); draw(); });
    container.querySelectorAll('[data-action="delete-receb"]').forEach((b) => b.onclick = () => {
      confirmModal({
        title: 'Excluir recebimento', text: 'Essa ação não pode ser desfeita. Deseja continuar?', confirmLabel: 'Excluir', danger: true,
        onConfirm: () => { Store.remove('recebimentos', b.dataset.id); toast('Recebimento excluído', 'success'); draw(); },
      });
    });
  };
  draw();
}

function recebimentosTable(items) {
  return `
    <table class="list-table">
      <thead><tr><th>Descrição</th><th>Categoria</th><th>Data</th><th>Parcela</th><th>Valor</th><th>Status</th><th></th></tr></thead>
      <tbody>
        ${items.map((r) => `
          <tr>
            <td><div class="row-title">${r.descricao}</div>${r.observacao ? `<div class="row-sub">${r.observacao}</div>` : ''}</td>
            <td>${categoryTag(r.categoryId)}</td>
            <td>${formatDateBR(r.mesRef + '-' + r.data.slice(8, 10))}</td>
            <td>${r.parcelaLabel}</td>
            <td class="amount-pos">${formatCurrency(r.valor)}</td>
            <td><button class="badge ${r.recebido ? 'badge-success' : 'badge-warning'}" style="border:none" data-action="toggle-receb" data-id="${r.id}" data-mes="${r.mesRef}">${r.recebido ? 'Recebido' : 'Pendente'}</button></td>
            <td><div class="row-actions">
              <button class="btn-icon" data-action="edit-receb" data-id="${r.id}">${icon('edit')}</button>
              <button class="btn-icon" data-action="delete-receb" data-id="${r.id}">${icon('trash')}</button>
            </div></td>
          </tr>`).join('')}
      </tbody>
    </table>
  `;
}

/* ---- Cofrinhos ---- */
const COFRINHO_ICONS = ['🎯', '🏠', '✈️', '🚗', '💻', '🎓', '💍', '💰', '🎨', '🚨'];
const COFRINHO_CORES = ['#f5a623', '#7c3aed', '#3866ff', '#22c55e', '#f04848', '#eab308', '#a855f7', '#14b8a6'];
let cofrinhoFormOpen = false;
let editingCofrinhoId = null;
let novoCofrinhoIcone = COFRINHO_ICONS[0];
let novoCofrinhoCor = COFRINHO_CORES[0];

function pageCofrinhos(container) {
  const draw = () => {
    const items = Store.state.cofrinhos;
    const editing = editingCofrinhoId ? Store.get('cofrinhos', editingCofrinhoId) : null;
    if (editing) { novoCofrinhoIcone = editing.icone || COFRINHO_ICONS[0]; novoCofrinhoCor = editing.cor || COFRINHO_CORES[0]; }

    container.innerHTML = `
      <div class="panel-header" style="margin-bottom:16px">
        <div class="row-sub">${items.length} cofrinho${items.length === 1 ? '' : 's'} ativo${items.length === 1 ? '' : 's'}</div>
        <button class="btn btn-primary btn-sm" id="cf-toggle-form">${icon('plus')} Novo cofrinho</button>
      </div>

      <div class="panel" id="cf-form-panel" style="display:${cofrinhoFormOpen ? 'block' : 'none'}">
        <div class="panel-header"><h3>${editing ? 'Editar cofrinho' : 'Novo cofrinho'}</h3><button class="btn btn-ghost btn-sm" id="cf-cancel">Cancelar</button></div>
        <div class="field"><label>Nome</label><input type="text" id="cf-nome" placeholder='Ex.: Viagem para Bariloche' value="${editing ? editing.nome : ''}" /></div>
        <div class="field-row">
          <div class="field"><label>Valor objetivo</label><input type="number" step="0.01" id="cf-meta" placeholder="0,00" value="${editing ? editing.meta : ''}" /></div>
          <div class="field"><label>Prazo (opcional)</label><input type="date" id="cf-prazo" value="${editing ? (editing.prazo || '') : ''}" /></div>
        </div>
        <div class="field">
          <label>Ícone</label>
          <div class="chip-row" id="cf-icone-group">
            ${COFRINHO_ICONS.map((e) => `<button type="button" class="btn-icon" data-icone="${e}" style="font-size:16px;${e === novoCofrinhoIcone ? 'border-color:var(--primary);background:var(--primary-soft)' : ''}">${e}</button>`).join('')}
          </div>
        </div>
        <div class="field">
          <label>Cor</label>
          <div class="chip-row" id="cf-cor-group">
            ${COFRINHO_CORES.map((c) => `<button type="button" data-cor="${c}" style="width:30px;height:30px;border-radius:50%;background:${c};border:2px solid ${c === novoCofrinhoCor ? 'var(--text)' : 'transparent'};cursor:pointer"></button>`).join('')}
          </div>
        </div>
        <div class="field"><label>Observação</label><textarea id="cf-obs" placeholder="Opcional">${editing ? (editing.observacao || '') : ''}</textarea></div>
        <div class="field checkbox-row" style="align-items:flex-start;gap:10px">
          <input type="checkbox" id="cf-auto" ${editing && editing.aporteAutomatico ? 'checked' : ''} style="margin-top:3px" />
          <label for="cf-auto" style="cursor:pointer"><strong style="display:block;color:var(--text)">Aporte automático mensal</strong><span class="row-sub">O sistema transfere automaticamente da conta no dia escolhido.</span></label>
        </div>
        <button class="btn btn-primary btn-block" id="cf-save">${editing ? 'Salvar alterações' : 'Criar cofrinho'}</button>
      </div>

      ${items.length === 0 && !cofrinhoFormOpen ? `
        <div class="panel">
          ${emptyState({ iconName: 'target', title: 'Nenhum cofrinho criado ainda', text: 'Crie metas como "Viagem", "Reserva de emergência" ou "Notebook novo" e vá guardando aos poucos.', actionLabel: 'Criar primeiro cofrinho', actionId: 'cf-empty-create' })}
        </div>
      ` : ''}
      ${items.length > 0 ? `<div class="grid-2">${cofrinhosFullList(items)}</div>` : ''}
    `;

    document.getElementById('cf-toggle-form').onclick = () => { cofrinhoFormOpen = !cofrinhoFormOpen; if (!cofrinhoFormOpen) editingCofrinhoId = null; draw(); };
    document.getElementById('cf-cancel').onclick = () => { cofrinhoFormOpen = false; editingCofrinhoId = null; draw(); };
    if (document.getElementById('cf-empty-create')) document.getElementById('cf-empty-create').onclick = () => { cofrinhoFormOpen = true; draw(); };

    if (document.getElementById('cf-icone-group')) {
      const icoBtns = document.getElementById('cf-icone-group').querySelectorAll('[data-icone]');
      icoBtns.forEach((b) => b.onclick = () => {
        novoCofrinhoIcone = b.dataset.icone;
        icoBtns.forEach((x) => x.style.cssText = x === b ? 'font-size:16px;border-color:var(--primary);background:var(--primary-soft)' : 'font-size:16px');
      });
      const corBtns = document.getElementById('cf-cor-group').querySelectorAll('[data-cor]');
      corBtns.forEach((b) => b.onclick = () => {
        novoCofrinhoCor = b.dataset.cor;
        corBtns.forEach((x) => x.style.border = x === b ? '2px solid var(--text)' : '2px solid transparent');
      });
      document.getElementById('cf-save').onclick = () => {
        const nome = document.getElementById('cf-nome').value.trim();
        const meta = parseFloat(document.getElementById('cf-meta').value) || 0;
        if (!nome) { toast('Dê um nome para o cofrinho', 'danger'); return; }
        if (!meta) { toast('Informe o valor objetivo', 'danger'); return; }
        const payload = {
          nome, meta,
          prazo: document.getElementById('cf-prazo').value || null,
          icone: novoCofrinhoIcone,
          cor: novoCofrinhoCor,
          observacao: document.getElementById('cf-obs').value,
          aporteAutomatico: document.getElementById('cf-auto').checked,
        };
        if (editing) { Store.update('cofrinhos', editing.id, payload); toast('Cofrinho atualizado', 'success'); }
        else { Store.add('cofrinhos', Object.assign({ atual: 0 }, payload)); toast('Cofrinho criado', 'success'); }
        cofrinhoFormOpen = false; editingCofrinhoId = null;
        draw();
      };
    }

    container.querySelectorAll('[data-action="edit-cofrinho"]').forEach((b) => b.onclick = () => { editingCofrinhoId = b.dataset.id; cofrinhoFormOpen = true; draw(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    container.querySelectorAll('[data-action="delete-cofrinho"]').forEach((b) => b.onclick = () => {
      confirmModal({
        title: 'Excluir cofrinho', text: 'Essa ação não pode ser desfeita. Deseja continuar?', confirmLabel: 'Excluir', danger: true,
        onConfirm: () => { Store.remove('cofrinhos', b.dataset.id); toast('Cofrinho excluído', 'success'); draw(); },
      });
    });
    container.querySelectorAll('[data-action="depositar-cofrinho"]').forEach((b) => b.onclick = () => {
      const overlay = document.getElementById('modal-overlay');
      overlay.innerHTML = `
        <div class="modal-box">
          <h3>Depositar no cofrinho</h3>
          <div class="field"><label>Valor</label><input type="number" step="0.01" id="dep-valor" placeholder="0,00" /></div>
          <div class="modal-actions">
            <button class="btn btn-ghost btn-sm" id="modal-cancel">Cancelar</button>
            <button class="btn btn-primary btn-sm" id="modal-confirm">Depositar</button>
          </div>
        </div>`;
      overlay.classList.add('open');
      overlay.querySelector('#modal-cancel').onclick = () => overlay.classList.remove('open');
      overlay.querySelector('#modal-confirm').onclick = () => {
        const valor = parseFloat(document.getElementById('dep-valor').value) || 0;
        if (valor > 0) {
          const c = Store.get('cofrinhos', b.dataset.id);
          Store.update('cofrinhos', b.dataset.id, { atual: (c.atual || 0) + valor });
          toast('Depósito registrado', 'success');
        }
        overlay.classList.remove('open');
        draw();
      };
    });
  };
  draw();
}
function cofrinhosFullList(items) {
  return items.map((c) => {
    const pct = c.meta > 0 ? Math.min(100, Math.round((c.atual / c.meta) * 100)) : 0;
    return `
      <div class="panel" style="background:var(--bg-input)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <strong style="display:flex;align-items:center;gap:8px"><span style="width:34px;height:34px;border-radius:50%;background:${hexToSoft(c.cor || '#f5a623')};display:inline-flex;align-items:center;justify-content:center">${c.icone || '🎯'}</span>${c.nome}</strong>
          <div class="row-actions">
            <button class="btn-icon" data-action="edit-cofrinho" data-id="${c.id}">${icon('edit')}</button>
            <button class="btn-icon" data-action="delete-cofrinho" data-id="${c.id}">${icon('trash')}</button>
          </div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:6px"><strong>${formatCurrency(c.atual)}</strong><span class="row-sub">de ${formatCurrency(c.meta)} · ${pct}%</span></div>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%;background:${c.cor || 'var(--primary)'}"></div></div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px">
          <span class="row-sub">${c.prazo ? 'Prazo: ' + formatDateBR(c.prazo) : (c.aporteAutomatico ? 'Aporte automático ativo' : '')}</span>
          <button class="btn btn-ghost btn-sm" data-action="depositar-cofrinho" data-id="${c.id}">${icon('plus')} Depositar</button>
        </div>
      </div>`;
  }).join('');
}

/* ---- Cartões de crédito ---- */
let editingCartaoId = null;
let editingCompraId = null;
let selectedCartaoId = null;
let selectedFaturaMonth = null;
let novoCartaoOpen = false;
let compraTipo = 'avista';

function pageCartoes(container) {
  const draw = () => {
    const cartoes = Store.state.cartoes;
    if (!selectedCartaoId || !cartoes.find((c) => c.id === selectedCartaoId)) selectedCartaoId = cartoes[0] ? cartoes[0].id : null;
    if (!selectedFaturaMonth) selectedFaturaMonth = currentMonthStr();
    const editingCartao = editingCartaoId ? Store.get('cartoes', editingCartaoId) : null;
    const editingCompra = editingCompraId ? Store.get('cartaoCompras', editingCompraId) : null;
    const mAtual = currentMonthStr();

    const totalLimite = cartoes.reduce((s, c) => s + (c.limite || 0), 0);
    const totalAPagar = cartoes.reduce((s, c) => s + cartaoFaturaForMonth(c.id, mAtual), 0);
    const totalParcelas = cartoes.reduce((s, c) => s + parcelasAtivasCount(c.id), 0);

    const selected = cartoes.find((c) => c.id === selectedCartaoId);
    const faturaItens = selected ? cartaoComprasForMonth(selected.id, selectedFaturaMonth) : [];
    const faturaTotal = faturaItens.reduce((s, x) => s + x.occurrence.valor, 0);
    const faturaPaga = selected && isCartaoFaturaPaga(selected.id, selectedFaturaMonth);
    const faturaCatTotals = {};
    faturaItens.forEach((x) => { const k = x.compra.categoryId || 'sem'; faturaCatTotals[k] = (faturaCatTotals[k] || 0) + x.occurrence.valor; });
    const faturaCatEntries = Object.entries(faturaCatTotals).sort((a, b) => b[1] - a[1]);
    const faturaMaiorCat = faturaCatEntries[0];

    const monthOptions = Array.from({ length: 7 }, (_, i) => monthAddStr(mAtual, i - 3));

    container.innerHTML = `
      <div class="grid-form-list">
        <div>
          <div class="panel">
            <button type="button" class="btn btn-ghost btn-block" id="cc-toggle-novocartao" style="justify-content:space-between">
              <span>${icon('card')} Novo cartão</span>${icon('chevronDown')}
            </button>
            <div id="cc-novocartao-box" style="display:${novoCartaoOpen ? 'block' : 'none'};margin-top:14px">
              <h3 style="margin-bottom:14px;font-size:14px">${editingCartao ? 'Editar cartão' : 'Cadastrar cartão'}</h3>
              <div class="field"><label>Nome do cartão</label><input type="text" id="cc-nome" placeholder="Ex.: Nubank Ultravioleta" value="${editingCartao ? editingCartao.nome : ''}" /></div>
              <div class="field"><label>Banco</label><input type="text" id="cc-banco" placeholder="Ex.: Nubank" value="${editingCartao ? editingCartao.banco || '' : ''}" /></div>
              <div class="field-row">
                <div class="field"><label>Limite</label><input type="number" step="0.01" id="cc-limite" placeholder="0,00" value="${editingCartao ? editingCartao.limite : ''}" /></div>
                <div class="field"><label>Cor</label><input type="text" id="cc-cor" value="${editingCartao ? editingCartao.cor || '#3866ff' : '#3866ff'}" /></div>
              </div>
              <div class="field-row">
                <div class="field"><label>Dia de fechamento</label><input type="number" min="1" max="31" id="cc-fechamento" placeholder="Ex.: 3" value="${editingCartao ? editingCartao.diaFechamento : ''}" /></div>
                <div class="field"><label>Dia de vencimento</label><input type="number" min="1" max="31" id="cc-vencimento" placeholder="Ex.: 10" value="${editingCartao ? editingCartao.diaVencimento : ''}" /></div>
              </div>
              <button class="btn btn-primary btn-block" id="cc-save-cartao">${editingCartao ? 'Salvar alterações' : 'Salvar cartão'}</button>
              ${editingCartao ? `<button class="btn btn-ghost btn-block" id="cc-cancel-cartao" style="margin-top:8px">Cancelar edição</button>` : ''}
            </div>
          </div>

          <div class="panel">
            <h3 style="margin-bottom:14px">Adicionar compra</h3>
            ${cartoes.length === 0 ? `<div class="row-sub" style="margin-bottom:10px">Cadastre um cartão acima antes de lançar compras.</div>` : ''}
            <div class="field"><label>Nome da compra</label><input type="text" id="cp-nome" placeholder="Ex.: Mercado" /></div>
            <div class="field-row">
              <div class="field"><label>Valor</label><input type="number" step="0.01" id="cp-valor" placeholder="0,00" /></div>
              <div class="field"><label>Data</label><input type="date" id="cp-data" value="${todayISO()}" /></div>
            </div>
            <div class="field"><label>Cartão</label><select id="cp-cartao">${cartoes.length === 0 ? '<option value="">Nenhum cartão cadastrado</option>' : cartoes.map((c) => `<option value="${c.id}" ${c.id === selectedCartaoId ? 'selected' : ''}>${c.nome}${c.banco ? ' — ' + c.banco : ''}</option>`).join('')}</select></div>
            <div class="field"><label>Categoria</label>${fieldHTML({ key: 'cp-categoria', type: 'select-category' }, '')}</div>
            <div class="field">
              <label>Tipo de compra</label>
              <div class="pill-group" id="cp-tipo-group">
                <button type="button" class="pill ${compraTipo === 'avista' ? 'active' : ''}" data-tipo="avista">À vista</button>
                <button type="button" class="pill ${compraTipo === 'parcelado' ? 'active' : ''}" data-tipo="parcelado">Parcelado</button>
                <button type="button" class="pill ${compraTipo === 'recorrente' ? 'active' : ''}" data-tipo="recorrente">Recorrente</button>
              </div>
            </div>
            <div class="field" id="cp-parcelas-field" style="display:${compraTipo === 'parcelado' ? 'block' : 'none'}">
              <label>Número de parcelas</label><input type="number" min="2" max="48" id="cp-parcelas" value="2" />
            </div>
            <button class="btn btn-primary btn-block" id="cp-save" ${cartoes.length === 0 ? 'disabled' : ''}>Adicionar compra</button>
            <div style="margin-top:14px">${collapsibleNewCategory('cp')}</div>
          </div>
        </div>

        <div>
          <div class="panel">
            <div class="panel-header"><div><h3>Seus cartões</h3><div class="panel-sub">Visão consolidada da fatura aberta de cada cartão.</div></div></div>
            <div class="stat-grid">
              ${statCard({ label: 'Cartões', value: cartoes.length, tone: 'blue', iconName: 'card' })}
              ${statCard({ label: 'A pagar no mês', value: formatCurrency(totalAPagar), tone: 'red', iconName: 'arrowDownCircle' })}
              ${statCard({ label: 'Parcelas ativas', value: totalParcelas, tone: 'purple', iconName: 'layers' })}
              ${statCard({ label: 'Limite total', value: formatCurrency(totalLimite), tone: 'cyan', iconName: 'wallet' })}
            </div>
            ${cartoes.length === 0 ? emptyState({ iconName: 'card', title: 'Você ainda não cadastrou nenhum cartão', text: 'Use o formulário "Novo cartão" ao lado.' }) : `
              <table class="list-table">
                <thead><tr><th>Cartão</th><th>Banco</th><th>Fatura</th><th>Vencim.</th><th>Parcelas</th><th>A pagar</th><th>Limite uso</th><th>Ações</th></tr></thead>
                <tbody>
                  ${cartoes.map((c) => {
                    const fatura = cartaoFaturaForMonth(c.id, mAtual);
                    const pct = c.limite > 0 ? Math.min(100, Math.round((fatura / c.limite) * 100)) : 0;
                    return `<tr style="cursor:pointer;${c.id === selectedCartaoId ? 'background:var(--primary-soft)' : ''}" data-action="select-cartao" data-id="${c.id}">
                      <td><div style="display:flex;align-items:center;gap:8px"><span style="width:14px;height:14px;border-radius:4px;background:${c.cor || 'var(--primary)'};display:inline-block"></span><strong>${c.nome}</strong></div></td>
                      <td>${c.banco || '—'}</td>
                      <td>${monthLabel(Number(mAtual.slice(5,7))-1).slice(0,3).toLowerCase()}. de ${mAtual.slice(2,4)}</td>
                      <td>dia ${c.diaVencimento || '—'}</td>
                      <td>${parcelasAtivasCount(c.id)}</td>
                      <td class="amount-neg">${formatCurrency(fatura)}</td>
                      <td style="min-width:90px"><div class="progress-track" style="margin-bottom:3px"><div class="progress-fill" style="width:${pct}%;background:${pct > 80 ? 'var(--danger)' : 'var(--primary)'}"></div></div><span class="row-sub">${pct}%</span></td>
                      <td><div class="row-actions">
                        <button class="btn-icon" data-action="edit-cartao" data-id="${c.id}">${icon('edit')}</button>
                        <button class="btn-icon" data-action="delete-cartao" data-id="${c.id}">${icon('trash')}</button>
                      </div></td>
                    </tr>`;
                  }).join('')}
                </tbody>
              </table>
            `}
          </div>

          ${selected ? `
          <div class="panel">
            <div class="panel-header"><div><h3>Análise por categoria · fatura selecionada</h3><div class="panel-sub">Gastos por categoria da fatura ${monthLabel(Number(selectedFaturaMonth.slice(5,7))-1)} — ${selected.nome}.</div></div></div>
            ${faturaCatEntries.length === 0 ? emptyState({ iconName: 'list', title: 'Nenhum lançamento nessa fatura.' }) : categoryDonut(faturaCatEntries, faturaTotal)}
          </div>

          <div class="panel">
            <div class="panel-header">
              <div>
                <h3>Fatura — ${selected.nome} <span class="badge ${faturaPaga ? 'badge-success' : 'badge-danger'}">${faturaPaga ? 'Paga' : 'Em aberto'}</span></h3>
                <div class="panel-sub">Total: <strong style="color:var(--text)">${formatCurrency(faturaTotal)}</strong> · Pago: ${formatCurrency(faturaPaga ? faturaTotal : 0)} · Saldo: ${formatCurrency(faturaPaga ? 0 : faturaTotal)}</div>
              </div>
              <div style="display:flex;gap:8px;align-items:center">
                <select id="cc-fatura-mes">${monthOptions.map((m) => `<option value="${m}" ${m === selectedFaturaMonth ? 'selected' : ''}>${monthLabel(Number(m.slice(5,7))-1)} de ${m.slice(2,4)}</option>`).join('')}</select>
                <button class="btn ${faturaPaga ? 'btn-ghost' : 'btn-primary'} btn-sm" id="cc-pagar-fatura">${faturaPaga ? 'Reabrir fatura' : 'Pagar fatura'}</button>
              </div>
            </div>
            <div class="stat-grid">
              ${statCard({ label: 'Limite total', value: formatCurrency(selected.limite), tone: 'blue', iconName: 'card' })}
              ${statCard({ label: 'Limite usado', value: formatCurrency(faturaTotal), tone: 'red', iconName: 'arrowDownCircle' })}
              ${statCard({ label: 'Limite disponível', value: formatCurrency(Math.max(0, selected.limite - faturaTotal)), tone: 'green', iconName: 'checkCircle' })}
              ${statCard({ label: 'Saldo da fatura', value: formatCurrency(faturaPaga ? 0 : faturaTotal), tone: 'orange', iconName: 'wallet' })}
            </div>
            ${faturaItens.length === 0 ? emptyState({ iconName: 'list', title: 'Nenhum item nessa fatura.' }) : `
              <table class="list-table">
                <thead><tr><th>Descrição</th><th>Categoria</th><th>Compra</th><th>Parcela</th><th>Valor</th><th></th></tr></thead>
                <tbody>
                  ${faturaItens.map(({ compra, occurrence }) => `
                    <tr>
                      <td class="row-title">${compra.descricao}</td>
                      <td>${categoryTag(compra.categoryId)}</td>
                      <td>${formatDateBR(compra.data)}</td>
                      <td>${occurrence.parcelaLabel}</td>
                      <td><strong>${formatCurrency(occurrence.valor)}</strong></td>
                      <td><div class="row-actions">
                        <button class="btn-icon" data-action="edit-compra" data-id="${compra.id}">${icon('edit')}</button>
                        <button class="btn-icon" data-action="delete-compra" data-id="${compra.id}">${icon('trash')}</button>
                      </div></td>
                    </tr>`).join('')}
                </tbody>
              </table>
            `}
          </div>` : ''}
        </div>
      </div>
    `;

    document.getElementById('cc-toggle-novocartao').onclick = () => { novoCartaoOpen = !novoCartaoOpen; draw(); };
    if (document.getElementById('cc-save-cartao')) {
      document.getElementById('cc-save-cartao').onclick = () => {
        const nome = document.getElementById('cc-nome').value.trim();
        const limite = parseFloat(document.getElementById('cc-limite').value) || 0;
        if (!nome) { toast('Informe o nome do cartão', 'danger'); return; }
        if (!limite) { toast('Informe o limite do cartão', 'danger'); return; }
        const payload = {
          nome, limite,
          banco: document.getElementById('cc-banco').value,
          cor: document.getElementById('cc-cor').value || '#3866ff',
          diaFechamento: parseInt(document.getElementById('cc-fechamento').value, 10) || null,
          diaVencimento: parseInt(document.getElementById('cc-vencimento').value, 10) || null,
        };
        if (editingCartao) { Store.update('cartoes', editingCartao.id, payload); toast('Cartão atualizado', 'success'); editingCartaoId = null; }
        else { const c = Store.add('cartoes', payload); toast('Cartão cadastrado', 'success'); selectedCartaoId = c.id; }
        novoCartaoOpen = false;
        draw();
      };
    }
    if (document.getElementById('cc-cancel-cartao')) document.getElementById('cc-cancel-cartao').onclick = () => { editingCartaoId = null; novoCartaoOpen = false; draw(); };

    document.getElementById('cp-tipo-group').querySelectorAll('.pill').forEach((b) => b.onclick = () => {
      compraTipo = b.dataset.tipo;
      document.getElementById('cp-tipo-group').querySelectorAll('.pill').forEach((x) => x.classList.toggle('active', x === b));
      document.getElementById('cp-parcelas-field').style.display = compraTipo === 'parcelado' ? 'block' : 'none';
    });

    wireQuickAddButtons([{ key: 'cp-categoria', type: 'select-category' }]);
    wireCollapsibleNewCategory('cp', () => draw());

    if (document.getElementById('cp-save')) {
      document.getElementById('cp-save').onclick = () => {
        const descricao = document.getElementById('cp-nome').value.trim();
        const valorTotal = parseFloat(document.getElementById('cp-valor').value) || 0;
        const cartaoId = document.getElementById('cp-cartao').value;
        if (!descricao) { toast('Informe o nome da compra', 'danger'); return; }
        if (!valorTotal) { toast('Informe um valor', 'danger'); return; }
        if (!cartaoId) { toast('Selecione um cartão', 'danger'); return; }
        const payload = {
          descricao, valorTotal, cartaoId,
          data: document.getElementById('cp-data').value,
          categoryId: document.getElementById('f-cp-categoria').value,
          tipo: compraTipo,
          parcelas: compraTipo === 'parcelado' ? Math.max(2, parseInt(document.getElementById('cp-parcelas').value, 10) || 2) : 1,
        };
        if (editingCompra) { Store.update('cartaoCompras', editingCompra.id, payload); toast('Compra atualizada', 'success'); editingCompraId = null; }
        else { Store.add('cartaoCompras', payload); toast('Compra adicionada', 'success'); }
        selectedCartaoId = cartaoId;
        draw();
      };
    }

    container.querySelectorAll('[data-action="select-cartao"]').forEach((tr) => tr.onclick = () => { selectedCartaoId = tr.dataset.id; selectedFaturaMonth = currentMonthStr(); draw(); });
    container.querySelectorAll('[data-action="edit-cartao"]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); editingCartaoId = b.dataset.id; novoCartaoOpen = true; draw(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    container.querySelectorAll('[data-action="delete-cartao"]').forEach((b) => b.onclick = (e) => {
      e.stopPropagation();
      confirmModal({
        title: 'Excluir cartão', text: 'Isso também vai remover as compras lançadas nesse cartão. Deseja continuar?', confirmLabel: 'Excluir', danger: true,
        onConfirm: () => {
          Store.remove('cartoes', b.dataset.id);
          Store.state.cartaoCompras = Store.state.cartaoCompras.filter((c) => c.cartaoId !== b.dataset.id);
          Store.save();
          toast('Cartão excluído', 'success'); draw();
        },
      });
    });
    container.querySelectorAll('[data-action="edit-compra"]').forEach((b) => b.onclick = () => { editingCompraId = b.dataset.id; draw(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    container.querySelectorAll('[data-action="delete-compra"]').forEach((b) => b.onclick = () => {
      confirmModal({
        title: 'Excluir compra', text: 'Essa ação não pode ser desfeita. Deseja continuar?', confirmLabel: 'Excluir', danger: true,
        onConfirm: () => { Store.remove('cartaoCompras', b.dataset.id); toast('Compra excluída', 'success'); draw(); },
      });
    });
    if (document.getElementById('cc-fatura-mes')) document.getElementById('cc-fatura-mes').onchange = (e) => { selectedFaturaMonth = e.target.value; draw(); };
    if (document.getElementById('cc-pagar-fatura')) document.getElementById('cc-pagar-fatura').onclick = () => { toggleCartaoFaturaPaga(selected.id, selectedFaturaMonth); draw(); };
  };
  draw();
}

/* ---- Investimentos ---- */
const INVEST_TIPOS = ['CDB', 'Tesouro Direto', 'LCI/LCA', 'Fundos', 'Ações', 'FIIs', 'Cripto', 'Poupança', 'Outro'];
let investFormOpen = false;
let editingInvestId = null;

function pageInvestimentos(container) {
  const draw = () => {
    const items = Store.state.investimentos;
    const editing = editingInvestId ? Store.get('investimentos', editingInvestId) : null;
    const capitalAplicado = items.reduce((s, i) => s + (i.capitalInicial || 0), 0);
    const aporteMensal = items.reduce((s, i) => s + (i.aporteMensal || 0), 0);

    container.innerHTML = `
      <div class="stat-grid">
        ${statCard({ label: 'Investimentos ativos', value: items.length, tone: 'blue', iconName: 'trendUp' })}
        ${statCard({ label: 'Capital aplicado', value: formatCurrency(capitalAplicado), tone: 'purple', iconName: 'wallet' })}
        ${statCard({ label: 'Aporte mensal', value: formatCurrency(aporteMensal), tone: 'green', iconName: 'checkCircle' })}
      </div>

      <div class="panel-header" style="margin-bottom:16px">
        <div class="row-sub">Sua carteira completa</div>
        <button class="btn btn-primary btn-sm" id="iv-toggle-form">${icon('plus')} Novo investimento</button>
      </div>

      <div class="panel" id="iv-form-panel" style="display:${investFormOpen ? 'block' : 'none'}">
        <div class="panel-header"><h3>${editing ? 'Editar investimento' : 'Novo investimento'}</h3><button class="btn btn-ghost btn-sm" id="iv-cancel">Cancelar</button></div>
        <div class="field"><label>Nome</label><input type="text" id="iv-nome" placeholder="Ex.: CDB Banco Inter 110% CDI" value="${editing ? editing.nome : ''}" /></div>
        <div class="field-row" style="grid-template-columns:1fr 1fr 1fr">
          <div class="field"><label>Instituição</label><input type="text" id="iv-instituicao" placeholder="Ex.: XP, Inter, Nubank" value="${editing ? editing.instituicao || '' : ''}" /></div>
          <div class="field"><label>Tipo</label><select id="iv-tipo">${INVEST_TIPOS.map((t) => `<option value="${t}" ${editing && editing.tipo === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
          <div class="field"><label>Data de início</label><input type="date" id="iv-data" value="${editing ? editing.data : todayISO()}" /></div>
        </div>
        <div class="field-row" style="grid-template-columns:1fr 1fr 1fr">
          <div class="field"><label>Capital inicial</label><input type="number" step="0.01" id="iv-capital" placeholder="0,00" value="${editing ? editing.capitalInicial : ''}" /></div>
          <div class="field"><label>Aporte mensal</label><input type="number" step="0.01" id="iv-aporte" placeholder="0,00" value="${editing ? editing.aporteMensal || '' : ''}" /></div>
          <div class="field"><label>Rentabilidade anual (%)</label><input type="number" step="0.01" id="iv-rentab" placeholder="0,00" value="${editing ? editing.rentabilidade || '' : ''}" /></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Taxa aplicada (%)</label><input type="number" step="0.01" id="iv-taxa" placeholder="0,00" value="${editing ? editing.taxa || '' : ''}" /></div>
          <div class="field"><label>Prazo (meses)</label><input type="number" id="iv-prazo" placeholder="Opcional" value="${editing ? editing.prazoMeses || '' : ''}" /></div>
        </div>
        <div class="field"><label>Observação</label><textarea id="iv-obs" placeholder="Opcional">${editing ? (editing.observacao || '') : ''}</textarea></div>
        <button class="btn btn-primary btn-block" id="iv-save">${editing ? 'Salvar alterações' : 'Criar investimento'}</button>
      </div>

      ${items.length === 0 && !investFormOpen ? `<div class="panel">${emptyState({ iconName: 'trendUp', title: 'Nenhum investimento cadastrado', text: 'Adicione seus investimentos (CDB, Tesouro, FIIs, ações) para acompanhar rentabilidade e evolução em um só lugar.', actionLabel: 'Cadastrar primeiro', actionId: 'iv-empty-create' })}</div>` : ''}
      ${items.length > 0 ? `
        <div class="panel">
          <table class="list-table">
            <thead><tr><th>Ativo</th><th>Instituição</th><th>Tipo</th><th>Capital</th><th>Aporte mensal</th><th>Rentab. anual</th><th></th></tr></thead>
            <tbody>${items.map((i) => `
              <tr>
                <td class="row-title">${i.nome}</td>
                <td>${i.instituicao || '—'}</td>
                <td><span class="badge badge-primary">${i.tipo}</span></td>
                <td><strong>${formatCurrency(i.capitalInicial)}</strong></td>
                <td>${formatCurrency(i.aporteMensal || 0)}</td>
                <td>${i.rentabilidade ? i.rentabilidade + '% a.a.' : '—'}</td>
                <td><div class="row-actions"><button class="btn-icon" data-action="edit-invest" data-id="${i.id}">${icon('edit')}</button><button class="btn-icon" data-action="delete-invest" data-id="${i.id}">${icon('trash')}</button></div></td>
              </tr>`).join('')}</tbody>
          </table>
        </div>` : ''}
    `;

    document.getElementById('iv-toggle-form').onclick = () => { investFormOpen = !investFormOpen; if (!investFormOpen) editingInvestId = null; draw(); };
    if (document.getElementById('iv-cancel')) document.getElementById('iv-cancel').onclick = () => { investFormOpen = false; editingInvestId = null; draw(); };
    if (document.getElementById('iv-empty-create')) document.getElementById('iv-empty-create').onclick = () => { investFormOpen = true; draw(); };
    if (document.getElementById('iv-save')) {
      document.getElementById('iv-save').onclick = () => {
        const nome = document.getElementById('iv-nome').value.trim();
        const capitalInicial = parseFloat(document.getElementById('iv-capital').value) || 0;
        if (!nome) { toast('Informe o nome do investimento', 'danger'); return; }
        if (!capitalInicial) { toast('Informe o capital inicial', 'danger'); return; }
        const payload = {
          nome, capitalInicial,
          instituicao: document.getElementById('iv-instituicao').value,
          tipo: document.getElementById('iv-tipo').value,
          data: document.getElementById('iv-data').value,
          aporteMensal: parseFloat(document.getElementById('iv-aporte').value) || 0,
          rentabilidade: parseFloat(document.getElementById('iv-rentab').value) || 0,
          taxa: parseFloat(document.getElementById('iv-taxa').value) || 0,
          prazoMeses: parseInt(document.getElementById('iv-prazo').value, 10) || null,
          observacao: document.getElementById('iv-obs').value,
        };
        if (editing) { Store.update('investimentos', editing.id, payload); toast('Investimento atualizado', 'success'); }
        else { Store.add('investimentos', payload); toast('Investimento cadastrado', 'success'); }
        investFormOpen = false; editingInvestId = null;
        draw();
      };
    }
    container.querySelectorAll('[data-action="edit-invest"]').forEach((b) => b.onclick = () => { editingInvestId = b.dataset.id; investFormOpen = true; draw(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    container.querySelectorAll('[data-action="delete-invest"]').forEach((b) => b.onclick = () => {
      confirmModal({
        title: 'Excluir investimento', text: 'Essa ação não pode ser desfeita. Deseja continuar?', confirmLabel: 'Excluir', danger: true,
        onConfirm: () => { Store.remove('investimentos', b.dataset.id); toast('Investimento excluído', 'success'); draw(); },
      });
    });
  };
  draw();
}

/* =========================================================================
   EXTRATO — livro-razão unificado (gastos fixos + variáveis + recebimentos)
   ========================================================================= */
let extratoPeriod = { type: 'sync' };
let extratoBanco = 'todos';
let extratoTipo = 'todos';
let extratoStatus = 'todos';
let extratoSearch = '';
let extratoSort = 'desc';
let extratoFiltrosAbertos = false;

function monthRangeISO(mStr) {
  const [y, m] = mStr.split('-').map(Number);
  return [`${mStr}-01`, `${mStr}-${String(daysInMonth(y, m - 1)).padStart(2, '0')}`];
}
function extratoDateRange(period) {
  const today = todayISO();
  switch (period.type) {
    case 'sync': return dashPeriod.type === 'year' ? [`${dashPeriod.value}-01-01`, `${dashPeriod.value}-12-31`] : monthRangeISO(dashPeriod.value || currentMonthStr());
    case 'hoje': return [today, today];
    case 'ontem': return [addDaysISO(today, -1), addDaysISO(today, -1)];
    case '7dias': return [addDaysISO(today, -6), today];
    case '30dias': return [addDaysISO(today, -29), today];
    case 'mespassado': return monthRangeISO(monthAddStr(currentMonthStr(), -1));
    case 'custom': return [period.start || today, period.end || today];
    case 'mes': default: return monthRangeISO(currentMonthStr());
  }
}
function pageExtrato(container) {
  const draw = () => {
    const [start, end] = extratoDateRange(extratoPeriod);
    let txs = buildTransacoes(start, end);

    if (extratoBanco !== 'todos') txs = txs.filter((t) => t.bankId === extratoBanco);
    if (extratoTipo !== 'todos') txs = txs.filter((t) => t.tipo === extratoTipo);
    if (extratoStatus !== 'todos') txs = txs.filter((t) => (extratoStatus === 'pago' ? (t.status === 'pago' || t.status === 'recebido') : t.status === 'pendente'));
    if (extratoSearch) {
      const q = extratoSearch.toLowerCase();
      txs = txs.filter((t) => t.descricao.toLowerCase().includes(q) || (Store.categoryById(t.categoryId) || {}).name?.toLowerCase().includes(q));
    }
    txs.sort((a, b) => extratoSort === 'asc' ? (a.data < b.data ? -1 : 1) : (a.data < b.data ? 1 : -1));

    const gastos = txs.filter((t) => t.sinal === -1);
    const receb = txs.filter((t) => t.sinal === 1);
    const totalGastos = gastos.reduce((s, t) => s + t.valor, 0);
    const totalRecebimentos = receb.reduce((s, t) => s + t.valor, 0);
    const totalAReceber = receb.filter((t) => t.status !== 'recebido').reduce((s, t) => s + t.valor, 0);
    const totalPago = gastos.filter((t) => t.status === 'pago').reduce((s, t) => s + t.valor, 0);
    const faltaPagar = totalGastos - totalPago;
    const entradasRealizadas = receb.filter((t) => t.status === 'recebido').reduce((s, t) => s + t.valor, 0);
    const saidasPagas = totalPago;
    const saldoBancario = Store.state.banks.reduce((s, b) => s + (b.balance || 0), 0);

    const periodPills = [
      { mode: 'sync', label: `Sincronizar com Dashboard (${dashPeriod.type === 'year' ? dashPeriod.value : 'Este mês'})` },
      { mode: 'hoje', label: 'Hoje' }, { mode: 'ontem', label: 'Ontem' }, { mode: '7dias', label: 'Últimos 7 dias' },
      { mode: '30dias', label: 'Últimos 30 dias' }, { mode: 'mes', label: 'Este mês' }, { mode: 'mespassado', label: 'Mês passado' },
      { mode: 'custom', label: 'Personalizado' },
    ];

    container.innerHTML = `
      <div class="panel">
        <div class="section-title" style="margin-top:0">Período</div>
        <div class="pill-group" id="ex-period-group">${periodPills.map((p) => `<button class="pill ${extratoPeriod.type === p.mode ? 'active' : ''}" data-mode="${p.mode}">${p.label}</button>`).join('')}</div>
        ${extratoPeriod.type === 'custom' ? `
          <div class="field-row" style="max-width:340px;margin-top:12px">
            <div class="field"><label>De</label><input type="date" id="ex-start" value="${extratoPeriod.start || start}" /></div>
            <div class="field"><label>Até</label><input type="date" id="ex-end" value="${extratoPeriod.end || end}" /></div>
          </div>` : ''}

        <div class="section-title">Bancos (${extratoBanco === 'todos' ? 'todos' : (Store.bankById(extratoBanco) || {}).name})</div>
        <div class="pill-group" id="ex-bank-group">
          <button class="pill ${extratoBanco === 'todos' ? 'active' : ''}" data-bank="todos">Todos</button>
          ${Store.state.banks.map((b) => `<button class="pill ${extratoBanco === b.id ? 'active' : ''}" data-bank="${b.id}">${icon('bank')} ${b.name}</button>`).join('')}
        </div>

        <div class="field-row" style="margin-top:14px;align-items:end">
          <div class="field"><label>Tipo</label><select id="ex-tipo">
            <option value="todos" ${extratoTipo === 'todos' ? 'selected' : ''}>Todos</option>
            <option value="Gasto fixo" ${extratoTipo === 'Gasto fixo' ? 'selected' : ''}>Gasto fixo</option>
            <option value="Gasto variável" ${extratoTipo === 'Gasto variável' ? 'selected' : ''}>Gasto variável</option>
            <option value="Recebimento" ${extratoTipo === 'Recebimento' ? 'selected' : ''}>Recebimento</option>
          </select></div>
          <div class="field" style="flex:1"><label>Buscar</label><input type="text" id="ex-search" placeholder="Descrição, categoria..." value="${extratoSearch}" /></div>
        </div>
        <button class="btn btn-ghost btn-sm" id="ex-toggle-filtros">${icon('chevronDown')} Filtros avançados</button>
        <div style="display:${extratoFiltrosAbertos ? 'block' : 'none'};margin-top:12px" class="field-row">
          <div class="field"><label>Status</label><select id="ex-status">
            <option value="todos" ${extratoStatus === 'todos' ? 'selected' : ''}>Todos</option>
            <option value="pago" ${extratoStatus === 'pago' ? 'selected' : ''}>Pago/Recebido</option>
            <option value="pendente" ${extratoStatus === 'pendente' ? 'selected' : ''}>Pendente</option>
          </select></div>
          <div class="field"><label>Ordenar por</label><select id="ex-sort">
            <option value="desc" ${extratoSort === 'desc' ? 'selected' : ''}>Data — mais recente</option>
            <option value="asc" ${extratoSort === 'asc' ? 'selected' : ''}>Data — mais antiga</option>
          </select></div>
        </div>
      </div>

      <div class="stat-grid">
        ${statCard({ label: 'Total de gastos', value: formatCurrency(totalGastos), tone: 'red', iconName: 'arrowDownCircle' })}
        ${statCard({ label: 'Recebimentos', value: formatCurrency(totalRecebimentos), tone: 'green', iconName: 'arrowUpCircle' })}
        ${statCard({ label: 'A receber', value: formatCurrency(totalAReceber), tone: 'blue', iconName: 'download' })}
        ${statCard({ label: 'Total pago', value: formatCurrency(totalPago), tone: 'purple', iconName: 'checkCircle' })}
        ${statCard({ label: 'Falta pagar', value: formatCurrency(faltaPagar), tone: 'orange', iconName: 'alertTriangle' })}
        ${statCard({ label: 'Saldo do período', value: formatCurrency(totalRecebimentos - totalGastos), tone: 'cyan', iconName: 'wallet' })}
      </div>
      <div class="stat-grid">
        ${statCard({ label: 'Entradas (realizadas)', value: formatCurrency(entradasRealizadas), tone: 'green', iconName: 'download' })}
        ${statCard({ label: 'Saídas (pagas)', value: formatCurrency(saidasPagas), tone: 'red', iconName: 'arrowUpCircle' })}
        ${statCard({ label: 'Saldo realizado (período)', value: formatCurrency(entradasRealizadas - saidasPagas), tone: 'blue', iconName: 'checkCircle' })}
        ${statCard({ label: 'Saldo bancário atual', value: formatCurrency(saldoBancario), tone: 'purple', iconName: 'wallet' })}
      </div>

      <div class="panel">
        <div class="panel-header"><h3>${txs.length} movimentações</h3><button class="btn btn-ghost btn-sm" id="ex-export">${icon('download')} Exportar</button></div>
        ${txs.length === 0 ? emptyState({ iconName: 'list', title: 'Nenhuma movimentação encontrada com os filtros aplicados.' }) : `
          <table class="list-table">
            <thead><tr><th>Data</th><th>Descrição</th><th>Tipo</th><th>Banco</th><th>Categoria</th><th>Status</th><th>Valor</th></tr></thead>
            <tbody>${txs.map((t) => `
              <tr>
                <td>${formatDateBR(t.data)}</td>
                <td class="row-title">${t.descricao}</td>
                <td><span class="badge ${t.sinal === 1 ? 'badge-success' : 'badge-muted'}">${t.tipo}</span></td>
                <td>${(Store.bankById(t.bankId) || {}).name || '—'}</td>
                <td>${categoryTag(t.categoryId)}</td>
                <td>${t.status === 'pago' || t.status === 'recebido' ? '<span class="badge badge-success">' + (t.status === 'pago' ? 'pago' : 'recebido') + '</span>' : '<span class="badge badge-warning">pendente</span>'}</td>
                <td class="${t.sinal === 1 ? 'amount-pos' : 'amount-neg'}">${t.sinal === 1 ? '+' : '-'} ${formatCurrency(t.valor)}</td>
              </tr>`).join('')}</tbody>
          </table>
        `}
      </div>
    `;

    document.getElementById('ex-period-group').querySelectorAll('.pill').forEach((b) => b.onclick = () => { extratoPeriod = { type: b.dataset.mode }; draw(); });
    const s = document.getElementById('ex-start'), e = document.getElementById('ex-end');
    if (s) s.onchange = () => { extratoPeriod = { type: 'custom', start: s.value, end: e.value }; draw(); };
    if (e) e.onchange = () => { extratoPeriod = { type: 'custom', start: s.value, end: e.value }; draw(); };
    document.getElementById('ex-bank-group').querySelectorAll('.pill').forEach((b) => b.onclick = () => { extratoBanco = b.dataset.bank; draw(); });
    document.getElementById('ex-tipo').onchange = (ev) => { extratoTipo = ev.target.value; draw(); };
    document.getElementById('ex-search').oninput = (ev) => { extratoSearch = ev.target.value; draw(); };
    document.getElementById('ex-toggle-filtros').onclick = () => { extratoFiltrosAbertos = !extratoFiltrosAbertos; draw(); };
    document.getElementById('ex-status').onchange = (ev) => { extratoStatus = ev.target.value; draw(); };
    document.getElementById('ex-sort').onchange = (ev) => { extratoSort = ev.target.value; draw(); };
    document.getElementById('ex-export').onclick = () => exportExtratoCSV(txs);
  };
  draw();
}

function exportExtratoCSV(txs) {
  const header = ['Data', 'Descrição', 'Tipo', 'Banco', 'Categoria', 'Status', 'Valor'];
  const rows = txs.map((t) => [
    formatDateBR(t.data), t.descricao, t.tipo, (Store.bankById(t.bankId) || {}).name || '', (Store.categoryById(t.categoryId) || {}).name || '',
    t.status, (t.sinal === 1 ? '' : '-') + t.valor.toFixed(2).replace('.', ','),
  ]);
  const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `extrato-fin360-${todayISO()}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('Extrato exportado', 'success');
}

/* =========================================================================
   CONCILIAÇÃO
   ========================================================================= */
let conciliacaoStart = null;
let conciliacaoEnd = null;
let conciliacaoBanco = 'todos';
let conciliacaoTipo = 'todos';
let conciliacaoStatus = 'todos';
let conciliacaoSearch = '';

function pageConciliacao(container) {
  const draw = () => {
    const [defStart, defEnd] = monthRangeISO(currentMonthStr());
    const start = conciliacaoStart || defStart;
    const end = conciliacaoEnd || defEnd;
    let txs = buildTransacoes(start, end);
    const totalMovimentos = txs.length;

    const entradas = txs.filter((t) => t.sinal === 1).reduce((s, t) => s + t.valor, 0);
    const saidas = txs.filter((t) => t.sinal === -1).reduce((s, t) => s + t.valor, 0);
    const conciliadas = txs.filter((t) => isConciliado(t.key));
    const conciliadoValor = conciliadas.reduce((s, t) => s + t.valor, 0);
    const naoConciliadoValor = txs.reduce((s, t) => s + t.valor, 0) - conciliadoValor;
    const progresso = totalMovimentos ? Math.round((conciliadas.length / totalMovimentos) * 100) : 0;

    if (conciliacaoBanco !== 'todos') txs = txs.filter((t) => t.bankId === conciliacaoBanco);
    if (conciliacaoTipo !== 'todos') txs = txs.filter((t) => t.tipo === conciliacaoTipo);
    if (conciliacaoStatus !== 'todos') txs = txs.filter((t) => (conciliacaoStatus === 'conciliado') === isConciliado(t.key));
    if (conciliacaoSearch) {
      const q = conciliacaoSearch.toLowerCase();
      txs = txs.filter((t) => t.descricao.toLowerCase().includes(q) || (Store.categoryById(t.categoryId) || {}).name?.toLowerCase().includes(q) || (Store.bankById(t.bankId) || {}).name?.toLowerCase().includes(q));
    }
    txs.sort((a, b) => (a.data < b.data ? 1 : -1));

    container.innerHTML = `
      <div class="stat-grid">
        ${statCard({ label: 'Entradas', value: formatCurrency(entradas), tone: 'green', iconName: 'arrowUpCircle' })}
        ${statCard({ label: 'Saídas', value: formatCurrency(saidas), tone: 'red', iconName: 'arrowDownCircle' })}
        ${statCard({ label: 'Conciliado', value: formatCurrency(conciliadoValor), tone: 'blue', iconName: 'checkCircle' })}
        ${statCard({ label: 'Não conciliado', value: formatCurrency(naoConciliadoValor), tone: 'orange', iconName: 'alertTriangle' })}
        ${statCard({ label: 'Progresso', value: progresso + '%', sub: `${conciliadas.length} de ${totalMovimentos} movimentos`, tone: 'purple', iconName: 'target' })}
      </div>

      <div class="panel">
        <h3 style="margin-bottom:14px">${icon('search')} Filtros</h3>
        <div class="field-row">
          <div class="field"><label>Início</label><input type="date" id="cn-start" value="${start}" /></div>
          <div class="field"><label>Fim</label><input type="date" id="cn-end" value="${end}" /></div>
        </div>
        <div class="field"><label>Bancos</label>
          <div class="pill-group" id="cn-bank-group">
            <button class="pill ${conciliacaoBanco === 'todos' ? 'active' : ''}" data-bank="todos">Todos</button>
            ${Store.state.banks.map((b) => `<button class="pill ${conciliacaoBanco === b.id ? 'active' : ''}" data-bank="${b.id}">${icon('bank')} ${b.name}</button>`).join('')}
          </div>
        </div>
        <div class="field-row" style="grid-template-columns:1fr 1fr 2fr">
          <div class="field"><label>Tipo</label><select id="cn-tipo">
            <option value="todos">Todos</option>
            <option value="Gasto fixo" ${conciliacaoTipo === 'Gasto fixo' ? 'selected' : ''}>Gasto fixo</option>
            <option value="Gasto variável" ${conciliacaoTipo === 'Gasto variável' ? 'selected' : ''}>Gasto variável</option>
            <option value="Recebimento" ${conciliacaoTipo === 'Recebimento' ? 'selected' : ''}>Recebimento</option>
          </select></div>
          <div class="field"><label>Status</label><select id="cn-status">
            <option value="todos">Todos</option>
            <option value="conciliado" ${conciliacaoStatus === 'conciliado' ? 'selected' : ''}>Conciliado</option>
            <option value="pendente" ${conciliacaoStatus === 'pendente' ? 'selected' : ''}>Pendente</option>
          </select></div>
          <div class="field"><label>Buscar</label><input type="text" id="cn-search" placeholder="Descrição, banco, categoria" value="${conciliacaoSearch}" /></div>
        </div>
      </div>

      <div class="panel">
        ${txs.length === 0 ? emptyState({ iconName: 'checkCircle', title: 'Nenhum lançamento encontrado com os filtros aplicados.' }) : `
          <table class="list-table">
            <thead><tr><th>Data</th><th>Descrição</th><th>Origem</th><th>Banco</th><th>Valor</th><th>Status</th><th>Ação</th></tr></thead>
            <tbody>${txs.map((t) => {
              const conc = isConciliado(t.key);
              return `<tr>
                <td>${formatDateBR(t.data)}</td>
                <td class="row-title">${t.descricao}</td>
                <td><span class="badge badge-muted">${t.tipo}</span></td>
                <td>${(Store.bankById(t.bankId) || {}).name || '—'}</td>
                <td class="${t.sinal === 1 ? 'amount-pos' : 'amount-neg'}">${t.sinal === 1 ? '+' : '-'} ${formatCurrency(t.valor)}</td>
                <td>${conc ? '<span class="badge badge-success">' + icon('checkCircle') + ' Conciliado</span>' : '<span class="badge badge-warning">Pendente</span>'}</td>
                <td><button class="btn ${conc ? 'btn-ghost' : 'btn-primary'} btn-sm" data-action="toggle-conciliar" data-key="${t.key}">${conc ? 'Desfazer' : 'Conciliar'}</button></td>
              </tr>`;
            }).join('')}</tbody>
          </table>
        `}
      </div>
    `;

    document.getElementById('cn-start').onchange = (e) => { conciliacaoStart = e.target.value; draw(); };
    document.getElementById('cn-end').onchange = (e) => { conciliacaoEnd = e.target.value; draw(); };
    document.getElementById('cn-bank-group').querySelectorAll('.pill').forEach((b) => b.onclick = () => { conciliacaoBanco = b.dataset.bank; draw(); });
    document.getElementById('cn-tipo').onchange = (e) => { conciliacaoTipo = e.target.value; draw(); };
    document.getElementById('cn-status').onchange = (e) => { conciliacaoStatus = e.target.value; draw(); };
    document.getElementById('cn-search').oninput = (e) => { conciliacaoSearch = e.target.value; draw(); };
    container.querySelectorAll('[data-action="toggle-conciliar"]').forEach((b) => b.onclick = () => { toggleConciliado(b.dataset.key); draw(); });
  };
  draw();
}

/* =========================================================================
   PLANEJAMENTO
   ========================================================================= */
let planejamentoMes = currentMonthStr();
let planejamentoBusca = '';

function metaCategoria(categoryId, mes) {
  const m = Store.state.metasCategoria.find((x) => x.categoryId === categoryId && x.mes === mes);
  return m ? m.valor : 0;
}
function setMetaCategoria(categoryId, mes, valor) {
  const list = Store.state.metasCategoria;
  const idx = list.findIndex((x) => x.categoryId === categoryId && x.mes === mes);
  if (idx > -1) list[idx].valor = valor; else list.push({ id: uid(), categoryId, mes, valor });
  Store.save();
}
function realizadoCategoria(categoryId, mes) {
  const fixos = gastosFixosForMonth(mes).filter((g) => g.categoryId === categoryId).reduce((s, g) => s + g.valor, 0);
  const variaveis = Store.state.gastosVariaveis.filter((g) => g.categoryId === categoryId && isSameMonth(g.data, mes)).reduce((s, g) => s + g.valor, 0);
  return fixos + variaveis;
}

function pagePlanejamento(container) {
  const draw = () => {
    const mes = planejamentoMes;
    let categorias = Store.state.categories;
    if (planejamentoBusca) categorias = categorias.filter((c) => c.name.toLowerCase().includes(planejamentoBusca.toLowerCase()));

    const totalPlanejado = Store.state.categories.reduce((s, c) => s + metaCategoria(c.id, mes), 0);
    const totalRealizado = Store.state.categories.reduce((s, c) => s + realizadoCategoria(c.id, mes), 0);

    container.innerHTML = `
      <div class="panel">
        <div class="panel-header">
          <div>
            <h2 style="font-size:20px">Planejamento</h2>
            <p class="row-sub" style="margin-top:4px">Compare o planejado com o realizado de cada categoria neste mês.</p>
          </div>
          <div style="display:flex;align-items:center;gap:18px">
            <input type="month" id="pl-mes" value="${mes}" />
            <div><div class="stat-label" style="text-align:right">Planejado</div><strong>${formatCurrency(totalPlanejado)}</strong></div>
            <div><div class="stat-label" style="text-align:right">Realizado</div><strong style="color:${totalRealizado > totalPlanejado && totalPlanejado > 0 ? 'var(--danger)' : 'var(--text)'}">${formatCurrency(totalRealizado)}</strong></div>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-header"><h3>Categorias</h3><input type="text" id="pl-busca" placeholder="Buscar categoria..." style="max-width:280px" value="${planejamentoBusca}" /></div>
        ${categorias.map((c) => {
          const planejado = metaCategoria(c.id, mes);
          const realizado = realizadoCategoria(c.id, mes);
          const pct = planejado > 0 ? Math.min(100, Math.round((realizado / planejado) * 100)) : 0;
          return `
          <div style="display:flex;align-items:center;gap:14px;padding:14px 0;border-top:1px solid var(--border-soft)">
            ${categoryAvatar(c.id)}
            <div style="flex:1">
              <strong>${c.name}</strong>
              <div class="row-sub">Planejado: ${formatCurrency(planejado)} · Realizado: ${formatCurrency(realizado)}</div>
              ${planejado > 0 ? `<div class="progress-track" style="margin-top:6px;max-width:280px"><div class="progress-fill" style="width:${pct}%;background:${pct > 100 ? 'var(--danger)' : c.color}"></div></div>` : ''}
            </div>
            <button class="btn btn-ghost btn-sm" data-action="definir-meta" data-id="${c.id}">${icon('plus')} Definir meta</button>
          </div>`;
        }).join('')}
      </div>
    `;

    document.getElementById('pl-mes').onchange = (e) => { planejamentoMes = e.target.value; draw(); };
    document.getElementById('pl-busca').oninput = (e) => { planejamentoBusca = e.target.value; draw(); };
    container.querySelectorAll('[data-action="definir-meta"]').forEach((b) => b.onclick = () => {
      const cat = Store.categoryById(b.dataset.id);
      const overlay = document.getElementById('modal-overlay');
      overlay.innerHTML = `
        <div class="modal-box">
          <h3>Meta de ${cat.name}</h3>
          <p>Defina o valor planejado para ${monthLabel(Number(mes.slice(5, 7)) - 1)} de ${mes.slice(2, 4)}.</p>
          <div class="field"><label>Valor planejado</label><input type="number" step="0.01" id="meta-valor" value="${metaCategoria(b.dataset.id, mes) || ''}" placeholder="0,00" /></div>
          <div class="modal-actions">
            <button class="btn btn-ghost btn-sm" id="modal-cancel">Cancelar</button>
            <button class="btn btn-primary btn-sm" id="modal-confirm">Salvar</button>
          </div>
        </div>`;
      overlay.classList.add('open');
      overlay.querySelector('#modal-cancel').onclick = () => overlay.classList.remove('open');
      overlay.querySelector('#modal-confirm').onclick = () => {
        setMetaCategoria(b.dataset.id, mes, parseFloat(document.getElementById('meta-valor').value) || 0);
        overlay.classList.remove('open');
        toast('Meta salva', 'success');
        draw();
      };
    });
  };
  draw();
}

/* =========================================================================
   PARCELAMENTOS — financiamentos e empréstimos com amortização Price/SAC
   ========================================================================= */
const PARCELAMENTO_TIPOS = ['Financiamento', 'Empréstimo Pessoal', 'Consórcio', 'Outro'];
let parcelamentosTab = 'ativos';
let editingParcelamentoId = null;
let expandedParcelamentoId = null;

function pageParcelamentos(container) {
  const draw = () => {
    const all = Store.state.parcelamentos;
    const ativos = all.filter((p) => !parcelamentoQuitado(p));
    const quitados = all.filter((p) => parcelamentoQuitado(p));
    const list = parcelamentosTab === 'ativos' ? ativos : quitados;

    const valorFinanciado = ativos.reduce((s, p) => s + p.valorPrincipal, 0);
    const jaPago = all.reduce((s, p) => s + parcelamentoSchedule(p).filter((x) => isParcelaPaga(p.id, x.numero)).reduce((s2, x) => s2 + x.valor, 0), 0);

    container.innerHTML = `
      <div class="stat-grid">
        ${statCard({ label: 'Contratos ativos', value: ativos.length, tone: 'blue', iconName: 'layers' })}
        ${statCard({ label: 'Total de contratos', value: all.length, tone: 'purple', iconName: 'checkCircle' })}
        ${statCard({ label: 'Valor financiado (ativos)', value: formatCurrency(valorFinanciado), tone: 'orange', iconName: 'wallet' })}
        ${statCard({ label: 'Já pago', value: formatCurrency(jaPago), tone: 'green', iconName: 'checkCircle' })}
      </div>

      <div class="panel-header" style="margin-bottom:16px">
        <div class="pill-group">
          <button class="pill ${parcelamentosTab === 'ativos' ? 'active' : ''}" data-tab="ativos">Ativos (${ativos.length})</button>
          <button class="pill ${parcelamentosTab === 'quitados' ? 'active' : ''}" data-tab="quitados">Quitados (${quitados.length})</button>
        </div>
        <button class="btn btn-primary btn-sm" id="pz-new">${icon('plus')} Novo contrato</button>
      </div>

      ${list.length === 0 ? `<div class="panel">${emptyState({ iconName: 'layers', title: parcelamentosTab === 'ativos' ? 'Nenhum contrato ativo' : 'Nenhum contrato quitado ainda', text: 'Cadastre financiamentos, empréstimos ou consórcios para acompanhar as parcelas.', actionLabel: parcelamentosTab === 'ativos' ? 'Novo contrato' : null, actionId: 'pz-empty-new' })}</div>` : list.map((p) => parcelamentoCard(p)).join('')}
    `;

    container.querySelectorAll('[data-tab]').forEach((b) => b.onclick = () => { parcelamentosTab = b.dataset.tab; draw(); });
    document.getElementById('pz-new').onclick = () => openParcelamentoModal(null, draw);
    if (document.getElementById('pz-empty-new')) document.getElementById('pz-empty-new').onclick = () => openParcelamentoModal(null, draw);

    container.querySelectorAll('[data-action="expand-parcelamento"]').forEach((b) => b.onclick = () => { expandedParcelamentoId = expandedParcelamentoId === b.dataset.id ? null : b.dataset.id; draw(); });
    container.querySelectorAll('[data-action="edit-parcelamento"]').forEach((b) => b.onclick = () => openParcelamentoModal(Store.get('parcelamentos', b.dataset.id), draw));
    container.querySelectorAll('[data-action="delete-parcelamento"]').forEach((b) => b.onclick = () => {
      confirmModal({
        title: 'Excluir contrato', text: 'Isso remove o contrato e todo o histórico de parcelas pagas. Deseja continuar?', confirmLabel: 'Excluir', danger: true,
        onConfirm: () => {
          Store.remove('parcelamentos', b.dataset.id);
          Store.state.parcelamentosPagamentos = Store.state.parcelamentosPagamentos.filter((x) => x.parcelamentoId !== b.dataset.id);
          Store.save();
          toast('Contrato excluído', 'success'); draw();
        },
      });
    });
    container.querySelectorAll('[data-action="toggle-parcela"]').forEach((b) => b.onclick = () => { toggleParcelaPaga(b.dataset.id, Number(b.dataset.numero)); draw(); });
  };
  draw();
}

function parcelamentoCard(p) {
  const schedule = parcelamentoSchedule(p);
  const pagas = parcelasPagasCount(p.id);
  const pct = Math.round((pagas / p.numParcelas) * 100);
  const proxima = proximaParcelaPendente(p);
  const expanded = expandedParcelamentoId === p.id;
  return `
    <div class="panel">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px">
        <div>
          <strong>${p.nome}</strong> <span class="badge badge-primary">${p.tipo}</span> <span class="badge badge-muted">${p.sistema === 'sac' ? 'SAC' : 'Price'}</span>
          <div class="row-sub" style="margin-top:6px">${formatCurrency(p.valorPrincipal)} em ${p.numParcelas}x · ${p.taxaJurosMensal}% a.m.${Store.bankById(p.bankId) ? ' · ' + Store.bankById(p.bankId).name : ''}</div>
        </div>
        <div class="row-actions">
          <button class="btn btn-ghost btn-sm" data-action="expand-parcelamento" data-id="${p.id}">${icon('list')} ${expanded ? 'Ocultar parcelas' : 'Ver parcelas'}</button>
          <button class="btn-icon" data-action="edit-parcelamento" data-id="${p.id}">${icon('edit')}</button>
          <button class="btn-icon" data-action="delete-parcelamento" data-id="${p.id}">${icon('trash')}</button>
        </div>
      </div>
      <div style="margin-top:12px;display:flex;justify-content:space-between;font-size:12px;color:var(--text-muted);margin-bottom:5px">
        <span>${pagas} de ${p.numParcelas} parcelas pagas</span><span>${proxima ? 'Próxima: ' + formatDateBR(parcelamentoVencimento(p, proxima.numero)) + ' · ' + formatCurrency(proxima.valor) : 'Quitado 🎉'}</span>
      </div>
      <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
      ${expanded ? `
        <div class="month-table-wrap" style="margin-top:16px">
          <table class="month-table">
            <thead><tr><th>Nº</th><th>Vencimento</th><th>Valor</th><th>Juros</th><th>Amortização</th><th>Saldo devedor</th><th>Status</th></tr></thead>
            <tbody>${schedule.map((s) => {
              const paga = isParcelaPaga(p.id, s.numero);
              return `<tr>
                <td>${s.numero}/${p.numParcelas}</td>
                <td>${formatDateBR(parcelamentoVencimento(p, s.numero))}</td>
                <td><strong>${formatCurrency(s.valor)}</strong></td>
                <td>${formatCurrency(s.juros)}</td>
                <td>${formatCurrency(s.amortizacao)}</td>
                <td>${formatCurrency(s.saldo)}</td>
                <td><button class="badge ${paga ? 'badge-success' : 'badge-warning'}" style="border:none" data-action="toggle-parcela" data-id="${p.id}" data-numero="${s.numero}">${paga ? 'Paga' : 'Pendente'}</button></td>
              </tr>`;
            }).join('')}</tbody>
          </table>
        </div>
      ` : ''}
    </div>
  `;
}

function openParcelamentoModal(editing, onSaved) {
  const overlay = document.getElementById('modal-overlay');
  overlay.innerHTML = `
    <div class="modal-box modal-box-lg">
      <h3 style="margin-bottom:16px">${editing ? 'Editar contrato' : 'Novo contrato de parcelamento'}</h3>
      <div class="field"><label>Nome</label><input type="text" id="pz-nome" placeholder="Ex.: Financiamento do carro" value="${editing ? editing.nome : ''}" /></div>
      <div class="field-row">
        <div class="field"><label>Tipo</label><select id="pz-tipo">${PARCELAMENTO_TIPOS.map((t) => `<option value="${t}" ${editing && editing.tipo === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
        <div class="field"><label>Sistema</label><select id="pz-sistema">
          <option value="price" ${!editing || editing.sistema === 'price' ? 'selected' : ''}>Price (parcela fixa)</option>
          <option value="sac" ${editing && editing.sistema === 'sac' ? 'selected' : ''}>SAC (amortização constante)</option>
        </select></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Categoria (opcional)</label>${fieldHTML({ key: 'pz-categoria', type: 'select-category' }, editing ? editing.categoryId : '')}</div>
        <div class="field"><label>Banco (origem do recurso)</label>${fieldHTML({ key: 'pz-banco', type: 'select-bank' }, editing ? editing.bankId : '')}</div>
      </div>
      <div class="field-row">
        <div class="field"><label>Data da contratação</label><input type="date" id="pz-data-contratacao" value="${editing ? editing.dataContratacao : todayISO()}" /></div>
        <div class="field"><label>Primeira parcela</label><input type="date" id="pz-primeira-parcela" value="${editing ? editing.primeiraParcela || '' : ''}" /></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Valor principal</label><input type="number" step="0.01" id="pz-valor" placeholder="0,00" value="${editing ? editing.valorPrincipal : ''}" /></div>
        <div class="field"><label>Quantidade de parcelas</label><input type="number" min="1" id="pz-parcelas" value="${editing ? editing.numParcelas : ''}" /></div>
      </div>
      <div class="field"><label>Taxa de juros mensal (%)</label><input type="number" step="0.01" id="pz-taxa" value="${editing ? editing.taxaJurosMensal : '0'}" /></div>
      <div class="field"><label>Observação</label><textarea id="pz-obs" placeholder="Opcional">${editing ? (editing.observacao || '') : ''}</textarea></div>
      <div class="modal-actions">
        <button class="btn btn-ghost btn-sm" id="modal-cancel">Cancelar</button>
        <button class="btn btn-primary btn-sm" id="modal-confirm">${editing ? 'Salvar alterações' : 'Criar contrato'}</button>
      </div>
    </div>
  `;
  overlay.classList.add('open');
  wireQuickAddButtons([{ key: 'pz-categoria', type: 'select-category' }, { key: 'pz-banco', type: 'select-bank' }]);
  overlay.querySelector('#modal-cancel').onclick = () => overlay.classList.remove('open');
  overlay.querySelector('#modal-confirm').onclick = () => {
    const nome = document.getElementById('pz-nome').value.trim();
    const valorPrincipal = parseFloat(document.getElementById('pz-valor').value) || 0;
    const numParcelas = parseInt(document.getElementById('pz-parcelas').value, 10) || 0;
    if (!nome) { toast('Informe o nome do contrato', 'danger'); return; }
    if (!valorPrincipal) { toast('Informe o valor principal', 'danger'); return; }
    if (!numParcelas || numParcelas < 1) { toast('Informe a quantidade de parcelas', 'danger'); return; }
    const payload = {
      nome, valorPrincipal, numParcelas,
      tipo: document.getElementById('pz-tipo').value,
      sistema: document.getElementById('pz-sistema').value,
      categoryId: document.getElementById('f-pz-categoria').value,
      bankId: document.getElementById('f-pz-banco').value,
      dataContratacao: document.getElementById('pz-data-contratacao').value,
      primeiraParcela: document.getElementById('pz-primeira-parcela').value || document.getElementById('pz-data-contratacao').value,
      taxaJurosMensal: parseFloat(document.getElementById('pz-taxa').value) || 0,
      observacao: document.getElementById('pz-obs').value,
    };
    if (editing) { Store.update('parcelamentos', editing.id, payload); toast('Contrato atualizado', 'success'); }
    else { Store.add('parcelamentos', payload); toast('Contrato criado', 'success'); }
    overlay.classList.remove('open');
    onSaved();
  };
}

/* =========================================================================
   PLACEHOLDERS — telas que ainda vão ser desenhadas a partir dos próximos prints
   ========================================================================= */
function pagePlaceholder(container, route) {
  const item = navItemByRoute(route);
  container.innerHTML = `
    <div class="panel placeholder-page">
      ${icon('layers')}
      <h2>${item.label} chega em breve</h2>
      <p>Essa tela ainda não foi desenhada — manda o print de referência dessa parte do sistema que eu monto igual ao resto do Fin360.</p>
    </div>
  `;
}

/* =========================================================================
   IA — telas desenhadas mas desativadas (Importar / Assistente IA)
   ========================================================================= */
function iaBanner() {
  return `
    <div class="panel" style="border-color:var(--primary);background:var(--primary-soft);display:flex;align-items:center;gap:12px">
      <span style="color:var(--primary)">${icon('lock')}</span>
      <div>
        <strong style="color:var(--text)">Recurso de IA — desativado por enquanto</strong>
        <div class="row-sub">A tela já está pronta, mas a inteligência artificial só é ligada quando você decidir ativar. Por enquanto, cadastre tudo manualmente nas páginas de Gastos, Recebimentos e Cartões.</div>
      </div>
    </div>
  `;
}

function pageImportar(container) {
  container.innerHTML = `
    ${iaBanner()}
    <div class="panel" style="opacity:0.55;pointer-events:none">
      <h3 style="margin-bottom:14px">1. O que você quer importar?</h3>
      <div class="grid-2" style="margin-bottom:18px">
        <div class="panel" style="background:var(--bg-input);border-color:var(--primary)">
          <strong style="display:flex;align-items:center;gap:8px">${icon('list')} Extrato bancário</strong>
          <p class="row-sub" style="margin-top:6px">Receitas vão para "Recebimentos" e despesas para "Gastos variáveis"</p>
        </div>
        <div class="panel" style="background:var(--bg-input)">
          <strong style="display:flex;align-items:center;gap:8px">${icon('card')} Fatura de cartão</strong>
          <p class="row-sub" style="margin-top:6px">Lança no cartão escolhido</p>
        </div>
      </div>
      <div class="field"><label>${icon('bank')} Banco do extrato</label><select disabled><option>Selecione...</option></select></div>
      <p class="row-sub" style="margin:-8px 0 14px">Todos os lançamentos importados serão vinculados a este banco.</p>
      <div class="field"><label>Mês de referência do extrato</label><input type="month" disabled value="${currentMonthStr()}" /></div>
      <p class="row-sub" style="margin:-8px 0 18px">Todos os lançamentos serão fixados neste mês — preservamos o dia da movimentação, mas não saímos do mês selecionado.</p>

      <h3 style="margin-bottom:14px">2. Envie seu extrato (PDF, OFX, CSV ou TXT)</h3>
      <div style="border:2px dashed var(--border);border-radius:14px;padding:40px;text-align:center;color:var(--text-muted)">
        ${icon('upload', 'svg-icon')}
        <div style="margin-top:10px;font-weight:700;color:var(--text)">Clique para escolher PDF, OFX, CSV ou TXT</div>
        <div class="row-sub" style="margin-top:4px">OFX/CSV são mais precisos que PDF (vêm direto do banco)</div>
      </div>
      <button class="btn btn-primary btn-block" style="margin-top:18px" disabled>${icon('sparkles')} Processar extrato</button>

      <h3 style="margin:24px 0 12px">Histórico de importações</h3>
      <div class="empty-state"><span>Nenhuma importação no modo Pessoal ainda.</span></div>
    </div>
  `;
}

function pageAssistente(container) {
  container.innerHTML = `
    ${iaBanner()}
    <div class="panel" style="opacity:0.6;pointer-events:none">
      <div style="display:flex;gap:12px;margin-bottom:18px">
        <span style="width:40px;height:40px;border-radius:50%;background:var(--primary-soft);color:var(--primary);display:flex;align-items:center;justify-content:center;flex-shrink:0">${icon('sparkles')}</span>
        <div>
          <strong>Converse com o Assistente IA</strong>
          <div class="row-sub">Ex: "gere um PDF dos meus gastos do mês", "relatório dos recebimentos".</div>
        </div>
      </div>
      <div class="panel" style="background:var(--bg-input)">
        Olá! Sou o <strong>Assistente IA</strong> do Fin360. Quando esse recurso for ativado, vou poder analisar seus dados, dar orientações e gerar relatórios em PDF sob demanda.
      </div>
    </div>
    <div class="panel" style="opacity:0.6;pointer-events:none;display:flex;gap:10px">
      <input type="text" placeholder="Pergunte ou peça um relatório (ex: gere PDF dos gastos do mês)" disabled style="flex:1" />
      <button class="btn-icon" disabled>${icon('mic')}</button>
      <button class="btn btn-primary" disabled>${icon('send')} Enviar</button>
    </div>
  `;
}

/* =========================================================================
   CONFIGURAÇÕES
   ========================================================================= */
function pageConfiguracoes(container) {
  const draw = () => {
    const p = Store.state.profile;
    container.innerHTML = `
      <div class="panel">
        <h3 style="margin-bottom:16px">${icon('grid')} Perfil</h3>
        <div style="display:flex;gap:24px;flex-wrap:wrap">
          <div style="position:relative;width:88px;height:88px;flex-shrink:0">
            <div style="width:88px;height:88px;border-radius:50%;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:800">${(p.name || 'M').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}</div>
            <button class="btn-icon" id="cfg-avatar-btn" style="position:absolute;bottom:0;right:0;background:var(--primary);color:#fff;border-color:var(--primary)" title="Upload de foto (em breve)">${icon('camera')}</button>
          </div>
          <div style="flex:1;min-width:260px">
            <div class="field"><label>Email</label><input type="text" id="cfg-email" value="${p.email || ''}" disabled /></div>
            <div class="field"><label>Nome</label><input type="text" id="cfg-nome" value="${p.name || ''}" /></div>
            <button class="btn btn-primary btn-sm" id="cfg-save-nome">Salvar nome</button>
          </div>
        </div>
      </div>

      <div class="panel">
        <h3 style="margin-bottom:16px">${icon('lock')} Alterar senha</h3>
        <div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap">
          <div class="field" style="flex:1;min-width:220px;margin-bottom:0"><label>Nova senha</label><input type="password" id="cfg-senha" placeholder="mínimo 6 caracteres" /></div>
          <button class="btn btn-primary btn-sm" id="cfg-save-senha">Alterar senha</button>
        </div>
        <p class="row-sub" style="margin-top:10px">Este protótipo ainda não tem sistema de login real — este campo fica pronto para quando o backend for ligado.</p>
      </div>

      <div class="panel">
        <h3 style="margin-bottom:10px">${icon('wallet')} Moeda da conta</h3>
        <p class="row-sub" style="margin-bottom:14px">Escolha a moeda exibida em todo o sistema (dashboards, gráficos, tabelas, relatórios e formulários). Os valores já cadastrados <strong style="color:var(--text)">não são convertidos</strong> — apenas o símbolo monetário muda.</p>
        <div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap">
          <div class="field" style="min-width:260px;margin-bottom:0"><label>Moeda</label>
            <select id="cfg-moeda">
              <option value="BRL" ${p.currency === 'BRL' ? 'selected' : ''}>Real Brasileiro (BRL - R$)</option>
              <option value="USD" ${p.currency === 'USD' ? 'selected' : ''}>Dólar Americano (USD - $)</option>
              <option value="EUR" ${p.currency === 'EUR' ? 'selected' : ''}>Euro (EUR - €)</option>
              <option value="GBP" ${p.currency === 'GBP' ? 'selected' : ''}>Libra Esterlina (GBP - £)</option>
            </select>
          </div>
          <button class="btn btn-primary btn-sm" id="cfg-save-moeda">Salvar configurações</button>
        </div>
      </div>

      <div class="panel">
        <h3 style="margin-bottom:10px">${icon('logout')} Sessão</h3>
        <p class="row-sub" style="margin-bottom:14px">Encerre sua sessão neste dispositivo.</p>
        <button class="btn btn-danger-ghost btn-sm" id="cfg-logout">Sair da conta</button>
      </div>

      <div class="panel">
        <h3 style="margin-bottom:10px">${icon('download')} Backup</h3>
        <p class="row-sub" style="margin-bottom:14px">Exporte um arquivo com todos os seus dados (bancos, cartões, lançamentos, categorias, metas etc.) ou restaure um backup anterior.</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn btn-primary btn-sm" id="cfg-export">${icon('download')} Exportar Backup</button>
          <button class="btn btn-ghost btn-sm" id="cfg-import-btn">${icon('upload')} Importar Backup</button>
          <input type="file" id="cfg-import-file" accept="application/json" style="display:none" />
        </div>
      </div>

      <div class="panel" style="border-color:var(--danger)">
        <h3 style="margin-bottom:10px;color:var(--danger)">${icon('alertTriangle')} Zona de risco</h3>
        <p class="row-sub" style="margin-bottom:14px">Apague todos os dados financeiros e comece do zero. Seu perfil e categorias permanecem intactos — apenas transações, bancos, cartões, metas e demais dados são removidos.</p>
        <button class="btn btn-danger-ghost btn-sm" id="cfg-reset">${icon('trash')} Começar do zero</button>
      </div>
    `;

    document.getElementById('cfg-avatar-btn').onclick = () => toast('Upload de foto chega em breve', 'info');
    document.getElementById('cfg-save-nome').onclick = () => {
      const nome = document.getElementById('cfg-nome').value.trim();
      if (!nome) { toast('Informe um nome', 'danger'); return; }
      Store.state.profile.name = nome;
      Store.save();
      toast('Nome atualizado', 'success');
      render();
    };
    document.getElementById('cfg-save-senha').onclick = () => {
      const senha = document.getElementById('cfg-senha').value;
      if (senha.length < 6) { toast('A senha precisa ter no mínimo 6 caracteres', 'danger'); return; }
      toast('Senha alterada (simulado — sem backend real ainda)', 'success');
      document.getElementById('cfg-senha').value = '';
    };
    document.getElementById('cfg-save-moeda').onclick = () => {
      Store.state.profile.currency = document.getElementById('cfg-moeda').value;
      Store.save();
      toast('Moeda atualizada', 'success');
      render();
    };
    document.getElementById('cfg-logout').onclick = () => toast('Este protótipo ainda não tem login real para encerrar sessão', 'info');

    document.getElementById('cfg-export').onclick = () => {
      const blob = new Blob([Store.exportBackupJSON()], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `fin360-backup-${todayISO()}.json`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast('Backup exportado', 'success');
    };
    document.getElementById('cfg-import-btn').onclick = () => document.getElementById('cfg-import-file').click();
    document.getElementById('cfg-import-file').onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          Store.importBackupJSON(reader.result);
          toast('Backup importado com sucesso', 'success');
          render();
        } catch (err) {
          toast('Arquivo de backup inválido', 'danger');
        }
      };
      reader.readAsText(file);
    };

    document.getElementById('cfg-reset').onclick = () => {
      confirmModal({
        title: 'Começar do zero', text: 'Isso apaga TODOS os dados financeiros (bancos, cartões, gastos, recebimentos, metas etc.). Seu perfil e categorias continuam. Essa ação não pode ser desfeita.', confirmLabel: 'Apagar tudo', danger: true,
        onConfirm: () => { Store.resetFinancialData(); toast('Dados financeiros zerados', 'success'); goRoute('dashboard'); },
      });
    };
  };
  draw();
}

