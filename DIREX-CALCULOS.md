# Relatório Executivo - regras de cálculo

## Indicadores

- **TMA:** menor é melhor. Meta inicial: até `00:45:00`.
- **TMR:** menor é melhor. Meta inicial: até `00:02:40`.
- **CSAT:** maior é melhor. O SGP usa a métrica `Qualidade Percebida na Avaliação Geral - OPA`. Meta inicial: no mínimo `4,50`.

As metas e os pesos podem ser alterados em **Configurações > Metas do Relatório Executivo** sem modificar o código.

## Comparação

Variação absoluta:

```text
resultado atual - resultado anterior
```

Variação percentual:

```text
((resultado atual - resultado anterior) / |resultado anterior|) * 100
```

Para TMA e TMR, uma redução é melhoria. Para CSAT, um aumento é melhoria. A seta nunca é interpretada isoladamente.

## Índice de evolução

Cada indicador comparável recebe:

- `100` pontos quando melhora;
- `50` pontos quando permanece estável;
- `0` pontos quando piora.

Quando não existe período anterior, o indicador recebe `100` se atingir a meta e `0` se ficar fora da meta.

O índice é a média ponderada:

```text
soma(pontuação do indicador * peso do indicador) / soma dos pesos
```

Classificação:

- `70%` ou mais: evolução positiva;
- de `45%` a `69%`: cenário de atenção;
- abaixo de `45%`: necessita atenção.

## Consolidação

- Semana: compara a semana selecionada com a semana imediatamente anterior; no início do mês, usa a última semana disponível do mês anterior.
- Mês: compara com o mês anterior.
- Ano: calcula a média dos meses disponíveis e compara com o ano anterior.
- Personalizado: usa as semanas que cruzam o intervalo informado e compara com outro intervalo de mesma duração imediatamente anterior.
- TMA e TMR são convertidos para segundos durante os cálculos e voltam ao formato `HH:MM:SS` na exibição.
- CSAT é calculado como média simples dos valores válidos disponíveis no período.

## Aderência exibida nos gráficos

Os gráficos normalizam cada indicador em relação à própria meta. A linha de `100%` representa o objetivo configurado:

- TMA e TMR: `meta / resultado * 100`;
- CSAT: `resultado / meta * 100`.

Valores acima de `100%` indicam que a meta foi superada. O gráfico limita a escala visual em `180%` para evitar distorções, sem alterar o valor original.

## Ocorrências

- O volume, a cidade, a causa e o tempo offline usam o mesmo recorte selecionado no relatório.
- A comparação usa o período imediatamente anterior conforme a regra de semana, mês, ano ou intervalo personalizado.
- O histórico mensal considera até 12 meses disponíveis.
- As ocorrências complementam a leitura executiva, mas não alteram o Índice de Evolução de TMA, TMR e CSAT.

As bases de indicadores e ocorrências são apenas consultadas e consolidadas pelo relatório. Nenhum dado original é alterado.
