# Modelo financeiro e invariantes

Este documento orienta a evolução do domínio e diferencia o que já está implementado do que continua planejado.

## Conceitos atuais

- **Usuário:** pessoa autenticada.
- **Espaço:** limite de dados e permissões usado por uma pessoa ou casal.
- **Movimentação:** receita, despesa ou movimentação de investimento com valor, data, status e metadados.
- **Conta financeira:** local em que o dinheiro está, com titularidade, saldo inicial e data de início.
- **Transferência:** deslocamento interno entre duas contas, sem alterar receita, despesa ou patrimônio conjunto.
- **Objetivo:** meta financeira associada ao espaço.
- **Auditoria:** registro de criação, alteração, exclusão, restauração ou mudança de status.

## Modelo financeiro

### Conta financeira — implementada

Representa onde o dinheiro ou a obrigação está.

Campos atuais:

- `id` e `name`, dentro da coleção do espaço autenticado.
- `institutionName` opcional.
- `type`: checking, savings, cash ou investment.
- `ownership`: mine, partner ou joint.
- `openingBalanceCents` e `openingBalanceDate`.
- `archivedAt` opcional.

O saldo inicial representa o início da data informada. Movimentações pagas nessa
data são consideradas. Para uma movimentação paga, o cálculo usa a data efetiva
do pagamento e recorre ao vencimento somente em registros antigos sem `paidAt`.

Cartões não são tratados como contas disponíveis; continuam planejados como uma
entidade de obrigação separada.

### Transferência — implementada

Representa deslocamento de dinheiro entre duas contas.

- `sourceAccountId` e `destinationAccountId` são obrigatórios e diferentes.
- `amountCents` deve ser positivo.
- A operação possui um único identificador de transferência.
- As duas pontas são derivadas atomicamente do mesmo registro.
- Transferência não entra em receitas, despesas ou economia do casal.
- Estorno afeta as duas pontas.
- Data, descrição, responsável e auditoria são preservados.

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

## Decisões confirmadas

- Valores de contas e transferências são persistidos como centavos inteiros.
- O saldo é calculado desde o saldo inicial, somando movimentações pagas e as duas pontas de transferências não estornadas.
- Contas arquivadas permanecem no histórico, mas não entram nos totais ativos.
- Movimentações antigas podem continuar sem uma conta vinculada.

## Decisões pendentes

- Modelo final de cartão, fatura, fechamento e parcelamento.
- Regras de edição após fechamento ou acerto do ciclo.
- Níveis de privacidade compatíveis com cálculos compartilhados.
- Migração das movimentações atuais para contas financeiras.
- Modelo de conciliação e snapshots posteriores ao saldo inicial.

Essas decisões devem ser registradas antes de alterar o esquema de produção.
