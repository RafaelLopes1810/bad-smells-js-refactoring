# Relatório de Bad Smells e Refatoração Segura

## Correções de linha de base

O original sem correções foi preservado em `ReportGenerator.original-antes-da-correcao.js` antes das edições. A cópia preservada e o arquivo original antes da correção tiveram o mesmo SHA-256: `E3AAAF125FC846DE0BE4BE873DB63A6D17B020CAB8446E82DEBB3F26A0A386A8`.

O projeto é ESM (`"type": "module"`) e Jest estava configurado com `"transform": {}`. Para que Jest execute os imports ESM sem converter o projeto para CommonJS nem adicionar Babel, o script foi alterado somente para:

```json
"test": "node --experimental-vm-modules node_modules/jest/bin/jest.js"
```

Também foi corrigido o espaço indevido no HTML para alinhar a saída ao teste existente:

```diff
- const style = item.priority ? 'style="font-weight:bold;"' : '';
- report += `<tr ${style}><td>${item.id}</td><td>${item.name}</td><td>${item.value}</td></tr>\n`;
+ const style = item.priority ? ' style="font-weight:bold;"' : '';
+ report += `<tr${style}><td>${item.id}</td><td>${item.name}</td><td>${item.value}</td></tr>\n`;
```

O espaço foi movido para o início de `style` e removido do template literal. Assim, itens comuns produzem `<tr>` e itens prioritários produzem `<tr style="font-weight:bold;">`. O número de linhas e a lógica de negócio não mudaram.

Após essas duas correções, `npm test` executou 1 suíte e 5 testes: **5 passaram, 0 falharam**. Node exibiu `ExperimentalWarning: VM Modules is an experimental feature and might change at any time`, esperado para essa opção.

## Análise manual (registrada antes da primeira execução do ESLint)

O arquivo analisado foi `src/ReportGenerator.js` depois da correção autorizada do espaço, que preserva a estrutura e quantidade de linhas do original.

| Bad Smell do catálogo | Método e linhas | Problema de manutenção | Problema para testes | Refatoração planejada |
|---|---|---|---|---|
| Long Method / God Method | `generateReport`, linhas 11–68 (58 linhas incluindo linhas vazias e delimitadores) | Mistura montagem de cabeçalho, regras por perfil, marcação de prioridade, formatação dos itens, soma e rodapé. Mudanças em uma responsabilidade elevam o risco de regressão nas demais. | Cenários de formatação, filtro e cálculo estão acoplados; há muitos caminhos condicionais para cobrir e diagnosticar. | Extract Method em cabeçalho, seleção/formatação de itens e rodapé, mantendo a API pública. |
| Duplicated Code | `generateReport`, linhas 35–41 e 46–51 | A escrita CSV e a soma aparecem de novo nos ramos de admin e usuário; variações semelhantes podem divergir quando uma delas for alterada. | Testes de cada perfil repetem expectativas sobre a mesma lógica, e uma correção aplicada só a um ramo deixa cobertura inconsistente. | Extract Method para renderizar o item conforme o formato e centralizar a soma quando o comportamento for equivalente. |
| Switch Statements (cadeias `if/else`) | `generateReport`, linhas 16–24, 28–52 e 58–65 | Cadeias por tipo de relatório e papel estão espalhadas pelo mesmo método; um novo tipo/papel exige editar vários locais. | A combinação perfil × formato multiplica os caminhos de teste e facilita esquecer combinações. | Decompose Conditional e, onde simplificar sem mudar semântica, tabela/mapa de renderizadores ou funções auxiliares. |
| Magic Numbers/Strings | `generateReport`, linhas 16–23, 28–30, 35–50, 58–65 | Limites `1000` e `500`, papéis, formatos e trechos de saída estão embutidos nas condições, dificultando perceber seu significado e manter consistência. | Testes de fronteira ficam dependentes de literais dispersos e uma alteração pode atualizar regra sem atualizar outro ponto correlato. | Replace Magic Number/String with Symbolic Constant para limites, papéis e formatos, preservando exatamente seus valores. |
| Comments como desodorante | Comentários de seção e de lógica em `generateReport`, linhas 6–10, 15, 26, 29–31, 44 e 57 | Os rótulos tentam dividir responsabilidades que permanecem misturadas; alguns repetem o que a condição já diz, em vez de tornar as operações autoexplicativas. | Comentários não ajudam a verificar saídas; podem dar falsa confiança sobre regras que os testes precisam comprovar. | Extract Method e nomes precisos; remover apenas comentários redundantes depois de estruturar o código. |
| Divergent Change (indício) | `generateReport`, em especial linhas 16–24, 28–52 e 58–65 | A mesma operação muda por razões diferentes: formato de saída e regra de acesso/perfil. Isso pressiona um único método a mudar em solicitações independentes. | Alterar regra de autorização pode afetar formatação e vice-versa, elevando o escopo de regressão. | Extract Method e separação coesa das decisões; Extract Class somente se a extração resultar em responsabilidades realmente independentes, sem sobreengenharia. |

### Medições estruturais manuais

- `constructor`: linhas 2–4 (3 linhas incluindo delimitadores); armazena `database`, que não é usado na lógica atual.
- `generateReport`: linhas 11–68 (58 linhas incluindo linhas em branco e delimitadores).
- Seções: cabeçalho, linhas 16–24; corpo, 27–55; rodapé e retorno, 58–68.
- Maior profundidade sintática de controle: 4 níveis no ramo de usuário/formato (`for` → papel `USER` → filtro por valor → formato CSV/HTML).
- Decisões condicionais `if` contadas: 8; há cadeias com `else if` para formato e papel. Não existe palavra-chave `switch`; “Switch Statements” foi usado para descrever as cadeias equivalentes.
- Não classifiquei a classe como Large Class: apesar do acúmulo de responsabilidades no método, são somente um construtor e um método operacional. Também não considerei Feature Envy, Long Parameter List ou Refused Bequest comprovados pelo código observado.

## Ambiente e linha de base

| Componente | Versão/resultado |
|---|---|
| Node.js | v24.21.0 |
| npm | 11.19.0 |
| Jest | 29.7.0 |
| ESLint | 8.57.1 |
| eslint-plugin-sonarjs | 0.21.0 |
| Testes antes das refatorações | 1 suíte, 5 testes; 5 aprovados após as correções de linha de base |
| Testes com as duas cópias | 2 suítes, 10 testes; 10 aprovados |

As versões foram confirmadas por `node --version`, `npm --version` e `npm ls eslint eslint-plugin-sonarjs jest`. As dependências ESLint e SonarJS já estavam declaradas no projeto e não foram reinstaladas nem atualizadas.

O `.eslintrc.json` já existia no repositório, foi mantido intacto e usa `sonarjs/cognitive-complexity` com limite **5**, além de `sonarjs/no-identical-functions` e `sonarjs/no-duplicated-branches`. Isso difere da configuração/limite 15 do enunciado original; não sobrescrevi o arquivo nem migrei para flat config. A configuração existente foi compatível com ESLint 8.57.1 e SonarJS 0.21.0.

## Detecção automática antes da refatoração

O comando `npx eslint src/` foi executado e salvo em `eslint-antes.txt` **antes de criar** o arquivo refatorado. Saída completa:

```text
C:\Users\T-GAMER\Documents\GitHub\bad-smells-js-refactoring\src\ReportGenerator.js
  11:3   error  Refactor this function to reduce its Cognitive Complexity from 27 to the 5 allowed  sonarjs/cognitive-complexity
  43:14  error  Merge this if statement with the nested one                                         sonarjs/no-collapsible-if

✖ 2 problems (2 errors, 0 warnings)
```

Resumo da execução inicial: **2 problemas, 2 erros e 0 avisos**, ambos em `src/ReportGenerator.js` (linhas 11 e 43). A medição auxiliar com limite cognitivo 15 também produziu os mesmos 2 problemas; apenas a mensagem do primeiro passou a dizer “from 27 to the 15 allowed”. Logo, o valor 27 excede ambos os limites, e o problema `no-collapsible-if` não depende desse limite.

### Métricas auxiliares antes

As medições temporárias usaram `--rule 'sonarjs/cognitive-complexity: [error, 0]'`, `--rule 'complexity: [error, 0]'` e `--rule 'no-magic-numbers: [warn, { "ignore": [0, 1, -1] }]'`. Saída completa registrada em `metricas-antes.txt`. Elas informaram:

- `ReportGenerator.constructor`: complexidade cognitiva 0; ciclomática 1.
- `ReportGenerator.generateReport`: complexidade cognitiva **27**; ciclomática **15**.
- Números mágicos: `1000` na linha 30 e `500` na linha 45.
- A execução auxiliar terminou com 4 erros e 2 avisos porque os limites cognitivo/ciclomático foram deliberadamente zerados para medir; isso não é a contagem da configuração normal.

## Ferramenta versus análise manual

O SonarJS quantificou a complexidade cognitiva de `generateReport` (27) e apontou `no-collapsible-if` na regra de usuário. A análise manual também viu repetição entre os ramos, uso de comentários de seção e responsabilidades de formato/perfil compartilhando o mesmo método; essas observações não foram reportadas pela execução normal. `Large Class` e `Feature Envy` não foram classificados como achados confirmados: a classe é pequena e o uso de dados de usuário/itens é parte direta da geração do relatório.

A configuração normal não reportou os limites mágicos 500/1000; eles só apareceram quando `no-magic-numbers` foi habilitada na medição auxiliar. As regras `no-identical-functions` e `no-duplicated-branches` também não acusaram duplicação neste arquivo — os trechos relacionados são similares, mas não funções/branches idênticos para essas regras.

## Refatoração em destaque

O cheiro mais crítico foi **Long Method / alta complexidade cognitiva** em `generateReport` (58 linhas e complexidade cognitiva 27). No original corrigido para a linha de base, o corpo colocava seleção de perfil, marcação de prioridade, seleção do formato e cálculo do total em condicionais aninhadas:

```js
for (const item of items) {
  if (user.role === 'ADMIN') {
    if (item.value > 1000) {
      item.priority = true;
    }
    if (reportType === 'CSV') {
      report += `${item.id},${item.name},${item.value},${user.name}\n`;
      total += item.value;
    } else if (reportType === 'HTML') {
      // ... formata a linha HTML do admin e soma o item
    }
  } else if (user.role === 'USER') {
    if (item.value <= 500) {
      // ... volta a selecionar CSV/HTML e soma o item
    }
  }
}
```

Trecho real resumido de `src/ReportGenerator.js`, linhas 27–55; comentários `...` indicam partes omitidas do trecho, não código presente no arquivo.

No refatorado, o método principal delega a escolha de regra do perfil, salta itens não aplicáveis e centraliza a inclusão da linha e soma:

```js
for (const item of items) {
  const formatForRole = ITEM_FORMATTERS_BY_ROLE.get(user.role);
  if (formatForRole === undefined) {
    continue;
  }

  const formattedItem = formatForRole(reportType, user, item);
  if (formattedItem === null) {
    continue;
  }

  report += formattedItem;
  total += item.value;
}
```

Trecho real de `src/ReportGenerator.refactored.js`, linhas 86–99. A política específica fica em funções curtas:

```js
function formatAdminItem(reportType, user, item) {
  if (item.value > ADMIN_PRIORITY_THRESHOLD) {
    item.priority = true;
  }
  return formatReportItem(reportType, item, user, true);
}

function formatStandardUserItem(reportType, user, item) {
  if (item.value > STANDARD_USER_VALUE_LIMIT) {
    return null;
  }
  return formatReportItem(reportType, item, user, false);
}
```

Trecho real das linhas 53–65. Apliquei **Extract Method** para cabeçalho, rodapé e formatação (linhas 8–65), **Decompose Conditional/guard clauses** para sair cedo de casos não aplicáveis e reduzir aninhamento, e dispatch por mapa de estratégias (`Map`) para separar as regras por perfil. `Map` mantém o tratamento de papéis desconhecidos equivalente ao original, inclusive chaves como `toString` e `__proto__`; a comparação diferencial validou esses casos. Também apliquei **Replace Magic Number with Symbolic Constant** para 500/1000 e para nomes de papel/formato. A classe mantém `export class ReportGenerator`, construtor e assinatura pública `generateReport(reportType, user, items)`.

## Log da refatoração

| Passo | Smell | Técnica | Resultado do teste |
|---|---|---|---|
| 1 | Long Method; cabeçalho/rodapé misturados | Extract Method (`createHeader`, `createFooter`) | `npm test`: 2 suítes, 10/10 testes aprovados |
| 2 | Magic Numbers/Strings | Replace Magic Number with Symbolic Constant (limites, papéis, formatos) | `npm test`: 2 suítes, 10/10 testes aprovados |
| 3 | Duplicated Code e responsabilidades de formatação misturadas | Extract Method (`formatCsvItem`, `formatHtmlItem`, `formatReportItem`) | `npm test`: 2 suítes, 10/10 testes aprovados |
| 4 | Switch Statements/condicionais por papel; aninhamento | Replace Conditional with estratégia por perfil e guard clauses | `npm test`: 2 suítes, 10/10 testes aprovados |
| 5 | Preservação de comportamento em papéis desconhecidos | Refinamento do dispatch para `Map` (chaves exatas sem protótipo herdado) | `npm test`: 2 suítes, 10/10 testes aprovados; 18 casos diferenciais também passaram |

Não houve passo de refatoração com falha nos testes nem necessidade de desfazer alterações.

## Métricas antes/depois

As contagens de linhas abaixo são spans inclusivos dos métodos/funções, incluindo delimitadores e linhas vazias. As complexidades foram medidas com as regras auxiliares temporariamente configuradas para limite 0; o valor cognitivo 0 é inferido para funções sem incremento/sem mensagem da regra.

| Função/método | Linhas antes | Cognitiva antes | Ciclomática antes | Linhas depois | Cognitiva depois | Ciclomática depois |
|---|---:|---:|---:|---:|---:|---:|
| `constructor` | 3 | 0 | 1 | 3 | 0 | 1 |
| `generateReport` | 58 | 27 | 15 | 23 | 5 | 4 |
| `createHeader` | — | — | — | 15 | 2 | 3 |
| `createFooter` | — | — | — | 9 | 2 | 3 |
| `formatCsvItem` | — | — | — | 3 | 0 | 1 |
| `formatHtmlItem` | — | — | — | 4 | 2 | 3 |
| `formatReportItem` | — | — | — | 9 | 2 | 3 |
| `formatAdminItem` | — | — | — | 6 | 1 | 2 |
| `formatStandardUserItem` | — | — | — | 6 | 1 | 2 |
| **Total de funções/métodos** | **2** |  |  | **9** |  |  |

Os helpers pós-refatoração e seus spans correspondem a `src/ReportGenerator.refactored.js`, linhas 8–70. `generateReport` passou de 58 para 23 linhas e de complexidade cognitiva 27/ciclomática 15 para 5/4; a complexidade cognitiva máxima pós-refatoração é 5.

| Execução ESLint | Arquivos/processamento | Problemas |
|---|---|---:|
| Antes, configuração do repositório | Apenas original (`npx eslint src/` antes da cópia) | 2 erros, 0 avisos |
| Depois, arquivo refatorado | Refatorado com configuração normal | 0 erros, 0 avisos |
| Depois, diretório `src/` completo | Original + refatorado | 2 erros, 0 avisos, ambos no original |

## Validação final

`npx eslint src/ReportGenerator.refactored.js` concluiu com **0 erros e 0 avisos**; a evidência está em `eslint-depois.txt` (“sem erros nem avisos”). A execução final de `npx eslint src/` ainda reporta os 2 problemas do original, como esperado e exigido, sem problema no refatorado.

`npm test` final: **2 suítes passaram, 10 testes passaram, 0 falharam**. `tests/ReportGenerator.test.js`: 5/5; `tests/ReportGenerator.refactored.test.js`: 5/5. Uma comparação adicional entre original e refatorado passou em **18 combinações** (6 papéis, incluindo desconhecidos e nomes de propriedades herdadas, × 3 formatos), comparando tanto a string de saída quanto a mutação dos itens.

O teste original não foi modificado. A cópia difere dele somente no import de topo, confirmado por `git diff --no-index`. O original de produção só contém as duas alterações de linha de base documentadas; a cópia preservada anterior à correção permite conferir o diff exato. `.eslintrc.json` também permanece inalterado.

## Observações

- O aviso `ExperimentalWarning: VM Modules is an experimental feature and might change at any time` aparece ao executar Jest; é esperado devido ao comando ESM adotado.
- `npm install` criou `package-lock.json` no worktree. Não houve atualização deliberada de dependências; `npm ls` confirmou as versões registradas acima.
- A instalação informou 28 vulnerabilidades no relatório de auditoria (4 baixas e 24 moderadas). Não executei `npm audit fix` nem alterei dependências para evitar mudanças fora do escopo.
- O primeiro comando auxiliar de comparação diferencial falhou por quoting do PowerShell; foi reexecutado com entrada via stdin e validou 18 casos. Isso não afetou os testes Jest nem alterou arquivos.
- Nenhum commit ou push foi feito.
