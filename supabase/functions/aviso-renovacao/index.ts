// Fin360 — avisa por e-mail quem está perto de perder o acesso.
//
// POR QUE ISTO EXISTE: quem paga por Pix avulso não tem cobrança automática. Sem
// um lembrete, a assinatura simplesmente para de funcionar e a pessoa descobre
// tentando lançar um gasto. O aviso dentro do app só chega em quem abre o app —
// e justamente quem está esquecendo de pagar é quem não está abrindo.
//
// Roda uma vez por dia, disparada pelo Cron do Supabase.
//
// PRINCÍPIO: na dúvida, NÃO mandar. E-mail errado ou repetido custa a confiança
// da pessoa e a reputação do domínio; um aviso a menos custa muito pouco, porque
// o app avisa em paralelo.

import { createClient } from 'jsr:@supabase/supabase-js@2';

// Quantos dias antes do fim o e-mail sai. Dois disparos, não cinco: o primeiro dá
// tempo de resolver, o segundo pega quem leu o primeiro e deixou pra depois.
// Mais que isso vira spam e a pessoa cria o hábito de não abrir.
const DIAS_DE_AVISO = [3, 1];

// Teto de segurança. Se uma consulta der errado e voltar a base inteira, é melhor
// a função parar do que disparar mil e-mails e queimar o domínio.
const MAX_POR_EXECUCAO = 200;

// O envio sai do subdomínio porque é ele que está verificado no Resend (SPF/DKIM).
// A resposta vai para o endereço principal, que é o que a pessoa conhece e o que
// cai na caixa que eu leio de verdade.
const REMETENTE = 'Fin360 <contato@mail.fin360app.com.br>';
const RESPONDER_PARA = 'contato@fin360app.com.br';
const APP_URL = 'https://app.fin360app.com.br';

function emDias(dias: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

function porExtenso(iso: string): string {
  return iso.split('-').reverse().join('/');
}

// Comparação em tempo constante, mesmo motivo do webhook da Cakto: comparar com
// === vaza o segredo pelo tempo de resposta.
function segredoConfere(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let dif = 0;
  for (let i = 0; i < a.length; i++) dif |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return dif === 0;
}

function escapar(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* O texto serve para os dois tipos de cliente de propósito. A linha da assinatura
   não diz se a pessoa paga no cartão (renova sozinho) ou por Pix avulso (precisa
   pagar na mão) — e mandar "pague agora" para quem está no cartão faz a pessoa
   comprar duas vezes e pedir reembolso. Então o e-mail explica os dois casos. */
function montarEmail(dias: number, acessoAte: string, checkout: string) {
  const quando = dias === 1 ? 'amanhã' : `em ${dias} dias`;
  const assunto = `Sua assinatura do Fin360° vence ${quando}`;

  const linhas = [
    `Seu acesso ao Fin360° vai até ${porExtenso(acessoAte)}.`,
    'Se você paga no cartão ou no Pix automático, não precisa fazer nada: a cobrança acontece sozinha e o acesso continua normalmente.',
    'Se você paga por Pix a cada mês, este é o momento de pagar.',
    'Passando a data, nada é apagado. Você continua entrando e vendo tudo que já lançou — só não consegue lançar nada novo até o pagamento entrar. Assim que ele cai, o app volta ao normal sozinho.',
  ];

  const texto =
    linhas.join('\n\n') +
    `\n\nPagar: ${checkout}` +
    `\nAbrir o app: ${APP_URL}` +
    `\n\nSe precisar de alguma coisa, é só responder este e-mail.\nFin360°`;

  const html =
    `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1f2430;max-width:520px">` +
    `<p style="font-size:18px;font-weight:600;margin:0 0 18px">Sua assinatura vence ${escapar(quando)}</p>` +
    linhas.map((l) => `<p style="margin:0 0 14px">${escapar(l)}</p>`).join('') +
    `<p style="margin:24px 0"><a href="${escapar(checkout)}" style="background:#4f46e5;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;display:inline-block;font-weight:600">Pagar agora</a></p>` +
    `<p style="margin:0 0 14px"><a href="${APP_URL}" style="color:#4f46e5">Abrir o Fin360°</a></p>` +
    `<p style="margin:24px 0 0;font-size:13px;color:#6b7280">Se precisar de alguma coisa, é só responder este e-mail.</p>` +
    `</div>`;

  return { assunto, texto, html };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const SEGREDO = Deno.env.get('AVISO_CRON_SECRET') ?? '';
  const RESEND_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
  const CHECKOUT = Deno.env.get('CHECKOUT_URL') ?? '';
  // Falta de configuração é erro de instalação, não de uso: parar alto é melhor do
  // que rodar todo dia sem mandar nada e ninguém perceber por um mês.
  const faltando = [
    !SEGREDO && 'AVISO_CRON_SECRET',
    !RESEND_KEY && 'RESEND_API_KEY',
    !CHECKOUT && 'CHECKOUT_URL',
  ].filter(Boolean);
  if (faltando.length) {
    console.error('faltam variaveis: ' + faltando.join(', '));
    return new Response('nao configurado', { status: 500 });
  }

  if (!segredoConfere(req.headers.get('x-fin360-secret') ?? '', SEGREDO)) {
    // Sem esta checagem, quem descobrir a URL dispara e-mail para a base inteira
    // quantas vezes quiser. Resposta sem detalhe, de propósito.
    console.warn('recusado: secret nao confere');
    return new Response('nao autorizado', { status: 401 });
  }

  const db = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  const datas = DIAS_DE_AVISO.map(emDias);

  // Só quem ainda TEM acesso e vence numa das datas de aviso. 'cancelada' fica de
  // fora: a pessoa já decidiu sair, cobrar de novo é insistência.
  const { data: assinaturas, error } = await db
    .from('assinaturas')
    .select('email, acesso_ate, status')
    .in('status', ['ativa', 'atrasada'])
    .in('acesso_ate', datas)
    .limit(MAX_POR_EXECUCAO + 1);

  if (error) {
    console.error('consulta falhou: ' + error.message);
    return new Response(JSON.stringify({ ok: false, erro: 'consulta' }), { status: 500 });
  }

  const alvos = assinaturas ?? [];
  if (alvos.length > MAX_POR_EXECUCAO) {
    console.error(`abortado: ${alvos.length} destinatarios, acima do teto de ${MAX_POR_EXECUCAO}`);
    return new Response(JSON.stringify({ ok: false, erro: 'acima do teto' }), { status: 500 });
  }

  let enviados = 0, repetidos = 0, falhas = 0;

  for (const a of alvos) {
    const dias = DIAS_DE_AVISO[datas.indexOf(a.acesso_ate)];
    const email = String(a.email).trim().toLowerCase();

    // A trava contra repetição é o banco, não a memória desta execução: se o Cron
    // rodar duas vezes (retry, reagendamento, teste manual), a linha já existe e o
    // segundo envio nem começa. Receber o mesmo aviso duas vezes é o tipo de coisa
    // que faz a pessoa marcar o remetente como spam.
    const { error: jaFoi } = await db.from('avisos_enviados').insert({
      email, acesso_ate: a.acesso_ate, dias_antes: dias,
    });
    if (jaFoi) {
      // 23505 = violação de unicidade, ou seja, já mandamos. Qualquer outro erro
      // aqui também vira "não manda": sem registro garantido, não há garantia de
      // não repetir, e repetir é pior do que faltar.
      if (jaFoi.code === '23505') repetidos++;
      else { falhas++; console.error('registro falhou: ' + jaFoi.message); }
      continue;
    }

    const { assunto, texto, html } = montarEmail(dias, a.acesso_ate, CHECKOUT);

    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: REMETENTE, to: [email], reply_to: RESPONDER_PARA,
          subject: assunto, html, text: texto,
        }),
      });

      if (r.ok) {
        enviados++;
      } else {
        falhas++;
        console.error(`resend recusou (${r.status}): ` + (await r.text()).slice(0, 300));
        // Apaga a marca para o envio ser tentado de novo amanhã. Enquanto a data do
        // aviso não passar, ainda dá tempo — deixar a marca gravada transformaria
        // uma falha momentânea do Resend em aviso perdido para sempre.
        await db.from('avisos_enviados').delete()
          .eq('email', email).eq('acesso_ate', a.acesso_ate).eq('dias_antes', dias);
      }
    } catch (e) {
      falhas++;
      console.error('resend inacessivel: ' + String(e).slice(0, 200));
      await db.from('avisos_enviados').delete()
        .eq('email', email).eq('acesso_ate', a.acesso_ate).eq('dias_antes', dias);
    }
  }

  // Sem e-mails no corpo da resposta: ela aparece no log de execução do Cron.
  const resumo = { ok: true, encontrados: alvos.length, enviados, repetidos, falhas };
  console.log(JSON.stringify(resumo));
  return new Response(JSON.stringify(resumo), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
});
