import express from "express";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

const app = express();

app.get("/search", async (req, res) => {
  try {
    const keyword = req.query.q || "wallet";

    // Fetch Etsy search page
    const searchRes = await fetch(
      `https://www.etsy.com/search?q=${encodeURIComponent(keyword)}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0"
        }
      }
    );

    const html = await searchRes.text();
    const $ = cheerio.load(html);

    const links = [];

    // Extract listing links
    $('a[href*="/listing/"]').each((i, el) => {
      const href = $(el).attr("href");
      if (!href) return;

      const cleanHref = href.split("?")[0];

      const fullUrl = cleanHref.startsWith("http")
        ? cleanHref
        : `https://www.etsy.com${cleanHref}`;

      if (!links.includes(fullUrl)) {
        links.push(fullUrl);
      }
    });

    const uniqueLinks = links.slice(0, 3);

    const results = [];

    for (const url of uniqueLinks) {
      try {
        const pageRes = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0"
          }
        });

        const pageHtml = await pageRes.text();

        let inCarts = null;

        const match = pageHtml.match(/in\s+(\d+)\s+carts/i);

        if (match) {
          inCarts = parseInt(match[1]);
        } else if (pageHtml.toLowerCase().includes("in demand")) {
          inCarts = "in demand";
        }

        const $page = cheerio.load(pageHtml);
        const title = $page("title").text();

        results.push({ title, url, inCarts });

      } catch (err) {
        console.error("Error scraping product:", err.message);
      }
    }

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
