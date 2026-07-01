/* Fin360 — estado da aplicação + persistência local (protótipo, sem backend) */

const STORAGE_KEY = 'fin360_state_v3';

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function defaultState() {
  return {
    theme: 'dark',
    hideValues: false,
    context: 'pessoal',
    collapsed: false,
    profile: { name: 'Mateus', email: 'mateusgiacomollilemmertz@gmail.com', currency: 'BRL', gastoCartaoPorCompra: true },
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
    // recebimentos: {id,descricao,valor,data,categoryId,bankId,tipo:'unico'|'recorrente'|'parcelado',parcelas,observacao,createdAt}
    recebimentos: [],
    recebimentosRecebidos: [], // {id, recebimentoId, mes:'YYYY-MM'}
    // cofrinhos: {id,nome,meta,atual,icone,cor,prazo,observacao,aporteAutomatico,diaAporte,createdAt}
    cofrinhos: [],
    transferencias: [], // {id,deId,paraId,valor,data,observacao,createdAt}
    // cartoes: {id,nome,banco,limite,diaFechamento,diaVencimento,cor}
    cartoes: [],
    // cartaoCompras: {id,cartaoId,descricao,categoryId,valorTotal,data,tipo:'avista'|'parcelado'|'recorrente',parcelas}
    cartaoCompras: [],
    cartaoFaturasPagas: [], // {id, cartaoId, mes:'YYYY-MM'}
    investimentos: [],
    conciliacoes: [], // array de chaves de transação (ex: 'gf:id:2026-06') marcadas como conciliadas
    metasCategoria: [], // {id, categoryId, mes:'YYYY-MM', valor}
    // parcelamentos: {id,nome,tipo,sistema:'price'|'sac',categoryId,bankId,dataContratacao,primeiraParcela,valorPrincipal,numParcelas,taxaJurosMensal,observacao,createdAt}
    parcelamentos: [],
    parcelamentosPagamentos: [], // {id, parcelamentoId, numero}
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
  const d = new Date(gf.createdAt || Date.now());
  const createdMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
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
/* ---- Racha / divisão de compras de cartão com outras pessoas ---- */
function compraValorDividido(compra) {
  return (compra.divisoes || []).reduce((s, d) => s + (d.valor || 0), 0);
}
function compraValorMeu(compra) {
  return Math.max(0, compra.valorTotal - compraValorDividido(compra));
}
function compraFracaoMinha(compra) {
  return compra.valorTotal > 0 ? compraValorMeu(compra) / compra.valorTotal : 1;
}

// "caixa" = mês da fatura em que a compra realmente é cobrada (respeita o dia de fechamento do cartão)
// "competencia" = mês em que a compra foi feita (útil pra quem organiza o orçamento por "recebo pra gastar")
function compraBaseMonth(compra, cartao, regime) {
  const compraMonth = compra.data.slice(0, 7);
  if (regime === 'caixa') {
    const dia = parseInt(compra.data.slice(8, 10), 10);
    const fechamento = cartao && cartao.diaFechamento;
    if (fechamento && dia > fechamento) return monthAddStr(compraMonth, 1);
  }
  return compraMonth;
}
function compraOccurrenceInMonth(compra, mStr, cartao, regime) {
  const baseMonth = compraBaseMonth(compra, cartao, regime);
  const fracaoMinha = compraFracaoMinha(compra);
  let base = null;
  if (compra.tipo === 'parcelado') {
    const parcelas = Math.max(1, compra.parcelas || 1);
    for (let i = 0; i < parcelas; i++) {
      if (monthAddStr(baseMonth, i) === mStr) {
        const valorParcela = Math.round((compra.valorTotal / parcelas) * 100) / 100;
        base = { valor: valorParcela, parcelaLabel: `${i + 1}/${parcelas}` };
        break;
      }
    }
  } else if (compra.tipo === 'recorrente') {
    if (mStr >= baseMonth) base = { valor: compra.valorTotal, parcelaLabel: '—' };
  } else {
    // à vista
    if (mStr === baseMonth) base = { valor: compra.valorTotal, parcelaLabel: '1/1' };
  }
  if (!base) return null;
  return { ...base, valorMeu: Math.round(base.valor * fracaoMinha * 100) / 100 };
}
function regimeGastoCartao() {
  return Store.state.profile.gastoCartaoPorCompra !== false ? 'competencia' : 'caixa';
}
// fatura real do cartão — sempre pelo ciclo de fechamento, é o que você de fato paga ao banco naquele mês
function cartaoComprasForMonth(cartaoId, mStr) {
  const cartao = Store.get('cartoes', cartaoId);
  return Store.state.cartaoCompras
    .filter((c) => c.cartaoId === cartaoId)
    .map((c) => ({ compra: c, occurrence: compraOccurrenceInMonth(c, mStr, cartao, 'caixa') }))
    .filter((x) => x.occurrence);
}
function cartaoFaturaForMonth(cartaoId, mStr) {
  return cartaoComprasForMonth(cartaoId, mStr).reduce((s, x) => s + x.occurrence.valor, 0);
}
// custo real pro seu orçamento pessoal — segue o regime escolhido em Configurações (padrão: mês da compra)
// e já desconta a parte rachada com outras pessoas
function cartaoComprasCustoRealForMonth(cartaoId, mStr) {
  const cartao = Store.get('cartoes', cartaoId);
  const regime = regimeGastoCartao();
  return Store.state.cartaoCompras
    .filter((c) => c.cartaoId === cartaoId)
    .map((c) => ({ compra: c, occurrence: compraOccurrenceInMonth(c, mStr, cartao, regime) }))
    .filter((x) => x.occurrence);
}
function cartaoCustoRealForMonth(cartaoId, mStr) {
  return cartaoComprasCustoRealForMonth(cartaoId, mStr).reduce((s, x) => s + x.occurrence.valorMeu, 0);
}
function allCartoesCustoRealForMonth(mStr) {
  return Store.state.cartoes.reduce((s, c) => s + cartaoCustoRealForMonth(c.id, mStr), 0);
}
function allCartoesFaturaForMonth(mStr) {
  return Store.state.cartoes.reduce((s, c) => s + cartaoFaturaForMonth(c.id, mStr), 0);
}
/* ============ Recorrência: recebimentos (único / recorrente / parcelado) ============ */
function recebimentoOccurrenceInMonth(receb, mStr) {
  const recebMonth = receb.data.slice(0, 7);
  if (receb.tipo === 'parcelado') {
    const parcelas = Math.max(1, receb.parcelas || 1);
    for (let i = 0; i < parcelas; i++) {
      if (monthAddStr(recebMonth, i) === mStr) {
        const valorParcela = Math.round((receb.valor / parcelas) * 100) / 100;
        return { valor: valorParcela, parcelaLabel: `${i + 1}/${parcelas}` };
      }
    }
    return null;
  }
  if (receb.tipo === 'recorrente') {
    if (mStr >= recebMonth) return { valor: receb.valor, parcelaLabel: '—' };
    return null;
  }
  // único
  if (mStr === recebMonth) return { valor: receb.valor, parcelaLabel: '1/1' };
  return null;
}
function isRecebimentoRecebido(recebimentoId, mStr) {
  return Store.state.recebimentosRecebidos.some((p) => p.recebimentoId === recebimentoId && p.mes === mStr);
}
function toggleRecebimentoRecebido(recebimentoId, mStr) {
  const list = Store.state.recebimentosRecebidos;
  const idx = list.findIndex((p) => p.recebimentoId === recebimentoId && p.mes === mStr);
  if (idx > -1) list.splice(idx, 1);
  else list.push({ id: uid(), recebimentoId, mes: mStr });
  Store.save();
}
function recebimentosForMonth(mStr) {
  return Store.state.recebimentos
    .map((r) => ({ receb: r, occurrence: recebimentoOccurrenceInMonth(r, mStr) }))
    .filter((x) => x.occurrence)
    .map((x) => ({
      ...x.receb,
      valor: x.occurrence.valor,
      parcelaLabel: x.occurrence.parcelaLabel,
      mesRef: mStr,
      recebido: isRecebimentoRecebido(x.receb.id, mStr),
      dataOcorrencia: `${mStr}-${x.receb.data.slice(8, 10)}`,
    }));
}

/* ============ Motor de transações unificado (Extrato / Conciliação) ============ */
function monthsBetweenISO(start, end) {
  const months = [];
  let cur = start.slice(0, 7);
  const endM = end.slice(0, 7);
  let guard = 0;
  while (cur <= endM && guard < 60) { months.push(cur); cur = monthAddStr(cur, 1); guard++; }
  return months;
}
function buildTransacoes(start, end) {
  const months = monthsBetweenISO(start, end);
  const txs = [
    ...months.flatMap((m) => gastosFixosForMonth(m)).map((g) => ({
      key: `gf:${g.id}:${g.mesRef}`, data: g.vencimentoISO, descricao: g.nome, tipo: 'Gasto fixo',
      bankId: g.bankId, categoryId: g.categoryId, status: g.pago ? 'pago' : 'pendente', valor: g.valor, sinal: -1,
    })),
    ...Store.state.gastosVariaveis.map((g) => ({
      key: `gv:${g.id}`, data: g.data, descricao: g.descricao, tipo: 'Gasto variável',
      bankId: g.bankId, categoryId: g.categoryId, status: g.status, valor: g.valor, sinal: -1,
    })),
    ...months.flatMap((m) => recebimentosForMonth(m)).map((r) => ({
      key: `rc:${r.id}:${r.mesRef}`, data: r.dataOcorrencia, descricao: r.descricao, tipo: 'Recebimento',
      bankId: r.bankId, categoryId: r.categoryId, status: r.recebido ? 'recebido' : 'pendente', valor: r.valor, sinal: 1,
    })),
  ];
  return txs.filter((t) => t.data >= start && t.data <= end);
}
function isConciliado(key) {
  return Store.state.conciliacoes.includes(key);
}
function toggleConciliado(key) {
  const list = Store.state.conciliacoes;
  const idx = list.indexOf(key);
  if (idx > -1) list.splice(idx, 1); else list.push(key);
  Store.save();
}

/* ============ Parcelamentos: amortização Price / SAC ============ */
function dateAddMonthsISO(iso, n) {
  const mStr = monthAddStr(iso.slice(0, 7), n);
  const day = clampDayToMonth(mStr, parseInt(iso.slice(8, 10), 10));
  return `${mStr}-${String(day).padStart(2, '0')}`;
}
function amortizacaoPrice(principal, taxaMensalPct, n) {
  const i = taxaMensalPct / 100;
  const pmt = i === 0 ? principal / n : (principal * i) / (1 - Math.pow(1 + i, -n));
  let saldo = principal;
  const parcelas = [];
  for (let k = 1; k <= n; k++) {
    const juros = saldo * i;
    const amort = Math.min(saldo, pmt - juros);
    saldo = Math.max(0, saldo - amort);
    parcelas.push({ numero: k, valor: amort + juros, juros, amortizacao: amort, saldo });
  }
  return parcelas;
}
function amortizacaoSAC(principal, taxaMensalPct, n) {
  const i = taxaMensalPct / 100;
  const amortConst = principal / n;
  let saldo = principal;
  const parcelas = [];
  for (let k = 1; k <= n; k++) {
    const juros = saldo * i;
    saldo = Math.max(0, saldo - amortConst);
    parcelas.push({ numero: k, valor: amortConst + juros, juros, amortizacao: amortConst, saldo });
  }
  return parcelas;
}
function parcelamentoSchedule(p) {
  return p.sistema === 'sac' ? amortizacaoSAC(p.valorPrincipal, p.taxaJurosMensal, p.numParcelas) : amortizacaoPrice(p.valorPrincipal, p.taxaJurosMensal, p.numParcelas);
}
function parcelamentoVencimento(p, numero) {
  return dateAddMonthsISO(p.primeiraParcela || p.dataContratacao, numero - 1);
}
function isParcelaPaga(parcelamentoId, numero) {
  return Store.state.parcelamentosPagamentos.some((x) => x.parcelamentoId === parcelamentoId && x.numero === numero);
}
function toggleParcelaPaga(parcelamentoId, numero) {
  const list = Store.state.parcelamentosPagamentos;
  const idx = list.findIndex((x) => x.parcelamentoId === parcelamentoId && x.numero === numero);
  if (idx > -1) list.splice(idx, 1); else list.push({ id: uid(), parcelamentoId, numero });
  Store.save();
}
function parcelasPagasCount(parcelamentoId) {
  return Store.state.parcelamentosPagamentos.filter((x) => x.parcelamentoId === parcelamentoId).length;
}
function parcelamentoQuitado(p) {
  return parcelasPagasCount(p.id) >= p.numParcelas;
}
function proximaParcelaPendente(p) {
  const schedule = parcelamentoSchedule(p);
  return schedule.find((s) => !isParcelaPaga(p.id, s.numero)) || null;
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
  const cartao = Store.get('cartoes', cartaoId);
  return Store.state.cartaoCompras.filter((c) => c.cartaoId === cartaoId && c.tipo === 'parcelado' && compraOccurrenceInMonth(c, mStr, cartao, 'caixa')).length;
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

  resetFinancialData() {
    const keep = { theme: this.state.theme, hideValues: this.state.hideValues, context: this.state.context, collapsed: this.state.collapsed, profile: this.state.profile, categories: this.state.categories };
    this.state = Object.assign(defaultState(), keep);
    this.save();
  },

  exportBackupJSON() {
    return JSON.stringify(this.state, null, 2);
  },
  importBackupJSON(json) {
    const parsed = JSON.parse(json);
    this.state = Object.assign(defaultState(), parsed);
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
const CURRENCIES = {
  BRL: { locale: 'pt-BR', symbol: 'R$' },
  USD: { locale: 'en-US', symbol: '$' },
  EUR: { locale: 'de-DE', symbol: '€' },
  GBP: { locale: 'en-GB', symbol: '£' },
};
function formatCurrency(value) {
  const v = Number(value) || 0;
  const code = (Store.state && Store.state.profile.currency) || 'BRL';
  const cfg = CURRENCIES[code] || CURRENCIES.BRL;
  if (Store.state && Store.state.hideValues) return `${cfg.symbol} •••••`;
  return v.toLocaleString(cfg.locale, { style: 'currency', currency: code });
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
