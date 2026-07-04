/* Fin360 — estado da aplicação + persistência local (protótipo, sem backend) */

const STORAGE_KEY_BASE = 'fin360_state_v3';

function storageKey() {
  const userId = (typeof Auth !== 'undefined' && Auth.currentUserId()) || 'default';
  return `${STORAGE_KEY_BASE}_${userId}`;
}

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
      { id: 'cat-alimentacao', name: 'Alimentação', color: '#22c55e', emoji: '🍽️', tipo: 'despesa' },
      { id: 'cat-assinaturas', name: 'Assinaturas', color: '#a855f7', emoji: '📺', tipo: 'despesa' },
      { id: 'cat-cofrinho', name: 'Cofrinho', color: '#22d3ee', emoji: '🐷', tipo: 'despesa' },
      { id: 'cat-educacao', name: 'Educação', color: '#3866ff', emoji: '🎓', tipo: 'despesa' },
      { id: 'cat-lazer', name: 'Lazer', color: '#f5a623', emoji: '🎮', tipo: 'despesa' },
      { id: 'cat-moradia', name: 'Moradia', color: '#f04848', emoji: '🏠', tipo: 'despesa' },
      { id: 'cat-saude', name: 'Saúde', color: '#22c55e', emoji: '💊', tipo: 'despesa' },
      { id: 'cat-transporte', name: 'Transporte', color: '#3866ff', emoji: '🚗', tipo: 'despesa' },
      { id: 'cat-outros', name: 'Outros', color: '#8b93ac', emoji: '📦', tipo: 'despesa' },
      { id: 'cat-salario', name: 'Salário', color: '#3866ff', emoji: '💼', tipo: 'receita' },
      { id: 'cat-freelancer', name: 'Freelancer', color: '#22c55e', emoji: '💻', tipo: 'receita' },
      { id: 'cat-comissao', name: 'Comissão', color: '#a855f7', emoji: '🤝', tipo: 'receita' },
      { id: 'cat-renda-extra', name: 'Renda Extra', color: '#f5a623', emoji: '✨', tipo: 'receita' },
      { id: 'cat-reembolso', name: 'Reembolso', color: '#22d3ee', emoji: '🔄', tipo: 'receita' },
      { id: 'cat-outros-receita', name: 'Outros', color: '#8b93ac', emoji: '📦', tipo: 'receita' },
    ],
    banks: [],
    // gastosFixos: {id,nome,valor,diaVencimento(1-31),categoryId,bankId,ativo,inicioMes(opcional),fimMes(opcional, exclusivo),observacao,createdAt,
    //   historico:[{id,mes:'YYYY-MM',valor,diaVencimento}] (valor/dia vigentes a partir de cada mês — ver gastoFixoConfigParaMes)}
    // recorrentes — "pago/pendente" é controlado por mês em gastosFixosPagamentos
    gastosFixos: [],
    gastosFixosPagamentos: [], // {id, gastoFixoId, mes:'YYYY-MM', bankId, data, valor}
    gastosFixosMesesOcultos: [], // {id, gastoFixoId, mes:'YYYY-MM'} — ocorrência excluída só naquele mês ("Apenas este mês")
    gastosVariaveis: [],
    // recebimentos: {id,descricao,valor,data,categoryId,bankId,tipo:'unico'|'recorrente'|'parcelado',parcelas,dataFinal(recorrente, opcional),observacao,createdAt}
    recebimentos: [],
    recebimentosRecebidos: [], // {id, recebimentoId, mes:'YYYY-MM'}
    // cofrinhos: {id,nome,meta,atual,icone,cor,prazo,observacao,aporteAutomatico,diaAporte,valorAporte,contaOrigemId,ultimoAporteMes,createdAt}
    cofrinhos: [],
    transferencias: [], // {id,deId,paraId,valor,data,observacao,createdAt}
    // cartoes: {id,nome,bankId,limite,diaFechamento,diaVencimento,cor}
    cartoes: [],
    // cartaoCompras: {id,cartaoId,descricao,categoryId,valorTotal,data,tipo:'avista'|'parcelado'|'recorrente',parcelas}
    cartaoCompras: [],
    cartaoFaturasPagas: [], // {id, cartaoId, mes:'YYYY-MM', bankId, valor, ledgerApplied}
    investimentos: [],
    conciliacoes: [], // array de chaves de transação (ex: 'gf:id:2026-06') marcadas como conciliadas
    metasCategoria: [], // {id, categoryId, mes:'YYYY-MM', valor}
    // parcelamentos: {id,nome,tipo,sistema:'price'|'sac',categoryId,bankId,dataContratacao,primeiraParcela,valorPrincipal,numParcelas,taxaJurosMensal,observacao,createdAt}
    parcelamentos: [],
    parcelamentosPagamentos: [], // {id, parcelamentoId, numero, valor, bankId, data, ledgerApplied}
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
function gastoFixoCreatedMonth(gf) {
  if (gf.inicioMes) return gf.inicioMes;
  const d = new Date(gf.createdAt || Date.now());
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function isGastoFixoMesOculto(gastoFixoId, mStr) {
  return Store.state.gastosFixosMesesOcultos.some((p) => p.gastoFixoId === gastoFixoId && p.mes === mStr);
}
function gastoFixoAppliesToMonth(gf, mStr) {
  return gf.ativo !== false && mStr >= gastoFixoCreatedMonth(gf) && (!gf.fimMes || mStr < gf.fimMes) && !isGastoFixoMesOculto(gf.id, mStr);
}
function gastoFixoPagamento(gastoFixoId, mStr) {
  return Store.state.gastosFixosPagamentos.find((p) => p.gastoFixoId === gastoFixoId && p.mes === mStr) || null;
}
function isGastoFixoPago(gastoFixoId, mStr) {
  return !!gastoFixoPagamento(gastoFixoId, mStr);
}
// registra (ou substitui) a baixa de um mês específico: banco usado, data e valor efetivamente pago.
// o valor base do gasto fixo (recorrência) não é alterado — só afeta esta competência.
function payGastoFixo(gastoFixoId, mStr, { bankId, data, valor }) {
  const list = Store.state.gastosFixosPagamentos;
  const idx = list.findIndex((p) => p.gastoFixoId === gastoFixoId && p.mes === mStr);
  if (idx > -1) Store.applyBankDelta(list[idx].bankId, list[idx].valor); // desfaz a baixa anterior, se houver
  const record = { id: idx > -1 ? list[idx].id : uid(), gastoFixoId, mes: mStr, bankId, data, valor, ledgerApplied: true };
  if (idx > -1) list[idx] = record; else list.push(record);
  Store.applyBankDelta(bankId, -valor);
  Store.save();
}
function reopenGastoFixo(gastoFixoId, mStr) {
  const list = Store.state.gastosFixosPagamentos;
  const idx = list.findIndex((p) => p.gastoFixoId === gastoFixoId && p.mes === mStr);
  if (idx > -1) {
    Store.applyBankDelta(list[idx].bankId, list[idx].valor);
    list.splice(idx, 1);
  }
  Store.save();
}
// esconde só esta ocorrência (mês) — o gasto fixo continua normal nos demais meses; desfaz a baixa deste mês, se houver
function deleteGastoFixoMes(gastoFixoId, mStr) {
  const pagamento = gastoFixoPagamento(gastoFixoId, mStr);
  if (pagamento) {
    Store.applyBankDelta(pagamento.bankId, pagamento.valor);
    Store.state.gastosFixosPagamentos = Store.state.gastosFixosPagamentos.filter((p) => p.id !== pagamento.id);
  }
  Store.state.gastosFixosMesesOcultos.push({ id: uid(), gastoFixoId, mes: mStr });
  Store.save();
}
// encerra a recorrência a partir deste mês (inclusive) — meses anteriores ficam intactos, histórico preservado
function endGastoFixoFromMonth(gastoFixoId, mStr) {
  const afetados = Store.state.gastosFixosPagamentos.filter((p) => p.gastoFixoId === gastoFixoId && p.mes >= mStr);
  afetados.forEach((p) => Store.applyBankDelta(p.bankId, p.valor));
  Store.state.gastosFixosPagamentos = Store.state.gastosFixosPagamentos.filter((p) => !(p.gastoFixoId === gastoFixoId && p.mes >= mStr));
  Store.update('gastosFixos', gastoFixoId, { fimMes: mStr });
}
// valor de fato pago nesta competência (pode diferir do valor base recorrente); cai pro valor base se ainda não foi pago
function gastoFixoValorEfetivo(g) {
  return g.pago && g.pagamento ? g.pagamento.valor : g.valor;
}
// valor/dia de vencimento vigentes num mês específico — respeita alterações aplicadas só "deste mês em diante"
function gastoFixoConfigParaMes(gf, mStr) {
  const hist = (gf.historico || []).filter((h) => h.mes <= mStr);
  if (!hist.length) return { valor: gf.valor, diaVencimento: gf.diaVencimento };
  return hist.reduce((latest, h) => (h.mes > latest.mes ? h : latest));
}
function gastosFixosForMonth(mStr) {
  return Store.state.gastosFixos
    .filter((gf) => gastoFixoAppliesToMonth(gf, mStr))
    .map((gf) => {
      const cfg = gastoFixoConfigParaMes(gf, mStr);
      const pagamento = gastoFixoPagamento(gf.id, mStr);
      return { ...gf, valor: cfg.valor, diaVencimento: cfg.diaVencimento, vencimentoISO: gastoFixoVencimentoISO(cfg, mStr), pago: !!pagamento, pagamento, mesRef: mStr };
    });
}
// igual gastosFixosForMonth, mas inclui os inativos (pra tela de listagem não "sumir" com o botão de reativar)
function gastosFixosForMonthAll(mStr) {
  return Store.state.gastosFixos
    .filter((gf) => mStr >= gastoFixoCreatedMonth(gf) && (!gf.fimMes || mStr < gf.fimMes) && !isGastoFixoMesOculto(gf.id, mStr))
    .map((gf) => {
      const cfg = gastoFixoConfigParaMes(gf, mStr);
      const pagamento = gastoFixoPagamento(gf.id, mStr);
      return { ...gf, valor: cfg.valor, diaVencimento: cfg.diaVencimento, vencimentoISO: gastoFixoVencimentoISO(cfg, mStr), pago: !!pagamento, pagamento, mesRef: mStr };
    });
}
// aplica uma alteração de valor/dia de vencimento — 'deste-mes' preserva o histórico anterior a partir do mês de
// referência; 'historico' reescreve tudo (afeta só competências ainda não pagas, já que a baixa já feita é imutável)
function updateGastoFixoComHistorico(gastoFixoId, mStrReferencia, payload, modo) {
  const gf = Store.get('gastosFixos', gastoFixoId);
  const base = (gf.historico && gf.historico.length) ? gf.historico : [{ id: uid(), mes: gastoFixoCreatedMonth(gf), valor: gf.valor, diaVencimento: gf.diaVencimento }];
  let historico;
  if (modo === 'historico') {
    historico = [{ id: uid(), mes: gastoFixoCreatedMonth(gf), valor: payload.valor, diaVencimento: payload.diaVencimento }];
  } else {
    historico = base.filter((h) => h.mes !== mStrReferencia);
    historico.push({ id: uid(), mes: mStrReferencia, valor: payload.valor, diaVencimento: payload.diaVencimento });
  }
  Store.update('gastosFixos', gastoFixoId, Object.assign({}, payload, { historico }));
}

/* ============ Recorrência: compras de cartão (à vista / parcelado / recorrente) ============ */
function monthAddStr(mStr, n) {
  const [y, m] = mStr.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function monthsDiffStr(a, b) {
  const [ya, ma] = a.split('-').map(Number);
  const [yb, mb] = b.split('-').map(Number);
  return (yb - ya) * 12 + (mb - ma);
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
function allCartoesFaturaForMonth(mStr) {
  return Store.state.cartoes.reduce((s, c) => s + cartaoFaturaForMonth(c.id, mStr), 0);
}
// custo real (sua parte) sempre no regime "caixa" — usado pra marcar como "pago" quando a fatura é quitada,
// independente do regime de exibição escolhido em Configurações (competência x caixa)
function cartaoCustoRealCaixaForMonth(cartaoId, mStr) {
  const cartao = Store.get('cartoes', cartaoId);
  return Store.state.cartaoCompras
    .filter((c) => c.cartaoId === cartaoId)
    .map((c) => ({ compra: c, occurrence: compraOccurrenceInMonth(c, mStr, cartao, 'caixa') }))
    .filter((x) => x.occurrence)
    .reduce((s, x) => s + x.occurrence.valorMeu, 0);
}
// limite realmente comprometido: tudo que já foi lançado e ainda não foi quitado, igual um cartão de verdade —
// à vista conta até a fatura ser paga, parcelado segura o limite de TODAS as parcelas que faltam (inclusive
// as de meses futuros) e assinatura conta só as cobranças já feitas (até a fatura corrente). Pagar uma fatura
// libera de volta a parte dela.
function cartaoLimiteUsado(cartaoId) {
  const cartao = Store.get('cartoes', cartaoId);
  const atual = currentMonthStr();
  let usado = 0;
  Store.state.cartaoCompras
    .filter((c) => c.cartaoId === cartaoId)
    .forEach((c) => {
      const base = compraBaseMonth(c, cartao, 'caixa');
      let ultima = base;
      if (c.tipo === 'parcelado') ultima = monthAddStr(base, Math.max(1, c.parcelas || 1) - 1);
      else if (c.tipo === 'recorrente') ultima = base > atual ? base : atual;
      let mStr = base;
      let guard = 0;
      while (mStr <= ultima && guard < 600) {
        if (!isCartaoFaturaPaga(cartaoId, mStr)) {
          const occ = compraOccurrenceInMonth(c, mStr, cartao, 'caixa');
          if (occ) usado += occ.valor;
        }
        mStr = monthAddStr(mStr, 1);
        guard++;
      }
    });
  return usado;
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
    if (mStr < recebMonth) return null;
    if (receb.dataFinal && mStr > receb.dataFinal.slice(0, 7)) return null;
    return { valor: receb.valor, parcelaLabel: '—' };
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
  const receb = Store.get('recebimentos', recebimentoId);
  const occ = receb && recebimentoOccurrenceInMonth(receb, mStr);
  const valor = occ ? occ.valor : 0;
  if (idx > -1) {
    list.splice(idx, 1);
    if (receb) Store.applyBankDelta(receb.bankId, -valor);
  } else {
    list.push({ id: uid(), recebimentoId, mes: mStr, ledgerApplied: true });
    if (receb) Store.applyBankDelta(receb.bankId, valor);
  }
  Store.save();
}
// reconcilia o saldo dos bancos ao editar um recebimento cujos meses já foram marcados como recebidos
function updateRecebimento(id, payload) {
  const old = Store.get('recebimentos', id);
  const affected = Store.state.recebimentosRecebidos.filter((p) => p.recebimentoId === id);
  affected.forEach((p) => {
    const occ = old && recebimentoOccurrenceInMonth(old, p.mes);
    if (occ) Store.applyBankDelta(old.bankId, -occ.valor);
  });
  Store.update('recebimentos', id, payload);
  const updated = Store.get('recebimentos', id);
  affected.forEach((p) => {
    const occ = updated && recebimentoOccurrenceInMonth(updated, p.mes);
    if (occ) Store.applyBankDelta(updated.bankId, occ.valor);
  });
}
function deleteRecebimento(id) {
  const receb = Store.get('recebimentos', id);
  const affected = Store.state.recebimentosRecebidos.filter((p) => p.recebimentoId === id);
  affected.forEach((p) => {
    const occ = receb && recebimentoOccurrenceInMonth(receb, p.mes);
    if (occ) Store.applyBankDelta(receb.bankId, -occ.valor);
  });
  Store.state.recebimentosRecebidos = Store.state.recebimentosRecebidos.filter((p) => p.recebimentoId !== id);
  Store.remove('recebimentos', id);
}

/* ============ Gastos variáveis: status pago/pendente também move o saldo do banco ============ */
function addGastoVariavel(payload) {
  const autoPago = payload.data <= todayISO();
  const item = Store.add('gastosVariaveis', Object.assign({ status: autoPago ? 'pago' : 'pendente' }, payload, autoPago ? { ledgerApplied: true } : {}));
  if (autoPago) Store.applyBankDelta(payload.bankId, -payload.valor);
  return item;
}
function updateGastoVariavel(id, payload) {
  const old = Store.get('gastosVariaveis', id);
  if (old && old.status === 'pago') {
    Store.applyBankDelta(old.bankId, old.valor);
    Store.applyBankDelta(payload.bankId, -payload.valor);
  }
  Store.update('gastosVariaveis', id, payload);
}
function payGastoVariavel(id) {
  const g = Store.get('gastosVariaveis', id);
  if (!g || g.status === 'pago') return;
  Store.update('gastosVariaveis', id, { status: 'pago', ledgerApplied: true });
  Store.applyBankDelta(g.bankId, -g.valor);
}
function reopenGastoVariavel(id) {
  const g = Store.get('gastosVariaveis', id);
  if (!g || g.status !== 'pago') return;
  Store.update('gastosVariaveis', id, { status: 'pendente' });
  Store.applyBankDelta(g.bankId, g.valor);
}
function deleteGastoVariavel(id) {
  const g = Store.get('gastosVariaveis', id);
  if (g && g.status === 'pago') Store.applyBankDelta(g.bankId, g.valor);
  Store.remove('gastosVariaveis', id);
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

// entradas - saídas realizadas naquele mês (recebimentos + gastos fixos + variáveis + fatura de cartão)
function fluxoLiquidoDoMes(mStr, bankId) {
  const ganhos = recebimentosForMonth(mStr).filter((r) => !bankId || r.bankId === bankId).reduce((s, r) => s + r.valor, 0);
  const fixos = gastosFixosForMonth(mStr).filter((g) => !bankId || g.bankId === bankId).reduce((s, g) => s + g.valor, 0);
  const variaveis = Store.state.gastosVariaveis.filter((g) => isSameMonth(g.data, mStr) && (!bankId || g.bankId === bankId)).reduce((s, g) => s + g.valor, 0);
  const cartao = bankId
    ? Store.state.cartoes.filter((c) => c.bankId === bankId).reduce((s, c) => s + cartaoFaturaForMonth(c.id, mStr), 0)
    : allCartoesFaturaForMonth(mStr);
  return ganhos - fixos - variaveis - cartao - parcelamentoParcelasForMonth(mStr, bankId);
}
// total das parcelas de parcelamentos com vencimento no mês (todas, pagas ou não)
function parcelamentoParcelasForMonth(mStr, bankId) {
  let total = 0;
  Store.state.parcelamentos.forEach((p) => {
    if (bankId && p.bankId !== bankId) return;
    parcelamentoSchedule(p).forEach((s) => { if (parcelamentoVencimento(p, s.numero).slice(0, 7) === mStr) total += s.valor; });
  });
  return total;
}
// idem, mas só as parcelas já pagas
function parcelamentoParcelasPagasForMonth(mStr, bankId) {
  let total = 0;
  Store.state.parcelamentos.forEach((p) => {
    if (bankId && p.bankId !== bankId) return;
    parcelamentoSchedule(p).forEach((s) => {
      if (isParcelaPaga(p.id, s.numero) && parcelamentoVencimento(p, s.numero).slice(0, 7) === mStr) total += s.valor;
    });
  });
  return total;
}
// o que DE FATO entrou/saiu do caixa no mês — só liquidações que mexeram no saldo dos bancos.
// Espelha cada chamada de applyBankDelta; é a base para reconstruir o saldo de meses passados.
function fluxoRealizadoDoMes(mStr, bankId) {
  let total = 0;
  Store.state.gastosFixosPagamentos.forEach((p) => {
    const mes = (p.data || `${p.mes}-01`).slice(0, 7);
    if (mes === mStr && (!bankId || p.bankId === bankId)) total -= p.valor;
  });
  Store.state.gastosVariaveis.forEach((g) => {
    if (g.status === 'pago' && isSameMonth(g.data, mStr) && (!bankId || g.bankId === bankId)) total -= g.valor;
  });
  recebimentosForMonth(mStr).forEach((r) => {
    if (r.recebido && (!bankId || r.bankId === bankId)) total += r.valor;
  });
  Store.state.cartaoFaturasPagas.forEach((f) => {
    if (f.mes !== mStr || !f.ledgerApplied) return;
    if (!bankId || f.bankId === bankId) total -= (f.valor || 0);
  });
  Store.state.parcelamentosPagamentos.forEach((rec) => {
    if (!rec.ledgerApplied) return;
    const p = Store.state.parcelamentos.find((x) => x.id === rec.parcelamentoId);
    const mes = (rec.data || (p ? parcelamentoVencimento(p, rec.numero) : '')).slice(0, 7);
    if (mes === mStr && (!bankId || rec.bankId === bankId)) total -= (rec.valor || 0);
  });
  if (bankId) {
    Store.state.transferencias.forEach((t) => {
      if (!isSameMonth(t.data, mStr)) return;
      if (t.deId === bankId) total -= t.valor;
      if (t.paraId === bankId) total += t.valor;
    });
  }
  Store.state.cofrinhos.forEach((c) => {
    if (!c.aporteAutomatico || !c.valorAporte || !c.contaOrigemId || !c.ultimoAporteMes) return;
    if (bankId && c.contaOrigemId !== bankId) return;
    const d = new Date(c.createdAt || 0);
    const inicioMes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (mStr >= inicioMes && mStr <= c.ultimoAporteMes) total -= c.valorAporte;
  });
  return total;
}
// o que ainda está agendado e NÃO liquidado num mês (usado pra projetar o fim do mês corrente)
function fluxoPendenteDoMes(mStr, bankId) {
  const receb = recebimentosForMonth(mStr).filter((r) => !r.recebido && (!bankId || r.bankId === bankId)).reduce((s, r) => s + r.valor, 0);
  const fixos = gastosFixosForMonth(mStr).filter((g) => !g.pago && (!bankId || g.bankId === bankId)).reduce((s, g) => s + g.valor, 0);
  const variaveis = Store.state.gastosVariaveis.filter((g) => isSameMonth(g.data, mStr) && g.status !== 'pago' && (!bankId || g.bankId === bankId)).reduce((s, g) => s + g.valor, 0);
  const cartao = Store.state.cartoes
    .filter((c) => (!bankId || c.bankId === bankId) && !isCartaoFaturaPaga(c.id, mStr))
    .reduce((s, c) => s + cartaoFaturaForMonth(c.id, mStr), 0);
  const parcelas = parcelamentoParcelasForMonth(mStr, bankId) - parcelamentoParcelasPagasForMonth(mStr, bankId);
  return receb - fixos - variaveis - cartao - parcelas;
}
// reconstrói o saldo bancário no FIM de um mês. Para trás: desfaz só o que DE FATO aconteceu
// (fluxo realizado). Mês atual: projeta o fim somando as pendências agendadas. Futuro: acumula
// os fluxos planejados mês a mês em cima da projeção do mês atual.
function saldoBancosNoFimDoMes(mStr, bankId) {
  const saldoAtual = bankId ? ((Store.bankById(bankId) || {}).balance || 0) : Store.state.banks.reduce((s, b) => s + (b.balance || 0), 0);
  const mesAtual = currentMonthStr();
  if (mStr < mesAtual) {
    let acc = saldoAtual;
    let cursor = mesAtual;
    while (cursor > mStr) { acc -= fluxoRealizadoDoMes(cursor, bankId); cursor = monthAddStr(cursor, -1); }
    return acc;
  }
  let acc = saldoAtual + fluxoPendenteDoMes(mesAtual, bankId);
  let cursor = monthAddStr(mesAtual, 1);
  while (cursor <= mStr) { acc += fluxoLiquidoDoMes(cursor, bankId); cursor = monthAddStr(cursor, 1); }
  return acc;
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
      bankId: g.pago && g.pagamento ? g.pagamento.bankId : g.bankId, categoryId: g.categoryId,
      status: g.pago ? 'pago' : 'pendente', valor: g.pago && g.pagamento ? g.pagamento.valor : g.valor, sinal: -1,
    })),
    ...Store.state.gastosVariaveis.map((g) => ({
      key: `gv:${g.id}`, data: g.data, descricao: g.descricao, tipo: 'Gasto variável',
      bankId: g.bankId, categoryId: g.categoryId, status: g.status, valor: g.valor, sinal: -1,
    })),
    ...months.flatMap((m) => recebimentosForMonth(m)).map((r) => ({
      key: `rc:${r.id}:${r.mesRef}`, data: r.dataOcorrencia, descricao: r.descricao, tipo: 'Recebimento',
      bankId: r.bankId, categoryId: r.categoryId, status: r.recebido ? 'recebido' : 'pendente', valor: r.valor, sinal: 1,
    })),
    // fatura do cartão vira 1 lançamento por mês (é o que de fato sai do banco) — as compras individuais
    // não movem dinheiro sozinhas, só quando a fatura é paga.
    ...Store.state.cartoes.flatMap((c) => months.map((m) => {
      const valor = cartaoFaturaForMonth(c.id, m);
      if (valor <= 0) return null;
      const dia = clampDayToMonth(m, c.diaVencimento);
      return {
        key: `cc:${c.id}:${m}`, data: `${m}-${String(dia).padStart(2, '0')}`, descricao: `Fatura ${c.nome}`, tipo: 'Cartão de crédito',
        bankId: c.bankId, categoryId: null, status: isCartaoFaturaPaga(c.id, m) ? 'pago' : 'pendente', valor, sinal: -1,
      };
    }).filter(Boolean)),
    // parcelas de contratos de parcelamento (financiamentos, empréstimos, consórcios)
    ...Store.state.parcelamentos.flatMap((p) => parcelamentoSchedule(p).map((s) => ({
      key: `pz:${p.id}:${s.numero}`, data: parcelamentoVencimento(p, s.numero), descricao: `${p.nome} (${s.numero}/${p.numParcelas})`, tipo: 'Parcelamento',
      bankId: p.bankId, categoryId: p.categoryId, status: isParcelaPaga(p.id, s.numero) ? 'pago' : 'pendente', valor: s.valor, sinal: -1,
    }))),
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
  if (idx > -1) {
    // desfaz a baixa: devolve o dinheiro ao banco se a parcela tinha mexido no saldo
    const rec = list[idx];
    if (rec.ledgerApplied) Store.applyBankDelta(rec.bankId, rec.valor);
    list.splice(idx, 1);
  } else {
    const p = Store.get('parcelamentos', parcelamentoId);
    const item = p ? parcelamentoSchedule(p).find((s) => s.numero === numero) : null;
    const valor = item ? item.valor : 0;
    const bankId = p ? p.bankId : null;
    // com banco de origem definido a parcela debita o saldo na hora; sem banco, fica só o
    // registro e o reconcileLegacyLedger aplica quando o usuário definir o banco.
    if (bankId) Store.applyBankDelta(bankId, -valor);
    list.push({ id: uid(), parcelamentoId, numero, valor, bankId: bankId || null, data: todayISO(), ledgerApplied: !!bankId });
  }
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
// paga a fatura de verdade: debita o valor total (fatura, não só "sua parte") do banco vinculado ao cartão
function payCartaoFatura(cartaoId, mStr, { bankId, valor }) {
  const list = Store.state.cartaoFaturasPagas;
  const idx = list.findIndex((p) => p.cartaoId === cartaoId && p.mes === mStr);
  if (idx > -1) Store.applyBankDelta(list[idx].bankId, list[idx].valor); // desfaz a baixa anterior, se houver
  const record = { id: idx > -1 ? list[idx].id : uid(), cartaoId, mes: mStr, bankId, valor, ledgerApplied: true };
  if (idx > -1) list[idx] = record; else list.push(record);
  Store.applyBankDelta(bankId, -valor);
  Store.save();
}
function reopenCartaoFatura(cartaoId, mStr) {
  const list = Store.state.cartaoFaturasPagas;
  const idx = list.findIndex((p) => p.cartaoId === cartaoId && p.mes === mStr);
  if (idx > -1) {
    Store.applyBankDelta(list[idx].bankId, list[idx].valor);
    list.splice(idx, 1);
  }
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
      const raw = localStorage.getItem(storageKey());
      this.state = raw ? Object.assign(defaultState(), JSON.parse(raw)) : defaultState();
    } catch (e) {
      this.state = defaultState();
    }
    this.migrateCategorias();
    this.reconcileLegacyLedger();
    return this.state;
  },

  // contas já existentes antes da separação despesa/receita não tinham "tipo" nem categorias de receita
  migrateCategorias() {
    let changed = false;
    this.state.categories.forEach((c) => { if (!c.tipo) { c.tipo = 'despesa'; changed = true; } });
    if (!this.state.categories.some((c) => c.tipo === 'receita')) {
      this.state.categories.push(...defaultState().categories.filter((c) => c.tipo === 'receita'));
      changed = true;
    }
    if (changed) this.save();
  },

  // baixas/recebimentos marcados ANTES do saldo do banco virar um livro-razão de verdade (applyBankDelta)
  // nunca chegaram a mexer no saldo. Aplica o valor deles uma única vez (marca ledgerApplied pra nunca repetir).
  reconcileLegacyLedger() {
    let changed = false;
    this.state.gastosFixosPagamentos.forEach((p) => {
      if (p.ledgerApplied) return;
      this.applyBankDelta(p.bankId, -p.valor);
      p.ledgerApplied = true;
      changed = true;
    });
    this.state.recebimentosRecebidos.forEach((p) => {
      if (p.ledgerApplied) return;
      const receb = this.get('recebimentos', p.recebimentoId);
      const occ = receb && recebimentoOccurrenceInMonth(receb, p.mes);
      if (occ) this.applyBankDelta(receb.bankId, occ.valor);
      p.ledgerApplied = true;
      changed = true;
    });
    this.state.gastosVariaveis.forEach((g) => {
      if (g.status !== 'pago' || g.ledgerApplied) return;
      this.applyBankDelta(g.bankId, -g.valor);
      g.ledgerApplied = true;
      changed = true;
    });
    this.state.cartaoFaturasPagas.forEach((p) => {
      if (p.ledgerApplied) return;
      const cartao = this.get('cartoes', p.cartaoId);
      if (!cartao || !cartao.bankId) return; // sem banco vinculado ainda — tenta de novo no próximo load
      const valor = p.valor != null ? p.valor : cartaoFaturaForMonth(p.cartaoId, p.mes);
      this.applyBankDelta(cartao.bankId, -valor);
      p.valor = valor;
      p.bankId = cartao.bankId;
      p.ledgerApplied = true;
      changed = true;
    });
    this.state.parcelamentosPagamentos.forEach((rec) => {
      if (rec.ledgerApplied) return;
      const p = this.get('parcelamentos', rec.parcelamentoId);
      if (!p || !p.bankId) return; // sem banco de origem ainda — tenta de novo no próximo load
      const item = parcelamentoSchedule(p).find((s) => s.numero === rec.numero);
      const valor = rec.valor != null ? rec.valor : (item ? item.valor : 0);
      this.applyBankDelta(p.bankId, -valor);
      rec.valor = valor;
      rec.bankId = p.bankId;
      if (!rec.data) rec.data = parcelamentoVencimento(p, rec.numero);
      rec.ledgerApplied = true;
      changed = true;
    });
    if (changed) this.save();
  },

  save() {
    localStorage.setItem(storageKey(), JSON.stringify(this.state));
  },

  reset() {
    this.state = defaultState();
    this.save();
  },

  // move a categoria arrastada pra posição da categoria alvo — define a ordem usada em todas as listas suspensas
  reorderCategories(draggedId, targetId) {
    const list = this.state.categories;
    const fromIdx = list.findIndex((c) => c.id === draggedId);
    let toIdx = list.findIndex((c) => c.id === targetId);
    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;
    const [item] = list.splice(fromIdx, 1);
    if (fromIdx < toIdx) toIdx -= 1;
    list.splice(toIdx, 0, item);
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

  // saldo de banco é um livro-razão de verdade: toda baixa/recebimento/transferência move o saldo na hora.
  // isso garante que o saldo de um mês carrega corretamente pro mês seguinte, sem recomputar do zero por período.
  applyBankDelta(bankId, delta) {
    if (!bankId || !delta) return;
    const bank = this.bankById(bankId);
    if (!bank) return;
    this.update('banks', bankId, { balance: (bank.balance || 0) + delta });
  },

  // aplica os aportes automáticos de cofrinhos ainda não feitos neste mês (dia do aporte já chegou)
  processAportesAutomaticos() {
    const mAtual = currentMonthStr();
    const diaHoje = parseInt(todayISO().slice(8, 10), 10);
    const aplicados = [];
    this.state.cofrinhos.forEach((c) => {
      if (!c.aporteAutomatico || !c.valorAporte || !c.diaAporte || !c.contaOrigemId) return;
      if (c.ultimoAporteMes === mAtual || diaHoje < c.diaAporte) return;
      const banco = this.bankById(c.contaOrigemId);
      if (!banco) return;
      this.update('banks', banco.id, { balance: (banco.balance || 0) - c.valorAporte });
      this.update('cofrinhos', c.id, { atual: (c.atual || 0) + c.valorAporte, ultimoAporteMes: mAtual });
      aplicados.push({ nome: c.nome, valor: c.valorAporte });
    });
    return aplicados;
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

/* ============ Campos de valor com máscara (digita só números, vírgula/decimal automático) ============ */
function moneyLocale() {
  const code = (Store.state && Store.state.profile.currency) || 'BRL';
  return (CURRENCIES[code] || CURRENCIES.BRL).locale;
}
function moneySymbol() {
  const code = (Store.state && Store.state.profile.currency) || 'BRL';
  return (CURRENCIES[code] || CURRENCIES.BRL).symbol;
}
function moneyDisplay(value) {
  const v = Number(value) || 0;
  if (!v) return '';
  return v.toLocaleString(moneyLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
// sempre mostra o símbolo da moeda fixo à esquerda (ver .money-input-wrap), pra não digitar "às cegas"
function moneyInputHTML(id, value, placeholder, opts) {
  opts = opts || {};
  const cents = Math.round((Number(value) || 0) * 100);
  const idAttr = id ? `id="${id}"` : '';
  const cls = `money-input${opts.extraClass ? ' ' + opts.extraClass : ''}`;
  const input = `<input type="text" inputmode="decimal" class="${cls}" ${idAttr} data-cents="${cents}" placeholder="${placeholder || '0,00'}" value="${cents ? moneyDisplay(value) : ''}" ${opts.attrs || ''} />`;
  return `<div class="money-input-wrap"${opts.wrapAttrs || ''}><span class="money-prefix">${moneySymbol()}</span>${input}</div>`;
}
function moneyValueFromEl(el) {
  if (!el) return 0;
  return (parseInt(el.dataset.cents || '0', 10) || 0) / 100;
}
function moneyValue(id) {
  return moneyValueFromEl(document.getElementById(id));
}
function moneyInputMask(el) {
  const digits = el.value.replace(/\D/g, '');
  const cents = digits ? parseInt(digits, 10) : 0;
  el.dataset.cents = cents;
  el.value = cents ? moneyDisplay(cents / 100) : '';
}
// fase de captura: garante que a máscara já rodou antes de qualquer listener local (ex.: cálculo de "sua parte" ao vivo)
document.addEventListener('input', (e) => {
  if (e.target.classList && e.target.classList.contains('money-input')) moneyInputMask(e.target);
}, true);

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
