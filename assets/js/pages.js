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

const MONTH_NAMES_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/* fecha qualquer dropdown aberto ao clicar fora dele */
document.addEventListener('click', () => {
  document.querySelectorAll('.dropdown.open').forEach((d) => d.classList.remove('open'));
});

function wireDropdownToggle(ddEl) {
  if (!ddEl) return;
  const trigger = ddEl.querySelector('.dropdown-trigger');
  trigger.onclick = (e) => {
    e.stopPropagation();
    const wasOpen = ddEl.classList.contains('open');
    document.querySelectorAll('.dropdown.open').forEach((d) => d.classList.remove('open'));
    if (!wasOpen) ddEl.classList.add('open');
  };
}

function paintMonthPanel(panel, browseYear, period, onChange) {
  const selYear = period.type === 'month' && period.value ? Number(period.value.slice(0, 4)) : null;
  const selMonth = period.type === 'month' && period.value ? Number(period.value.slice(5, 7)) : null;
  panel.innerHTML = `
    <div class="picker-head">
      <button type="button" class="picker-nav" data-nav="prev">${icon('chevronDown', 'chevron-prev')}</button>
      <strong>${browseYear}</strong>
      <button type="button" class="picker-nav" data-nav="next">${icon('chevronDown', 'chevron-next')}</button>
    </div>
    <div class="month-grid">
      ${MONTH_NAMES_SHORT.map((name, i) => {
        const m = i + 1;
        const active = selYear === browseYear && selMonth === m;
        return `<button type="button" class="month-cell ${active ? 'active' : ''}" data-month="${String(m).padStart(2, '0')}">${name}</button>`;
      }).join('')}
    </div>
  `;
  panel.querySelector('[data-nav="prev"]').onclick = (e) => { e.stopPropagation(); paintMonthPanel(panel, browseYear - 1, period, onChange); };
  panel.querySelector('[data-nav="next"]').onclick = (e) => { e.stopPropagation(); paintMonthPanel(panel, browseYear + 1, period, onChange); };
  panel.querySelectorAll('.month-cell').forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      period.type = 'month';
      period.value = `${browseYear}-${btn.dataset.month}`;
      onChange();
    };
  });
}

function paintYearPanel(panel, browseYear, period, onChange) {
  const selYear = period.type === 'year' ? Number(period.value) : null;
  const start = browseYear - 5;
  const years = Array.from({ length: 8 }, (_, i) => start + i);
  panel.innerHTML = `
    <div class="picker-head">
      <button type="button" class="picker-nav" data-nav="prev">${icon('chevronDown', 'chevron-prev')}</button>
      <span class="picker-title">Selecionar ano</span>
      <button type="button" class="picker-nav" data-nav="next">${icon('chevronDown', 'chevron-next')}</button>
    </div>
    <div class="year-grid">
      ${years.map((y) => `<button type="button" class="year-cell ${y === selYear ? 'active' : ''}" data-year="${y}">${y}</button>`).join('')}
    </div>
  `;
  panel.querySelector('[data-nav="prev"]').onclick = (e) => { e.stopPropagation(); paintYearPanel(panel, browseYear - 8, period, onChange); };
  panel.querySelector('[data-nav="next"]').onclick = (e) => { e.stopPropagation(); paintYearPanel(panel, browseYear + 8, period, onChange); };
  panel.querySelectorAll('.year-cell').forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      period.type = 'year';
      period.value = btn.dataset.year;
      onChange();
    };
  });
}

function renderPeriodControl(prefix, period) {
  const isThisMonth = period.type === 'month' && (period.value || currentMonthStr()) === currentMonthStr();
  const isCustomMonth = period.type === 'month' && !isThisMonth;
  const isYear = period.type === 'year';
  return `
    <div class="pill-group" id="${prefix}-period-group">
      <button type="button" class="pill ${isThisMonth ? 'active' : ''}" data-mode="thismonth">Este mês</button>
      <div class="dropdown" id="${prefix}-month-dd">
        <button type="button" class="pill dropdown-trigger ${isCustomMonth ? 'active' : ''}">${icon('calendar')} Escolher mês</button>
        <div class="dropdown-panel" id="${prefix}-month-panel"></div>
      </div>
      <div class="dropdown" id="${prefix}-year-dd">
        <button type="button" class="pill dropdown-trigger ${isYear ? 'active' : ''}">${icon('calendar')} Ano</button>
        <div class="dropdown-panel" id="${prefix}-year-panel"></div>
      </div>
    </div>
  `;
}
/* ============ Mini filtro de ordenação (data/valor, crescente/decrescente) — seta clicável no cabeçalho da coluna ============ */
function sortableThHTML(label, field, currentSort, extraStyle) {
  const [campo, dir] = (currentSort || '').split('-');
  const active = campo === field;
  const rotate = active && dir === 'asc' ? 180 : 0;
  return `<th class="sortable-th" data-sort-field="${field}"${extraStyle ? ` style="${extraStyle}"` : ''}>${label}<span style="display:inline-block;transform:rotate(${rotate}deg);opacity:${active ? 1 : 0.35}">${icon('chevronDown')}</span></th>`;
}
function wireSortableHeaders(container, getSort, setSort, redraw) {
  container.querySelectorAll('.sortable-th').forEach((th) => {
    th.onclick = () => {
      const field = th.dataset.sortField;
      const [campo, dir] = (getSort() || '').split('-');
      setSort(campo === field ? `${field}-${dir === 'asc' ? 'desc' : 'asc'}` : `${field}-desc`);
      redraw();
    };
  });
}
function sortList(list, sortKey, getDate, getValor) {
  const [campo, dir] = (sortKey || 'data-desc').split('-');
  const mul = dir === 'asc' ? 1 : -1;
  return [...list].sort((a, b) => {
    if (campo === 'valor') return (getValor(a) - getValor(b)) * mul;
    const da = getDate(a), db = getDate(b);
    return (da < db ? -1 : da > db ? 1 : 0) * mul;
  });
}
function wirePeriodControl(prefix, period, onChange) {
  const group = document.getElementById(`${prefix}-period-group`);
  if (!group) return;
  group.querySelector('[data-mode="thismonth"]').onclick = () => { period.type = 'month'; period.value = currentMonthStr(); onChange(); };

  const monthDD = document.getElementById(`${prefix}-month-dd`);
  const yearDD = document.getElementById(`${prefix}-year-dd`);
  wireDropdownToggle(monthDD);
  wireDropdownToggle(yearDD);

  const monthBrowseYear = period.type === 'month' && period.value ? Number(period.value.slice(0, 4)) : new Date().getFullYear();
  const yearBrowseYear = period.type === 'year' && period.value ? Number(period.value) : new Date().getFullYear();
  paintMonthPanel(document.getElementById(`${prefix}-month-panel`), monthBrowseYear, period, onChange);
  paintYearPanel(document.getElementById(`${prefix}-year-panel`), yearBrowseYear, period, onChange);
}

/* ============ generic field rendering for simple CRUD pages ============ */
function fieldHTML(field, value) {
  const id = `f-${field.key}`;
  switch (field.type) {
    case 'number':
      return moneyInputHTML(id, value, field.placeholder);
    case 'date':
      return `<input type="date" id="${id}" value="${value || todayISO()}" />`;
    case 'textarea':
      return `<textarea id="${id}" placeholder="${field.placeholder || ''}">${value || ''}</textarea>`;
    case 'select-category':
      return `<div class="input-with-btn"><select id="${id}" ${field.optional ? '' : 'required'}>${categoryOptions(value, field.catTipo)}</select><button type="button" class="btn-add-new" id="${id}-add" title="Nova categoria">+ Nova</button></div>`;
    case 'select-bank':
      return `<div class="input-with-btn"><select id="${id}">${bankOptions(value)}</select><button type="button" class="btn-add-new" id="${id}-add" title="Novo banco">+ Novo</button></div>`;
    case 'select':
      return `<select id="${id}">${field.options.map((o) => `<option value="${o.value}" ${o.value === value ? 'selected' : ''}>${o.label}</option>`).join('')}</select>`;
    case 'checkbox':
      return `<label class="checkbox-row"><input type="checkbox" id="${id}" ${value ? 'checked' : ''} /> ${field.label}</label>`;
    case 'emoji':
      return renderEmojiPicker(id, value);
    default:
      return `<input type="text" id="${id}" value="${value || ''}" placeholder="${field.placeholder || ''}" />`;
  }
}
function readField(field) {
  const el = document.getElementById(`f-${field.key}`);
  if (!el) return undefined;
  if (field.type === 'number') return moneyValue(`f-${field.key}`);
  if (field.type === 'checkbox') return el.checked;
  return el.value;
}
function wireQuickAddButtons(fields) {
  fields.forEach((f) => {
    if (f.type === 'select-category') {
      const btn = document.getElementById(`f-${f.key}-add`);
      if (btn) btn.onclick = () => quickAddCategory((id) => { document.getElementById(`f-${f.key}`).innerHTML = categoryOptions(id, f.catTipo); }, f.catTipo);
    }
    if (f.type === 'select-bank') {
      const btn = document.getElementById(`f-${f.key}-add`);
      if (btn) btn.onclick = () => quickAddBank((id) => { document.getElementById(`f-${f.key}`).innerHTML = bankOptions(id); });
    }
  });
}

let catBoxOpenState = {};
let editingCategoryId = null;

function categoryListHTML(tipo) {
  const list = Store.state.categories.filter((c) => (c.tipo || 'despesa') === tipo);
  if (!list.length) return `<div class="row-sub" style="padding:10px 0">Nenhuma categoria cadastrada ainda.</div>`;
  return `
    <div class="cat-list-title">Categorias existentes</div>
    <div class="cat-list-scroll">
      ${list.map((c) => `
        <div class="cat-list-row" draggable="true" data-id="${c.id}">
          <span class="cat-drag-handle">${icon('gripVertical')}</span>
          <span class="cat-list-name">${c.emoji} ${c.name}</span>
          <div class="row-actions">
            <button type="button" class="btn-icon" data-action="edit-cat" data-id="${c.id}">${icon('edit')}</button>
            <button type="button" class="btn-icon" data-action="delete-cat" data-id="${c.id}">${icon('trash')}</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}
// arrastar uma linha e soltar em cima de outra move ela pra posição da alvo — a ordem aqui é a mesma usada
// em todas as listas suspensas de categoria do app (ver categoryOptions)
function wireCategoryDragDrop(scopeEl, onChange) {
  let draggedId = null;
  scopeEl.querySelectorAll('.cat-list-row').forEach((row) => {
    row.addEventListener('dragstart', () => {
      draggedId = row.dataset.id;
      row.classList.add('dragging');
    });
    row.addEventListener('dragend', () => row.classList.remove('dragging'));
    row.addEventListener('dragover', (e) => {
      e.preventDefault();
      row.classList.add('drag-over');
    });
    row.addEventListener('dragleave', () => row.classList.remove('drag-over'));
    row.addEventListener('drop', (e) => {
      e.preventDefault();
      row.classList.remove('drag-over');
      const targetId = row.dataset.id;
      if (draggedId && targetId && draggedId !== targetId) {
        Store.reorderCategories(draggedId, targetId);
        onChange();
      }
    });
  });
}
function collapsibleNewCategory(prefix, opts) {
  opts = opts || {};
  const isOpen = !!catBoxOpenState[prefix];
  const editingCat = isOpen && editingCategoryId ? Store.categoryById(editingCategoryId) : null;
  return `
    <button type="button" class="btn btn-ghost btn-block" id="${prefix}-toggle-cat" style="justify-content:space-between">
      <span class="btn-toggle-label">${icon('plus')} Nova categoria</span>${icon('chevronDown')}
    </button>
    <div id="${prefix}-newcat-box" style="display:${isOpen ? 'block' : 'none'};margin-top:10px;padding:12px;border:1px solid var(--border);border-radius:10px;background:var(--bg-input)">
      <div class="field-row">
        <div class="field"><label>Nome</label><input type="text" id="${prefix}-nc-name" placeholder="Ex.: Pet" value="${editingCat ? editingCat.name : ''}" /></div>
        <div class="field"><label>Emoji</label>${renderEmojiPicker(`${prefix}-nc-emoji`, editingCat ? editingCat.emoji : '🏷️')}</div>
      </div>
      <button type="button" class="btn btn-primary btn-sm btn-block" id="${prefix}-nc-add">${editingCat ? 'Salvar alterações' : 'Adicionar categoria'}</button>
      ${opts.showList ? categoryListHTML(opts.catTipo || 'despesa') : ''}
    </div>
  `;
}
function wireCollapsibleNewCategory(prefix, onChange, opts) {
  opts = opts || {};
  const tipo = opts.catTipo || 'despesa';
  const toggle = document.getElementById(`${prefix}-toggle-cat`);
  const box = document.getElementById(`${prefix}-newcat-box`);
  if (!toggle) return;
  toggle.onclick = () => {
    catBoxOpenState[prefix] = !catBoxOpenState[prefix];
    if (!catBoxOpenState[prefix]) editingCategoryId = null;
    box.style.display = catBoxOpenState[prefix] ? 'block' : 'none';
  };
  wireEmojiPicker(`${prefix}-nc-emoji`);
  document.getElementById(`${prefix}-nc-add`).onclick = () => {
    const name = document.getElementById(`${prefix}-nc-name`).value.trim();
    if (!name) { toast('Dê um nome para a categoria', 'danger'); return; }
    const emoji = document.getElementById(`${prefix}-nc-emoji`).value || '🏷️';
    if (editingCategoryId) {
      Store.update('categories', editingCategoryId, { name, emoji });
      toast('Categoria atualizada', 'success');
      editingCategoryId = null;
      onChange && onChange();
    } else {
      const cat = Store.add('categories', { name, emoji, color: nextCategoryColor(), tipo });
      toast('Categoria adicionada', 'success');
      onChange && onChange(cat.id);
    }
  };
  if (opts.showList) {
    box.querySelectorAll('[data-action="edit-cat"]').forEach((b) => b.onclick = () => {
      editingCategoryId = b.dataset.id;
      onChange && onChange();
    });
    box.querySelectorAll('[data-action="delete-cat"]').forEach((b) => b.onclick = () => {
      confirmModal({
        title: 'Excluir categoria', text: 'Lançamentos que já usam essa categoria ficarão sem categoria. Deseja continuar?', confirmLabel: 'Excluir', danger: true,
        onConfirm: () => { Store.remove('categories', b.dataset.id); toast('Categoria excluída', 'success'); onChange && onChange(); },
      });
    });
    wireCategoryDragDrop(box, () => onChange && onChange());
  }
}

/* ============ Pagamento de gasto fixo (banco usado + data + valor) ============ */
function payGastoFixoModal(gastoFixo, mStr, onConfirm) {
  const overlay = document.getElementById('modal-overlay');
  overlay.innerHTML = `
    <div class="modal-box">
      <h3>Pagar gasto fixo</h3>
      <p>Confirme banco, data e valor pago. O valor base do gasto fixo permanece intacto.</p>
      <div class="field">
        <label>Banco usado <span class="req">*</span></label>
        ${fieldHTML({ key: 'pg-banco', type: 'select-bank' }, gastoFixo.bankId)}
        <span class="row-sub" style="display:block;margin-top:6px">O valor será debitado deste banco e registrado no extrato.</span>
      </div>
      <div class="field"><label>Data do pagamento</label>${fieldHTML({ key: 'pg-data', type: 'date' }, todayISO())}</div>
      <div class="field">
        <label>Valor pago</label>
        ${fieldHTML({ key: 'pg-valor', type: 'number' }, gastoFixo.valor)}
        <span class="row-sub" style="display:block;margin-top:6px">Valor original: <strong>${formatCurrency(gastoFixo.valor)}</strong>. Alterar aqui afeta somente esta baixa — o lançamento original e as próximas competências mantêm o valor base.</span>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost btn-sm" id="modal-cancel">Cancelar</button>
        <button class="btn btn-success btn-sm" id="modal-confirm">Confirmar pagamento</button>
      </div>
    </div>
  `;
  overlay.classList.add('open');
  wireQuickAddButtons([{ key: 'pg-banco', type: 'select-bank' }]);
  overlay.querySelector('#modal-cancel').onclick = () => overlay.classList.remove('open');
  overlay.querySelector('#modal-confirm').onclick = () => {
    const bankId = document.getElementById('f-pg-banco').value;
    if (!bankId) { toast('Selecione o banco usado', 'danger'); return; }
    const data = document.getElementById('f-pg-data').value || todayISO();
    const valor = moneyValue('f-pg-valor') || gastoFixo.valor;
    payGastoFixo(gastoFixo.id, mStr, { bankId, data, valor });
    overlay.classList.remove('open');
    toast('Pagamento confirmado', 'success');
    onConfirm && onConfirm();
  };
}

function deleteGastoFixoModal(gastoFixo, mStr, onConfirm) {
  const overlay = document.getElementById('modal-overlay');
  overlay.innerHTML = `
    <div class="modal-box">
      <h3>Excluir gasto fixo</h3>
      <p>"${gastoFixo.nome}" aparece todo mês. Como deseja excluir? O histórico passado é sempre preservado.</p>
      <button type="button" class="choice-card" id="del-fixo-mes">
        <strong>Apenas este mês</strong>
        <span>Esconde a ocorrência somente do mês selecionado. Demais meses continuam.</span>
      </button>
      <button type="button" class="choice-card danger" id="del-fixo-diante">
        <strong>Deste mês em diante</strong>
        <span>Encerra o gasto fixo a partir deste mês. Meses anteriores ficam preservados.</span>
      </button>
      <div class="modal-actions">
        <button class="btn btn-ghost btn-sm" id="modal-cancel">Cancelar</button>
      </div>
    </div>
  `;
  overlay.classList.add('open');
  overlay.querySelector('#modal-cancel').onclick = () => overlay.classList.remove('open');
  overlay.querySelector('#del-fixo-mes').onclick = () => {
    deleteGastoFixoMes(gastoFixo.id, mStr);
    overlay.classList.remove('open');
    toast('Ocorrência removida deste mês', 'success');
    onConfirm && onConfirm();
  };
  overlay.querySelector('#del-fixo-diante').onclick = () => {
    endGastoFixoFromMonth(gastoFixo.id, mStr);
    overlay.classList.remove('open');
    toast('Gasto fixo encerrado a partir deste mês', 'success');
    onConfirm && onConfirm();
  };
}

function aplicarAlteracaoGastoFixoModal(gastoFixo, mStrReferencia, payload, onConfirm) {
  const overlay = document.getElementById('modal-overlay');
  overlay.innerHTML = `
    <div class="modal-box">
      <h3>Aplicar alteração</h3>
      <p>Você está alterando "${gastoFixo.nome}". Onde aplicar?</p>
      <button type="button" class="choice-card danger" id="apl-deste-mes">
        <strong>Deste mês em diante</strong>
        <span>Os meses anteriores mantêm o valor antigo. Este mês e os próximos passam a usar o novo valor.</span>
      </button>
      <button type="button" class="choice-card" id="apl-historico">
        <strong>Todo o histórico</strong>
        <span>Aplica o novo valor em todos os meses, inclusive nos passados que ainda não foram pagos.</span>
      </button>
      <div class="modal-actions">
        <button class="btn btn-ghost btn-sm" id="modal-cancel">Cancelar</button>
      </div>
    </div>
  `;
  overlay.classList.add('open');
  overlay.querySelector('#modal-cancel').onclick = () => overlay.classList.remove('open');
  overlay.querySelector('#apl-deste-mes').onclick = () => {
    updateGastoFixoComHistorico(gastoFixo.id, mStrReferencia, payload, 'deste-mes');
    overlay.classList.remove('open');
    toast('Alteração aplicada deste mês em diante', 'success');
    onConfirm && onConfirm();
  };
  overlay.querySelector('#apl-historico').onclick = () => {
    updateGastoFixoComHistorico(gastoFixo.id, mStrReferencia, payload, 'historico');
    overlay.classList.remove('open');
    toast('Alteração aplicada em todo o histórico', 'success');
    onConfirm && onConfirm();
  };
}

function wirePagoFixoActions(container, onChange) {
  container.querySelectorAll('[data-action="pay-fixo"]').forEach((b) => b.onclick = () => {
    const gastoFixo = Store.get('gastosFixos', b.dataset.id);
    payGastoFixoModal(gastoFixo, b.dataset.mes, onChange);
  });
  container.querySelectorAll('[data-action="reopen-fixo"]').forEach((b) => b.onclick = () => {
    reopenGastoFixo(b.dataset.id, b.dataset.mes);
    toast('Pagamento reaberto', 'success');
    onChange();
  });
}

/* =========================================================================
   DASHBOARD
   ========================================================================= */
let dashPeriod = { type: 'month', value: currentMonthStr() };
let dashBank = 'todos';

function monthsInPeriod(period) {
  if (period.type === 'year') return Array.from({ length: 12 }, (_, i) => `${period.value}-${String(i + 1).padStart(2, '0')}`);
  return [period.value || currentMonthStr()];
}

function renderBankFilter(prefix, bankId) {
  const banks = Store.state.banks;
  const selLabel = bankId === 'todos' ? 'Todos os bancos' : ((Store.bankById(bankId) || {}).name || 'Todos os bancos');
  return `
    <div class="dropdown" id="${prefix}-bank-dd">
      <button type="button" class="dropdown-trigger">
        ${icon('bank')}<span>${selLabel}</span>${icon('chevronDown', 'chevron')}
      </button>
      <div class="dropdown-panel bank-panel">
        <button type="button" class="bank-option ${bankId === 'todos' ? 'active' : ''}" data-bank="todos">Todos os bancos</button>
        ${banks.map((b, i) => `<button type="button" class="bank-option ${bankId === b.id ? 'active' : ''}" data-bank="${b.id}">${icon('bank')} ${i + 1} - ${b.name}</button>`).join('')}
      </div>
    </div>
  `;
}
function wireBankFilter(prefix, setBank, onChange) {
  const dd = document.getElementById(`${prefix}-bank-dd`);
  if (!dd) return;
  wireDropdownToggle(dd);
  dd.querySelectorAll('.bank-option').forEach((btn) => {
    btn.onclick = (e) => { e.stopPropagation(); setBank(btn.dataset.bank); onChange(); };
  });
}

function pageDashboard(container) {
  const draw = () => {
    const period = dashPeriod;
    const months = monthsInPeriod(period);
    const bankFilterOn = dashBank !== 'todos';
    const fixos = months.flatMap((m) => gastosFixosForMonth(m)).filter((g) => !bankFilterOn || g.bankId === dashBank);
    const variaveis = Store.state.gastosVariaveis.filter((g) => months.includes(g.data.slice(0, 7)) && (!bankFilterOn || g.bankId === dashBank));
    const receb = months.flatMap((m) => recebimentosForMonth(m)).filter((r) => !bankFilterOn || r.bankId === dashBank);
    const cartoesFiltrados = Store.state.cartoes.filter((c) => !bankFilterOn || c.bankId === dashBank);
    const custoRealCartoes = months.reduce((s, m) => s + cartoesFiltrados.reduce((s2, c) => s2 + cartaoCustoRealForMonth(c.id, m), 0), 0);
    // "pago" do cartão sempre pelo ciclo de fatura (caixa), já que é quando o dinheiro de fato sai do banco
    const custoRealCartoesPago = months.reduce((s, m) => s + cartoesFiltrados.filter((c) => isCartaoFaturaPaga(c.id, m)).reduce((s2, c) => s2 + cartaoCustoRealCaixaForMonth(c.id, m), 0), 0);

    const parcelasMes = months.reduce((s, m) => s + parcelamentoParcelasForMonth(m, bankFilterOn ? dashBank : null), 0);
    const parcelasPagasMes = months.reduce((s, m) => s + parcelamentoParcelasPagasForMonth(m, bankFilterOn ? dashBank : null), 0);
    const totalGastos = fixos.reduce((s, g) => s + g.valor, 0) + variaveis.reduce((s, g) => s + g.valor, 0) + custoRealCartoes + parcelasMes;
    // só o que de fato entrou — assim o card bate com o saldo disponível; o previsto vira legenda
    const totalRecebimentosLancado = receb.reduce((s, r) => s + r.valor, 0);
    const totalRecebimentos = receb.filter((r) => r.recebido).reduce((s, r) => s + r.valor, 0);
    const totalAReceber = receb.filter((r) => !r.recebido).reduce((s, r) => s + r.valor, 0);
    const totalPago = fixos.filter((g) => g.pago).reduce((s, g) => s + gastoFixoValorEfetivo(g), 0) + variaveis.filter((g) => g.status === 'pago').reduce((s, g) => s + g.valor, 0) + custoRealCartoesPago + parcelasPagasMes;
    const faltaPagar = totalGastos - totalPago;
    const saldoBancos = bankFilterOn ? ((Store.bankById(dashBank) || {}).balance || 0) : Store.state.banks.reduce((s, b) => s + (b.balance || 0), 0);
    // saldo do banco já é atualizado na hora (pagar/receber/reabrir), então "disponível" é sempre o valor real agora —
    // sem somar de novo os fluxos do período, senão conta em dobro e o saldo de um mês não carrega certinho pro seguinte.
    const saldoDisponivel = saldoBancos;
    // balanço já considerando as provisões (tudo que ainda falta receber/pagar até o fim do período selecionado)
    const saldoProjetado = saldoBancosNoFimDoMes(months[months.length - 1], bankFilterOn ? dashBank : null);

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
          <div class="period-toolbar">
            ${renderBankFilter('dash', dashBank)}
            ${renderPeriodControl('dash', period)}
          </div>
        </div>
      </div>

      <div class="stat-grid">
        ${statCard({ label: 'Total de gastos', value: formatCurrency(totalGastos), sub: `Fixos + variáveis + cartão + parcelamentos (cartão: sua parte, ${regimeGastoCartao() === 'competencia' ? 'por compra' : 'por fatura'})`, tone: 'red', iconName: 'arrowDownCircle' })}
        ${statCard({ label: 'Total de recebimentos', value: formatCurrency(totalRecebimentos), sub: `Já recebidos — de ${formatCurrency(totalRecebimentosLancado)} lançados`, tone: 'green', iconName: 'arrowUpCircle' })}
        ${statCard({ label: 'Total a receber', value: formatCurrency(totalAReceber), sub: 'Recebimentos futuros', tone: 'blue', iconName: 'download' })}
        ${statCard({ label: 'Total pago', value: formatCurrency(totalPago), sub: 'Despesas já quitadas', tone: 'purple', iconName: 'checkCircle' })}
        ${statCard({ label: 'Falta pagar', value: formatCurrency(faltaPagar), sub: 'Pendentes + fatura', tone: 'orange', iconName: 'alertTriangle' })}
        ${statCard({ label: 'Saldo disponível', value: formatCurrency(saldoDisponivel), sub: saldoDisponivel >= 0 ? 'Positivo' : 'Negativo', tone: 'cyan', iconName: 'wallet' })}
        ${statCard({ label: 'Balanço projetado', value: formatCurrency(saldoProjetado), sub: saldoProjetado >= 0 ? 'Após receber e pagar tudo do período' : 'Ficará negativo se nada mudar', tone: saldoProjetado >= 0 ? 'blue' : 'red', iconName: 'trendUp' })}
      </div>

      <div class="panel">
        <div class="panel-header"><div><h3>Evolução do saldo</h3><div class="panel-sub">Acumulado no período selecionado</div></div></div>
        ${period.type === 'month' ? areaChartHTML(period.value, saldoBancosNoFimDoMes(monthAddStr(period.value, -1), bankFilterOn ? dashBank : null), bankFilterOn ? dashBank : null) : emptyState({ iconName: 'trendUp', title: 'Selecione "Este mês" ou "Escolher mês" para ver a evolução diária.' })}
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
    wireBankFilter('dash', (id) => { dashBank = id; }, draw);
    document.getElementById('dash-year-select').onchange = (e) => { dashPeriod = { type: 'year', value: e.target.value }; draw(); };
    const go = (id, route) => { const el = document.getElementById(id); if (el) el.onclick = () => goRoute(route); };
    go('dash-add-fixo', 'gastos-fixos'); go('dash-go-cartoes', 'cartoes'); go('dash-add-cartao', 'cartoes');
    go('dash-go-cofrinhos', 'cofrinhos'); go('dash-add-cofrinho', 'cofrinhos');
    go('dash-go-investimentos', 'investimentos'); go('dash-add-investimento', 'investimentos');
    wirePagoFixoActions(container, draw);
  };
  draw();
}

function areaChartHTML(mStr, saldoInicial, bankId) {
  const [y, m] = mStr.split('-').map(Number);
  const nDays = daysInMonth(y, m - 1);
  const days = Array.from({ length: nDays }, (_, i) => `${mStr}-${String(i + 1).padStart(2, '0')}`);
  const despesasDia = new Array(nDays).fill(0);
  const receitasDia = new Array(nDays).fill(0);
  const add = (arr, iso, valor) => { const idx = days.indexOf(iso); if (idx > -1) arr[idx] += valor; };

  gastosFixosForMonth(mStr).filter((g) => !bankId || g.bankId === bankId).forEach((g) => add(despesasDia, g.vencimentoISO, g.valor));
  Store.state.gastosVariaveis.filter((g) => g.data.slice(0, 7) === mStr && (!bankId || g.bankId === bankId)).forEach((g) => add(despesasDia, g.data, g.valor));
  Store.state.cartoes.filter((c) => !bankId || c.bankId === bankId).forEach((c) => {
    const fatura = cartaoFaturaForMonth(c.id, mStr);
    if (fatura > 0) add(despesasDia, `${mStr}-${String(clampDayToMonth(mStr, c.diaVencimento)).padStart(2, '0')}`, fatura);
  });
  Store.state.parcelamentos.filter((p) => !bankId || p.bankId === bankId).forEach((p) => {
    parcelamentoSchedule(p).forEach((s) => {
      const venc = parcelamentoVencimento(p, s.numero);
      if (venc.slice(0, 7) === mStr) add(despesasDia, venc, s.valor);
    });
  });
  recebimentosForMonth(mStr).filter((r) => !bankId || r.bankId === bankId).forEach((r) => add(receitasDia, r.dataOcorrencia, r.valor));

  let acc = saldoInicial;
  const saldoDia = despesasDia.map((despesa, i) => { acc += receitasDia[i] - despesa; return acc; });

  if (despesasDia.every((v) => v === 0) && receitasDia.every((v) => v === 0)) {
    return emptyState({ iconName: 'trendUp', title: 'Sem movimentações no período.' });
  }

  const w = 1000, h = 300, padL = 56, padR = 10, padB = 26, padT = 14, barsH = 40, gapMid = 16;
  const mainBottom = h - padB - barsH - gapMid;
  const barsTop = mainBottom + gapMid;
  const barsBottom = h - padB;

  const maxVal = Math.max(...saldoDia, 0);
  const minVal = Math.min(...saldoDia, 0);
  const range = maxVal - minVal || 1;
  const x = (i) => padL + (i / (nDays - 1 || 1)) * (w - padL - padR);
  const y0 = (v) => padT + (1 - (v - minVal) / range) * (mainBottom - padT);
  const toPathRange = (arr, startIdx, endIdxExcl) => {
    const pts = [];
    for (let i = startIdx; i < endIdxExcl; i++) pts.push(`${i === startIdx ? 'M' : 'L'}${x(i).toFixed(1)},${y0(arr[i]).toFixed(1)}`);
    return pts.join(' ');
  };
  const saldoPath = toPathRange(saldoDia, 0, nDays);
  const areaPath = `${saldoPath} L${x(nDays - 1).toFixed(1)},${y0(minVal).toFixed(1)} L${x(0).toFixed(1)},${y0(minVal).toFixed(1)} Z`;
  const yTicks = [minVal, minVal + range / 2, maxVal];

  // hoje divide o mês em "realizado" (linha sólida) e "projetado" (linha tracejada) — só existe divisão
  // quando o mês exibido é o mês atual; meses passados ficam 100% sólidos, futuros 100% tracejados
  const hoje = todayISO();
  const todayIdx = days.indexOf(hoje);
  const realizadoEndIdx = todayIdx >= 0 ? todayIdx : (mStr < currentMonthStr() ? nDays - 1 : -1);
  const hasRealizado = realizadoEndIdx >= 0;
  const hasProjetado = realizadoEndIdx < nDays - 1;
  const realizadoPath = hasRealizado ? toPathRange(saldoDia, 0, realizadoEndIdx + 1) : '';
  const projetadoPath = hasProjetado ? toPathRange(saldoDia, Math.max(realizadoEndIdx, 0), nDays) : '';

  const maxBar = Math.max(...despesasDia, ...receitasDia, 1);
  const barW = Math.max(2, Math.min(9, ((w - padL - padR) / nDays) * 0.42));
  const barY = (v) => barsBottom - (v / maxBar) * barsH;

  return `
    <svg viewBox="0 0 ${w} ${h}" style="width:100%;height:260px">
      <defs><linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--primary)" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="var(--primary)" stop-opacity="0"/>
      </linearGradient></defs>
      ${yTicks.map((t) => `<line x1="${padL}" y1="${y0(t).toFixed(1)}" x2="${w - padR}" y2="${y0(t).toFixed(1)}" stroke="var(--border-soft)" stroke-width="1"/><text x="0" y="${(y0(t) + 4).toFixed(1)}" font-size="16" fill="var(--text-faint)">${formatCurrency(t).replace('R$', '').trim()}</text>`).join('')}
      ${minVal < 0 && maxVal > 0 ? `<line x1="${padL}" y1="${y0(0).toFixed(1)}" x2="${w - padR}" y2="${y0(0).toFixed(1)}" stroke="var(--text-faint)" stroke-width="1" stroke-dasharray="2 4" opacity="0.6"/>` : ''}
      <path d="${areaPath}" fill="url(#areaGrad)" stroke="none"/>
      ${hasRealizado ? `<path d="${realizadoPath}" fill="none" stroke="var(--primary)" stroke-width="3"/>` : ''}
      ${hasProjetado ? `<path d="${projetadoPath}" fill="none" stroke="var(--primary)" stroke-width="3" stroke-dasharray="7 5" opacity="0.75"/>` : ''}
      ${saldoDia.map((v, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y0(v).toFixed(1)}" r="7" fill="transparent"><title>${formatDateBR(days[i])} — Saldo: ${formatCurrency(v)}</title></circle>`).join('')}
      ${todayIdx > -1 ? `<line x1="${x(todayIdx).toFixed(1)}" y1="${padT}" x2="${x(todayIdx).toFixed(1)}" y2="${mainBottom}" stroke="var(--text-faint)" stroke-width="1" stroke-dasharray="3 3"/><text x="${x(todayIdx).toFixed(1)}" y="${padT - 3}" font-size="13" fill="var(--text-faint)" text-anchor="middle">Hoje</text>` : ''}
      <line x1="${padL}" y1="${barsBottom.toFixed(1)}" x2="${w - padR}" y2="${barsBottom.toFixed(1)}" stroke="var(--border-soft)" stroke-width="1"/>
      ${despesasDia.map((v, i) => v > 0 ? `<rect x="${(x(i) - barW * 1.05).toFixed(1)}" y="${barY(v).toFixed(1)}" width="${barW.toFixed(1)}" height="${(barsBottom - barY(v)).toFixed(1)}" rx="1.5" fill="var(--danger)" opacity="0.6"><title>${formatDateBR(days[i])} — Despesas: ${formatCurrency(v)}</title></rect>` : '').join('')}
      ${receitasDia.map((v, i) => v > 0 ? `<rect x="${(x(i) + barW * 0.05).toFixed(1)}" y="${barY(v).toFixed(1)}" width="${barW.toFixed(1)}" height="${(barsBottom - barY(v)).toFixed(1)}" rx="1.5" fill="var(--success)" opacity="0.6"><title>${formatDateBR(days[i])} — Receitas: ${formatCurrency(v)}</title></rect>` : '').join('')}
      ${days.filter((_, i) => i % 4 === 0 || i === nDays - 1).map((d, _, arr) => {
        const i = days.indexOf(d);
        return `<text x="${x(i).toFixed(1)}" y="${h - 4}" font-size="15" fill="var(--text-faint)" text-anchor="middle">${d.slice(8, 10)}/${mStr.slice(5, 7)}</text>`;
      }).join('')}
    </svg>
    <div style="display:flex;gap:18px;justify-content:center;flex-wrap:wrap;margin-top:6px;font-size:12px;color:var(--text-muted)">
      <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--danger);margin-right:5px"></span>Despesas</span>
      <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--success);margin-right:5px"></span>Receitas</span>
      <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--primary);margin-right:5px"></span>Saldo</span>
      ${hasProjetado ? `<span><span style="display:inline-block;width:14px;height:0;border-top:2px dashed var(--primary);margin-right:5px;vertical-align:middle"></span>Projeção</span>` : ''}
    </div>
  `;
}

function pagoFixoStatusHTML(g, mStr) {
  if (g.pago) {
    return `<div style="display:inline-flex;align-items:center;gap:8px">
      <span class="badge badge-success">Pago</span>
      <button type="button" class="btn btn-ghost btn-sm" data-action="reopen-fixo" data-id="${g.id}" data-mes="${mStr}">Reabrir</button>
    </div>`;
  }
  return `<div style="display:inline-flex;align-items:center;gap:8px">
    <span class="badge badge-warning">A pagar</span>
    <button type="button" class="btn-pay" data-action="pay-fixo" data-id="${g.id}" data-mes="${mStr}">${icon('checkCircle')} Pagar</button>
  </div>`;
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
      ${pagoFixoStatusHTML(g, g.mesRef)}
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
      <div class="row-sub" style="margin-bottom:8px">${(Store.bankById(c.bankId) || {}).name || ''}</div>
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
  // ponto de partida real (saldo dos bancos antes de janeiro) — cada mês depois disso soma o próprio "Saldo do mês"
  let runningBalance = saldoBancosNoFimDoMes(monthAddStr(`${year}-01`, -1));
  let totalGanhos = 0, totalFixos = 0, totalVar = 0, totalCartao = 0, totalParcelas = 0, totalSaldoMes = 0;
  const rows = months.map((m) => {
    const mStr = `${year}-${String(m + 1).padStart(2, '0')}`;
    const ganhos = recebimentosForMonth(mStr).reduce((s, r) => s + r.valor, 0);
    const fixos = gastosFixosForMonth(mStr).reduce((s, g) => s + g.valor, 0);
    const variaveis = Store.state.gastosVariaveis.filter((g) => isSameMonth(g.data, mStr)).reduce((s, g) => s + g.valor, 0);
    const cartao = allCartoesFaturaForMonth(mStr);
    const parcelas = parcelamentoParcelasForMonth(mStr);
    const saldoMes = ganhos - fixos - variaveis - cartao - parcelas;
    totalGanhos += ganhos; totalFixos += fixos; totalVar += variaveis; totalCartao += cartao; totalParcelas += parcelas; totalSaldoMes += saldoMes;
    // balanço = balanço do mês anterior + saldo deste mês — sempre rastreável pelas colunas ao lado
    runningBalance += saldoMes;
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
      <td>${formatCurrency(parcelas)}</td>
      <td class="${saldoMes >= 0 ? 'amount-pos' : 'amount-neg'}">${formatCurrency(saldoMes)}</td>
      <td><strong>${formatCurrency(runningBalance)}</strong></td>
    </tr>`;
  }).join('');

  return `
    <div class="month-table-wrap">
      <table class="month-table">
        <thead><tr><th>Mês</th><th>Status</th><th>Ganhos</th><th>Gastos fixos</th><th>Gastos variáveis</th><th>Cartão de crédito</th><th>Parcelamentos</th><th>Saldo do mês</th><th>Balanço</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><td colspan="2">Total do ano</td><td class="amount-pos">${formatCurrency(totalGanhos)}</td><td>${formatCurrency(totalFixos)}</td><td>${formatCurrency(totalVar)}</td><td>${formatCurrency(totalCartao)}</td><td>${formatCurrency(totalParcelas)}</td><td class="${totalSaldoMes >= 0 ? 'amount-pos' : 'amount-neg'}">${formatCurrency(totalSaldoMes)}</td><td>${formatCurrency(runningBalance)}</td></tr></tfoot>
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
let gfSort = 'data-asc';

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
    const displayList = sortList(gastosFixosForMonthAll(listMonth), gfSort, (g) => g.vencimentoISO, (g) => g.valor);
    const totalMes = inPeriodList.reduce((s, g) => s + g.valor, 0);
    const pagoMes = inPeriodList.filter((g) => g.pago).reduce((s, g) => s + gastoFixoValorEfetivo(g), 0);
    // soma só as contas NÃO pagas — pagar com desconto não pode deixar a diferença como "pendente"
    const pendenteMes = inPeriodList.filter((g) => !g.pago).reduce((s, g) => s + g.valor, 0);
    const desativados = displayList.filter((g) => g.ativo === false);

    container.innerHTML = `
      <div class="grid-form-list">
        <div class="panel">
          <h3 style="margin-bottom:14px">${editing ? 'Editar gasto fixo' : 'Novo gasto fixo'}</h3>
          <div class="field"><label>Nome</label><input type="text" id="ff-nome" placeholder="Ex.: Aluguel" value="${editing ? editing.nome : ''}" /></div>
          <div class="field-row">
            <div class="field"><label>Valor</label>${moneyInputHTML('ff-valor', editing ? editing.valor : '')}</div>
            <div class="field"><label>Dia do vencimento</label><input type="number" min="1" max="31" id="ff-dia" placeholder="Ex.: 10" value="${editing ? editing.diaVencimento : ''}" /></div>
          </div>
          <div class="field"><label>Ativo desde</label><input type="month" id="ff-inicio" value="${editing ? gastoFixoCreatedMonth(editing) : gfPeriodMonth(period)}" /></div>
          <div class="row-sub" style="margin:-8px 0 14px">Segue o mês escolhido no filtro da lista — mude aqui se quiser lançar/pagar meses passados deste gasto fixo.</div>
          <div class="field-row" style="grid-template-columns:1.3fr 1fr">
            <div class="field"><label>Duração</label><select id="ff-duracao">
              <option value="sempre" ${editing && editing.fimMes ? '' : 'selected'}>Recorrente</option>
              <option value="parcelas" ${editing && editing.fimMes ? 'selected' : ''}>Parcelas (nº fixo)</option>
            </select></div>
            <div class="field" id="ff-parcelas-field" style="display:${editing && editing.fimMes ? 'block' : 'none'}"><label>Quantas parcelas?</label><input type="number" min="1" max="480" id="ff-parcelas" placeholder="Ex.: 12" value="${editing && editing.fimMes ? monthsDiffStr(gastoFixoCreatedMonth(editing), editing.fimMes) : ''}" /></div>
          </div>
          <div class="row-sub" style="margin:-8px 0 14px">Ex.: 12 parcelas — a conta aparece por 12 meses a partir do "Ativo desde" e para sozinha.</div>
          <div class="field"><label>Categoria</label>${fieldHTML({ key: 'ff-categoria', type: 'select-category', catTipo: 'despesa' }, editing ? editing.categoryId : '')}</div>
          <div class="field" style="display:flex;align-items:center;padding-top:4px"><label class="checkbox-row"><input type="checkbox" id="ff-ativo" ${!editing || editing.ativo !== false ? 'checked' : ''} /> Ativo (recorrente todo mês)</label></div>
          <div class="field"><label>Banco vinculado <span class="req">*</span></label>${fieldHTML({ key: 'ff-banco', type: 'select-bank' }, editing ? editing.bankId : '')}</div>
          <div class="field"><label>Observação (opcional)</label><textarea id="ff-obs" placeholder="Observação (opcional)">${editing ? (editing.observacao || '') : ''}</textarea></div>
          <button class="btn btn-primary btn-block" id="ff-save">${editing ? 'Salvar alterações' : 'Salvar gasto fixo'}</button>
          ${editing ? `<button class="btn btn-ghost btn-block" id="ff-cancel-edit" style="margin-top:8px">Cancelar edição</button>` : ''}
          <div style="margin-top:14px">${collapsibleNewCategory('ff', { catTipo: 'despesa' })}</div>
        </div>

        <div>
          <div class="panel">
            <div class="panel-header">
              <div><h3>Lista de gastos fixos</h3><div class="panel-sub">Recorrentes — voltam como pendentes a cada mês.</div></div>
              ${renderPeriodControl('gf', period)}
            </div>
            <div class="stat-grid stat-grid-tight">
              ${statCard({ label: 'Total do mês', value: formatCurrency(totalMes), tone: 'blue', iconName: 'wallet' })}
              ${statCard({ label: 'Cadastrados', value: inPeriodList.length, sub: `${all.length} no total`, tone: 'purple', iconName: 'repeat' })}
              ${statCard({ label: 'Pago no mês', value: formatCurrency(pagoMes), tone: 'green', iconName: 'checkCircle' })}
              ${statCard({ label: 'Pendente', value: formatCurrency(pendenteMes), tone: 'orange', iconName: 'alertTriangle' })}
              ${statCard({ label: 'Desativados', value: formatCurrency(desativados.reduce((s, g) => s + g.valor, 0)), sub: `${desativados.length} contas`, tone: 'red', iconName: 'trash' })}
            </div>
            ${displayList.length === 0 ? emptyState({ iconName: 'repeat', title: 'Nenhum gasto fixo cadastrado.' }) : gastosFixosTable(displayList, listMonth, gfSort)}
          </div>
        </div>
      </div>
    `;

    document.getElementById('ff-duracao').onchange = (e) => {
      document.getElementById('ff-parcelas-field').style.display = e.target.value === 'parcelas' ? 'block' : 'none';
    };
    document.getElementById('ff-save').onclick = () => {
      const nome = document.getElementById('ff-nome').value.trim();
      const valor = moneyValue('ff-valor');
      const diaVencimento = Math.min(31, Math.max(1, parseInt(document.getElementById('ff-dia').value, 10) || 1));
      const inicioMes = document.getElementById('ff-inicio').value || currentMonthStr();
      const bankId = document.getElementById('f-ff-banco').value;
      const categoryId = document.getElementById('f-ff-categoria').value;
      const duracao = document.getElementById('ff-duracao').value;
      const nParcelas = parseInt(document.getElementById('ff-parcelas').value, 10) || 0;
      if (!nome) { toast('Informe o nome do gasto fixo', 'danger'); return; }
      if (!valor) { toast('Informe um valor', 'danger'); return; }
      if (!bankId) { toast('Selecione o banco vinculado', 'danger'); return; }
      if (!categoryId) { toast('Selecione a categoria', 'danger'); return; }
      if (duracao === 'parcelas' && nParcelas < 1) { toast('Informe o número de parcelas', 'danger'); return; }
      const payload = {
        nome, valor, diaVencimento, inicioMes, bankId,
        categoryId,
        // fimMes é exclusivo: 12 parcelas a partir de jul/2026 => aparece de jul/2026 a jun/2027
        fimMes: duracao === 'parcelas' ? monthAddStr(inicioMes, nParcelas) : null,
        ativo: document.getElementById('ff-ativo').checked,
        observacao: document.getElementById('ff-obs').value,
      };
      if (editing) {
        const valorMudou = valor !== editing.valor || diaVencimento !== editing.diaVencimento;
        if (valorMudou) {
          aplicarAlteracaoGastoFixoModal(editing, listMonth, payload, () => { editingFixoId = null; draw(); });
        } else {
          Store.update('gastosFixos', editing.id, payload);
          toast('Gasto fixo atualizado', 'success');
          editingFixoId = null;
          draw();
        }
      } else {
        Store.add('gastosFixos', Object.assign({ historico: [{ id: uid(), mes: inicioMes, valor, diaVencimento }] }, payload));
        toast('Gasto fixo cadastrado', 'success');
        draw();
      }
    };
    if (editing) document.getElementById('ff-cancel-edit').onclick = () => { editingFixoId = null; draw(); };

    wireQuickAddButtons([{ key: 'ff-categoria', type: 'select-category', catTipo: 'despesa' }, { key: 'ff-banco', type: 'select-bank' }]);
    wireCollapsibleNewCategory('ff', () => draw(), { catTipo: 'despesa' });
    wirePeriodControl('gf', period, draw);
    wireSortableHeaders(container, () => gfSort, (v) => { gfSort = v; }, draw);

    container.querySelectorAll('[data-action="edit-fixo"]').forEach((b) => b.onclick = () => { editingFixoId = b.dataset.id; draw(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    container.querySelectorAll('[data-action="toggle-ativo-fixo"]').forEach((b) => b.onclick = () => {
      const item = Store.get('gastosFixos', b.dataset.id);
      Store.update('gastosFixos', b.dataset.id, { ativo: item.ativo === false });
      draw();
    });
    wirePagoFixoActions(container, draw);
    container.querySelectorAll('[data-action="delete-fixo"]').forEach((b) => b.onclick = () => {
      deleteGastoFixoModal(Store.get('gastosFixos', b.dataset.id), b.dataset.mes, draw);
    });
  };
  draw();
}

function gastosFixosTable(list, mStr, sort) {
  return `
    <table class="list-table">
      <thead><tr><th>Nome</th><th>Categoria</th>${sortableThHTML('Vencimento', 'data', sort)}<th>Pagamento</th><th>Banco</th>${sortableThHTML('Valor', 'valor', sort)}<th style="text-align:center">Status</th><th></th></tr></thead>
      <tbody>
        ${list.map((g) => `
          <tr>
            <td>${categoryAvatar(g.categoryId)}<div style="display:inline-block;vertical-align:middle;margin-left:10px"><div class="row-title">${g.nome}${g.fimMes ? `<span class="badge badge-primary" style="margin-left:8px" title="Parcela ${monthsDiffStr(gastoFixoCreatedMonth(g), g.mesRef) + 1} de ${monthsDiffStr(gastoFixoCreatedMonth(g), g.fimMes)}">${monthsDiffStr(gastoFixoCreatedMonth(g), g.mesRef) + 1}/${monthsDiffStr(gastoFixoCreatedMonth(g), g.fimMes)}</span>` : ''}</div>${g.ativo === false ? '<span class="badge badge-muted">Inativo</span>' : ''}</div></td>
            <td>${categoryTag(g.categoryId)}</td>
            <td>${formatDateBR(g.vencimentoISO)}</td>
            <td>${g.pagamento ? formatDateBR(g.pagamento.data) : '<span class="row-sub">—</span>'}</td>
            <td>${Store.bankById(g.bankId) ? Store.bankById(g.bankId).name : '—'}</td>
            <td><strong>${formatCurrency(gastoFixoValorEfetivo(g))}</strong></td>
            <td style="text-align:center">${pagoFixoStatusHTML(g, mStr)}</td>
            <td><div class="row-actions">
              <button class="btn-icon" data-action="toggle-ativo-fixo" data-id="${g.id}" title="${g.ativo === false ? 'Reativar' : 'Desativar'}">${icon(g.ativo === false ? 'checkCircle' : 'alertTriangle')}</button>
              <button class="btn-icon" data-action="edit-fixo" data-id="${g.id}">${icon('edit')}</button>
              <button class="btn-icon" data-action="delete-fixo" data-id="${g.id}" data-mes="${mStr}">${icon('trash')}</button>
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
let gvFilters = { pill: 'todos', status: 'todos', category: 'todos', sort: 'data-desc', search: '' };
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
    list = sortList(list, gvFilters.sort, (g) => g.data, (g) => g.valor);

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
            <div class="field"><label>Valor</label>${moneyInputHTML('gv-valor', editing ? editing.valor : '')}</div>
            <div class="field"><label>Data</label><input type="date" id="gv-data" value="${editing ? editing.data : todayISO()}" /></div>
          </div>
          <div class="field"><label>Categoria</label>${fieldHTML({ key: 'gv-categoria', type: 'select-category', catTipo: 'despesa' }, editing ? editing.categoryId : '')}</div>
          <div class="field"><label>Banco vinculado <span class="req">*</span></label>${fieldHTML({ key: 'gv-banco', type: 'select-bank' }, editing ? editing.bankId : '')}</div>
          <div class="field"><label>Observação (opcional)</label><textarea id="gv-obs" placeholder="Observação (opcional)">${editing ? (editing.observacao || '') : ''}</textarea></div>
          <button class="btn btn-primary btn-block" id="gv-save">${editing ? 'Salvar alterações' : 'Adicionar lançamento'}</button>
          ${editing ? `<button class="btn btn-ghost btn-block" id="gv-cancel-edit" style="margin-top:8px">Cancelar edição</button>` : ''}
          <div style="margin-top:14px">${collapsibleNewCategory('gv', { catTipo: 'despesa' })}</div>
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
                ${Store.state.categories.filter((c) => (c.tipo || 'despesa') === 'despesa').map((c) => `<option value="${c.id}" ${gvFilters.category === c.id ? 'selected' : ''}>${c.emoji} ${c.name}</option>`).join('')}
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
            ${list.length === 0 ? emptyState({ iconName: 'search', title: 'Nenhum lançamento encontrado com os filtros aplicados.' }) : gastosVariaveisTable(list, gvFilters.sort)}
          </div>
        </div>
      </div>
    `;

    document.getElementById('gv-save').onclick = () => {
      const descricao = document.getElementById('gv-desc').value.trim();
      const valor = moneyValue('gv-valor');
      const data = document.getElementById('gv-data').value;
      const bankId = document.getElementById('f-gv-banco').value;
      const categoryId = document.getElementById('f-gv-categoria').value;
      if (!descricao) { toast('Informe a descrição', 'danger'); return; }
      if (!valor) { toast('Informe um valor', 'danger'); return; }
      if (!bankId) { toast('Selecione o banco vinculado', 'danger'); return; }
      if (!categoryId) { toast('Selecione a categoria', 'danger'); return; }
      const payload = {
        descricao, valor, data, bankId,
        categoryId,
        observacao: document.getElementById('gv-obs').value,
      };
      if (editing) { updateGastoVariavel(editing.id, payload); toast('Lançamento atualizado', 'success'); editingVariavelId = null; }
      else { addGastoVariavel(payload); toast('Lançamento adicionado', 'success'); }
      draw();
    };
    if (editing) document.getElementById('gv-cancel-edit').onclick = () => { editingVariavelId = null; draw(); };

    wireQuickAddButtons([{ key: 'gv-categoria', type: 'select-category', catTipo: 'despesa' }, { key: 'gv-banco', type: 'select-bank' }]);
    wireCollapsibleNewCategory('gv', () => draw(), { catTipo: 'despesa' });
    wirePeriodControl('gvp', period, draw);

    document.getElementById('gv-filter-status').onchange = (e) => { gvFilters.status = e.target.value; draw(); };
    document.getElementById('gv-filter-cat').onchange = (e) => { gvFilters.category = e.target.value; draw(); };
    wireSortableHeaders(container, () => gvFilters.sort, (v) => { gvFilters.sort = v; }, draw);
    document.getElementById('gv-search').oninput = (e) => { gvFilters.search = e.target.value; draw(); };
    container.querySelectorAll('[data-pill]').forEach((b) => b.onclick = () => { gvFilters.pill = b.dataset.pill; draw(); });

    container.querySelectorAll('[data-action="edit-var"]').forEach((b) => b.onclick = () => { editingVariavelId = b.dataset.id; draw(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    container.querySelectorAll('[data-action="toggle-pago-var"]').forEach((b) => b.onclick = () => {
      const item = Store.get('gastosVariaveis', b.dataset.id);
      if (item.status === 'pago') reopenGastoVariavel(b.dataset.id); else payGastoVariavel(b.dataset.id);
      draw();
    });
    container.querySelectorAll('[data-action="delete-var"]').forEach((b) => b.onclick = () => {
      confirmModal({
        title: 'Excluir lançamento', text: 'Essa ação não pode ser desfeita. Deseja continuar?', confirmLabel: 'Excluir', danger: true,
        onConfirm: () => { deleteGastoVariavel(b.dataset.id); toast('Lançamento excluído', 'success'); draw(); },
      });
    });
  };
  draw();
}

function gastosVariaveisTable(list, sort) {
  return `
    <table class="list-table">
      <thead><tr><th>Descrição</th><th>Categoria</th>${sortableThHTML('Data', 'data', sort)}<th>Banco</th>${sortableThHTML('Valor', 'valor', sort)}<th>Status</th><th></th></tr></thead>
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
const BANK_CORES = ['#3866ff', '#7c3aed', '#22c55e', '#f04848', '#f5a623', '#14b8a6', '#000000', '#eab308'];
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
          <div class="field"><label>Saldo ${editing ? 'atual' : 'inicial'}</label>${moneyInputHTML('bc-saldo', editing ? editing.balance : '')}</div>
          <div class="field">
            <label>Cor</label>
            <div class="chip-row" id="bc-cor-group">
              ${BANK_CORES.map((c) => `<button type="button" data-cor="${c}" style="width:28px;height:28px;border-radius:50%;background:${c};border:2px solid ${c === novoBancoCor ? 'var(--primary)' : 'var(--border)'};box-shadow:${c === novoBancoCor ? '0 0 0 2px var(--primary-soft)' : 'none'};cursor:pointer"></button>`).join('')}
            </div>
          </div>
          <button class="btn btn-primary btn-block" id="bc-save">${editing ? 'Salvar alterações' : 'Salvar banco'}</button>
        </div>

        ${banks.length === 0 && !bancoFormOpen ? `<div class="panel">${emptyState({ iconName: 'bank', title: 'Nenhum banco cadastrado', text: 'Adicione um banco para registrar gastos, recebimentos e seu saldo real.', actionLabel: 'Novo banco', actionId: 'bc-empty-create' })}</div>` : ''}
        ${banks.length > 0 ? `<div class="grid-2">${banks.map((b) => `
          <div class="panel" style="border-top:3px solid ${b.cor || 'var(--primary)'};padding-top:16px">
            <div style="display:flex;justify-content:space-between;align-items:flex-start">
              <div style="display:flex;gap:10px;align-items:center">
                <span style="width:40px;height:40px;border-radius:50%;background:${hexToSoft(b.cor || '#3866ff')};display:flex;align-items:center;justify-content:center">${icon('bank')}</span>
                <div>
                  <strong>${b.name}</strong>
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
      corBtns.forEach((b) => b.onclick = () => {
        novoBancoCor = b.dataset.cor;
        corBtns.forEach((x) => {
          x.style.border = x === b ? '2px solid var(--primary)' : '2px solid var(--border)';
          x.style.boxShadow = x === b ? '0 0 0 2px var(--primary-soft)' : 'none';
        });
      });
      document.getElementById('bc-save').onclick = () => {
        const name = document.getElementById('bc-nome').value.trim();
        if (!name) { toast('Dê um nome para o banco', 'danger'); return; }
        const payload = { name, balance: moneyValue('bc-saldo'), cor: novoBancoCor };
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
        const valor = moneyValue('tf-valor');
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
          <div class="field"><label>Valor</label>${moneyInputHTML('tf-valor', '')}</div>
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
let rcSort = 'data-asc';

function pageRecebimentos(container) {
  const draw = () => {
    const editing = editingRecebId ? Store.get('recebimentos', editingRecebId) : null;
    const period = recebPeriod;
    const mStr = period.type === 'year' ? null : (period.value || currentMonthStr());
    const months = period.type === 'year' ? Array.from({ length: 12 }, (_, i) => `${period.value}-${String(i + 1).padStart(2, '0')}`) : [mStr];
    const items = sortList(months.flatMap((m) => recebimentosForMonth(m)), rcSort, (r) => r.dataOcorrencia, (r) => r.valor);

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
            <div class="field"><label>Valor</label>${moneyInputHTML('rc-valor', editing ? editing.valor : '')}</div>
            <div class="field"><label>Data</label><input type="date" id="rc-data" value="${editing ? editing.data : todayISO()}" /></div>
          </div>
          <div class="field"><label>Categoria</label>${fieldHTML({ key: 'rc-categoria', type: 'select-category', catTipo: 'receita' }, editing ? editing.categoryId : '')}</div>
          <div class="field"><label>Banco (obrigatório)</label>${fieldHTML({ key: 'rc-banco', type: 'select-bank' }, editing ? editing.bankId : '')}</div>
          <div class="field"><label>Observação (opcional)</label><textarea id="rc-obs" placeholder="Observação (opcional)">${editing ? (editing.observacao || '') : ''}</textarea></div>
          <div class="field">
            <label>Tipo de recebimento</label>
            <div class="type-box-group" id="rc-tipo-group">
              <button type="button" class="type-box ${recebTipo === 'unico' ? 'active' : ''}" data-tipo="unico">${icon('wallet')}<span>Único</span></button>
              <button type="button" class="type-box ${recebTipo === 'recorrente' ? 'active' : ''}" data-tipo="recorrente">${icon('repeat')}<span>Recorrente</span></button>
              <button type="button" class="type-box ${recebTipo === 'parcelado' ? 'active' : ''}" data-tipo="parcelado">${icon('layers')}<span>Parcelado</span></button>
            </div>
          </div>
          <div class="field" id="rc-parcelas-field" style="display:${recebTipo === 'parcelado' ? 'block' : 'none'}">
            <label>Número de parcelas</label><input type="number" min="2" max="48" id="rc-parcelas" value="${editing ? editing.parcelas || 2 : 2}" />
          </div>
          <div class="field" id="rc-datafinal-field" style="display:${recebTipo === 'recorrente' ? 'block' : 'none'}">
            <label>Data final (opcional — deixe em branco para infinito)</label>
            <input type="date" id="rc-data-final" value="${editing ? (editing.dataFinal || '') : ''}" />
            <div class="row-sub" style="margin-top:6px">Será replicado todo mês no dia <strong id="rc-dia-replica" style="color:var(--text)">${(editing ? editing.data : todayISO()).slice(8, 10)}</strong>.</div>
          </div>
          <button class="btn btn-primary btn-block" id="rc-save">${editing ? 'Salvar alterações' : 'Registrar recebimento'}</button>
          ${editing ? `<button class="btn btn-ghost btn-block" id="rc-cancel-edit" style="margin-top:8px">Cancelar edição</button>` : ''}
          <div style="margin-top:14px">${collapsibleNewCategory('rc', { catTipo: 'receita' })}</div>
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
            ${items.length === 0 ? emptyState({ iconName: 'download', title: 'Nenhum recebimento nesse período.' }) : recebimentosTable(items, rcSort)}
          </div>
        </div>
      </div>
    `;

    document.getElementById('rc-tipo-group').querySelectorAll('.type-box').forEach((b) => b.onclick = () => {
      recebTipo = b.dataset.tipo;
      document.getElementById('rc-tipo-group').querySelectorAll('.type-box').forEach((x) => x.classList.toggle('active', x === b));
      document.getElementById('rc-parcelas-field').style.display = recebTipo === 'parcelado' ? 'block' : 'none';
      document.getElementById('rc-datafinal-field').style.display = recebTipo === 'recorrente' ? 'block' : 'none';
    });
    document.getElementById('rc-data').oninput = (e) => {
      const dia = e.target.value ? e.target.value.slice(8, 10) : '';
      const diaEl = document.getElementById('rc-dia-replica');
      if (diaEl && dia) diaEl.textContent = dia;
    };

    document.getElementById('rc-save').onclick = () => {
      const descricao = document.getElementById('rc-desc').value.trim();
      const valor = moneyValue('rc-valor');
      const data = document.getElementById('rc-data').value;
      const bankId = document.getElementById('f-rc-banco').value;
      const categoryId = document.getElementById('f-rc-categoria').value;
      if (!descricao) { toast('Informe a descrição', 'danger'); return; }
      if (!valor) { toast('Informe um valor', 'danger'); return; }
      if (!bankId) { toast('Selecione o banco', 'danger'); return; }
      if (!categoryId) { toast('Selecione a categoria', 'danger'); return; }
      const payload = {
        descricao, valor, data, bankId,
        categoryId,
        observacao: document.getElementById('rc-obs').value,
        tipo: recebTipo,
        parcelas: recebTipo === 'parcelado' ? Math.max(2, parseInt(document.getElementById('rc-parcelas').value, 10) || 2) : 1,
        dataFinal: recebTipo === 'recorrente' ? (document.getElementById('rc-data-final').value || null) : null,
      };
      if (editing) { updateRecebimento(editing.id, payload); toast('Recebimento atualizado', 'success'); editingRecebId = null; }
      else {
        const novo = Store.add('recebimentos', payload);
        if (data <= todayISO()) toggleRecebimentoRecebido(novo.id, data.slice(0, 7));
        toast('Recebimento registrado', 'success');
      }
      draw();
    };
    if (editing) document.getElementById('rc-cancel-edit').onclick = () => { editingRecebId = null; draw(); };

    wireQuickAddButtons([{ key: 'rc-categoria', type: 'select-category', catTipo: 'receita' }, { key: 'rc-banco', type: 'select-bank' }]);
    wireCollapsibleNewCategory('rc', () => draw(), { catTipo: 'receita' });
    wirePeriodControl('rc', period, draw);
    wireSortableHeaders(container, () => rcSort, (v) => { rcSort = v; }, draw);

    container.querySelectorAll('[data-action="edit-receb"]').forEach((b) => b.onclick = () => { editingRecebId = b.dataset.id; recebTipo = Store.get('recebimentos', b.dataset.id).tipo || 'unico'; draw(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    container.querySelectorAll('[data-action="toggle-receb"]').forEach((b) => b.onclick = () => { toggleRecebimentoRecebido(b.dataset.id, b.dataset.mes); draw(); });
    container.querySelectorAll('[data-action="delete-receb"]').forEach((b) => b.onclick = () => {
      confirmModal({
        title: 'Excluir recebimento', text: 'Essa ação não pode ser desfeita. Deseja continuar?', confirmLabel: 'Excluir', danger: true,
        onConfirm: () => { deleteRecebimento(b.dataset.id); toast('Recebimento excluído', 'success'); draw(); },
      });
    });
  };
  draw();
}

function recebimentosTable(items, sort) {
  return `
    <table class="list-table">
      <thead><tr><th>Descrição</th><th>Categoria</th>${sortableThHTML('Data', 'data', sort)}<th>Parcela</th>${sortableThHTML('Valor', 'valor', sort)}<th>Status</th><th></th></tr></thead>
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
    const autoChecked = !!(editing && editing.aporteAutomatico);

    container.innerHTML = `
      <div class="panel-header" style="margin-bottom:16px">
        <div class="row-sub">${items.length} cofrinho${items.length === 1 ? '' : 's'} ativo${items.length === 1 ? '' : 's'}</div>
        <button class="btn btn-primary btn-sm" id="cf-toggle-form">${icon('plus')} Novo cofrinho</button>
      </div>

      <div class="panel" id="cf-form-panel" style="display:${cofrinhoFormOpen ? 'block' : 'none'}">
        <div class="panel-header"><h3>${editing ? 'Editar cofrinho' : 'Novo cofrinho'}</h3><button class="btn btn-ghost btn-sm" id="cf-cancel">Cancelar</button></div>
        <div class="field"><label>Nome</label><input type="text" id="cf-nome" placeholder='Ex.: Viagem para Bariloche' value="${editing ? editing.nome : ''}" /></div>
        <div class="field-row">
          <div class="field"><label>Valor objetivo</label>${moneyInputHTML('cf-meta', editing ? editing.meta : '')}</div>
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
          <input type="checkbox" id="cf-auto" ${autoChecked ? 'checked' : ''} style="margin-top:3px" />
          <label for="cf-auto" style="cursor:pointer"><strong style="display:block;color:var(--text)">Aporte automático mensal</strong><span class="row-sub">O sistema transfere automaticamente da conta no dia escolhido.</span></label>
        </div>
        <div class="field-row-3" id="cf-auto-fields" style="display:${autoChecked ? 'grid' : 'none'}">
          <div class="field"><label>Valor do aporte</label>${moneyInputHTML('cf-aporte-valor', editing ? editing.valorAporte : '')}</div>
          <div class="field"><label>Dia (1-28)</label><input type="number" min="1" max="28" id="cf-aporte-dia" value="${editing && editing.diaAporte ? editing.diaAporte : 5}" /></div>
          <div class="field"><label>Conta de origem</label><select id="cf-aporte-banco">${bankOptions(editing ? editing.contaOrigemId : '')}</select></div>
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
      document.getElementById('cf-auto').onchange = (e) => {
        document.getElementById('cf-auto-fields').style.display = e.target.checked ? 'grid' : 'none';
      };
      document.getElementById('cf-save').onclick = () => {
        const nome = document.getElementById('cf-nome').value.trim();
        const meta = moneyValue('cf-meta');
        const auto = document.getElementById('cf-auto').checked;
        const valorAporte = moneyValue('cf-aporte-valor');
        const contaOrigemId = document.getElementById('cf-aporte-banco').value;
        if (!nome) { toast('Dê um nome para o cofrinho', 'danger'); return; }
        if (!meta) { toast('Informe o valor objetivo', 'danger'); return; }
        if (auto && !valorAporte) { toast('Informe o valor do aporte automático', 'danger'); return; }
        if (auto && !contaOrigemId) { toast('Selecione a conta de origem do aporte', 'danger'); return; }
        const payload = {
          nome, meta,
          prazo: document.getElementById('cf-prazo').value || null,
          icone: novoCofrinhoIcone,
          cor: novoCofrinhoCor,
          observacao: document.getElementById('cf-obs').value,
          aporteAutomatico: auto,
          valorAporte: auto ? valorAporte : 0,
          diaAporte: Math.min(28, Math.max(1, parseInt(document.getElementById('cf-aporte-dia').value, 10) || 5)),
          contaOrigemId: auto ? contaOrigemId : '',
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
          <div class="field"><label>Valor</label>${moneyInputHTML('dep-valor', '')}</div>
          <div class="modal-actions">
            <button class="btn btn-ghost btn-sm" id="modal-cancel">Cancelar</button>
            <button class="btn btn-primary btn-sm" id="modal-confirm">Depositar</button>
          </div>
        </div>`;
      overlay.classList.add('open');
      overlay.querySelector('#modal-cancel').onclick = () => overlay.classList.remove('open');
      overlay.querySelector('#modal-confirm').onclick = () => {
        const valor = moneyValue('dep-valor');
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
          <span class="row-sub">${c.prazo ? 'Prazo: ' + formatDateBR(c.prazo) : ''}${c.prazo && c.aporteAutomatico ? ' · ' : ''}${c.aporteAutomatico ? `Aporte de ${formatCurrency(c.valorAporte || 0)} todo dia ${c.diaAporte}` : ''}</span>
          <button class="btn btn-ghost btn-sm" data-action="depositar-cofrinho" data-id="${c.id}">${icon('plus')} Depositar</button>
        </div>
      </div>`;
  }).join('');
}

/* ---- Cartões de crédito ---- */
let editingCartaoId = null;
let editingCompraId = null;
let selectedCartaoId = null;
let ccPeriod = { type: 'month', value: null };
let novoCartaoOpen = false;
let ccFaturaSort = 'data-desc';
let compraTipo = 'avista';
let novoCartaoCor = BANK_CORES[0];

function divisaoRowHTML(nome, valor) {
  return `
    <div class="field-row" data-divisao-row style="margin-bottom:8px">
      <div class="field" style="margin-bottom:0"><input type="text" placeholder="Nome (ex.: João)" class="cp-div-nome" value="${nome || ''}" /></div>
      <div class="field" style="margin-bottom:0;display:flex;gap:6px">
        ${moneyInputHTML('', valor, null, { extraClass: 'cp-div-valor', wrapAttrs: ' style="flex:1"' })}
        <button type="button" class="btn-icon" data-remove-divisao title="Remover">${icon('trash')}</button>
      </div>
    </div>
  `;
}
function readDivisoesRows() {
  const rows = document.querySelectorAll('#cp-divisoes-rows [data-divisao-row]');
  return [...rows].map((row) => ({
    nome: row.querySelector('.cp-div-nome').value.trim() || 'Sem nome',
    valor: moneyValueFromEl(row.querySelector('.cp-div-valor')),
  })).filter((d) => d.valor > 0);
}

function pageCartoes(container) {
  const draw = () => {
    const cartoes = Store.state.cartoes;
    if (!selectedCartaoId || !cartoes.find((c) => c.id === selectedCartaoId)) selectedCartaoId = cartoes[0] ? cartoes[0].id : null;
    if (!ccPeriod.value) ccPeriod.value = monthAddStr(currentMonthStr(), 1);
    const selectedFaturaMonth = ccPeriod.type === 'year' ? `${ccPeriod.value}-01` : ccPeriod.value;
    const editingCartao = editingCartaoId ? Store.get('cartoes', editingCartaoId) : null;
    if (editingCartao) novoCartaoCor = editingCartao.cor || BANK_CORES[0];
    const editingCompra = editingCompraId ? Store.get('cartaoCompras', editingCompraId) : null;
    const mAtual = currentMonthStr();

    const totalLimite = cartoes.reduce((s, c) => s + (c.limite || 0), 0);
    const totalAPagar = cartoes.reduce((s, c) => s + cartaoFaturaForMonth(c.id, mAtual), 0);
    const totalParcelas = cartoes.reduce((s, c) => s + parcelasAtivasCount(c.id), 0);

    const selected = cartoes.find((c) => c.id === selectedCartaoId);
    const faturaItens = selected ? sortList(cartaoComprasForMonth(selected.id, selectedFaturaMonth), ccFaturaSort, (x) => x.compra.data, (x) => x.occurrence.valor) : [];
    const faturaVencimentoISO = selected ? `${selectedFaturaMonth}-${String(clampDayToMonth(selectedFaturaMonth, selected.diaVencimento)).padStart(2, '0')}` : null;
    const faturaTotal = faturaItens.reduce((s, x) => s + x.occurrence.valor, 0);
    const faturaCustoReal = faturaItens.reduce((s, x) => s + x.occurrence.valorMeu, 0);
    const faturaPaga = selected && isCartaoFaturaPaga(selected.id, selectedFaturaMonth);
    const limiteUsado = selected ? cartaoLimiteUsado(selected.id) : 0;
    const faturaCatTotals = {};
    faturaItens.forEach((x) => { const k = x.compra.categoryId || 'sem'; faturaCatTotals[k] = (faturaCatTotals[k] || 0) + x.occurrence.valor; });
    const faturaCatEntries = Object.entries(faturaCatTotals).sort((a, b) => b[1] - a[1]);
    const faturaMaiorCat = faturaCatEntries[0];

    container.innerHTML = `
      <div class="grid-form-list">
        <div>
          <div class="panel">
            <button type="button" class="btn btn-ghost btn-block" id="cc-toggle-novocartao" style="justify-content:space-between">
              <span class="btn-toggle-label">${icon('card')} Novo cartão</span>${icon('chevronDown')}
            </button>
            <div id="cc-novocartao-box" style="display:${novoCartaoOpen ? 'block' : 'none'};margin-top:14px">
              <h3 style="margin-bottom:14px;font-size:14px">${editingCartao ? 'Editar cartão' : 'Cadastrar cartão'}</h3>
              <div class="field"><label>Nome do cartão</label><input type="text" id="cc-nome" placeholder="Ex.: Nubank Ultravioleta" value="${editingCartao ? editingCartao.nome : ''}" /></div>
              <div class="field"><label>Banco vinculado (paga a fatura) <span class="req">*</span></label>${fieldHTML({ key: 'cc-vinculo', type: 'select-bank' }, editingCartao ? editingCartao.bankId : '')}</div>
              <div class="field-row">
                <div class="field"><label>Limite</label>${moneyInputHTML('cc-limite', editingCartao ? editingCartao.limite : '')}</div>
                <div class="field">
                  <label>Cor</label>
                  <div class="chip-row" id="cc-cor-group">
                    ${BANK_CORES.map((c) => `<button type="button" data-cor="${c}" style="width:28px;height:28px;border-radius:50%;background:${c};border:2px solid ${c === novoCartaoCor ? 'var(--primary)' : 'var(--border)'};box-shadow:${c === novoCartaoCor ? '0 0 0 2px var(--primary-soft)' : 'none'};cursor:pointer"></button>`).join('')}
                  </div>
                </div>
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
            <h3 style="margin-bottom:14px">${editingCompra ? 'Editar compra' : 'Adicionar compra'}</h3>
            ${cartoes.length === 0 ? `<div class="row-sub" style="margin-bottom:10px">Cadastre um cartão acima antes de lançar compras.</div>` : ''}
            <div class="field"><label>Nome da compra</label><input type="text" id="cp-nome" placeholder="Ex.: Mercado" value="${editingCompra ? editingCompra.descricao : ''}" /></div>
            <div class="field-row">
              <div class="field"><label>Valor</label>${moneyInputHTML('cp-valor', editingCompra ? editingCompra.valorTotal : '')}</div>
              <div class="field"><label>Data</label><input type="date" id="cp-data" value="${editingCompra ? editingCompra.data : todayISO()}" /></div>
            </div>
            <div class="field"><label>Cartão</label><select id="cp-cartao">${cartoes.length === 0 ? '<option value="">Nenhum cartão cadastrado</option>' : cartoes.map((c) => `<option value="${c.id}" ${c.id === (editingCompra ? editingCompra.cartaoId : selectedCartaoId) ? 'selected' : ''}>${c.nome}${(Store.bankById(c.bankId) || {}).name ? ' (' + Store.bankById(c.bankId).name + ')' : ''}</option>`).join('')}</select></div>
            <div class="field"><label>Categoria</label>${fieldHTML({ key: 'cp-categoria', type: 'select-category', catTipo: 'despesa' }, editingCompra ? editingCompra.categoryId : '')}</div>
            <div class="field">
              <label>Tipo de compra</label>
              <div class="pill-group" id="cp-tipo-group">
                <button type="button" class="pill ${compraTipo === 'avista' ? 'active' : ''}" data-tipo="avista">À vista</button>
                <button type="button" class="pill ${compraTipo === 'parcelado' ? 'active' : ''}" data-tipo="parcelado">Parcelado</button>
                <button type="button" class="pill ${compraTipo === 'recorrente' ? 'active' : ''}" data-tipo="recorrente">Recorrente</button>
              </div>
            </div>
            <div class="field" id="cp-parcelas-field" style="display:${compraTipo === 'parcelado' ? 'block' : 'none'}">
              <label>Número de parcelas</label><input type="number" min="2" max="48" id="cp-parcelas" value="${editingCompra ? editingCompra.parcelas || 2 : 2}" />
            </div>
            <div class="field">
              <label class="checkbox-row"><input type="checkbox" id="cp-dividir" ${editingCompra && compraValorDividido(editingCompra) > 0 ? 'checked' : ''} /> Essa compra é rachada com outras pessoas?</label>
            </div>
            <div id="cp-divisoes-box" style="display:${editingCompra && compraValorDividido(editingCompra) > 0 ? 'block' : 'none'};margin-bottom:14px;padding:12px;border:1px solid var(--border);border-radius:10px;background:var(--bg-input)">
              <p class="row-sub" style="margin-bottom:10px">O valor total continua contando na fatura do cartão — só a <strong style="color:var(--text)">sua parte</strong> entra nas suas estatísticas de gasto.</p>
              <div id="cp-divisoes-rows">${(editingCompra ? editingCompra.divisoes || [] : []).map((d) => divisaoRowHTML(d.nome, d.valor)).join('')}</div>
              <button type="button" class="btn btn-ghost btn-sm" id="cp-add-divisao">${icon('plus')} Adicionar pessoa</button>
              <div class="row-sub" id="cp-sua-parte" style="margin-top:10px;font-weight:700"></div>
            </div>
            <button class="btn btn-primary btn-block" id="cp-save" ${cartoes.length === 0 ? 'disabled' : ''}>${editingCompra ? 'Salvar alterações' : 'Adicionar compra'}</button>
            ${editingCompra ? `<button class="btn btn-ghost btn-block" id="cp-cancel-edit" style="margin-top:8px">Cancelar edição</button>` : ''}
            <div style="margin-top:14px">${collapsibleNewCategory('cp', { catTipo: 'despesa' })}</div>
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
                    const limiteUsadoRow = cartaoLimiteUsado(c.id);
                    const pct = c.limite > 0 ? Math.min(100, Math.round((limiteUsadoRow / c.limite) * 100)) : 0;
                    return `<tr style="cursor:pointer;${c.id === selectedCartaoId ? 'background:var(--primary-soft)' : ''}" data-action="select-cartao" data-id="${c.id}">
                      <td><div style="display:flex;align-items:center;gap:8px"><span style="width:14px;height:14px;border-radius:4px;background:${c.cor || 'var(--primary)'};display:inline-block"></span><strong>${c.nome}</strong></div></td>
                      <td>${(Store.bankById(c.bankId) || {}).name || '—'}</td>
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
                ${renderPeriodControl('cc', ccPeriod)}
                <button class="btn ${faturaPaga ? 'btn-ghost' : 'btn-primary'} btn-sm" id="cc-pagar-fatura">${faturaPaga ? 'Reabrir fatura' : 'Pagar fatura'}</button>
              </div>
            </div>
            <div class="stat-grid">
              ${statCard({ label: 'Limite total', value: formatCurrency(selected.limite), tone: 'blue', iconName: 'card' })}
              ${statCard({ label: 'Limite usado', value: formatCurrency(limiteUsado), sub: 'Faturas em aberto (todas)', tone: 'red', iconName: 'arrowDownCircle' })}
              ${statCard({ label: 'Limite disponível', value: formatCurrency(Math.max(0, selected.limite - limiteUsado)), tone: 'green', iconName: 'checkCircle' })}
              ${statCard({ label: 'Saldo da fatura', value: formatCurrency(faturaPaga ? 0 : faturaTotal), tone: 'orange', iconName: 'wallet' })}
              ${statCard({ label: 'Seu custo real', value: formatCurrency(faturaCustoReal), sub: faturaCustoReal < faturaTotal ? `${formatCurrency(faturaTotal - faturaCustoReal)} são de racha` : 'Sem valores rachados', tone: 'cyan', iconName: 'sparkles' })}
            </div>
            ${faturaItens.length === 0 ? emptyState({ iconName: 'list', title: 'Nenhum item nessa fatura.' }) : `
              <table class="list-table">
                <thead><tr><th>Descrição</th><th>Categoria</th>${sortableThHTML('Compra', 'data', ccFaturaSort)}<th>Vencimento</th><th>Parcela</th>${sortableThHTML('Valor da fatura', 'valor', ccFaturaSort)}<th>Sua parte</th><th></th></tr></thead>
                <tbody>
                  ${faturaItens.map(({ compra, occurrence }) => {
                    const dividido = compraValorDividido(compra);
                    return `
                    <tr>
                      <td class="row-title">${compra.descricao}${dividido > 0 ? `<div class="row-sub">${icon('sparkles')} Rachado com ${compra.divisoes.map((d) => d.nome).join(', ')}</div>` : ''}</td>
                      <td>${categoryTag(compra.categoryId)}</td>
                      <td>${formatDateBR(compra.data)}</td>
                      <td>${formatDateBR(faturaVencimentoISO)}</td>
                      <td>${occurrence.parcelaLabel}</td>
                      <td><strong>${formatCurrency(occurrence.valor)}</strong></td>
                      <td>${dividido > 0 ? `<span class="amount-pos">${formatCurrency(occurrence.valorMeu)}</span>` : formatCurrency(occurrence.valorMeu)}</td>
                      <td><div class="row-actions">
                        <button class="btn-icon" data-action="edit-compra" data-id="${compra.id}">${icon('edit')}</button>
                        <button class="btn-icon" data-action="delete-compra" data-id="${compra.id}">${icon('trash')}</button>
                      </div></td>
                    </tr>`;
                  }).join('')}
                </tbody>
              </table>
            `}
          </div>` : ''}
        </div>
      </div>
    `;

    document.getElementById('cc-toggle-novocartao').onclick = () => { novoCartaoOpen = !novoCartaoOpen; draw(); };
    if (document.getElementById('cc-cor-group')) {
      const corBtns = document.getElementById('cc-cor-group').querySelectorAll('[data-cor]');
      corBtns.forEach((b) => b.onclick = () => {
        novoCartaoCor = b.dataset.cor;
        corBtns.forEach((x) => {
          x.style.border = x === b ? '2px solid var(--primary)' : '2px solid var(--border)';
          x.style.boxShadow = x === b ? '0 0 0 2px var(--primary-soft)' : 'none';
        });
      });
    }
    if (document.getElementById('cc-save-cartao')) {
      document.getElementById('cc-save-cartao').onclick = () => {
        const nome = document.getElementById('cc-nome').value.trim();
        const limite = moneyValue('cc-limite');
        const bankId = document.getElementById('f-cc-vinculo').value;
        if (!nome) { toast('Informe o nome do cartão', 'danger'); return; }
        if (!limite) { toast('Informe o limite do cartão', 'danger'); return; }
        if (!bankId) { toast('Selecione o banco vinculado', 'danger'); return; }
        const payload = {
          nome, limite, bankId,
          cor: novoCartaoCor,
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

    wireQuickAddButtons([{ key: 'cp-categoria', type: 'select-category', catTipo: 'despesa' }, { key: 'cc-vinculo', type: 'select-bank' }]);
    wireCollapsibleNewCategory('cp', () => draw(), { catTipo: 'despesa' });

    const atualizarSuaParte = () => {
      const total = moneyValue('cp-valor');
      const dividido = readDivisoesRows().reduce((s, d) => s + d.valor, 0);
      const el = document.getElementById('cp-sua-parte');
      if (!el) return;
      const suaParte = total - dividido;
      el.textContent = `Sua parte: ${formatCurrency(Math.max(0, suaParte))}${dividido > total ? ' — a soma das divisões passou do valor total!' : ''}`;
      el.style.color = dividido > total ? 'var(--danger)' : 'var(--text)';
    };
    const wireDivisaoRow = (row) => {
      row.querySelectorAll('input').forEach((inp) => inp.oninput = atualizarSuaParte);
      const rm = row.querySelector('[data-remove-divisao]');
      if (rm) rm.onclick = () => { row.remove(); atualizarSuaParte(); };
    };
    if (document.getElementById('cp-dividir')) {
      document.getElementById('cp-divisoes-rows').querySelectorAll('[data-divisao-row]').forEach(wireDivisaoRow);
      document.getElementById('cp-dividir').onchange = (e) => { document.getElementById('cp-divisoes-box').style.display = e.target.checked ? 'block' : 'none'; atualizarSuaParte(); };
      document.getElementById('cp-add-divisao').onclick = () => {
        const box = document.getElementById('cp-divisoes-rows');
        box.insertAdjacentHTML('beforeend', divisaoRowHTML('', ''));
        wireDivisaoRow(box.lastElementChild);
        atualizarSuaParte();
      };
      document.getElementById('cp-valor').addEventListener('input', atualizarSuaParte);
      atualizarSuaParte();
    }

    if (document.getElementById('cp-save')) {
      document.getElementById('cp-save').onclick = () => {
        const descricao = document.getElementById('cp-nome').value.trim();
        const valorTotal = moneyValue('cp-valor');
        const cartaoId = document.getElementById('cp-cartao').value;
        const categoryId = document.getElementById('f-cp-categoria').value;
        if (!descricao) { toast('Informe o nome da compra', 'danger'); return; }
        if (!valorTotal) { toast('Informe um valor', 'danger'); return; }
        if (!cartaoId) { toast('Selecione um cartão', 'danger'); return; }
        if (!categoryId) { toast('Selecione a categoria', 'danger'); return; }
        const divisoes = document.getElementById('cp-dividir').checked ? readDivisoesRows() : [];
        if (divisoes.reduce((s, d) => s + d.valor, 0) > valorTotal) { toast('A soma das divisões não pode passar do valor total', 'danger'); return; }
        const payload = {
          descricao, valorTotal, cartaoId, divisoes,
          data: document.getElementById('cp-data').value,
          categoryId,
          tipo: compraTipo,
          parcelas: compraTipo === 'parcelado' ? Math.max(2, parseInt(document.getElementById('cp-parcelas').value, 10) || 2) : 1,
        };
        if (editingCompra) { Store.update('cartaoCompras', editingCompra.id, payload); toast('Compra atualizada', 'success'); editingCompraId = null; }
        else { Store.add('cartaoCompras', payload); toast('Compra adicionada', 'success'); }
        selectedCartaoId = cartaoId;
        draw();
      };
    }
    if (document.getElementById('cp-cancel-edit')) document.getElementById('cp-cancel-edit').onclick = () => { editingCompraId = null; compraTipo = 'avista'; draw(); };

    container.querySelectorAll('[data-action="select-cartao"]').forEach((tr) => tr.onclick = () => { selectedCartaoId = tr.dataset.id; ccPeriod = { type: 'month', value: monthAddStr(currentMonthStr(), 1) }; draw(); });
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
    container.querySelectorAll('[data-action="edit-compra"]').forEach((b) => b.onclick = () => {
      editingCompraId = b.dataset.id;
      compraTipo = Store.get('cartaoCompras', b.dataset.id).tipo || 'avista';
      draw();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    container.querySelectorAll('[data-action="delete-compra"]').forEach((b) => b.onclick = () => {
      confirmModal({
        title: 'Excluir compra', text: 'Essa ação não pode ser desfeita. Deseja continuar?', confirmLabel: 'Excluir', danger: true,
        onConfirm: () => { Store.remove('cartaoCompras', b.dataset.id); toast('Compra excluída', 'success'); draw(); },
      });
    });
    wirePeriodControl('cc', ccPeriod, draw);
    wireSortableHeaders(container, () => ccFaturaSort, (v) => { ccFaturaSort = v; }, draw);
    if (document.getElementById('cc-pagar-fatura')) document.getElementById('cc-pagar-fatura').onclick = () => {
      if (faturaPaga) {
        reopenCartaoFatura(selected.id, selectedFaturaMonth);
        toast('Fatura reaberta', 'success');
      } else {
        if (!selected.bankId) { toast('Edite o cartão e defina o banco vinculado antes de pagar a fatura', 'danger'); return; }
        payCartaoFatura(selected.id, selectedFaturaMonth, { bankId: selected.bankId, valor: faturaTotal });
        toast('Fatura paga', 'success');
      }
      draw();
    };
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
          <div class="field"><label>Capital inicial</label>${moneyInputHTML('iv-capital', editing ? editing.capitalInicial : '')}</div>
          <div class="field"><label>Aporte mensal</label>${moneyInputHTML('iv-aporte', editing ? editing.aporteMensal : '')}</div>
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
        const capitalInicial = moneyValue('iv-capital');
        if (!nome) { toast('Informe o nome do investimento', 'danger'); return; }
        if (!capitalInicial) { toast('Informe o capital inicial', 'danger'); return; }
        const payload = {
          nome, capitalInicial,
          instituicao: document.getElementById('iv-instituicao').value,
          tipo: document.getElementById('iv-tipo').value,
          data: document.getElementById('iv-data').value,
          aporteMensal: moneyValue('iv-aporte'),
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
    const saldoBancario = extratoBanco !== 'todos' ? ((Store.bankById(extratoBanco) || {}).balance || 0) : Store.state.banks.reduce((s, b) => s + (b.balance || 0), 0);

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
            <option value="Cartão de crédito" ${extratoTipo === 'Cartão de crédito' ? 'selected' : ''}>Cartão de crédito</option>
            <option value="Parcelamento" ${extratoTipo === 'Parcelamento' ? 'selected' : ''}>Parcelamento</option>
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
            <option value="Cartão de crédito" ${conciliacaoTipo === 'Cartão de crédito' ? 'selected' : ''}>Cartão de crédito</option>
            <option value="Parcelamento" ${conciliacaoTipo === 'Parcelamento' ? 'selected' : ''}>Parcelamento</option>
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
function removeMetaCategoria(categoryId, mes) {
  Store.state.metasCategoria = Store.state.metasCategoria.filter((x) => !(x.categoryId === categoryId && x.mes === mes));
  Store.save();
}

let planejamentoNovaMetaOpen = false;

function pagePlanejamento(container) {
  const draw = () => {
    const mes = planejamentoMes;
    const categoriasDespesa = Store.state.categories.filter((c) => (c.tipo || 'despesa') === 'despesa');
    const comMetaIds = new Set(Store.state.metasCategoria.filter((x) => x.mes === mes && x.valor > 0).map((x) => x.categoryId));
    const categoriasSemMeta = categoriasDespesa.filter((c) => !comMetaIds.has(c.id));
    let categoriasComMeta = categoriasDespesa.filter((c) => comMetaIds.has(c.id));
    if (planejamentoBusca) categoriasComMeta = categoriasComMeta.filter((c) => c.name.toLowerCase().includes(planejamentoBusca.toLowerCase()));

    const totalPlanejado = categoriasDespesa.reduce((s, c) => s + metaCategoria(c.id, mes), 0);
    const totalRealizado = categoriasDespesa.reduce((s, c) => s + realizadoCategoria(c.id, mes), 0);

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
        <button type="button" class="btn btn-ghost btn-block" id="pl-toggle-nova" style="justify-content:space-between">
          <span class="btn-toggle-label">${icon('plus')} Nova meta</span>${icon('chevronDown')}
        </button>
        <div id="pl-nova-box" style="display:${planejamentoNovaMetaOpen ? 'block' : 'none'};margin-top:14px">
          ${categoriasSemMeta.length === 0 ? `<div class="row-sub">Todas as categorias de despesa já têm meta definida neste mês.</div>` : `
            <div class="field-row">
              <div class="field"><label>Categoria</label><select id="pl-nova-cat">${categoriasSemMeta.map((c) => `<option value="${c.id}">${c.emoji} ${c.name}</option>`).join('')}</select></div>
              <div class="field"><label>Valor planejado</label>${moneyInputHTML('pl-nova-valor', '')}</div>
            </div>
            <button class="btn btn-primary btn-sm" id="pl-nova-salvar">Salvar meta</button>
          `}
        </div>
      </div>

      <div class="panel">
        <div class="panel-header"><h3>Categorias com meta</h3><input type="text" id="pl-busca" placeholder="Buscar categoria..." style="max-width:280px" value="${planejamentoBusca}" /></div>
        ${categoriasComMeta.length === 0 ? emptyState({ iconName: 'target', title: 'Nenhuma meta definida ainda', text: 'Use "Nova meta" acima para planejar o quanto quer gastar em cada categoria.' }) : categoriasComMeta.map((c) => {
          const planejado = metaCategoria(c.id, mes);
          const realizado = realizadoCategoria(c.id, mes);
          const pct = planejado > 0 ? Math.min(100, Math.round((realizado / planejado) * 100)) : 0;
          return `
          <div style="display:flex;align-items:center;gap:14px;padding:14px 0;border-top:1px solid var(--border-soft)">
            ${categoryAvatar(c.id)}
            <div style="flex:1">
              <strong>${c.name}</strong>
              <div class="row-sub">Planejado: ${formatCurrency(planejado)} · Realizado: ${formatCurrency(realizado)}</div>
              <div class="progress-track" style="margin-top:6px;max-width:280px"><div class="progress-fill" style="width:${pct}%;background:${pct > 100 ? 'var(--danger)' : c.color}"></div></div>
            </div>
            <div class="row-actions">
              <button class="btn-icon" data-action="editar-meta" data-id="${c.id}">${icon('edit')}</button>
              <button class="btn-icon" data-action="remover-meta" data-id="${c.id}">${icon('trash')}</button>
            </div>
          </div>`;
        }).join('')}
      </div>
    `;

    document.getElementById('pl-mes').onchange = (e) => { planejamentoMes = e.target.value; draw(); };
    document.getElementById('pl-busca').oninput = (e) => { planejamentoBusca = e.target.value; draw(); };
    document.getElementById('pl-toggle-nova').onclick = () => { planejamentoNovaMetaOpen = !planejamentoNovaMetaOpen; draw(); };
    if (document.getElementById('pl-nova-salvar')) {
      document.getElementById('pl-nova-salvar').onclick = () => {
        const categoryId = document.getElementById('pl-nova-cat').value;
        const valor = moneyValue('pl-nova-valor');
        if (!valor) { toast('Informe um valor', 'danger'); return; }
        setMetaCategoria(categoryId, mes, valor);
        toast('Meta salva', 'success');
        planejamentoNovaMetaOpen = false;
        draw();
      };
    }
    container.querySelectorAll('[data-action="editar-meta"]').forEach((b) => b.onclick = () => {
      const cat = Store.categoryById(b.dataset.id);
      const overlay = document.getElementById('modal-overlay');
      overlay.innerHTML = `
        <div class="modal-box">
          <h3>Meta de ${cat.name}</h3>
          <p>Defina o valor planejado para ${monthLabel(Number(mes.slice(5, 7)) - 1)} de ${mes.slice(2, 4)}.</p>
          <div class="field"><label>Valor planejado</label>${moneyInputHTML('meta-valor', metaCategoria(b.dataset.id, mes))}</div>
          <div class="modal-actions">
            <button class="btn btn-ghost btn-sm" id="modal-cancel">Cancelar</button>
            <button class="btn btn-primary btn-sm" id="modal-confirm">Salvar</button>
          </div>
        </div>`;
      overlay.classList.add('open');
      overlay.querySelector('#modal-cancel').onclick = () => overlay.classList.remove('open');
      overlay.querySelector('#modal-confirm').onclick = () => {
        setMetaCategoria(b.dataset.id, mes, moneyValue('meta-valor'));
        overlay.classList.remove('open');
        toast('Meta salva', 'success');
        draw();
      };
    });
    container.querySelectorAll('[data-action="remover-meta"]').forEach((b) => b.onclick = () => {
      confirmModal({
        title: 'Remover meta', text: 'Isso remove a meta desta categoria neste mês. Deseja continuar?', confirmLabel: 'Remover', danger: true,
        onConfirm: () => { removeMetaCategoria(b.dataset.id, mes); toast('Meta removida', 'success'); draw(); },
      });
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
        <div class="field"><label>Categoria (opcional)</label>${fieldHTML({ key: 'pz-categoria', type: 'select-category', optional: true, catTipo: 'despesa' }, editing ? editing.categoryId : '')}</div>
        <div class="field"><label>Banco (origem do recurso)</label>${fieldHTML({ key: 'pz-banco', type: 'select-bank' }, editing ? editing.bankId : '')}</div>
      </div>
      <div class="field-row">
        <div class="field"><label>Data da contratação</label><input type="date" id="pz-data-contratacao" value="${editing ? editing.dataContratacao : todayISO()}" /></div>
        <div class="field"><label>Primeira parcela</label><input type="date" id="pz-primeira-parcela" value="${editing ? editing.primeiraParcela || '' : ''}" /></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Valor principal</label>${moneyInputHTML('pz-valor', editing ? editing.valorPrincipal : '')}</div>
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
  wireQuickAddButtons([{ key: 'pz-categoria', type: 'select-category', catTipo: 'despesa' }, { key: 'pz-banco', type: 'select-bank' }]);
  overlay.querySelector('#modal-cancel').onclick = () => overlay.classList.remove('open');
  overlay.querySelector('#modal-confirm').onclick = () => {
    const nome = document.getElementById('pz-nome').value.trim();
    const valorPrincipal = moneyValue('pz-valor');
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
let editingCategoriaCfg = { despesa: null, receita: null };
function categoriasManagerHTML(tipo, title) {
  const editing = editingCategoriaCfg[tipo] ? Store.categoryById(editingCategoriaCfg[tipo]) : null;
  return `
    <div style="padding:12px;border:1px solid var(--border);border-radius:10px;background:var(--bg-input)">
      <div class="row-sub" style="text-transform:uppercase;letter-spacing:0.05em;font-weight:700;color:var(--text-muted);margin-bottom:10px">${title}</div>
      <div class="field-row">
        <div class="field"><label>Nome</label><input type="text" id="cfg-cat-${tipo}-name" placeholder="Ex.: Pet" value="${editing ? editing.name : ''}" /></div>
        <div class="field"><label>Emoji</label>${renderEmojiPicker(`cfg-cat-${tipo}-emoji`, editing ? editing.emoji : '🏷️')}</div>
      </div>
      <button type="button" class="btn btn-primary btn-sm btn-block" id="cfg-cat-${tipo}-save">${editing ? 'Salvar alterações' : 'Criar categoria'}</button>
      ${categoryListHTML(tipo)}
    </div>
  `;
}
function wireCategoriasManagerPanel(tipo, onChange) {
  wireEmojiPicker(`cfg-cat-${tipo}-emoji`);
  document.getElementById(`cfg-cat-${tipo}-save`).onclick = () => {
    const name = document.getElementById(`cfg-cat-${tipo}-name`).value.trim();
    if (!name) { toast('Dê um nome para a categoria', 'danger'); return; }
    const emoji = document.getElementById(`cfg-cat-${tipo}-emoji`).value || '🏷️';
    if (editingCategoriaCfg[tipo]) {
      Store.update('categories', editingCategoriaCfg[tipo], { name, emoji });
      toast('Categoria atualizada', 'success');
      editingCategoriaCfg[tipo] = null;
    } else {
      Store.add('categories', { name, emoji, color: nextCategoryColor(), tipo });
      toast('Categoria criada', 'success');
    }
    onChange();
  };
  document.querySelectorAll(`#cfg-cat-panel-${tipo} [data-action="edit-cat"]`).forEach((b) => b.onclick = () => { editingCategoriaCfg[tipo] = b.dataset.id; onChange(); });
  document.querySelectorAll(`#cfg-cat-panel-${tipo} [data-action="delete-cat"]`).forEach((b) => b.onclick = () => {
    confirmModal({
      title: 'Excluir categoria', text: 'Lançamentos que já usam essa categoria ficarão sem categoria. Deseja continuar?', confirmLabel: 'Excluir', danger: true,
      onConfirm: () => { Store.remove('categories', b.dataset.id); toast('Categoria excluída', 'success'); onChange(); },
    });
  });
  wireCategoryDragDrop(document.getElementById(`cfg-cat-panel-${tipo}`), onChange);
}

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
        <p class="row-sub" style="margin-top:10px">A senha é validada localmente neste navegador (protótipo sem servidor ainda).</p>
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
        <h3 style="margin-bottom:6px">${icon('bag')} Categorias</h3>
        <p class="row-sub" style="margin-bottom:14px">Cadastre, edite e exclua as categorias usadas nos seus lançamentos — tudo em um só lugar.</p>
        <div class="grid-2">
          <div id="cfg-cat-panel-despesa">${categoriasManagerHTML('despesa', 'Categorias de despesa')}</div>
          <div id="cfg-cat-panel-receita">${categoriasManagerHTML('receita', 'Categorias de receita')}</div>
        </div>
      </div>

      <div class="panel">
        <h3 style="margin-bottom:10px">${icon('card')} Gastos do cartão no orçamento</h3>
        <p class="row-sub" style="margin-bottom:14px">A <strong style="color:var(--text)">fatura do cartão</strong> (em Cartões de crédito) sempre segue o ciclo real de fechamento — é o valor exato que você paga ao banco. Já o <strong style="color:var(--text)">Total de gastos</strong> do Dashboard pode contar essas compras de dois jeitos:</p>
        <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:14px">
          <label class="checkbox-row" style="align-items:flex-start;gap:10px">
            <input type="radio" name="cfg-regime-cartao" id="cfg-regime-competencia" ${p.gastoCartaoPorCompra !== false ? 'checked' : ''} style="margin-top:3px" />
            <span><strong style="display:block;color:var(--text)">Pela data da compra</strong><span class="row-sub">O gasto conta no mês em que você comprou, não no mês em que a fatura fecha. Combina com quem se organiza no formato "recebo pra gastar" — o dinheiro já está comprometido no mês da compra, mesmo que o pagamento real da fatura seja só no mês seguinte.</span></span>
          </label>
          <label class="checkbox-row" style="align-items:flex-start;gap:10px">
            <input type="radio" name="cfg-regime-cartao" id="cfg-regime-caixa" ${p.gastoCartaoPorCompra === false ? 'checked' : ''} style="margin-top:3px" />
            <span><strong style="display:block;color:var(--text)">Pela fatura (vencimento)</strong><span class="row-sub">O gasto só conta no mês em que a fatura realmente vence — igual ao dinheiro saindo de fato da sua conta.</span></span>
          </label>
        </div>
        <button class="btn btn-primary btn-sm" id="cfg-save-regime">Salvar</button>
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

    wireCategoriasManagerPanel('despesa', draw);
    wireCategoriasManagerPanel('receita', draw);

    document.getElementById('cfg-avatar-btn').onclick = () => toast('Upload de foto chega em breve', 'info');
    document.getElementById('cfg-save-nome').onclick = () => {
      const nome = document.getElementById('cfg-nome').value.trim();
      if (!nome) { toast('Informe um nome', 'danger'); return; }
      Store.state.profile.name = nome;
      Store.save();
      toast('Nome atualizado', 'success');
      render();
    };
    document.getElementById('cfg-save-senha').onclick = async () => {
      const senha = document.getElementById('cfg-senha').value;
      if (senha.length < 6) { toast('A senha precisa ter no mínimo 6 caracteres', 'danger'); return; }
      const account = Auth.currentUser();
      if (!account) { toast('Sessão inválida', 'danger'); return; }
      const salt = randomHex(16);
      account.passwordHash = await hashPassword(senha, salt);
      account.salt = salt;
      Auth.persist();
      toast('Senha alterada com sucesso', 'success');
      document.getElementById('cfg-senha').value = '';
    };
    document.getElementById('cfg-save-moeda').onclick = () => {
      Store.state.profile.currency = document.getElementById('cfg-moeda').value;
      Store.save();
      toast('Moeda atualizada', 'success');
      render();
    };
    document.getElementById('cfg-save-regime').onclick = () => {
      Store.state.profile.gastoCartaoPorCompra = document.getElementById('cfg-regime-competencia').checked;
      Store.save();
      toast('Preferência salva', 'success');
      render();
    };
    document.getElementById('cfg-logout').onclick = () => {
      confirmModal({
        title: 'Sair da conta', text: 'Você precisará entrar novamente com seu e-mail e senha para acessar seus dados.', confirmLabel: 'Sair',
        onConfirm: () => logout(),
      });
    };

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

