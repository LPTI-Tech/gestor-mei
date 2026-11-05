"""
Script de Provisionamento Seguro do Usuário MASTER — GESTOR MEI (LPTI Tech)
Sprint Security 1 - Fase 1

Permite criar ou redefinir o acesso do administrador MASTER global da plataforma
em ambientes de produção ou desenvolvimento, exigindo senhas fortes e evitando
o uso de credenciais padrão públicas.

Uso Interativo:
    python -m app.scripts.provision_master

Uso Não-Interativo (CI/CD ou deploy automatizado):
    python -m app.scripts.provision_master --email "admin@meudominio.com.br" --nome "Admin MASTER" --password "SuaSenhaForte#2026"
    ou definindo as variáveis de ambiente:
    MASTER_EMAIL, MASTER_NAME, MASTER_PASSWORD
"""

import sys
import os
import argparse
import getpass
from datetime import datetime
from typing import Optional

# Garante compatibilidade de saída UTF-8 no Windows PowerShell/CMD
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Garante que o root do backend esteja no sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.database import SessionLocal, Base, engine
from app.models.user import User, UserRole
from app.models.empresa import Empresa
from app.security import hash_password


SENHAS_PROIBIDAS = {
    "admin123",
    "operador123",
    "master123",
    "12345678",
    "password",
    "gestormei",
    "gestor123",
    "mudar123",
}


def validar_senha(senha: str) -> Optional[str]:
    """Valida requisitos mínimos de segurança para senha do MASTER."""
    if len(senha) < 8:
        return "A senha deve conter no mínimo 8 caracteres."
    if senha.lower() in SENHAS_PROIBIDAS:
        return "Esta senha é de conhecimento público ou muito comum. Escolha uma senha segura exclusiva."
    return None


def provisionar_master(email: str, nome: str, senha: str, forcar: bool = False) -> bool:
    """Cria ou atualiza o usuário MASTER no banco de dados."""
    email_clean = email.strip().lower()
    nome_clean = nome.strip()

    if not email_clean or "@" not in email_clean:
        print("[ERRO] E-mail inválido fornecido.")
        return False

    erro_senha = validar_senha(senha)
    if erro_senha:
        print(f"[ERRO DE SEGURANÇA] {erro_senha}")
        return False

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        usuario_existente = db.query(User).filter(User.email == email_clean).first()

        if usuario_existente:
            if not forcar:
                print(f"[AVISO] Já existe um usuário cadastrado com o e-mail '{email_clean}' (Papel: {usuario_existente.role.value}).")
                confirm = input("Deseja redefinir a senha e elevar para o papel MASTER? (s/N): ").strip().lower()
                if confirm not in ("s", "sim", "y", "yes"):
                    print("[ABORTADO] Nenhuma alteração foi realizada.")
                    return False

            usuario_existente.nome = nome_clean
            usuario_existente.hashed_password = hash_password(senha)
            usuario_existente.role = UserRole.MASTER
            usuario_existente.ativo = True
            usuario_existente.ultimo_acesso = datetime.utcnow()
            db.commit()

            print("=" * 70)
            print("[SUCESSO] Usuário MASTER atualizado com sucesso!")
            print(f"   ID: {usuario_existente.id}")
            print(f"   Nome: {usuario_existente.nome}")
            print(f"   E-mail: {usuario_existente.email}")
            print(f"   Papel: {usuario_existente.role.value}")
            print(f"   Status: Ativo")
            print("=" * 70)
            return True

        try:
            novo_master = User(
                empresa_id=None,
                nome=nome_clean,
                email=email_clean,
                hashed_password=hash_password(senha),
                role=UserRole.MASTER,
                ativo=True,
                ultimo_acesso=datetime.utcnow(),
            )
            db.add(novo_master)
            db.commit()
            db.refresh(novo_master)
        except Exception:
            db.rollback()
            # Fallback para bases legadas SQLite onde empresa_id possui restrição NOT NULL
            empresa_primeira = db.query(Empresa).first()
            primeira_empresa_id = empresa_primeira.id if empresa_primeira else 1
            novo_master = User(
                empresa_id=primeira_empresa_id,
                nome=nome_clean,
                email=email_clean,
                hashed_password=hash_password(senha),
                role=UserRole.MASTER,
                ativo=True,
                ultimo_acesso=datetime.utcnow(),
            )
            db.add(novo_master)
            db.commit()
            db.refresh(novo_master)

        print("=" * 70)
        print("[SUCESSO] Primeiro usuário MASTER provisionado com sucesso!")
        print(f"   ID: {novo_master.id}")
        print(f"   Nome: {novo_master.nome}")
        print(f"   E-mail: {novo_master.email}")
        print(f"   Papel: {novo_master.role.value}")
        print(f"   Status: Ativo")
        print("=" * 70)
        return True

    except Exception as e:
        db.rollback()
        print(f"[ERRO CRÍTICO] Falha ao provisionar usuário MASTER: {e}")
        return False
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="Provisionamento seguro do usuário MASTER do Gestor MEI.")
    parser.add_argument("--email", type=str, help="E-mail corporativo do usuário MASTER", default=os.getenv("MASTER_EMAIL"))
    parser.add_argument("--nome", type=str, help="Nome completo do administrador", default=os.getenv("MASTER_NAME"))
    parser.add_argument("--password", type=str, help="Senha segura (opcional, será solicitada se omitida)", default=os.getenv("MASTER_PASSWORD"))
    parser.add_argument("--forcar", action="store_true", help="Sobrescrever senha sem confirmação interativa")

    args = parser.parse_args()

    print("\n" + "=" * 70)
    print("[SEGURANCA] GESTOR MEI - PROVISIONAMENTO SEGURO DE USUARIO MASTER (LPTI TECH)")
    print("=" * 70 + "\n")

    email = args.email
    if not email:
        try:
            email = input("Digite o e-mail do usuário MASTER: ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\nOperação cancelada.")
            sys.exit(1)

    nome = args.nome
    if not nome:
        try:
            nome_input = input("Digite o nome completo (Padrão: Administrador MASTER): ").strip()
            nome = nome_input if nome_input else "Administrador MASTER"
        except (KeyboardInterrupt, EOFError):
            print("\nOperação cancelada.")
            sys.exit(1)

    senha = args.password
    if not senha:
        try:
            senha = getpass.getpass("Digite a senha do usuário MASTER (mínimo 8 caracteres): ")
            senha_confirm = getpass.getpass("Confirme a senha: ")
            if senha != senha_confirm:
                print("[ERRO] As senhas digitadas não coincidem.")
                sys.exit(1)
        except (KeyboardInterrupt, EOFError):
            print("\nOperação cancelada.")
            sys.exit(1)

    sucesso = provisionar_master(email=email, nome=nome, senha=senha, forcar=args.forcar)
    if not sucesso:
        sys.exit(1)


if __name__ == "__main__":
    main()
