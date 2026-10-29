from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, UniqueConstraint, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class ProdutoVinculoXML(Base):
    __tablename__ = "produtos_vinculo_xml"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False, index=True)
    fornecedor_cnpj = Column(String(20), nullable=False, index=True)
    fornecedor_nome = Column(String(200), nullable=True)
    codigo_fornecedor = Column(String(100), nullable=False, index=True)  # cProd da NF-e
    descricao_fornecedor = Column(String(255), nullable=True)           # xProd da NF-e
    ean_fornecedor = Column(String(20), nullable=True)                  # cEAN da NF-e
    produto_id = Column(Integer, ForeignKey("produtos.id"), nullable=False, index=True)
    fator_conversao = Column(Float, default=1.0, nullable=False)        # Ex: 1 cx = 12 unidades

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    empresa = relationship("Empresa")
    produto = relationship("Produto", backref="vinculos_xml")

    __table_args__ = (
        UniqueConstraint("empresa_id", "fornecedor_cnpj", "codigo_fornecedor", name="uq_empresa_fornecedor_cprod"),
    )


class NfeImportada(Base):
    __tablename__ = "nfe_importadas"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False, index=True)
    chave_acesso = Column(String(44), nullable=False, index=True)
    numero_nota = Column(String(20), nullable=False)
    serie = Column(String(10), nullable=False, default="1")
    data_emissao = Column(String(30), nullable=True)
    valor_total = Column(Float, nullable=False, default=0.0)
    fornecedor_cnpj = Column(String(20), nullable=False, index=True)
    fornecedor_nome = Column(String(200), nullable=False)
    fornecedor_uf = Column(String(2), nullable=True)
    total_itens = Column(Integer, nullable=False, default=0)
    usuario_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    data_importacao = Column(DateTime, default=datetime.utcnow, nullable=False)
    observacao = Column(Text, nullable=True)

    empresa = relationship("Empresa")
    usuario = relationship("User")
    itens = relationship("ItemNfeImportada", back_populates="nfe_importada", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("empresa_id", "chave_acesso", name="uq_empresa_nfe_chave"),
    )


class ItemNfeImportada(Base):
    __tablename__ = "nfe_importadas_itens"

    id = Column(Integer, primary_key=True, index=True)
    nfe_importada_id = Column(Integer, ForeignKey("nfe_importadas.id"), nullable=False, index=True)
    produto_id = Column(Integer, ForeignKey("produtos.id"), nullable=False, index=True)
    codigo_fornecedor = Column(String(100), nullable=False)
    descricao_fornecedor = Column(String(255), nullable=True)
    unidade_comercial = Column(String(20), nullable=True, default="UN")
    quantidade_comercial = Column(Float, nullable=False, default=0.0)
    fator_conversao = Column(Float, default=1.0, nullable=False)
    quantidade_entrada = Column(Float, nullable=False, default=0.0)
    valor_unitario_nota = Column(Float, nullable=False, default=0.0)
    custo_unitario_calculado = Column(Float, nullable=False, default=0.0)
    valor_total = Column(Float, nullable=False, default=0.0)

    nfe_importada = relationship("NfeImportada", back_populates="itens")
    produto = relationship("Produto")
