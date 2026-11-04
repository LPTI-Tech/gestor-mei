# Matriz Completa de Funções & Rotas — Gestor MEI

Tabela exaustiva de permissões do sistema Gestor MEI.

---

| Funcionalidade / Tela | MASTER | OWNER | CONSULTOR | OPERATOR | Justificativa de Governança |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Criar Empresas** | ✅ | ❌ | ❌ | ❌ | Prerrogativa comercial da LPTI Tech |
| **Suspender Empresa** | ✅ | ❌ | ❌ | ❌ | Ação financeira/contratual de suporte |
| **Criar Usuário OWNER** | ✅ | ❌ | ❌ | ❌ | Provisionamento inicial de conta |
| **Criar Usuário OPERATOR**| ✅ | ✅ | ❌ | ❌ | Gestão de equipe do proprietário |
| **Definir Taxas de Delivery**| ✅ | ✅ | ❌ | ❌ | Regra de negócio da empresa |
| **PDV (Frente de Caixa)** | ✅ | ✅ | ❌ | ✅ | Operação diária de vendas |
| **Vender Fiado / A Prazo** | ✅ | ✅ | ❌ | ⚠️ Config | Definido em configurações da empresa |
| **Abrir/Fechar Caixa** | ✅ | ✅ | ❌ | ✅ (Próprio) | Registro de conferência física |
| **Sangria (Retirada de Dinheiro)** | ✅ | ✅ | ❌ | ✅ (Com Justificativa) | Rastreabilidade no caixa |
| **Cadastrar Produtos** | ✅ | ✅ | ❌ | ❌ | Prevenção de alterações indesejadas |
| **Ver Estoque Físico** | ✅ | ✅ | ✅ | ✅ (Apenas Saldo) | Conferência de balcão |
| **Importar XML NF-e** | ✅ | ✅ | ✅ | ❌ | Contém preços de compra e fornecedores |
| **Registrar Despesas** | ✅ | ✅ | ✅ | ❌ | Apenas donos e consultores auditam custos |
| **Visualizar Lucro Líquido**| ✅ | ✅ | ✅ | ❌ | Dado confidencial estratégico |
| **Gerar Relatório DASN** | ✅ | ✅ | ✅ | ❌ | Apuração tributária oficial |
| **Painel do Consultor** | ✅ | ❌ | ✅ | ❌ | Exclusivo para parceiros credenciados |
| **Alterar Senha Própria** | ✅ | ✅ | ✅ | ✅ | Direito fundamental de segurança |
