# 📋 Roteiro & Checklist de Testes Piloto — Ambiente Beta

> **Sistema:** GESTOR MEI  
> **Versão:** 1.4.0 (Homologação Beta)  
> **Público dos Testes:** Microempreendedores Individuais (MEI) Piloto & Equipe de Consultoria LPTI Tech  
> **Data:** 29 de Outubro de 2026  
> **Arquivo:** `CHECKLIST_TESTES_PILOTO.md`  

---

## 1. Objetivo da Fase Piloto

Validar o comportamento do **Gestor MEI** em ambiente real de produção em nuvem (Vercel + Render + PostgreSQL), operado diretamente por usuários finais do ramo de alimentação e pequeno comércio, mensurando estabilidade, tempo de resposta, usabilidade do PDV, precisão dos cálculos fiscais e a eficácia do Painel do Consultor.

---

## 2. Contas de Acesso para os Testes

| Perfil de Teste | E-mail de Acesso | Senha | Missão do Testador |
| :--- | :--- | :--- | :--- |
| **Administrador MEI** | `admin@gestormei.com.br` | `admin123` | Validar gestão financeira, estoque, DAS, XML NF-e e compras. |
| **Operador de Caixa** | `operador@gestormei.com.br` | `operador123` | Simular agilidade no balcão, lançamento de vendas e fechamento de caixa. |
| **Consultor LPTI Tech** | `consultor@lptitech.com.br` | `consultor123` | Avaliar visão panorâmica da carteira de clientes e diagnósticos. |

---

## 3. Matriz de Cenários de Teste

### Módulo 1 — Autenticação, Perfis & Segurança
- [ ] **CT01.1 — Login com Sucesso:** Acessar a tela `/login`, preencher credenciais válidas e confirmar redirecionamento imediato ao Dashboard.
- [ ] **CT01.2 — Rejeição de Credenciais Inválidas:** Tentar login com senha incorreta e verificar exibição de alerta claro de erro.
- [ ] **CT01.3 — Persistência de Sessão:** Recarregar a página (F5) em qualquer módulo e garantir que o usuário continue autenticado.
- [ ] **CT01.4 — Proteção de Rotas (RBAC):** Logar com `operador@gestormei.com.br` e tentar acessar `/configuracoes` ou `/consultor` diretamente pela URL, confirmando o redirecionamento seguro para a tela inicial.

---

### Módulo 2 — Ponto de Venda (PDV) & Carrinho Ágil
- [ ] **CT02.1 — Venda Rápida de Balcão:** Adicionar 2 marmitas e 1 refrigerante ao carrinho, selecionar pagamento em *Dinheiro*, finalizar e verificar se o tempo total foi inferior a 10 segundos.
- [ ] **CT02.2 — Desconto Monetário:** Aplicar desconto de R$ 5,00 em uma venda e conferir recálculo automático do total líquido.
- [ ] **CT02.3 — Baixa Automática de Estoque:** Conferir o saldo de um refrigerante antes da venda e constatar a redução física exata de 1 unidade após a conclusão do pedido.
- [ ] **CT02.4 — Cancelamento de Venda:** Cancelar a venda efetuada e conferir o estorno automático do produto no estoque e o cancelamento financeiro no caixa.
- [ ] **CT02.5 — Impressão Térmica ESC/POS:** Clicar em "Imprimir Comanda" e validar layout de 58mm/80mm formatado com cabeçalho, itens e totais.

---

### Módulo 3 — Caixa do Dia (Fechamento Cego)
- [ ] **CT03.1 — Abertura de Turno de Caixa:** Abrir o caixa informando fundo de troco inicial de R$ 100,00.
- [ ] **CT03.2 — Suprimento e Sangria:** Lançar um reforço de R$ 50,00 e uma sangria de retirada de R$ 30,00 com justificativa.
- [ ] **CT03.3 — Fechamento Cego:** Realizar o fechamento informando apenas o valor físico em mãos sem ver o saldo do sistema. Validar a conferência automática de sobra ou falta.

---

### Módulo 4 — Controle de Estoque & Custos
- [ ] **CT04.1 — Entrada Manual de Reposição:** Adicionar 20 unidades de um item informando valor de custo unitário de reposição.
- [ ] **CT04.2 — Saída por Perda/Avaria:** Registrar saída de 2 unidades justificando como "validade vencida" ou "avaria".
- [ ] **CT04.3 — Ajuste de Inventário:** Realizar ajuste físico de contagem e confirmar histórico gravado em `movimentacoes_estoque`.
- [ ] **CT04.4 — Alerta de Estoque Mínimo no Dashboard:** Deixar um produto com saldo abaixo do estoque mínimo e verificar aparição imediata no card de alerta do Dashboard.

---

### Módulo 5 — Controle DAS Mensal (MEI)
- [ ] **CT05.1 — Visualização das 12 Guias:** Acessar a tela `/das` e conferir a listagem completa dos 12 meses do exercício corrente.
- [ ] **CT05.2 — Registro de Quitação:** Registrar pagamento da guia do mês corrente informando data, valor pago e código de autenticação bancária.
- [ ] **CT05.3 — Alerta de Vencimento em 7 Dias:** Verificar se guias com vencimento próximo acionam o banner de atenção amarelo no topo do sistema.
- [ ] **CT05.4 — Atalho Oficial PGMEI:** Clicar no botão "Emitir no PGMEI" e verificar abertura da página oficial da Receita Federal em nova aba.

---

### Módulo 6 — Entrada Automática por XML NF-e
- [ ] **CT06.1 — Upload e Pré-Visualização:** Fazer upload ou colar XML de NF-e v4.00 de fornecedor e validar a leitura precisa do emitente, chave de 44 dígitos e itens.
- [ ] **CT06.2 — Fator de Conversão de Unidades:** Conferir conversão de caixa/fardo (ex: 1 caixa com 12 unidades) com entrada física correta no estoque.
- [ ] **CT06.3 — Efetivação de Entrada:** Clicar em "Importar para o Estoque" e constatar incremento no saldo e atualização do custo unitário.
- [ ] **CT06.4 — Trava Anti-Duplicidade:** Tentar reimportar o mesmo XML e validar bloqueio automático com aviso de nota já importada anteriormente.

---

### Módulo 7 — Módulo de Compras
- [ ] **CT07.1 — Dashboard de Compras:** Acessar `/compras` e validar os 4 indicadores: *Última Compra*, *Total Comprado no Mês*, *Número de Notas* e *Fornecedor Principal*.
- [ ] **CT07.2 — Busca Textual no Histórico:** Buscar por nome de fornecedor ou número de nota e checar filtro em tempo real.
- [ ] **CT07.3 — Detalhes da Compra:** Clicar em "Detalhes" de uma compra faturada e auditar todos os itens faturados, unidades e valores.

---

### Módulo 8 — Relatório Fiscal Anual (DASN-SIMEI)
- [ ] **CT08.1 — Segregação Comércio vs Serviços:** Acessar `/relatorio-mei` e checar separação automática entre receitas de produtos e receitas de serviços.
- [ ] **CT08.2 — Monitoramento do Teto de R$ 81.000,00:** Conferir barra de progresso do limite anual com projeção de fechamento do exercício fiscal.
- [ ] **CT08.3 — Exportação Oficial:** Gerar o demonstrativo oficial em formato PDF e planilha Excel e conferir a diagramação.

---

### Módulo 9 — Painel do Consultor LPTI Tech
- [ ] **CT09.1 — Login como Consultor:** Acessar com `consultor@lptitech.com.br` e verificar visão panorâmica da carteira de MEIs.
- [ ] **CT09.2 — Indicadores Panorâmicos:** Conferir os 4 cards de topo: *Clientes Ativos*, *DAS em Atraso*, *Estoque Crítico* e *Próximos do Limite MEI*.
- [ ] **CT09.3 — Validação dos Scores de Saúde:**
  - Validar cliente 🟢 **Saudável** (ex: Barbearia Navalha de Ouro, 40% do teto, DAS em dia).
  - Validar cliente 🟡 **Atenção** (ex: Burger Smash, 85% do teto, estoque crítico).
  - Validar cliente 🔴 **Crítico** (ex: Depósito da Vila, > 100% do teto, DAS atrasado).
- [ ] **CT09.4 — Filtros de Auditoria:** Clicar nos chips de filtro rápido (*DAS Atrasado*, *Estoque Crítico*, *Próximo Limite*) e atestar a filtragem precisa da tabela.
- [ ] **CT09.5 — Diagnóstico Consultivo:** Clicar em "Diagnóstico" e verificar a geração de recomendações estratégicas personalizadas para o cliente.

---

## 4. Formulário Padronizado para Reporte de Anomalias (Bugs)

Caso algum participante do piloto identifique comportamento inesperado, lentidão ou falha de layout, utilize o formato abaixo para relato à equipe LPTI Tech:

```markdown
### 🐛 Reporte de Anomalia — Piloto Beta

- **Data / Hora:** DD/MM/AAAA às HH:MM
- **Usuário / Perfil:** (Admin / Operador / Consultor)
- **Dispositivo / Navegador:** (Ex: Chrome no Windows / Safari no iPhone / Chrome no Android)
- **Tela / Módulo:** (Ex: /pdv, /compras, /consultor)
- **Descrição do Problema:** (O que aconteceu de errado?)
- **Passos para Reproduzir:**
  1. Acessar a tela X
  2. Clicar no botão Y
  3. Preencher o campo Z
- **Resultado Esperado:** (O que deveria ter acontecido?)
- **Resultado Observado:** (O que aconteceu na prática? Erro visual, travamento, mensagem de erro)
- **Captura de Tela / Evidência:** (Anexar print ou foto)
```

---

## 5. Critérios de Homologação para Versão Final (Go-Live)

A versão Beta será promovida para produção comercial (v2.0) quando cumprir:

1. **Zero Bugs Críticos:** Nenhuma falha impeditiva no PDV, cálculo de valores, emissão de relatórios fiscais ou baixa de estoque.
2. **Tempo de Resposta Aprovado:** Conclusão de pedidos no PDV em menos de 10 segundos em conexões 4G/5G comuns.
3. **Concordância Contábil de 100%:** Cruzamento sem divergências entre o relatório DASN-SIMEI do sistema e os extratos bancários/caixa físico dos participantes piloto.
4. **Validação do Painel do Consultor:** Aprovação da equipe de consultoria LPTI Tech sobre a utilidade e acurácia dos scores preditivos de saúde do negócio.

