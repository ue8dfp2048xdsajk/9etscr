import express from "express";
import { chromium } from "playwright";

const app = express();

app.get("/search", async (req, res) => {
  try {
    const keyword = req.query.q || "wallet";

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto(`https://www.etsy.com/search?q=${encodeURIComponent(keyword)}`);

    await page.waitForTimeout(3000); // wait for page load

    // ONLY get first few links
    const links = await page.$$eval('a[href*="/listing/"]', els =>
      [...new Set(els.map(el => el.href))].slice(0, 2)
    );

    const results = [];

    for (const url of links) {
      const itemPage = await browser.newPage();
      await itemPage.goto(url);

      await itemPage.waitForTimeout(2000);

      const text = await itemPage.evaluate(() => document.body.innerText);

      let inCarts = null;

      const match = text.match(/in\s+(\d+)\s+carts/i);

      if (match) {
        inCarts = parseInt(match[1]);
      } else if (text.toLowerCase().includes("in demand")) {
        inCarts = "in demand";
      }

      const title = await itemPage.title();

      results.push({ title, url, inCarts });

      await itemPage.close();
    }

    await browser.close();

    res.json(results);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
