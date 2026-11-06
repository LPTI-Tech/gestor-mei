import os
import io
import logging
from abc import ABC, abstractmethod
from typing import Optional, Tuple, BinaryIO, Union
from botocore.config import Config
from botocore.exceptions import ClientError
import boto3

from app.config import settings

logger = logging.getLogger("gestor_mei.storage")

MEDIA_TYPES = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".xml": "application/xml",
    ".json": "application/json",
}


def guess_content_type(filename: str, default: str = "application/octet-stream") -> str:
    ext = os.path.splitext(filename)[1].lower()
    return MEDIA_TYPES.get(ext, default)


class BaseStorageProvider(ABC):
    """Contrato abstrato para provedores de armazenamento do Gestor MEI."""

    @abstractmethod
    def save_file(self, content: bytes, relative_path: str, content_type: Optional[str] = None) -> str:
        """Salva o arquivo e retorna a chave/caminho relativo persistido."""
        pass

    @abstractmethod
    def get_file_stream(self, relative_path: str) -> Optional[Tuple[BinaryIO, str, int]]:
        """Recupera o arquivo como stream (stream, content_type, tamanho em bytes)."""
        pass

    @abstractmethod
    def file_exists(self, relative_path: str) -> bool:
        """Verifica se o arquivo existe no storage."""
        pass

    @abstractmethod
    def delete_file(self, relative_path: str) -> bool:
        """Remove o arquivo do storage."""
        pass


class LocalStorageProvider(BaseStorageProvider):
    """
    Provedor de Armazenamento em Disco Local (desenvolvimento e fallback offline).
    Armazena arquivos na pasta backend/uploads/.
    """

    def __init__(self, base_dir: Optional[str] = None):
        if base_dir:
            self.base_dir = base_dir
        else:
            backend_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            self.base_dir = os.path.join(backend_root, "uploads")
        os.makedirs(self.base_dir, exist_ok=True)

    def _normalize_path(self, relative_path: str) -> str:
        clean = relative_path.lstrip("/\\")
        # Remove prefixo /uploads/ se fornecido
        if clean.startswith("uploads/") or clean.startswith("uploads\\"):
            clean = clean[8:]
        return os.path.normpath(clean)

    def _get_full_path(self, relative_path: str) -> str:
        clean = self._normalize_path(relative_path)
        return os.path.join(self.base_dir, clean)

    def save_file(self, content: bytes, relative_path: str, content_type: Optional[str] = None) -> str:
        full_path = self._get_full_path(relative_path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "wb") as f:
            f.write(content)
        logger.info(f"[LOCAL STORAGE] Arquivo salvo em: {full_path} ({len(content)} bytes)")
        return self._normalize_path(relative_path)

    def get_file_stream(self, relative_path: str) -> Optional[Tuple[BinaryIO, str, int]]:
        full_path = self._get_full_path(relative_path)
        if not os.path.isfile(full_path):
            return None
        size = os.path.getsize(full_path)
        content_type = guess_content_type(full_path)
        f = open(full_path, "rb")
        return f, content_type, size

    def file_exists(self, relative_path: str) -> bool:
        full_path = self._get_full_path(relative_path)
        return os.path.isfile(full_path)

    def delete_file(self, relative_path: str) -> bool:
        full_path = self._get_full_path(relative_path)
        if os.path.isfile(full_path):
            try:
                os.remove(full_path)
                return True
            except Exception as e:
                logger.error(f"[LOCAL STORAGE] Erro ao deletar {full_path}: {e}")
                return False
        return False


class CloudflareR2Provider(BaseStorageProvider):
    """
    Provedor de Armazenamento em Nuvem Cloudflare R2 via API S3 (Zero Egress Fees).
    """

    def __init__(
        self,
        account_id: str,
        access_key_id: str,
        secret_access_key: str,
        bucket_name: str,
        endpoint_url: Optional[str] = None,
    ):
        self.bucket_name = bucket_name
        self.endpoint_url = endpoint_url or f"https://{account_id}.r2.cloudflarestorage.com"

        # Configuração estrita S3v4 exigida pelo Cloudflare R2
        s3_config = Config(
            signature_version="s3v4",
            retries={"max_attempts": 3, "mode": "standard"},
            s3={"addressing_style": "path"}
        )

        self.s3_client = boto3.client(
            "s3",
            endpoint_url=self.endpoint_url,
            aws_access_key_id=access_key_id,
            aws_secret_access_key=secret_access_key,
            region_name="auto",
            config=s3_config,
        )
        logger.info(f"[R2 STORAGE] Inicializado com sucesso para bucket '{bucket_name}' no endpoint {self.endpoint_url}")

    def _normalize_key(self, relative_path: str) -> str:
        clean = relative_path.replace("\\", "/").lstrip("/")
        if clean.startswith("uploads/"):
            clean = clean[8:]
        return clean

    def save_file(self, content: bytes, relative_path: str, content_type: Optional[str] = None) -> str:
        key = self._normalize_key(relative_path)
        c_type = content_type or guess_content_type(key)

        self.s3_client.put_object(
            Bucket=self.bucket_name,
            Key=key,
            Body=content,
            ContentType=c_type,
        )
        logger.info(f"[R2 STORAGE] Objeto enviado com sucesso: s3://{self.bucket_name}/{key} ({len(content)} bytes)")
        return key

    def get_file_stream(self, relative_path: str) -> Optional[Tuple[BinaryIO, str, int]]:
        key = self._normalize_key(relative_path)
        try:
            resp = self.s3_client.get_object(Bucket=self.bucket_name, Key=key)
            body = resp["Body"]
            content_type = resp.get("ContentType") or guess_content_type(key)
            content_length = resp.get("ContentLength", 0)
            return body, content_type, content_length
        except ClientError as e:
            code = e.response.get("Error", {}).get("Code", "")
            if code in ("NoSuchKey", "404"):
                return None
            logger.error(f"[R2 STORAGE] Erro ao obter objeto '{key}': {e}")
            raise e

    def file_exists(self, relative_path: str) -> bool:
        key = self._normalize_key(relative_path)
        try:
            self.s3_client.head_object(Bucket=self.bucket_name, Key=key)
            return True
        except ClientError as e:
            code = e.response.get("Error", {}).get("Code", "")
            if code in ("NoSuchKey", "404"):
                return False
            logger.error(f"[R2 STORAGE] Erro ao checar objeto '{key}': {e}")
            return False

    def delete_file(self, relative_path: str) -> bool:
        key = self._normalize_key(relative_path)
        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=key)
            return True
        except ClientError as e:
            logger.error(f"[R2 STORAGE] Erro ao remover objeto '{key}': {e}")
            return False


class StorageService:
    """
    Fachada de Armazenamento do Gestor MEI com Suporte Híbrido:
    - Se credenciais R2 estiverem configuradas -> Grava no Cloudflare R2.
    - Se credenciais R2 estiverem ausentes -> Grava no disco local (backend/uploads/).
    - Na leitura (Download): Realiza busca prioritária no R2 e faz fallback automático para o disco local.
    """

    def __init__(self, local_base_dir: Optional[str] = None):
        self.local_provider = LocalStorageProvider(base_dir=local_base_dir)
        self.r2_provider: Optional[CloudflareR2Provider] = None

        if settings.is_r2_configured:
            try:
                self.r2_provider = CloudflareR2Provider(
                    account_id=settings.R2_ACCOUNT_ID,
                    access_key_id=settings.R2_ACCESS_KEY_ID,
                    secret_access_key=settings.R2_SECRET_ACCESS_KEY,
                    bucket_name=settings.R2_BUCKET_NAME,
                    endpoint_url=settings.r2_endpoint,
                )
            except Exception as e:
                logger.error(f"[STORAGE SERVICE] Falha ao inicializar Cloudflare R2 Provider: {e}. Operando em modo de fallback local.")
                self.r2_provider = None

    @property
    def is_using_r2(self) -> bool:
        """Retorna True se o provedor ativo de persistência em nuvem for o Cloudflare R2."""
        return self.r2_provider is not None

    @property
    def active_provider_name(self) -> str:
        return "Cloudflare R2" if self.is_using_r2 else "Local Storage"

    # ==========================================================================
    # COMPROVANTES DE COMPRAS
    # ==========================================================================

    def save_comprovante(
        self,
        content: bytes,
        filename: str,
        empresa_id: int,
        content_type: Optional[str] = None
    ) -> str:
        """
        Salva o comprovante de compra de forma híbrida:
        1. Se R2 estiver ativo: grava no bucket particionado por empresa (empresas/{empresa_id}/comprovantes/{filename})
           e também mantém chave compatível direta (comprovantes/{filename}).
        2. Mantém cópia local ou salva direto no LocalStorageProvider.
        """
        safe_filename = os.path.basename(filename)
        c_type = content_type or guess_content_type(safe_filename)

        # Caminhos particionados por tenant
        tenant_path = f"empresas/{empresa_id}/comprovantes/{safe_filename}"
        flat_path = f"comprovantes/{safe_filename}"

        if self.r2_provider:
            # Grava no Cloudflare R2
            self.r2_provider.save_file(content, tenant_path, content_type=c_type)
            # Chave compatível direta
            self.r2_provider.save_file(content, flat_path, content_type=c_type)
            # Mantém também no storage local para cache / redundância
            try:
                self.local_provider.save_file(content, flat_path, content_type=c_type)
            except Exception as e:
                logger.warning(f"[STORAGE SERVICE] Falha no espelhamento local do comprovante: {e}")
            return tenant_path

        # Fallback padrão: Disco local
        return self.local_provider.save_file(content, flat_path, content_type=c_type)

    def get_comprovante_stream(
        self,
        filename: str,
        empresa_id: Optional[int] = None
    ) -> Optional[Tuple[BinaryIO, str, int, str]]:
        """
        Recupera o stream do comprovante com resolução em 2 níveis (R2 -> Fallback Local).
        Retorna (stream, content_type, tamanho, provider_name).
        """
        safe_filename = os.path.basename(filename)
        candidate_paths = []
        if empresa_id:
            candidate_paths.append(f"empresas/{empresa_id}/comprovantes/{safe_filename}")
        candidate_paths.append(f"comprovantes/{safe_filename}")
        candidate_paths.append(safe_filename)

        # 1. Tenta recuperar do Cloudflare R2
        if self.r2_provider:
            for p in candidate_paths:
                try:
                    res = self.r2_provider.get_file_stream(p)
                    if res:
                        stream, c_type, size = res
                        return stream, c_type, size, "Cloudflare R2"
                except Exception as e:
                    logger.warning(f"[STORAGE SERVICE] Erro ao consultar R2 no path '{p}': {e}")

        # 2. Fallback para LocalStorageProvider (arquivos legados ou modo dev)
        for p in candidate_paths:
            res = self.local_provider.get_file_stream(p)
            if res:
                stream, c_type, size = res
                return stream, c_type, size, "Local Storage"

        return None

    # ==========================================================================
    # ARQUIVAMENTO DE XML NF-e (Conformidade Fiscal)
    # ==========================================================================

    def archive_nfe_xml(
        self,
        empresa_id: int,
        chave_acesso: str,
        xml_bytes: bytes
    ) -> str:
        """
        Arquiva o documento XML original da NF-e para auditoria fiscal sem cobrança de egress.
        Salva sob: empresas/{empresa_id}/nfe/{chave_acesso}.xml
        """
        clean_chave = chave_acesso.strip()
        tenant_xml_path = f"empresas/{empresa_id}/nfe/{clean_chave}.xml"
        flat_xml_path = f"nfe/{empresa_id}_{clean_chave}.xml"

        if self.r2_provider:
            self.r2_provider.save_file(xml_bytes, tenant_xml_path, content_type="application/xml")
            return tenant_xml_path

        return self.local_provider.save_file(xml_bytes, flat_xml_path, content_type="application/xml")

    def get_nfe_xml_stream(
        self,
        empresa_id: int,
        chave_acesso: str
    ) -> Optional[Tuple[BinaryIO, str, int, str]]:
        """
        Recupera o documento XML original arquivado.
        """
        clean_chave = chave_acesso.strip()
        candidate_paths = [
            f"empresas/{empresa_id}/nfe/{clean_chave}.xml",
            f"nfe/{empresa_id}_{clean_chave}.xml",
            f"{clean_chave}.xml",
        ]

        if self.r2_provider:
            for p in candidate_paths:
                try:
                    res = self.r2_provider.get_file_stream(p)
                    if res:
                        stream, c_type, size = res
                        return stream, c_type, size, "Cloudflare R2"
                except Exception as e:
                    logger.warning(f"[STORAGE SERVICE] Erro ao consultar R2 para XML '{p}': {e}")

        for p in candidate_paths:
            res = self.local_provider.get_file_stream(p)
            if res:
                stream, c_type, size = res
                return stream, c_type, size, "Local Storage"

        return None

    # ==========================================================================
    # IMAGENS DE PRODUTOS (Sprint Operação Real 1)
    # ==========================================================================

    def save_product_image(
        self,
        content: bytes,
        filename: str,
        empresa_id: int,
        produto_id: int,
        content_type: Optional[str] = "image/webp"
    ) -> str:
        """
        Salva a imagem do produto no Cloudflare R2 e/ou disco local com particionamento por tenant.
        """
        safe_filename = os.path.basename(filename)
        c_type = content_type or "image/webp"

        tenant_path = f"empresas/{empresa_id}/produtos/{safe_filename}"
        flat_path = f"produtos/{safe_filename}"

        if self.r2_provider:
            self.r2_provider.save_file(content, tenant_path, content_type=c_type)
            self.r2_provider.save_file(content, flat_path, content_type=c_type)
            try:
                self.local_provider.save_file(content, flat_path, content_type=c_type)
            except Exception as e:
                logger.warning(f"[STORAGE SERVICE] Falha no espelhamento local da imagem do produto: {e}")
            return tenant_path

        return self.local_provider.save_file(content, flat_path, content_type=c_type)

    def get_product_image_stream(
        self,
        filename: str,
        empresa_id: Optional[int] = None
    ) -> Optional[Tuple[BinaryIO, str, int, str]]:
        """
        Recupera o stream da imagem do produto (R2 prioritário -> Fallback Local).
        Retorna (stream, content_type, tamanho, provider_name).
        """
        safe_filename = os.path.basename(filename)
        candidate_paths = []
        if empresa_id:
            candidate_paths.append(f"empresas/{empresa_id}/produtos/{safe_filename}")
        candidate_paths.append(f"produtos/{safe_filename}")
        candidate_paths.append(safe_filename)

        if self.r2_provider:
            for p in candidate_paths:
                try:
                    res = self.r2_provider.get_file_stream(p)
                    if res:
                        stream, c_type, size = res
                        return stream, c_type, size, "Cloudflare R2"
                except Exception as e:
                    logger.warning(f"[STORAGE SERVICE] Erro ao consultar R2 no path '{p}': {e}")

        for p in candidate_paths:
            res = self.local_provider.get_file_stream(p)
            if res:
                stream, c_type, size = res
                return stream, c_type, size, "Local Storage"

        return None

    def delete_product_image(
        self,
        filename: str,
        empresa_id: Optional[int] = None
    ) -> bool:
        """
        Remove imagem do produto do Cloudflare R2 e do disco local.
        """
        safe_filename = os.path.basename(filename)
        candidate_paths = []
        if empresa_id:
            candidate_paths.append(f"empresas/{empresa_id}/produtos/{safe_filename}")
        candidate_paths.append(f"produtos/{safe_filename}")
        candidate_paths.append(safe_filename)

        success = False
        if self.r2_provider:
            for p in candidate_paths:
                try:
                    if self.r2_provider.file_exists(p):
                        self.r2_provider.delete_file(p)
                        success = True
                except Exception as e:
                    logger.warning(f"[STORAGE SERVICE] Erro ao deletar R2 '{p}': {e}")

        for p in candidate_paths:
            try:
                if self.local_provider.file_exists(p):
                    self.local_provider.delete_file(p)
                    success = True
            except Exception as e:
                logger.warning(f"[STORAGE SERVICE] Erro ao deletar local '{p}': {e}")

        return success

    # ==========================================================================
    # LOGOTIPO DA EMPRESA (Sprint Operação Real 1)
    # ==========================================================================

    def save_company_logo(
        self,
        content: bytes,
        empresa_id: int,
        filename: Optional[str] = None,
        content_type: Optional[str] = "image/webp"
    ) -> str:
        """
        Salva o logotipo da empresa no Cloudflare R2 e/ou disco local.
        """
        safe_name = f"logo_{empresa_id}.webp"
        c_type = content_type or "image/webp"

        tenant_path = f"empresas/{empresa_id}/logo/{safe_name}"
        flat_path = f"logos/emp_{empresa_id}_logo.webp"

        if self.r2_provider:
            self.r2_provider.save_file(content, tenant_path, content_type=c_type)
            self.r2_provider.save_file(content, flat_path, content_type=c_type)
            try:
                self.local_provider.save_file(content, flat_path, content_type=c_type)
            except Exception as e:
                logger.warning(f"[STORAGE SERVICE] Falha no espelhamento local do logotipo: {e}")
            return tenant_path

        return self.local_provider.save_file(content, flat_path, content_type=c_type)

    def get_company_logo_stream(
        self,
        empresa_id: int,
        filename: Optional[str] = None
    ) -> Optional[Tuple[BinaryIO, str, int, str]]:
        """
        Recupera o stream do logotipo da empresa (R2 prioritário -> Fallback Local).
        Retorna (stream, content_type, tamanho, provider_name).
        """
        candidate_paths = [
            f"empresas/{empresa_id}/logo/logo_{empresa_id}.webp",
            f"logos/emp_{empresa_id}_logo.webp",
            f"logos/logo_{empresa_id}.webp",
        ]
        if filename:
            candidate_paths.insert(0, f"empresas/{empresa_id}/logo/{os.path.basename(filename)}")
            candidate_paths.insert(1, f"logos/{os.path.basename(filename)}")

        if self.r2_provider:
            for p in candidate_paths:
                try:
                    res = self.r2_provider.get_file_stream(p)
                    if res:
                        stream, c_type, size = res
                        return stream, c_type, size, "Cloudflare R2"
                except Exception as e:
                    logger.warning(f"[STORAGE SERVICE] Erro ao consultar R2 no path '{p}': {e}")

        for p in candidate_paths:
            res = self.local_provider.get_file_stream(p)
            if res:
                stream, c_type, size = res
                return stream, c_type, size, "Local Storage"

        return None

    def delete_company_logo(
        self,
        empresa_id: int,
        filename: Optional[str] = None
    ) -> bool:
        """
        Remove o logotipo da empresa do Cloudflare R2 e do disco local.
        """
        candidate_paths = [
            f"empresas/{empresa_id}/logo/logo_{empresa_id}.webp",
            f"logos/emp_{empresa_id}_logo.webp",
            f"logos/logo_{empresa_id}.webp",
        ]
        if filename:
            candidate_paths.insert(0, f"empresas/{empresa_id}/logo/{os.path.basename(filename)}")
            candidate_paths.insert(1, f"logos/{os.path.basename(filename)}")

        success = False
        if self.r2_provider:
            for p in candidate_paths:
                try:
                    if self.r2_provider.file_exists(p):
                        self.r2_provider.delete_file(p)
                        success = True
                except Exception as e:
                    logger.warning(f"[STORAGE SERVICE] Erro ao deletar R2 logo '{p}': {e}")

        for p in candidate_paths:
            try:
                if self.local_provider.file_exists(p):
                    self.local_provider.delete_file(p)
                    success = True
            except Exception as e:
                logger.warning(f"[STORAGE SERVICE] Erro ao deletar local logo '{p}': {e}")

        return success


# Instância compartilhada singleton
storage_service = StorageService()
