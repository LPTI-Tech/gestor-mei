import os
import uuid
from typing import Tuple, Set, Optional
from fastapi import UploadFile, HTTPException, status

MAX_COMPROVANTE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
MAX_XML_SIZE_BYTES = 5 * 1024 * 1024            # 5 MB

ALLOWED_COMPROVANTE_EXTENSIONS: Set[str] = {".pdf", ".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_XML_EXTENSIONS: Set[str] = {".xml"}

# Assinaturas binárias (Magic Bytes)
MAGIC_PDF = b"%PDF-"
MAGIC_JPEG = b"\xff\xd8\xff"
MAGIC_PNG = b"\x89PNG\r\n\x1a\n"
MAGIC_WEBP_RIFF = b"RIFF"
MAGIC_WEBP_TAG = b"WEBP"


def validate_magic_bytes_comprovante(content: bytes, ext: str) -> None:
    """
    Verifica a assinatura binária real do arquivo (Magic Bytes) de acordo com a extensão.
    Impede ataques de upload de arquivos executáveis disfarçados de imagem ou PDF.
    """
    if len(content) < 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Arquivo corrompido ou incompleto."
        )

    ext = ext.lower()
    if ext == ".pdf":
        if not content.startswith(MAGIC_PDF):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assinatura inválida: o arquivo não é um documento PDF autêntico."
            )
    elif ext in (".jpg", ".jpeg"):
        if not content.startswith(MAGIC_JPEG):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assinatura inválida: o arquivo não é uma imagem JPEG autêntica."
            )
    elif ext == ".png":
        if not content.startswith(MAGIC_PNG):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assinatura inválida: o arquivo não é uma imagem PNG autêntica."
            )
    elif ext == ".webp":
        if not (content.startswith(MAGIC_WEBP_RIFF) and content[8:12] == MAGIC_WEBP_TAG):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assinatura inválida: o arquivo não é uma imagem WEBP autêntica."
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Extensão '{ext}' não suportada."
        )


def validate_magic_bytes_xml(content: bytes) -> None:
    """
    Valida a integridade do XML de NF-e, verificando:
    1. Assinatura/Magic bytes de abertura (<?xml ou <);
    2. Bloqueio estrito de expansão de entidades DTD externas (prevenção contra XML Bomb / Billion Laughs / XXE).
    """
    if len(content) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Arquivo XML vazio ou corrompido."
        )

    # Remove BOM e espaços iniciais
    trimmed = content.lstrip(b"\xef\xbb\xbf \t\r\n")
    if not (trimmed.startswith(b"<?xml") or trimmed.startswith(b"<")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O arquivo não possui formato de documento XML válido."
        )

    # Detecção preventiva de ataques XXE / XML Bomb (<!ENTITY ou <!DOCTYPE maliciosos)
    lower_sample = trimmed[:2048].lower()
    if b"<!entity" in lower_sample or b"system" in lower_sample and b"<!doctype" in lower_sample:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="XML rejeitado: definições de entidades DTD externas não são permitidas por motivos de segurança."
        )


def read_file_sync_with_size_limit(file: UploadFile, max_bytes: int) -> bytes:
    """
    Lê o fluxo síncrono do arquivo em chunks de 64 KB com teto máximo de bytes,
    prevenindo exaustão de memória em endpoints síncronos e testes unitários diretos.
    """
    chunk_size = 64 * 1024
    total_bytes = 0
    chunks = []

    stream = file.file if hasattr(file, "file") else file
    while True:
        chunk = stream.read(chunk_size)
        if not chunk:
            break
        total_bytes += len(chunk)
        if total_bytes > max_bytes:
            max_mb = max_bytes // (1024 * 1024)
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Tamanho do arquivo excede o limite máximo permitido de {max_mb} MB."
            )
        chunks.append(chunk)

    return b"".join(chunks)


async def read_file_with_size_limit(file: UploadFile, max_bytes: int) -> bytes:
    """
    Lê o fluxo do arquivo em blocos (chunks) de 64 KB, acumulando e abortando
    imediatamente caso ultrapasse o limite configurado, prevenindo ataques DoS de memória RAM.
    """
    chunk_size = 64 * 1024  # 64 KB
    total_bytes = 0
    chunks = []

    while True:
        chunk = await file.read(chunk_size)
        if not chunk:
            break
        total_bytes += len(chunk)
        if total_bytes > max_bytes:
            max_mb = max_bytes // (1024 * 1024)
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Tamanho do arquivo excede o limite máximo permitido de {max_mb} MB."
            )
        chunks.append(chunk)

    return b"".join(chunks)


def generate_secure_comprovante_filename(empresa_id: int, original_filename: str) -> Tuple[str, str]:
    """
    Sanitiza e gera nome seguro e não previsível baseado em UUIDv4 por empresa.
    Retorna (safe_filename, ext_limpa).
    """
    ext = os.path.splitext(original_filename)[1].lower()
    if ext not in ALLOWED_COMPROVANTE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Formato de arquivo não suportado ({ext}). Utilize JPG, PNG, WEBP ou PDF."
        )
    
    unique_id = uuid.uuid4().hex
    safe_name = f"emp_{empresa_id}_{unique_id}{ext}"
    return safe_name, ext
