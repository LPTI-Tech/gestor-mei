# 📊 Estado Oficial do Projeto — GESTOR MEI

> [!IMPORTANT]
> **REGRA DE MANUTENÇÃO CONTÍNUA:**
> Este documento reflete o estado oficial, homologado e em tempo real do **Gestor MEI**. Sempre que uma sprint, módulo ou marco de desenvolvimento for concluído, o assistente Antigravity deve atualizar este arquivo automaticamente antes de encerrar o ciclo de tarefas.

---

## 🏢 Identificação do Projeto

- **Empresa Mantenedora:** LPTI Tech
- **Produto:** GESTOR MEI
- **Versão Atual:** `1.6.0` (Sprint Operação Real 1 Homologada)
- **Tipo de Aplicação:** SaaS Multiempresa B2B (Foco em MEIs e Pequenos Negócios)

---

## 🚀 Sprints Concluídas e Homologadas (100% Funcionais)

| Sprint | Versão | Escopo Entregue | Status |
| :--- | :---: | :--- | :---: |
| **Sprint 1** | `1.0.0` | **Núcleo SaaS Essencial:** Autenticação JWT, Dashboard Executivo, Catálogo de Produtos e Serviços, PDV Rápido (<10s), Controle de Caixa com Fechamento Cego, Despesas e Relatório Anual DASN-SIMEI (Teto de R$ 81.000,00). | Homologado |
| **Sprint 2** | `1.0.5` | **Carrinho Relacional & Clientes:** Vendas 1:N com múltiplos itens, cadastro de clientes com integração WhatsApp e cálculo automático de totais. | Homologado |
| **Sprint 3** | `1.0.8` | **Logística & Delivery:** Regiões e taxas de entrega, Kanban operacional de pedidos (*Recebido $\to$ Preparo $\to$ Em Rota $\to$ Entregue*), vinculação de motoboys e impressão térmica ESC/POS. | Homologado |
| **Sprint 4** | `1.1.0` | **Controle de Estoque & Custos:** Kardex de movimentações (Entrada, Saída, Ajuste, Perda), alerta de estoque mínimo no Dashboard e atualização de custo de reposição. | Homologado |
| **Sprint 5** | `1.2.0` | **Controle DAS Mensal:** Gerenciamento das 12 guias anuais do MEI, marcação de liquidação, alertas de vencimento (crítico/atenção) e atalho para o portal PGMEI. | Homologado |
| **Sprint 6** | `1.2.5` | **Entrada XML NF-e:** Parser SEFAZ v4.00, memória De-Para de códigos de fornecedores, conversão automática de embalagens e entrada no estoque. | Homologado |
| **Sprint 6.5**| `1.3.0` | **Gestão de Compras & Fornecedores:** Dashboard analítico de compras, detalhamento de custos unitários e relação de fornecedores parceiros. | Homologado |
| **Sprint 7** | `1.4.0` | **Painel do Consultor LPTI Tech:** Perfil `CONSULTOR`, visão multi-carteira, termômetro de saúde do negócio (Saudável, Atenção, Crítico) e parecer consultivo. | Homologado |
| **Sprint 8A/8B**| `1.4.0` | **Compra Manual & RBAC Estrito:** Lançamento de compras sem NF-e, upload de comprovantes, cadastro inline de produtos e blindagem de segurança para operadores. | Homologado |
| **Sprint 8.5.1**| `1.4.0` | **Refinamento Visual Executivo:** Logo ampliada em 30% no login, hierarquia visual sem vazios, ampliação da Sidebar para 280px com alinhamento vertical balanceado (Logo, GESTOR MEI, ERP). | Homologado |
| **Sprint UX 1 a 5** | `1.4.5` | **Design System Executivo:** Modernização completa de Dashboard, Estoque, Clientes, Produtos e PDV. | Homologado |
| **Sprint Security 1** | `1.4.7` | **Hardening Integral de Segurança:** Seed controlado, validação estrita de SECRET_KEY, remoção de CORS wildcard, Rate Limiting SlowAPI em login e recuperação de senha. | Homologado |
| **Sprint UX 6 a 9** | `1.5.0` | **Sentinel Foundation & Modernização Total:** Componentes oficiais `FiscalShieldCapsule`, `VitalityRing`, `ProtectiveCard`, `ClearSignalKPI`, modernização de Consultor, Controle DAS e Relatório MEI. | Homologado |
| **Cloudflare R2** | `1.5.1` | **Storage Híbrido Zero Egress:** Provedor Cloudflare R2 com fallback local transparente, particionamento por tenant e suporte a comprovantes e XMLs. | Homologado |
| **Sprint 8C.0** | `1.5.2` | **Estudo Técnico NFC-e SEFAZ MG:** Estudo regulatório e arquitetural aprovado para modelo 65. (Sprint 8C.1 adiada para foco operacional). | Homologado |
| **Sprint Operação Real 1** | `1.6.0` | **Prontidão Operacional de Piloto com Cliente Real:**<br/>1. **Produtos com Imagem:** Upload, conversão automática para WebP via Pillow (LANCZOS e EXIF transpose), persistência híbrida Cloudflare R2 / local, avatar 44px na tabela e modal com preview e remoção.<br/>2. **Logotipo Oficial da Empresa:** Upload de logotipo institucional, WebP 90% (máx 600x600), Cloudflare R2 / local, exibição na Sidebar, Topbar, Configurações e pronto para DANFE/Relatórios fiscais.<br/>3. **PDV Visual:** Catálogo com fotos dos produtos e placeholder Sentinel elegante, busca rápida integrada e thumbnails visuais no carrinho de compras.<br/>4. **Validação Operacional:** 32 testes unitários e de integração passando (100%), build de frontend e backend aprovados sem regressões. | Homologado |

---

## 🎯 Próximos Passos no Roadmap

1. **Sprint Operação Real 2 / Piloto em Produção:**
   - Validação com cliente real piloto no ambiente de homologação/produção.
2. **Sprint 8C.1 — Emissão NFC-e e QR Code:**
   - Homologação SEFAZ-MG modelo 65.
3. **OAuth Google & Microsoft (Descoberta Concluída):**
   - Autenticação social para OWNER e CONSULTOR.
4. **Sprint 9 — Licenciamento SaaS:**
   - Planos comerciais (START, DELIVERY PRO, FULL MEI).

---

## 🛠️ Infraestrutura & URLs Oficiais

### Ambientes de Produção (Nuvem)
- **Frontend (Vercel):** `https://gestor-mei.vercel.app` *(ou domínio oficial `https://gestormei.com.br`)*
- **Backend (Render):** `https://gestor-mei-backend.onrender.com`
- **Armazenamento de Objetos (Cloudflare R2):** Endpoint compatível S3 com Zero Egress Fees e particionamento multi-tenant (`empresas/{id}/produtos/`, `empresas/{id}/logo/`, `empresas/{id}/comprovantes/`).
- **Banco de Dados (Neon):** PostgreSQL 16 Serverless com pool de conexões e SSL obrigatório.

### Ambiente Local de Desenvolvimento
- **Frontend (Vite):** [http://localhost:5173](http://localhost:5173)
- **Backend (FastAPI / Uvicorn):** [http://localhost:8001](http://localhost:8001)
- **Swagger / OpenAPI (Local):** [http://localhost:8001/docs](http://localhost:8001/docs)
- **Banco Local:** SQLite (`gestor_mei.db`) com migrações automáticas no startup.
