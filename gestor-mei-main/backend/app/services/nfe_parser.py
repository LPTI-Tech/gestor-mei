import xml.etree.ElementTree as ET
from typing import Dict, Any, List, Optional


class NfeParserError(ValueError):
    """Exceção levantada quando o arquivo XML não é uma NF-e válida."""
    pass


def parse_nfe_xml(xml_content: str | bytes) -> Dict[str, Any]:
    """
    Realiza o parsing seguro de arquivo XML de NF-e (Modelo 55 - SEFAZ).
    Remove namespaces para facilitar navegação e extrai cabeçalho,
    fornecedor emitente, destinatário e itens faturados.
    """
    if isinstance(xml_content, str):
        xml_bytes = xml_content.encode("utf-8")
    else:
        xml_bytes = xml_content

    try:
        root = ET.fromstring(xml_bytes)
    except ET.ParseError as e:
        raise NfeParserError(f"Arquivo XML corrompido ou inválido: {str(e)}")

    # Remove namespaces para simplificar a busca por tags
    for elem in root.iter():
        if "}" in elem.tag:
            elem.tag = elem.tag.split("}", 1)[1]

    # Localiza o nó infNFe (pode estar em nfeProc/NFe/infNFe ou NFe/infNFe ou infNFe direto)
    inf_nfe = root.find(".//infNFe")
    if inf_nfe is None:
        raise NfeParserError("O arquivo enviado não é um XML de NF-e válido (tag <infNFe> não encontrada).")

    # Chave de Acesso
    raw_id = inf_nfe.attrib.get("Id", "")
    chave_acesso = raw_id.replace("NFe", "").strip()

    # <ide>
    ide = inf_nfe.find("ide")
    if ide is None:
        raise NfeParserError("Tag <ide> de identificação da NF-e não encontrada.")

    numero_nota = ide.findtext("nNF", "").strip()
    serie = ide.findtext("serie", "").strip()
    data_emissao = ide.findtext("dhEmi", ide.findtext("dEmi", "")).strip()

    # <emit> Fornecedor
    emit = inf_nfe.find("emit")
    if emit is None:
        raise NfeParserError("Tag <emit> de identificação do fornecedor não encontrada.")

    cnpj_emitente = emit.findtext("CNPJ", "").strip()
    nome_emitente = emit.findtext("xNome", "").strip()
    fantasia_emitente = emit.findtext("xFant", "").strip()
    ie_emitente = emit.findtext("IE", "").strip()
    
    ender_emit = emit.find("enderEmit")
    uf_emitente = ender_emit.findtext("UF", "").strip() if ender_emit is not None else emit.findtext("UF", "").strip()

    # <dest> Destinatário
    dest = inf_nfe.find("dest")
    cnpj_destinatario = ""
    if dest is not None:
        cnpj_destinatario = dest.findtext("CNPJ", dest.findtext("CPF", "")).strip()

    # <total> / <ICMSTot>
    total_node = inf_nfe.find(".//ICMSTot")
    valor_total_nota = 0.0
    if total_node is not None:
        try:
            valor_total_nota = float(total_node.findtext("vNF", "0.0").replace(",", "."))
        except ValueError:
            valor_total_nota = 0.0

    # <det> Itens da Nota
    itens: List[Dict[str, Any]] = []
    det_list = inf_nfe.findall(".//det")

    for idx, det in enumerate(det_list, start=1):
        num_item = int(det.attrib.get("nItem", str(idx)))
        prod = det.find("prod")
        if prod is None:
            continue

        codigo = prod.findtext("cProd", "").strip()
        descricao = prod.findtext("xProd", "").strip()
        ean = prod.findtext("cEAN", "").strip()
        if ean.upper() in ["SEM GTIN", "SEMGTIN"]:
            ean = ""
        ncm = prod.findtext("NCM", "").strip()
        cfop = prod.findtext("CFOP", "").strip()
        unidade = prod.findtext("uCom", "UN").strip().upper()

        try:
            quantidade = float(prod.findtext("qCom", "0").replace(",", "."))
        except ValueError:
            quantidade = 0.0

        try:
            valor_unitario = float(prod.findtext("vUnCom", "0").replace(",", "."))
        except ValueError:
            valor_unitario = 0.0

        try:
            valor_total = float(prod.findtext("vProd", "0").replace(",", "."))
        except ValueError:
            valor_total = round(quantidade * valor_unitario, 2)

        itens.append({
            "numero_item": num_item,
            "codigo_fornecedor": codigo,
            "descricao_fornecedor": descricao,
            "ean": ean or None,
            "ncm": ncm or None,
            "cfop": cfop or None,
            "unidade_comercial": unidade,
            "quantidade_comercial": quantidade,
            "valor_unitario": valor_unitario,
            "valor_total": valor_total,
        })

    return {
        "chave_acesso": chave_acesso,
        "numero_nota": numero_nota,
        "serie": serie,
        "data_emissao": data_emissao,
        "valor_total": valor_total_nota,
        "fornecedor": {
            "cnpj": cnpj_emitente,
            "nome": nome_emitente,
            "nome_fantasia": fantasia_emitente or None,
            "uf": uf_emitente or None,
            "ie": ie_emitente or None,
        },
        "destinatario_cnpj": cnpj_destinatario or None,
        "itens": itens,
    }

