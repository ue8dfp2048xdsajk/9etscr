import { chromium } from "playwright";

export default async function handler(req, res) {
  const keyword = req.query.q || "wallet";

  const browser = await chromium.launch({
    args: ["--no-sandbox"]
  });

  const page = await browser.newPage();

  await page.goto(`https://www.etsy.com/search?q=${encodeURIComponent(keyword)}`);

  const links = await page.$$eval('a[href*="/listing/"]', els =>
    els.map(el => el.href)
  );

  const uniqueLinks = [...new Set(links)].slice(0, 10);

  const results = [];

  for (const url of uniqueLinks) {
    const itemPage = await browser.newPage();
    await itemPage.goto(url);

    const text = await itemPage.textContent("body");

    let inCarts = null;

    const match = text.match(/in\s+(\d+)\s+carts/i);

    if (match) {
      inCarts = parseInt(match[1]);
    } else if (text.toLowerCase().includes("in demand")) {
      inCarts = "in demand";
    }

    const title = await itemPage.title();

    results.push({
      title,
      url,
      inCarts
    });

    await itemPage.close();
  }

  await browser.close();

  res.status(200).json(results);
}
