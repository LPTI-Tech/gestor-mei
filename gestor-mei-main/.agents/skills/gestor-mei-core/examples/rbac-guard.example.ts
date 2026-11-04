/**
 * Exemplo de Guarda de RBAC Oficial — Gestor MEI (LPTI Tech)
 * 
 * Regras Inegociáveis Implementadas:
 * 1. MASTER: Acesso total à plataforma e gestão de empresas.
 * 2. OWNER: Gestão total da sua empresa e criação de OPERATOR.
 * 3. CONSULTOR: Auditoria fiscal e contábil das empresas vinculadas.
 * 4. OPERATOR: Frente de caixa e pedidos. PROIBIDO de visualizar financeiro.
 */

export type UserRole = 'MASTER' | 'OWNER' | 'CONSULTOR' | 'OPERATOR';

export interface UserSession {
  id: number;
  nome: string;
  email: string;
  role: UserRole;
  empresa_id: number;
  ativo: boolean;
}

export class RbacGuard {
  static canManageCompanies(user?: UserSession | null): boolean {
    return user?.role === 'MASTER';
  }

  static canCreateOwner(user?: UserSession | null): boolean {
    return user?.role === 'MASTER';
  }

  static canCreateOperator(user?: UserSession | null): boolean {
    return user?.role === 'MASTER' || user?.role === 'OWNER';
  }

  static canAccessFinancial(user?: UserSession | null): boolean {
    if (!user) return false;
    // REGRA INEGOCIÁVEL: OPERATOR não visualiza financeiro
    if (user.role === 'OPERATOR') return false;
    return ['MASTER', 'OWNER', 'CONSULTOR'].includes(user.role);
  }

  static canAccessConsultantPanel(user?: UserSession | null): boolean {
    return user?.role === 'MASTER' || user?.role === 'CONSULTOR';
  }

  static canExecuteSale(user?: UserSession | null): boolean {
    // Vendas podem ser feitas por OWNER e OPERATOR
    return user?.role === 'MASTER' || user?.role === 'OWNER' || user?.role === 'OPERATOR';
  }
}
