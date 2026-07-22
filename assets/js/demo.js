/* Fin360 — dados de exemplo (demonstração / primeiro acesso)
   Perfil retratado: assalariado classe média, renda fixa de R$ 7.480, 6 meses de histórico.
   Tudo aqui é fictício e serve pra pessoa explorar o sistema cheio antes de lançar o dela. */

const DEMO_MESES_HISTORICO = 6;

// gerador pseudoaleatório com semente fixa — os valores variam entre si mas são sempre os mesmos
// a cada carregamento, senão o vídeo/print de hoje não bate com o de amanhã
function demoRandom() {
  let seed = 20260722;
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

function demoDataset() {
  const rnd = demoRandom();
  const money = (min, max) => Math.round((min + rnd() * (max - min)) * 100) / 100;
  let seq = 0;
  const uid = (prefixo) => `demo-${prefixo}-${(++seq).toString(36)}`;
  const agora = Date.now();

  const mesAtual = currentMonthStr();
  const meses = [];
  for (let i = DEMO_MESES_HISTORICO - 1; i >= 0; i--) meses.push(monthAddStr(mesAtual, -i));
  const primeiroMes = meses[0];
  const hojeDia = Number(todayISO().slice(8, 10));
  const dataDe = (mStr, dia) => `${mStr}-${String(clampDayToMonth(mStr, dia)).padStart(2, '0')}`;

  const state = defaultState();

  /* ---------- Bancos ---------- */
  const nubank = { id: uid('bank'), name: 'Nubank', balance: 5847.30, cor: '#a855f7', createdAt: agora };
  const inter = { id: uid('bank'), name: 'Inter', balance: 2180.00, cor: '#f5a623', createdAt: agora };
  state.banks = [nubank, inter];

  /* ---------- Cartões ---------- */
  // ambos fecham dia 28 e vencem no mês seguinte — compra de julho cai na fatura de agosto
  const cartaoNu = { id: uid('cc'), nome: 'Nubank Roxinho', bankId: nubank.id, limite: 8000, diaFechamento: 28, diaVencimento: 8, cor: '#a855f7', createdAt: agora };
  const cartaoInter = { id: uid('cc'), nome: 'Inter Gold', bankId: inter.id, limite: 3000, diaFechamento: 28, diaVencimento: 10, cor: '#f5a623', createdAt: agora };
  state.cartoes = [cartaoNu, cartaoInter];

  /* ---------- Gastos fixos ---------- */
  const fixo = (nome, valor, dia, categoryId, destino) => ({
    id: uid('gf'), nome, valor, diaVencimento: dia, categoryId,
    bankId: destino.bankId || null, meioPagamento: destino.bankId ? destino.meio : null,
    cartaoId: destino.cartaoId || null, divisoes: [], ativo: true,
    inicioMes: monthAddStr(primeiroMes, -1), fimMes: null, observacao: '', historico: [], createdAt: agora,
  });
  const viaNubank = { bankId: nubank.id, meio: 'boleto' };
  const viaCartaoNu = { cartaoId: cartaoNu.id };
  const viaCartaoInter = { cartaoId: cartaoInter.id };

  const fAluguel = fixo('Aluguel', 1850.00, 10, 'cat-moradia', { bankId: nubank.id, meio: 'pix' });
  const fCondominio = fixo('Condomínio', 420.00, 10, 'cat-moradia', viaNubank);
  const fPlano = fixo('Plano de saúde', 389.00, 8, 'cat-saude', viaNubank);
  const fEnergia = fixo('Energia elétrica', 187.40, 15, 'cat-moradia', viaNubank);
  const fInternet = fixo('Internet fibra', 129.90, 20, 'cat-moradia', viaNubank);
  const fAcademia = fixo('Academia', 119.90, 5, 'cat-saude', viaCartaoNu);
  const fCelular = fixo('Celular', 69.90, 12, 'cat-outros', viaCartaoNu);
  const fNetflix = fixo('Netflix', 44.90, 15, 'cat-assinaturas', viaCartaoInter);
  const fSpotify = fixo('Spotify', 21.90, 15, 'cat-assinaturas', viaCartaoInter);
  // vence exatamente hoje — é o que faz a tela Resumo ter o que mostrar em "Hoje"
  const fSeguro = fixo('Seguro do carro', 214.00, hojeDia, 'cat-transporte', viaNubank);
  state.gastosFixos = [fAluguel, fCondominio, fPlano, fEnergia, fInternet, fSeguro, fAcademia, fCelular, fNetflix, fSpotify];

  // pagamentos: meses anteriores 100% quitados; no mês atual paga só o que já venceu,
  // deixando energia, internet e o seguro de hoje pendentes pra tela mostrar "falta pagar"
  const fixosDeBanco = [fAluguel, fCondominio, fPlano, fEnergia, fInternet, fSeguro];
  const pendentesNoMesAtual = [fEnergia.id, fInternet.id, fSeguro.id];
  meses.forEach((mStr) => {
    fixosDeBanco.forEach((g) => {
      const ehMesAtual = mStr === mesAtual;
      if (ehMesAtual && (pendentesNoMesAtual.includes(g.id) || g.diaVencimento > hojeDia)) return;
      state.gastosFixosPagamentos.push({
        id: uid('gfp'), gastoFixoId: g.id, mes: mStr, bankId: g.bankId,
        data: dataDe(mStr, g.diaVencimento), valor: g.valor, ledgerApplied: true,
      });
    });
  });

  /* ---------- Recebimentos ---------- */
  const salario = {
    id: uid('rc'), descricao: 'Salário', valor: 7480.00, data: dataDe(monthAddStr(primeiroMes, -1), 5),
    categoryId: 'cat-salario', bankId: nubank.id, tipo: 'recorrente', parcelas: 1, dataFinal: null,
    observacao: '', createdAt: agora,
  };
  const unico = (descricao, valor, mStr, dia, categoryId) => ({
    id: uid('rc'), descricao, valor, data: dataDe(mStr, dia), categoryId, bankId: nubank.id,
    tipo: 'unico', parcelas: 1, dataFinal: null, observacao: '', createdAt: agora,
  });
  const vendaUsado = unico('Venda de notebook antigo', 620.00, meses[2], 18, 'cat-outros-receita');
  const bonus = unico('Bônus semestral', 2400.00, mesAtual, 15, 'cat-renda-extra');
  const reembolso = unico('Reembolso consulta médica', 180.00, mesAtual, 18, 'cat-reembolso');
  const freela = unico('Freela projeto extra', 850.00, mesAtual, 28, 'cat-freelancer');
  const aulaHoje = unico('Aula particular', 240.00, mesAtual, hojeDia, 'cat-renda-extra');
  state.recebimentos = [salario, vendaUsado, bonus, reembolso, freela, aulaHoje];

  // salário cai todo mês; os avulsos passados também. Reembolso e freela ficam pendentes ("a receber")
  meses.forEach((mStr) => {
    state.recebimentosRecebidos.push({ id: uid('rr'), recebimentoId: salario.id, mes: mStr, ledgerApplied: true });
  });
  state.recebimentosRecebidos.push({ id: uid('rr'), recebimentoId: vendaUsado.id, mes: meses[2], ledgerApplied: true });
  state.recebimentosRecebidos.push({ id: uid('rr'), recebimentoId: bonus.id, mes: mesAtual, ledgerApplied: true });

  /* ---------- Gastos variáveis ---------- */
  const variaveis = [];
  const gv = (descricao, valor, mStr, dia, categoryId, destino, extra) => {
    const limite = mStr === mesAtual ? hojeDia : 28;
    if (dia > limite) return null;
    const item = {
      id: uid('gv'), descricao, valor, data: dataDe(mStr, dia), categoryId,
      bankId: destino.bankId || null, meioPagamento: destino.bankId ? destino.meio : null,
      cartaoId: destino.cartaoId || null, divisoes: [], estorno: false,
      tipo: 'unico', parcelas: 1, status: destino.bankId ? 'pago' : 'pendente',
      observacao: '', createdAt: agora, ...(extra || {}),
    };
    if (item.bankId && item.status === 'pago') item.ledgerApplied = true;
    variaveis.push(item);
    return item;
  };
  const viaPix = { bankId: nubank.id, meio: 'pix' };

  // rotina mensal — mesma cesta todo mês, com valores variando um pouco
  meses.forEach((mStr) => {
    gv('Supermercado Zaffari', money(430, 640), mStr, 4, 'cat-alimentacao', viaPix);
    gv('Supermercado Zaffari', money(380, 590), mStr, 19, 'cat-alimentacao', viaPix);
    gv('Padaria da esquina', money(22, 38), mStr, 7, 'cat-alimentacao', viaCartaoNu);
    gv('Padaria da esquina', money(22, 38), mStr, 21, 'cat-alimentacao', viaCartaoNu);
    gv('iFood', money(42, 88), mStr, 3, 'cat-alimentacao', viaCartaoNu);
    gv('iFood', money(42, 88), mStr, 13, 'cat-alimentacao', viaCartaoNu);
    gv('iFood', money(42, 88), mStr, 24, 'cat-alimentacao', viaCartaoNu);
    gv('Restaurante', money(95, 185), mStr, 16, 'cat-alimentacao', viaCartaoNu);
    gv('Posto Ipiranga', money(220, 310), mStr, 6, 'cat-transporte', viaCartaoNu);
    gv('Posto Ipiranga', money(220, 310), mStr, 22, 'cat-transporte', viaCartaoNu);
    gv('Uber', money(16, 48), mStr, 2, 'cat-transporte', viaCartaoNu);
    gv('Uber', money(16, 48), mStr, 9, 'cat-transporte', viaCartaoNu);
    gv('Uber', money(16, 48), mStr, 17, 'cat-transporte', viaCartaoNu);
    gv('Uber', money(16, 48), mStr, 26, 'cat-transporte', viaCartaoNu);
    gv('Farmácia', money(55, 160), mStr, 12, 'cat-saude', viaCartaoNu);
    gv('Cinema', money(64, 92), mStr, 20, 'cat-lazer', viaCartaoInter);
    gv('Bar com amigos', money(80, 160), mStr, 27, 'cat-lazer', viaCartaoNu);
  });

  // compras avulsas espalhadas, pra tabela não ficar com cara de repetição
  gv('Tênis de corrida', 389.90, meses[0], 14, 'cat-outros', viaCartaoNu);
  gv('Presente de aniversário', 180.00, meses[1], 23, 'cat-outros', viaCartaoInter);
  gv('Curso online de Excel', 297.00, meses[1], 8, 'cat-educacao', viaCartaoNu);
  gv('Corte de cabelo', 75.00, meses[2], 11, 'cat-outros', viaPix);
  gv('Camisetas', 236.50, meses[3], 15, 'cat-outros', viaCartaoNu);
  gv('Manutenção do carro', 640.00, meses[3], 22, 'cat-transporte', viaPix);
  gv('Show', 320.00, meses[4], 18, 'cat-lazer', viaCartaoNu);
  gv('Óculos de grau', 890.00, meses[4], 10, 'cat-saude', viaCartaoNu);
  gv('Livros', 154.80, mesAtual, 6, 'cat-educacao', viaCartaoNu);

  // parcelamentos em andamento — aparecem "5 de 10" e "3 de 6" na fatura
  gv('Notebook Dell', 4200.00, meses[1], 14, 'cat-educacao', viaCartaoNu, { tipo: 'parcelado', parcelas: 10 });
  gv('Passagem aérea', 1890.00, meses[3], 9, 'cat-lazer', viaCartaoNu, { tipo: 'parcelado', parcelas: 6 });

  // racha com outras pessoas — o sistema conta só a sua parte no orçamento
  gv('Jantar de casal', 240.00, meses[4], 14, 'cat-alimentacao', viaCartaoNu, { divisoes: [{ nome: 'Par', valor: 120.00 }] });
  gv('Churrasco de aniversário', 340.00, mesAtual, 11, 'cat-alimentacao', viaCartaoNu, {
    divisoes: [{ nome: 'Rafa', valor: 113.00 }, { nome: 'Bruno', valor: 113.00 }],
  });

  // estorno de uma compra cancelada — abate da fatura
  gv('Estorno passagem cancelada', -210.00, mesAtual, 9, 'cat-lazer', viaCartaoNu, { estorno: true });

  state.gastosVariaveis = variaveis;

  /* ---------- Cofrinhos ---------- */
  state.cofrinhos = [
    { id: uid('cf'), nome: 'Viagem pra Europa', meta: 15000, atual: 8900, icone: '✈️', cor: '#3866ff', prazo: `${monthAddStr(mesAtual, 5)}-01`, observacao: '', aporteAutomatico: false, diaAporte: 5, valorAporte: 0, contaOrigemId: '', createdAt: agora },
    { id: uid('cf'), nome: 'Reserva de emergência', meta: 20000, atual: 12400, icone: '🛡️', cor: '#22c55e', prazo: null, observacao: '', aporteAutomatico: false, diaAporte: 5, valorAporte: 0, contaOrigemId: '', createdAt: agora },
    { id: uid('cf'), nome: 'Notebook novo', meta: 5000, atual: 1250, icone: '💻', cor: '#f5a623', prazo: null, observacao: '', aporteAutomatico: false, diaAporte: 10, valorAporte: 0, contaOrigemId: '', createdAt: agora },
  ];

  /* ---------- Transferências ---------- */
  state.transferencias = [
    { id: uid('tf'), deId: nubank.id, paraId: inter.id, valor: 600.00, data: dataDe(meses[4], 6), observacao: 'Reserva do mês', createdAt: agora },
    { id: uid('tf'), deId: nubank.id, paraId: inter.id, valor: 600.00, data: dataDe(mesAtual, 6), observacao: 'Reserva do mês', createdAt: agora },
  ];

  /* ---------- Metas por categoria (Planejamento) ---------- */
  state.metasCategoria = [
    { id: uid('mt'), categoryId: 'cat-alimentacao', mes: mesAtual, valor: 1800 },
    { id: uid('mt'), categoryId: 'cat-transporte', mes: mesAtual, valor: 800 },
    { id: uid('mt'), categoryId: 'cat-lazer', mes: mesAtual, valor: 400 },
  ];

  return { state, meses, mesAtual, cartoes: [cartaoNu, cartaoInter], saldos: { [nubank.id]: nubank.balance, [inter.id]: inter.balance } };
}

// Substitui TODO o estado atual pelos dados de exemplo.
function carregarDadosDemo() {
  const { state, meses, mesAtual, cartoes, saldos } = demoDataset();
  const perfil = Store.state.profile;
  state.profile = { ...state.profile, name: perfil.name, email: perfil.email };
  state.theme = Store.state.theme;
  Store.state = state;

  // faturas que já venceram entram como pagas; a do mês que vem fica em aberto. Precisa ser depois
  // do estado montado, porque o valor da fatura só dá pra calcular com as compras já no lugar.
  cartoes.forEach((c) => {
    meses.forEach((mVenc) => {
      const valor = cartaoFaturaForMonth(c.id, mVenc);
      if (valor <= 0) return;
      Store.state.cartaoFaturasPagas.push({
        id: `demo-fat-${c.id}-${mVenc}`, cartaoId: c.id, mes: mVenc,
        bankId: c.bankId, valor, ledgerApplied: true,
      });
    });
  });

  // os saldos são definidos direto: o histórico já vem quitado, então deixar o livro-razão
  // recalcular tudo só faria o saldo despencar sem sentido
  Store.state.banks.forEach((b) => { b.balance = saldos[b.id]; });
  Store.save();
}
