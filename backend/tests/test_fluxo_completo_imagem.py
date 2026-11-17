"""
Teste de Homologação Ponta a Ponta: Ciclo Completo de Imagens de Produtos
Valida:
1. Criação de produto com imagem (PNG -> WebP comprimido no storage)
2. Consulta de miniatura na listagem de produtos (/api/produtos)
3. Download de stream da imagem (/api/produtos/{id}/imagem)
4. Troca/Atualização de imagem na edição do produto
5. Remoção de imagem do produto (/api/produtos/{id}/imagem DELETE)
6. Validação de presença e fallback na listagem de produtos e PDV
7. Validação de rejeição de arquivo que exceda 5 MB
"""

import io
import time
import pytest
from PIL import Image
from fastapi import UploadFile, HTTPException

from app.database import SessionLocal
from app.models.user import User
from app.models.empresa import Empresa
from app.models.produto import Produto
from app.services.image_service import validate_image_upload, optimize_and_convert_to_webp, MAX_FILE_SIZE_BYTES
from app.services.storage_service import storage_service
from app.routers.produtos import (
    create_produto,
    list_produtos,
    get_produto,
    update_produto,
    upload_produto_imagem,
    get_produto_imagem,
    delete_produto_imagem,
    delete_produto,
)
from app.schemas.produto import ProdutoCreate, ProdutoUpdate


def _create_image(width=400, height=400, color=(0, 120, 215), fmt="PNG") -> bytes:
    buf = io.BytesIO()
    img = Image.new("RGBA" if fmt == "PNG" else "RGB", (width, height), color=color)
    img.save(buf, format=fmt)
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


def test_fluxo_completo_gerenciamento_imagens(db, owner, empresa):
    timestamp = int(time.time())
    nome_prod = f"Hamburguer Artesanal Sentinel {timestamp}"

    # --------------------------------------------------------------------------
    # 1. CRIAR PRODUTO COM IMAGEM
    # --------------------------------------------------------------------------
    create_dto = ProdutoCreate(
        nome=nome_prod,
        tipo="PRODUTO",
        categoria="Lanches",
        preco_venda=35.50,
        custo_unitario=14.00,
        quantidade_estoque=30.0,
        estoque_minimo=5.0,
        ativo=True,
    )
    prod = create_produto(data=create_dto, db=db, current_user=owner, empresa=empresa)
    assert prod.id is not None
    assert prod.nome == nome_prod

    # Envia primeira foto (PNG 400x400)
    png_bytes_1 = _create_image(400, 400, color=(255, 99, 71), fmt="PNG")
    file_1 = UploadFile(file=io.BytesIO(png_bytes_1), filename="foto_burger.png")

    prod_com_foto = upload_produto_imagem(
        produto_id=prod.id,
        file=file_1,
        db=db,
        current_user=owner,
        empresa=empresa
    )
    assert prod_com_foto.imagem_url == f"/api/produtos/{prod.id}/imagem"
    assert prod_com_foto.imagem_nome.startswith(f"prod_{prod.id}_")
    assert prod_com_foto.imagem_nome.endswith(".webp")
    primeiro_nome_arquivo = prod_com_foto.imagem_nome

    # --------------------------------------------------------------------------
    # 2. VALIDAR MINIATURA NA LISTAGEM DE PRODUTOS
    # --------------------------------------------------------------------------
    lista = list_produtos(busca=nome_prod, db=db, current_user=owner, empresa=empresa)
    item_encontrado = next((p for p in lista if p.id == prod.id), None)
    assert item_encontrado is not None
    assert item_encontrado.imagem_url == f"/api/produtos/{prod.id}/imagem"

    # --------------------------------------------------------------------------
    # 3. VALIDAR DOWNLOAD E STREAM DA IMAGEM
    # --------------------------------------------------------------------------
    resp_stream = get_produto_imagem(produto_id=prod.id, db=db)
    assert resp_stream.media_type == "image/webp"
    assert resp_stream.status_code == 200
    assert "public, max-age=86400" in resp_stream.headers.get("Cache-Control", "")
    # Consome o stream assíncrono para liberar o file descriptor no Windows
    import anyio
    async def _consume():
        chunks = []
        async for ch in resp_stream.body_iterator:
            chunks.append(ch)
        return b"".join(chunks)
    stream_content = anyio.run(_consume)
    assert len(stream_content) > 0

    # --------------------------------------------------------------------------
    # 4. EDITAR PRODUTO TROCANDO A IMAGEM
    # --------------------------------------------------------------------------
    update_dto = ProdutoUpdate(preco_venda=38.90)
    prod_atualizado = update_produto(produto_id=prod.id, data=update_dto, db=db, current_user=owner, empresa=empresa)
    assert prod_atualizado.preco_venda == 38.90
    assert prod_atualizado.imagem_url == f"/api/produtos/{prod.id}/imagem"

    # Envia nova imagem para substituição (JPEG verde)
    jpeg_bytes_2 = _create_image(600, 600, color=(46, 125, 50), fmt="JPEG")
    file_2 = UploadFile(file=io.BytesIO(jpeg_bytes_2), filename="foto_burger_v2.jpg")

    prod_troca_foto = upload_produto_imagem(
        produto_id=prod.id,
        file=file_2,
        db=db,
        current_user=owner,
        empresa=empresa
    )
    assert prod_troca_foto.imagem_url == f"/api/produtos/{prod.id}/imagem"
    assert prod_troca_foto.imagem_nome != primeiro_nome_arquivo
    assert prod_troca_foto.imagem_nome.endswith(".webp")

    # Garante que o arquivo antigo foi removido do storage
    assert storage_service.get_product_image_stream(primeiro_nome_arquivo, empresa.id) is None

    # --------------------------------------------------------------------------
    # 5. REMOVER IMAGEM
    # --------------------------------------------------------------------------
    prod_sem_foto = delete_produto_imagem(produto_id=prod.id, db=db, current_user=owner, empresa=empresa)
    assert prod_sem_foto.imagem_url is None
    assert prod_sem_foto.imagem_nome is None

    # Verifica que o endpoint da imagem agora retorna 404
    with pytest.raises(HTTPException) as exc_info:
        get_produto_imagem(produto_id=prod.id, db=db)
    assert exc_info.value.status_code == 404

    # --------------------------------------------------------------------------
    # 6. VALIDAR FALLBACK NA LISTAGEM E PDV
    # --------------------------------------------------------------------------
    lista_pos_remocao = list_produtos(busca=nome_prod, db=db, current_user=owner, empresa=empresa)
    item_pos_remocao = next((p for p in lista_pos_remocao if p.id == prod.id), None)
    assert item_pos_remocao is not None
    assert item_pos_remocao.imagem_url is None
    # No frontend, item_pos_remocao.imagem_url == null aciona automaticamente o fallback de ícone

    # --------------------------------------------------------------------------
    # 7. VALIDAR VALIDAÇÃO DE LIMITE DE 5 MB
    # --------------------------------------------------------------------------
    assert MAX_FILE_SIZE_BYTES == 5 * 1024 * 1024
    arquivo_gigante = b"0" * (5 * 1024 * 1024 + 50)
    valido, erro_msg = validate_image_upload(arquivo_gigante, "image/jpeg")
    assert not valido
    assert "5 MB" in erro_msg

    # Limpeza do produto de teste
    delete_produto(produto_id=prod.id, db=db, current_user=owner, empresa=empresa)
