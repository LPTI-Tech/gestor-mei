"""
Módulo de Arquitetura para Impressão Térmica ESC/POS (Futura Implementação).

Este módulo define a especificação e as estruturas para formatação de comandas
de pedidos e comprovantes de venda em bobinas de 58mm e 80mm utilizando o padrão ESC/POS.

Preparado para Sprint 4/5 para suporte via:
- USB / Serial (python-escpos)
- Rede TCP/IP (Impressoras Ethernet/Wi-Fi)
- Impressão Direta via Navegador Web (Raw BT / WebUSB / QZ Tray / Window.print)
"""

from typing import Dict, Any, List, Optional
from datetime import datetime

# Constantes de Controle ESC/POS (Bytes Hexadecimais)
ESC = b'\x1b'
GS = b'\x1d'

# Comandos de Inicialização e Alinhamento
INIT_PRINTER = ESC + b'@'
ALIGN_LEFT = ESC + b'a\x00'
ALIGN_CENTER = ESC + b'a\x01'
ALIGN_RIGHT = ESC + b'a\x02'

# Modos de Texto
TEXT_NORMAL = ESC + b'!\x00'
TEXT_BOLD = ESC + b'!\x08'
TEXT_DOUBLE_HEIGHT = ESC + b'!\x10'
TEXT_DOUBLE_WIDTH = ESC + b'!\x20'
TEXT_LARGE = ESC + b'!\x30'

# Corte de Papel
FEED_AND_CUT = GS + b'V\x41\x03'


class ESCPOSReceiptBuilder:
    """
    Construtor agnóstico de comandas térmicas formatadas para o padrão ESC/POS.
    Pode gerar tanto o stream de bytes para envio direto a portas de impressão
    quanto texto estruturado formatado com largura de 32 (58mm) ou 48 (80mm) colunas.
    """

    def __init__(self, width: int = 48):
        """
        :param width: 32 para bobinas de 58mm, 48 para bobinas de 80mm.
        """
        self.width = width
        self.buffer = bytearray()
        self.text_lines: List[str] = []

    def add_line(self, text: str = "") -> "ESCPOSReceiptBuilder":
        self.text_lines.append(text)
        return self

    def add_separator(self, char: str = "-") -> "ESCPOSReceiptBuilder":
        self.text_lines.append(char * self.width)
        return self

    def add_columns(self, left: str, right: str) -> "ESCPOSReceiptBuilder":
        space = self.width - len(left) - len(right)
        if space < 1:
            space = 1
        line = f"{left}{' ' * space}{right}"
        self.text_lines.append(line[:self.width])
        return self

    def build_text(self) -> str:
        return "\n".join(self.text_lines)

    @staticmethod
    def format_pedido_comanda(pedido: Dict[str, Any], width: int = 48) -> str:
        """
        Gera o layout textual da comanda de delivery/balcão para impressão.
        """
        builder = ESCPOSReceiptBuilder(width=width)
        tipo = (pedido.get("tipo_pedido") or "BALCAO").upper()
        numero = pedido.get("id", 0)
        data_str = pedido.get("data", datetime.now().strftime("%d/%m/%Y"))
        hora_str = pedido.get("hora", datetime.now().strftime("%H:%M"))

        builder.add_separator("=")
        builder.add_line(f"*** PEDIDO #{numero} - {tipo} ***".center(width))
        builder.add_separator("=")
        builder.add_columns(f"Data: {data_str}", f"Hora: {hora_str}")
        
        # Dados do Cliente
        cliente_nome = pedido.get("cliente_nome") or "Consumidor Final"
        builder.add_line(f"Cliente: {cliente_nome}")
        
        if pedido.get("cliente_telefone"):
            builder.add_line(f"WhatsApp: {pedido['cliente_telefone']}")
            
        if tipo == "DELIVERY":
            endereco = pedido.get("endereco_entrega") or pedido.get("cliente_endereco") or "Retirada"
            builder.add_line(f"Endereço: {endereco}")
            if pedido.get("regiao_nome"):
                builder.add_line(f"Região/Bairro: {pedido['regiao_nome']}")
            if pedido.get("motoboy_nome"):
                builder.add_line(f"Motoboy: {pedido['motoboy_nome']}")
                
        builder.add_separator("-")
        builder.add_line("ITENS DO PEDIDO:")
        
        itens = pedido.get("itens", [])
        for item in itens:
            qtd = item.get("quantidade", 1)
            prod = item.get("produto_nome", "Produto")
            total = item.get("total_item", 0.0)
            builder.add_columns(f"{qtd}x {prod[:width - 15]}", f"R$ {total:.2f}")

        builder.add_separator("-")
        subtotal = pedido.get("subtotal", pedido.get("valor_total", 0.0))
        builder.add_columns("Subtotal Itens:", f"R$ {subtotal:.2f}")
        
        taxa = pedido.get("taxa_entrega", 0.0)
        if taxa > 0:
            builder.add_columns("Taxa de Entrega:", f"R$ {taxa:.2f}")
            
        total_final = pedido.get("valor_total", subtotal + taxa)
        builder.add_columns("TOTAL GERAL:", f"R$ {total_final:.2f}")
        builder.add_columns("Pagamento:", str(pedido.get("forma_pagamento", "PENDENTE")).upper())
        
        if pedido.get("observacoes"):
            builder.add_separator(".")
            builder.add_line(f"OBS: {pedido['observacoes']}")
            
        builder.add_separator("=")
        builder.add_line("SISTEMA GESTOR MEI".center(width))
        builder.add_separator("=")
        builder.add_line("\n\n")  # Avanço para corte de papel
        
        return builder.build_text()
