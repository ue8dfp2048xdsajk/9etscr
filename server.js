const express = require("express");
const fetch = require("node-fetch");
const cheerio = require("cheerio");

const app = express();

app.get("/search", async (req, res) => {
  try {
    const keyword = req.query.q || "wallet";

    // STEP 1: Search Google for Etsy listings
    const googleUrl = `https://www.google.com/search?q=site:etsy.com+${encodeURIComponent(keyword)}`;

    const googleRes = await fetch(googleUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });

    const googleHtml = await googleRes.text();
    const $ = cheerio.load(googleHtml);

    const links = [];

    // Extract Etsy links from Google results
    $("a").each((i, el) => {
      const href = $(el).attr("href");

      if (!href) return;

      // Google wraps links like /url?q=ACTUAL_URL
      if (href.startsWith("/url?q=")) {
        const realUrl = href.split("/url?q=")[1].split("&")[0];

        if (realUrl.includes("etsy.com/listing/")) {
          if (!links.includes(realUrl)) {
            links.push(realUrl);
          }
        }
      }
    });

    const uniqueLinks = links.slice(0, 3);

    const results = [];

    // STEP 2: Visit each Etsy listing
    for (const url of uniqueLinks) {
      try {
        const pageRes = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            "Accept-Language": "en-US,en;q=0.9"
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
