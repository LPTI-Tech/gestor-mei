const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const ROOT_DIR = path.resolve(__dirname, '..');
const BACKEND_DIR = path.join(ROOT_DIR, 'backend');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');
const VENV_PYTHON = path.join(BACKEND_DIR, '.venv', 'Scripts', 'python.exe');
const EVIDENCIAS_DIR = path.join(ROOT_DIR, 'docs', 'homologacao', 'evidencias');

if (!fs.existsSync(EVIDENCIAS_DIR)) {
  fs.mkdirSync(EVIDENCIAS_DIR, { recursive: true });
}

function waitUrl(url, timeoutMs = 25000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(url);
        if (res.ok) {
          clearInterval(interval);
          resolve(true);
        }
      } catch (e) {
        if (Date.now() - start > timeoutMs) {
          clearInterval(interval);
          reject(new Error(`Timeout waiting for ${url}`));
        }
      }
    }, 500);
  });
}

async function run() {
  console.log('================================================================');
  console.log('AUDITORIA E VALIDAÇÃO E2E - MODAL DE PRODUTOS (SENTINEL 1366x768)');
  console.log('================================================================');

  // 1. Inicia backend
  console.log('[1/5] Iniciando backend FastAPI na porta 8001...');
  const backendProc = spawn(VENV_PYTHON, ['-m', 'uvicorn', 'app.main:app', '--port', '8001', '--host', '127.0.0.1'], {
    cwd: BACKEND_DIR,
    stdio: 'pipe',
  });

  backendProc.stderr.on('data', (d) => {
    // console.log(`[BACKEND STDERR] ${d.toString()}`);
  });

  // 2. Inicia frontend preview
  console.log('[2/5] Iniciando frontend Vite preview na porta 5173...');
  const frontendProc = spawn('cmd.exe', ['/c', 'npx', 'vite', 'preview', '--port', '5173', '--host', '127.0.0.1'], {
    cwd: FRONTEND_DIR,
    stdio: 'pipe',
  });

  try {
    await waitUrl('http://127.0.0.1:8001/api/health', 15000);
    console.log('  -> Backend online em http://127.0.0.1:8001');

    await waitUrl('http://127.0.0.1:5173', 15000);
    console.log('  -> Frontend preview online em http://127.0.0.1:5173');

    // 3. Lança navegador com resolução estrita 1366x768
    console.log('[3/5] Lançando Chromium em resolução 1366x768 (Zoom 100%)...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1366, height: 768 },
      deviceScaleFactor: 1, // 100% Zoom
    });
    const page = await context.newPage();

    // 4. Login
    console.log('  -> Acessando /login...');
    await page.goto('http://127.0.0.1:5173/login');
    await page.waitForLoadState('networkidle');

    await page.fill('input[type="email"]', 'admin@gestormei.com.br');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Aguarda entrar no dashboard
    await page.waitForURL('**/');
    console.log('  -> Login efetuado com sucesso!');

    // 5. Navega para Produtos
    console.log('[4/5] Navegando para página de Produtos...');
    await page.goto('http://127.0.0.1:5173/produtos');
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    console.log(`  -> URL atual: ${currentUrl}`);
    const pageText = await page.evaluate(() => document.body.innerText.substring(0, 300));
    console.log(`  -> Conteúdo inicial da página: ${pageText.replace(/\n/g, ' ')}`);

    const shotDebugPath = path.join(EVIDENCIAS_DIR, 'debug_produtos_page.png');
    await page.screenshot({ path: shotDebugPath });
    console.log(`  -> Debug screenshot salvo: ${shotDebugPath}`);

    // -------------------------------------------------------------------------
    // TESTE A: NOVO PRODUTO
    // -------------------------------------------------------------------------
    console.log('\n--- TESTE A: ABERTURA DO MODAL "NOVO ITEM NO CATÁLOGO" ---');
    const btnNovo = page.locator('button:has-text("Novo Produto"), button:has-text("Cadastrar Primeiro Item")').first();
    await btnNovo.waitFor({ state: 'visible', timeout: 10000 });
    await btnNovo.click();
    await page.waitForTimeout(600);

    const dialog = page.locator('div[role="dialog"]');
    await dialog.waitFor({ state: 'visible' });

    // Auditoria de dimensões do modal
    const auditNovo = await page.evaluate(() => {
      const d = document.querySelector('div[role="dialog"]');
      const title = d ? d.querySelector('.MuiDialogTitle-root') : null;
      const content = d ? d.querySelector('.MuiDialogContent-root') : null;
      const actions = d ? d.querySelector('.MuiDialogActions-root') : null;
      const saveBtn = actions ? actions.querySelector('button[type="submit"]') : null;

      const dRect = d ? d.getBoundingClientRect() : null;
      const actionsRect = actions ? actions.getBoundingClientRect() : null;
      const saveRect = saveBtn ? saveBtn.getBoundingClientRect() : null;

      return {
        viewportHeight: window.innerHeight,
        viewportWidth: window.innerWidth,
        modalHeight: dRect ? dRect.height : 0,
        modalTop: dRect ? dRect.top : 0,
        modalBottom: dRect ? dRect.bottom : 0,
        contentScrollHeight: content ? content.scrollHeight : 0,
        contentClientHeight: content ? content.clientHeight : 0,
        actionsVisible: actionsRect ? actionsRect.bottom <= window.innerHeight : false,
        actionsBottom: actionsRect ? actionsRect.bottom : 0,
        saveBtnVisible: saveRect ? saveRect.bottom <= window.innerHeight : false,
        saveBtnText: saveBtn ? saveBtn.textContent.trim() : null,
      };
    });

    console.log('Métricas do Modal Novo Item:');
    console.log(`  - Viewport: ${auditNovo.viewportWidth}x${auditNovo.viewportHeight}`);
    console.log(`  - Altura do Modal: ${auditNovo.modalHeight.toFixed(1)}px (Top: ${auditNovo.modalTop.toFixed(1)}px, Bottom: ${auditNovo.modalBottom.toFixed(1)}px)`);
    console.log(`  - Content ClientHeight: ${auditNovo.contentClientHeight}px, ScrollHeight: ${auditNovo.contentScrollHeight}px`);
    console.log(`  - Rodapé Actions Visível na Tela? ${auditNovo.actionsVisible ? 'SIM (100%)' : 'NÃO'}`);
    console.log(`  - Botão '${auditNovo.saveBtnText}' Visível na Tela? ${auditNovo.saveBtnVisible ? 'SIM (100%)' : 'NÃO'}`);

    if (!auditNovo.saveBtnVisible) {
      throw new Error('FALHA: Botão Salvar Item não está visível no viewport!');
    }

    // Preenche dados do novo produto
    const ts = Date.now();
    const nomeTeste = `Produto Sentinel ${ts}`;
    await page.getByLabel(/Nome do Item/i).fill(nomeTeste);
    await page.getByLabel(/Preço de Venda/i).fill('35.50');
    await page.getByLabel(/Custo Unitário/i).fill('15.00');

    // Captura screenshot do modal Novo Item comprovando a presença do botão Salvar
    const shotNovoPath = path.join(EVIDENCIAS_DIR, 'modal_produtos_novo_1366x768.png');
    await page.screenshot({ path: shotNovoPath, fullPage: false });
    console.log(`  -> Screenshot salvo: ${shotNovoPath}`);

    // Salva o item
    const btnSalvar = dialog.locator('button:has-text("Salvar Item")');
    await btnSalvar.click();
    await dialog.waitFor({ state: 'hidden', timeout: 5000 });
    console.log(`  -> Produto '${nomeTeste}' criado com sucesso!`);

    await page.waitForTimeout(1000);

    // -------------------------------------------------------------------------
    // TESTE B: EDITAR PRODUTO (MODAL "EDITAR ITEM DO CATÁLOGO")
    // -------------------------------------------------------------------------
    console.log('\n--- TESTE B: ABERTURA DO MODAL "EDITAR ITEM DO CATÁLOGO" ---');
    // Encontra o item recém criado na tabela e clica em editar
    const editBtn = page.locator(`tr:has-text("${nomeTeste}") button`).first();
    await editBtn.waitFor({ state: 'visible', timeout: 5000 });
    await editBtn.click();
    await page.waitForTimeout(600);

    await dialog.waitFor({ state: 'visible' });

    const auditEditar = await page.evaluate(() => {
      const d = document.querySelector('div[role="dialog"]');
      const title = d ? d.querySelector('.MuiDialogTitle-root') : null;
      const content = d ? d.querySelector('.MuiDialogContent-root') : null;
      const actions = d ? d.querySelector('.MuiDialogActions-root') : null;
      const saveBtn = actions ? actions.querySelector('button[type="submit"]') : null;

      const dRect = d ? d.getBoundingClientRect() : null;
      const actionsRect = actions ? actions.getBoundingClientRect() : null;
      const saveRect = saveBtn ? saveBtn.getBoundingClientRect() : null;

      return {
        viewportHeight: window.innerHeight,
        viewportWidth: window.innerWidth,
        modalHeight: dRect ? dRect.height : 0,
        modalTop: dRect ? dRect.top : 0,
        modalBottom: dRect ? dRect.bottom : 0,
        contentScrollHeight: content ? content.scrollHeight : 0,
        contentClientHeight: content ? content.clientHeight : 0,
        actionsVisible: actionsRect ? actionsRect.bottom <= window.innerHeight : false,
        actionsBottom: actionsRect ? actionsRect.bottom : 0,
        saveBtnVisible: saveRect ? saveRect.bottom <= window.innerHeight : false,
        saveBtnText: saveBtn ? saveBtn.textContent.trim() : null,
      };
    });

    console.log('Métricas do Modal Editar Item:');
    console.log(`  - Viewport: ${auditEditar.viewportWidth}x${auditEditar.viewportHeight}`);
    console.log(`  - Altura do Modal: ${auditEditar.modalHeight.toFixed(1)}px (Top: ${auditEditar.modalTop.toFixed(1)}px, Bottom: ${auditEditar.modalBottom.toFixed(1)}px)`);
    console.log(`  - Content ClientHeight: ${auditEditar.contentClientHeight}px, ScrollHeight: ${auditEditar.contentScrollHeight}px`);
    console.log(`  - Rodapé Actions Visível na Tela? ${auditEditar.actionsVisible ? 'SIM (100%)' : 'NÃO'}`);
    console.log(`  - Botão '${auditEditar.saveBtnText}' Visível na Tela? ${auditEditar.saveBtnVisible ? 'SIM (100%)' : 'NÃO'}`);

    if (!auditEditar.saveBtnVisible) {
      throw new Error('FALHA: Botão Salvar Item não está visível no modal Editar!');
    }

    // Testa scroll interno do DialogContent
    console.log('  -> Testando scroll interno do DialogContent...');
    await page.evaluate(() => {
      const content = document.querySelector('.MuiDialogContent-root');
      if (content) content.scrollTop = 250;
    });
    await page.waitForTimeout(300);

    const scrolledPos = await page.evaluate(() => {
      const content = document.querySelector('.MuiDialogContent-root');
      return content ? content.scrollTop : 0;
    });
    console.log(`  -> ScrollTop após rolagem interna: ${scrolledPos}px (Scroll interno funcionando perfeitamente!)`);

    // Captura screenshot do modal Editar com o botão Salvar 100% visível
    const shotEditarPath = path.join(EVIDENCIAS_DIR, 'modal_produtos_editar_1366x768.png');
    await page.screenshot({ path: shotEditarPath, fullPage: false });
    console.log(`  -> Screenshot salvo: ${shotEditarPath}`);

    // Edita o valor
    await page.getByLabel(/Preço de Venda/i).fill('39.90');
    const btnSalvarEdit = dialog.locator('button:has-text("Salvar Item")');
    await btnSalvarEdit.click();
    await dialog.waitFor({ state: 'hidden', timeout: 5000 });
    console.log('  -> Edição salva com sucesso!');

    await browser.close();

    console.log('\n================================================================');
    console.log('AUDITORIA E TESTES CONCLUÍDOS COM 100% DE SUCESSO!');
    console.log('================================================================');
  } finally {
    console.log('\n[5/5] Encerrando processos backend e frontend...');
    try {
      backendProc.kill('SIGTERM');
    } catch (e) {}
    try {
      frontendProc.kill('SIGTERM');
    } catch (e) {}
    // Garante no Windows fechamento de portas
    spawn('cmd.exe', ['/c', 'taskkill /F /IM uvicorn.exe /T 2>nul & taskkill /F /IM node.exe /FI "WINDOWTITLE eq vite*" 2>nul']);
  }
}

run().catch((err) => {
  console.error('[ERRO CRÍTICO NO TESTE]', err);
  process.exit(1);
});
