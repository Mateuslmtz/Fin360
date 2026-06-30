/* Fin360 — estado da aplicação + persistência local (protótipo, sem backend) */

const STORAGE_KEY = 'fin360_state_v2';

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function defaultState() {
  return {
    theme: 'dark',
    hideValues: false,
    context: 'pessoal',
    collapsed: false,
    profile: { name: 'Mateus' },
    categories: [
      { id: 'cat-alimentacao', name: 'Alimentação', color: '#22c55e', emoji: '🍽️' },
      { id: 'cat-assinaturas', name: 'Assinaturas', color: '#a855f7', emoji: '📺' },
      { id: 'cat-cofrinho', name: 'Cofrinho', color: '#22d3ee', emoji: '🐷' },
      { id: 'cat-educacao', name: 'Educação', color: '#3866ff', emoji: '🎓' },
      { id: 'cat-lazer', name: 'Lazer', color: '#f5a623', emoji: '🎮' },
      { id: 'cat-moradia', name: 'Moradia', color: '#f04848', emoji: '🏠' },
      { id: 'cat-saude', name: 'Saúde', color: '#22c55e', emoji: '💊' },
      { id: 'cat-transporte', name: 'Transporte', color: '#3866ff', emoji: '🚗' },
      { id: 'cat-outros', name: 'Outros', color: '#8b93ac', emoji: '📦' },
    ],
    banks: [],
    // gastosFixos: {id,nome,valor,diaVencimento(1-31),categoryId,bankId,ativo,observacao,createdAt}
    // recorrentes — "pago/pendente" é controlado por mês em gastosFixosPagamentos
    gastosFixos: [],
    gastosFixosPagamentos: [], // {id, gastoFixoId, mes:'YYYY-MM'}
    gastosVariaveis: [],
    recebimentos: [],
    cofrinhos: [],
    // cartoes: {id,nome,banco,limite,diaFechamento,diaVencimento,cor}
    cartoes: [],
    // cartaoCompras: {id,cartaoId,descricao,categoryId,valorTotal,data,tipo:'avista'|'parcelado'|'recorrente',parcelas}
    cartaoCompras: [],
    cartaoFaturasPagas: [], // {id, cartaoId, mes:'YYYY-MM'}
    investimentos: [],
  };
}

/* ============ Recorrência: gastos fixos ============ */
function daysInMonth(year, month0) {
  return new Date(year, month0 + 1, 0).getDate();
}
function clampDayToMonth(mStr, day) {
  const [y, m] = mStr.split('-').map(Number);
  return Math.min(day || 1, daysInMonth(y, m - 1));
}
function gastoFixoVencimentoISO(gf, mStr) {
  const day = clampDayToMonth(mStr, gf.diaVencimento);
  return `${mStr}-${String(day).padStart(2, '0')}`;
}
function gastoFixoAppliesToMonth(gf, mStr) {
  const createdMonth = new Date(gf.createdAt || Date.now()).toISOString().slice(0, 7);
  return gf.ativo !== false && mStr >= createdMonth;
}
function isGastoFixoPago(gastoFixoId, mStr) {
  return Store.state.gastosFixosPagamentos.some((p) => p.gastoFixoId === gastoFixoId && p.mes === mStr);
}
function toggleGastoFixoPago(gastoFixoId, mStr) {
  const list = Store.state.gastosFixosPagamentos;
  const idx = list.findIndex((p) => p.gastoFixoId === gastoFixoId && p.mes === mStr);
  if (idx > -1) list.splice(idx, 1);
  else list.push({ id: uid(), gastoFixoId, mes: mStr });
  Store.save();
}
function gastosFixosForMonth(mStr) {
  return Store.state.gastosFixos
    .filter((gf) => gastoFixoAppliesToMonth(gf, mStr))
    .map((gf) => ({ ...gf, vencimentoISO: gastoFixoVencimentoISO(gf, mStr), pago: isGastoFixoPago(gf.id, mStr), mesRef: mStr }));
}

/* ============ Recorrência: compras de cartão (à vista / parcelado / recorrente) ============ */
function monthAddStr(mStr, n) {
  const [y, m] = mStr.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function compraOccurrenceInMonth(compra, mStr) {
  const compraMonth = compra.data.slice(0, 7);
  if (compra.tipo === 'parcelado') {
    const parcelas = Math.max(1, compra.parcelas || 1);
    for (let i = 0; i < parcelas; i++) {
      if (monthAddStr(compraMonth, i) === mStr) {
        const valorParcela = Math.round((compra.valorTotal / parcelas) * 100) / 100;
        return { valor: valorParcela, parcelaLabel: `${i + 1}/${parcelas}` };
      }
    }
    return null;
  }
  if (compra.tipo === 'recorrente') {
    if (mStr >= compraMonth) return { valor: compra.valorTotal, parcelaLabel: '—' };
    return null;
  }
  // à vista
  if (mStr === compraMonth) return { valor: compra.valorTotal, parcelaLabel: '1/1' };
  return null;
}
function cartaoComprasForMonth(cartaoId, mStr) {
  return Store.state.cartaoCompras
    .filter((c) => c.cartaoId === cartaoId)
    .map((c) => ({ compra: c, occurrence: compraOccurrenceInMonth(c, mStr) }))
    .filter((x) => x.occurrence);
}
function cartaoFaturaForMonth(cartaoId, mStr) {
  return cartaoComprasForMonth(cartaoId, mStr).reduce((s, x) => s + x.occurrence.valor, 0);
}
function allCartoesFaturaForMonth(mStr) {
  return Store.state.cartoes.reduce((s, c) => s + cartaoFaturaForMonth(c.id, mStr), 0);
}
function isCartaoFaturaPaga(cartaoId, mStr) {
  return Store.state.cartaoFaturasPagas.some((p) => p.cartaoId === cartaoId && p.mes === mStr);
}
function toggleCartaoFaturaPaga(cartaoId, mStr) {
  const list = Store.state.cartaoFaturasPagas;
  const idx = list.findIndex((p) => p.cartaoId === cartaoId && p.mes === mStr);
  if (idx > -1) list.splice(idx, 1);
  else list.push({ id: uid(), cartaoId, mes: mStr });
  Store.save();
}
function parcelasAtivasCount(cartaoId) {
  const mStr = currentMonthStr();
  return Store.state.cartaoCompras.filter((c) => c.cartaoId === cartaoId && c.tipo === 'parcelado' && compraOccurrenceInMonth(c, mStr)).length;
}

const Store = {
  state: null,

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      this.state = raw ? Object.assign(defaultState(), JSON.parse(raw)) : defaultState();
    } catch (e) {
      this.state = defaultState();
    }
    return this.state;
  },

  save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  },

  reset() {
    this.state = defaultState();
    this.save();
  },

  // ---- generic collection helpers ----
  add(collection, item) {
    item.id = item.id || uid();
    item.createdAt = item.createdAt || Date.now();
    this.state[collection].push(item);
    this.save();
    return item;
  },
  update(collection, id, patch) {
    const list = this.state[collection];
    const idx = list.findIndex((i) => i.id === id);
    if (idx > -1) {
      list[idx] = Object.assign({}, list[idx], patch);
      this.save();
      return list[idx];
    }
    return null;
  },
  remove(collection, id) {
    this.state[collection] = this.state[collection].filter((i) => i.id !== id);
    this.save();
  },
  get(collection, id) {
    return this.state[collection].find((i) => i.id === id) || null;
  },

  categoryById(id) {
    return this.state.categories.find((c) => c.id === id) || null;
  },
  bankById(id) {
    return this.state.banks.find((b) => b.id === id) || null;
  },
};

/* ============ Format helpers ============ */
function formatCurrency(value) {
  const v = Number(value) || 0;
  if (Store.state && Store.state.hideValues) return 'R$ •••••';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateBR(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function monthLabel(monthIdx) {
  const labels = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return labels[monthIdx];
}

function isSameMonth(iso, monthStr) {
  // monthStr format: 'YYYY-MM'
  return !!iso && iso.slice(0, 7) === monthStr;
}

function isSameYear(iso, year) {
  return !!iso && iso.slice(0, 4) === String(year);
}

function currentMonthStr() {
  return todayISO().slice(0, 7);
}

function daysBetween(isoA, isoB) {
  const a = new Date(isoA + 'T00:00:00');
  const b = new Date(isoB + 'T00:00:00');
  return Math.round((b - a) / 86400000);
}
