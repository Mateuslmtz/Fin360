-- Fin360 — registro dos avisos de vencimento já enviados por e-mail.
--
-- Existe por um motivo só: garantir que ninguém receba o mesmo aviso duas vezes.
-- A rotina roda uma vez por dia, mas "uma vez por dia" é promessa de agendador —
-- retry, reagendamento e teste manual acontecem. A garantia de verdade tem que
-- estar no banco, e é o índice único abaixo.

create table if not exists public.avisos_enviados (
  id          bigserial primary key,
  email       text        not null,
  acesso_ate  date        not null,  -- o vencimento sobre o qual avisamos
  dias_antes  smallint    not null,  -- 3 ou 1: são avisos diferentes, cada um sai uma vez
  enviado_em  timestamptz not null default now()
);

-- O par (quem, qual vencimento, qual dos avisos) é o que não pode repetir.
-- Sem isto o insert não falha e a rotina manda de novo.
create unique index if not exists avisos_enviados_unico
  on public.avisos_enviados (email, acesso_ate, dias_antes);

-- A tabela guarda e-mail de cliente e é lida só pela Edge Function, que usa a
-- service_role (ignora RLS). Ligar RLS sem criar nenhuma policy é justamente o
-- que queremos: fecha para anon e para usuário logado, e não atrapalha a função.
alter table public.avisos_enviados enable row level security;
