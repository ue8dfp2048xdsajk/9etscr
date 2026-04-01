import express from "express";
import { chromium } from "playwright";

const app = express();

app.get("/search", async (req, res) => {
  const keyword = req.query.q || "wallet";

  const browser = await chromium.launch({
    headless: true
  });

  const page = await browser.newPage();

  await page.goto(`https://www.etsy.com/search?q=${encodeURIComponent(keyword)}`);

  const links = await page.$$eval('a[href*="/listing/"]', els =>
    els.map(el => el.href)
  );

  const uniqueLinks = [...new Set(links)].slice(0, 5);

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

  res.json(results);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
