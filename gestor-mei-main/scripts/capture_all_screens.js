const fs = require('fs');
const path = require('path');

const PORT = 9222;
const ASSETS_DIR = 'C:/Users/LeonidasPaulino/Downloads/gestor-mei-main/gestor-mei-main/docs/manual_assets';
if (!fs.existsSync(ASSETS_DIR)) fs.mkdirSync(ASSETS_DIR, { recursive: true });

async function apiLogin(email, password) {
  const res = await fetch('http://127.0.0.1:8001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  const meRes = await fetch('http://127.0.0.1:8001/api/auth/me', {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });
  const me = await meRes.json();
  return {
    token: data.access_token,
    user: me.user,
    empresa: me.empresa,
  };
}

const SCREENS = [
  { id: 1, url: 'http://localhost:5173/login', file: 'figura_01_login.png', role: 'none', wait: 1200 },
  { id: 2, url: 'http://localhost:5173/', file: 'figura_02_dashboard.png', role: 'admin', wait: 2000 },
  { id: 3, url: 'http://localhost:5173/clientes', file: 'figura_03_clientes.png', role: 'admin', wait: 1500 },
  { id: 4, url: 'http://localhost:5173/produtos', file: 'figura_04_produtos.png', role: 'admin', wait: 1500 },
  { id: 5, url: 'http://localhost:5173/estoque', file: 'figura_05_estoque.png', role: 'admin', wait: 1800 },
  { id: 6, url: 'http://localhost:5173/compras', file: 'figura_06_compras.png', role: 'admin', wait: 1800 },
  { id: 7, url: 'http://localhost:5173/nfe', file: 'figura_07_xml_nfe.png', role: 'admin', wait: 1800 },
  { id: 8, url: 'http://localhost:5173/das', file: 'figura_08_controle_das.png', role: 'admin', wait: 1800 },
  { id: 9, url: 'http://localhost:5173/relatorio-mei', file: 'figura_09_relatorio_mei.png', role: 'admin', wait: 2000 },
  { id: 10, url: 'http://localhost:5173/pedidos-entrega', file: 'figura_10_delivery.png', role: 'admin', wait: 1800 },
  { id: 11, url: 'http://localhost:5173/motoboys', file: 'figura_11_motoboys.png', role: 'admin', wait: 1500 },
  { id: 12, url: 'http://localhost:5173/consultor', file: 'figura_12_painel_consultor.png', role: 'consultor', wait: 2200 },
  { id: 13, url: 'http://localhost:5173/configuracoes', file: 'figura_13_configuracoes.png', role: 'admin', wait: 1500 },
];

async function run() {
  console.log('1. Authenticating test accounts...');
  const adminAuth = await apiLogin('admin@gestormei.com.br', 'admin123');
  const consultorAuth = await apiLogin('consultor@lptitech.com.br', 'consultor123');
  console.log('Admin authenticated:', adminAuth.user.nome);
  console.log('Consultor authenticated:', consultorAuth.user.nome);

  console.log('2. Connecting to Chrome CDP on port 9222...');
  const tabsRes = await fetch(`http://127.0.0.1:${PORT}/json/list`);
  const tabs = await tabsRes.json();
  const pageTab = tabs.find((t) => t.type === 'page');
  if (!pageTab) throw new Error('No page tab found in Chrome!');

  console.log('Using target tab:', pageTab.id, pageTab.title, pageTab.url);
  const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve);
    ws.addEventListener('error', reject);
  });

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
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1.25,
    mobile: false,
  });

  let currentRole = null;

  for (const s of SCREENS) {
    console.log(`Processing Screen ${s.id}: ${s.file} (${s.url})...`);

    // Handle authentication change
    if (s.role !== currentRole) {
      if (s.role === 'none') {
        await send('Page.navigate', { url: 'http://localhost:5173/login' });
        await new Promise((r) => setTimeout(r, 600));
        await send('Runtime.evaluate', {
          expression: `localStorage.clear();`,
        });
      } else {
        const auth = s.role === 'admin' ? adminAuth : consultorAuth;
        // Make sure we are on localhost before touching localStorage
        await send('Page.navigate', { url: 'http://localhost:5173/' });
        await new Promise((r) => setTimeout(r, 600));
        await send('Runtime.evaluate', {
          expression: `
            localStorage.setItem('gestor_mei_token', '${auth.token}');
            localStorage.setItem('gestor_mei_user', JSON.stringify(${JSON.stringify(auth.user)}));
            localStorage.setItem('gestor_mei_empresa', JSON.stringify(${JSON.stringify(auth.empresa)}));
          `,
        });
      }
      currentRole = s.role;
    }

    // Navigate to target screen
    await send('Page.navigate', { url: s.url });
    // Wait for data and UI to render
    await new Promise((r) => setTimeout(r, s.wait));

    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const b64 = shot.data || (shot.result && shot.result.data);
    const buf = Buffer.from(b64, 'base64');
    const outFile = path.join(ASSETS_DIR, s.file);
    fs.writeFileSync(outFile, buf);
    console.log(`-> Saved ${s.file}: ${buf.length} bytes`);
  }

  ws.close();
  console.log('ALL 13 SCREENS CAPTURED AND SAVED SUCCESSFULLY!');
}

run().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
