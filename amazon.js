const crypto = require("crypto");
const axios = require("axios");

const SERVICE = "ProductAdvertisingAPI";

function sha256Hex(data) {
  return crypto.createHash("sha256").update(data, "utf8").digest("hex");
}

function hmac(key, data) {
  return crypto.createHmac("sha256", key).update(data, "utf8").digest();
}

function getSignatureKey(secretKey, dateStamp, region, service) {
  const kDate = hmac("AWS4" + secretKey, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, "aws4_request");
}

async function searchAmazonItem(keyword) {
  const {
    AMAZON_ACCESS_KEY,
    AMAZON_SECRET_KEY,
    AMAZON_PARTNER_TAG,
    AMAZON_HOST,
    AMAZON_REGION,
    AMAZON_MARKETPLACE,
  } = process.env;

  if (!AMAZON_ACCESS_KEY || !AMAZON_SECRET_KEY || !AMAZON_PARTNER_TAG) {
    throw new Error("Amazon PA-API credentials are not set in .env");
  }

  const host = AMAZON_HOST || "webservices.amazon.in";
  const region = AMAZON_REGION || "eu-west-1";
  const path = "/paapi5/searchitems";
  const target = "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems";
  const endpoint = `https://${host}${path}`;

  const payload = {
    Keywords: keyword,
    PartnerTag: AMAZON_PARTNER_TAG,
    PartnerType: "Associates",
    Marketplace: AMAZON_MARKETPLACE || "www.amazon.in",
    ItemCount: 1,
    Resources: [
      "ItemInfo.Title",
      "Offers.Listings.Price",
      "Images.Primary.Medium",
    ],
  };
  const body = JSON.stringify(payload);

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);

  const canonicalHeaders =
    `content-encoding:amz-1.0\n` +
    `content-type:application/json; charset=utf-8\n` +
    `host:${host}\n` +
    `x-amz-date:${amzDate}\n` +
    `x-amz-target:${target}\n`;
  const signedHeaders = "content-encoding;content-type;host;x-amz-date;x-amz-target";

  const canonicalRequest =
    `POST\n${path}\n\n${canonicalHeaders}\n${signedHeaders}\n${sha256Hex(body)}`;

  const credentialScope = `${dateStamp}/${region}/${SERVICE}/aws4_request`;
  const stringToSign =
    `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${sha256Hex(canonicalRequest)}`;

  const signingKey = getSignatureKey(AMAZON_SECRET_KEY, dateStamp, region, SERVICE);
  const signature = crypto.createHmac("sha256", signingKey).update(stringToSign, "utf8").digest("hex");

  const authorizationHeader =
    `AWS4-HMAC-SHA256 Credential=${AMAZON_ACCESS_KEY}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await axios.post(endpoint, body, {
    headers: {
      "content-encoding": "amz-1.0",
      "content-type": "application/json; charset=utf-8",
      host,
      "x-amz-date": amzDate,
      "x-amz-target": target,
      Authorization: authorizationHeader,
    },
    timeout: 8000,
  });

  const item = response.data?.SearchResult?.Items?.[0];
  if (!item) return null;

  const price = item.Offers?.Listings?.[0]?.Price?.Amount ?? null;
  return {
    platform: "amazon",
    name: item.ItemInfo?.Title?.DisplayValue ?? keyword,
    price,
    url: item.DetailPageURL,
    image: item.Images?.Primary?.Medium?.URL ?? null,
  };
}

module.exports = { searchAmazonItem };
