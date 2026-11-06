"""
Serviço de Otimização e Compressão de Imagens — Gestor MEI
Converte automaticamente fotos de produtos e logotipos para WebP de alta eficiência,
aplica correção de orientação EXIF (para fotos de celular) e redimensiona mantendo proporção.
"""

import io
import logging
from typing import Tuple, Optional
from PIL import Image, ImageOps

logger = logging.getLogger("gestor_mei.image_service")

ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/jfif": ".jpg",
    "image/pjpeg": ".jpg",
}

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB máximo antes da compressão


def validate_image_upload(content: bytes, content_type: Optional[str] = None) -> Tuple[bool, str]:
    """
    Valida se os bytes correspondem a uma imagem válida e suportada.
    """
    if len(content) > MAX_FILE_SIZE_BYTES:
        return False, "O arquivo excede o limite máximo permitido de 10 MB."

    if len(content) == 0:
        return False, "O arquivo enviado está vazio."

    try:
        with Image.open(io.BytesIO(content)) as img:
            img.verify()
    except Exception as e:
        logger.warning(f"[IMAGE SERVICE] Arquivo inválido ou corrompido: {e}")
        return False, "O arquivo enviado não é uma imagem válida ou está corrompido."

    return True, "Imagem válida."


def optimize_and_convert_to_webp(
    image_bytes: bytes,
    max_size: Tuple[int, int] = (800, 800),
    quality: int = 85
) -> Tuple[bytes, str]:
    """
    Processa, redimensiona e converte qualquer imagem para WebP de alta eficiência.
    
    1. Corrige orientação EXIF (fotos de smartphone).
    2. Preserva transparência em imagens PNG/RGBA ou converte para RGB limpo.
    3. Redimensiona proporcionalmente se exceder max_size usando filtro Lanczos.
    4. Comprime para formato WebP com qualidade otimizada (85).
    
    Retorna (webp_bytes, "image/webp").
    """
    try:
        with Image.open(io.BytesIO(image_bytes)) as img:
            # 1. Corrige rotação baseada em metadados EXIF
            try:
                img = ImageOps.exif_transpose(img)
            except Exception as e:
                logger.debug(f"[IMAGE SERVICE] EXIF transpose não aplicado: {e}")

            # 2. Tratamento de canais de cor
            if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
                # Preserva transparência para PNGs / WebPs com canal Alpha
                processed_img = img.convert("RGBA")
            elif img.mode == "CMYK":
                # Converte fotos em formato gráfico de impressão CMYK para RGB
                processed_img = img.convert("RGB")
            elif img.mode != "RGB":
                processed_img = img.convert("RGB")
            else:
                processed_img = img

            # 3. Redimensionamento proporcional se exceder os limites
            orig_w, orig_h = processed_img.size
            max_w, max_h = max_size

            if orig_w > max_w or orig_h > max_h:
                processed_img.thumbnail((max_w, max_h), Image.Resampling.LANCZOS)
                logger.info(
                    f"[IMAGE SERVICE] Imagem redimensionada de {orig_w}x{orig_h} "
                    f"para {processed_img.size[0]}x{processed_img.size[1]}"
                )

            # 4. Salva em buffer WebP
            output_buffer = io.BytesIO()
            processed_img.save(
                output_buffer,
                format="WEBP",
                quality=quality,
                method=6,
                optimize=True
            )
            webp_bytes = output_buffer.getvalue()

            reducao_pct = (1.0 - (len(webp_bytes) / len(image_bytes))) * 100
            logger.info(
                f"[IMAGE SERVICE] Imagem comprimida para WebP: "
                f"{len(image_bytes)} bytes -> {len(webp_bytes)} bytes "
                f"({reducao_pct:.1f}% de economia)"
            )

            return webp_bytes, "image/webp"

    except Exception as e:
        logger.error(f"[IMAGE SERVICE] Falha ao converter imagem para WebP: {e}")
        raise ValueError(f"Não foi possível processar a imagem: {str(e)}")
