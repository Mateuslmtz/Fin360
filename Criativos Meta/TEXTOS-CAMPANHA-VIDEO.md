# Campanha de VÍDEO — 1 campanha, 1 conjunto, 3 anúncios

Formato: **1080 x 1920 (9:16)**, 30fps, 16 a 19 segundos, com narração e texto na tela.
Montados por `_build/montar.py` (rodar `python montar.py todos` pra refazer).

## Configuração do conjunto

Igual à campanha de imagem (Vendas → Conversões, evento `Purchase`, Brasil, 25–55,
segmentação vazia, destino `https://fin360app.com.br`, botão "Saiba mais"), **com uma
diferença**: aqui os posicionamentos podem ficar no **automático**. As peças são 9:16 e
todo o texto está acima de 64% da altura, fora do que o Reels e os Stories cobrem.

## Anúncio 1 — `video-1-fim-do-mes.mp4` (18,7s)

Narração: "Todo mês termina com a mesma pergunta: sobrou alguma coisa? / O Fin360 soma o
que já entrou, o que já saiu e o que ainda vem. / E mostra o saldo do dia trinta antes de
ele chegar. / Dezenove e noventa por mês, com sete dias de garantia."

**Texto principal**
> Todo mês termina com aquela pergunta: sobrou alguma coisa?
>
> O Fin360 responde antes do dia 30. Ele junta o que entrou, o que já saiu e o que ainda
> vai sair — faturas, contas fixas, agendados — e projeta o saldo do fim do mês sozinho.
>
> R$ 19,90 por mês, com 7 dias de garantia.

**Título:** Veja quanto sobra antes do mês acabar

## Anúncio 2 — `video-2-cartoes.mp4` (19,1s)

Narração: "A fatura do cartão não devia ser surpresa. / No Fin360 você cadastra o cartão
uma vez, e a fatura vai somando enquanto ela fecha. / Três cartões, três vencimentos, um
número só na tela. / Dezenove e noventa por mês, com sete dias de garantia."

**Texto principal**
> A fatura do cartão não devia ser surpresa.
>
> Você cadastra seus cartões uma vez e a fatura vai somando enquanto ela fecha. Três
> cartões, três vencimentos, um número só na tela — antes de a cobrança chegar.
>
> R$ 19,90 por mês, com 7 dias de garantia.

**Título:** A fatura somada antes de ela chegar

## Anúncio 3 — `video-3-tudo-em-um.mp4` (16,2s)

Narração: "Contas, cartões e metas, em um aplicativo só. / Os gastos fixos entram sozinhos,
com o status de cada um. / Você lança, e os gráficos se montam sozinhos. / Dezenove e
noventa por mês, com sete dias de garantia."

**Texto principal**
> Contas, cartões, gastos fixos, metas de poupança e contas divididas com outras pessoas.
> Tudo em um aplicativo só, no celular e no computador.
>
> Você lança e os gráficos se montam sozinhos. Sem planilha e sem cinco apps abertos.
>
> R$ 19,90 por mês, com 7 dias de garantia.

**Título:** Fin360 — tudo em um aplicativo só

---

## Decisões de montagem (pra não refazer errado depois)

- **Só a `gravação tela 2.mp4`.** A gravação 1 mostra `mateuslmtz.github.io` na barra do
  navegador, que é o endereço antigo.
- **Faixa útil da imagem: y 900 a 1230** (de 1920). Acima disso fica atrás do véu escuro
  do texto; abaixo o Reels cobre com perfil, legenda e botões. Cada cena tem um instante
  (`ss`) escolhido a dedo porque é ali que o número que fecha a frase está nessa faixa.
  **Mudar o `ss` sem conferir o frame quebra a peça.**
- **Sem zoom na gravação.** Testei 1,3x e cortou os valores do lado direito — justamente
  o que precisa ser lido.
- **A tela de Cofrinhos ficou de fora**: ela só aparece limpa por 1,9 segundo na gravação
  inteira (o menu lateral abre por cima). Entrou "gastos fixos" no lugar, que tem 4,8s.
- **Sem música.** Só narração. Música de banco aleatório é risco de direito autoral no
  Meta; se quiser trilha, tem que vir de biblioteca licenciada.
- **Voz:** `pt-BR-FranciscaNeural` (edge-tts, grátis). Pra trocar por Thalita ou Antonio,
  mudar o `V=` nos comandos de `_voz` e rodar `montar.py todos` de novo.
