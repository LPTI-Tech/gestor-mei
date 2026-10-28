export type UserRole = 'ADMIN' | 'OPERADOR';

export interface User {
  id: number;
  empresa_id: number;
  nome: string;
  email: string;
  role: UserRole;
  ativo: boolean;
  created_at: string;
}

export interface Empresa {
  id: number;
  nome_empresarial: string;
  nome_fantasia: string;
  cnpj: string;
  cpf_proprietario: string;
  endereco?: string;
  telefone?: string;
  email: string;
  limite_mei_anual: number;
  segmento?: string;
  modulo_delivery?: boolean;
  modulo_motoboy?: boolean;
  modulo_ifood?: boolean;
  modulo_estoque?: boolean;
  data_inicio_atividades: string;
  created_at: string;
  updated_at: string;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
  user_id: number;
  empresa_id: number;
  nome: string;
  email: string;
  role: UserRole;
  nome_fantasia: string;
}

export type TipoItem = 'PRODUTO' | 'SERVICO';
export type CategoriaProduto = string;

export interface Produto {
  id: number;
  empresa_id: number;
  nome: string;
  tipo: TipoItem;
  categoria: CategoriaProduto;
  preco_venda: number;
  custo_unitario?: number;
  quantidade_estoque?: number;
  estoque_minimo?: number;
  estoque_baixo?: boolean;
  ativo: boolean;
  created_at: string;
}

export type TipoMovimentacaoEstoque = 'ENTRADA' | 'SAIDA' | 'AJUSTE';

export interface MovimentacaoEstoque {
  id: number;
  empresa_id: number;
  produto_id: number;
  produto_nome?: string;
  tipo: TipoMovimentacaoEstoque;
  quantidade: number;
  motivo?: string;
  usuario_id?: number;
  usuario_nome?: string;
  data_movimentacao: string;
  observacao?: string;
}

export interface EntradaEstoqueRequest {
  produto_id: number;
  quantidade: number;
  custo_unitario?: number;
  motivo?: string;
  observacao?: string;
}

export interface SaidaEstoqueRequest {
  produto_id: number;
  quantidade: number;
  motivo: string;
  observacao?: string;
}

export interface AjusteEstoqueRequest {
  produto_id: number;
  nova_quantidade: number;
  motivo?: string;
  observacao?: string;
}

export interface ResumoEstoqueItem {
  id: number;
  nome: string;
  categoria: string;
  tipo: string;
  quantidade_estoque: number;
  estoque_minimo: number;
  custo_unitario: number;
  preco_venda: number;
  estoque_baixo: boolean;
  valor_total_custo: number;
  valor_total_venda: number;
}

export interface ResumoEstoqueGeral {
  total_itens: number;
  itens_estoque_baixo: number;
  valor_total_custo: number;
  valor_total_venda: number;
  itens: ResumoEstoqueItem[];
}

export type OrigemVenda = 'Balcão' | 'WhatsApp' | 'Delivery Próprio' | 'iFood' | 'Telefone' | 'Outros';
export type FormaPagamento = 'Dinheiro' | 'PIX' | 'Débito' | 'Crédito' | 'Boleto';
export type TipoPedido = 'BALCAO' | 'ENTREGA' | 'RETIRADA';
export type StatusPedido = 'Recebido' | 'Em Preparo' | 'Saiu para Entrega' | 'Entregue' | 'Cancelado';

export interface RegiaoEntrega {
  id: number;
  empresa_id: number;
  nome: string;
  taxa_entrega: number;
  tempo_estimado_minutos?: number;
  ativo: boolean;
  total_pedidos?: number;
  created_at: string;
}

export interface RegiaoEntregaCreate {
  nome: string;
  taxa_entrega: number;
  tempo_estimado_minutos?: number;
  ativo?: boolean;
}

export interface Cliente {
  id: number;
  empresa_id: number;
  regiao_id?: number | null;
  regiao_nome?: string | null;
  regiao_taxa?: number | null;
  nome: string;
  telefone?: string | null;
  cpf_cnpj?: string | null;
  email?: string | null;
  endereco?: string | null;
  observacoes?: string | null;
  ativo: boolean;
  total_compras?: number;
  qtd_pedidos?: number;
  created_at: string;
  updated_at: string;
}

export interface ClienteCreate {
  nome: string;
  telefone?: string;
  cpf_cnpj?: string;
  email?: string;
  endereco?: string;
  regiao_id?: number | null;
  observacoes?: string;
  ativo?: boolean;
}

export interface ItemVenda {
  id: number;
  venda_id: number;
  produto_id?: number | null;
  descricao: string;
  tipo_item: TipoItem;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
  observacoes?: string | null;
}

export interface ItemVendaCreate {
  produto_id?: number | null;
  descricao: string;
  tipo_item?: TipoItem;
  quantidade: number;
  preco_unitario: number;
  subtotal?: number;
  observacoes?: string | null;
}

export interface Venda {
  id: number;
  empresa_id: number;
  cliente_id?: number | null;
  cliente_nome?: string | null;
  cliente_telefone?: string | null;
  
  // Delivery & Pedidos
  numero_pedido?: string;
  tipo_pedido: TipoPedido;
  status_pedido: StatusPedido;
  regiao_entrega_id?: number | null;
  regiao_entrega_nome?: string | null;
  taxa_entrega: number;
  motoboy_id?: number | null;
  motoboy_nome?: string | null;
  taxa_motoboy: number;
  endereco_entrega?: string | null;
  data_entrega?: string | null;

  produto_id?: number | null;
  descricao_produto: string;
  tipo_item: TipoItem | 'MISTO';
  quantidade: number;
  preco_unitario: number;
  valor_subtotal: number;
  desconto: number;
  valor_total: number;
  origem: OrigemVenda;
  forma_pagamento: FormaPagamento;
  status: 'Concluída' | 'Cancelada';
  observacoes?: string | null;
  caixa_turno_id?: number | null;
  user_id?: number | null;
  data_hora: string;
  created_at: string;
  itens: ItemVenda[];
}

export interface VendaCreate {
  cliente_id?: number | null;
  numero_pedido?: string;
  tipo_pedido?: TipoPedido;
  status_pedido?: StatusPedido;
  regiao_entrega_id?: number | null;
  taxa_entrega?: number;
  motoboy_id?: number | null;
  taxa_motoboy?: number;
  endereco_entrega?: string | null;
  origem: OrigemVenda;
  forma_pagamento: FormaPagamento;
  desconto?: number;
  observacoes?: string | null;
  data_hora?: string | null;
  itens: ItemVendaCreate[];
}

export interface RegiaoEntregaStat {
  regiao_id?: number | null;
  regiao_nome: string;
  taxa_padrao: number;
  total_entregas: number;
  total_taxas_arrecadadas: number;
  percentual_entregas: number;
}

export interface MotoboyEntregaStat {
  motoboy_id?: number | null;
  motoboy_nome: string;
  total_entregas: number;
  total_devido: number;
  total_arrecadado_cliente: number;
  saldo_empresa: number;
}

export interface RelatorioEntregasResponse {
  periodo_inicio?: string | null;
  periodo_fim?: string | null;
  total_pedidos_entrega: number;
  pedidos_entregues: number;
  pedidos_em_transito: number;
  pedidos_cancelados: number;
  total_taxas_cobradas: number;
  total_taxas_pagas_motoboy: number;
  saldo_taxas_logistica: number;
  entregas_por_regiao: RegiaoEntregaStat[];
  entregas_por_motoboy: MotoboyEntregaStat[];
}

export interface ComandaImpressao {
  venda_id: number;
  numero_pedido: string;
  comanda_texto: string;
  largura_colunas: number;
}

export interface CaixaLancamento {
  id: number;
  empresa_id: number;
  caixa_turno_id: number;
  user_id?: number | null;
  tipo: 'ENTRADA' | 'SAIDA';
  categoria: string;
  descricao: string;
  valor: number;
  data_hora: string;
}

export interface CaixaTurno {
  id: number;
  empresa_id: number;
  user_abertura_id: number;
  user_fechamento_id?: number | null;
  data_abertura: string;
  valor_inicial: number;
  data_fechamento?: string | null;
  valor_informado?: number | null;
  valor_esperado?: number | null;
  diferenca?: number | null;
  status: 'ABERTO' | 'FECHADO';
  observacoes?: string | null;
  created_at: string;
  lancamentos: CaixaLancamento[];
}

export interface CaixaStatus {
  is_aberto: boolean;
  turno_atual?: CaixaTurno | null;
  saldo_dinheiro_atual: number;
  total_entradas_dinheiro: number;
  total_saidas_dinheiro: number;
  vendas_dinheiro_no_turno: number;
}

export interface Despesa {
  id: number;
  empresa_id: number;
  data: string;
  categoria: string;
  descricao: string;
  valor: number;
  forma_pagamento: string;
  created_at: string;
}

export interface Motoboy {
  id: number;
  empresa_id: number;
  nome: string;
  telefone?: string | null;
  valor_por_entrega: number;
  ativo: boolean;
  created_at: string;
}

export interface EntregaMotoboy {
  id: number;
  empresa_id: number;
  motoboy_id: number;
  data_hora: string;
  numero_pedido: string;
  valor_entrega: number;
  status_pagamento: 'PENDENTE' | 'PAGO';
  data_pagamento?: string | null;
  observacoes?: string | null;
  created_at: string;
  motoboy_nome?: string;
}

export interface MotoboyResumoItem {
  motoboy_id: number;
  nome: string;
  telefone?: string | null;
  total_entregas: number;
  total_devido: number;
  total_pago: number;
  saldo_pendente: number;
}

export interface MotoboyRelatorio {
  resumos: MotoboyResumoItem[];
  total_geral_devido: number;
  total_geral_pago: number;
  total_geral_pendente: number;
  total_entregas_geral: number;
}

export interface LancamentoIFood {
  id: number;
  empresa_id: number;
  data: string;
  numero_pedido: string;
  valor_bruto: number;
  taxa_ifood: number;
  valor_liquido: number;
  observacoes?: string | null;
  created_at: string;
}

export interface IFoodSummary {
  total_pedidos: number;
  total_bruto: number;
  total_taxas: number;
  total_liquido: number;
  percentual_medio_taxa: number;
  lancamentos: LancamentoIFood[];
}

export interface ChartPoint {
  label: string;
  valor: number;
  quantidade: number;
}

export interface BreakdownItem {
  nome: string;
  valor: number;
  quantidade: number;
  percentual: number;
}

export interface DashboardMetrics {
  venda_dia: number;
  venda_semana: number;
  venda_mes: number;
  venda_ano: number;
  caixa_atual: number;
  qtd_vendas_mes: number;
  ticket_medio_mes: number;
  entradas_mes: number;
  saidas_mes: number;
  lucro_operacional_mes: number;
  vendas_por_dia: ChartPoint[];
  vendas_por_mes: ChartPoint[];
  pagamentos_breakdown: BreakdownItem[];
  origens_breakdown: BreakdownItem[];
  total_itens_estoque?: number;
  itens_estoque_baixo?: number;
  valor_estoque_custo?: number;
}

export interface MesMeiItem {
  mes_num: number;
  mes_nome: string;
  faturamento_produtos: number;
  faturamento_servicos: number;
  faturamento_total: number;
  qtd_vendas: number;
  ticket_medio: number;
  acumulado_ate_o_mes: number;
}

export interface CanalReceitaItem {
  canal: string;
  valor: number;
  percentual: number;
}

export interface FormaPagamentoReceitaItem {
  forma: string;
  valor: number;
  percentual: number;
}

export interface RelatorioMei {
  ano: number;
  limite_mei_anual: number;
  limite_proporcional: number;
  faturamento_acumulado_ano: number;
  faturamento_restante: number;
  percentual_utilizado: number;
  media_mensal: number;
  projecao_anual: number;
  status_enquadramento: 'SEGURO' | 'ATENCAO' | 'ALERTA' | 'EXCEDIDO_ATE_20' | 'DESENQUADRAMENTO';
  mensagem_status: string;
  meses: MesMeiItem[];
  receita_por_forma_pagamento: FormaPagamentoReceitaItem[];
  receita_por_canal: CanalReceitaItem[];
  nome_empresarial: string;
  nome_fantasia: string;
  cnpj: string;
  cpf_proprietario: string;
}

export interface EvolucaoMensalSaude {
  mes: string;
  receita: number;
  despesa: number;
  resultado: number;
  margem_percentual: number;
}

export interface InsightSaude {
  tipo: 'SUCCESS' | 'WARNING' | 'INFO' | 'DANGER';
  titulo: string;
  descricao: string;
}

export interface SaudeNegocio {
  periodo_dias: number;
  receita_total: number;
  despesas_totais: number;
  resultado_operacional: number;
  margem_lucro_percentual: number;
  ticket_medio: number;
  maior_canal_venda: string;
  valor_maior_canal: number;
  maior_forma_pagamento: string;
  valor_maior_forma: number;
  score_saude: number;
  classificacao_saude: 'EXCELENTE' | 'SAUDAVEL' | 'ATENCAO' | 'CRITICO';
  evolucao_mensal: EvolucaoMensalSaude[];
  insights: InsightSaude[];
}
