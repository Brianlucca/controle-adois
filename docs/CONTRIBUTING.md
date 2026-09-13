# Contribuição e fluxo Git

Estas regras são obrigatórias para pessoas e agentes que trabalham neste repositório.

## Estado das branches

A branch-base definida para o projeto é `dev`.

- Toda branch nova deve nascer de `dev`.
- Não criar uma branch a partir de `main` ou de qualquer outra base.
- Se `dev` não existir localmente, interromper a operação e informar o responsável.

## Proteção absoluta da main

Não é permitido:

- fazer checkout ou switch para `main`;
- criar branch a partir de `main`;
- criar commits em `main`;
- fazer merge, rebase ou cherry-pick em `main`;
- fazer push para `main`;
- abrir pull request com `main` como origem ou destino;
- resetar, apagar ou reescrever `main`.

Se uma solicitação exigir qualquer uma dessas ações, pare e informe o bloqueio. Não improvise uma exceção.

## Criação de branch

Uma branch só pode nascer do commit atualmente apontado por `dev`.

Antes de criar:

```bash
git status --short
git branch --show-current
git branch --list dev
```

Requisitos:

- árvore de trabalho limpa;
- `dev` existente localmente;
- base confirmada como `dev`;
- atualização remota apenas quando explicitamente autorizada.

Formato do nome:

```text
<tipo>/<descricao-curta-em-kebab-case>
```

Tipos aceitos: `feat`, `fix`, `docs`, `refactor`, `test`, `style`, `perf`, `build`, `ci`, `chore` e `revert`.

Exemplos:

```text
feat/bank-accounts
fix/transfer-balance
docs/domain-model
refactor/transaction-ledger
```

## Commits

Cada commit deve conter exatamente um arquivo alterado.

Formato obrigatório:

```text
<tipo>(<escopo-opcional>): <descricao-imperativa>
```

Exemplos:

```text
feat(accounts): add account ownership fields
fix(transfers): prevent cash-flow double counting
docs: document settlement invariants
test(accounts): cover opening balance calculation
```

Antes de cada commit:

```bash
git diff -- <arquivo>
git add -- <arquivo>
git diff --cached --name-only
git commit -m "tipo(escopo): descricao" -- <arquivo>
```

O resultado de `git diff --cached --name-only` deve conter apenas um caminho. Mudanças que envolvem vários arquivos devem ser divididas em uma sequência coerente de commits individuais.

## Push e pull requests

- Nunca fazer push automaticamente.
- Push exige solicitação explícita do usuário.
- Nunca enviar ou envolver `main`.
- Antes do push autorizado, informar branch e commits que serão enviados.
- Pull request também exige solicitação explícita e nunca pode ter `main` como origem ou destino.

## Validação

Execute validações proporcionais à mudança. Para uma entrega completa:

```bash
npm run lint
npm test
npm run build
```

Não marque um item do roadmap como concluído se o código, os testes e a documentação ainda não representarem a funcionalidade inteira.
