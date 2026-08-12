-- Fin360 — cancelar deixou de significar "perde agora".
--
-- A regra era `status in ('ativa','atrasada')`. Como o webhook marca 'cancelada' ao
-- receber o cancelamento e NÃO mexe na data — de propósito, para preservar o período
-- já pago —, quem cancelasse perderia o acesso no mesmo instante.
--
-- O caso caro: alguém paga R$ 147 pelo ano em agosto, em setembro clica em cancelar
-- achando que está apenas desligando a renovação, e perde 11 meses que já pagou.
-- Essa pessoa abre disputa no cartão, e com razão.
--
-- Agora quem corta é só a data. Os dois caminhos continuam distintos:
--   cancelamento → status 'cancelada', data intacta  → usa até o fim do que pagou
--   reembolso    → status 'cancelada', data = hoje   → perde no dia seguinte
--
-- Aplicado por substituição de texto sobre a definição existente, para não reescrever
-- de memória a parte que casa user_id/e-mail — essa continua exatamente como estava.

do $do$
declare def text;
begin
  select pg_get_functiondef(p.oid) into def
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where p.proname = 'tem_acesso' and n.nspname = 'public';

  -- trava: se o texto não for exatamente o esperado, não mexe em nada
  if position('in (''ativa'', ''atrasada'')' in def) = 0 then
    raise exception 'trecho esperado nao encontrado; funcao intacta';
  end if;

  def := replace(def,
    'in (''ativa'', ''atrasada'')',
    'in (''ativa'', ''atrasada'', ''cancelada'')');

  execute def;
end
$do$;

-- O espelho desta regra vive em assets/js/store.js, na função assinaturaEmDia().
-- As duas precisam mudar juntas: se divergirem, ou o app bloqueia quem pagou, ou
-- deixa passar quem não pagou.
