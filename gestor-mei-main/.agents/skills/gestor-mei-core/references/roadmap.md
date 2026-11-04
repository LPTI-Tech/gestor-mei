# Roadmap Oficial de Evolução — Gestor MEI

Este documento detalha o planejamento das próximas sprints de desenvolvimento do Gestor MEI, com escopo técnico, entidades e critérios de aceite.

---

## 🎯 Sprint 8C — NFC-e e QR Code

### Objetivo:
Permitir a emissão de Nota Fiscal de Consumidor Eletrônica (modelo 65) diretamente no PDV, gerando o QR Code de consulta pública e DANFE simplificado para impressoras térmicas (58mm e 80mm).

### Itens de Entrega:
1. **Configuração Fiscal da Empresa:**
   - Inclusão de campos: Inscrição Estadual (IE), Certificado Digital (A1 PKCS#12), Senha do Certificado, CSC (Código de Segurança do Contribuinte) e IdCSC.
2. **Emissão e Comunicação SEFAZ:**
   - Serviço backend para assinatura digital do XML da NFC-e, transmissão síncrona/assíncrona e consulta de protocolo.
3. **Impressão Térmica ESC/POS & QR Code:**
   - Geração do payload do QR Code oficial conforme o manual da SEFAZ de cada estado.
   - Renderização gráfica do QR Code e envio para comandos ESC/POS diretos.

---

## 💎 Sprint 9 — Licenciamento SaaS

### Objetivo:
Transformar o Gestor MEI em uma plataforma SaaS escalável com gestão automatizada de assinaturas e bloqueio inteligente de inadimplência.

### Itens de Entrega:
1. **Modelagem de Planos:**
   - Planos: *MEI Básico* (R$ 39,90/mês), *MEI Pro Delivery* (R$ 59,90/mês) e *MEI Gestão Total* (R$ 79,90/mês).
2. **Ciclo de Vida da Licença:**
   - Estados: `degustacao` (14 dias grátis), `ativa`, `inadimplente` (grace period de 5 dias), `suspensa` (somente leitura) e `cancelada`.
3. **Painel Master de Licenciamento:**
   - Gestão centralizada pela equipe da LPTI Tech com emissão de cupons de desconto e extensão manual de testes.

---

## 🌐 Sprint 10 — Portal do Cliente

### Objetivo:
Disponibilizar uma interface web pública e responsiva para os clientes finais de cada MEI realizarem pedidos online e consultarem históricos.

### Itens de Entrega:
1. **Cardápio / Catálogo Digital Público:**
   - URL personalizada: `gestormei.com.br/cardapio/[slug-empresa]`.
   - Layout mobile-first inspirado no iFood e WhatsApp Web.
2. **Carrinho de Compras e Envio de Pedido:**
   - Seleção de opções (tamanho, adicionais, observações).
   - Envio automático com confirmação direta para o painel de *Pedidos Delivery* do Gestor MEI.
3. **Autoatendimento:**
   - Consulta de 2ª via de comprovante de venda e chave de acesso da NFC-e.

---

## 💳 Sprint 11 — Cobrança Recorrente

### Objetivo:
Automação ponta a ponta da arrecadação de mensalidades do Gestor MEI e integração de meios de pagamento digitais para o lojista.

### Itens de Entrega:
1. **Cobrança das Assinaturas SaaS (LPTI Tech):**
   - Integração com API do Asaas para emissão de PIX dinâmico recorrente e cobrança em cartão de crédito.
   - Webhooks para confirmação de pagamento instantânea e liberação imediata da licença.
2. **PIX Dinâmico Integrado no PDV:**
   - Geração de QR Code PIX diretamente na tela do PDV para recebimento instantâneo pelo MEI com conciliação automática.
