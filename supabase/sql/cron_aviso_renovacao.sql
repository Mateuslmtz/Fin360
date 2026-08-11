-- Fin360 — agenda o aviso de vencimento para rodar todo dia.
--
-- O SEGREDO NÃO ENTRA NESTE ARQUIVO. Ele está versionado no Git, e num repositório
-- público. Troque COLE_O_SEGREDO_AQUI pelo valor de AVISO_CRON_SECRET na hora de
-- rodar, e nunca commite a versão preenchida.
--
-- Requisitos, já instalados no projeto: extensão pg_cron e extensão pg_net.

-- 12:00 UTC = 09:00 no horário de Brasília. De manhã, num horário em que a pessoa
-- consegue resolver no mesmo dia — aviso que chega de madrugada é aviso que dorme
-- na caixa de entrada e é lido junto com o resto, sem urgência nenhuma.
select cron.schedule(
  'aviso-renovacao-diario',
  '0 12 * * *',
  $$
  select net.http_post(
    url := 'https://gcutaavpaboqvtzvknyj.supabase.co/functions/v1/aviso-renovacao',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-fin360-secret', 'COLE_O_SEGREDO_AQUI'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

-- Para conferir depois:
--   select jobname, schedule, active from cron.job;
--   select * from cron.job_run_details order by start_time desc limit 10;
--
-- Para trocar o segredo ou o horário, rode o mesmo cron.schedule com o mesmo nome:
-- ele substitui o agendamento existente em vez de criar um segundo.
