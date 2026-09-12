# Modelo financeiro e invariantes

Este documento orienta a evolução do domínio. As entidades da seção “Modelo proposto” ainda não existem necessariamente no banco.

## Conceitos atuais

- **Usuário:** pessoa autenticada.
- **Espaço:** limite de dados e permissões usado por uma pessoa ou casal.
- **Movimentação:** receita, despesa ou movimentação de investimento com valor, data, status e metadados.
- **Objetivo:** meta financeira associada ao espaço.
- **Auditoria:** registro de criação, alteração, exclusão, restauração ou mudança de status.

## Modelo proposto

### Conta financeira

Representa onde o dinheiro ou a obrigação está.

Campos esperados:

- `id`, `workspaceId` e `name`.
- `institutionName` e identificador visual opcional.
- `type`: checking, savings, cash, investment ou credit-card.
- `ownership`: mine, partner ou joint.
- `ownerUserIds`.
- `openingBalance` e `openingBalanceDate`.
- `archivedAt` opcional.

### Transferência

Representa deslocamento de dinheiro entre duas contas.

- `sourceAccountId` e `destinationAccountId` são obrigatórios e diferentes.
- `amount` deve ser positivo.
- A operação possui um único identificador de transferência.
- Débito e crédito são persistidos atomicamente.
- Transferência não entra em receitas, despesas ou economia do casal.
- Estorno afeta as duas pontas.

### Cartão e fatura

- O cartão representa uma obrigação, não saldo disponível.
- Uma compra no cartão é reconhecida como despesa uma única vez.
- A fatura agrega compras, parcelas, ajustes e estornos.
- O pagamento da fatura é transferência da conta pagadora para o cartão.
- Pagar a fatura nunca cria a mesma despesa novamente.

### Divisão de despesa

- `scope`: mine, partner ou shared.
- `paidByUserId`: quem desembolsou.
- `responsibleUserId`: quem deve executar o pagamento.
- `beneficiaryUserIds`: quem se beneficiou.
- `splitMethod`: equal, income-proportional ou custom.
- `shares`: valor ou percentual devido por participante.
- A soma das partes deve ser exatamente igual ao valor da despesa.

### Acerto do ciclo

- Consolida apenas despesas compartilhadas elegíveis.
- Considera quanto cada pessoa pagou e quanto deveria pagar.
- Produz uma sugestão de transferência, não uma nova despesa.
- Só é concluído após confirmação dos participantes exigidos.
- Um ciclo concluído mantém histórico e não é recalculado silenciosamente.

### Objetivo e reserva

- O objetivo descreve intenção e progresso.
- O aporte mensal sugerido divide o valor restante pelos meses disponíveis, incluindo o mês atual e o mês da data-alvo.
- A sugestão é arredondada para cima em centavos, para que a soma dos aportes não fique abaixo da meta.
- Objetivos vencidos informam o valor restante, mas não apresentam uma parcela mensal fictícia.
- Uma reserva virtual não aumenta nem reduz patrimônio.
- Se houver movimentação real entre contas, ela deve ser registrada como transferência.
- Contribuições guardam participante, valor, data e origem.

### Desafio de economia

Campos esperados:

- `goalId` opcional e `destinationAccountId` opcional.
- `frequency`: weekly ou monthly.
- `strategy`: fixed, progressive ou custom.
- `initialAmount` e `incrementAmount` para progressão.
- `customSteps` para uma sequência manual.
- `participantMode`: both, alternating ou assigned.
- `currentStep`, `nextDueDate`, `status` e histórico de contribuições.

No desafio progressivo, a etapa pode seguir:

```text
valorDaEtapa = valorInicial + incremento × (númeroDaEtapa - 1)
```

Exemplo com início de R$ 100 e incremento de R$ 100: R$ 100, R$ 200, R$ 300 e R$ 400.

## Invariantes obrigatórios

1. Dinheiro transferido entre contas não altera o patrimônio total.
2. Pagamento de cartão não duplica a despesa das compras.
3. Acerto entre participantes não é receita nem despesa do casal.
4. Saldo ajustado por conciliação deve ter motivo, autor, data e auditoria.
5. Titularidade da conta e visibilidade da movimentação são conceitos diferentes.
6. Valores financeiros usam precisão decimal segura; não usar ponto flutuante sem tratamento.
7. Toda leitura e mutação é limitada ao espaço autenticado.
8. Exclusão não pode deixar uma transferência com apenas uma ponta ativa.
9. Contribuição em objetivo ou desafio não pode criar patrimônio fictício.
10. Previsões devem explicar quais valores foram considerados.

## Decisões pendentes antes da implementação

- Estratégia de armazenamento monetário: centavos inteiros ou decimal validado.
- Fonte do saldo: calculado desde o saldo inicial, snapshots conciliados ou combinação dos dois.
- Modelo final de cartão, fatura, fechamento e parcelamento.
- Regras de edição após fechamento ou acerto do ciclo.
- Níveis de privacidade compatíveis com cálculos compartilhados.
- Migração das movimentações atuais para contas financeiras.

Essas decisões devem ser registradas antes de alterar o esquema de produção.
