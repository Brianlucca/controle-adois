# Arquitetura do Controle A Dois

Este documento descreve apenas a arquitetura que existe hoje. Funcionalidades planejadas ficam no roadmap do [README](../README.md) e no [modelo de domínio](DOMAIN_MODEL.md).

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
| `/dashboard/transactions` | Movimentações e importação |
| `/dashboard/payments` | Contas e Pix pendentes |
| `/dashboard/calendar` | Calendário financeiro |
| `/dashboard/reports` | Relatórios |
| `/dashboard/workspace` | Espaços, convites e pessoas |
| `/dashboard/settings` | Preferências e conta |
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
workspaces/{workspaceId}/auditLogs/{auditLogId}
workspaces/{workspaceId}/goals/{goalId}
terms_acceptances/{acceptanceId}
```

Novas coleções para contas, transferências, cartões, divisões e desafios ainda são propostas. Não devem ser tratadas como existentes.

## Segurança

- Rotas de dashboard exigem sessão.
- Server Actions validam usuário e espaço ativo.
- Mutações verificam origem confiável.
- O proxy aplica limites básicos de requisição.
- Cabeçalhos de segurança são configurados no Next.js.
- Segredos ficam em `.env*` e não entram no Git.
- Qualquer nova entidade financeira deve ser isolada por espaço e passar pelas mesmas verificações de autorização.

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
