import { chromium, type Browser, type Page } from 'playwright';
import { config } from './config.js';

let browserPromise: Promise<Browser> | undefined;

// One shared browser for the whole process, launched on first use.
export function getBrowser(): Promise<Browser> {
  browserPromise ??= chromium
    .launch({
      headless: config.headless,
      // Shutdown is handled in index.ts, which closes the browser itself.
      handleSIGINT: false,
      handleSIGTERM: false,
      handleSIGHUP: false,
    })
    .catch((err) => {
      browserPromise = undefined;
      throw err;
    });
  return browserPromise;
}

// Runs `fn` with a page in a fresh, isolated context and always cleans it up.
export async function withPage<T>(fn: (page: Page) => Promise<T>): Promise<T> {
  const browser = await getBrowser();
  const context = await browser.newContext();
  try {
    return await fn(await context.newPage());
  } finally {
    await context.close();
  }
}

export async function closeBrowser(): Promise<void> {
  const pending = browserPromise;
  browserPromise = undefined;
  if (pending) {
    const browser = await pending.catch(() => undefined);
    await browser?.close();
  }
}
