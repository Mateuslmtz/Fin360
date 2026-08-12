# Fin360° — especificação para reconstrução no Lovable

Documento para ser passado ao Lovable em **etapas**. Não cole tudo de uma vez:
o Lovable se perde em prompts muito longos e você não consegue testar o que
saiu. Cada bloco `PROMPT N` abaixo é uma mensagem separada, na ordem.

Stack alvo: **React + Vite + Tailwind + shadcn/ui + Supabase**
(auth, Postgres, RLS, Edge Functions, Storage).

---

## PROMPT 0 — contexto (cole junto com o PROMPT 1)

```text
Vamos construir o Fin360°, um sistema web de controle de finanças pessoais,
em português do Brasil. Já existe uma versão funcionando em HTML/CSS/JS puro
com localStorage; estamos migrando para uma aplicação multiusuário com login
e banco de dados.

REGRAS QUE VALEM PARA TODAS AS ETAPAS:

1. Não invente funcionalidade. Implemente exatamente o que está especificado.
   Se algo estiver ambíguo, pergunte antes de assumir.
2. Este é um sistema financeiro. Nenhum cálculo pode ser aproximado ou
   "melhorado". As regras de cálculo estão especificadas e devem ser seguidas
   ao pé da letra, mesmo que pareçam estranhas.
3. Todo valor monetário é armazenado em CENTAVOS, como INTEGER. Nunca use
   float para dinheiro. A formatação em R$ acontece só na interface.
4. Meses são sempre string 'YYYY-MM'. Datas são sempre DATE ('YYYY-MM-DD').
   Não use timestamp para data de lançamento — só para createdAt/updatedAt.
5. Toda tabela de dados do usuário tem user_id e RLS ativo. Nenhuma exceção.
6. Idioma da interface: português do Brasil. Nomes de tabela e coluna em
   português sem acento (ex: gastos_fixos, dia_vencimento).

IDENTIDADE VISUAL:
- Nome: Fin360° (o símbolo de grau faz parte do nome)
- Cores: fundo azul-marinho #0e1c6e, destaque azul #3866ff, texto branco
- Tema escuro por padrão, com alternância para tema claro
- Números grandes e destacados são o elemento visual central
```

---

## PROMPT 1 — banco de dados, login e isolamento

```text
Crie o schema do banco e a autenticação.

## AUTENTICAÇÃO
- Supabase Auth com e-mail + senha
- Confirmação de e-mail obrigatória no cadastro
- Recuperação de senha
- Proteção contra força bruta no login (rate limit)
- Após o cadastro, criar automaticamente uma linha em `profiles` via trigger

## TABELAS

profiles
  id uuid PK (= auth.users.id)
  nome text
  email text
  is_admin boolean default false
  gasto_cartao_por_compra boolean default true   -- regime, ver PROMPT 2
  tema text default 'escuro'
  ocultar_valores boolean default false
  onboarding_concluido boolean default false
  created_at timestamptz default now()

categorias
  id uuid PK
  user_id uuid FK profiles
  nome text
  cor text
  emoji text
  tipo text CHECK (tipo IN ('despesa','receita'))
  padrao boolean default false      -- categorias criadas no cadastro
  ordem int

bancos
  id uuid PK
  user_id uuid
  nome text
  saldo_centavos bigint default 0
  cor text
  created_at timestamptz

cartoes
  id uuid PK
  user_id uuid
  nome text
  banco_id uuid FK bancos NULL      -- banco de onde sai o pagamento da fatura
  limite_centavos bigint
  dia_fechamento int CHECK (dia_fechamento BETWEEN 1 AND 31)
  dia_vencimento int CHECK (dia_vencimento BETWEEN 1 AND 31)
  cor text

gastos_fixos                        -- despesa RECORRENTE (uma linha = todos os meses)
  id uuid PK
  user_id uuid
  nome text
  valor_centavos bigint
  dia_vencimento int
  categoria_id uuid FK categorias
  banco_id uuid FK bancos NULL
  cartao_id uuid FK cartoes NULL    -- se preenchido, é pago pela fatura do cartão
  meio_pagamento text NULL CHECK (meio_pagamento IN ('pix','ted','boleto'))
  ativo boolean default true
  inicio_mes text NULL              -- 'YYYY-MM'; se null usa o mês de created_at
  fim_mes text NULL                 -- 'YYYY-MM' EXCLUSIVO: o gasto NÃO ocorre neste mês
  observacao text
  created_at timestamptz

gastos_fixos_historico              -- valor/dia vigentes A PARTIR de cada mês
  id uuid PK
  user_id uuid
  gasto_fixo_id uuid FK
  mes text                          -- 'YYYY-MM'
  valor_centavos bigint
  dia_vencimento int

gastos_fixos_pagamentos             -- baixa de UM mês específico
  id uuid PK
  user_id uuid
  gasto_fixo_id uuid FK
  mes text
  banco_id uuid FK bancos
  data date
  valor_centavos bigint
  ledger_aplicado boolean default false
  UNIQUE (gasto_fixo_id, mes)

gastos_fixos_meses_ocultos          -- "excluir apenas este mês"
  id uuid PK
  user_id uuid
  gasto_fixo_id uuid FK
  mes text
  UNIQUE (gasto_fixo_id, mes)

gastos_variaveis
  id uuid PK
  user_id uuid
  descricao text
  valor_centavos bigint             -- valor CHEIO da compra (antes do racha)
  data date
  categoria_id uuid FK categorias
  banco_id uuid FK bancos NULL
  cartao_id uuid FK cartoes NULL
  meio_pagamento text NULL
  estorno boolean default false     -- quando true, valor_centavos é NEGATIVO
  tipo text CHECK (tipo IN ('unico','parcelado')) default 'unico'
  parcelas int default 1
  status text CHECK (status IN ('pago','pendente')) default 'pendente'
  observacao text
  created_at timestamptz

divisoes                            -- RACHA: partes que NÃO são suas
  id uuid PK
  user_id uuid
  origem text CHECK (origem IN ('fixo','variavel'))
  gasto_fixo_id uuid FK NULL
  gasto_variavel_id uuid FK NULL
  pessoa text
  valor_centavos bigint
  CHECK (num_nonnulls(gasto_fixo_id, gasto_variavel_id) = 1)

recebimentos
  id uuid PK
  user_id uuid
  descricao text
  valor_centavos bigint
  data date
  categoria_id uuid FK categorias
  banco_id uuid FK bancos
  tipo text CHECK (tipo IN ('unico','recorrente','parcelado')) default 'unico'
  parcelas int default 1
  data_final date NULL              -- só para recorrente
  observacao text
  created_at timestamptz

recebimentos_recebidos
  id uuid PK
  user_id uuid
  recebimento_id uuid FK
  mes text
  ledger_aplicado boolean default false
  UNIQUE (recebimento_id, mes)

cartao_faturas_pagas
  id uuid PK
  user_id uuid
  cartao_id uuid FK
  mes text                          -- mês do VENCIMENTO, não da compra
  banco_id uuid FK bancos
  valor_centavos bigint
  ledger_aplicado boolean default false
  UNIQUE (cartao_id, mes)

cofrinhos
  id uuid PK
  user_id uuid
  nome text
  meta_centavos bigint
  atual_centavos bigint default 0
  icone text
  cor text
  prazo date NULL
  aporte_automatico boolean default false
  dia_aporte int NULL
  valor_aporte_centavos bigint NULL
  conta_origem_id uuid FK bancos NULL
  ultimo_aporte_mes text NULL
  observacao text
  created_at timestamptz

transferencias
  id uuid PK
  user_id uuid
  de_id uuid FK bancos
  para_id uuid FK bancos
  valor_centavos bigint
  data date
  observacao text
  created_at timestamptz

metas_categoria
  id uuid PK
  user_id uuid
  categoria_id uuid FK
  mes text
  valor_centavos bigint
  UNIQUE (categoria_id, mes)

## SEGURANÇA — RLS (a parte mais importante desta etapa)

Ative Row Level Security em TODAS as tabelas acima.

Para todas as tabelas com user_id, crie as 4 políticas:
  SELECT / INSERT / UPDATE / DELETE  USING (auth.uid() = user_id)
  e WITH CHECK (auth.uid() = user_id) no INSERT e UPDATE.

Em `profiles`: o usuário lê e edita apenas a própria linha (auth.uid() = id).
O campo is_admin NÃO pode ser alterado pelo próprio usuário — bloqueie por
política ou por trigger.

NUNCA use a service_role key no código do frontend.

## VALIDAÇÃO OBRIGATÓRIA ANTES DE SEGUIR
Crie duas contas de teste. Logado como a conta A, tente ler e alterar dados
da conta B por chamada direta ao Supabase. Todas devem falhar. Só siga para
a próxima etapa depois que isso estiver comprovado.

## SEED
Ao criar um usuário, inserir as categorias padrão:
Despesa: Alimentação, Assinaturas, Cofrinho, Educação, Lazer, Moradia,
Saúde, Transporte, Outros
Receita: Salário, Freelancer, Comissão, Renda Extra, Reembolso, Outros
```

---

## PROMPT 2 — as regras de cálculo (a parte que não pode errar)

> Esta é a etapa onde uma reconstrução por IA erra silenciosamente. Os números
> saem *quase* certos, e ninguém percebe. Leia junto com o Lovable e confira
> caso a caso com os testes do final do documento.

```text
Implemente a camada de cálculo como funções puras, em um módulo separado da
interface (ex: src/lib/financas.ts). Nenhuma dessas regras pode ser
simplificada.

## 1. GASTOS FIXOS SÃO RECORRÊNCIAS, NÃO REGISTROS
Uma linha em gastos_fixos representa a despesa em TODOS os meses, não em um.

Um gasto fixo OCORRE no mês M quando todas forem verdadeiras:
  - ativo = true
  - M >= mes_inicial   (inicio_mes, ou o mês de created_at se nulo)
  - fim_mes é nulo OU M < fim_mes      (fim_mes é EXCLUSIVO)
  - não existe linha em gastos_fixos_meses_ocultos para (gasto, M)

Valor e dia de vencimento vigentes no mês M:
  pegue em gastos_fixos_historico a linha com o maior `mes` que seja <= M.
  Se não houver nenhuma, use os valores da própria linha de gastos_fixos.

Pago/pendente é POR MÊS:
  - se cartao_id for nulo: existe linha em gastos_fixos_pagamentos para (gasto, M)
  - se cartao_id estiver preenchido: segue o pagamento da FATURA do cartão
    (ver regra 6), o gasto fixo não tem baixa própria

## 2. GASTOS VARIÁVEIS: ÚNICO OU PARCELADO
Mês-base = mês da coluna `data`.

  - tipo 'unico': ocorre só no mês-base, com o valor cheio.
  - tipo 'parcelado' (só faz sentido com cartao_id): ocorre em `parcelas`
    meses consecutivos a partir do mês-base. Valor de cada parcela =
    arredondar(valor / parcelas) em centavos. Rótulo "i/N".

Estorno: quando estorno = true, valor_centavos é NEGATIVO e ABATE da fatura.
Não trate estorno como receita em lugar nenhum — ele reduz a despesa.

## 3. RACHA (divisões)
  valor_dividido = soma das divisoes daquele lançamento
  valor_meu      = max(0, valor - valor_dividido)
  fracao_minha   = valor > 0 ? valor_meu / valor : 1

Em lançamento parcelado, o racha se aplica A CADA PARCELA:
  valor_meu_da_parcela = arredondar(valor_da_parcela * fracao_minha)

REGRA DE OURO: a fatura do cartão usa o valor CHEIO (é o que sai do banco).
O orçamento (Dashboard e Controle do Ano) usa o valor MEU. Os dois números
são diferentes de propósito e ambos precisam aparecer.

## 4. DATA DE VENCIMENTO DA FATURA
Dada uma compra no dia D do mês M, no cartão C:

  fechamento = C.dia_fechamento (se nulo, 31)
  vencimento = C.dia_vencimento (se nulo, 1)

  mes_fechamento = (D <= fechamento) ? M : M + 1 mês
  mes_vencimento = (vencimento > fechamento) ? mes_fechamento
                                             : mes_fechamento + 1 mês
  dia = min(vencimento, último dia de mes_vencimento)
  vencimento_iso = mes_vencimento + '-' + dia

Isto é SÓ a data em que o dinheiro sai. NÃO desloca o mês em que a compra
conta no orçamento — isso é sempre o mês da compra (ver regra 5).

## 5. CARTÃO TEM DOIS AGRUPAMENTOS DIFERENTES DOS MESMOS ITENS

  a) COMPETÊNCIA — itens pelo mês da COMPRA.
     É o que entra no orçamento do mês ("fechar o mês").
     Compra de julho conta em julho, mesmo que a fatura vença em agosto.

  b) FATURA — itens cujo VENCIMENTO cai no mês.
     É o que aparece na aba Cartões e o que de fato sai do banco.
     Para montar a fatura de vencimento V, varra os meses de competência
     de V-3 até V e fique com os itens cujo vencimento_iso caia em V.
     (Uma fatura pode englobar compras de até ~2 meses antes.)

  Os dois agrupamentos leem gastos_fixos E gastos_variaveis do cartão.

## 6. REGIME (configuração do usuário)
profiles.gasto_cartao_por_compra:
  true  (padrão) = o orçamento usa COMPETÊNCIA (mês da compra)
  false           = o orçamento usa FATURA (mês do vencimento)

O regime vale APENAS para o orçamento (Dashboard e Controle do Ano).
A aba Cartões, o estado pago/não-pago da fatura, o limite e o saldo do banco
seguem SEMPRE o vencimento, independentemente do regime.

Pagamento da fatura é sempre por (cartao_id, mês do VENCIMENTO).

## 7. LIMITE DO CARTÃO
limite_usado = soma do valor CHEIO de todos os itens de faturas ainda NÃO
pagas (todas as faturas em aberto, não só a do mês).
limite_disponivel = limite - limite_usado.

## 8. RAZÃO DO BANCO — IDEMPOTÊNCIA (já causou bug na versão atual)
Todo registro que movimenta saldo de banco tem a coluna `ledger_aplicado`:
  - gastos_fixos_pagamentos
  - recebimentos_recebidos
  - cartao_faturas_pagas

Regras:
  - ao gravar a baixa: debitar/creditar o banco E marcar ledger_aplicado = true,
    na MESMA transação
  - ao substituir uma baixa existente: primeiro DESFAZER o efeito da anterior
    (crédito inverso), depois aplicar a nova
  - ao desfazer/estornar: reverter e apagar o registro
  - nunca recalcular saldo somando tudo de novo em cima do saldo atual

Prefira implementar isso em uma função Postgres com transação, não no
frontend, para não haver saldo inconsistente se o navegador cair no meio.

## 9. RECEBIMENTOS
  - 'unico': ocorre no mês da data
  - 'parcelado': N meses consecutivos, valor/parcelas
  - 'recorrente': todo mês a partir do mês da data, até data_final (se houver)
Recebido/pendente é por mês, em recebimentos_recebidos.

## 10. ARREDONDAMENTO
Trabalhando em centavos (inteiro), arredonde na divisão de parcelas e no
racha usando arredondamento comercial (metade para cima). A soma das parcelas
pode não fechar exatamente com o total — isso é aceitável e é como a versão
atual funciona.
```

---

## PROMPT 3 — telas

```text
Construa as telas. Menu lateral recolhível; no celular vira menu sobreposto
com fundo clicável para fechar. Todas as tabelas precisam funcionar em 390px
de largura sem estourar a tela (use rolagem horizontal só na tabela, nunca na
página).

1. DASHBOARD
   - Cards "Hoje": Já recebido, Já pago, Saldo atual
   - Cards "Projeção do mês": Gastos do mês, Recebimentos do mês, Saldo do mês
   - Gráfico de barras Receitas × Despesas dos últimos 6 meses
     (receitas = recebimentos do mês EXCLUINDO a categoria Reembolso;
      despesas = variáveis + fixos + cartão, respeitando o REGIME)
   - Rosca de gastos por categoria, com % e valor ao lado de cada nome
   - Painel de últimos lançamentos (só até a data de hoje, mais recentes primeiro)
   - Tabela "Controle do Ano — mês por mês": meses realizados, mês atual e
     meses futuros já agendados
   - Filtro por banco no topo

2. RESUMO — visão consolidada do período selecionado

3. RECEBIMENTOS — lista com coluna Tipo (Único / Recorrente / Parcelado),
   cards de Total recebido, Previsto, Maior recebimento, Ticket médio,
   marcar como recebido por mês

4. GASTOS VARIÁVEIS — cadastro rápido, filtros por categoria e por status,
   busca por descrição, cards Encontrados / Total / Média, marcar pago,
   lançar estorno, badge "NA FATURA" quando vinculado a cartão

5. GASTOS FIXOS — cadastro com dia de vencimento, cards Cadastrados / Pago no
   mês / Pendente / Desativados, lista com status PAGO ou A PAGAR e ação de
   Reabrir, editar "a partir deste mês" (grava em gastos_fixos_historico),
   excluir "apenas este mês" (grava em gastos_fixos_meses_ocultos)

6. CARTÕES DE CRÉDITO — cards Cartões / A pagar no mês / Parcelas ativas /
   Limite total; por cartão: Limite total, Limite usado, Limite disponível,
   Saldo da fatura, SEU CUSTO REAL (com a nota "R$ X são de racha"),
   seletor de mês da fatura, botão Pagar fatura, rosca de categorias da
   fatura selecionada, e tabela de lançamentos com as colunas
   Descrição / Lançamento / Valor da fatura / Sua parte

7. COFRINHOS — meta, valor atual, barra de progresso com %, botão Depositar,
   aporte automático opcional

8. PLANEJAMENTO — metas por categoria no mês, comparadas com o realizado

9. BANCOS — contas com saldo, transferência entre contas

10. EXTRATO — histórico com os mesmos filtros do Dashboard; cards Total de
    gastos, Recebimentos, A receber, Total pago, Falta pagar, Saldo do
    período, Entradas realizadas, Saídas pagas

11. CONFIGURAÇÕES — perfil, tema, ocultar valores, categorias,
    REGIME DO CARTÃO (mês da compra × mês do vencimento, com explicação),
    exportar dados, importar dados, apagar conta

Onboarding: ao entrar pela primeira vez, um passo a passo pedindo para
cadastrar o primeiro banco, o primeiro cartão e o primeiro gasto fixo.
Tela vazia é onde o usuário desiste.
```

---

## PROMPT 4 — migração dos dados atuais

```text
A versão antiga guarda tudo em localStorage num único objeto JSON.
Crie:

1. Na versão ANTIGA (arquivo separado que eu vou rodar): um botão que baixa
   todo o localStorage como fin360-backup.json

2. Na versão NOVA: em Configurações > Importar, aceitar esse JSON e gravar
   tudo no banco do usuário logado, convertendo:
   - todos os valores de reais (float) para CENTAVOS (inteiro):
     Math.round(valor * 100)
   - os ids antigos (string) para uuid, mantendo um mapa de-para para
     preservar os relacionamentos
   - o array `divisoes` embutido em cada gasto vira linhas na tabela divisoes
   - o array `historico` embutido em gastos_fixos vira linhas em
     gastos_fixos_historico
   - ignorar `cartaoCompras` e `migradoCartaoComprasV2` (legado)
   - marcar ledger_aplicado = true em TODOS os registros de pagamento
     importados, e gravar os saldos dos bancos exatamente como vieram
     (não recalcular, senão o saldo é debitado duas vezes)

3. Exportar: a versão nova também precisa exportar tudo em JSON (exigência
   de portabilidade de dados da LGPD).

Mostre um relatório ao final: quantos registros de cada tipo foram
importados, e a soma dos saldos antes e depois — os dois têm que bater.
```

---

## PROMPT 5 — assinatura e liberação de acesso

```text
Controle de acesso pago.

TABELAS
assinaturas
  id uuid PK
  user_id uuid FK profiles UNIQUE
  status text CHECK (status IN ('trial','ativa','inadimplente','cancelada','expirada'))
  plano text
  provedor text
  provedor_assinatura_id text
  inicio_em timestamptz
  expira_em timestamptz
  cancelada_em timestamptz NULL
  atualizado_em timestamptz

webhook_eventos
  id uuid PK
  provedor text
  evento_id text UNIQUE        -- deduplicação: o mesmo evento pode chegar 2x
  tipo text
  payload jsonb
  processado_em timestamptz
  erro text NULL

FLUXO
- Edge Function recebe o webhook do provedor de pagamento
- Valida a assinatura do webhook (segredo). Rejeitar requisição não assinada.
- Grava em webhook_eventos ANTES de processar; se evento_id já existir, ignora
- Atualiza assinaturas conforme o evento (pagamento aprovado, recusado,
  cancelamento, reembolso)

REGRAS DE ACESSO
- status 'ativa' ou 'trial': acesso total
- status 'inadimplente' ou 'expirada': MODO SOMENTE LEITURA — o usuário entra,
  vê e exporta os dados, mas não cria nem edita. Mostrar um aviso no topo com
  botão para regularizar.
- NUNCA apagar dado financeiro por falta de pagamento.
- status 'cancelada': somente leitura por 90 dias, depois notificar por e-mail
  antes de qualquer exclusão.

Implemente a checagem de acesso no BANCO (política RLS ou função), não só na
interface. Bloqueio só no frontend é contornável.
```

> **Você ainda precisa decidir:** provedor (Stripe / Kiwify / Hotmart /
> Mercado Pago), valor, periodicidade e se tem teste grátis.

---

## PROMPT 6 — painel administrativo

```text
Uma área /admin acessível apenas para profiles.is_admin = true.

O QUE O ADMIN VÊ (dados de cadastro e uso — NÃO os dados financeiros):
  - lista de usuários: nome, e-mail, data de cadastro, status da assinatura,
    plano, último acesso
  - indicadores de uso por usuário: quantidade de lançamentos, quantidade de
    bancos e cartões, data do último lançamento
  - painel geral: total de usuários, ativos, inadimplentes, cancelados,
    novos nos últimos 30 dias
  - busca por e-mail e filtro por status

O QUE O ADMIN NÃO VÊ:
  Nenhum valor, descrição, extrato, saldo ou lançamento de nenhum cliente.
  As políticas de RLS NÃO devem ser afinadas para permitir isso.
  Motivo: exigência de LGPD e confiança do cliente. Se algum dia for preciso
  acessar dado de um cliente para suporte, faça um fluxo separado com
  consentimento explícito registrado.

AÇÕES DO ADMIN:
  - conceder ou revogar acesso manualmente (com registro de quem fez e quando)
  - reenviar e-mail de confirmação
  - disparar campanha de e-mail (ver PROMPT 7)

Registre TODA ação de admin em uma tabela admin_log
  (id, admin_id, acao, alvo_user_id, detalhes jsonb, created_at).
```

---

## PROMPT 7 — e-mails

```text
Envio de e-mail via Resend (ou provedor equivalente), por Edge Function.

DOIS TIPOS, COM REGRAS DIFERENTES:

A) TRANSACIONAL — sempre enviado, não precisa de consentimento
   - confirmação de cadastro
   - recuperação de senha
   - recibo de pagamento
   - aviso de falha no pagamento
   - aviso antes de excluir dados de conta cancelada

B) MARKETING / CICLO DE VIDA — precisa de consentimento e descadastro
   - lembrete de uso ("faz X dias que você não lança nada")
   - resumo mensal
   - dicas e novidades

   Exigências legais para o tipo B:
   - campo aceita_marketing boolean em profiles, marcado pelo usuário
   - link de descadastro em TODO e-mail deste tipo
   - página de descadastro que funciona sem login

TABELAS
email_log (id, user_id, tipo, assunto, enviado_em, provedor_id, status, erro)
email_preferencias (user_id, aceita_marketing, descadastrado_em)

CONFIGURAÇÃO DE DOMÍNIO (sem isto vai tudo para spam):
Gere as instruções de SPF, DKIM e DMARC para eu configurar no meu domínio.

LEMBRETE DE USO: uma rotina agendada (pg_cron ou agendador do provedor) que
roda diariamente, encontra usuários com assinatura ativa e sem lançamento há
mais de 7 dias, e envia no máximo 1 lembrete a cada 14 dias por usuário.
Nunca mais que isso.
```

---

## PROMPT 8 — importação de extrato (sem IA)

```text
Importação de lançamentos por arquivo. NÃO use IA — use leitor determinístico.

FORMATOS
1. OFX — prioridade. É o formato padrão dos bancos brasileiros e é
   estruturado. Ler <STMTTRN>: DTPOSTED (data), TRNAMT (valor), MEMO
   (descrição), FITID (identificador único da transação no banco).
2. CSV — mapeamento manual de colunas pelo usuário (qual coluna é data,
   qual é valor, qual é descrição), com pré-visualização antes de gravar.

DEDUPLICAÇÃO (obrigatório)
  Coluna importacao_hash em gastos_variaveis e recebimentos.
  Para OFX: usar o FITID. Para CSV: hash de (data + valor + descrição).
  UNIQUE (user_id, importacao_hash).
  Ao importar, pular o que já existe e informar quantos foram ignorados.

FLUXO
  1. usuário escolhe o arquivo e o banco de destino
  2. sistema mostra a PRÉ-VISUALIZAÇÃO de tudo que será importado, com os
     duplicados já marcados
  3. usuário pode escolher a categoria de cada linha (ou deixar em Outros)
  4. só grava depois da confirmação

Valor negativo vira gasto variável; positivo vira recebimento.
Nunca gravar direto sem a confirmação do usuário.
```

---

## Testes para conferir se a matemática sobreviveu

Rode estes casos depois do PROMPT 2. Se qualquer um falhar, o cálculo está
errado — não siga adiante.

**1. Competência × vencimento**
Cartão com fechamento dia 28 e vencimento dia 8.
Compra de R$ 500 em 20/07.
- Vencimento da fatura: **08/08**
- Com regime "mês da compra": conta em **julho**
- Com regime "mês do vencimento": conta em **agosto**
- Na aba Cartões aparece na fatura de **agosto** nos dois casos

**2. Compra depois do fechamento**
Mesmo cartão. Compra de R$ 100 em 29/07.
- Fecha só na fatura seguinte → vencimento **08/09**

**3. Racha**
Gasto de R$ 340 com duas divisões de R$ 113 e R$ 113.
- Valor da fatura: **R$ 340,00**
- Seu custo real: **R$ 114,00**
- No Dashboard entra **R$ 114,00**, não R$ 340,00

**4. Parcelado com racha**
R$ 1.200 em 6x, com R$ 600 divididos.
- Cada parcela na fatura: **R$ 200,00**
- Sua parte por parcela: **R$ 100,00**
- Ocorre em 6 meses consecutivos a partir do mês da compra

**5. Estorno**
Fatura com R$ 120 + R$ 300 + R$ 200 e um estorno de −R$ 50.
- Total da fatura: **R$ 570,00**

**6. Dupla baixa (o bug do ledger)**
Banco com R$ 1.000. Pague uma fatura de R$ 300. Saldo vai a R$ 700.
Recarregue a página **três vezes**.
- Saldo tem que continuar **R$ 700,00**. Se cair para R$ 400 ou R$ 100, a
  idempotência está quebrada.

**7. Substituir uma baixa**
Pague um gasto fixo de R$ 200 pelo banco A. Depois altere a baixa para o
banco B.
- Banco A tem que **voltar** ao saldo anterior
- Banco B fica R$ 200 menor

**8. Gasto fixo com histórico**
Aluguel de R$ 1.500 criado em janeiro. Em maio o valor muda para R$ 1.800.
- Janeiro a abril: **R$ 1.500**
- Maio em diante: **R$ 1.800**
- Meses anteriores **não** podem mudar

**9. Excluir apenas um mês**
No mesmo aluguel, excluir "apenas este mês" em julho.
- Julho não tem a ocorrência; agosto volta a ter

**10. Limite do cartão**
Limite R$ 8.000, faturas em aberto somando R$ 5.518,19.
- Disponível: **R$ 2.481,81**
- Depois de pagar a fatura, o limite dela é liberado

---

## O que ainda depende de você

| Item | Por quê |
|---|---|
| Provedor de pagamento e valor | define o PROMPT 5 e o botão do site |
| Domínio | necessário para SPF/DKIM do PROMPT 7 |
| CNPJ ou CPF e e-mail de contato | obrigatório para rodar tráfego pago |
| Prazo de garantia | vai na página de vendas e nos termos |
| Política de Privacidade e Termos | o Meta verifica antes de aprovar anúncio |
