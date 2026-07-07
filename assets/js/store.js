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
    profile: { name: '', email: '', currency: 'BRL', gastoCartaoPorCompra: true },
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
    // gastosFixos: {id,nome,valor,diaVencimento(1-31),categoryId,bankId,meioPagamento('pix'|'ted'|'boleto', só quando bankId),
    //   cartaoId(opcional — pago via fatura do cartão em vez de banco),
    //   divisoes(opcional, racha — ver gastoValorMeu),ativo,inicioMes(opcional),fimMes(opcional, exclusivo),observacao,createdAt,
    //   historico:[{id,mes:'YYYY-MM',valor,diaVencimento}] (valor/dia vigentes a partir de cada mês — ver gastoFixoConfigParaMes)}
    // recorrentes — "pago/pendente" é controlado por mês em gastosFixosPagamentos (ou pela fatura do cartão, se cartaoId)
    gastosFixos: [],
    gastosFixosPagamentos: [], // {id, gastoFixoId, mes:'YYYY-MM', bankId, data, valor}
    gastosFixosMesesOcultos: [], // {id, gastoFixoId, mes:'YYYY-MM'} — ocorrência excluída só naquele mês ("Apenas este mês")
    // gastosVariaveis: {id,descricao,valor,data,categoryId,bankId,meioPagamento('pix'|'ted'|'boleto', só quando bankId),
    //   cartaoId(opcional),divisoes(opcional, racha),estorno(opcional; quando true o valor é negativo e abate da fatura),
    //   tipo:'unico'|'parcelado'(só faz sentido com cartaoId),parcelas,status:'pago'|'pendente'(ignorado quando cartaoId),observacao,createdAt}
    gastosVariaveis: [],
    // recebimentos: {id,descricao,valor,data,categoryId,bankId,tipo:'unico'|'recorrente'|'parcelado',parcelas,dataFinal(recorrente, opcional),observacao,createdAt}
    recebimentos: [],
    recebimentosRecebidos: [], // {id, recebimentoId, mes:'YYYY-MM'}
    // cofrinhos: {id,nome,meta,atual,icone,cor,prazo,observacao,aporteAutomatico,diaAporte,valorAporte,contaOrigemId,ultimoAporteMes,createdAt}
    cofrinhos: [],
    transferencias: [], // {id,deId,paraId,valor,data,observacao,createdAt}
    // cartoes: {id,nome,bankId,limite,diaFechamento,diaVencimento,cor} — compras são lançadas em Gastos Fixos/Variáveis (cartaoId)
    cartoes: [],
    cartaoCompras: [], // legado — só usado para migrar dados antigos, ver Store.migrarCartaoComprasParaGastos()
    migradoCartaoComprasV2: false,
    cartaoFaturasPagas: [], // {id, cartaoId, mes:'YYYY-MM', bankId, valor, ledgerApplied}
    metasCategoria: [], // {id, categoryId, mes:'YYYY-MM', valor}
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
// quando pago via cartão, o vencimento mostrado é a data real da fatura (considerando o fechamento do
// cartão) — só informativo, não muda o mês em que a cobrança conta (isso é sempre o mês da compra)
function gastoFixoVencimentoISO(gf, mStr, cartaoId) {
  if (cartaoId) return cartaoVencimentoRealISO(cartaoId, mStr, gf.diaVencimento);
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
// gasto fixo pago via cartão: "pago/pendente" segue a fatura do cartão (ver isCartaoFaturaPaga), não tem
// baixa própria — a "sua parte" (racha) usa gastoValorMeu, igual às compras de cartão de antes
function gastoFixoOccurrenceExtras(gf, cfg, mStr) {
  if (gf.cartaoId) {
    // o "pago" segue a fatura do MÊS DO VENCIMENTO (é quando você paga o cartão), não o mês da compra
    const vencimentoISO = gastoFixoVencimentoISO(cfg, mStr, gf.cartaoId);
    return {
      vencimentoISO,
      pago: isCartaoFaturaPaga(gf.cartaoId, vencimentoISO.slice(0, 7)),
      pagamento: null,
      valorMeu: gastoValorMeu(gf),
    };
  }
  const pagamento = gastoFixoPagamento(gf.id, mStr);
  return { vencimentoISO: gastoFixoVencimentoISO(cfg, mStr), pago: !!pagamento, pagamento, valorMeu: gastoValorMeu(gf) };
}
function gastosFixosForMonth(mStr) {
  return Store.state.gastosFixos
    .filter((gf) => gastoFixoAppliesToMonth(gf, mStr))
    .map((gf) => {
      const cfg = gastoFixoConfigParaMes(gf, mStr);
      const extras = gastoFixoOccurrenceExtras(gf, cfg, mStr);
      return { ...gf, valor: cfg.valor, diaVencimento: cfg.diaVencimento, mesRef: mStr, ...extras };
    });
}
// igual gastosFixosForMonth, mas inclui os inativos (pra tela de listagem não "sumir" com o botão de reativar)
function gastosFixosForMonthAll(mStr) {
  return Store.state.gastosFixos
    .filter((gf) => mStr >= gastoFixoCreatedMonth(gf) && (!gf.fimMes || mStr < gf.fimMes) && !isGastoFixoMesOculto(gf.id, mStr))
    .map((gf) => {
      const cfg = gastoFixoConfigParaMes(gf, mStr);
      const extras = gastoFixoOccurrenceExtras(gf, cfg, mStr);
      return { ...gf, valor: cfg.valor, diaVencimento: cfg.diaVencimento, mesRef: mStr, ...extras };
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
/* ---- Racha / divisão de um lançamento (gasto fixo ou variável) com outras pessoas ---- */
function gastoValorDividido(item) {
  return (item.divisoes || []).reduce((s, d) => s + (d.valor || 0), 0);
}
function gastoValorMeu(item) {
  return Math.max(0, item.valor - gastoValorDividido(item));
}
function gastoFracaoMinha(item) {
  return item.valor > 0 ? gastoValorMeu(item) / item.valor : 1;
}

// data real de vencimento da fatura que engloba uma cobrança feita no dia `day` do mês de competência
// `mStr` — usa o fechamento do cartão só pra achar a data real de pagamento (informativo). Isso é
// independente do mês em que a cobrança conta pro total (sempre o mês da compra, ver gastoVariavelBaseMonth)
function cartaoVencimentoRealISO(cartaoId, mStr, day) {
  const cartao = Store.get('cartoes', cartaoId);
  // sem fechamento cadastrado, assume que a fatura nunca fecha antes do fim do mês (mantém vencimento no mesmo mês)
  const fechamento = cartao ? (cartao.diaFechamento || 31) : 31;
  const vencimento = cartao ? (cartao.diaVencimento || 1) : 1;
  const fechamentoMes = (day || 1) <= fechamento ? mStr : monthAddStr(mStr, 1);
  const vencimentoMes = vencimento > fechamento ? fechamentoMes : monthAddStr(fechamentoMes, 1);
  const vDay = clampDayToMonth(vencimentoMes, vencimento);
  return `${vencimentoMes}-${String(vDay).padStart(2, '0')}`;
}
/* ============ Gastos variáveis: único ou parcelado (parcelado só faz sentido vinculado a cartão) ============ */
// mês em que uma cobrança lançada num cartão conta — sempre o mês em que a compra foi feita (o dia de
// fechamento do cartão é só informativo, não desloca a cobrança pro mês seguinte)
function gastoVariavelBaseMonth(g) {
  return g.data.slice(0, 7);
}
function gastoVariavelOccurrenceInMonth(g, mStr) {
  const baseMonth = gastoVariavelBaseMonth(g);
  let base = null;
  if (g.tipo === 'parcelado') {
    const parcelas = Math.max(1, g.parcelas || 1);
    for (let i = 0; i < parcelas; i++) {
      if (monthAddStr(baseMonth, i) === mStr) {
        const valorParcela = Math.round((g.valor / parcelas) * 100) / 100;
        base = { valor: valorParcela, parcelaLabel: `${i + 1}/${parcelas}` };
        break;
      }
    }
  } else if (mStr === baseMonth) {
    base = { valor: g.valor, parcelaLabel: null };
  }
  if (!base) return null;
  return { ...base, valorMeu: Math.round(base.valor * gastoFracaoMinha(g) * 100) / 100 };
}
// gastos variáveis que ocorrem no mês mStr. Pago direto do banco: aparece uma vez, status próprio.
// Vinculado a cartão: segue o ciclo de fatura (pode virar várias parcelas em meses diferentes) e o
// "pago/pendente" vem da fatura do cartão, não tem baixa própria.
function gastosVariaveisForMonth(mStr) {
  return Store.state.gastosVariaveis
    .map((g) => ({ g, occurrence: gastoVariavelOccurrenceInMonth(g, mStr) }))
    .filter((x) => x.occurrence)
    .map((x) => {
      // pago segue a fatura do MÊS DO VENCIMENTO (quando o cartão é pago), não o mês da compra
      const vencimentoISO = x.g.cartaoId ? cartaoVencimentoRealISO(x.g.cartaoId, mStr, Number(x.g.data.slice(8, 10))) : x.g.data;
      return {
        ...x.g,
        valor: x.occurrence.valor,
        valorMeu: x.occurrence.valorMeu,
        parcelaLabel: x.occurrence.parcelaLabel,
        mesRef: mStr,
        vencimentoISO,
        pago: x.g.cartaoId ? isCartaoFaturaPaga(x.g.cartaoId, vencimentoISO.slice(0, 7)) : x.g.status === 'pago',
      };
    });
}
/* ============ Cartão: dois agrupamentos diferentes ============
   - COMPETÊNCIA (cartaoItensForMonth): itens pelo mês da COMPRA — é o que entra no seu orçamento do mês
     ("fechar o mês" no Dashboard/Controle do Ano). Uma compra de julho conta em julho.
   - FATURA (cartaoItensFatura): itens pelo mês do VENCIMENTO da fatura — é o que aparece na aba Cartões e
     o que de fato sai do banco. A mesma compra de julho, se a fatura vence em agosto, cai na fatura de agosto. */
function cartaoItensForMonth(cartaoId, mStr) {
  const fixos = gastosFixosForMonth(mStr).filter((g) => g.cartaoId === cartaoId).map((g) => ({ origem: 'fixo', item: g }));
  const variaveis = gastosVariaveisForMonth(mStr).filter((g) => g.cartaoId === cartaoId).map((g) => ({ origem: 'variavel', item: g }));
  return [...fixos, ...variaveis];
}
// itens cuja fatura VENCE no mês vencMonth — varre alguns meses de competência anteriores (a fatura pode
// englobar compras de até ~2 meses atrás) e fica só com os que caem nessa fatura
function cartaoItensFatura(cartaoId, vencMonth) {
  const itens = [];
  for (let i = 3; i >= 0; i--) {
    cartaoItensForMonth(cartaoId, monthAddStr(vencMonth, -i)).forEach((x) => {
      if (x.item.vencimentoISO.slice(0, 7) === vencMonth) itens.push(x);
    });
  }
  return itens;
}
// mês (YYYY-MM) da fatura que engloba uma cobrança feita no dia `day` do mês de competência `mStr`
function cartaoFaturaMonthDe(cartaoId, mStr, day) {
  return cartaoVencimentoRealISO(cartaoId, mStr, day).slice(0, 7);
}
// fatura real do cartão — o que você de fato paga ao banco no mês do vencimento (valor cheio, sem racha)
function cartaoFaturaForMonth(cartaoId, mStr) {
  return cartaoItensFatura(cartaoId, mStr).reduce((s, x) => s + x.item.valor, 0);
}
// mês da próxima fatura em aberto (com valor e ainda não paga) a partir do mês atual — pra abrir a aba nela
function cartaoFaturaAbertaMonth(cartaoId) {
  const atual = currentMonthStr();
  for (let i = -1; i <= 13; i++) {
    const m = monthAddStr(atual, i);
    if (cartaoFaturaForMonth(cartaoId, m) > 0 && !isCartaoFaturaPaga(cartaoId, m)) return m;
  }
  return atual;
}
// regime de contabilização do cartão (config do usuário): true = conta no mês da COMPRA (competência),
// false = conta no mês do VENCIMENTO da fatura (caixa). Vale só pro orçamento (Dashboard/Controle do Ano);
// a aba Cartões e o saldo do banco seguem sempre o vencimento.
function regimeCartaoPorCompra() {
  return !(Store.state && Store.state.profile && Store.state.profile.gastoCartaoPorCompra === false);
}
function cartaoItensDoMesRegime(cartaoId, mStr) {
  return regimeCartaoPorCompra() ? cartaoItensForMonth(cartaoId, mStr) : cartaoItensFatura(cartaoId, mStr);
}
// custo real pro seu orçamento (segue o regime escolhido) — já desconta a parte rachada com outras pessoas
function cartaoCustoRealForMonth(cartaoId, mStr) {
  return cartaoItensDoMesRegime(cartaoId, mStr).reduce((s, x) => s + x.item.valorMeu, 0);
}
// valor cheio do cartão atribuído ao mês conforme o regime (usado no Controle do Ano)
function allCartoesValorDoMesRegime(mStr) {
  return Store.state.cartoes.reduce((s, c) => s + cartaoItensDoMesRegime(c.id, mStr).reduce((s2, x) => s2 + x.item.valor, 0), 0);
}
function allCartoesFaturaForMonth(mStr) {
  return Store.state.cartoes.reduce((s, c) => s + cartaoFaturaForMonth(c.id, mStr), 0);
}
// custo real que sai do caixa quando a fatura é paga — agrupa pelo mês do VENCIMENTO (fatura), não da compra
function cartaoCustoRealCaixaForMonth(cartaoId, mStr) {
  return cartaoItensFatura(cartaoId, mStr).reduce((s, x) => s + x.item.valorMeu, 0);
}
// limite realmente comprometido: tudo que já foi lançado e ainda não foi quitado, igual um cartão de verdade —
// gasto fixo conta enquanto a recorrência estiver ativa, gasto variável parcelado segura o limite de TODAS as
// parcelas que faltam (inclusive as de meses futuros). Pagar uma fatura libera de volta a parte dela.
function cartaoLimiteUsado(cartaoId) {
  const atual = currentMonthStr();
  let usado = 0;
  Store.state.gastosFixos.filter((gf) => gf.cartaoId === cartaoId).forEach((gf) => {
    const inicio = gastoFixoCreatedMonth(gf);
    const fim = gf.fimMes ? monthAddStr(gf.fimMes, -1) : atual;
    let mStr = inicio;
    let guard = 0;
    while (mStr <= fim && guard < 600) {
      const cfg = gastoFixoConfigParaMes(gf, mStr);
      // "quitado" olha a fatura do mês do vencimento dessa cobrança, não do mês da compra
      if (gf.ativo !== false && !isGastoFixoMesOculto(gf.id, mStr) && !isCartaoFaturaPaga(cartaoId, cartaoFaturaMonthDe(cartaoId, mStr, cfg.diaVencimento))) {
        usado += cfg.valor;
      }
      mStr = monthAddStr(mStr, 1);
      guard++;
    }
  });
  Store.state.gastosVariaveis.filter((g) => g.cartaoId === cartaoId).forEach((g) => {
    const base = gastoVariavelBaseMonth(g);
    const dia = Number(g.data.slice(8, 10));
    const n = g.tipo === 'parcelado' ? Math.max(1, g.parcelas || 1) : 1;
    for (let i = 0; i < n; i++) {
      const mStr = monthAddStr(base, i);
      if (!isCartaoFaturaPaga(cartaoId, cartaoFaturaMonthDe(cartaoId, mStr, dia))) usado += Math.round((g.valor / n) * 100) / 100;
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

/* ============ Gastos variáveis: status pago/pendente também move o saldo do banco ============
   Vinculado a cartão (g.cartaoId) nunca mexe no saldo do banco diretamente — o dinheiro só sai de
   fato quando a fatura do cartão é paga (ver payCartaoFatura), então essas funções viram no-op pra eles. */
function addGastoVariavel(payload) {
  if (payload.cartaoId) return Store.add('gastosVariaveis', Object.assign({ status: 'pendente' }, payload));
  const autoPago = payload.data <= todayISO();
  const item = Store.add('gastosVariaveis', Object.assign({ status: autoPago ? 'pago' : 'pendente' }, payload, autoPago ? { ledgerApplied: true } : {}));
  if (autoPago) Store.applyBankDelta(payload.bankId, -payload.valor);
  return item;
}
function updateGastoVariavel(id, payload) {
  const old = Store.get('gastosVariaveis', id);
  if (old && !old.cartaoId && old.status === 'pago') {
    Store.applyBankDelta(old.bankId, old.valor);
    if (!payload.cartaoId) Store.applyBankDelta(payload.bankId, -payload.valor);
  }
  Store.update('gastosVariaveis', id, payload);
}
function payGastoVariavel(id) {
  const g = Store.get('gastosVariaveis', id);
  if (!g || g.cartaoId || g.status === 'pago') return;
  Store.update('gastosVariaveis', id, { status: 'pago', ledgerApplied: true });
  Store.applyBankDelta(g.bankId, -g.valor);
}
function reopenGastoVariavel(id) {
  const g = Store.get('gastosVariaveis', id);
  if (!g || g.cartaoId || g.status !== 'pago') return;
  Store.update('gastosVariaveis', id, { status: 'pendente' });
  Store.applyBankDelta(g.bankId, g.valor);
}
function deleteGastoVariavel(id) {
  const g = Store.get('gastosVariaveis', id);
  if (g && !g.cartaoId && g.status === 'pago') Store.applyBankDelta(g.bankId, g.valor);
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
// gastos fixos/variáveis vinculados a cartão (g.cartaoId) NÃO entram nos buckets "fixos"/"variaveis" — já
// estão contados dentro da fatura do cartão (bucket "cartao"), senão contaria em dobro.
function fluxoLiquidoDoMes(mStr, bankId) {
  const ganhos = recebimentosForMonth(mStr).filter((r) => !bankId || r.bankId === bankId).reduce((s, r) => s + r.valor, 0);
  const fixos = gastosFixosForMonth(mStr).filter((g) => !g.cartaoId && (!bankId || g.bankId === bankId)).reduce((s, g) => s + g.valor, 0);
  const variaveis = gastosVariaveisForMonth(mStr).filter((g) => !g.cartaoId && (!bankId || g.bankId === bankId)).reduce((s, g) => s + g.valor, 0);
  const cartao = bankId
    ? Store.state.cartoes.filter((c) => c.bankId === bankId).reduce((s, c) => s + cartaoFaturaForMonth(c.id, mStr), 0)
    : allCartoesFaturaForMonth(mStr);
  return ganhos - fixos - variaveis - cartao;
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
    if (!g.cartaoId && g.status === 'pago' && isSameMonth(g.data, mStr) && (!bankId || g.bankId === bankId)) total -= g.valor;
  });
  recebimentosForMonth(mStr).forEach((r) => {
    if (r.recebido && (!bankId || r.bankId === bankId)) total += r.valor;
  });
  Store.state.cartaoFaturasPagas.forEach((f) => {
    if (f.mes !== mStr || !f.ledgerApplied) return;
    if (!bankId || f.bankId === bankId) total -= (f.valor || 0);
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
  const fixos = gastosFixosForMonth(mStr).filter((g) => !g.cartaoId && !g.pago && (!bankId || g.bankId === bankId)).reduce((s, g) => s + g.valor, 0);
  const variaveis = gastosVariaveisForMonth(mStr).filter((g) => !g.cartaoId && g.status !== 'pago' && (!bankId || g.bankId === bankId)).reduce((s, g) => s + g.valor, 0);
  const cartao = Store.state.cartoes
    .filter((c) => (!bankId || c.bankId === bankId) && !isCartaoFaturaPaga(c.id, mStr))
    .reduce((s, c) => s + cartaoFaturaForMonth(c.id, mStr), 0);
  return receb - fixos - variaveis - cartao;
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

/* ============ Motor de transações unificado (Extrato) ============ */
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
    // gastos fixos/variáveis vinculados a cartão (g.cartaoId) não entram aqui como linha própria — já
    // aparecem juntos na linha "Fatura X" abaixo, exatamente como as compras de cartão de antes.
    ...months.flatMap((m) => gastosFixosForMonth(m)).filter((g) => !g.cartaoId).map((g) => ({
      key: `gf:${g.id}:${g.mesRef}`, data: g.vencimentoISO, descricao: g.nome, tipo: 'Gasto fixo',
      bankId: g.pago && g.pagamento ? g.pagamento.bankId : g.bankId, categoryId: g.categoryId,
      status: g.pago ? 'pago' : 'pendente', valor: g.pago && g.pagamento ? g.pagamento.valor : g.valor, sinal: -1,
    })),
    ...months.flatMap((m) => gastosVariaveisForMonth(m)).filter((g) => !g.cartaoId).map((g) => ({
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
  ];
  return txs.filter((t) => t.data >= start && t.data <= end);
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
  return Store.state.gastosVariaveis.filter((g) => g.cartaoId === cartaoId && g.tipo === 'parcelado' && gastoVariavelOccurrenceInMonth(g, mStr)).length;
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
    this.migrarCartaoComprasParaGastos();
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

  // migração única: compras lançadas no modelo antigo (aba Cartões) viram Gasto Fixo (assinatura recorrente)
  // ou Gasto Variável (à vista/parcelado), vinculadas ao cartão via cartaoId — mesmo comportamento de antes,
  // só que lançadas nas abas de Gastos Fixos/Variáveis em vez de terem uma tela própria dentro de Cartões.
  migrarCartaoComprasParaGastos() {
    if (this.state.migradoCartaoComprasV2) return;
    this.state.cartaoCompras.forEach((c) => {
      const categoryId = c.categoryId || null;
      const divisoes = c.divisoes || [];
      if (c.tipo === 'recorrente') {
        const inicioMes = c.data.slice(0, 7);
        const dia = parseInt(c.data.slice(8, 10), 10) || 1;
        this.add('gastosFixos', {
          nome: c.descricao, valor: c.valorTotal, diaVencimento: dia, categoryId, cartaoId: c.cartaoId,
          divisoes, ativo: true, inicioMes, fimMes: null, observacao: '',
        });
      } else {
        this.add('gastosVariaveis', {
          descricao: c.descricao, valor: c.valorTotal, data: c.data, categoryId, cartaoId: c.cartaoId,
          divisoes, tipo: c.tipo === 'parcelado' ? 'parcelado' : 'unico', parcelas: c.parcelas || 1,
          status: 'pendente', observacao: '',
        });
      }
    });
    this.state.cartaoCompras = [];
    this.state.migradoCartaoComprasV2 = true;
    this.save();
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
