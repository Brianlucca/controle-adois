# Arquitetura do Controle A Dois

Este documento descreve apenas a arquitetura que existe hoje. As invariantes
financeiras centrais também permanecem registradas nas instruções do repositório.

## Stack

- Next.js 16 com App Router e TypeScript em modo estrito.
- React 19.
- Tailwind CSS e componentes locais em `src/components/ui`.
- Firebase Authentication no cliente.
- Firebase Admin nas operações de servidor.
- Firestore para dados financeiros, espaços, usuários, objetivos e auditoria.
- Firebase Cloud Messaging para notificações push quando suportado.
- Vitest para testes unitários.
- Vercel como configuração de hospedagem presente no repositório.

## Estrutura principal

```text
src/
├── actions/       Server Actions e mutações autenticadas
├── app/           Rotas, layouts, páginas e estilos
├── components/    Interface reutilizável e componentes de domínio
├── contexts/      Autenticação, preferências e espaço ativo
├── hooks/         Estado financeiro e operações de tela
└── lib/           Regras de negócio, segurança, Firebase e utilitários
```

## Rotas

| Rota | Responsabilidade |
| --- | --- |
| `/` | Landing page |
| `/auth/login` | Entrada do usuário |
| `/auth/register` | Criação de conta |
| `/auth/verify` | Verificação de e-mail |
| `/dashboard` | Visão geral financeira |
| `/dashboard/accounts` | Contas financeiras, saldos e transferências internas |
| `/dashboard/transactions` | Movimentações e importação |
| `/dashboard/settlement` | Divisão de despesas e sugestão de acerto do ciclo |
| `/dashboard/budgets` | Limites individuais e compartilhados por categoria no ciclo |
| `/dashboard/payments` | Contas e Pix pendentes |
| `/dashboard/calendar` | Calendário financeiro |
| `/dashboard/reports` | Relatórios |
| `/dashboard/workspace` | Espaços, convites e pessoas |
| `/dashboard/settings` | Preferências, conta e catálogo de categorias financeiras |
| `/api/auth/session` | Sessão autenticada |
| `/api/cron/financial-reminders` | Processamento de lembretes financeiros |

## Fluxo de dados atual

1. O cliente autentica o usuário com Firebase Authentication.
2. A aplicação cria e mantém uma sessão protegida em cookie.
3. Server Actions recuperam o usuário da sessão e validam o espaço ativo.
4. A autorização confirma participação e permissão antes de acessar dados.
5. Operações financeiras usam Firebase Admin e registram auditoria quando aplicável.
6. Contextos e hooks entregam o estado necessário às páginas.

## Estrutura atual no Firestore

As coleções observadas no código incluem:

```text
users/{userId}
workspaces/{workspaceId}
workspaces/{workspaceId}/transactions/{transactionId}
workspaces/{workspaceId}/accounts/{accountId}
workspaces/{workspaceId}/transfers/{transferId}
workspaces/{workspaceId}/budgets/{budgetId}
workspaces/{workspaceId}/categories/{categoryId}
workspaces/{workspaceId}/categoryNameKeys/{normalizedNameHash}
workspaces/{workspaceId}/actionRateLimits/{subjectScopeHash}
workspaces/{workspaceId}/auditLogs/{auditLogId}
workspaces/{workspaceId}/goals/{goalId}
terms_acceptances/{acceptanceId}
```

Novas coleções para cartões, divisões e desafios ainda são propostas. Não devem ser tratadas como existentes.

Cada conta mantém `currentBalanceCents` materializado. Criação, edição, pagamento,
exclusão e restauração de movimentações, além de transferências e estornos,
atualizam o saldo e a auditoria na mesma transação do Firestore. A regra pura que
calcula o impacto permanece em `src/lib/finance`.

Contas anteriores a esse campo são materializadas uma única vez: somente as
movimentações vinculadas às contas legadas e as transferências são consultadas.
Depois disso, a visão geral lê as contas diretamente e limita o histórico recente
a 12 transferências; o resumo do dashboard lê somente as contas. Assim, nenhuma
tela reconstrói o saldo relendo todo o histórico financeiro.

O carregamento financeiro inicial consulta somente o ciclo atual e os próximos
12 meses. Períodos anteriores são buscados sob demanda e o histórico completo é
carregado apenas quando a pessoa seleciona explicitamente essa opção.

A transferência possui um único registro e afeta as duas contas atomicamente;
ela nunca é convertida em receita ou despesa.

O vínculo `accountId` das movimentações é opcional para preservar os registros
anteriores à criação das contas financeiras.

Uma conta pode ser excluída definitivamente somente quando não possui nenhuma
movimentação ou transferência vinculada. Contas com histórico financeiro devem
ser arquivadas, preservando seus vínculos, saldos materializados e auditoria.

Recorrências mensais são materializadas como movimentações ligadas por
`recurrenceGroupId`. A central de recorrências usa esse grupo como unidade de
controle: uma edição atualiza as ocorrências ativas do grupo e a exclusão envia
as ocorrências pendentes para a lixeira. Ocorrências pagas são preservadas para não
reescrever o histórico nem alterar o saldo já realizado.
Para listar a central, as ocorrências recorrentes são agrupadas no servidor e a
ocorrência ativa de menor índice representa cada grupo. Isso mantém compatibilidade
com registros antigos, mesmo quando a primeira ocorrência foi removida ou não tem
os metadados mais recentes. Ao interromper um grupo, `recurrenceActive` é marcado
como falso também nas ocorrências pagas preservadas, retirando-o da central sem
reescrever o histórico ou o saldo. O resultado permanece em memória enquanto o
espaço ativo não muda e é atualizado após mutações da recorrência.
Ao editar uma ocorrência, a duração informada começa nela: ocorrências anteriores
são preservadas e somente ela e as seguintes são atualizadas. A central prioriza
a primeira ocorrência pendente para que a edição não volte a uma parcela histórica
já paga. Os campos editáveis são propagados para todas as ocorrências pendentes do
grupo, inclusive pendências anteriores, sem modificar ocorrências pagas. Séries
legadas duplicadas com a mesma descrição, valor, categoria, conta e dia de vencimento
são consolidadas visualmente na central.

Despesas novas podem guardar `scope`, `fundingSource`, pagador, responsável,
beneficiários, método de divisão e partes em centavos dentro do próprio documento
da movimentação. A conta vinculada é a fonte de verdade do desembolso: conta
pessoal identifica seu titular como pagador e conta conjunta registra o uso do
dinheiro do casal. A Server Action resolve essa origem dentro da mesma transação
que já lê a conta para atualizar o saldo, reutiliza os participantes obtidos na
validação do espaço ativo e rejeita identificadores externos. Não há leitura
adicional por participante ou por lançamento.

O acerto do ciclo é derivado no cliente a partir das movimentações do período já
carregado pelo contexto financeiro e de uma única leitura das contas do espaço.
O cálculo puro em `src/lib/finance/expense-splits.ts` considera despesas pagas,
confere se as partes fecham o valor total e distingue dinheiro pessoal de dinheiro
do casal. Nenhuma despesa paga por conta conjunta gera reembolso, pois o saldo da
conta já pertence ao casal. Somente dinheiro pessoal usado para assumir a parte
de outra pessoa entra no acerto. O resultado inclui os lançamentos que explicam
cada dívida e a menor sequência final de transferências. A sugestão não é
persistida e não altera receitas, despesas ou patrimônio.

Os orçamentos são limites recorrentes por ciclo e nunca movimentam saldo. Cada
registro define categoria, escopo compartilhado ou individual, titular quando
aplicável, responsável pelo acompanhamento e valor em centavos. O uso é derivado
no cliente das movimentações do ciclo já carregadas: despesas pagas formam o
realizado e despesas pendentes formam a projeção. Limites compartilhados consideram
somente despesas compartilhadas; limites individuais consideram somente a parte da
pessoa em despesas individuais, evitando dupla contagem entre os dois escopos.

O cálculo puro em `src/lib/finance/budgets.ts` produz progresso, saldo disponível,
uso por participante, alertas progressivos e sugestão diária baseada nos dias
restantes. O servidor valida todos os identificadores contra os participantes do
espaço, mantém uma cota atômica de 48 registros e registra criação, edição,
arquivamento, restauração e exclusão na auditoria. Excluir um orçamento remove
somente o limite e não altera movimentações ou saldos. A listagem é limitada a 48 documentos e
não relê movimentações.

As categorias financeiras formam um catálogo por espaço, administrado somente em
Configurações e consumido pelas telas de Movimentações e Orçamento. A aplicação oferece um
conjunto de categorias prontas, permite criar categorias personalizadas e permite
renomear tanto categorias prontas quanto personalizadas. O identificador da
categoria permanece estável e seus nomes anteriores são preservados como aliases;
assim, um orçamento continua reconhecendo movimentações antigas sem reescrever nem
reler o histórico inteiro.

O catálogo executa uma única consulta limitada a 64 documentos por espaço. Criação
e edição exigem permissão de edição, validam o espaço ativo e registram auditoria.
Uma cota atômica limita os registros e chaves normalizadas com hash impedem nomes
duplicados ou ambíguos sem expor o texto da categoria no identificador do documento.

As mutações de categorias e orçamentos possuem duas camadas de limitação. O proxy
aplica um limite geral por sessão antes da Server Action; depois da autenticação e
autorização, um contador atômico no Firestore limita cada usuário e espaço a 12
alterações de categoria ou 30 alterações de orçamento por janela de cinco minutos.
Cada escopo usa um documento fixo: uma operação aceita acrescenta uma leitura e uma
gravação, enquanto uma operação bloqueada faz somente a leitura e não cria auditoria.
Listagens e cálculos financeiros não recebem leituras adicionais por essa proteção.
Ao excluir um espaço ou a conta proprietária, o servidor usa exclusão recursiva para
remover também todas as subcoleções financeiras, de auditoria e de segurança.

## Segurança

- Rotas de dashboard exigem sessão.
- Server Actions validam usuário e espaço ativo.
- Mutações verificam origem confiável.
- O proxy aplica limites básicos de requisição.
- Cabeçalhos de segurança são configurados no Next.js.
- Segredos ficam em `.env*` e não entram no Git.
- Qualquer nova entidade financeira deve ser isolada por espaço e passar pelas mesmas verificações de autorização.
- Orçamentos aceitam somente categorias conhecidas, participantes do espaço e valores inteiros em centavos dentro dos limites definidos.
- Categorias personalizadas e renomeadas são isoladas por espaço, limitadas por cota e protegidas contra nomes duplicados normalizados.
- Mutações de categorias e orçamentos possuem rate limit geral no proxy e limite atômico por usuário e espaço.

## Regras de implementação

- Cálculos financeiros devem permanecer em funções puras dentro de `src/lib/finance` sempre que possível.
- Componentes não devem reimplementar regras de saldo, previsão ou classificação.
- Entradas de Server Actions devem ser validadas antes de persistir.
- Operações compostas, como transferências, precisam ser atômicas.
- Alterações financeiras relevantes precisam deixar histórico suficiente para auditoria.
- Textos públicos devem refletir somente funcionalidades entregues.

## Validação

```bash
npm run lint
npm test
npm run build
```

Além dos comandos, valide manualmente fluxos financeiros alterados e estados responsivos da interface.
