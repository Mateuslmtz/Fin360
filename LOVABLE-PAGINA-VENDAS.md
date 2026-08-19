# Página de vendas — texto novo (pagamento único, R$ 47,90 = 1 ano)

Escrito em 15/08/2026, em cima da página que estava no ar (3 planos de assinatura).
Cole os blocos abaixo no Lovable. **Só muda o que a troca de modelo quebrou** — o topo,
a seção "Soa familiar?" e a lista de funcionalidades continuam valendo como estão.

**Antes de colar, duas coisas que fazem a página mentir se ficarem para trás:**

1. **A âncora `#preco` tem que continuar existindo.** O app manda quem está sem acesso
   para `fin360app.com.br/#preco`. Se o id da seção mudar, o botão dentro do app cai no
   topo da página e a pessoa não acha o preço.
2. **O checkout é `https://pay.cakto.com.br/387daej_1018241`.** Conferido no navegador em
   15/08/2026: "Fin360 — Pagamento único", R$ 46,91 + R$ 0,99 = **Total R$ 47,90**. É o
   mesmo endereço da antiga assinatura mensal porque o checkout `1018241` foi reaproveitado
   e convertido, não recriado.

   Os outros dois da página antiga (`6647fq7` trimestral e `csyhakt` anual) eram assinatura
   e saíram junto com os cards.

---

## 1. Prompt para o Lovable

> Na seção de preços da página, substitua os três cards de plano (mensal, trimestral e
> anual) por **um único card centralizado**. O produto deixou de ser assinatura: agora é
> pagamento único que dá 1 ano de acesso.
>
> Mantenha o id/âncora da seção como `preco`. Mantenha o estilo visual, o selo de destaque
> e a caixa de garantia que já existem — só o conteúdo muda. Como agora é um card só,
> centralize-o e limite a largura para não ficar esticado na tela do computador.
>
> Remova de toda a página as palavras "assinar", "assinatura", "mensal", "renovação
> automática" e "cancele quando quiser".
>
> Use exatamente estes textos:

---

## 2. Seção de preços

**Título da seção:**

```
Um preço. Um ano. Sem mensalidade.
```

**Linha de apoio (abaixo do título):**

```
Você paga uma vez e usa o Fin360° por 12 meses. Não existe cobrança automática.
```

**Card único:**

| Elemento | Texto |
|---|---|
| Selo | `Pagamento único` |
| Preço antigo, riscado, pequeno | `De R$ 147,00` |
| **À vista, em destaque grande e verde** | `R$ 47,90` |
| Logo abaixo, texto médio | `à vista no Pix` |
| Pequeno e discreto, cor secundária | `ou 11x de R$ 5,32 no cartão` |
| Linha pequena embaixo | `Pague uma vez, use por 1 ano` |

> **A hierarquia é de propósito: o à vista é o herói, a parcela é rodapé.** Ele pediu a
> inversão em 15/08/2026 para empurrar o cliente pro Pix. Além de converter melhor, o Pix
> deixa mais líquido pra ele que o cartão — e o número grande passa a ser o preço de
> verdade, não uma parcela com juros embutidos. **Não voltar a promover a parcela.**

> **Por que 11x de R$ 5,32 e não outro número.** Conferido no checkout em 15/08/2026: a
> lista de parcelas da Cakto calcula sobre os R$ 46,91 e mostra `10x de R$ 5,69` /
> `11x de R$ 5,23` — mas o *resumo do pedido*, que é o que o cliente paga, soma a taxa e
> fecha em **11x de R$ 5,32**. O checkout já abre no parcelamento máximo. Anunciar
> qualquer outro valor de parcela cria diferença entre a página e a tela de pagamento.
>
> **Por que R$ 147 riscado e não R$ 197.** R$ 147 era o plano anual real até 14/08/2026.
> R$ 197 nunca foi preço do Fin360, e riscar preço que nunca foi praticado é publicidade
> enganosa.

**Itens do card (com o mesmo ✓ que já é usado):**

```
Todas as funcionalidades, sem plano de cima
Acesso pelo navegador, no computador e no celular
Atualizações incluídas durante o ano todo
Sem mensalidade e sem cobrança automática
Pague no Pix e o acesso é liberado na hora
```

**Botão:**

```
Quero meu acesso por R$ 47,90
```

> **Link do botão:** `https://pay.cakto.com.br/387daej_1018241`
>
> No deploy de 15/08/2026 o Lovable gravou o **texto do placeholder** como se fosse o
> endereço (`href="COLE_AQUI_A_URL_DO_CHECKOUT_NOVO"`) e o botão ficou morto com a página
> no ar. Depois de qualquer alteração na seção de preços, abrir a página e clicar no botão.

**Abaixo do card — caixa de garantia (a que já existe, com uma frase a mais):**

```
7 dias de garantia. Testou e não gostou? Peça o reembolso em até 7 dias e devolvemos
100% do valor, sem perguntas.

Depois disso, o acesso é seu pelo ano todo — e nada mais é cobrado de você.
```

---

## 3. FAQ — o que trocar

Duas perguntas ficaram falsas com a mudança. Trocar as duas, e acrescentar as duas
últimas, que respondem a objeção que aparece sozinha quando o acesso tem prazo.

**SUBSTITUIR — "Posso cancelar quando quiser?"**

> **Vai ser cobrado alguma coisa de mim depois?**
>
> Não. Você paga uma vez, usa por um ano e pronto. Não existe assinatura para cancelar,
> não existe cartão salvo cobrando sozinho, e não vem fatura surpresa. Quando o ano
> terminar, continuar ou não é decisão sua.

**SUBSTITUIR — "Como funciona o pagamento? Preciso renovar todo mês?"**

> **Como funciona o pagamento?**
>
> Você paga uma vez no checkout seguro da Cakto, de preferência no Pix. O acesso é
> liberado na hora e vale por 12 meses. Perto do fim do prazo, avisamos dentro do app e
> por e-mail, para a data não passar sem você perceber.

**ACRESCENTAR:**

> **E os meus dados, quando o ano acabar?**
>
> Continuam todos aqui. Nada é apagado. Você segue entrando, vendo todo o seu histórico e
> podendo exportar os seus dados quando quiser. O que fica bloqueado é lançar coisas
> novas, até você renovar — e ao renovar tudo volta exatamente como estava.

> **Se eu renovar antes de vencer, perco os dias que faltam?**
>
> Não. Os dias que sobraram são somados ao ano novo. Renovar cedo nunca custa nada a você.

---

## 4. Varredura no resto da página

Procurar e trocar, fora da seção de preços:

- Qualquer botão ou link escrito **"Assinar"** → `Quero meu acesso`
- Qualquer texto com **"por mês"**, **"mensalidade"**, **"assinatura"** ou
  **"renovação"** ligado ao Fin360°
- O CTA do topo (`Quero organizar minhas finanças`) pode ficar como está — ele leva para
  a seção de preços, e o preço aparece lá.

---

## 5. O preço do produto na Cakto NÃO é 47,90

O checkout da Cakto soma **R$ 0,99 de taxa de serviço** em cima do preço do produto. Para
o cliente ver exatamente **R$ 47,90** na hora de pagar — o mesmo número que a página
promete — o produto precisa ser cadastrado a:

```
R$ 46,91
```

É um número esquisito, digitado uma vez só, num campo que só você vê. Em troca, todo
número que o cliente enxerga bate com o anterior: página promete 47,90, checkout cobra
47,90, e-mail de confirmação diz 47,90.

**Confira no checkout de verdade depois de criar o produto.** A taxa de R$ 0,99 foi
observada no produto de assinatura; se no pagamento único ela for outra, quem se ajusta é
o preço de cadastro — a página continua dizendo 47,90.
