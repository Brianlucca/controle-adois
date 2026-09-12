# Instruções para agentes

Este arquivo se aplica a todo o repositório.

## Leitura obrigatória

Antes de mudanças relevantes, consulte:

- `README.md` para visão, linguagem e roadmap;
- `docs/ARCHITECTURE.md` para a arquitetura existente;
- `docs/DOMAIN_MODEL.md` para invariantes financeiras;
- `docs/CONTRIBUTING.md` para o fluxo Git.

Quando a tarefa envolver branch, commit, merge, rebase, cherry-pick, push ou pull request, leia e siga também `.agents/skills/controle-adois-workflow/SKILL.md`.

## Produto

- Controle A Dois é um produto financeiro para casais, não uma ferramenta genérica de equipes.
- O workspace é uma fronteira técnica; na interface, prefira “nosso espaço” e linguagem voltada ao casal.
- Não anuncie na landing page preço, gratuidade, integração ou funcionalidade que não esteja implementada e validada.
- Itens do roadmap começam desmarcados e só recebem `[x]` após implementação, testes e documentação.

## Domínio financeiro

- Transferência entre contas não é receita nem despesa.
- Pagamento de fatura não pode duplicar despesas.
- Acerto entre o casal não altera o patrimônio conjunto.
- Objetivos e desafios não podem criar saldo fictício.
- Operações compostas precisam preservar as duas pontas e deixar auditoria.
- Regras financeiras reutilizáveis devem ficar em funções puras em `src/lib/finance` e receber testes.

## Git — regras inegociáveis

- A única base permitida para novas branches é `dev`.
- Se `dev` não existir, pare; não use `main` ou qualquer outra branch como substituta.
- Nunca faça checkout, commit, merge, rebase, cherry-pick, push, reset ou pull request envolvendo `main`.
- Branches seguem `<tipo>/<descricao-em-kebab-case>` com tipo de Conventional Commits.
- Commits seguem Conventional Commits.
- Cada commit contém exatamente um arquivo.
- Push e pull request só podem ocorrer após pedido explícito do usuário e nunca podem envolver `main`.

## Qualidade

- Preserve TypeScript estrito e evite `any` sem justificativa.
- Valide entradas nas fronteiras de servidor.
- Não replique cálculos financeiros em componentes.
- Preserve acessibilidade, responsividade e a paleta visual do projeto.
- Execute lint e testes proporcionais à mudança; execute o build em alterações estruturais ou antes de concluir uma entrega relevante.
- Mantenha a documentação sincronizada com decisões de domínio e funcionalidades entregues.
