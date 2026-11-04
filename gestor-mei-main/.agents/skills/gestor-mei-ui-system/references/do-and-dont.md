# DO & DON'T — Regras Estritas de UI/UX

Este guia rápido deve ser consultado antes de finalizar qualquer tela ou componente no Gestor MEI.

---

## 🚫 DON'T (O que NUNCA fazer)

1. **Nunca usar botões padrão sem estilização:**
   - ❌ `<button>Clique aqui</button>` cru sem classes ou tema.
   - ❌ Botões com cores ácidas ou fora da paleta (ex: verde limão fosforescente, azul ciano puro).
2. **Nunca usar tabelas HTML padrão sem padding e sem hover:**
   - ❌ Bordas pretas sólidas de 1px (`border: 1px solid black`).
   - ❌ Células apertadas com padding menor que 8px.
3. **Nunca deixar números monetários desalinhados:**
   - ❌ Valores de R$ alinhados à esquerda no meio da coluna.
   - ❌ Valores sem formatação decimal padrão brasileiro (`R$ 1.500,00`, nunca `1500` ou `1500.0`).
4. **Nunca criar telas vazias ou silenciosas:**
   - ❌ Deixar uma lista vazia sem explicação ou instrução do que fazer.
   - ❌ Deixar o usuário esperando carregamento sem `Skeleton` elegante ou indicador suave.
5. **Nunca alterar regras de negócio ou lógica sob pretexto de design:**
   - ❌ Modificar cálculos de impostos, fórmulas de lucro ou limites do MEI.
   - ❌ Remover campos de validação fiscal obrigatórios.
   - ❌ Desabilitar proteções de RBAC (ex: permitir que operador acerte configurações fiscais).

---

## ✅ DO (O que SEMPRE fazer)

1. **Sempre aplicar espaçamento generoso:**
   - ✅ Usar `p: { xs: 2, sm: 3 }` no container principal.
   - ✅ Usar `gap: 2` ou `gap: 3` em grids e layouts flex.
2. **Sempre usar cards com borda sutil e cantos arredondados:**
   - ✅ `borderRadius: 3` ou `4` (12px a 16px).
   - ✅ `border: '1px solid'`, `borderColor: 'divider'`.
   - ✅ Hover com transição suave (`transition: 'all 0.2s ease-in-out'`).
3. **Sempre utilizar badges de status semânticos:**
   - ✅ Verde para sucesso/concluído.
   - ✅ Âmbar/Laranja para alertas/pendências.
   - ✅ Vermelho para atrasos/cancelamentos.
   - ✅ Azul para em processamento/novos.
4. **Sempre alinhar valores numéricos à direita:**
   - ✅ Cabeçalho e células de colunas numéricas/monetárias com `align="right"`.
5. **Sempre adicionar contexto com subtítulo de página:**
   - ✅ Título em negrito (700 ou 800) acompanhado de uma frase concisa explicando o objetivo daquela tela para o microempreendedor.
