-- Fin360 — tira o e-mail do dono de dentro do código versionado.
--
-- POR QUE: a versão anterior de admin_listar_usuarios() comparava
--   auth.jwt() ->> 'email' <> 'endereco@pessoal'
-- com o endereço escrito na própria função. A trava funcionava, mas o arquivo mora num
-- repositório PÚBLICO no GitHub — ou seja, o e-mail pessoal do dono estava publicado para
-- qualquer um ler, junto de um mapa de onde ele é usado. O mesmo endereço também estava em
-- assets/js/admin.js, que é servido aberto em app.fin360app.com.br.
--
-- A TROCA: quem pode entrar passa a viver numa TABELA, não no texto da função. A tabela
-- guarda user_id (um UUID, que não identifica ninguém para quem está de fora), e a linha
-- com o seu id é inserida pelo editor de SQL do Supabase — nunca pelo repositório.
--
-- Efeito colateral bom: dar acesso a mais alguém no futuro vira um INSERT, não uma edição
-- de função com risco de errar a lógica de permissão.

-- ── 1. Quem é dono ───────────────────────────────────────────────────────────────────
create table if not exists public.admin_donos (
  user_id uuid primary key references auth.users(id) on delete cascade,
  criado_em timestamptz not null default now()
);

-- RLS ligado e NENHUMA policy, de propósito: assim ninguém lê esta tabela pela API, nem
-- logado. Quem enxerga é só a função abaixo, que roda como definer e passa por cima da RLS.
alter table public.admin_donos enable row level security;

-- A pegadinha do Supabase: o schema public concede Dxtm (inclusive TRUNCATE, que ignora
-- RLS) para anon/authenticated em toda tabela nova. Sem isto, qualquer pessoa logada
-- poderia esvaziar a tabela e derrubar o painel.
revoke all on table public.admin_donos from anon, authenticated;

-- ── 2. A função, agora sem nenhum dado pessoal escrito ────────────────────────────────
create or replace function public.admin_listar_usuarios()
returns table (
  user_id uuid,
  email text,
  criado_em timestamptz,
  ultimo_acesso timestamptz,
  email_confirmado boolean,
  assinatura_status text,
  assinatura_plataforma text,
  acesso_ate date
)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Mesma mensagem exata de antes ('acesso negado'): assets/js/admin.js depende dela
  -- para saber que é recusa e não falha de rede.
  if not exists (select 1 from public.admin_donos d where d.user_id = auth.uid()) then
    raise exception 'acesso negado';
  end if;

  return query
  select
    u.id,
    u.email::text,
    u.created_at,
    u.last_sign_in_at,
    (u.email_confirmed_at is not null),
    a.status,
    a.plataforma,
    a.acesso_ate
  from auth.users u
  left join public.assinaturas a on lower(a.email) = lower(u.email)
  order by u.created_at desc;
end;
$$;

revoke all on function public.admin_listar_usuarios() from public;
grant execute on function public.admin_listar_usuarios() to authenticated;

-- ── 3. FALTA UM PASSO, e ele NÃO vai neste arquivo ────────────────────────────────────
-- Rodar no editor de SQL do Supabase, uma vez, trocando pelo seu endereço de login:
--
--   insert into public.admin_donos (user_id)
--   select id from auth.users where lower(email) = lower('SEU@EMAIL.AQUI')
--   on conflict (user_id) do nothing;
--
-- Conferir que pegou (tem que devolver 1):
--
--   select count(*) from public.admin_donos;
--
-- Enquanto essa linha não existir, o painel recusa VOCÊ TAMBÉM — a função não tem mais
-- nenhum dono embutido. Rodar o insert junto, na mesma sessão do editor.
