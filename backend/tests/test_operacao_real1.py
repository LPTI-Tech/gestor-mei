import io
import pytest
from PIL import Image
from fastapi import UploadFile, HTTPException

from app.database import SessionLocal
from app.models.user import User, UserRole
from app.models.empresa import Empresa
from app.models.produto import Produto
from app.services.image_service import validate_image_upload, optimize_and_convert_to_webp
from app.services.storage_service import StorageService
from app.routers.produtos import upload_produto_imagem, get_produto_imagem, delete_produto_imagem
from app.routers.empresas import upload_empresa_logo, get_current_empresa_logo, get_empresa_logo_by_id, delete_empresa_logo


def _create_sample_png_bytes(width=200, height=200, color=(255, 0, 0)) -> bytes:
    buf = io.BytesIO()
    img = Image.new("RGBA", (width, height), color=color)
    img.save(buf, format="PNG")
    return buf.getvalue()


def _create_sample_jpeg_bytes(width=1000, height=800, color=(0, 255, 0)) -> bytes:
    buf = io.BytesIO()
    img = Image.new("RGB", (width, height), color=color)
    img.save(buf, format="JPEG")
    return buf.getvalue()


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def owner(db):
    user = db.query(User).filter(User.email == "admin@gestormei.com.br").first()
    assert user is not None
    return user


@pytest.fixture
def empresa(db, owner):
    emp = db.query(Empresa).filter(Empresa.id == owner.empresa_id).first()
    assert emp is not None
    return emp


# ==============================================================================
# 1. TESTES DO IMAGE SERVICE (Validação, EXIF, Redimensionamento, WebP)
# ==============================================================================

def test_image_service_validation():
    # Bytes vazios
    valido, msg = validate_image_upload(b"")
    assert not valido
    assert "vazio" in msg

    # Bytes corrompidos
    valido, msg = validate_image_upload(b"nao eh uma imagem")
    assert not valido
    assert "corrompido" in msg or "inválida" in msg

    # Imagem válida PNG
    png_bytes = _create_sample_png_bytes()
    valido, msg = validate_image_upload(png_bytes)
    assert valido


def test_image_service_convert_and_resize_webp():
    # Imagem grande 1200x900 JPEG -> redimensiona para máx 800x800 e converte para WebP
    jpeg_bytes = _create_sample_jpeg_bytes(1200, 900)
    webp_bytes, mime = optimize_and_convert_to_webp(jpeg_bytes, max_size=(800, 800), quality=85)
    
    assert mime == "image/webp"
    assert len(webp_bytes) > 0

    with Image.open(io.BytesIO(webp_bytes)) as out_img:
        assert out_img.format == "WEBP"
        w, h = out_img.size
        assert w <= 800
        assert h <= 800


# ==============================================================================
# 2. TESTES DE STORAGE SERVICE (Produtos e Logotipos)
# ==============================================================================

def test_storage_service_produto_and_logo(tmp_path):
    storage = StorageService(local_base_dir=str(tmp_path))
    content = b"fake webp bytes"

    # Produto
    prod_path = storage.save_product_image(content, "prod_1_123.webp", empresa_id=1, produto_id=1)
    assert "prod_1_123.webp" in prod_path

    stream_res = storage.get_product_image_stream("prod_1_123.webp", empresa_id=1)
    assert stream_res is not None
    stream, c_type, size, provider = stream_res
    assert stream.read() == content
    stream.close()

    assert storage.delete_product_image("prod_1_123.webp", empresa_id=1) is True

    # Logo
    logo_path = storage.save_company_logo(content, empresa_id=1)
    assert "logo_1.webp" in logo_path or "logo" in logo_path

    stream_res_logo = storage.get_company_logo_stream(empresa_id=1)
    assert stream_res_logo is not None
    stream, c_type, size, provider = stream_res_logo
    assert stream.read() == content
    stream.close()

    assert storage.delete_company_logo(empresa_id=1) is True


# ==============================================================================
# 3. TESTES DE ENDPOINTS DE PRODUTOS E LOGO (Upload, Download, Exclusão)
# ==============================================================================

def test_router_produto_imagem_lifecycle(db, owner, empresa):
    # 1. Cria produto de teste
    produto = Produto(
        empresa_id=empresa.id,
        nome="Pizza Calabresa Artesanal Especial",
        tipo="PRODUTO",
        categoria="Pizzas",
        preco_venda=48.0,
        custo_unitario=18.0,
        quantidade_estoque=20.0,
        estoque_minimo=5.0,
        ativo=True
    )
    db.add(produto)
    db.commit()
    db.refresh(produto)

    try:
        # 2. Upload de imagem
        png_bytes = _create_sample_png_bytes(400, 300)
        file_obj = UploadFile(file=io.BytesIO(png_bytes), filename="foto_pizza.png")
        
        prod_updated = upload_produto_imagem(
            produto_id=produto.id,
            file=file_obj,
            db=db,
            current_user=owner
        )
        assert prod_updated.imagem_url == f"/api/produtos/{produto.id}/imagem"
        assert prod_updated.imagem_nome.endswith(".webp")

        # 3. Download da imagem
        resp_stream = get_produto_imagem(produto_id=produto.id, db=db)
        assert resp_stream.media_type == "image/webp"
        assert resp_stream.status_code == 200

        # 4. Exclusão da imagem
        prod_deleted_img = delete_produto_imagem(produto_id=produto.id, db=db, current_user=owner)
        assert prod_deleted_img.imagem_url is None
        assert prod_deleted_img.imagem_nome is None

        # 5. Tentativa de obter imagem excluída deve dar 404
        with pytest.raises(HTTPException) as exc_info:
            get_produto_imagem(produto_id=produto.id, db=db)
        assert exc_info.value.status_code == 404

    finally:
        db.delete(produto)
        db.commit()


def test_router_empresa_logo_lifecycle(db, owner, empresa):
    # 1. Upload do logotipo
    png_bytes = _create_sample_png_bytes(300, 300)
    file_obj = UploadFile(file=io.BytesIO(png_bytes), filename="meu_logo.png")

    empresa_updated = upload_empresa_logo(
        file=file_obj,
        empresa=empresa,
        db=db,
        admin=owner
    )
    assert empresa_updated.logo_url == f"/api/empresa/{empresa.id}/logo"

    # 2. Download do logotipo no contexto da empresa
    resp_logo_ctx = get_current_empresa_logo(empresa=empresa, db=db)
    assert resp_logo_ctx.media_type == "image/webp"
    assert resp_logo_ctx.status_code == 200

    # 3. Download do logotipo pelo ID da empresa
    resp_logo_id = get_empresa_logo_by_id(empresa_id=empresa.id, db=db)
    assert resp_logo_id.media_type == "image/webp"
    assert resp_logo_id.status_code == 200

    # 4. Exclusão do logotipo
    empresa_del_logo = delete_empresa_logo(empresa=empresa, db=db, admin=owner)
    assert empresa_del_logo.logo_url is None

    # 5. 404 após exclusão
    with pytest.raises(HTTPException) as exc_info:
        get_empresa_logo_by_id(empresa_id=empresa.id, db=db)
    assert exc_info.value.status_code == 404
