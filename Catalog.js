const fs = require("fs");
const path = require("path");

const CATALOG_PATH = path.join(__dirname, "data", "catalog.json");

function loadCatalog() {
  const raw = fs.readFileSync(CATALOG_PATH, "utf8");
  return JSON.parse(raw).products;
}

function findCatalogMatch(keyword) {
  const products = loadCatalog();
  const terms = keyword.toLowerCase().split(/\s+/).filter(Boolean);

  let best = null;
  let bestScore = 0;
  for (const product of products) {
    const name = product.name.toLowerCase();
    const score = terms.filter((t) => name.includes(t)).length;
    if (score > bestScore) {
      bestScore = score;
      best = product;
    }
  }
  return bestScore > 0 ? best : null;
}

function listAllDeals() {
  return loadCatalog();
}

module.exports = { findCatalogMatch, listAllDeals };
