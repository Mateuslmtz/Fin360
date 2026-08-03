// Fin360 — recebe os eventos da Cakto e libera ou corta o acesso.
//
// Esta é a ÚNICA peça que conhece a Cakto. Trocar de plataforma (Hotmart, Kiwify)
// é reescrever este arquivo; a tabela assinaturas e a trava no banco não mudam.
//
// PRINCÍPIO: na dúvida, MANTER o acesso. Cortar quem pagou é muito pior do que
// dar alguns dias a mais para quem cancelou. Todo caminho incerto erra para o
// lado de deixar a pessoa entrar, e registra para revisão depois.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const DIAS_TOLERANCIA = 3;

// Comparação em tempo constante. Comparar com === vaza informação pelo tempo de
// resposta e permite descobrir o secret caractere por caractere.
function segredoConfere(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let dif = 0;
  for (let i = 0; i < a.length; i++) dif |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return dif === 0;
}

// A documentação da Cakto não mostra o JSON completo, então procuramos em vários
// caminhos prováveis em vez de assumir um.
function buscar(obj: any, caminhos: string[]): any {
  for (const c of caminhos) {
    let v = obj;
    for (const parte of c.split('.')) {
      if (v == null) break;
      v = v[parte];
    }
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return null;
}

function emDias(dias: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const SEGREDO = Deno.env.get('CAKTO_WEBHOOK_SECRET') ?? '';
  if (!SEGREDO) {
    console.error('CAKTO_WEBHOOK_SECRET nao configurado');
    return new Response('nao configurado', { status: 500 });
  }

  let corpo: any;
  try {
    corpo = await req.json();
  } catch {
    return new Response('json invalido', { status: 400 });
  }

  // 1. Autenticidade. A Cakto manda o secret DENTRO do corpo (não é assinatura
  //    HMAC no cabeçalho). Sem esta checagem, qualquer um que descobrir a URL
  //    manda "compra aprovada" e ganha acesso vitalício de graça.
  const recebido = String(buscar(corpo, ['secret']) ?? '');
  if (!segredoConfere(recebido, SEGREDO)) {
    // Sem detalhe na resposta: não confirmar para um atacante o que ele acertou.
    console.warn('webhook recusado: secret nao confere');
    return new Response('nao autorizado', { status: 401 });
  }

  const db = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  const tipo = String(buscar(corpo, ['event', 'type', 'event_type']) ?? 'desconhecido');

  // No modo "Agrupado" a Cakto manda UMA lista com todos os itens da venda: a
  // oferta principal e os order bumps juntos. Precisamos do item que é a
  // assinatura — pegar o bump por engano registraria a transação errada.
  const itens: any[] = Array.isArray(corpo?.data)
    ? corpo.data
    : (corpo?.data ? [corpo.data] : [corpo]);

  const PRODUTO_ID = Deno.env.get('CAKTO_PRODUCT_ID') ?? '';
  const item =
    // 1º: o item do produto configurado, se soubermos qual é
    (PRODUTO_ID
      ? itens.find((i) => i?.product?.id === PRODUTO_ID || i?.product?.short_id === PRODUTO_ID)
      : null)
    // 2º: a oferta principal (bump nunca é 'main')
    ?? itens.find((i) => i?.offer_type === 'main')
    // 3º: último recurso
    ?? itens[0]
    ?? {};

  const transacao = buscar(item, ['id', 'refId']);
  const email = buscar(item, ['customer.email', 'buyer.email', 'email']);

  // Chave de deduplicação: tipo do evento + id da transação. O mesmo evento
  // reenviado traz o mesmo id e é barrado; uma renovação do mês seguinte é
  // outra transação e passa normalmente.
  const eventoId = String(
    buscar(corpo, ['event_id', 'eventId']) ?? `${tipo}:${transacao ?? 'sem-id'}`,
  );

  const registrar = async (resultado: string, detalhe?: string) => {
    // NUNCA gravar o corpo cru: contém o secret e dados pessoais do comprador.
    await db.from('webhook_eventos').insert({
      evento_id: eventoId, plataforma: 'cakto', tipo,
      email: email ?? null, transacao_id: transacao ? String(transacao) : null,
      resultado, detalhe: detalhe ?? null,
    });
  };

  // 2. Evento repetido. A Cakto reenvia quando não recebe confirmação rápida.
  //    Sem isto, "compra aprovada" processada duas vezes vira dois meses de
  //    acesso pelo preço de um.
  const { data: jaVisto } = await db
    .from('webhook_eventos').select('id').eq('evento_id', eventoId).maybeSingle();
  if (jaVisto) {
    return new Response(JSON.stringify({ ok: true, nota: 'evento ja processado' }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!email) {
    // Sem e-mail não há como ligar a compra a uma conta. Registramos as CHAVES
    // que vieram (sem os valores) para eu corrigir o caminho de leitura.
    await registrar('erro', `sem e-mail; itens=${itens.length}; chaves do item: ` + Object.keys(item || {}).join(','));
    // 200 de propósito: com erro a Cakto reenviaria para sempre um evento que
    // nunca vai funcionar. Fica registrado para conserto.
    return new Response(JSON.stringify({ ok: false, erro: 'sem e-mail' }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }

  // 3. O que este evento faz com o acesso.
  let status: string | null = null;
  let acessoAte: string | null = null;
  let resultado = 'ignorado';

  switch (tipo) {
    case 'purchase_approved':
    case 'subscription_created':
    case 'subscription_renewed': {
      // Se a Cakto informar a próxima cobrança, usamos ela. Senão, 31 dias:
      // erra para o lado de manter o acesso.
      const proxima = buscar(item, [
        'subscription.nextPayment', 'subscription.next_billing_date',
        'subscription.nextBillingDate', 'nextPayment', 'next_billing_date', 'due_date',
      ]);
      acessoAte = proxima ? String(proxima).slice(0, 10) : emDias(31);
      status = 'ativa';
      resultado = 'liberado';
      break;
    }

    case 'subscription_renewal_refused': {
      // Cobrança falhou: começa a tolerância. Não corta agora — cartão recusado
      // por bobagem é comum e travar no mesmo dia irrita cliente bom.
      acessoAte = emDias(DIAS_TOLERANCIA);
      status = 'atrasada';
      resultado = 'tolerancia';
      break;
    }

    case 'subscription_canceled': {
      // Cancelou: mantém até o fim do período JÁ PAGO. A pessoa pagou por ele.
      status = 'cancelada';
      resultado = 'cancelada-mantem-periodo';
      break;
    }

    case 'refund':
    case 'chargeback': {
      // Devolveu o dinheiro: acesso encerra hoje.
      acessoAte = emDias(0);
      status = 'cancelada';
      resultado = 'cortado';
      break;
    }

    default:
      // initiate_checkout, checkout_abandonment, pix_gerado, boleto_gerado,
      // purchase_refused e afins não mexem em acesso.
      await registrar('ignorado', 'evento sem efeito em acesso');
      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
  }

  // 4. Grava a assinatura. Chaveada por e-mail porque a pessoa compra antes de
  //    existir conta no app, e pode cadastrar com outro e-mail depois.
  const linha: Record<string, unknown> = {
    email: String(email).trim().toLowerCase(),
    status,
    plataforma: 'cakto',
    transacao_id: transacao ? String(transacao) : null,
    atualizada_em: new Date().toISOString(),
  };
  if (acessoAte) linha.acesso_ate = acessoAte;

  const { error } = await db.from('assinaturas').upsert(linha, { onConflict: 'email' });

  if (error) {
    await registrar('erro', error.message);
    // 500 aqui é proposital: foi falha NOSSA, e queremos que a Cakto reenvie.
    return new Response(JSON.stringify({ ok: false }), { status: 500 });
  }

  // 5. Se a conta já existe, liga o user_id agora — assim o acesso vale mesmo
  //    que a pessoa mude o e-mail de login depois.
  const { data: usuarios } = await db.auth.admin.listUsers();
  const u = usuarios?.users?.find(
    (x) => (x.email ?? '').toLowerCase() === String(email).trim().toLowerCase(),
  );
  if (u) await db.from('assinaturas').update({ user_id: u.id }).eq('email', String(email).trim().toLowerCase());

  await registrar(
    resultado,
    `${u ? 'conta ja existe, vinculada' : 'conta ainda nao criada'}` +
      ` | itens na venda: ${itens.length}` +
      ` | oferta: ${item?.offer_type ?? '?'}` +
      ` | produto: ${item?.product?.name ?? '?'}` +
      ` | acesso ate: ${acessoAte ?? 'inalterado'}`,
  );

  return new Response(JSON.stringify({ ok: true, resultado }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
});
