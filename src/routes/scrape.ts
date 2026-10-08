import { Router } from 'express';
import { withPage } from '../browser.js';
import { HttpError } from '../errors.js';

export const scrapeRouter = Router();

// Example Playwright-backed route: GET /scrape/title?url=https://example.com
scrapeRouter.get('/title', async (req, res) => {
  const raw = req.query.url;
  if (typeof raw !== 'string' || !URL.canParse(raw) || !/^https?:$/.test(new URL(raw).protocol)) {
    throw new HttpError(400, 'Query parameter "url" must be a valid http(s) URL');
  }

  const title = await withPage(async (page) => {
    await page.goto(raw, { waitUntil: 'domcontentloaded' });
    return page.title();
  });

  res.json({ url: raw, title });
});
