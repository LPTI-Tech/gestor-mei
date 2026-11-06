import api from './api';

/**
 * Realiza o download ou visualização segura e autenticada de comprovantes
 * via Axios com cabeçalho Authorization: Bearer e conversão em Blob URL local.
 */
export async function downloadComprovanteAutenticado(
  url: string,
  filename?: string
): Promise<void> {
  if (!url) return;

  // Normaliza a URL para chamar a rota autenticada da API
  let targetUrl = url;
  if (targetUrl.startsWith('/uploads/comprovantes/')) {
    const fn = targetUrl.replace('/uploads/comprovantes/', '');
    targetUrl = `/compras/comprovantes/${fn}`;
  } else if (targetUrl.startsWith('/api/compras/comprovantes/')) {
    targetUrl = targetUrl.replace('/api', '');
  }

  try {
    const response = await api.get(targetUrl, {
      responseType: 'blob',
    });

    const rawContentType = response.headers['content-type'];
    const contentType: string = typeof rawContentType === 'string' ? rawContentType : 'application/octet-stream';
    const blob = new Blob([response.data], { type: contentType });
    const blobUrl = window.URL.createObjectURL(blob);

    // Se for PDF ou imagem e o usuário apenas deseja visualizar:
    const isViewable = contentType.includes('pdf') || contentType.startsWith('image/');
    if (isViewable && !filename) {
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
    } else {
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename || 'comprovante';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    // Libera o recurso de memória do navegador após 60 segundos
    setTimeout(() => {
      window.URL.revokeObjectURL(blobUrl);
    }, 60000);
  } catch (error) {
    console.error('Erro ao carregar comprovante protegido:', error);
    throw error;
  }
}
