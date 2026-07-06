require("dotenv").config();
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const { FLIPKART_AFFILIATE_ID, FLIPKART_AFFILIATE_TOKEN } = process.env;
const CACHE_PATH = path.join(__dirname, "..", "data", "flipkart-cache.json");

async function main() {
  if (!FLIPKART_AFFILIATE_ID || !FLIPKART_AFFILIATE_TOKEN) {
    console.error("Set FLIPKART_AFFILIATE_ID and FLIPKART_AFFILIATE_TOKEN in .env first.");
    process.exit(1);
  }

  const headers = {
    "Fk-Affiliate-Id": FLIPKART_AFFILIATE_ID,
    "Fk-Affiliate-Token": FLIPKART_AFFILIATE_TOKEN,
  };

  const listUrl = `https://affiliate-api.flipkart.net/affiliate/api/${FLIPKART_AFFILIATE_ID}.json`;
  const listResp = await axios.get(listUrl, { headers });
  const feeds = listResp.data?.apiGroups?.affiliate?.apiListings || {};

  const products = [];

  for (const feedName of Object.keys(feeds)) {
    const feedUrl = feeds[feedName].availableVariants?.["v1.1.0"]?.get;
    if (!feedUrl) continue;
    try {
      const feedResp = await axios.get(feedUrl, { headers });
      const items = feedResp.data?.productInfoList || [];
      items.forEach((entry) => {
        const p = entry.productInfo?.product;
        if (!p) return;
        products.push({
          id: p.id,
          name: p.title,
          price: p.pricing?.finalPrice?.amount,
          mrp: p.pricing?.mrp?.amount,
          url: p.productUrl,
          image: p.imageUrls?.["400x400"] || p.imageUrls?.["200x200"] || null,
          category: feedName,
        });
      });
    } catch (err) {
      console.warn(`Could not fetch feed "${feedName}": ${err.message}`);
    }
  }

  fs.writeFileSync(
    CACHE_PATH,
    JSON.stringify({ updatedAt: new Date().toISOString(), products }, null, 2)
  );
  console.log(`Saved ${products.length} products to ${CACHE_PATH}`);
}

main().catch((err) => {
  console.error("Flipkart feed refresh failed:", err.message);
  process.exit(1);
});
