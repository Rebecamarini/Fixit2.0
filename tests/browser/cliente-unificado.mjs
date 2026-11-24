// Executar com a aplicação local e uma conta Cliente existente:
// PLAYWRIGHT_MODULE=/caminho/playwright/index.mjs CLIENTE_EMAIL=... CLIENTE_PASSWORD=... node tests/browser/cliente-unificado.mjs
import assert from "node:assert/strict";

const origin = process.env.APP_ORIGIN ?? "http://127.0.0.1:3000";
assert(
  ["127.0.0.1", "localhost"].includes(new URL(origin).hostname),
  "Use somente a aplicação local."
);
assert(
  process.env.CLIENTE_EMAIL && process.env.CLIENTE_PASSWORD,
  "Informe CLIENTE_EMAIL e CLIENTE_PASSWORD."
);
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROME_BIN ? { executablePath: process.env.CHROME_BIN } : {})
});

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${origin}/conta/entrar`);
  await page.getByLabel("E-mail", { exact: true }).fill(process.env.CLIENTE_EMAIL);
  await page.getByLabel("Senha", { exact: true }).fill(process.env.CLIENTE_PASSWORD);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL(`${origin}/solicitacoes`);
  await page.goto(`${origin}/`);
  await page.waitForURL(`${origin}/solicitacoes`);
  await page.getByRole("heading", { name: "Minhas solicitações", exact: true }).waitFor();
  const menu = page.getByRole("navigation", { name: "Navegação do Cliente" });
  assert.equal(await menu.getByRole("link").count(), 2);
  assert.equal(await menu.getByRole("link", { name: "Minhas solicitações" }).count(), 1);
  assert.equal(await menu.getByRole("link", { name: "Nova solicitação" }).count(), 1);
  assert.equal(await page.getByRole("table").count(), 1);
  assert.equal(await page.getByText("Solicitações recentes", { exact: true }).count(), 0);

  const resumo = page.getByRole("region", { name: "Resumo das minhas solicitações" });
  const totais = (await resumo.locator("strong").allTextContents()).map(Number);
  assert.equal(totais.length, 6);
  assert.equal(
    totais[0],
    totais.slice(1).reduce((soma, valor) => soma + valor, 0)
  );
  assert.equal(await resumo.getByRole("link").count(), 0);
  assert.equal(await resumo.getByRole("button").count(), 0);
  const textoResumo = await resumo.innerText();
  await page.goto(`${origin}/solicitacoes?busca=sem-resultado-${Date.now()}&estado=pendente`);
  await page.getByText("Nenhuma solicitação encontrada", { exact: true }).waitFor();
  assert.equal(
    await resumo.innerText(),
    textoResumo,
    "Pesquisa e filtro não alteram os totais gerais."
  );
  await page.getByRole("link", { name: "Limpar filtros", exact: true }).click();
  await page.waitForURL(`${origin}/solicitacoes`);
  assert.equal(await page.getByLabel("Pesquisar solicitações", { exact: true }).inputValue(), "");
  assert.equal(await page.getByLabel("Status", { exact: true }).inputValue(), "");

  await page.setViewportSize({ width: 390, height: 844 });
  assert(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    "Página deve caber no celular."
  );
  await page
    .getByRole("navigation", { name: "Navegação do Cliente" })
    .getByRole("link", { name: "Nova solicitação" })
    .click();
  await page.waitForURL(`${origin}/solicitacoes/nova`);
  console.log("PASSOU: página única do Cliente, totais gerais, navegação e celular.");
} finally {
  await browser.close();
}
