# Ciclo de Vida da Licença & Webhooks de Cobrança — Gestor MEI

Este documento detalha o tratamento de inadimplência, bloqueio suave e integração com webhooks de pagamento.

---

## 1. Cronograma de Ações na Inadimplência

```
Dia 0: Vencimento da fatura mensal
  ↓
Dia 1 a 5: Período de Carência (Grace Period)
  - Notificação amigável no topo do sistema.
  - Vendas continuam 100% liberadas.
  ↓
Dia 6: Suspensão Automática (Soft Lock / Read-Only)
  - Status: SUSPENSA.
  - PDV e Delivery pausados para novas vendas.
  - Relatórios, dados de clientes e extratos continuam legíveis.
  - Modal persistente de reativação via PIX instantâneo.
  ↓
Dia 35: Inativação / Cancelamento (Hard Lock)
  - Acesso desabilitado para operadores.
  - Dados arquivados para conformidade tributária de 5 anos.
```

---

## 2. Eventos de Webhook (Asaas Gateway)

O endpoint backend `/api/webhooks/asaas` receberá os eventos e executará as transições de estado:

| Evento Asaas | Ação no Gestor MEI |
| :--- | :--- |
| `PAYMENT_CONFIRMED` / `PAYMENT_RECEIVED` | Define status como `ATIVA`, prorroga vencimento em +30 dias e remove bloqueios. |
| `PAYMENT_OVERDUE` | Inicia contagem do Grace Period. Envia aviso no frontend. |
| `SUBSCRIPTION_CANCELED` | Define status como `CANCELADA` no fim do ciclo pago vigente. |

