import {readFileSync,writeFileSync} from "node:fs";
import assert from "node:assert/strict";
const source="dex/base-price-provider/wrangler.toml";
const cfg=readFileSync(source,"utf8");
const {DEPLOY_SHA,BASE_IP_NAMESPACE,BASE_SHARED_NAMESPACE,EXISTING_SOLANA_NAMESPACE}=process.env;
assert.match(DEPLOY_SHA||"",/^[a-f0-9]{40}$/);
for(const id of [BASE_IP_NAMESPACE,BASE_SHARED_NAMESPACE,EXISTING_SOLANA_NAMESPACE])assert.match(id||"",/^[1-9][0-9]{0,14}$/,"Explicit account namespace ID required");
assert.equal(new Set([BASE_IP_NAMESPACE,BASE_SHARED_NAMESPACE,EXISTING_SOLANA_NAMESPACE]).size,3,"Rate limit namespaces must be distinct");
for(const line of ['name = "climboria-base-price-preview"','main = "worker.mjs"','workers_dev = false','preview_urls = false','BASE_INDICATIVE_PRICE_ENABLED = "false"','BASE_PRICE_DAILY_ATTEMPTS = "0"','new_sqlite_classes = ["BasePriceBudget"]'])assert.ok(cfg.split("\n").includes(line),"Inactive source config mismatch: "+line);
assert.ok(!/^\s*(routes?\s*=|\[\[routes\]\])/m.test(cfg),"Source must remain unrouted");
assert.equal((cfg.match(/namespace_id = "2026112401"/g)||[]).length,1);
assert.equal((cfg.match(/namespace_id = "2026112402"/g)||[]).length,1);
assert.equal((cfg.match(/^\[vars\]$/gm)||[]).length,1);
const output=cfg.replace('namespace_id = "2026112401"','namespace_id = "'+BASE_IP_NAMESPACE+'"')
 .replace('namespace_id = "2026112402"','namespace_id = "'+BASE_SHARED_NAMESPACE+'"')
 .replace('[vars]','routes = [{ pattern = "base-price.climboria.fun", custom_domain = true }]\n\n[vars]\nBASE_PRICE_DEPLOYED_SHA = "'+DEPLOY_SHA+'"');
writeFileSync("dex/base-price-provider/wrangler.staging.generated.toml",output,{flag:"wx"});
console.log("PASS: generated disabled, zero-budget isolated staging configuration; no provider secret included.");
