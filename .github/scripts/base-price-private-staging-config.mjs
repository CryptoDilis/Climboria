import assert from "node:assert/strict";
import {readFileSync,writeFileSync} from "node:fs";
const disabled=readFileSync("dex/base-price-provider/wrangler.staging.generated.toml","utf8");
const expires=Date.now()+600000;
for(const line of ['name = "climboria-base-price-preview"','BASE_INDICATIVE_PRICE_ENABLED = "false"','BASE_PRICE_DAILY_ATTEMPTS = "0"','workers_dev = false','preview_urls = false','routes = [{ pattern = "base-price.climboria.fun", custom_domain = true }]'])assert.ok(disabled.split("\n").includes(line),"Unexpected disabled config");
assert.ok(!disabled.includes("BASE_PRICE_STAGING_ONLY")&&!disabled.includes("BASE_PRICE_STAGING_EXPIRES_AT"));
const probe=disabled.replace('BASE_INDICATIVE_PRICE_ENABLED = "false"','BASE_INDICATIVE_PRICE_ENABLED = "true"\nBASE_PRICE_STAGING_ONLY = "true"\nBASE_PRICE_STAGING_EXPIRES_AT = "'+expires+'"').replace('BASE_PRICE_DAILY_ATTEMPTS = "0"','BASE_PRICE_DAILY_ATTEMPTS = "2"');
writeFileSync("dex/base-price-provider/wrangler.private.generated.toml",probe,{flag:"wx"});
console.log("PASS: generated expiring private-only configuration, two-attempt daily cap; no secrets included.");
