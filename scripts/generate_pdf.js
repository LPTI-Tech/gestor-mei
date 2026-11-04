const fs = require('fs');
const path = require('path');

const PORT = 9222;
const BASE_DIR = 'C:/Users/LeonidasPaulino/Downloads/gestor-mei-main/gestor-mei-main';
const ASSETS_DIR = path.join(BASE_DIR, 'docs/manual_assets');
const MD_PATH = path.join(BASE_DIR, 'MANUAL_DO_USUARIO_GESTOR_MEI_v1.4.0.md');
const HTML_PATH = path.join(BASE_DIR, 'manual_print.html');
const PDF_PATH = path.join(BASE_DIR, 'MANUAL_DO_USUARIO_GESTOR_MEI_v1.4.0.pdf');

// Read markdown
let md = fs.readFileSync(MD_PATH, 'utf8');

// Convert markdown to clean HTML
function mdToHtml(text) {
  // Replace images with base64 embedded data URI
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
    const filename = path.basename(src);
    const imgPath = path.join(ASSETS_DIR, filename);
    if (fs.existsSync(imgPath)) {
      const b64 = fs.readFileSync(imgPath).toString('base64');
      return `
        <div class="figure-container">
          <img src="data:image/png;base64,${b64}" alt="${alt}" class="manual-img" />
          <div class="figure-caption">${alt}</div>
        </div>
      `;
    }
    return match;
  });

  // Headers with IDs
  text = text.replace(/^# (.*$)/gim, '<h1 id="$1">$1</h1>');
  text = text.replace(/^## (.*$)/gim, '<h2 id="$1">$1</h2>');
  text = text.replace(/^### (.*$)/gim, '<h3 id="$1">$1</h3>');

  // Blockquotes and Alerts
  text = text.replace(/^> \[!TIP\]\s*(.*$)/gim, '<div class="alert alert-tip"><strong>💡 Dica Prática:</strong> $1</div>');
  text = text.replace(/^> \[!IMPORTANT\]\s*(.*$)/gim, '<div class="alert alert-important"><strong>⚠️ Importante:</strong> $1</div>');
  text = text.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');

  // Bold & Italic
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Code blocks
  text = text.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Horizontal rules
  text = text.replace(/^---$/gim, '<hr />');

  // Tables
  const lines = text.split('\n');
  let inTable = false;
  let tableHtml = '';
  let finalLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      if (!inTable) {
        inTable = true;
        tableHtml = '<table class="styled-table">';
        const headers = line.split('|').slice(1, -1).map(c => `<th>${c.trim()}</th>`).join('');
        tableHtml += `<thead><tr>${headers}</tr></thead><tbody>`;
        // skip separator line if next
        if (i + 1 < lines.length && lines[i + 1].includes('---')) {
          i++;
        }
      } else {
        const cells = line.split('|').slice(1, -1).map(c => `<td>${c.trim()}</td>`).join('');
        tableHtml += `<tr>${cells}</tr>`;
      }
    } else {
      if (inTable) {
        tableHtml += '</tbody></table>';
        finalLines.push(tableHtml);
        inTable = false;
        tableHtml = '';
      }
      finalLines.push(line);
    }
  }
  if (inTable) {
    tableHtml += '</tbody></table>';
    finalLines.push(tableHtml);
  }

  // Lists
  let processed = [];
  let inList = false;
  for (const l of finalLines) {
    if (l.startsWith('- ') || l.startsWith('* ')) {
      if (!inList) {
        inList = true;
        processed.push('<ul>');
      }
      processed.push(`<li>${l.substring(2)}</li>`);
    } else {
      if (inList) {
        processed.push('</ul>');
        inList = false;
      }
      if (l.trim() && !l.startsWith('<h') && !l.startsWith('<table') && !l.startsWith('<pre') && !l.startsWith('<div') && !l.startsWith('<hr') && !l.startsWith('<block')) {
        processed.push(`<p>${l}</p>`);
      } else {
        processed.push(l);
      }
    }
  }
  if (inList) processed.push('</ul>');

  return processed.join('\n');
}

const htmlBody = mdToHtml(md);

const fullHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Manual do Usuário — GESTOR MEI v1.4.0</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

    @page {
      size: A4;
      margin: 20mm 15mm 20mm 15mm;
      @bottom-right {
        content: counter(page);
      }
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1e293b;
      line-height: 1.6;
      font-size: 13.5px;
      margin: 0;
      padding: 0;
    }

    h1 {
      font-size: 26px;
      font-weight: 800;
      color: #0f172a;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 8px;
      margin-top: 36px;
      margin-bottom: 16px;
      page-break-after: avoid;
    }

    h2 {
      font-size: 20px;
      font-weight: 700;
      color: #1e3a8a;
      margin-top: 28px;
      margin-bottom: 12px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
      page-break-after: avoid;
    }

    h3 {
      font-size: 16px;
      font-weight: 600;
      color: #334155;
      margin-top: 20px;
      margin-bottom: 10px;
      page-break-after: avoid;
    }

    p {
      margin-bottom: 12px;
      text-align: justify;
    }

    .figure-container {
      margin: 20px 0;
      text-align: center;
      page-break-inside: avoid;
    }

    .manual-img {
      max-width: 96%;
      height: auto;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
      border: 1px solid #cbd5e1;
    }

    .figure-caption {
      font-size: 11.5px;
      color: #64748b;
      font-style: italic;
      margin-top: 6px;
      font-weight: 500;
    }

    .styled-table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      font-size: 12px;
      page-break-inside: avoid;
    }

    .styled-table th {
      background-color: #f1f5f9;
      color: #0f172a;
      font-weight: 600;
      text-align: left;
      padding: 8px 10px;
      border: 1px solid #cbd5e1;
    }

    .styled-table td {
      padding: 8px 10px;
      border: 1px solid #e2e8f0;
      vertical-align: top;
    }

    .styled-table tr:nth-child(even) {
      background-color: #f8fafc;
    }

    .alert {
      padding: 12px 16px;
      border-radius: 6px;
      margin: 16px 0;
      font-size: 12.5px;
      page-break-inside: avoid;
    }

    .alert-tip {
      background-color: #eff6ff;
      border-left: 4px solid #3b82f6;
      color: #1e40af;
    }

    .alert-important {
      background-color: #fef2f2;
      border-left: 4px solid #ef4444;
      color: #991b1b;
    }

    pre {
      background-color: #0f172a;
      color: #f8fafc;
      padding: 12px 16px;
      border-radius: 6px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      overflow-x: auto;
      page-break-inside: avoid;
    }

    code {
      font-family: 'JetBrains Mono', monospace;
      background-color: #f1f5f9;
      color: #be185d;
      padding: 2px 4px;
      border-radius: 4px;
      font-size: 11.5px;
    }

    ul, ol {
      margin-top: 4px;
      margin-bottom: 12px;
      padding-left: 24px;
    }

    li {
      margin-bottom: 4px;
    }

    blockquote {
      border-left: 4px solid #94a3b8;
      padding-left: 12px;
      margin-left: 0;
      color: #475569;
      font-style: italic;
    }

    hr {
      border: none;
      border-top: 1px solid #e2e8f0;
      margin: 24px 0;
    }
  </style>
</head>
<body>
  ${htmlBody}
</body>
</html>`;

fs.writeFileSync(HTML_PATH, fullHtml, 'utf8');
console.log('manual_print.html generated successfully!');

async function printPdf() {
  console.log('Connecting to Chrome CDP for PDF generation...');
  const tabsRes = await fetch(`http://127.0.0.1:${PORT}/json/list`);
  const tabs = await tabsRes.json();
  const pageTab = tabs.find((t) => t.type === 'page');
  const ws = new WebSocket(pageTab.webSocketDebuggerUrl);

  await new Promise((resolve) => ws.addEventListener('open', resolve));

  let msgId = 1;
  function send(method, params = {}) {
    return new Promise((resolve) => {
      const id = msgId++;
      function handler(event) {
        const data = JSON.parse(event.data);
        if (data.id === id) {
          ws.removeEventListener('message', handler);
          resolve(data.result);
        }
      }
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await send('Page.enable');
  const fileUrl = 'file:///' + HTML_PATH.replace(/\\\\/g, '/');
  console.log('Navigating to:', fileUrl);
  await send('Page.navigate', { url: fileUrl });
  await new Promise((r) => setTimeout(r, 2500));

  console.log('Printing to PDF with high-fidelity Chrome engine...');
  const pdfRes = await send('Page.printToPDF', {
    landscape: false,
    displayHeaderFooter: true,
    printBackground: true,
    paperWidth: 8.27,
    paperHeight: 11.69,
    marginTop: 0.7,
    marginBottom: 0.7,
    marginLeft: 0.6,
    marginRight: 0.6,
    headerTemplate: '<div style="font-size:8px; font-family: sans-serif; text-align:right; width:100%; color:#94a3b8; padding-right:15mm;">GESTOR MEI v1.4.0 — Manual Oficial &nbsp;|&nbsp; LPTI Tech</div>',
    footerTemplate: '<div style="font-size:8px; font-family: sans-serif; text-align:center; width:100%; color:#64748b;">Página <span class="pageNumber"></span> de <span class="totalPages"></span></div>',
  });

  const pdfBuf = Buffer.from(pdfRes.data, 'base64');
  fs.writeFileSync(PDF_PATH, pdfBuf);
  console.log(`PDF GENERATED SUCCESSFULLY! Path: ${PDF_PATH} (${pdfBuf.length} bytes)`);
  ws.close();
}

printPdf().catch((err) => {
  console.error('PDF generation error:', err);
  process.exit(1);
});

