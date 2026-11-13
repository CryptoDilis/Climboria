import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
try {
  const targets = [
    { name: "desktop", viewport: { width: 1365, height: 900 }, minPriceSize: 32 },
    { name: "mobile", viewport: { width: 390, height: 844 }, minPriceSize: 27, isMobile: true, hasTouch: true }
  ];

  for (const target of targets) {
    const context = await browser.newContext({
      viewport: target.viewport,
      isMobile: target.isMobile || false,
      hasTouch: target.hasTouch || false
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));

    await page.goto("http://127.0.0.1:4173/dex/", { waitUntil: "domcontentloaded" });
    await page.locator("#heroMarket > div:first-child > b").waitFor({ state: "visible", timeout: 10000 });

    const audit = await page.evaluate(() => {
      const card = document.querySelector("#heroMarket");
      const price = document.querySelector("#heroMarket > div:first-child > b");
      const change = document.querySelector("#heroMarket .hero-market-change");
      if (!card || !price || !change) return null;

      const originalClass = change.className;
      const sample = className => {
        change.className = className;
        const style = getComputedStyle(change);
        return { color: style.color, background: style.backgroundColor, border: style.borderColor };
      };
      const positive = sample("hero-market-change positive");
      const negative = sample("hero-market-change negative");
      change.className = originalClass;

      // Skeleton loading state intentionally masks text with transparent color.
      // Audit the final price styling without depending on live provider timing.
      const wasSkeleton = price.classList.contains("skeleton-value");
      if (wasSkeleton) price.classList.remove("skeleton-value");
      const cardStyle = getComputedStyle(card);
      const priceStyle = getComputedStyle(price);
      const result = {
        cardDisplay: cardStyle.display,
        cardGap: cardStyle.gap,
        cardPadding: cardStyle.padding,
        cardBorderRadius: cardStyle.borderRadius,
        priceColor: priceStyle.color,
        priceFontSize: Number.parseFloat(priceStyle.fontSize),
        priceFontWeight: Number.parseInt(priceStyle.fontWeight, 10),
        priceTextShadow: priceStyle.textShadow,
        cardWidth: card.getBoundingClientRect().width,
        cardScrollWidth: card.scrollWidth,
        documentWidth: document.documentElement.clientWidth,
        documentScrollWidth: document.documentElement.scrollWidth,
        positive,
        negative
      };
      if (wasSkeleton) price.classList.add("skeleton-value");
      return result;
    });

    assert.ok(audit, target.name + " Market Leader card is missing");
    assert.equal(audit.cardDisplay, "grid", target.name + " Market Leader card must retain its grid hierarchy");
    assert.equal(audit.priceColor, "rgb(255, 215, 106)", target.name + " live price must use premium metallic gold");
    assert.ok(audit.priceFontSize >= target.minPriceSize, target.name + " live price is not prominent enough: " + JSON.stringify(audit));
    assert.ok(audit.priceFontWeight >= 800, target.name + " live price weight is insufficient: " + JSON.stringify(audit));
    assert.notEqual(audit.priceTextShadow, "none", target.name + " live price needs a restrained gold glow");
    assert.equal(audit.positive.color, "rgb(111, 231, 168)", target.name + " 24h gains must remain green");
    assert.equal(audit.negative.color, "rgb(255, 131, 144)", target.name + " 24h losses must remain red");
    assert.ok(audit.cardScrollWidth <= audit.cardWidth + 1, target.name + " Market Leader card overflows: " + JSON.stringify(audit));
    assert.ok(audit.documentScrollWidth <= audit.documentWidth + 1, target.name + " DEX layout overflows horizontally: " + JSON.stringify(audit));
    assert.deepEqual(errors, [], target.name + " DEX page raised browser errors");

    await page.screenshot({ path: "climboria-dex-market-leader-" + target.name + ".png" });
    await context.close();
    console.log("PASS " + target.name + " Market Leader hierarchy: " + JSON.stringify(audit));
  }
} finally {
  await browser.close();
}
