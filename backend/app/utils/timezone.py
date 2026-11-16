import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

try:
    from zoneinfo import ZoneInfo
except ImportError:
    try:
        from backports.zoneinfo import ZoneInfo
    except ImportError:
        ZoneInfo = None  # type: ignore

logger = logging.getLogger("gestor_mei.timezone")

SAO_PAULO_TZ_KEY = "America/Sao_Paulo"
BRASILIA_FALLBACK_OFFSET = timezone(timedelta(hours=-3))


def get_brasilia_timezone():
    """Retorna o fuso horário oficial de Brasília (America/Sao_Paulo) ou fallback UTC-3."""
    if ZoneInfo is not None:
        try:
            return ZoneInfo(SAO_PAULO_TZ_KEY)
        except Exception:
            pass
    return BRASILIA_FALLBACK_OFFSET


def get_brasilia_now() -> datetime:
    """
    Retorna o timestamp atual no fuso de Brasília (America/Sao_Paulo).
    """
    tz = get_brasilia_timezone()
    return datetime.now(tz)


def format_brasilia_datetime(dt: Optional[datetime], fmt: str = "%d/%m/%Y às %H:%M") -> str:
    """
    Formata um datetime para exibição em português no fuso de Brasília.
    """
    if not dt:
        return "-"
    try:
        tz = get_brasilia_timezone()
        # Se for naive (sem tzinfo), assume horário de Brasília se já gravado no backend
        if dt.tzinfo is None:
            dt_aware = dt.replace(tzinfo=tz)
        else:
            dt_aware = dt.astimezone(tz)
        return dt_aware.strftime(fmt)
    except Exception as e:
        logger.warning(f"Erro ao formatar datetime {dt}: {e}")
        return str(dt)
