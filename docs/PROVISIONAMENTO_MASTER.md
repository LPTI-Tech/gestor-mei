# 🛡️ Guia Oficial de Provisionamento Seguro do Usuário MASTER

**Gestor MEI — LPTI Tech**  
**Marco de Segurança:** Sprint Security 1 — Fase 1  
**Versão Homologada:** `1.4.0` (Security Hardened)

---

## 1. Contexto & Política de Segurança

Antes da **Sprint Security 1**, o sistema inicializava bancos de dados vazios criando automaticamente usuários com senhas pré-definidas públicas (`admin123`, `operador123`, `master123`).

Em conformidade com as diretrizes de segurança da LPTI Tech e OWASP:
- **Senhas padrão estão terminantemente proibidas em produção.**
- O seed automático de contas e senhas foi desativado para ambientes que não sejam expressamente de desenvolvimento.
- O primeiro usuário **MASTER** deve ser provisionado através do utilitário oficial de linha de comando com validação de senha forte.

---

## 2. Comportamento do Sistema por Ambiente

O comportamento do sistema é governado pelas variáveis de ambiente configuradas no arquivo `.env` ou nas variáveis do provedor de nuvem (Render, Docker, VPS):

| Variável | Valores Aceitos | Comportamento do Seed |
| :--- | :--- | :--- |
| `ENVIRONMENT` | `development` *(padrão local)* | O seed automático é **habilitado**. Cria a empresa demo e dados de teste caso o banco esteja vazio. |
| `ENVIRONMENT` | `production` | O seed automático é **bloqueado**. Nenhuma conta ou senha padrão é criada. Se o banco estiver vazio, um alerta de segurança é exibido nos logs. |
| `SEED_DATABASE` | `true` ou `false` *(padrão: false)* | Flag de sobreposição. Se definida como `true`, permite a execução do seed mesmo em ambientes com `ENVIRONMENT=production` (recomendado apenas para homologação/staging). |

### ⚠️ Mensagem Exibida em Produção com Banco Vazio
Se a aplicação iniciar em produção com o banco de dados desprovido de usuários, o seguinte alerta estruturado será gravado nos logs:

```text
================================================================================
[SEGURANÇA - PRODUÇÃO] BANCO DE DADOS VAZIO DETECTADO!
Ambiente ativo: 'PRODUCTION'.
A criação automática de usuários e senhas padrão (admin123/operador123) foi BLOQUEADA.
Nenhum usuário ou senha padrão foi inserido no banco.
Para provisionar o primeiro usuário MASTER de forma segura, execute:
  python -m app.scripts.provision_master --email <email> --nome <nome> --password <senha>
ou interativamente no terminal:
  python -m app.scripts.provision_master
Consulte a documentação oficial em: docs/PROVISIONAMENTO_MASTER.md
================================================================================
```

---

## 3. Como Provisionar o Usuário MASTER

O provisionamento seguro é realizado via script Python administrativo localizado em `backend/app/scripts/provision_master.py`.

### Opção A: Provisionamento Interativo (Recomendado)

Abra o terminal na pasta `backend` (ou use o script PowerShell `scripts/provision_master.ps1` na raiz) e execute:

```bash
# No diretório backend com o ambiente virtual ativo:
python -m app.scripts.provision_master
```

Ou no Windows PowerShell na raiz do projeto:
```powershell
.\scripts\provision_master.ps1
```

O script solicitará interativamente:
1. **E-mail corporativo** do usuário MASTER (ex: `admin@minhaempresa.com.br`).
2. **Nome completo** do administrador.
3. **Senha segura** (com digitação oculta e confirmação).

---

### Opção B: Provisionamento Não-Interativo (Deploy Automatizado / CI/CD / Render)

Para pipelines automatizados, scripts de deploy ou containers Docker, passe os parâmetros diretamente via argumentos de linha de comando:

```bash
python -m app.scripts.provision_master \
  --email "master@minhaempresa.com.br" \
  --nome "Diretoria LPTI Tech" \
  --password "SenhaForte#Complexa2026!" \
  --forcar
```

Ou através de variáveis de ambiente:
```bash
export MASTER_EMAIL="master@minhaempresa.com.br"
export MASTER_NAME="Diretoria LPTI Tech"
export MASTER_PASSWORD="SenhaForte#Complexa2026!"

python -m app.scripts.provision_master --forcar
```

> [!TIP]
> A flag `--forcar` permite atualizar a senha de um usuário existente sem solicitar confirmação manual no terminal, ideal para scripts não-interativos.

---

## 4. Requisitos e Regras de Validação de Senha

O utilitário de provisionamento aplica regras rígidas de segurança antes de gravar o hash no banco:

1. **Comprimento Mínimo:** A senha deve conter pelo menos **8 caracteres** (recomendado: 12+ com letras maiúsculas, minúsculas, números e caracteres especiais).
2. **Rejeição de Senhas Conhecidas:** O utilitário rejeita explicitamente senhas comuns ou públicas do ecossistema, incluindo:
   - `admin123`
   - `operador123`
   - `master123`
   - `12345678`
   - `password`
   - `gestormei`
3. **Criptografia:** A senha é convertida em hash seguro utilizando **bcrypt** com salt aleatório (`bcrypt.gensalt()`) e trunca adequadamente em 72 bytes.

---

## 5. Fluxo de Operação Pós-Provisionamento

1. **Acesso:** Faça login na plataforma com o e-mail e senha cadastrados via frontend (`http://localhost:5173` ou URL de produção).
2. **Contexto MASTER:** O usuário MASTER possui `empresa_id = None`, o que confere visão global administrativa da plataforma.
3. **Criação de Empresas:** Pelo endpoint `POST /api/empresas`, o MASTER cadastra as empresas clientes.
4. **Criação de Proprietários:** Pelo endpoint `POST /api/users`, o MASTER vincula o usuário com papel `OWNER` à respectiva empresa.
5. **Autonomia do OWNER:** O `OWNER` gerencia sua própria equipe e cadastra operadores (`OPERATOR`).
