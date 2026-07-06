const fs = require("fs");
const path = require("path");

const CACHE_PATH = path.join(__dirname, "data", "flipkart-cache.json");

function loadCache() {
  try {
    const raw = fs.readFileSync(CACHE_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return { updatedAt: null, products: [] };
  }
}

function searchFlipkartItem(keyword) {
  const cache = loadCache();
  const terms = keyword.toLowerCase().split(/\s+/).filter(Boolean);
  if (!cache.products.length) return null;

  let best = null;
  let bestScore = 0;
  for (const p of cache.products) {
    const title = (p.name || "").toLowerCase();
    const score = terms.filter((t) => title.includes(t)).length;
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }
  if (!best || bestScore === 0) return null;

  return {
    platform: "flipkart",
    name: best.name,
    price: best.price,
    url: best.url,
    image: best.image || null,
    cacheAge: cache.updatedAt,
  };
}

module.exports = { searchFlipkartItem };
