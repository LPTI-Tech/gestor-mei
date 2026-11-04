import os
import json
import logging
import smtplib
import urllib.request
import urllib.error
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Tuple
from app.config import settings

logger = logging.getLogger("gestor_mei.email")


def _gerar_html_recuperacao(nome: str, link_reset: str, minutos_expira: int) -> str:
    primeiro_nome = nome.split()[0] if nome else "Empreendedor(a)"
    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recuperação de Senha - GESTOR MEI</title>
  <style>
    body {{
      margin: 0;
      padding: 0;
      background-color: #f4f6f8;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #333333;
    }}
    .container {{
      max-width: 580px;
      margin: 30px auto;
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
      border: 1px solid #e0e0e0;
    }}
    .header {{
      background: linear-gradient(135deg, #1976d2 0%, #0d47a1 100%);
      padding: 32px 24px;
      text-align: center;
      color: #ffffff;
    }}
    .logo-badge {{
      display: inline-block;
      width: 48px;
      height: 48px;
      line-height: 48px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 10px;
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 1px;
      margin-bottom: 12px;
    }}
    .header h1 {{
      margin: 0;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: 0.5px;
    }}
    .header p {{
      margin: 6px 0 0;
      font-size: 13px;
      opacity: 0.9;
    }}
    .content {{
      padding: 36px 32px;
      line-height: 1.6;
    }}
    .greeting {{
      font-size: 18px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 16px;
    }}
    .text {{
      font-size: 15px;
      color: #4b5563;
      margin-bottom: 24px;
    }}
    .btn-wrapper {{
      text-align: center;
      margin: 32px 0;
    }}
    .btn {{
      display: inline-block;
      background-color: #1976d2;
      color: #ffffff !important;
      font-weight: 700;
      font-size: 16px;
      padding: 14px 32px;
      border-radius: 8px;
      text-decoration: none;
      box-shadow: 0 4px 12px rgba(25, 118, 210, 0.35);
    }}
    .alert-box {{
      background-color: #fffbeb;
      border-left: 4px solid #f59e0b;
      padding: 12px 16px;
      border-radius: 6px;
      margin: 24px 0;
      font-size: 13px;
      color: #92400e;
    }}
    .alt-link {{
      font-size: 12px;
      color: #6b7280;
      word-break: break-all;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px dashed #e5e7eb;
    }}
    .alt-link a {{
      color: #1976d2;
    }}
    .footer {{
      background: #f9fafb;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #9ca3af;
      border-top: 1px solid #e5e7eb;
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-badge">MEI</div>
      <h1>GESTOR MEI</h1>
      <p>Gestão simples, ágil e profissional para seu negócio</p>
    </div>
    <div class="content">
      <div class="greeting">Olá, {primeiro_nome}!</div>
      <p class="text">
        Recebemos uma solicitação para redefinir a senha da sua conta no <b>GESTOR MEI</b>.
      </p>
      
      <div class="btn-wrapper">
        <a href="{link_reset}" target="_blank" class="btn">Redefinir Minha Senha</a>
      </div>

      <div class="alert-box">
        ⏱️ <b>Importante:</b> Este link é de uso único e expira automaticamente em <b>{minutos_expira} minutos</b>.
      </div>

      <p class="text" style="font-size: 13px; color: #6b7280;">
        Se você não fez essa solicitação, nenhuma ação é necessária. Sua senha atual continuará segura e inalterada.
      </p>

      <div class="alt-link">
        Se o botão acima não funcionar, copie e cole o endereço abaixo no seu navegador:<br>
        <a href="{link_reset}">{link_reset}</a>
      </div>
    </div>
    <div class="footer">
      &copy; GESTOR MEI — Sistema Especializado para Microempreendedores Individuais.<br>
      Este é um e-mail automático do sistema. Por favor, não responda.
    </div>
  </div>
</body>
</html>"""


def _enviar_via_resend(email_destinatario: str, assunto: str, html_content: str) -> Tuple[bool, str]:
    """Envia e-mail utilizando a API REST oficial do Resend."""
    url = "https://api.resend.com/emails"
    headers = {
        "Authorization": f"Bearer {settings.RESEND_API_KEY}",
        "Content-Type": "application/json",
        "User-Agent": "GestorMEI/1.4.0"
    }
    payload = {
        "from": settings.EMAIL_FROM,
        "to": [email_destinatario],
        "subject": assunto,
        "html": html_content
    }

    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=10) as response:
            res_body = response.read().decode("utf-8")
            logger.info("E-mail enviado via Resend com sucesso para %s. Resposta: %s", email_destinatario, res_body)
            return True, "Enviado via Resend com sucesso"
    except urllib.error.HTTPError as e:
        error_detail = e.read().decode("utf-8")
        logger.error("Erro HTTP ao enviar via Resend: %d - %s", e.code, error_detail)
        return False, f"Resend HTTP {e.code}: {error_detail}"
    except Exception as e:
        logger.error("Falha de conexão com a API Resend: %s", str(e))
        return False, f"Resend exception: {str(e)}"


def _enviar_via_smtp(email_destinatario: str, assunto: str, html_content: str) -> Tuple[bool, str]:
    """Fallback: Envia e-mail utilizando conexão SMTP padrão (TLS/STARTTLS)."""
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = assunto
        msg["From"] = settings.EMAIL_FROM
        msg["To"] = email_destinatario

        part = MIMEText(html_content, "html", "utf-8")
        msg.attach(part)

        if settings.SMTP_PORT == 465:
            server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
        else:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
            if settings.SMTP_TLS:
                server.starttls()

        if settings.SMTP_USER and settings.SMTP_PASSWORD:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)

        server.sendmail(settings.EMAIL_FROM, [email_destinatario], msg.as_string())
        server.quit()
        logger.info("E-mail enviado com sucesso via SMTP para %s", email_destinatario)
        return True, "Enviado via SMTP com sucesso"
    except Exception as e:
        logger.error("Falha ao enviar e-mail via SMTP: %s", str(e))
        return False, f"SMTP error: {str(e)}"


def enviar_email_recuperacao(
    email_destinatario: str,
    nome_usuario: str,
    token_plano: str
) -> Tuple[bool, str]:
    """
    Coordena o envio do e-mail de recuperação de senha:
    1. Tenta Resend (se RESEND_API_KEY configurada)
    2. Tenta SMTP Fallback (se SMTP_HOST configurado)
    3. Simula em console/log se nenhuma credencial estiver presente (ambiente de testes/dev local)
    """
    link_reset = f"{settings.FRONTEND_URL.rstrip('/')}/redefinir-senha?token={token_plano}"
    assunto = "Redefinição de Senha — GESTOR MEI"
    html_content = _gerar_html_recuperacao(
        nome=nome_usuario,
        link_reset=link_reset,
        minutos_expira=settings.PASSWORD_RESET_EXPIRE_MINUTES
    )

    # 1. Resend (Produção)
    if settings.RESEND_API_KEY and settings.RESEND_API_KEY.strip():
        ok, msg = _enviar_via_resend(email_destinatario, assunto, html_content)
        if ok:
            return True, msg
        logger.warning("Falha no Resend, tentando SMTP fallback...")

    # 2. SMTP (Fallback)
    if settings.SMTP_HOST and settings.SMTP_HOST.strip():
        ok, msg = _enviar_via_smtp(email_destinatario, assunto, html_content)
        if ok:
            return True, msg

    # 3. Fallback de Desenvolvimento / Console
    print("\n" + "="*80)
    print(f" [EMAIL SIMULATOR - DEV] RECUPERAÇÃO DE SENHA")
    print(f" Destinatário: {nome_usuario} <{email_destinatario}>")
    print(f" Link Seguro:  {link_reset}")
    print(f" Validade:     {settings.PASSWORD_RESET_EXPIRE_MINUTES} minutos")
    print("="*80 + "\n")

    return True, "Simulado localmente via console logger (modo dev/teste)"

