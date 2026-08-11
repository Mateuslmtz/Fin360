-- Fin360 — permissão de leitura da própria assinatura.
--
-- POR QUE ISTO EXISTE COMO ESTÁ: a versão anterior desta policy consultava
-- auth.users em linha, para casar a assinatura pelo e-mail:
--
--   lower(email) = lower((select u.email from auth.users u where u.id = auth.uid()))
--
-- A expressão de uma policy roda com o papel de quem chama, e 'authenticated' não
-- tem permissão em auth.users. A subconsulta não devolvia nada, e a linha ficava
-- invisível sempre que user_id era nulo.
--
-- E user_id nulo é o caso COMUM, não a exceção: o cliente compra antes de existir
-- conta no app, o webhook grava a assinatura só com o e-mail, e o vínculo com
-- user_id só acontece numa compra posterior.
--
-- O estrago não era o bloqueio (esse funcionava, porque tem_acesso() é SECURITY
-- DEFINER e enxerga auth.users). Era a MENSAGEM: o app não achava a assinatura e
-- dizia "não há assinatura para este e-mail" para quem na verdade tinha uma
-- vencida — mandando a pessoa procurar outro e-mail em vez de renovar.
--
-- auth.jwt() lê a claim do próprio token da requisição e não toca em tabela
-- nenhuma, então funciona sob qualquer papel.

drop policy if exists assinaturas_select_own on public.assinaturas;

create policy assinaturas_select_own on public.assinaturas
for select using (
  user_id = auth.uid()
  or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

-- Conferido em 11/08/2026 reproduzindo o caso quebrado dentro de uma transação
-- desfeita: com user_id nulo e só a claim de e-mail, a linha aparece — e aparece
-- apenas a dela, não a dos outros.
