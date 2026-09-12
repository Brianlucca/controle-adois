# Controle A Dois

Controle A Dois é um sistema de organização financeira para casais. O produto deve responder, com clareza: quanto temos, onde o dinheiro está, quem pagou, o que ainda falta pagar e se os nossos planos cabem no orçamento.

O conceito de workspace continua existindo internamente para separar dados e permissões, mas não deve ser o protagonista da experiência. Para o casal, o produto deve falar em **nosso espaço**, **nós dois**, **meu, seu e nosso dinheiro** e **acerto do mês**.

## Regra deste roadmap

- `[x]` significa que a funcionalidade existe, foi integrada ao produto e está validada.
- `[ ]` significa que a funcionalidade está planejada e ainda não pode ser anunciada como disponível.
- Um item só deve ser marcado como concluído depois de implementação, testes e atualização da documentação.
- A landing page só pode apresentar capacidades que realmente existem no produto.

## O que já existe

- [x] Cadastro, autenticação, verificação de e-mail e sessão protegida.
- [x] Espaços pessoais e compartilhados com convite e membros.
- [x] Receitas, despesas, investimentos, categorias, datas, status e observações.
- [x] Movimentações recorrentes.
- [x] Cadastro de Pix e código de barras.
- [x] Importação de movimentações por planilhas Excel.
- [x] Dashboard com saldo, previsão, receitas, despesas e compromissos.
- [x] Calendário financeiro.
- [x] Tela de contas e Pix pendentes.
- [x] Relatórios financeiros.
- [x] Histórico de alterações e restauração de movimentações.
- [x] Assistente financeiro e objetivos básicos.
- [x] Preferências de privacidade visual e notificações.

## Direção do produto

O dashboard deve responder rapidamente:

1. Quanto o casal possui hoje?
2. Em quais bancos e contas o dinheiro está?
3. Quanto é meu, quanto é do parceiro e quanto é nosso?
4. Quem pagou e quem ainda precisa pagar?
5. Com quanto o mês deve terminar?
6. Quanto pode ser usado sem comprometer contas e objetivos?

## Roadmap do Controle A Dois

### 1. Contas, bancos e patrimônio

- [ ] Cadastrar bancos, carteiras e dinheiro em espécie.
- [ ] Cadastrar conta-corrente, poupança, conta conjunta, investimento e cartão.
- [ ] Informar titularidade: minha, do parceiro ou conjunta.
- [ ] Registrar saldo inicial e data de referência.
- [ ] Mostrar saldo disponível por banco e por conta.
- [ ] Separar valores disponíveis, investidos e comprometidos.
- [ ] Mostrar patrimônio individual, conjunto e total do casal.
- [ ] Permitir ajuste e conciliação de saldo sem criar receita ou despesa falsa.
- [ ] Arquivar contas sem apagar o histórico.

### 2. Transferências

- [ ] Transferir valores entre contas cadastradas.
- [ ] Registrar conta de origem, conta de destino, data, descrição e responsável.
- [ ] Tratar as duas pontas como uma única transferência vinculada.
- [ ] Excluir transferências dos totais de receitas e despesas.
- [ ] Permitir transferências agendadas e recorrentes.
- [ ] Identificar transferências para investimentos.
- [ ] Identificar pagamentos de cartão como transferência, evitando despesa duplicada.
- [ ] Manter histórico e estorno consistente das duas pontas.

### 3. Meu, seu e nosso

- [ ] Classificar movimentações como minhas, do parceiro ou do casal.
- [ ] Registrar quem realizou o pagamento.
- [ ] Registrar quem é responsável pela conta.
- [ ] Registrar quem se beneficiou da despesa.
- [ ] Permitir despesa totalmente individual, totalmente compartilhada ou parcialmente dividida.
- [ ] Mostrar quanto cada pessoa pagou no ciclo.
- [ ] Mostrar quanto cada pessoa deveria ter pago.
- [ ] Exibir a diferença necessária para equilibrar o casal.

### 4. Divisão e acerto do mês

- [ ] Divisão igual em 50/50.
- [ ] Divisão proporcional à renda de cada pessoa.
- [ ] Percentuais personalizados.
- [ ] Responsabilidade integral de uma pessoa.
- [ ] Regras padrão por categoria ou conta.
- [ ] Tela de fechamento mensal do casal.
- [ ] Sugestão de transferência para equilibrar o ciclo.
- [ ] Confirmação de revisão pelos dois participantes.
- [ ] Ação “Marcar mês como acertado”.
- [ ] Histórico de acordos e acertos anteriores.

### 5. Orçamento compartilhado

- [ ] Limite por categoria.
- [ ] Limite individual para cada pessoa.
- [ ] Limite compartilhado do casal.
- [ ] Responsável por acompanhar cada categoria.
- [ ] Quanto foi usado por cada pessoa e quanto ainda está disponível.
- [ ] Alertas progressivos antes de ultrapassar o limite.
- [ ] Sugestão de ajuste baseada no ritmo do ciclo, sem alterar dados automaticamente.

### 6. Contas e responsabilidades

- [ ] Definir quem precisa pagar cada compromisso.
- [ ] Definir de qual conta o pagamento sairá.
- [ ] Informar se a conta será dividida.
- [ ] Registrar quem confirmou o pagamento.
- [ ] Anexar comprovante ou observação.
- [ ] Enviar lembrete individual ou para os dois.
- [ ] Destacar contas sem responsável para evitar “achei que você fosse pagar”.

### 7. Cartões e faturas

- [ ] Cadastrar cartão e vinculá-lo a uma conta de pagamento.
- [ ] Mostrar limite total, usado e disponível.
- [ ] Configurar fechamento e vencimento da fatura.
- [ ] Identificar compras de cada pessoa.
- [ ] Projetar parcelas futuras.
- [ ] Consolidar compras na fatura sem duplicar despesas.
- [ ] Tratar pagamento da fatura como transferência da conta para o cartão.
- [ ] Permitir conferência e fechamento da fatura.

### 8. Previsão e segurança do mês

- [ ] Mostrar quanto existe hoje, quanto falta receber e quanto falta pagar.
- [ ] Projetar o saldo de encerramento do ciclo.
- [ ] Calcular quanto pode ser gasto sem comprometer obrigações.
- [ ] Alertar quando uma meta estiver em risco.
- [ ] Simular o impacto de uma compra antes de registrá-la.
- [ ] Comparar o ritmo atual com ciclos anteriores.
- [ ] Explicar claramente os fatores usados em cada previsão.

### 9. Objetivos do casal

- [ ] Vincular objetivos a contas reais.
- [ ] Identificar objetivo individual ou compartilhado.
- [ ] Mostrar a contribuição de cada pessoa.
- [x] Calcular o valor mensal necessário até a data desejada.
- [ ] Projetar a conclusão com base no ritmo atual.
- [ ] Reservar valores sem alterar artificialmente o patrimônio.
- [ ] Mostrar o impacto do objetivo no orçamento do casal.

### 10. Desafios para juntar dinheiro

- [ ] Criar um desafio progressivo mensal, por exemplo: R$ 100 no primeiro mês, R$ 200 no segundo, R$ 300 no terceiro e assim por diante.
- [ ] Permitir valor inicial e incremento personalizados.
- [ ] Criar desafio progressivo semanal, incluindo o modelo de 52 semanas.
- [ ] Criar desafio de valor fixo mensal.
- [ ] Criar desafio com valores personalizados para cada etapa.
- [ ] Permitir que os participantes alternem quem deposita em cada período.
- [ ] Permitir que os dois contribuam na mesma etapa.
- [ ] Mostrar próximo valor, próxima data e responsável.
- [ ] Mostrar total acumulado, total projetado e percentual concluído.
- [ ] Registrar o histórico de contribuições de cada pessoa.
- [ ] Permitir pausar, reajustar ou antecipar etapas sem perder o histórico.
- [ ] Enviar lembretes quando chegar o momento de contribuir.
- [ ] Comemorar marcos do desafio sem transformar finanças em competição.
- [ ] Vincular o desafio a um objetivo e, opcionalmente, a uma conta de destino.

Exemplo:

| Mês | Contribuição | Acumulado |
| --- | ---: | ---: |
| 1 | R$ 100 | R$ 100 |
| 2 | R$ 200 | R$ 300 |
| 3 | R$ 300 | R$ 600 |
| 4 | R$ 400 | R$ 1.000 |

### 11. Privacidade equilibrada

- [ ] Movimentação visível para os dois.
- [ ] Movimentação com apenas categoria e valor compartilhados.
- [ ] Movimentação particular.
- [ ] Compartilhamento obrigatório quando afetar o orçamento do casal.
- [ ] Permissões claras, sem criar uma experiência de vigilância financeira.

### 12. Ritual financeiro do casal

- [ ] Conferir saldos das contas.
- [ ] Revisar contas pendentes.
- [ ] Conferir gastos compartilhados.
- [ ] Realizar o acerto entre os dois.
- [ ] Definir contribuições para objetivos e desafios.
- [ ] Encerrar o ciclo com confirmação dos dois.
- [ ] Gerar um resumo simples do mês concluído.

### 13. Automação futura

- [ ] Melhorar conciliação de planilhas e extratos.
- [ ] Integrar a extração de comprovantes ao fluxo visível de cadastro.
- [ ] Validar e concluir a importação de arquivos CSV antes de anunciá-la.
- [ ] Detectar transferências duplicadas durante importações.
- [ ] Sugerir conta e categoria com base no histórico.
- [ ] Avaliar integração bancária somente após definir segurança, consentimento, custo e manutenção.
- [ ] Nunca anunciar integração automática antes de ela existir e estar validada.

## Linguagem da interface

Preferir:

- Nosso espaço
- Nós dois
- Contas do casal
- Meu, seu e nosso dinheiro
- Acerto do mês
- Quem pagou?
- Onde está nosso dinheiro?

Evitar usar “workspace”, “membros” e “grupos” como conceitos principais para o usuário final. Esses termos podem continuar no domínio técnico quando necessários.

## Documentação

- [Arquitetura atual](docs/ARCHITECTURE.md)
- [Modelo financeiro e invariantes](docs/DOMAIN_MODEL.md)
- [Fluxo de contribuição e Git](docs/CONTRIBUTING.md)
- [Instruções para agentes](AGENTS.md)
- [Skill de workflow](.agents/skills/controle-adois-workflow/SKILL.md)

## Desenvolvimento local

```bash
npm install
npm run dev
```

Validação:

```bash
npm run lint
npm test
npm run build
```

Variáveis de ambiente ficam em arquivos `.env*`, que não devem ser commitados.
