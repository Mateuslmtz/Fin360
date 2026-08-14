-- Fin360 — painel de admin: lista de assinantes para o dono do produto.
--
-- SECURITY DEFINER porque precisa ler auth.users (last_sign_in_at, email_confirmed_at),
-- que 'authenticated' não enxerga diretamente (a tabela não é exposta via PostgREST).
-- A trava de quem pode chamar fica DENTRO da função, checando o e-mail do token —
-- por isso dá pra conceder EXECUTE pra 'authenticated' com segurança: qualquer outra
-- pessoa logada que chamar recebe exceção, não dado.
--
-- Mesmo padrão de assinaturas_select_own.sql: auth.jwt() ->> 'email' lê a claim do
-- próprio token da requisição, sem tocar em auth.users, então funciona sob qualquer papel.
--
-- Deliberadamente NÃO inclui estado_usuario (o dado financeiro de cada cliente) — o
-- painel é de conta/assinatura, não de extrato. Ver fin360-lovable-rebuild.md.

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
  if coalesce(auth.jwt() ->> 'email', '') <> 'email-do-dono-removido' then
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

-- Reenvio de senha reusa o endpoint público de sempre (/auth/v1/recover, já usado em
-- Sb.resetPassword no app) — não precisa de função nova nem de service_role.
