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
  const recebido = String(buscar(corpo, ['secret', 'data.secret']) ?? '');
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

  const tipo = String(buscar(corpo, ['event', 'type', 'event_type', 'data.event']) ?? 'desconhecido');
  const transacao = buscar(corpo, ['id', 'data.id', 'refId', 'data.refId', 'transaction_id']);
  const email = buscar(corpo, [
    'customer.email', 'data.customer.email', 'buyer.email', 'data.buyer.email', 'email', 'data.email',
  ]);
  // Um id por ENTREGA do evento. Se a Cakto não mandar, montamos um estável a
  // partir de tipo + transação, para o reenvio do mesmo evento ser barrado.
  const eventoId = String(
    buscar(corpo, ['event_id', 'eventId', 'data.event_id']) ?? `${tipo}:${transacao ?? 'sem-id'}`,
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
    await registrar('erro', 'sem e-mail no payload; chaves recebidas: ' + Object.keys(corpo || {}).join(','));
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
      const proxima = buscar(corpo, [
        'nextPayment', 'data.nextPayment', 'subscription.nextPayment',
        'next_billing_date', 'data.next_billing_date',
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

  await registrar(resultado, u ? 'conta ja existe, vinculada' : 'conta ainda nao criada');

  return new Response(JSON.stringify({ ok: true, resultado }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
});
