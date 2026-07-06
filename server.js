require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const { searchAmazonItem } = require("./amazon");
const { searchFlipkartItem } = require("./flipkart");
const { findCatalogMatch, listAllDeals } = require("./catalog");

const app = express();
const PORT = process.env.PORT || 4000;
const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";

app.use(cors({ origin: allowedOrigin }));
app.use(express.json());

// Serves index.html and any other frontend files placed in /public.
// This means one deploy gives you both the site and the API - no
// separate static host needed.
app.use(express.static(path.join(__dirname, "public")));

// ---------------------------------------------------------------
// GET /api/compare?q=<search term>
// Returns prices across all four platforms for the best-matching product.
// Amazon comes from a live PA-API call. Flipkart comes from the locally
// cached feed. Meesho/Myntra come from the manual catalog.
// ---------------------------------------------------------------
app.get("/api/compare", async (req, res) => {
  const query = (req.query.q || "").trim();
  if (!query) {
    return res.status(400).json({ error: "Missing query param 'q'" });
  }

  const results = {};
  let productName = query;

  // Amazon - live
  try {
    const amazonResult = await searchAmazonItem(query);
    if (amazonResult) {
      results.amazon = { price: amazonResult.price, url: amazonResult.url, image: amazonResult.image };
      productName = amazonResult.name;
    }
  } catch (err) {
    console.warn("Amazon lookup failed:", err.message);
  }

  // Flipkart - cached feed
  try {
    const flipkartResult = searchFlipkartItem(query);
    if (flipkartResult) {
      results.flipkart = { price: flipkartResult.price, url: flipkartResult.url, image: flipkartResult.image };
    }
  } catch (err) {
    console.warn("Flipkart lookup failed:", err.message);
  }

  // Meesho/Myntra + any fallback entries - manual catalog
  const catalogMatch = findCatalogMatch(query);
  if (catalogMatch) {
    productName = productName === query ? catalogMatch.name : productName;
    catalogMatch.entries.forEach((entry) => {
      if (!results[entry.platform]) {
        results[entry.platform] = { price: entry.price, url: entry.url, image: entry.image || null };
      }
    });
  }

  if (Object.keys(results).length === 0) {
    return res.status(404).json({ error: "No matching product found on any platform" });
  }

  res.json({ product: productName, results });
});

// ---------------------------------------------------------------
// GET /api/deals
// Returns the curated catalog for the "Today's deals" grid.
// ---------------------------------------------------------------
app.get("/api/deals", (req, res) => {
  res.json({ deals: listAllDeals() });
});

app.get("/health", (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Bachat backend running on http://localhost:${PORT}`);
});
