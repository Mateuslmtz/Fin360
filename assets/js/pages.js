/* Fin360 — páginas da aplicação */

function goRoute(route) { location.hash = '#/' + route; }

function addDaysISO(iso, n) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
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
    const receb = Store.state.recebimentos.filter((r) => months.includes(r.data.slice(0, 7)));
    const faturaCartoes = months.reduce((s, m) => s + allCartoesFaturaForMonth(m), 0);

    const totalGastos = fixos.reduce((s, g) => s + g.valor, 0) + variaveis.reduce((s, g) => s + g.valor, 0) + faturaCartoes;
    const totalRecebimentos = receb.reduce((s, r) => s + r.valor, 0);
    const totalAReceber = receb.filter((r) => r.status !== 'recebido').reduce((s, r) => s + r.valor, 0);
    const totalPago = fixos.filter((g) => g.pago).reduce((s, g) => s + g.valor, 0) + variaveis.filter((g) => g.status === 'pago').reduce((s, g) => s + g.valor, 0);
    const faltaPagar = totalGastos - totalPago;
    const saldoBancos = Store.state.banks.reduce((s, b) => s + (b.balance || 0), 0);
    const saldoDisponivel = saldoBancos + receb.filter((r) => r.status === 'recebido').reduce((s, r) => s + r.valor, 0) - totalPago;

    const allTx = [
      ...fixos.map((g) => ({ ...g, label: g.nome, date: g.vencimentoISO, kind: 'gasto' })),
      ...variaveis.map((g) => ({ ...g, label: g.descricao, date: g.data, kind: 'gasto' })),
      ...receb.map((r) => ({ ...r, label: r.descricao, date: r.data, kind: 'receb' })),
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
  const receitasDia = days.map((d) => Store.state.recebimentos.filter((r) => r.data === d).reduce((s, r) => s + r.valor, 0));
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
          <span>${c.emoji || '🐷'} ${c.nome}</span>
          <span class="row-sub">${pct}% do objetivo</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:6px">
          <strong>${formatCurrency(c.atual)}</strong><span class="row-sub">de ${formatCurrency(c.meta)}</span>
        </div>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
      </div>`;
  }).join('');
}
function investMini(list) {
  return `<table class="list-table"><tbody>${list.map((i) => `
    <tr><td><div class="row-title">${i.nome}</div><div class="row-sub">${i.tipo}</div></td>
    <td style="text-align:right">${formatCurrency(i.valor)}</td></tr>`).join('')}</tbody></table>`;
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
    const ganhos = Store.state.recebimentos.filter((r) => isSameMonth(r.data, mStr)).reduce((s, r) => s + r.valor, 0);
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
    const receb = Store.state.recebimentos.map((r) => ({ ...r, label: r.descricao, date: r.data, kind: 'receber' }));

    const paraPagar = gastos.filter((g) => g.status !== 'pago' && isInResumoPeriod(g.date, period));
    const paraReceber = receb.filter((r) => r.status !== 'recebido' && isInResumoPeriod(r.date, period));
    const concluidas = [...gastos.filter((g) => g.status === 'pago'), ...receb.filter((r) => r.status === 'recebido')]
      .filter((t) => isInResumoPeriod(t.date, period)).sort((a, b) => (a.date < b.date ? 1 : -1));

    const totalReceber = paraReceber.reduce((s, r) => s + r.valor, 0);
    const totalPagar = paraPagar.reduce((s, g) => s + g.valor, 0);
    const saldoBancos = Store.state.banks.reduce((s, b) => s + (b.balance || 0), 0);
    const recebidoHoje = receb.filter((r) => r.status === 'recebido' && r.data === today).reduce((s, r) => s + r.valor, 0);
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
function pageBancos(container) {
  genericCrudPage(container, {
    collection: 'banks', icon: 'bank',
    formTitle: 'Novo banco / conta', submitLabel: 'Salvar banco',
    singular: 'Banco', singularLower: 'banco',
    listTitle: 'Seus bancos e contas', listSubtitle: 'Saldos usados no cálculo do saldo disponível.',
    emptyTitle: 'Nenhum banco cadastrado', emptyText: 'Adicione um banco para registrar gastos, recebimentos e seu saldo real.',
    fields: [
      { key: 'name', label: 'Nome', type: 'text', required: true, placeholder: 'Ex.: Nubank' },
      { key: 'balance', label: 'Saldo inicial', type: 'number', required: false },
    ],
    statsFn: (items) => [{ label: 'Saldo total', value: formatCurrency(items.reduce((s, b) => s + (b.balance || 0), 0)), tone: 'blue', iconName: 'wallet' }, { label: 'Contas cadastradas', value: items.length, tone: 'purple', iconName: 'bank' }],
    renderList: (items) => `<table class="list-table"><tbody>${items.map((b) => `
      <tr><td><div class="row-title">${icon('bank')} ${b.name}</div></td><td style="text-align:right"><strong>${formatCurrency(b.balance || 0)}</strong></td>
      <td><div class="row-actions"><button class="btn-icon" data-action="edit" data-id="${b.id}">${icon('edit')}</button><button class="btn-icon" data-action="delete" data-id="${b.id}">${icon('trash')}</button></div></td></tr>`).join('')}</tbody></table>`,
  });
}

/* ---- Recebimentos ---- */
function pageRecebimentos(container) {
  genericCrudPage(container, {
    collection: 'recebimentos', icon: 'download',
    formTitle: 'Novo recebimento', submitLabel: 'Adicionar recebimento',
    singular: 'Recebimento', singularLower: 'recebimento',
    listTitle: 'Recebimentos', listSubtitle: 'Salários, vendas e outras entradas.',
    emptyTitle: 'Nenhum recebimento cadastrado', emptyText: 'Registre entradas previstas ou já recebidas.',
    fields: [
      { key: 'descricao', label: 'Descrição', type: 'text', required: true, placeholder: 'Ex.: Salário' },
      { key: 'valor', label: 'Valor', type: 'number', required: true },
      { key: 'data', label: 'Data prevista', type: 'date', required: true },
      { key: 'categoryId', label: 'Categoria', type: 'select-category' },
      { key: 'bankId', label: 'Banco vinculado', type: 'select-bank', required: true },
      { key: 'status', label: 'Status', type: 'select', options: [{ value: 'pendente', label: 'Pendente' }, { value: 'recebido', label: 'Recebido' }] },
    ],
    statsFn: (items) => [
      { label: 'Total', value: formatCurrency(items.reduce((s, r) => s + r.valor, 0)), tone: 'blue', iconName: 'wallet' },
      { label: 'Recebido', value: formatCurrency(items.filter((r) => r.status === 'recebido').reduce((s, r) => s + r.valor, 0)), tone: 'green', iconName: 'checkCircle' },
      { label: 'Pendente', value: formatCurrency(items.filter((r) => r.status !== 'recebido').reduce((s, r) => s + r.valor, 0)), tone: 'orange', iconName: 'alertTriangle' },
    ],
    renderList: (items) => `<table class="list-table"><thead><tr><th>Descrição</th><th>Categoria</th><th>Data</th><th>Valor</th><th>Status</th><th></th></tr></thead><tbody>${items.map((r) => `
      <tr><td class="row-title">${r.descricao}</td><td>${categoryTag(r.categoryId)}</td><td>${formatDateBR(r.data)}</td><td class="amount-pos">${formatCurrency(r.valor)}</td>
      <td><button class="badge ${r.status === 'recebido' ? 'badge-success' : 'badge-warning'}" style="border:none" data-action="toggle-receb" data-id="${r.id}">${r.status === 'recebido' ? 'Recebido' : 'Pendente'}</button></td>
      <td><div class="row-actions"><button class="btn-icon" data-action="edit" data-id="${r.id}">${icon('edit')}</button><button class="btn-icon" data-action="delete" data-id="${r.id}">${icon('trash')}</button></div></td></tr>`).join('')}</tbody></table>`,
    wireExtra: (container, draw) => container.querySelectorAll('[data-action="toggle-receb"]').forEach((b) => {
      b.onclick = () => {
        const item = Store.get('recebimentos', b.dataset.id);
        Store.update('recebimentos', b.dataset.id, { status: item.status === 'recebido' ? 'pendente' : 'recebido' });
        draw();
      };
    }),
  });
}

/* ---- Cofrinhos ---- */
function pageCofrinhos(container) {
  genericCrudPage(container, {
    collection: 'cofrinhos', icon: 'piggy',
    formTitle: 'Novo cofrinho', submitLabel: 'Criar cofrinho',
    singular: 'Cofrinho', singularLower: 'cofrinho',
    listTitle: 'Seus cofrinhos', listSubtitle: 'Reserva de emergência e metas de poupança.',
    emptyTitle: 'Nenhum cofrinho criado ainda', emptyText: 'Crie metas de economia, tipo "Viagem" ou "Reserva de emergência".',
    fields: [
      { key: 'nome', label: 'Nome da meta', type: 'text', required: true, placeholder: 'Ex.: Viagem' },
      { key: 'emoji', label: 'Emoji', type: 'emoji', default: '🐷' },
      { key: 'meta', label: 'Valor da meta', type: 'number', required: true },
      { key: 'atual', label: 'Valor já guardado', type: 'number' },
    ],
    renderList: (items) => `<div>${cofrinhosFullList(items)}</div>`,
  });
}
function cofrinhosFullList(items) {
  return items.map((c) => {
    const pct = c.meta > 0 ? Math.min(100, Math.round((c.atual / c.meta) * 100)) : 0;
    return `
      <div class="panel" style="background:var(--bg-input);margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <strong>${c.emoji || '🐷'} ${c.nome}</strong>
          <div class="row-actions"><button class="btn-icon" data-action="edit" data-id="${c.id}">${icon('edit')}</button><button class="btn-icon" data-action="delete" data-id="${c.id}">${icon('trash')}</button></div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:6px"><strong>${formatCurrency(c.atual)}</strong><span class="row-sub">de ${formatCurrency(c.meta)} · ${pct}%</span></div>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
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
function pageInvestimentos(container) {
  genericCrudPage(container, {
    collection: 'investimentos', icon: 'trendUp',
    formTitle: 'Novo investimento', submitLabel: 'Adicionar investimento',
    singular: 'Investimento', singularLower: 'investimento',
    listTitle: 'Carteira de investimentos', listSubtitle: 'Aportes registrados manualmente.',
    emptyTitle: 'Você ainda não tem investimentos cadastrados', emptyText: 'Registre seus aportes para acompanhar a evolução do patrimônio.',
    fields: [
      { key: 'nome', label: 'Nome do ativo', type: 'text', required: true, placeholder: 'Ex.: Tesouro Selic' },
      { key: 'tipo', label: 'Tipo', type: 'select', options: [{ value: 'Renda Fixa', label: 'Renda Fixa' }, { value: 'Renda Variável', label: 'Renda Variável' }, { value: 'Fundos', label: 'Fundos' }, { value: 'Cripto', label: 'Cripto' }, { value: 'Outro', label: 'Outro' }] },
      { key: 'valor', label: 'Valor aportado', type: 'number', required: true },
      { key: 'data', label: 'Data do aporte', type: 'date' },
    ],
    statsFn: (items) => [{ label: 'Total investido', value: formatCurrency(items.reduce((s, i) => s + i.valor, 0)), tone: 'cyan', iconName: 'trendUp' }, { label: 'Ativos', value: items.length, tone: 'purple', iconName: 'layers' }],
    renderList: (items) => `<table class="list-table"><thead><tr><th>Ativo</th><th>Tipo</th><th>Data</th><th>Valor</th><th></th></tr></thead><tbody>${items.map((i) => `
      <tr><td class="row-title">${i.nome}</td><td>${i.tipo || '—'}</td><td>${formatDateBR(i.data)}</td><td><strong>${formatCurrency(i.valor)}</strong></td>
      <td><div class="row-actions"><button class="btn-icon" data-action="edit" data-id="${i.id}">${icon('edit')}</button><button class="btn-icon" data-action="delete" data-id="${i.id}">${icon('trash')}</button></div></td></tr>`).join('')}</tbody></table>`,
  });
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

