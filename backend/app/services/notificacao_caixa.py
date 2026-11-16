import json
import logging
import smtplib
import urllib.request
import urllib.error
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional, Tuple
from sqlalchemy.orm import Session

from app.config import settings
from app.database import SessionLocal
from app.models.caixa import CaixaTurno
from app.models.empresa import Empresa
from app.models.user import User, UserRole
from app.utils.timezone import format_brasilia_datetime

logger = logging.getLogger("gestor_mei.notificacao_caixa")


def _formatar_moeda(valor: Optional[float]) -> str:
    val = valor or 0.0
    return f"R$ {val:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def _gerar_texto_plano(turno: CaixaTurno, empresa: Empresa, nome_operador: str) -> str:
    """Gera texto limpo sem emojis com bytes problemáticos para envio seguro via WhatsApp."""
    diff = turno.diferenca or 0.0
    if diff == 0:
        status_diff = "[OK] Caixa Batido (100% Exato)"
    elif diff > 0:
        status_diff = f"[!] Sobra de Caixa (+{_formatar_moeda(diff)})"
    else:
        status_diff = f"[ALERTA] Quebra de Caixa ({_formatar_moeda(diff)})"

    abertura_str = format_brasilia_datetime(turno.data_abertura)
    fechamento_str = format_brasilia_datetime(turno.data_fechamento)
    empresa_nome = empresa.nome_fantasia or empresa.nome_empresarial or "Gestor MEI"

    linhas = [
        "========================================",
        "[COMPROVANTE DE FECHAMENTO DE CAIXA]",
        "========================================",
        f"Empresa: {empresa_nome}",
        f"Operador Responsavel: {nome_operador}",
        f"Periodo: {abertura_str} ate {fechamento_str}",
        "----------------------------------------",
        f"Fundo Inicial: {_formatar_moeda(turno.valor_inicial)}",
        f"Vendas em Dinheiro: {_formatar_moeda(turno.vendas_dinheiro)}",
        f"Suprimentos (Entradas): {_formatar_moeda(turno.total_entradas)}",
        f"Sangrias (Saidas): {_formatar_moeda(turno.total_saidas)}",
        "----------------------------------------",
        f"Saldo Esperado: {_formatar_moeda(turno.valor_esperado)}",
        f"Valor Contado na Gaveta: {_formatar_moeda(turno.valor_informado)}",
        f"Diferenca Apurada: {status_diff}",
        "----------------------------------------",
    ]

    if turno.observacoes:
        linhas.append(f"Observacoes: {turno.observacoes.strip()}")
        linhas.append("----------------------------------------")

    linhas.append("Gestor MEI - Sistema de Gestao Financeira")
    return "\n".join(linhas)


def _gerar_html_email(turno: CaixaTurno, empresa: Empresa, nome_operador: str) -> str:
    diff = turno.diferenca or 0.0
    if diff == 0:
        diff_cor = "#059669"
        diff_bg = "#ecfdf5"
        diff_status = "Caixa Batido (100% Exato)"
    elif diff > 0:
        diff_cor = "#d97706"
        diff_bg = "#fffbeb"
        diff_status = f"Sobra de Caixa (+{_formatar_moeda(diff)})"
    else:
        diff_cor = "#dc2626"
        diff_bg = "#fef2f2"
        diff_status = f"Quebra de Caixa ({_formatar_moeda(diff)})"

    abertura_str = format_brasilia_datetime(turno.data_abertura)
    fechamento_str = format_brasilia_datetime(turno.data_fechamento)
    empresa_nome = empresa.nome_fantasia or empresa.nome_empresarial or "Gestor MEI"

    obs_bloco = ""
    if turno.observacoes:
        obs_bloco = f"""
        <div style="margin-top: 20px; padding: 14px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #64748b;">
          <strong style="color: #475569; font-size: 13px;">Observações registradas:</strong>
          <p style="margin: 6px 0 0; color: #1e293b; font-size: 14px; white-space: pre-wrap;">{turno.observacoes}</p>
        </div>
        """

    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Fechamento de Caixa — {empresa_nome}</title>
</head>
<body style="margin:0; padding:0; background-color:#f1f5f9; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9; padding: 24px 0;">
    <tr>
      <td align="center">
        <table width="560" border="0" cellspacing="0" cellpadding="0" style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 14px rgba(0,0,0,0.06); border:1px solid #e2e8f0;">
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%); padding: 28px 24px; text-align: center; color: #ffffff;">
              <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; opacity: 0.85; margin-bottom: 4px;">Auditoria Operacional</div>
              <h1 style="margin:0; font-size: 20px; font-weight: 800;">Relatório de Fechamento de Caixa</h1>
              <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.9;">{empresa_nome}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px;">
              <div style="margin-bottom: 20px; font-size: 14px; color: #475569;">
                <strong>Operador:</strong> {nome_operador}<br>
                <strong>Período:</strong> {abertura_str} até {fechamento_str}
              </div>

              <!-- Tabela de Conciliação Cega -->
              <table width="100%" border="0" cellspacing="0" cellpadding="10" style="border-collapse:collapse; font-size: 14px; margin-bottom: 16px;">
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="color: #64748b;">Fundo Inicial (Troco):</td>
                  <td align="right" style="font-weight: 600; color: #1e293b;">{_formatar_moeda(turno.valor_inicial)}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="color: #64748b;">Vendas em Dinheiro (PDV):</td>
                  <td align="right" style="font-weight: 600; color: #1e293b;">{_formatar_moeda(turno.vendas_dinheiro)}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="color: #64748b;">Suprimentos / Entradas Extras:</td>
                  <td align="right" style="font-weight: 600; color: #059669;">+{_formatar_moeda(turno.total_entradas)}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="color: #64748b;">Sangrias / Saídas Registradas:</td>
                  <td align="right" style="font-weight: 600; color: #dc2626;">-{_formatar_moeda(turno.total_saidas)}</td>
                </tr>
                <tr style="border-top: 2px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; background: #fafafa;">
                  <td style="font-weight: 700; color: #1e293b;">Saldo Esperado em Caixa:</td>
                  <td align="right" style="font-weight: 800; font-size: 15px; color: #1e293b;">{_formatar_moeda(turno.valor_esperado)}</td>
                </tr>
                <tr style="border-bottom: 2px solid #e2e8f0; background: #fafafa;">
                  <td style="font-weight: 700; color: #1e293b;">Valor Contado Fisicamente:</td>
                  <td align="right" style="font-weight: 800; font-size: 15px; color: #1e293b;">{_formatar_moeda(turno.valor_informado)}</td>
                </tr>
              </table>

              <!-- Badge de Diferença / Quebra -->
              <div style="background:{diff_bg}; border: 1px solid {diff_cor}; border-radius: 8px; padding: 14px; text-align: center; margin-top: 16px;">
                <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color:{diff_cor};">Resultado da Conciliação</div>
                <div style="font-size: 18px; font-weight: 800; color:{diff_cor}; margin-top: 4px;">{diff_status}</div>
              </div>

              {obs_bloco}
            </td>
          </tr>
          <tr>
            <td style="background:#f8fafc; padding: 16px 24px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8;">
              Gestor MEI &bull; Sistema de Gestão Financeira Especializado &bull; Notificação Automática de Fechamento
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def _enviar_email_resend(destinatario: str, assunto: str, html_content: str) -> Tuple[bool, str]:
    url = "https://api.resend.com/emails"
    headers = {
        "Authorization": f"Bearer {settings.RESEND_API_KEY}",
        "Content-Type": "application/json",
        "User-Agent": "GestorMEI/1.4.0",
    }
    payload = {
        "from": settings.EMAIL_FROM,
        "to": [destinatario],
        "subject": assunto,
        "html": html_content,
    }
    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=10) as response:
            return True, "Enviado com sucesso via Resend"
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8")
        logger.error(f"Erro ao enviar via Resend: HTTP {e.code} - {err}")
        return False, f"Resend HTTP {e.code}: {err}"
    except Exception as e:
        logger.error(f"Falha de conexão com Resend: {e}")
        return False, str(e)


def _enviar_email_smtp(destinatario: str, assunto: str, html_content: str) -> Tuple[bool, str]:
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = assunto
        msg["From"] = settings.EMAIL_FROM
        msg["To"] = destinatario
        msg.attach(MIMEText(html_content, "html", "utf-8"))

        if settings.SMTP_PORT == 465:
            server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
        else:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
            if settings.SMTP_TLS:
                server.starttls()

        if settings.SMTP_USER and settings.SMTP_PASSWORD:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)

        server.sendmail(settings.EMAIL_FROM, [destinatario], msg.as_string())
        server.quit()
        logger.info(f"E-mail de fechamento enviado via SMTP com sucesso para {destinatario}")
        return True, "Enviado com sucesso via SMTP"
    except Exception as e:
        logger.error(f"Falha ao enviar e-mail de fechamento via SMTP: {e}")
        return False, str(e)


def _enviar_whatsapp(telefone: str, mensagem: str) -> Tuple[bool, str]:
    """Envia notificação via Webhook/API do WhatsApp (compatível com Evolution API e Z-API)."""
    if not settings.WHATSAPP_API_URL or not settings.WHATSAPP_API_URL.strip():
        return False, "WHATSAPP_API_URL não configurada"

    url = settings.WHATSAPP_API_URL.strip()
    token = (settings.WHATSAPP_API_TOKEN or "").strip()

    # Normaliza número para formato E.164 sem caracteres especiais
    digits = "".join(filter(str.isdigit, str(telefone)))
    if not digits:
        return False, "Telefone inválido ou ausente"
    if len(digits) in (10, 11) and not digits.startswith("55"):
        digits = f"55{digits}"

    # Payload universal aceito por Evolution API e Z-API
    payload = {
        "number": digits,
        "phone": digits,
        "text": mensagem,
        "message": mensagem,
        "textMessage": {"text": mensagem},
    }

    headers = {
        "Content-Type": "application/json",
        "User-Agent": "GestorMEI/1.4.0",
    }
    if token:
        headers["apikey"] = token
        headers["Authorization"] = f"Bearer {token}"
        headers["Client-Token"] = token

    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=10) as response:
            res_body = response.read().decode("utf-8")
            logger.info(f"WhatsApp enviado com sucesso para {digits}. Resposta: {res_body[:200]}")
            return True, "Enviado com sucesso via WhatsApp API"
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8")
        logger.error(f"Erro HTTP WhatsApp ({url}): {e.code} - {err}")
        return False, f"WhatsApp HTTP {e.code}: {err}"
    except Exception as e:
        logger.error(f"Falha de conexão com WhatsApp API: {e}")
        return False, str(e)


def processar_notificacoes_fechamento_background(turno_id: int, empresa_id: int):
    """
    Função executada de forma assíncrona/silenciosa via BackgroundTasks do FastAPI
    após o fechamento do turno no banco de dados.
    """
    logger.info(f"Iniciando despacho de notificações de fechamento para turno={turno_id}, empresa={empresa_id}")
    
    with SessionLocal() as db:
        turno = db.query(CaixaTurno).filter(
            CaixaTurno.id == turno_id,
            CaixaTurno.empresa_id == empresa_id
        ).first()

        if not turno:
            logger.warning(f"Turno {turno_id} não encontrado para envio de notificação.")
            return

        empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
        if not empresa:
            logger.warning(f"Empresa {empresa_id} não encontrada para envio de notificação.")
            return

        # Localiza o usuário titular (Owner) da empresa
        owner = db.query(User).filter(
            User.empresa_id == empresa_id,
            User.role.in_([UserRole.OWNER, "OWNER", "ADMIN"]),
            User.ativo == True
        ).first()

        destinatario_email = (owner.email if owner else None) or empresa.email
        destinatario_telefone = empresa.telefone

        nome_operador = turno.user_fechamento_nome or turno.user_abertura_nome or "Operador de Caixa"

        # 1. Envio de E-mail
        if destinatario_email:
            assunto = f"Fechamento de Caixa Realizado — {empresa.nome_fantasia or empresa.nome_empresarial}"
            html_content = _gerar_html_email(turno, empresa, nome_operador)

            enviado = False
            msg_res = ""
            if settings.RESEND_API_KEY and settings.RESEND_API_KEY.strip():
                enviado, msg_res = _enviar_email_resend(destinatario_email, assunto, html_content)
            elif settings.SMTP_HOST and settings.SMTP_HOST.strip():
                enviado, msg_res = _enviar_email_smtp(destinatario_email, assunto, html_content)
            else:
                logger.info(
                    f"[SIMULACAO EMAIL] Fechamento turno={turno.id} para {destinatario_email}. "
                    "Nenhuma credencial RESEND/SMTP ativa."
                )
                enviado = True

            if enviado:
                logger.info(f"Notificação de e-mail despachada com sucesso para {destinatario_email}")
            else:
                logger.warning(f"Falha ao despachar e-mail para {destinatario_email}: {msg_res}")

        # 2. Envio de WhatsApp silencioso via Webhook/API
        if destinatario_telefone and settings.WHATSAPP_API_URL:
            texto_zap = _gerar_texto_plano(turno, empresa, nome_operador)
            ok_zap, msg_zap = _enviar_whatsapp(destinatario_telefone, texto_zap)
            if ok_zap:
                logger.info(f"Notificação de WhatsApp despachada com sucesso para {destinatario_telefone}")
            else:
                logger.warning(f"Falha ao despachar WhatsApp para {destinatario_telefone}: {msg_zap}")
        elif not settings.WHATSAPP_API_URL:
            logger.debug("WHATSAPP_API_URL não configurada; disparo silencioso de WhatsApp ignorado.")
