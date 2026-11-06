import os
import io
import pytest
from unittest.mock import MagicMock, patch
from botocore.exceptions import ClientError

from app.services.storage_service import (
    LocalStorageProvider,
    CloudflareR2Provider,
    StorageService,
    guess_content_type,
)


# ==============================================================================
# 1. TESTES: LOCAL STORAGE PROVIDER
# ==============================================================================

def test_local_storage_provider_crud(tmp_path):
    """Garante que LocalStorageProvider salva, verifica, lê stream e remove arquivos."""
    provider = LocalStorageProvider(base_dir=str(tmp_path))
    content = b"arquivo de teste local"
    rel_path = "comprovantes/emp_1_teste.pdf"

    # 1. Salvar
    saved_key = provider.save_file(content, rel_path, content_type="application/pdf")
    assert "comprovantes" in saved_key
    assert "emp_1_teste.pdf" in saved_key

    # 2. Existência
    assert provider.file_exists(rel_path) is True
    assert provider.file_exists("comprovantes/inexistente.pdf") is False

    # 3. Stream
    stream_data = provider.get_file_stream(rel_path)
    assert stream_data is not None
    stream, c_type, size = stream_data
    assert c_type == "application/pdf"
    assert size == len(content)
    assert stream.read() == content
    stream.close()

    # 4. Remover
    assert provider.delete_file(rel_path) is True
    assert provider.file_exists(rel_path) is False


# ==============================================================================
# 2. TESTES: CLOUDFLARE R2 PROVIDER (MOCKED S3 CLIENT)
# ==============================================================================

def test_cloudflare_r2_provider_save():
    """Garante chamada correta ao S3 client put_object no Cloudflare R2."""
    with patch("boto3.client") as mock_boto:
        mock_s3 = MagicMock()
        mock_boto.return_value = mock_s3

        provider = CloudflareR2Provider(
            account_id="fake_account_id",
            access_key_id="fake_access_key",
            secret_access_key="fake_secret_key",
            bucket_name="gestor-mei-test-bucket",
        )

        content = b"%PDF-1.4 teste r2"
        key = provider.save_file(content, "empresas/10/comprovantes/recibo.pdf", content_type="application/pdf")

        assert key == "empresas/10/comprovantes/recibo.pdf"
        mock_s3.put_object.assert_called_once_with(
            Bucket="gestor-mei-test-bucket",
            Key="empresas/10/comprovantes/recibo.pdf",
            Body=content,
            ContentType="application/pdf",
        )


def test_cloudflare_r2_provider_get_stream_success():
    """Garante recuperação de stream do R2 via get_object."""
    with patch("boto3.client") as mock_boto:
        mock_s3 = MagicMock()
        mock_body = io.BytesIO(b"conteudo do r2")
        mock_s3.get_object.return_value = {
            "Body": mock_body,
            "ContentType": "application/pdf",
            "ContentLength": 14,
        }
        mock_boto.return_value = mock_s3

        provider = CloudflareR2Provider(
            account_id="fake_acc",
            access_key_id="fake_key",
            secret_access_key="fake_sec",
            bucket_name="gestor-mei-test-bucket",
        )

        res = provider.get_file_stream("empresas/1/comprovantes/nota.pdf")
        assert res is not None
        stream, c_type, size = res
        assert c_type == "application/pdf"
        assert size == 14
        assert stream.read() == b"conteudo do r2"


def test_cloudflare_r2_provider_get_stream_not_found():
    """Garante que erro 404/NoSuchKey no R2 retorne None suavemente sem estourar exceção."""
    with patch("boto3.client") as mock_boto:
        mock_s3 = MagicMock()
        error_response = {"Error": {"Code": "NoSuchKey", "Message": "The specified key does not exist."}}
        mock_s3.get_object.side_effect = ClientError(error_response, "GetObject")
        mock_boto.return_value = mock_s3

        provider = CloudflareR2Provider(
            account_id="fake_acc",
            access_key_id="fake_key",
            secret_access_key="fake_sec",
            bucket_name="gestor-mei-test-bucket",
        )

        res = provider.get_file_stream("inexistente.pdf")
        assert res is None


# ==============================================================================
# 3. TESTES: STORAGE SERVICE COM ESTRATÉGIA HÍBRIDA (R2 + FALLBACK LOCAL)
# ==============================================================================

def test_storage_service_fallback_to_local(tmp_path):
    """Garante que quando R2 não está configurado, o StorageService opera 100% em modo Local Storage."""
    with patch("app.services.storage_service.settings") as mock_settings:
        mock_settings.is_r2_configured = False
        service = StorageService(local_base_dir=str(tmp_path))

        assert service.is_using_r2 is False
        assert service.active_provider_name == "Local Storage"

        # Salva comprovante
        content = b"comprovante local"
        service.save_comprovante(content, "emp_2_abc.pdf", empresa_id=2, content_type="application/pdf")

        # Recupera comprovante
        stream_data = service.get_comprovante_stream("emp_2_abc.pdf", empresa_id=2)
        assert stream_data is not None
        stream, c_type, size, provider = stream_data
        assert provider == "Local Storage"
        assert stream.read() == content
        stream.close()


def test_storage_service_hybrid_read_falls_back_to_local_for_legacy_files(tmp_path):
    """
    Garante o requisito crítico de migração:
    Quando o R2 está ativo mas um arquivo legado existe apenas no disco local,
    o StorageService busca no R2, não encontra e faz fallback transparente para o disco local!
    """
    local_dir = str(tmp_path)
    # Pré-cria arquivo legado no disco local
    legacy_file = os.path.join(local_dir, "comprovantes", "emp_1_legado.pdf")
    os.makedirs(os.path.dirname(legacy_file), exist_ok=True)
    with open(legacy_file, "wb") as f:
        f.write(b"arquivo legado anterior a migracao r2")

    with patch("app.services.storage_service.settings") as mock_settings, \
         patch("boto3.client") as mock_boto:

        mock_settings.is_r2_configured = True
        mock_settings.R2_ACCOUNT_ID = "acc123"
        mock_settings.R2_ACCESS_KEY_ID = "key123"
        mock_settings.R2_SECRET_ACCESS_KEY = "sec123"
        mock_settings.R2_BUCKET_NAME = "bucket-r2"
        mock_settings.r2_endpoint = "https://acc123.r2.cloudflarestorage.com"

        mock_s3 = MagicMock()
        # Simula que o arquivo legado NÃO existe no R2
        error_response = {"Error": {"Code": "NoSuchKey", "Message": "Key not found"}}
        mock_s3.get_object.side_effect = ClientError(error_response, "GetObject")
        mock_boto.return_value = mock_s3

        service = StorageService(local_base_dir=local_dir)
        assert service.is_using_r2 is True
        assert service.active_provider_name == "Cloudflare R2"

        # Solicita o arquivo legado
        stream_data = service.get_comprovante_stream("emp_1_legado.pdf", empresa_id=1)
        assert stream_data is not None
        stream, c_type, size, provider = stream_data

        # Deve ter caído no fallback local com sucesso
        assert provider == "Local Storage"
        assert stream.read() == b"arquivo legado anterior a migracao r2"
        stream.close()


def test_storage_service_archive_and_get_nfe_xml(tmp_path):
    """Garante arquivamento durável de XML NF-e com identificador de chave de acesso."""
    with patch("app.services.storage_service.settings") as mock_settings:
        mock_settings.is_r2_configured = False
        service = StorageService(local_base_dir=str(tmp_path))

        xml_content = b"<nfeProc><NFe><infNFe Id='NFe352409...'><ide><nNF>123</nNF></ide></infNFe></NFe></nfeProc>"
        chave = "35240900000000000000550010000001231000001234"

        # Arquiva
        saved_path = service.archive_nfe_xml(empresa_id=1, chave_acesso=chave, xml_bytes=xml_content)
        assert chave in saved_path

        # Recupera
        res = service.get_nfe_xml_stream(empresa_id=1, chave_acesso=chave)
        assert res is not None
        stream, c_type, size, provider = res
        assert c_type == "application/xml"
        assert stream.read() == xml_content
        stream.close()
