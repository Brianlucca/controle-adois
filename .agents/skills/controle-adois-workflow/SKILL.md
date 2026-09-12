---
name: controle-adois-workflow
description: Enforce the Controle A Dois repository workflow when creating branches or performing commits, merges, rebases, cherry-picks, pushes, or pull requests.
---

# Controle A Dois Workflow

Use esta skill para qualquer operação Git que altere branches, histórico ou estado remoto deste repositório. Leia também `docs/CONTRIBUTING.md` antes de agir.

## Invariantes

- `dev` é a única base permitida para criar branches.
- Nunca substitua `dev` por `main` ou qualquer outra branch.
- Nunca faça checkout, commit, merge, rebase, cherry-pick, push, reset ou pull request envolvendo `main`.
- Cada commit deve conter exatamente um arquivo.
- Mensagens e nomes de branch seguem Conventional Commits.
- Push e pull request exigem solicitação explícita do usuário.

## Antes de criar uma branch

1. Execute verificações somente leitura para obter branch atual, estado da árvore e existência de `dev`.
2. Exija árvore limpa antes de trocar de branch ou criar outra.
3. Se `dev` não existir localmente, interrompa e informe o usuário. Não use `main` ou qualquer outra branch como alternativa.
4. Não faça fetch ou pull automaticamente. Atualização remota depende de autorização explícita.
5. Crie a branch diretamente a partir de `dev`.

O nome deve seguir:

```text
<tipo>/<descricao-curta-em-kebab-case>
```

Tipos: `feat`, `fix`, `docs`, `refactor`, `test`, `style`, `perf`, `build`, `ci`, `chore` ou `revert`.

## Antes de cada commit

1. Revise o diff do arquivo.
2. Adicione somente esse arquivo ao índice.
3. Confirme que o índice contém exatamente um caminho.
4. Use `<tipo>(<escopo-opcional>): <descricao-imperativa>`.
5. Crie o commit e repita o processo para o próximo arquivo.

Não agrupe dois arquivos mesmo quando pertencem à mesma funcionalidade. Organize a ordem para que a sequência seja compreensível e valide o estado final completo.

## Operações remotas

- Sem pedido explícito, limite-se ao repositório local.
- Antes de um push autorizado, informe a branch e os commits que serão enviados.
- Recuse qualquer operação que use `main` como origem, destino ou branch de trabalho.
- Não abra pull request automaticamente após um push.

## Encerramento

Confirme:

- branch usada;
- quantidade de commits criados;
- um arquivo por commit;
- resultado das validações;
- estado final da árvore de trabalho;
- ausência de operação em `main`.
